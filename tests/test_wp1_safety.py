"""WP1 - safety and security. The findings that cause loss rather than mismeasurement.

Every test here fails against the code as it stood before the WP1 remediation,
and each one exercises the *real* collaborator rather than a fake shaped to
agree with the code: the real :class:`RiskService` against a real
:class:`PortfolioState`, the real :class:`BinanceAdapter` against a transport
that records what it was actually handed, the real :class:`TradingSession`
against the real simulator.
"""

from __future__ import annotations

import asyncio

import pytest

from tradesys.core.events import OrderIntent, Position, SymbolFilter
from tradesys.core.types import dec
from tradesys.layers.l5_risk.killswitch import KillSwitch, SwitchState, Trigger
from tradesys.layers.l5_risk.service import (
    CHECKS, FLATTEN_STRATEGY_ID, RiskContext, RiskService,
)
from tradesys.layers.l5_risk.state import PortfolioState

NOW = 1_700_000_000_000_000_000
MARK = dec("60000")


# ----------------------------------------------------------------------
# G-1 - the flatten path is refused by the checks its own triggers set off
# ----------------------------------------------------------------------


def _flattening_switch() -> KillSwitch:
    """A switch in the state every flatten trigger derives."""
    switch = KillSwitch()
    switch.engage(Trigger.DEADMAN, NOW, "risk service heartbeat missed")
    assert switch.state == SwitchState.FLATTENING
    return switch


def _held(state: PortfolioState, qty: str = "1") -> None:
    state.positions[("sim", "BTCUSDT")] = Position(
        "sim", "BTCUSDT", dec(qty), MARK, MARK)


def _flatten_intent(qty: str = "1", side: str = "sell", price=MARK,
                    strategy: str = FLATTEN_STRATEGY_ID) -> OrderIntent:
    return OrderIntent(
        correlation_id="flatten", emitted_at=NOW, source="t",
        client_order_id="ts_flat", venue="sim", symbol="BTCUSDT", side=side,
        quantity=dec(qty), order_type="limit", price=price,
        reduce_only=True, strategy_id=strategy,
    )


def _ctx(**kw) -> RiskContext:
    base = dict(now=NOW, feed_last_event={"BTCUSDT": NOW},
                reconciliation_clean=True, mark_prices={"BTCUSDT": MARK})
    base.update(kw)
    return RiskContext(**base)


def _service(limits, state) -> RiskService:
    return RiskService(limits, state, killswitch=_flattening_switch())


# Each row is one line of the review's flatten probe: a condition that a
# flatten trigger sets off, and which the flatten was then refused by. All of
# them must place an order.

def test_flatten_places_through_dirty_reconciliation(limits, state):
    """Check 3. A venue that stopped answering is what CONNECTIVITY means."""
    _held(state)
    decision = _service(limits, state).evaluate(
        _flatten_intent(), _ctx(reconciliation_clean=False))
    assert decision.approved, decision.rejected_by


def test_flatten_places_with_no_feed_at_all(limits, state):
    """Check 4. A symbol absent from the feed map is the dead-feed case."""
    _held(state)
    decision = _service(limits, state).evaluate(
        _flatten_intent(), _ctx(feed_last_event={}))
    assert decision.approved, decision.rejected_by


def test_flatten_places_through_a_stale_feed(limits, state):
    """Check 4. FEED_STALENESS is itself a kill-switch trigger."""
    _held(state)
    decision = _service(limits, state).evaluate(
        _flatten_intent(), _ctx(feed_last_event={"BTCUSDT": NOW - 600 * 10**9}))
    assert decision.approved, decision.rejected_by


def test_flatten_places_over_the_single_order_notional_cap(limits, state):
    """Check 6. A position built in ten permitted orders cannot be closed in one."""
    _held(state)
    decision = _service(limits, state).evaluate(_flatten_intent(), _ctx())
    assert decision.approved, decision.rejected_by
    assert decision.adjusted_quantity == dec("1")


def test_flatten_places_over_the_per_trade_risk_limit(limits, state):
    """Check 7. Per-trade risk measures the risk a trade adds; a reduction adds none."""
    _held(state)
    decision = _service(limits, state).evaluate(_flatten_intent(), _ctx())
    assert decision.approved, decision.rejected_by


def test_partial_reduction_places_while_over_the_position_cap(limits, state):
    """Check 8. Being over the cap is the condition; refusing the cure is backwards."""
    _held(state)
    decision = _service(limits, state).evaluate(_flatten_intent(qty="0.1"), _ctx())
    assert decision.approved, decision.rejected_by
    assert decision.adjusted_quantity == dec("0.1")


