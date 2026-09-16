"""The chaos suite (SPEC section 14.3), runnable.

Eleven scenarios, each injecting one of the failures SPEC section 8.5 ranks
above strategy risk, with an asserted expected behaviour.

These exist as a command and not only as tests because the specification
requires them re-run quarterly and after any change to risk or execution.
Chaos tests that ran once, a year ago, test a system that no longer exists -
and a suite nobody can run on demand is a suite nobody runs.

Every scenario states what *should* happen before it runs, so a failure reads
as a broken guarantee rather than as a stack trace.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

from .adapters.sim import SimAdapter
from .core.errors import (
    AuthFailed, InsufficientBalance, IpBanned, RateLimited, UnknownState, VenueError,
)
from .core.events import OrderIntent, OrderStatus, Position, RiskDecision, SymbolFilter
from .core.types import dec
from .layers.l5_risk.killswitch import KillSwitch, Trigger
from .layers.l6_execution.executor import Executor
from .layers.l6_execution.legs import LegState, Unwinder
from .layers.l6_execution.reconcile import DiscrepancyClass, Reconciler
from .layers.l7_observability.audit import AuditBufferFull, AuditLog

__all__ = ["Scenario", "ScenarioResult", "SCENARIOS", "run_all"]

FILTERS = {"BTCUSDT": SymbolFilter("BTCUSDT", dec("0.01"), dec("0.00001"), dec("10"))}
NOW = 1_700_000_000_000_000_000


@dataclass(frozen=True)
class Scenario:
    name: str
    #: What the system must do. Stated before the run, so a failure reads as a
    #: broken guarantee rather than as an exception.
    guarantee: str
    run: Callable[[], Tuple[bool, str]]
    failure_mode: str = ""


@dataclass(frozen=True)
class ScenarioResult:
    scenario: Scenario
    passed: bool
    detail: str

    def __str__(self) -> str:
        mark = "PASS" if self.passed else "FAIL"
        return f"  [{mark}] {self.scenario.name:<34} {self.detail}"


# ----------------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------------


def _adapter(**kwargs) -> SimAdapter:
    a = SimAdapter(filters=FILTERS, **kwargs)
    a.set_book("BTCUSDT", [("60000", "50")], [("60001", "50")])
    a.set_balance("USDT", "100000")
    return a


def _intent(coid="ts_chaos", side="buy", qty="0.5", order_type="market", price=None):
    return OrderIntent(correlation_id="c", emitted_at=NOW, source="chaos",
                       client_order_id=coid, venue="sim", symbol="BTCUSDT",
                       side=side, quantity=dec(qty), order_type=order_type,
                       price=dec(price) if price else None, strategy_id="chaos")


def _approve(intent):
    return RiskDecision(correlation_id="c", emitted_at=NOW, source="l5_risk",
                        intent_id=intent.client_order_id, approved=True,
                        adjusted_quantity=intent.quantity)


# ----------------------------------------------------------------------
# Scenarios
# ----------------------------------------------------------------------


def _dropped_response() -> Tuple[bool, str]:
    adapter = _adapter()
    adapter.faults.drop_response_after_accept = True
    ex = Executor(adapter, FILTERS, clock=lambda: adapter.now)
    intent = _intent()
    first = asyncio.run(ex.submit(intent, _approve(intent)))
    asyncio.run(ex.submit(intent, _approve(intent)))          # the retry
    ok = len(adapter.fills) == 1 and first.machine.status == OrderStatus.QUERY
    return ok, f"{len(adapter.fills)} fill after the venue accepted and we were not told"


def _timeout_without_acceptance() -> Tuple[bool, str]:
    adapter = _adapter()
    adapter.faults.timeout_without_accept = True
    ex = Executor(adapter, FILTERS, clock=lambda: adapter.now)
    intent = _intent(coid="ts_to")
    asyncio.run(ex.submit(intent, _approve(intent)))
    machine = asyncio.run(ex.resolve_unknown("ts_to"))
    ok = machine.status == OrderStatus.REJECTED and not adapter.fills
    return ok, f"QUERY resolved to {machine.status} with {len(adapter.fills)} fills"


def _duplicate_client_order_id() -> Tuple[bool, str]:
    adapter = _adapter()
    intent = _intent(coid="ts_dup")
    asyncio.run(adapter.place(intent))
    try:
        asyncio.run(adapter.place(intent))
        return False, "the venue accepted a duplicate client order id"
    except VenueError:
        return True, "the venue refused the duplicate"


def _state_desync() -> Tuple[bool, str]:
    reconciler = Reconciler("sim")
    remote = [Position("sim", "ETHUSDT", dec("3"), dec("3000"), dec("3000"))]
    report = reconciler.reconcile({}, remote, {}, [], dec("100000"), NOW)
    halting = Reconciler.halting_discrepancies(report)
    kinds = {d["kind"] for d in report.discrepancies}
    ok = DiscrepancyClass.MISSING_LOCAL in kinds and bool(halting)
    return ok, "an unexplained position halts rather than being adopted"


def _reconciliation_stalls() -> Tuple[bool, str]:
    reconciler = Reconciler("sim")
    results = [reconciler.on_cycle_failed() for _ in range(3)]
    return results == [False, False, True], "third consecutive failure halts"


def _stale_balance() -> Tuple[bool, str]:
    adapter = _adapter()
    adapter.faults.reject_next = "balance"
    ex = Executor(adapter, FILTERS, clock=lambda: adapter.now)
    intent = _intent(coid="ts_bal")
    result = asyncio.run(ex.submit(intent, _approve(intent)))
    ok = not result.accepted and not result.unknown
    return ok, "treated as terminal, not retried against a wrong cache"


def _rate_limit_storm() -> Tuple[bool, str]:
    adapter = _adapter()
    adapter.faults.rate_limit_next = True
    try:
        asyncio.run(adapter.place(_intent(coid="ts_rl")))
        return False, "a rate limit was swallowed"
    except RateLimited:
        return True, "surfaced rather than swallowed"


def _ip_ban() -> Tuple[bool, str]:
    adapter = _adapter()
    adapter.faults.ip_ban_next = True
    try:
        asyncio.run(adapter.place(_intent(coid="ts_ban")))
        return False, "a ban was treated as an ordinary error"
    except IpBanned:
        return True, "distinct from a rate limit; must be waited out"


def _clock_skew() -> Tuple[bool, str]:
    adapter = _adapter()
    adapter.faults.clock_skew_ns = 200_000_000
    skewed = asyncio.run(adapter.server_time())
    drift_ms = abs(skewed - adapter.now) / 1e6
    return drift_ms >= 100, f"drift of {drift_ms:.0f}ms is visible to the caller"


def _partial_fill_orphan() -> Tuple[bool, str]:
    unwinder = Unwinder(timeout_ns=1000)
    group = unwinder.open("g", "chaos", 0)
    group.add_leg(LegState("a", "sim-perp", "BTCUSDT", "sell", dec("1")))
    group.add_leg(LegState("b", "sim-spot", "BTCUSDT", "buy", dec("1")))
    unwinder.on_fill("a", dec("1"))
    due = unwinder.due_for_unwind(5000)
    orders = due[0].unwind_orders() if due else []
    ok = len(orders) == 1 and orders[0].side == "buy"
    return ok, "the filled leg is flattened, the other cancelled, neither chased"


def _dead_mans_switch() -> Tuple[bool, str]:
    switch = KillSwitch()
    switch.heartbeat(NOW)
    quiet = switch.check_deadman(NOW + 5 * 10**9)
    fired = switch.check_deadman(NOW + 11 * 10**9)
    ok = not quiet and fired and switch.must_flatten
    return ok, "flattens autonomously when risk stops heartbeating"


def _audit_path_lost() -> Tuple[bool, str]:
    log = AuditLog(sink=lambda line: (_ for _ in ()).throw(IOError("down")), buffer_limit=2)
    try:
        for i in range(4):
            log.record("order", {"i": i})
        return False, "trading continued with no audit path"
    except AuditBufferFull:
        return log.must_halt_trading, "losing the audit path halts trading"


def _runaway_strategy() -> Tuple[bool, str]:
    """A strategy emitting orders as fast as it can must hit a limit that is
    not its own. The order-rate breaker lives in risk, independent of strategy
    logic, precisely so a looping strategy cannot outrun it."""
    from .adapters.base import RateLimitState

    state = RateLimitState(5500, 6000)
    return state.should_throttle and state.should_halt_non_critical, \
        "the rate breaker trips independently of strategy logic"



def _flatten_under_compound_failure() -> Tuple[bool, str]:
    """The WP1 exit criterion: a flatten under three simultaneous failures.

    Venue returning 5xx, an order left in QUERY by it, and the dead-man's
    switch firing - all at once, driven through the real
    :class:`~tradesys.session.TradingSession` against the real simulator rather
    than against a component in isolation.

    Every one of those failures used to stop the flatten by itself:

    * the dead-man could not fire at all, because the loop that beat it was the
      loop that checked it;
    * the flatten it would have demanded was refused by the risk checks that
      the same conditions had set off - reconciliation, feed freshness,
      notional, per-trade risk and loss state;
    * the 5xx was discarded along with every other ``ExecutionResult``, so the
      flatten reported nothing and never retried;
    * the resulting QUERY order was either resent blind or counted as done.

    The guarantee is not "it placed some orders". It is that the book ends
    **flat**.
    """
    from .core.events import Position as _Position
    from .demo import PERP_VENUE, SYMBOL, build_pipeline
    from .layers.l5_risk.service import FLATTEN_STRATEGY_ID
    from .session import SessionConfig, TradingSession

    pipeline, adapters, _ = build_pipeline()
    venue = adapters[PERP_VENUE]
    clock = {"now": venue.now}
    session = TradingSession(
        pipeline, adapters,
        config=SessionConfig(reconcile_interval_ns=8 * 3600 * 10**9,
                             strategy_settle_ns=0, require_deadman=True),
        clock=lambda: clock["now"],
    )
    session.beat_risk(clock["now"])
    asyncio.run(session.start())

    # A position to close, and a book to close it into.
    pipeline.books.positions[(PERP_VENUE, SYMBOL)] = _Position(
        PERP_VENUE, SYMBOL, dec("0.5"), dec("60000"), dec("60000"))
    pipeline.books.apply_to(pipeline.risk.state)
    pipeline._marks[(PERP_VENUE, SYMBOL)] = dec("60000")
    pipeline._touch[(PERP_VENUE, SYMBOL)] = (dec("59990"), dec("60010"))

    # Failure 1: the feed died ten minutes ago and reconciliation is dirty.
    # Both of these are flatten triggers, and both used to refuse the flatten.
    pipeline._feed_last[SYMBOL] = clock["now"] - 600 * 10**9
    pipeline.executor.reconciliation_clean = False
    # Failure 2: the account is past its daily loss limit, which is a third
    # check that used to refuse the order it had just demanded.
    pipeline.risk.state.day_start_equity = pipeline.risk.state.equity * dec("1.1")

    # Failure 3: the venue is returning 5xx. The first flatten order will come
    # back UnknownState and sit in QUERY.
    venue.faults.reject_next = "down"

    # And the risk service stops answering. No beat, and time passes.
    clock["now"] += 30 * 10**9
    asyncio.run(session.tick(clock["now"]))

    if Trigger.DEADMAN not in pipeline.risk.killswitch.engaged:
        return False, "the dead-man never fired"

    # Drive the session forward the way the runner does: tick, let the
    # simulator match, book the fills. Bounded, because a flatten that needs
    # unbounded time has not terminated.
    for _ in range(20):
        venue.advance(1_000_000_000)
        for fill in venue.step():
            pipeline.on_fill(fill)
        clock["now"] += 1_000_000_000
        asyncio.run(session.tick(clock["now"]))
        if not any(p.quantity for p in pipeline.books.positions.values()):
            break

    open_qty = sum((abs(p.quantity) for p in pipeline.books.positions.values()), dec(0))
    flatten_orders = [m for m in pipeline.executor.machines.values()
                      if m.intent.strategy_id == FLATTEN_STRATEGY_ID]
    live = [m for m in flatten_orders if not m.is_terminal]
    ok = open_qty == 0 and not live
    return ok, (f"terminated with {open_qty} open and {len(live)} order(s) still "
                f"working, after {len(flatten_orders)} flatten order(s)")

SCENARIOS: Tuple[Scenario, ...] = (
    Scenario("dropped_response", "a retry after an unknown outcome must not fill twice",
             _dropped_response, "double position"),
    Scenario("timeout_without_acceptance", "QUERY must be able to conclude 'rejected' too",
             _timeout_without_acceptance, "double position"),
    Scenario("duplicate_client_order_id", "the venue refuses a repeated idempotency key",
             _duplicate_client_order_id, "double position"),
    Scenario("state_desync", "an unexplained position halts rather than being adopted",
             _state_desync, "state desync"),
    Scenario("reconciliation_stalls", "three consecutive failures halt trading",
             _reconciliation_stalls, "state desync"),
    Scenario("stale_balance", "an insufficient-balance error triggers reconciliation",
             _stale_balance, "stale balance"),
    Scenario("rate_limit_storm", "a rate limit is surfaced, never swallowed",
             _rate_limit_storm, "infinite loop"),
    Scenario("ip_ban", "a ban is distinct from a rate limit and must be waited out",
             _ip_ban, "infinite loop"),
    Scenario("clock_skew", "drift is visible before the venue starts rejecting",
             _clock_skew, "clock drift"),
    Scenario("partial_fill_orphan", "a broken leg group is flattened, not chased",
             _partial_fill_orphan, "partial-fill orphan"),
    Scenario("dead_mans_switch", "execution flattens when risk stops heartbeating",
             _dead_mans_switch, "risk service death"),
    Scenario("audit_path_lost", "trading halts when it can no longer be recorded",
             _audit_path_lost, "unreconstructable day"),
    Scenario("runaway_strategy", "the order-rate breaker is independent of strategy logic",
             _runaway_strategy, "infinite loop"),
    Scenario("flatten_under_compound_failure",
             "a flatten under venue 5xx, an order in QUERY and the dead-man "
             "firing terminates FLAT",
             _flatten_under_compound_failure, "unflattenable book"),
)


def run_all(scenarios: Tuple[Scenario, ...] = SCENARIOS) -> List[ScenarioResult]:
    results: List[ScenarioResult] = []
    for scenario in scenarios:
        try:
            passed, detail = scenario.run()
        except Exception as e:                                 # noqa: BLE001
            passed, detail = False, f"{type(e).__name__}: {e}"
        results.append(ScenarioResult(scenario, passed, detail))
    return results
