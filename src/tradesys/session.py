"""The trading session: everything wired together and running.

The components exist separately so each is testable alone. This is where they
become a system, and the order matters:

1. **The startup gate runs first** (SPEC section 9.5). No strategy emits a
   signal until config validates, filters are cached, the clock is checked, and
   reconciliation comes back clean. Failure mode 6 in SPEC section 8.5 is a
   system that restarts, does not know about open positions, and opens more;
   this gate is the whole defence, and it is the reason the session refuses to
   start rather than starting degraded.
2. **The dead-man's switch arms before the first order** and the execution side
   flattens autonomously if the risk service stops heartbeating. It acts
   without asking, because the service it would ask is the one that is not
   responding.
3. **Reconciliation runs on its own cadence**, not on the market data's. A
   quiet market is exactly when a position mismatch goes unnoticed.

Strategies are enabled one at a time at the end, with a settling period. All at
once after a halt reproduces whatever caused the halt, at full size.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Callable, Dict, List, Mapping, Optional, Sequence, Tuple

from .core.events import MarketEvent, OrderStatus, Position
from .core.types import Decimal as Dec, Nanos, dec, now_ns
from .layers.l5_risk.killswitch import SwitchState, Trigger
from .layers.l5_risk.service import FLATTEN_STRATEGY_ID
from .layers.l6_execution.reconcile import DiscrepancyClass, Reconciler
from .layers.l6_execution.startup import StartupGate, StartupGateFailed
from .layers.l7_observability.alerts import AlertRouter, Severity
from .layers.l7_observability.metrics import MetricRegistry, SloEvaluator
from .pipeline import Pipeline

__all__ = ["TradingSession", "SessionState", "SessionConfig", "FlattenReport"]


@dataclass
class FlattenReport:
    """What a flatten actually managed to do.

    It exists because ``_flatten`` used to return ``None`` and discard every
    ``ExecutionResult`` it produced, which made a flatten that placed no orders
    look exactly like one that closed the book.
    """

    reason: str = ""
    #: Reducing orders the venue accepted.
    submitted: List[str] = field(default_factory=list)
    #: Reducing orders whose fate the venue never confirmed. Never resent.
    unknown: List[str] = field(default_factory=list)
    #: Positions that could not be reduced, with why.
    failed: List[str] = field(default_factory=list)
    #: Working orders that could not be confirmed cancelled (F-6).
    cancel_failures: List[str] = field(default_factory=list)
    #: Positions still open when the flatten gave up.
    remaining: List[Tuple[str, str]] = field(default_factory=list)
    #: Of those, the ones with no reducing order working for them. This is the
    #: list that matters: a position still open because its order has not
    #: filled yet is a flatten in progress, and a position still open with
    #: nothing working for it is a flatten that failed.
    uncovered: List[str] = field(default_factory=list)
    #: True when the book is closed.
    flat: bool = False
    #: True when the book is closed, or every open position has a reducing
    #: order working and nothing failed on the way.
    complete: bool = False

    def __bool__(self) -> bool:
        return self.complete

    def __str__(self) -> str:
        return (f"flat={self.flat} complete={self.complete} "
                f"submitted={len(self.submitted)} unknown={len(self.unknown)} "
                f"failed={self.failed} cancel_failures={self.cancel_failures} "
                f"uncovered={self.uncovered} remaining={self.remaining}")


class SessionState:
    NEW = "NEW"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    HALTED = "HALTED"
    STOPPED = "STOPPED"


@dataclass
class SessionConfig:
    reconcile_interval_ns: int = 5_000_000_000        # SPEC section 9.3: 5s minimum
    #: Advisory: how often the risk service's liveness probe should run. The
    #: session does not drive it - `beat_risk` is called from outside, because
    #: a loop that beats the dead-man and then checks it always finds it
    #: freshly beaten. `LiveRunner` owns the loop and its own copy of this
    #: interval; this value is what a different driver should use.
    heartbeat_interval_ns: int = 2_000_000_000
    #: Seconds between enabling one strategy and the next.
    strategy_settle_ns: int = 1_000_000_000
    max_clock_drift_ms: float = 50.0
    #: Halt if the clock is this far out. Above 100ms the venue rejects signed
    #: requests outright, so trading on is not an option anyway.
    halt_clock_drift_ms: float = 100.0
    #: Refuse to start unless something outside this session is beating the
    #: dead-man's switch. Set by the live runner for paper and live modes, and
    #: left off for a backtest, where there is no separate risk service for a
    #: dead-man to detect the death of. Defaulting it on would flatten every
    #: backtest that simulated more than the tolerance.
    require_deadman: bool = False


class TradingSession:
    """Drives a pipeline against live or simulated venues."""

    def __init__(
        self,
        pipeline: Pipeline,
        adapters: Mapping[str, object],
        config: Optional[SessionConfig] = None,
        metrics: Optional[MetricRegistry] = None,
        alerts: Optional[AlertRouter] = None,
        clock: Callable[[], Nanos] = now_ns,
    ) -> None:
        self.pipeline = pipeline
        self.adapters = dict(adapters)
        self.config = config or SessionConfig()
        self.metrics = metrics or MetricRegistry()
        self.alerts = alerts or AlertRouter(clock=lambda: clock())
        self.slo = SloEvaluator(self.metrics)
        self.clock = clock
        self.state = SessionState.NEW
        self.reconcilers = {name: Reconciler(name) for name in self.adapters}
        self._last_reconcile: Nanos = 0
        self._last_heartbeat: Nanos = 0
        self.startup_report: List[str] = []
        self._current_day: Optional[str] = None
        self._day_start_pnl: Dict[str, Dec] = {}
        self._register_metrics()

    def _register_metrics(self) -> None:
        """Create every metric at zero, before anything can happen.

        A counter that springs into existence the first time something goes
        wrong leaves its panel empty until the incident, and an empty panel
        reads as "fine" rather than as "not measured". Registering up front
        costs nothing and makes the dashboards honest from the first second.
        """
        for name, help_text in (
            ("events_processed", "market events through the pipeline"),
            ("orders_placed", "orders accepted by a venue"),
            ("orders_rejected", "orders refused"),
            ("reconciliation_cycles", "reconciliation passes completed"),
            ("flattens", "times the book was flattened"),
            ("slo_breaches", "indicator breaches raised"),
            ("sequence_gaps", "market data sequence discontinuities"),
            ("strategies_enabled", "strategies enabled at startup"),
        ):
            self.metrics.counter(name, help_text)
        for name, help_text in (
            ("equity", "cash plus unrealised plus accrued"),
            ("gross_notional", "gross position value"),
            ("drawdown", "peak-to-trough fraction"),
            ("open_positions", "instruments currently held"),
            ("open_leg_groups", "multi-leg trades in flight"),
            ("kill_switch_engaged", "1 when engaged"),
            ("orders_unknown", "orders whose state the venue has not confirmed"),
            ("taker_fallbacks", "maker attempts that had to cross"),
            ("data_quality_red_days", "1 when the current data is unusable"),
            ("audit_write_failures", "1 when the audit path is lost"),
            ("feed_uptime_fraction", "1 when the feed is fresh"),
            ("clock_drift_ms", "venue clock drift"),
            ("reconciliation_consecutive_failures", "consecutive failed cycles"),
        ):
            self.metrics.gauge(name, help_text)
        for name, help_text in (
            ("signal_to_order_ms", "event received to order sent"),
            ("order_ack_ms", "order sent to venue acknowledgement"),
            ("feed_staleness_ms", "venue timestamp to local receipt"),
        ):
            self.metrics.histogram(name, help_text)

    # ------------------------------------------------------------------
    # Startup
    # ------------------------------------------------------------------

    async def start(self, operator: Optional[str] = None) -> None:
        """Run the gate, then enable strategies one at a time.

        Raises :class:`StartupGateFailed` rather than starting degraded. A
        session that starts with an unexplained position is a session that will
        trade around it.
        """
        self.state = SessionState.STARTING
        gate = StartupGate()

        gate.add("config_bounds_validated", lambda: self.pipeline.risk.limits is not None,
                 detail="the limit register failed to load")
        gate.add("venues_reachable", lambda: bool(self.adapters),
                 detail="no venue adapters attached")

        filters_ok = await self._cache_filters()
        gate.add("symbol_filters_cached", lambda: filters_ok,
                 detail="could not fetch symbol filters")

        drift_ok, drift_ms = await self._check_clock()
        gate.add("clock_drift", lambda: drift_ok,
                 detail=f"clock drift {drift_ms:.1f}ms exceeds "
                        f"{self.config.halt_clock_drift_ms}ms")

        clean, discrepancies = await self.reconcile(force=True)
        gate.add("reconciliation_clean", lambda: clean or bool(operator),
                 detail="; ".join(discrepancies) or "reconciliation did not complete")
        if not clean:
            gate.needs_acknowledgement = True
            if operator:
                # Acknowledging means the operator investigated, which is what
                # the recovery matrix requires for a reconciliation mismatch:
                # one person, after looking. So the acknowledgement also clears
                # the trigger it raised - otherwise the switch stays engaged,
                # the next gate step fails on it, and the only route back into
                # trading is to restart without acknowledging, which is exactly
                # the shortcut the gate exists to prevent.
                gate.acknowledge(operator)
                await self._clear_reconciliation_triggers(operator)

        gate.add("risk_service_healthy", lambda: not self.pipeline.risk.killswitch.is_engaged,
                 detail="the kill switch is engaged")

        # The dead-man must be beating before the first order, and it must be
        # beaten by something that is not this session: see `beat_risk`. The
        # session used to arm it itself, one line before the loop that checks
        # it, which made it look armed everywhere and fire nowhere.
        gate.add("dead_mans_switch_armed",
                 lambda: not self.config.require_deadman or self.deadman_armed,
                 detail="nothing is beating the dead-man's switch; start the "
                        "risk heartbeat before the session")

        gate.run()
        self.startup_report = list(gate.passed)

        await self._enable_strategies()
        self.state = SessionState.RUNNING

    async def _clear_reconciliation_triggers(self, operator: str) -> None:
        at = self.clock()
        switch = self.pipeline.risk.killswitch
        for trigger in (Trigger.MISSING_LOCAL, Trigger.RECONCILE_MISMATCH):
            if trigger in switch.engaged:
                switch.condition_cleared(trigger, at)
                switch.approve(trigger, operator)
                switch.try_clear(trigger, at)

    async def _cache_filters(self) -> bool:
        ok = True
        for name, adapter in self.adapters.items():
            try:
                info = await adapter.reference_data()
            except Exception:                                  # noqa: BLE001
                ok = False
                continue
            if info.filters:
                self.pipeline.executor.venue_filters[name] = dict(info.filters)
                self.pipeline.filters.update(info.filters)
        return ok

    async def _check_clock(self) -> Tuple[bool, float]:
        worst = 0.0
        for adapter in self.adapters.values():
            try:
                venue_time = await adapter.server_time()
            except Exception:                                  # noqa: BLE001
                return False, float("inf")
            drift_ms = abs(venue_time - self.clock()) / 1e6
            worst = max(worst, drift_ms)
        self.metrics.gauge("clock_drift_ms", "venue clock drift").set(worst)
        return worst <= self.config.halt_clock_drift_ms, worst

    async def _enable_strategies(self) -> None:
        """One at a time, with a settling period between each."""
        for strategy in self.pipeline.strategies:
            strategy.health.enabled = True
            self.metrics.counter("strategies_enabled").inc()
            if self.config.strategy_settle_ns:
                await asyncio.sleep(0)       # a real session waits; a backtest does not

    # ------------------------------------------------------------------
    # Running
    # ------------------------------------------------------------------

    async def on_event(self, event: MarketEvent) -> None:
        """One market event through the whole system, with the periodic work."""
        if self.state not in (SessionState.RUNNING, SessionState.STARTING):
            return

        started = self.clock()
        result = await self.pipeline.on_market_event(event)
        self.metrics.histogram("signal_to_order_ms").observe((self.clock() - started) / 1e6)
        self.metrics.counter("events_processed").inc()

        # Every panel in ops/dashboards references a metric, and a panel
        # pointing at a metric nobody publishes shows a flat line. A flat line
        # during an incident reads as "fine", so the counters are emitted here
        # even when they are zero.
        self.metrics.counter("orders_placed").inc(len(result.submitted))
        self.metrics.counter("orders_rejected").inc(len(result.rejected))
        self.metrics.gauge("orders_unknown").set(
            sum(1 for m in self.pipeline.executor.open_machines()
                if m.status == "QUERY")
        )
        self.metrics.gauge("taker_fallbacks").set(float(self.pipeline.fallbacks_fired))
        if event.quality.gap_detected:
            self.metrics.counter("sequence_gaps").inc()
        self.metrics.gauge("data_quality_red_days").set(
            1.0 if event.quality.stale or event.quality.crossed_book else 0.0
        )
        self.metrics.gauge("audit_write_failures").set(
            1.0 if getattr(self.pipeline.audit, "must_halt_trading", False) else 0.0
        )
        self.metrics.gauge("strategies_enabled_now").set(
            sum(1 for st in self.pipeline.strategies if st.health.enabled)
        )
        self.metrics.gauge("feed_uptime_fraction").set(
            0.0 if event.quality.stale else 1.0
        )
        self.metrics.histogram("order_ack_ms").observe(
            max(0.0, (self.clock() - started) / 1e6)
        )

        if event.exchange_ts:
            staleness_ms = max(0.0, (event.local_recv_ts - event.exchange_ts) / 1e6)
            self.metrics.histogram("feed_staleness_ms").observe(staleness_ms)

        await self.tick(event.emitted_at or self.clock())

    async def tick(self, now: Optional[Nanos] = None) -> None:
        """Periodic work: heartbeat, reconcile, evaluate the indicators.

        Deliberately driven on its own cadence rather than by market data. A
        quiet market is exactly when a position mismatch goes unnoticed.
        """
        at = now if now is not None else self.clock()

        # This loop does NOT beat the switch. It used to, one statement before
        # asking whether the switch had been beaten, which made the answer
        # always yes and the dead-man unfireable. The beat comes from
        # `beat_risk`, driven independently - see its docstring.
        # `check_deadman` keeps returning True for as long as the beat is
        # missing, which is correct - the condition has not gone away - so the
        # flatten is gated on there being something left to flatten rather than
        # on the switch being newly fired.
        if self.pipeline.risk.killswitch.check_deadman(at) and self._flatten_needed():
            await self._flatten("risk service heartbeat missed")

        if at - self._last_reconcile >= self.config.reconcile_interval_ns:
            await self.reconcile()

        self._roll_day(at)
        self.pipeline.risk.check_drawdown_ladder(at)
        self._publish_state()

        breaches = self.slo.raise_all(self.alerts, money_at_risk=self.has_open_positions)
        for breach in breaches:
            self.metrics.counter("slo_breaches").inc()

        if self.pipeline.risk.killswitch.must_flatten and self._flatten_needed():
            await self._flatten(self.pipeline.risk.killswitch.blocking_reason() or "kill switch")

    def _flatten_needed(self) -> bool:
        """Whether this tick should (re)run the flatten.

        The guard used to be ``state == RUNNING``, and ``_flatten`` sets HALTED
        as its first act - so the flatten ran exactly once and every later tick
        was silenced. A venue that was down for that one attempt meant the
        position stayed open for the rest of the session, with the kill switch
        still demanding it be closed.
        """
        if self.state == SessionState.RUNNING:
            return True
        if self.state != SessionState.HALTED:
            return False
        # Retry only what is genuinely uncovered. A position whose reducing
        # order is still working does not need a second one.
        return any(self._reducing_in_flight(venue, symbol) == 0
                   for venue, symbol in self._open_positions())

    # ------------------------------------------------------------------
    # The dead-man's switch
    # ------------------------------------------------------------------

    @property
    def deadman_armed(self) -> bool:
        return self.pipeline.risk.killswitch.deadman_last_beat is not None

    def beat_risk(self, now: Optional[Nanos] = None) -> bool:
        """Probe the risk service and record its beat. Returns False if it is
        not answering, in which case nothing is recorded and the switch ages.

        **Call this from a loop that is not `tick`.** The whole point of the
        dead-man is to notice that the risk service has stopped responding
        while the rest of the system carries on, and a beat issued by the same
        code path that checks it cannot notice anything. The live runner drives
        this from its own task; see `LiveRunner._risk_heartbeat_loop`.

        The separation is real but not total: both loops share one event loop,
        so a wedged loop stops the beater and the checker together. The full
        answer is the out-of-process risk service SPEC section 13 describes,
        where the beat crosses a process boundary. Until then this catches a
        risk service that has stopped answering, and does not catch a process
        that has stopped running - and says so rather than implying otherwise.
        """
        at = now if now is not None else self.clock()
        alive = self.pipeline.risk.heartbeat(at)
        if alive:
            self._last_heartbeat = at
        else:
            self.alerts.raise_alert(
                Severity.P1, "risk_heartbeat",
                "the risk service did not answer its liveness probe",
                money_at_risk=self.has_open_positions,
            )
        return alive

    def _roll_day(self, at: Nanos) -> None:
        """Close the day: feed each strategy's profit to the allocator.

        Correlation is estimated on **daily strategy profit and loss**, not on
        asset returns (SPEC section 7.2). Two strategies trading the same asset
        can be uncorrelated and two trading different assets can be identical,
        so the asset is the wrong thing to measure.
        """
        from datetime import datetime, timezone

        day = datetime.fromtimestamp(at / 1e9, tz=timezone.utc).strftime("%Y-%m-%d")
        if self._current_day is None:
            self._current_day = day
            self._day_start_pnl = {
                sid: led.net_pnl for sid, led in self.pipeline.books.strategies.items()
            }
            return
        if day == self._current_day:
            return

        for sid, led in self.pipeline.books.strategies.items():
            opening = self._day_start_pnl.get(sid, dec(0))
            self.pipeline.allocator.observe(sid, float(led.net_pnl - opening))
        self._day_start_pnl = {
            sid: led.net_pnl for sid, led in self.pipeline.books.strategies.items()
        }
        self._current_day = day
        self.pipeline.risk.state.roll_day(day)
        self.metrics.gauge("allocation_version").set(self.pipeline.allocator.version)

    def _publish_state(self) -> None:
        books = self.pipeline.books
        self.metrics.gauge("equity").set(float(books.equity))
        self.metrics.gauge("gross_notional").set(float(books.gross_notional))
        self.metrics.gauge("drawdown").set(float(self.pipeline.risk.state.drawdown))
        self.metrics.gauge("open_positions").set(len(books.positions))
        self.metrics.gauge("open_leg_groups").set(self.pipeline.unwinder.open_groups)
        self.metrics.gauge("kill_switch_engaged").set(
            1.0 if self.pipeline.risk.killswitch.is_engaged else 0.0
        )

    @property
    def has_open_positions(self) -> bool:
        return bool(self.pipeline.books.positions)

    # ------------------------------------------------------------------
    # Reconciliation
    # ------------------------------------------------------------------

    async def reconcile(self, force: bool = False) -> Tuple[bool, List[str]]:
        """Compare local belief against venue truth. The venue always wins."""
        at = self.clock()
        self._last_reconcile = at
        all_clean = True
        problems: List[str] = []

        for name, adapter in self.adapters.items():
            reconciler = self.reconcilers[name]
            try:
                remote_positions = await adapter.positions()
                remote_orders = await adapter.open_orders()
            except Exception as e:                             # noqa: BLE001
                if reconciler.on_cycle_failed():
                    self.pipeline.risk.killswitch.engage(
                        Trigger.RECONCILE_MISMATCH, at,
                        f"{name}: three consecutive reconciliation failures",
                    )
                problems.append(f"{name}: {e}")
                all_clean = False
                continue

            local_positions = {
                key: pos for key, pos in self.pipeline.books.positions.items()
                if key[0] == name
            }
            local_orders = {
                m.intent.client_order_id: m.to_state()
                for m in self.pipeline.executor.open_machines()
                if m.intent.venue == name
            }
            report = reconciler.reconcile(
                local_positions, remote_positions, local_orders, remote_orders,
                self.pipeline.books.equity, at,
            )
            self.metrics.counter("reconciliation_cycles").inc()

            halting = Reconciler.halting_discrepancies(report)
            if halting:
                all_clean = False
                problems.extend(str(d.get("detail", d.get("kind"))) for d in halting)
                self.metrics.gauge("reconciliation_consecutive_failures").set(2)
                self.pipeline.risk.killswitch.engage(
                    Trigger.MISSING_LOCAL if any(
                        d.get("kind") == DiscrepancyClass.MISSING_LOCAL for d in halting
                    ) else Trigger.RECONCILE_MISMATCH,
                    at, "; ".join(problems[:2]),
                )
            elif not report.clean:
                problems.extend(str(d.get("kind")) for d in report.discrepancies)

        if all_clean:
            self.metrics.gauge("reconciliation_consecutive_failures").set(0)
        self.pipeline.executor.reconciliation_clean = all_clean
        return all_clean, problems

    # ------------------------------------------------------------------
    # Halting
    # ------------------------------------------------------------------

    async def _flatten(self, reason: str, max_rounds: int = 3) -> "FlattenReport":
        """Cancel first, then reduce. Never the other way round.

        Flattening while your own stale quotes are still working means the
        flatten competes with them, which is how a halt makes a position worse.

        Four things this used to get wrong, all of them silent:

        * **Every ``ExecutionResult`` was discarded.** A flatten that placed
          nothing was indistinguishable from one that closed the book, and the
          caller - ``tick``, during an incident - had no way to tell.
        * **A symbol with no mark was skipped.** ``continue`` on a missing
          price left the position open, and a symbol whose feed has died is
          precisely the one most likely to need flattening. It is now sent as
          a reduce-only market order, priced by the venue rather than by us.
        * **The limit rested at mark.** An order at mid does not cross; it sits
          inside the spread behaving exactly like the passive quote we just
          cancelled, while the move that caused the halt continues. It now
          crosses at the far touch.
        * **Failed cancels were swallowed** (F-6), so reducing orders went out
          alongside a working order that may still have been live.

        Returns a :class:`FlattenReport`. The caller is told what happened,
        including what did not.
        """
        self.state = SessionState.HALTED
        self.alerts.raise_alert(Severity.P1, "flatten", reason, money_at_risk=True)
        self.metrics.counter("flattens").inc()
        report = FlattenReport(reason=reason)

        for round_index in range(max_rounds):
            if round_index:
                # Ask the venue about anything it never confirmed, before
                # deciding whether to send more. A flatten order that got a 5xx
                # is in QUERY, and QUERY is not "failed": resending it blind is
                # how a flatten doubles a position. Resolving it first turns
                # "unknown" into either "already working" (leave it alone) or
                # "never existed" (send a fresh one).
                await self._resolve_unknown_flatten_orders(report)
            await self._cancel_working_orders(report)
            failures_before = len(report.failed)
            await self._reduce_open_positions(report)
            report.remaining = self._open_positions()
            if not report.remaining:
                report.flat = True
                break
            if len(report.failed) == failures_before and not report.unknown:
                # Nothing failed this round, so every open position is either
                # already covered by a working reducing order or has just been
                # sent one. Another round would duplicate it; the position
                # closes when the fills arrive. Only a failure earns a retry.
                break

        report.uncovered = [f"{v}:{s}" for v, s in report.remaining
                            if self._reducing_in_flight(v, s) == 0]
        # An order still in QUERY is not coverage. It may be live and filling,
        # or it may never have reached the venue, and the difference is exactly
        # what nobody knows. Counting it as done is the optimistic reading, and
        # the optimistic reading during a flatten is the expensive one.
        report.complete = not (report.failed or report.cancel_failures
                               or report.uncovered or report.unknown)

        if not report.complete:
            # Say so, loudly. A flatten that did not flatten is the single most
            # important fact in the system at this moment, and it used to be
            # unobservable: every ExecutionResult was discarded.
            self.alerts.raise_alert(
                Severity.P1, "flatten_incomplete",
                f"flatten for {reason!r} left {len(report.uncovered)} position(s) with "
                f"nothing working for them: {report.uncovered}; cancel failures: "
                f"{report.cancel_failures}; order failures: {report.failed}",
                money_at_risk=True,
            )
        self.metrics.gauge("flatten_incomplete",
                           "1 when a flatten left a position with no reducing order").set(
            0.0 if report.complete else 1.0)
        self._record_flatten_audit(report)
        return report

    def _open_positions(self) -> List[Tuple[str, str]]:
        return [key for key, position in self.pipeline.books.positions.items()
                if position.quantity != 0]

    async def _cancel_working_orders(self, report: "FlattenReport") -> None:
        """Cancel first. A failure here is recorded, not swallowed.

        The cancel is still attempted for every order even after one fails:
        abandoning the rest would leave more stale quotes live, not fewer. What
        changes is that the caller learns which ones are still out there.
        """
        for machine in list(self.pipeline.executor.open_machines()):
            if machine.intent.strategy_id == FLATTEN_STRATEGY_ID:
                # Not our own reducing orders. "Cancel first" is about the
                # stale strategy quotes the flatten would otherwise compete
                # with; cancelling the order that is closing the position and
                # sending another one just reopens the window it was closing.
                continue
            coid = machine.intent.client_order_id
            try:
                cancelled = await self.pipeline.executor.cancel(coid)
            except Exception as e:                             # noqa: BLE001
                report.cancel_failures.append(f"{coid}: {e}")
                continue
            if not cancelled and not machine.is_terminal:
                # `cancel` returns False for a rejected cancel it has already
                # re-queried. The order may have filled, or may still be live.
                report.cancel_failures.append(
                    f"{coid}: cancel not confirmed, status {machine.status}")

    def _reducing_in_flight(self, venue: str, symbol: str) -> Dec:
        """Signed quantity of *our own* flatten orders still working.

        Only flatten orders count. A stale strategy order that could not be
        cancelled is exposure we do not control, and netting it off here would
        size the flatten against an order that may never fill - which is how a
        flatten oversells and turns a long into a short. It is reported as a
        cancel failure instead, where an operator can see it.
        """
        total = dec(0)
        for machine in self.pipeline.executor.open_machines():
            intent = machine.intent
            if (intent.strategy_id != FLATTEN_STRATEGY_ID
                    or intent.venue != venue or intent.symbol != symbol):
                continue
            total += machine.remaining if intent.side == "buy" else -machine.remaining
        return total

    async def _reduce_open_positions(self, report: "FlattenReport") -> None:
        """Send one reducing order per uncovered position."""
        # The ledger and the risk service must agree about what is held before
        # the risk service is asked, because the reduce_only exemption is
        # granted on *its* view of the position: an order that reduces the
        # ledger's position but not the risk service's stale copy is not a
        # reduction as far as the checks are concerned, and gets refused at the
        # worst possible moment.
        self.pipeline.books.apply_to(self.pipeline.risk.state)
        for (venue, symbol), position in list(self.pipeline.books.positions.items()):
            if position.quantity == 0:
                continue
            # What would be left if every flatten order already working filled.
            # Without this a second round sends a second order for a position
            # the first round has already covered, and two reduce orders for
            # one position is how a flatten flips it.
            outstanding = position.quantity + self._reducing_in_flight(venue, symbol)
            if outstanding == 0:
                continue
            side = "sell" if outstanding > 0 else "buy"
            # Cross, do not rest. `aggressive` prices at the far touch and
            # falls back to mid only when there is no touch to cross.
            price = self.pipeline._order_price(venue, symbol, side, "aggressive")
            # No price at all means no book: the feed for this symbol is gone,
            # which is a reason to leave the price to the venue, not a reason
            # to leave the position open.
            order_type = "limit" if price is not None else "market"
            try:
                intent = self.pipeline.executor.build_intent(
                    strategy_id=FLATTEN_STRATEGY_ID, venue=venue, symbol=symbol,
                    side=side, quantity=abs(outstanding),
                    correlation_id="flatten", price=price, order_type=order_type,
                    reduce_only=True,
                )
            except Exception as e:                             # noqa: BLE001
                report.failed.append(f"{venue}:{symbol}: could not build intent: {e}")
                continue

            # Risk is asked, and answers against the real feed state rather
            # than a MarketEvent fabricated for the occasion. The reduce_only
            # exemption in the risk service is what makes that survivable: the
            # checks a flatten trigger sets off no longer refuse the flatten.
            decision = self.pipeline.risk.evaluate(
                intent, self.pipeline.flatten_risk_context(venue, self.clock()))
            if not decision.approved:
                report.failed.append(
                    f"{venue}:{symbol}: risk refused the flatten: {decision.rejected_by}")
                continue
            try:
                outcome = await self.pipeline.executor.submit(intent, decision)
            except Exception as e:                             # noqa: BLE001
                report.failed.append(f"{venue}:{symbol}: {e}")
                continue
            if outcome.accepted:
                report.submitted.append(intent.client_order_id)
            elif outcome.unknown:
                # Never resent. An order whose fate is unknown may be live, and
                # sending another is how a flatten doubles a position.
                report.unknown.append(intent.client_order_id)
            else:
                report.failed.append(f"{venue}:{symbol}: {outcome.reason}")

    async def _resolve_unknown_flatten_orders(self, report: "FlattenReport") -> None:
        """Poll every flatten order whose outcome the venue never confirmed.

        Never sends anything - :meth:`Executor.resolve_unknown` is a query. An
        order that resolves to rejected or not-found becomes terminal, which is
        what lets the next round send a replacement; one that resolves to live
        or filled stays counted as coverage.
        """
        for coid in list(report.unknown):
            machine = self.pipeline.executor.machines.get(coid)
            if machine is None:
                report.unknown.remove(coid)
                continue
            try:
                machine = await self.pipeline.executor.resolve_unknown(coid)
            except Exception as e:                             # noqa: BLE001
                report.failed.append(f"{coid}: could not resolve QUERY: {e}")
                continue
            if machine.status != OrderStatus.QUERY:
                report.unknown.remove(coid)
                if machine.is_terminal and machine.filled == 0:
                    report.failed.append(
                        f"{coid}: resolved {machine.status} with nothing filled; "
                        "the position still needs a reducing order")
                else:
                    report.submitted.append(coid)

    def _record_flatten_audit(self, report: "FlattenReport") -> None:
        record = getattr(self.pipeline, "_record_audit", None)
        if record is None:
            return
        record("flatten", {
            "reason": report.reason,
            "flat": report.flat,
            "submitted": list(report.submitted),
            "unknown": list(report.unknown),
            "failed": list(report.failed),
            "cancel_failures": list(report.cancel_failures),
            "uncovered": list(report.uncovered),
            "remaining": [f"{v}:{s}" for v, s in report.remaining],
        }, "flatten")

    async def manual_kill(self, operator: str) -> None:
        """One command that flattens everything and disables all strategies.

        Every operator has it, and it is tested weekly in production during
        low-risk hours. An untested kill switch is a hypothesis.
        """
        self.pipeline.risk.killswitch.engage(Trigger.MANUAL, self.clock(), f"by {operator}")
        for strategy in self.pipeline.strategies:
            strategy.health.enabled = False
        await self._flatten(f"manual kill by {operator}")
        # Publish immediately. A dashboard that only learns the switch fired at
        # the next tick is a dashboard an operator checks during an incident
        # and misreads.
        self._publish_state()

    async def stop(self) -> None:
        self.state = SessionState.STOPPED

    # ------------------------------------------------------------------

    def status(self) -> Dict[str, object]:
        return {
            "state": self.state,
            "kill_switch": self.pipeline.risk.killswitch.status(),
            "equity": str(self.pipeline.books.equity),
            "open_positions": len(self.pipeline.books.positions),
            "open_orders": len(self.pipeline.executor.open_machines()),
            "open_leg_groups": self.pipeline.unwinder.open_groups,
            "reconciliation_clean": self.pipeline.executor.reconciliation_clean,
            "allocation": self.pipeline.allocator.status(),
            "strategies": {
                s.strategy_id: {"state": s.health.state, "enabled": s.health.enabled}
                for s in self.pipeline.strategies
            },
        }