def test_flatten_places_through_a_daily_loss_breach(limits, state):
    """Check 13. DAILY_LOSS engages a FLATTENING trigger and then refuses the flatten."""
    _held(state)
    state.unrealised = dec("-5000")            # 5% of a 3% daily limit
    decision = _service(limits, state).evaluate(_flatten_intent(), _ctx())
    assert decision.approved, decision.rejected_by


def test_flatten_places_through_a_weekly_loss_breach(limits, state):
    _held(state)
    state.unrealised = dec("-9000")            # 9% of a 7% weekly limit
    decision = _service(limits, state).evaluate(_flatten_intent(), _ctx())
    assert decision.approved, decision.rejected_by


def test_the_loss_state_check_still_engages_the_switch_on_a_flatten(limits, state):
    """Exempting the rejection does not exempt the measurement."""
    _held(state)
    state.unrealised = dec("-5000")
    service = _service(limits, state)
    service.evaluate(_flatten_intent(), _ctx())
    assert Trigger.DAILY_LOSS in service.killswitch.engaged


def test_flatten_places_with_equity_wiped_out(limits, state):
    """Zero equity is the worst moment to refuse to close a position."""
    _held(state)
    state.unrealised = dec("-100000")
    decision = _service(limits, state).evaluate(_flatten_intent(), _ctx())
    assert decision.approved, decision.rejected_by


def test_flatten_places_under_every_condition_at_once(limits, state):
    """The compound row: everything that can be wrong is wrong."""
    _held(state)
    state.unrealised = dec("-99000")
    decision = _service(limits, state).evaluate(
        _flatten_intent(),
        _ctx(reconciliation_clean=False, feed_last_event={}),
    )
    assert decision.approved, decision.rejected_by


def test_a_flatten_is_never_throttled(limits, state):
    """Queueing the order that ends the incident is the same as refusing it."""
    from tradesys.adapters.base import RateLimitState

    _held(state)
    decision = _service(limits, state).evaluate(
        _flatten_intent(), _ctx(rate_limit=RateLimitState(5900, 6000)))
    assert decision.approved, decision.rejected_by
    assert not decision.throttle


# -- and the checks that are kept must still bite -----------------------


def test_the_exemption_does_not_cover_an_order_that_does_not_reduce(limits, state):
    """`reduce_only` is a flag any caller can set. What earns the exemption is
    that the order is arithmetically a reduction against the risk service's own
    position state."""
    _held(state)
    enlarging = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_x",
        venue="sim", symbol="BTCUSDT", side="buy", quantity=dec("1"),
        order_type="limit", price=MARK, reduce_only=True,
        strategy_id=FLATTEN_STRATEGY_ID,
    )
    decision = _service(limits, state).evaluate(
        enlarging, _ctx(reconciliation_clean=False))
    assert not decision.approved
    # Check 1 gets it first: an order that does not reduce has no business
    # surviving the switch that demanded the flatten.
    assert decision.rejected_by.startswith(CHECKS[0])


def test_the_exemption_does_not_cover_a_reduction_with_no_position(limits, state):
    decision = _service(limits, state).evaluate(
        _flatten_intent(), _ctx(reconciliation_clean=False))
    assert not decision.approved


def test_symbol_filters_still_bite_on_a_reducing_order(limits, state):
    """Kept: the venue would refuse it anyway, and locally is the loud place."""
    _held(state)
    filters = {"BTCUSDT": SymbolFilter("BTCUSDT", dec("0.01"), dec("0.1"), dec("10"))}
    decision = _service(limits, state).evaluate(
        _flatten_intent(qty="0.15"), _ctx(filters=filters))
    assert not decision.approved
    assert decision.rejected_by.startswith(CHECKS[4])


def test_a_reduce_only_order_is_still_blocked_while_merely_halted(limits, state):
    """Kept: a reduce_only order while HALTED is not a flatten."""
    _held(state)
    switch = KillSwitch()
    switch.engage(Trigger.RECONCILE_MISMATCH, NOW, "mismatch")
    assert switch.state == SwitchState.HALTED
    service = RiskService(limits, state, killswitch=switch)
    decision = service.evaluate(_flatten_intent(), _ctx())
    assert not decision.approved
    assert decision.rejected_by.startswith(CHECKS[0])


# -- consecutive_rejects must never disable the flatten pseudo-strategy --


def test_the_flatten_pseudo_strategy_is_never_disabled(limits, state):
    """A flatten refused five times must not be permanently disabled - that is
    the exact opposite of the correct failure direction."""
    service = RiskService(limits, state, killswitch=_flattening_switch())
    for _ in range(10):
        # No position, so the exemption does not apply and every one rejects.
        service.evaluate(_flatten_intent(), _ctx(reconciliation_clean=False))
    assert FLATTEN_STRATEGY_ID not in state.disabled_strategies


def test_an_ordinary_strategy_is_still_disabled_after_five_rejects(limits, state):
    service = RiskService(limits, state)
    intent = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_o",
        venue="sim", symbol="BTCUSDT", side="buy", quantity=dec("0.01"),
        order_type="limit", price=MARK, strategy_id="carry",
    )
    for _ in range(5):
        service.evaluate(intent, _ctx(reconciliation_clean=False))
    assert "carry" in state.disabled_strategies


# ----------------------------------------------------------------------
# G-7 - check 8's reduce-and-return skips checks 9 to 13
# ----------------------------------------------------------------------


def _partial_fill_setup(state):
    """A 0.01 BTC position and a 0.03 BTC order: check 6 and check 7 pass, and
    check 8 clamps the order to the room left under the position cap."""
    state.positions[("sim", "BTCUSDT")] = Position("sim", "BTCUSDT", dec("0.01"), MARK, MARK)
    return OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_r",
        venue="sim", symbol="BTCUSDT", side="buy", quantity=dec("0.03"),
        order_type="limit", price=MARK, strategy_id="carry",
    )


def test_a_reduction_at_check_8_still_faces_check_13(limits, state):
    """Check 8 approving early skipped the loss state entirely."""
    intent = _partial_fill_setup(state)
    state.unrealised = dec("-5000")            # past the 3% daily limit
    service = RiskService(limits, state)
    decision = service.evaluate(intent, _ctx())
    assert not decision.approved, decision.adjusted_quantity
    assert decision.rejected_by.startswith(CHECKS[12])
    assert Trigger.DAILY_LOSS in service.killswitch.engaged


def test_a_reduction_at_check_8_still_faces_check_12(limits, state):
    """Check 12's reduce-exemption still behaves once 8 no longer short-circuits:
    the clamped order still enlarges the position, so it is still refused."""
    intent = _partial_fill_setup(state)
    service = RiskService(limits, state)
    decision = service.evaluate(
        intent, _ctx(liquidation_distance={("sim", "BTCUSDT"): dec("0.05")}))
    assert not decision.approved, decision.adjusted_quantity
    assert decision.rejected_by.startswith(CHECKS[11])


def test_check_12_still_passes_an_order_that_shrinks_the_book(limits, state):
    """The other half of the same exemption: close to liquidation is exactly
    when a reducing order must go out."""
    state.positions[("sim", "BTCUSDT")] = Position("sim", "BTCUSDT", dec("0.03"), MARK, MARK)
    service = RiskService(limits, state)
    intent = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_s",
        venue="sim", symbol="BTCUSDT", side="sell", quantity=dec("0.01"),
        order_type="limit", price=MARK, strategy_id="carry",
    )
    decision = service.evaluate(
        intent, _ctx(liquidation_distance={("sim", "BTCUSDT"): dec("0.05")}))
    assert decision.approved, decision.rejected_by


def test_a_reduction_that_clears_every_later_check_is_approved_at_its_reduced_size(limits, state):
    intent = _partial_fill_setup(state)
    service = RiskService(limits, state)
    state.consecutive_rejects["carry"] = 3
    decision = service.evaluate(intent, _ctx())
    assert decision.approved, decision.rejected_by
    # 2% of 100k equity is 2000 notional; 600 of it is already held, leaving
    # 1400 at 60000 - a whisker over 0.0233 BTC.
    assert dec("0.023") < decision.adjusted_quantity < dec("0.024")
    # And the approval resets the reject counter, which the early return skipped.
    assert state.consecutive_rejects.get("carry", 0) == 0


def test_concentration_refuses_an_enlargement_but_not_an_unwind(limits, state):
    """Check 9 kept its teeth where they belong: a book already past the
    concentration limit must still refuse to add, and must stop refusing to
    shed."""
    _held(state)                               # 0.60 of a 0.25 limit
    service = RiskService(limits, state)
    # A declared stop wide enough that check 8 is not the binding constraint,
    # so check 9 is the one under test.
    stops = {"carry": dec("0.02")}
    adding = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_a",
        venue="sim", symbol="BTCUSDT", side="buy", quantity=dec("0.01"),
        order_type="limit", price=MARK, strategy_id="carry",
    )
    refused = service.evaluate(adding, _ctx(stop_distance_frac=stops))
    assert not refused.approved
    assert refused.rejected_by.startswith(CHECKS[8])

    shedding = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_b",
        venue="sim", symbol="BTCUSDT", side="sell", quantity=dec("0.01"),
        order_type="limit", price=MARK, strategy_id="carry",
    )
    assert service.evaluate(shedding, _ctx(stop_distance_frac=stops)).approved


# ----------------------------------------------------------------------
# G-4 - the signer's allowlist inspects a constant
# ----------------------------------------------------------------------


class SpyTransport:
    """Records what it was actually handed. It echoes nothing.

    The whole reason F-1 and G-4 survived 787 tests is that BinanceAdapter was
    only ever driven against a transport that agreed with whatever URL it was
    given. This one asserts on the URL instead.
    """

    def __init__(self, responses=None):
        from tradesys.adapters.binance import Response

        self.calls = []
        self.responses = list(responses or [])
        self._default = Response(200, {}, {})

    def request(self, method, url, headers, body=None):
        self.calls.append((method, url, dict(headers)))
        return self.responses.pop(0) if self.responses else self._default

    @property
    def paths(self):
        return [url.split("?")[0].split(".com", 1)[-1] for _, url, _ in self.calls]


def _signing_adapter(endpoints=None):
    from tradesys.adapters.binance import BinanceAdapter, BinanceEndpoints
    from tradesys.security.signer import SigningService

    service = SigningService()
    service.add_key("live", "tradesys", "testnet", "secret", permissions=("trade",))
    transport = SpyTransport()
    adapter = BinanceAdapter(
        endpoints or BinanceEndpoints.spot_testnet(), api_key="k",
        signer=service.as_signer("tradesys", "testnet"), transport=transport,
    )
    return adapter, transport, service


def test_a_withdrawal_is_refused_by_the_signer_the_adapter_actually_uses():
    """Drive the real adapter at a withdrawal endpoint. The allowlist must see
    the path being signed, not the one bound at construction."""
    from tradesys.security.signer import SigningRefused

    adapter, transport, service = _signing_adapter()
    with pytest.raises(SigningRefused):
        adapter._call("POST", "/sapi/v1/capital/withdraw/apply",
                      {"coin": "USDT", "amount": "1000000"}, signed=True)
    assert transport.calls == [], "the request was signed and sent"
    refused = service.refusals
    assert len(refused) == 1
    assert refused[0]["endpoint"] == "/sapi/v1/capital/withdraw/apply"


def test_the_audit_row_records_the_path_that_was_really_signed():
    adapter, _, service = _signing_adapter()
    asyncio.run(adapter.cancel("ts_1", "BTCUSDT"))
    endpoints = [row["endpoint"] for row in service.audit]
    assert endpoints == ["/api/v3/order"]


def test_every_signed_path_reaches_the_signer_distinctly():
    """Three different signed calls must produce three different audit paths.
    Before the fix all of them read `/api/v3/order`."""
    from tradesys.adapters.binance import Response

    adapter, transport, service = _signing_adapter()
    transport.responses = [Response(200, {"balances": []}, {}),
                           Response(200, [], {})]
    asyncio.run(adapter.balances())
    asyncio.run(adapter.open_orders())
    asyncio.run(adapter.cancel("ts_1", "BTCUSDT"))
    assert [row["endpoint"] for row in service.audit] == [
        "/api/v3/account", "/api/v3/openOrders", "/api/v3/order",
    ]


def test_a_path_aware_signer_refuses_to_sign_without_a_path():
    """The constant-path binding is gone, so forgetting the path fails loudly
    rather than signing against a stale one."""
    from tradesys.adapters.binance import build_signed_query
    from tradesys.security.signer import SigningService

    service = SigningService()
    service.add_key("live", "tradesys", "testnet", "secret")
    with pytest.raises(ValueError, match="path"):
        build_signed_query({"a": 1}, service.as_signer("tradesys", "testnet"))


# ----------------------------------------------------------------------
# G-20b / F-4 - BinanceAdapter.positions() returns [] on futures
# ----------------------------------------------------------------------


def _futures(transport=None, clock=None):
    from tradesys.adapters.binance import BinanceAdapter, BinanceEndpoints, HmacSigner

    transport = transport or SpyTransport()
    kw = {"clock": clock} if clock is not None else {}
    return BinanceAdapter(BinanceEndpoints.futures_production(), api_key="k",
                          signer=HmacSigner("s"), transport=transport, **kw), transport


def test_futures_positions_are_read_from_the_venue():
    """Reconciliation compares local belief against `adapter.positions()`. On
    futures that comparison was against an empty list, so a real venue position
    the system did not know about read as clean."""
    from tradesys.adapters.binance import Response

    adapter, transport = _futures(SpyTransport([Response(200, [
        {"symbol": "BTCUSDT", "positionAmt": "-0.5", "entryPrice": "60000",
         "markPrice": "60500", "liquidationPrice": "70000"},
        {"symbol": "ETHUSDT", "positionAmt": "0", "entryPrice": "0",
         "markPrice": "3000", "liquidationPrice": "0"},
    ], {})]))
    positions = asyncio.run(adapter.positions())
    assert [p.symbol for p in positions] == ["BTCUSDT"]
    assert positions[0].quantity == dec("-0.5")
    assert positions[0].mark_price == dec("60500")
    assert positions[0].liquidation_price == dec("70000")
    assert transport.paths == ["/fapi/v2/positionRisk"]


def test_spot_positions_are_still_empty_and_say_why():
    """Spot really has balances, not positions. The bug was the futures case
    silently sharing that answer."""
    adapter, transport = _signing_adapter()[:2]
    assert asyncio.run(adapter.positions()) == []
    assert transport.calls == []


def test_futures_calls_use_futures_paths():
    """`positions()` cannot be fixed while every path literal is a spot path."""
    from tradesys.adapters.binance import Response

    adapter, transport = _futures(SpyTransport([
        Response(200, {"symbols": []}, {}),
        Response(200, {"serverTime": 1}, {}),
        Response(200, {"bids": [], "asks": [], "lastUpdateId": 1}, {}),
    ]))
    asyncio.run(adapter.reference_data())
    asyncio.run(adapter.server_time())
    asyncio.run(adapter.book_snapshot("BTCUSDT"))
    assert transport.paths == ["/fapi/v1/exchangeInfo", "/fapi/v1/time", "/fapi/v1/depth"]
    assert all("/api/v3/" not in url for _, url, _ in transport.calls)


def test_a_futures_reduce_only_order_carries_the_flag_to_the_venue():
    """The risk service's reduce_only exemption leans on the venue's own
    reduceOnly enforcement as its backstop. An adapter that drops the flag
    removes the backstop."""
    from tradesys.core.events import OrderIntent as OI

    adapter, transport = _futures()
    intent = OI(correlation_id="c", emitted_at=NOW, source="t",
                client_order_id="ts_f", venue="binance-futures", symbol="BTCUSDT",
                side="sell", quantity=dec("0.5"), order_type="market",
                reduce_only=True, strategy_id=FLATTEN_STRATEGY_ID)
    asyncio.run(adapter.place(intent))
    method, url, _ = transport.calls[0]
    assert "/fapi/v1/order" in url
    assert "reduceOnly=true" in url


def test_a_spot_order_never_carries_reduce_only():
    """Spot has no such flag; sending it is a -1102 on every order."""
    from tradesys.core.events import OrderIntent as OI

    adapter, transport, _ = _signing_adapter()
    intent = OI(correlation_id="c", emitted_at=NOW, source="t",
                client_order_id="ts_s", venue="binance-spot-testnet", symbol="BTCUSDT",
                side="sell", quantity=dec("0.5"), order_type="market",
                reduce_only=True, strategy_id=FLATTEN_STRATEGY_ID)
    asyncio.run(adapter.place(intent))
    assert "reduceOnly" not in transport.calls[0][1]


# ----------------------------------------------------------------------
# F-7 - rate-limit weight is parsed but never enforced
# ----------------------------------------------------------------------


def test_a_non_critical_call_is_refused_locally_near_the_budget():
    """An IP ban while holding a position means no data *and* no ability to
    flatten, so the budget has to be respected before the request goes out."""
    from tradesys.core.errors import RateLimited

    adapter, transport, _ = _signing_adapter()
    adapter._weight_used = 5800                 # of 6000
    with pytest.raises(RateLimited):
        asyncio.run(adapter.reference_data())
    assert transport.calls == [], "the request went out anyway"


def test_order_traffic_still_goes_out_at_the_same_pressure():
    """Above 90% the budget is reserved for order traffic. Refusing a flatten
    to protect a rate limit is the wrong failure direction."""
    from tradesys.core.events import OrderIntent as OI

    adapter, transport, _ = _signing_adapter()
    adapter._weight_used = 5800
    intent = OI(correlation_id="c", emitted_at=NOW, source="t",
                client_order_id="ts_p", venue="binance-spot-testnet",
                symbol="BTCUSDT", side="sell", quantity=dec("0.5"),
                order_type="market", reduce_only=True,
                strategy_id=FLATTEN_STRATEGY_ID)
    asyncio.run(adapter.place(intent))
    asyncio.run(adapter.cancel("ts_p", "BTCUSDT"))
    assert len(transport.calls) == 2


def test_everything_is_refused_once_the_budget_is_exhausted():
    from tradesys.core.errors import RateLimited
    from tradesys.core.events import OrderIntent as OI

    adapter, transport, _ = _signing_adapter()
    adapter._weight_used = 6000
    intent = OI(correlation_id="c", emitted_at=NOW, source="t",
                client_order_id="ts_q", venue="binance-spot-testnet",
                symbol="BTCUSDT", side="sell", quantity=dec("0.5"),
                order_type="market", strategy_id="carry")
    with pytest.raises(RateLimited):
        asyncio.run(adapter.place(intent))
    assert transport.calls == []


def test_a_ban_is_waited_out_rather_than_walked_into_again():
    """418 is the venue telling us it already banned the IP. Sending the next
    request extends the ban."""
    from tradesys.adapters.binance import Response
    from tradesys.core.errors import IpBanned

    clock = {"t": 1000.0}
    adapter, transport = _futures(SpyTransport([
        Response(418, {"msg": "banned"}, {"Retry-After": "120"}),
    ]), clock=lambda: clock["t"])
    with pytest.raises(IpBanned):
        asyncio.run(adapter.server_time())
    assert len(transport.calls) == 1

    clock["t"] = 1060.0
    with pytest.raises(IpBanned):
        asyncio.run(adapter.server_time())
    assert len(transport.calls) == 1, "the ban was walked into again"

    clock["t"] = 1121.0
    transport.responses = [Response(200, {"serverTime": 1}, {})]
    asyncio.run(adapter.server_time())
    assert len(transport.calls) == 2


def test_the_weight_estimate_decays_with_the_minute_window():
    """Binance's weight budget is per minute. A local estimate that never
    resets refuses everything forever after one busy minute."""
    from tradesys.adapters.binance import Response

    from tradesys.core.errors import RateLimited

    clock = {"t": 1000.0}
    adapter, transport = _futures(SpyTransport([Response(200, {"serverTime": 1}, {})]),
                                  clock=lambda: clock["t"])
    adapter._weight_used = 5900
    with pytest.raises(RateLimited):
        asyncio.run(adapter.server_time())
    assert transport.calls == []
    clock["t"] = 1061.0
    asyncio.run(adapter.server_time())
    assert len(transport.calls) == 1


# ----------------------------------------------------------------------
# G-21 - the dead-man switch is fed by the loop it polices
# ----------------------------------------------------------------------


def _session(**overrides):
    from tradesys.demo import build_pipeline
    from tradesys.session import SessionConfig, TradingSession

    pipeline, adapters, _ = build_pipeline()
    clock = {"now": NOW}
    config = SessionConfig(reconcile_interval_ns=8 * 3600 * 10**9,
                           heartbeat_interval_ns=2 * 10**9,
                           strategy_settle_ns=0)
    for key, value in overrides.items():
        setattr(config, key, value)
    session = TradingSession(pipeline, adapters, config=config,
                             clock=lambda: clock["now"])
    return session, adapters, clock


def test_ticking_does_not_feed_the_switch_it_checks():
    """The beat and the check were the same statement: tick() beat the switch
    and then asked whether it had been beaten. It could never fire."""
    session, _, clock = _session()
    asyncio.run(session.start())
    session.beat_risk(clock["now"])
    switch = session.pipeline.risk.killswitch

    fired = []
    for _ in range(20):
        clock["now"] += 5 * 10**9                     # 5s a tick, tolerance 10s
        asyncio.run(session.tick())
        if Trigger.DEADMAN in switch.engaged:
            fired.append(clock["now"])
            break
    assert fired, "twenty ticks with no heartbeat and the dead-man never fired"


def test_a_beaten_switch_does_not_fire():
    session, _, clock = _session()
    asyncio.run(session.start())
    switch = session.pipeline.risk.killswitch
    for _ in range(20):
        clock["now"] += 2 * 10**9
        session.beat_risk(clock["now"])
        asyncio.run(session.tick())
    assert Trigger.DEADMAN not in switch.engaged


def test_the_heartbeat_is_a_liveness_probe_not_an_assignment():
    """A heartbeat that is only an assignment proves the caller is alive, not
    the service. A risk service that cannot answer must not beat."""
    session, _, clock = _session()
    asyncio.run(session.start())
    risk = session.pipeline.risk
    assert risk.heartbeat(clock["now"]) is True

    risk.limits = None                                 # the service is wedged
    assert risk.heartbeat(clock["now"] + 10**9) is False
    assert risk.killswitch.deadman_last_beat == clock["now"]


def test_a_session_that_requires_the_dead_man_refuses_to_start_unarmed():
    """Arming it inside start() made it look armed in a backtest and in every
    process with nothing beating it. Requiring a real beater is the only way
    the gate means anything."""
    from tradesys.layers.l6_execution.startup import StartupGateFailed

    session, _, _ = _session(require_deadman=True)
    with pytest.raises(StartupGateFailed, match="dead"):
        asyncio.run(session.start())


def test_a_session_that_requires_the_dead_man_starts_once_beaten():
    session, _, clock = _session(require_deadman=True)
    session.beat_risk(clock["now"])
    asyncio.run(session.start())
    assert session.pipeline.risk.killswitch.deadman_last_beat is not None


def test_a_backtest_session_leaves_the_switch_disarmed():
    """There is no separate risk service in a backtest, so there is nothing for
    a dead-man to detect. Arming it would flatten every backtest that simulated
    more than ten seconds."""
    session, _, clock = _session()
    asyncio.run(session.start())
    assert session.pipeline.risk.killswitch.deadman_last_beat is None
    clock["now"] += 3600 * 10**9
    asyncio.run(session.tick())
    assert Trigger.DEADMAN not in session.pipeline.risk.killswitch.engaged


# ----------------------------------------------------------------------
# G-14 / F-6 - the flatten path
# ----------------------------------------------------------------------


def _held_session(qty="0.5", mark=True, **overrides):
    """A session holding a position on the perp venue, ready to be flattened."""
    from tradesys.demo import PERP_VENUE, SYMBOL

    session, adapters, clock = _session(**overrides)
    session.state = "RUNNING"
    books = session.pipeline.books
    books.positions[(PERP_VENUE, SYMBOL)] = Position(
        PERP_VENUE, SYMBOL, dec(qty), dec("60000"), dec("60000"))
    books.apply_to(session.pipeline.risk.state)
    if mark:
        session.pipeline._marks[(PERP_VENUE, SYMBOL)] = dec("60000")
        session.pipeline._touch[(PERP_VENUE, SYMBOL)] = (dec("59990"), dec("60010"))
    session.pipeline.filters.setdefault(SYMBOL, None)
    session.pipeline.filters.pop(SYMBOL, None)
    return session, adapters, clock


def test_a_flatten_reports_what_it_managed_to_do():
    """`_flatten` discarded every ExecutionResult, so a flatten that placed
    nothing was indistinguishable from one that closed the book."""
    session, adapters, _ = _held_session()
    report = asyncio.run(session._flatten("test"))
    assert report.submitted, report
    assert not report.failed, report
    assert report.flat is False or report.remaining == []


def test_a_flatten_does_not_skip_a_symbol_with_no_mark():
    """`continue` on a missing mark left the position open and said nothing.
    A symbol whose feed has died is the one most likely to need flattening."""
    session, adapters, _ = _held_session(mark=False)
    report = asyncio.run(session._flatten("no mark"))
    assert report.submitted, f"the position was skipped: {report}"
    intents = [m.intent for m in session.pipeline.executor.machines.values()]
    assert intents and intents[0].order_type == "market"


def test_a_flatten_crosses_rather_than_resting_at_mark():
    """A limit resting at mid does not cross, so the flatten sits in the book
    competing with the move that caused it."""
    session, _, _ = _held_session()
    asyncio.run(session._flatten("test"))
    intent = next(iter(session.pipeline.executor.machines.values())).intent
    assert intent.side == "sell"
    assert intent.price == dec("59990"), "priced at mid, not at the bid"


def test_a_flatten_surfaces_a_failed_cancel_instead_of_swallowing_it():
    """F-6. The flatten then places reducing orders while a stale working order
    may still be live - the exact situation cancel-first exists to avoid."""
    from tradesys.demo import PERP_VENUE, SYMBOL

    session, adapters, _ = _held_session()
    executor = session.pipeline.executor
    stale = executor.build_intent(
        strategy_id="carry", venue=PERP_VENUE, symbol=SYMBOL, side="buy",
        quantity=dec("0.1"), correlation_id="c", price=dec("59000"))
    asyncio.run(executor.submit(stale, _approving(stale)))
    adapters[PERP_VENUE].faults.reject_next = "down"

    report = asyncio.run(session._flatten("test"))
    assert report.cancel_failures, "a failed cancel was swallowed"
    assert any(stale.client_order_id in str(f) for f in report.cancel_failures)


def test_a_flatten_resolves_a_query_rather_than_resending_blind():
    """A 5xx leaves the order in QUERY, and QUERY is not `failed`. Resending it
    blind is how a flatten doubles a position; the flatten asks the venue
    first, and only sends a replacement if the venue never had it."""
    session, adapters, _ = _held_session()
    for adapter in adapters.values():
        adapter.faults.reject_next = "down"
    report = asyncio.run(session._flatten("test"))
    # Round 1 got a 5xx and left QUERY. Round 2 resolved it - the venue never
    # had the order - and sent a replacement, which was accepted.
    assert report.submitted, f"gave up after one 5xx: {report}"
    assert not report.unknown, f"left an order unresolved: {report}"
    machines = list(session.pipeline.executor.machines.values())
    live = [m for m in machines if not m.is_terminal]
    assert len(live) == 1, "one position, one live reducing order"


def test_a_flatten_does_not_send_a_second_order_for_a_covered_position():
    """Two reducing orders for one position is how a flatten flips it."""
    session, _, _ = _held_session()
    asyncio.run(session._flatten("first"))
    asyncio.run(session._flatten("second"))
    from tradesys.layers.l5_risk.service import FLATTEN_STRATEGY_ID as FID

    live = [m for m in session.pipeline.executor.open_machines()
            if m.intent.strategy_id == FID]
    assert len(live) == 1, [m.intent.client_order_id for m in live]


def test_an_incomplete_flatten_is_retried_on_the_next_tick():
    """`_flatten` sets HALTED as its first act, and the retry guard used to be
    `state == RUNNING` - so the flatten ran once and every later tick was
    silenced."""
    session, _, clock = _held_session()
    executor = session.pipeline.executor
    executor.halt("reconciliation found an unknown position")
    session.pipeline.risk.killswitch.engage(Trigger.MANUAL, clock["now"], "test")
    asyncio.run(session.tick(clock["now"]))
    assert not executor.open_machines()
    assert session.state == "HALTED"

    executor.halted_reason = None
    clock["now"] += 10 * 10**9
    asyncio.run(session.tick(clock["now"]))
    assert executor.open_machines(), "the flatten never ran again"


def _approving(intent):
    from tradesys.core.events import RiskDecision

    return RiskDecision(correlation_id="c", emitted_at=NOW, source="l5_risk",
                        intent_id=intent.client_order_id, approved=True,
                        adjusted_quantity=intent.quantity)


def test_a_flatten_no_longer_forges_a_market_event():
    """session.py built a synthetic MarketEvent so feed-freshness and mark
    price checks assessed a fabricated event at the moment real checks matter
    most. The reduce_only exemption replaces the forgery."""
    import inspect

    from tradesys import session as session_module

    source = inspect.getsource(session_module.TradingSession._flatten)
    assert "MarketEvent(" not in source


# ----------------------------------------------------------------------
# WP1 exit criterion
# ----------------------------------------------------------------------


def test_the_wp1_exit_scenario_terminates_flat():
    """Venue 5xx, an order in QUERY, and the dead-man firing, together, driven
    through the real session against the real simulator. The guarantee is not
    that orders were placed; it is that the book ends flat."""
    from tradesys.chaos import SCENARIOS, run_all

    scenario = next(s for s in SCENARIOS
                    if s.name == "flatten_under_compound_failure")
    result = run_all((scenario,))[0]
    assert result.passed, result.detail


def test_the_unflattenable_book_has_a_chaos_scenario():
    from tradesys.chaos import SCENARIOS

    assert "unflattenable book" in {s.failure_mode for s in SCENARIOS}


def test_check_8_does_not_refuse_an_order_that_shrinks_an_oversized_position(limits, state):
    """`room` goes negative for a book already past the cap, and the order was
    rejected as "position already at cap" - which is true, and is the reason to
    let it through rather than to stop it. The flatten path gets there by the
    reduce_only exemption; an ordinary shrinking order needs the same guard
    checks 9, 10 and 12 already carry."""
    _held(state)                                   # 1 BTC = 60000 notional
    service = RiskService(limits, state)
    # A 50% stop puts the position cap at 4000, so the book is fifteen times
    # over it, and keeps the order itself inside checks 6 and 7.
    context = _ctx(stop_distance_frac={"carry": dec("0.5")})
    shrinking = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_k",
        venue="sim", symbol="BTCUSDT", side="sell", quantity=dec("0.05"),
        order_type="limit", price=MARK, strategy_id="carry",
    )
    assert service.evaluate(shrinking, context).approved

    growing = OrderIntent(
        correlation_id="c", emitted_at=NOW, source="t", client_order_id="ts_l",
        venue="sim", symbol="BTCUSDT", side="buy", quantity=dec("0.05"),
        order_type="limit", price=MARK, strategy_id="carry",
    )
    refused = service.evaluate(growing, context)
    assert not refused.approved
    assert refused.rejected_by.startswith(CHECKS[7])


def test_the_weight_budget_comes_from_the_venue_not_from_a_constant():
    """Spot and futures publish different budgets and both have changed.
    Enforcing against a number compiled into the adapter enforces a guess."""
    from tradesys.adapters.binance import Response

    adapter, _ = _futures(SpyTransport([Response(200, {
        "symbols": [],
        "rateLimits": [
            {"rateLimitType": "ORDERS", "interval": "MINUTE", "intervalNum": 1,
             "limit": 1200},
            {"rateLimitType": "REQUEST_WEIGHT", "interval": "MINUTE",
             "intervalNum": 1, "limit": 2400},
        ],
    }, {})]))
    assert adapter.rate_limit_state().weight_limit == 6000
    asyncio.run(adapter.reference_data())
    assert adapter.rate_limit_state().weight_limit == 2400


def test_a_venue_that_publishes_no_budget_keeps_the_conservative_default():
    from tradesys.adapters.binance import Response

    adapter, _ = _futures(SpyTransport([Response(200, {"symbols": []}, {})]))
    asyncio.run(adapter.reference_data())
    assert adapter.rate_limit_state().weight_limit == 6000
