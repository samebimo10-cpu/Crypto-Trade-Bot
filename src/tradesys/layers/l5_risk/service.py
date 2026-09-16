"""The risk service.

SPEC section 8.3. Ordered cheapest-first so the common rejection costs the
least. **Any check failing rejects; there is no override path in code.** An
override is a config change under the two-person rule, which cannot be
executed in the heat of an incident by one person - which is the point.

Two invariants hold for every decision this service produces, and both are
property-tested:

* ``adjusted_quantity <= intent.quantity`` - risk reduces or refuses, never
  enlarges.
* **Timeout is a reject.** Absence of an approval is never an approval. A risk
  service that fails open is worse than no risk service, because it creates
  the belief that positions are checked.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Callable, Dict, List, Mapping, Optional, Tuple

from ...adapters.base import FilterRounder, RateLimitState
from ...core.errors import FilterViolation
from ...core.events import OrderIntent, RiskDecision, SymbolFilter
from ...core.types import Decimal as Dec, Nanos, dec, now_ns
from .killswitch import KillSwitch, SwitchState, Trigger
from .limits import LimitRegister
from .state import PortfolioState

__all__ = ["RiskService", "RiskContext", "CHECKS", "FLATTEN_STRATEGY_ID"]

#: The pseudo-strategy the flatten path trades under. It is not a strategy: it
#: has no signal, it only ever reduces, and it is the thing that runs when
#: every real strategy has already been stopped. Named here rather than spelled
#: as a literal in the session, because two copies of this string is one copy
#: too many for something the safety path depends on.
FLATTEN_STRATEGY_ID = "flatten"

#: The ordered check list of SPEC section 8.3, as names so a rejection reason
#: is greppable and a dashboard can count rejections per check.
CHECKS: Tuple[str, ...] = (
    "1_kill_switch",
    "2_strategy_enabled",
    "3_reconciliation_clean",
    "4_feed_fresh",
    "5_symbol_filters",
    "6_single_order_notional",
    "7_per_trade_risk",
    "8_position_limit",
    "9_concentration",
    "10_gross_exposure",
    "11_order_rate",
    "12_liquidation_distance",
    "13_loss_state",
)


@dataclass
class RiskContext:
    """Everything the checks read that is not portfolio state or a limit."""

    now: Nanos = 0
    #: Per-symbol last market event timestamp. A symbol absent from this map
    #: has no feed at all, which is a reject rather than a default.
    feed_last_event: Mapping[str, Nanos] = field(default_factory=dict)
    reconciliation_clean: bool = True
    rate_limit: Optional[RateLimitState] = None
    filters: Mapping[str, SymbolFilter] = field(default_factory=dict)
    mark_prices: Mapping[str, Dec] = field(default_factory=dict)
    #: Distance to liquidation per (venue, symbol) as a fraction of mark,
    #: after the proposed fill. Supplied by the caller because it depends on
    #: venue margin rules, which live in the adapter.
    liquidation_distance: Mapping[Tuple[str, str], Dec] = field(default_factory=dict)
    #: Fraction of notional considered at risk. Defaults to 1.0 - treating a
    #: position as a total loss - because a strategy that has not declared its
    #: stop should be sized as though it has none.
    stop_distance_frac: Mapping[str, Dec] = field(default_factory=dict)


class RiskService:
    """Standalone. It never imports a strategy and never holds venue credentials."""

    def __init__(
        self,
        limits: LimitRegister,
        state: PortfolioState,
        killswitch: Optional[KillSwitch] = None,
        clock: Callable[[], Nanos] = now_ns,
        source: str = "l5_risk",
    ) -> None:
        self.limits = limits
        self.state = state
        self.killswitch = killswitch or KillSwitch()
        self.clock = clock
        self.source = source
        self.rejections: Dict[str, int] = {c: 0 for c in CHECKS}

    # ------------------------------------------------------------------
    # Decision
    # ------------------------------------------------------------------

    def evaluate(self, intent: OrderIntent, ctx: Optional[RiskContext] = None) -> RiskDecision:
        ctx = ctx or RiskContext(now=self.clock())
        st = self.state
        lim = self.limits
        equity = st.equity
        snapshot = self._snapshot(intent, ctx)
        throttle = False

        def reject(check: str, detail: str = "") -> RiskDecision:
            self.rejections[check] = self.rejections.get(check, 0) + 1
            st.consecutive_rejects[intent.strategy_id] = (
                st.consecutive_rejects.get(intent.strategy_id, 0) + 1
            )
            # The flatten pseudo-strategy is exempt from being disabled. A
            # flatten that has been refused five times must not be permanently
            # switched off: that is the exact opposite of the correct failure
            # direction, and it disables the path five refusals *proved* was
            # needed. Every other strategy still earns its disable.
            if (intent.strategy_id != FLATTEN_STRATEGY_ID
                    and st.consecutive_rejects[intent.strategy_id]
                    >= int(lim.get("consecutive_rejects"))):
                st.disabled_strategies.add(intent.strategy_id)
            return RiskDecision(
                correlation_id=intent.correlation_id,
                emitted_at=ctx.now,
                source=self.source,
                intent_id=intent.client_order_id,
                approved=False,
                rejected_by=f"{check}{': ' + detail if detail else ''}",
                adjusted_quantity=None,
                limits_snapshot=snapshot,
            )

        # ---------------------------------------------------------------
        # The reduce_only exemption
        # ---------------------------------------------------------------
        #
        # The flatten path runs precisely when the conditions several of these
        # checks test for are already true, and it was being refused by the
        # checks its own triggers set off. ``killswitch.check_deadman`` already
        # documents the principle - the dead-man path acts without asking,
        # because the service it would ask is the one that is not responding -
        # and this is that principle applied to every check a flatten trigger
        # can trip.
        #
        # The exemption is not granted on the intent's say-so. ``reduce_only``
        # is a flag any caller can set; what earns the exemption is that the
        # order is *arithmetically* a reduction against this service's own
        # position state - strictly smaller absolute position after the fill.
        # A mislabelled intent gets nothing, and the sign flip a reduce_only
        # order must never perform is caught by the same comparison.
        #
        # EXEMPTED, and why:
        #
        #   3  reconciliation - a failed reconciliation cycle is what a venue
        #      that stopped answering looks like from here, and CONNECTIVITY
        #      is a FLATTENING trigger. The check exists to stop us trading
        #      against a position we may not understand. A reduction cannot
        #      create exposure whether we understand it or not.
        #   4  feed freshness - FEED_STALENESS and CONNECTIVITY are both
        #      flatten triggers. A dead feed is the reason to get out, not a
        #      reason to stay in. This is also what the synthetic MarketEvent
        #      in the session was forging its way around; the forgery is gone.
        #   6  single-order notional - the cap is a fraction of equity, and
        #      equity has usually fallen, which is why we are flattening. A
        #      position built up in ten permitted orders cannot be closed in
        #      one order under the same cap.
        #   7  per-trade risk - measures the risk a trade *adds*. A reduction
        #      adds none: it is the only order in the system that strictly
        #      lowers the number this check is measuring.
        #   8  position limit after fill - the cap is computed from equity;
        #      being over it is the condition, and refusing the only order
        #      that cures it is the wrong direction.
        #  13  loss state - a daily or weekly loss breach engages a FLATTENING
        #      trigger and then rejected the flatten it had just demanded.
        #      The engage() side effect below is kept: the measurement is
        #      still correct and the switch still has to record it. Only the
        #      rejection is lifted.
        #
        # Also exempted, though not numbered checks: the zero-equity guard (a
        # wiped-out account is the worst possible moment to refuse to close a
        # position) and the check-11 throttle (queueing the order that ends the
        # incident is the same as refusing it).
        #
        # KEPT, and why:
        #
        #   1  kill switch - exempts a reducing order while FLATTENING, which
        #      is the state every flatten trigger derives. A reduce_only order
        #      while merely HALTED is not a flatten and has no claim here.
        #   2  strategy enabled - the flatten pseudo-strategy can no longer be
        #      disabled (see reject() above), so this cannot block a flatten.
        #      It still stops a disabled strategy trading under a reduce_only
        #      label.
        #   5  symbol filters - a reducing order that violates a lot size or a
        #      tick is refused by the venue anyway. Exempting it would convert
        #      a loud local rejection into a silent venue one during an
        #      incident. The price requirement is relaxed instead of dropped:
        #      see the ``priced`` branch below.
        #   9  concentration, 10 gross exposure, 12 liquidation distance - all
        #      three already measure whether the order *adds* exposure and
        #      pass anything that shrinks the book, so they need no exemption
        #      and cost a reduction nothing. Keeping them means a mislabelled
        #      order that slipped past the arithmetic still meets a limit.
        current = st.position_qty(intent.venue, intent.symbol)
        after = current + intent.signed_quantity
        reducing = bool(intent.reduce_only) and abs(after) < abs(current)

        # 1. Kill switch -------------------------------------------------
        if self.killswitch.is_engaged:
            # A reducing order is how a flatten gets executed, so it must
            # survive the switch that demanded the flatten.
            if not (reducing and self.killswitch.state == SwitchState.FLATTENING):
                return reject(CHECKS[0], self.killswitch.blocking_reason() or "engaged")

        # 2. Strategy enabled --------------------------------------------
        if intent.strategy_id in st.disabled_strategies:
            return reject(CHECKS[1], intent.strategy_id)

        # 3. Reconciliation ----------------------------------------------
        if not ctx.reconciliation_clean and not reducing:
            return reject(CHECKS[2], "reconciliation not clean")

        # 4. Feed freshness ----------------------------------------------
        if not reducing:
            last = ctx.feed_last_event.get(intent.symbol)
            if last is None:
                return reject(CHECKS[3], f"no feed for {intent.symbol}")
            stale_s = (ctx.now - last) / 1e9
            if stale_s > float(lim.get("feed_staleness_s")):
                return reject(CHECKS[3], f"{intent.symbol} stale {stale_s:.1f}s")

        # 5. Symbol filters ----------------------------------------------
        # L6 should have rounded already; a violation here is a defect, and it
        # is logged as one rather than quietly re-rounded.
        f = ctx.filters.get(intent.symbol)
        if f is not None:
            try:
                FilterRounder(f).validate(intent.quantity, intent.price)
            except FilterViolation as e:
                return reject(CHECKS[4], str(e))

        price = intent.price or ctx.mark_prices.get(intent.symbol)
        priced = price is not None and price > 0
        if not priced and not reducing:
            return reject(CHECKS[4], f"no price for {intent.symbol}")
        # A reduction with no mark is the flatten of a symbol whose feed has
        # died. Every check below this point is a notional computed from a
        # price we do not have, and none of them may refuse a reduction in any
        # case, so those checks are skipped rather than the order being
        # skipped. Skipping the order is what left positions open.
        notional = intent.quantity * price if priced else dec(0)

        if equity <= 0 and not reducing:
            return reject(CHECKS[6], "equity is zero or negative")

        sizeable = priced and not reducing

        # 6. Single-order notional ---------------------------------------
        if sizeable:
            cap_by_equity = equity * lim.get("single_order_equity_frac")
            cap_by_median = st.median_order_notional * lim.get("single_order_median_mult")
            single_cap = max(cap_by_equity, cap_by_median)
            if notional > single_cap:
                return reject(CHECKS[5], f"notional {notional:.2f} over cap {single_cap:.2f}")

        # 7. Per-trade risk ----------------------------------------------
        stop = ctx.stop_distance_frac.get(intent.strategy_id, dec(1))
        if sizeable:
            risk_frac = (notional * stop) / equity
            if risk_frac > lim.get("per_trade_risk"):
                return reject(CHECKS[6], f"risk {risk_frac:.4f} over {lim.get('per_trade_risk')}")

        # 8. Position limit after fill -----------------------------------
        quantity = intent.quantity
        current_notional = abs(current) * price if priced else dec(0)
        after_notional = abs(after) * price if priced else dec(0)
        if sizeable and after_notional > current_notional:
            # The guard checks 9, 10 and 12 already carry: only *new* exposure
            # can breach a cap. Without it a book already over the cap refuses
            # the order that moves it back under - `room` comes out negative
            # and the order is rejected as "position already at cap", which is
            # true and is the reason to let it through, not to stop it.
            pos_cap = equity * lim.get("per_trade_risk") / (stop if stop > 0 else dec(1))
            if after_notional > pos_cap:
                # Reduce rather than refuse, when a smaller order is still
                # useful - and then CONTINUE. Returning an approval from here
                # skipped checks 9 to 13 entirely, including the loss state
                # that engages the kill switch and the concentration and
                # liquidation limits, for every order that happened to be one
                # lot too large. Those checks now see the clamped size.
                room = pos_cap - current_notional
                if room <= 0:
                    return reject(CHECKS[7], f"position already at cap {pos_cap:.2f}")
                reduced = (room / price)
                if f is not None:
                    reduced = FilterRounder(f).round_quantity(reduced)
                if reduced <= 0:
                    return reject(CHECKS[7], "no room after rounding")
                quantity = reduced
                after = current + (reduced if intent.side == "buy" else -reduced)
                after_notional = abs(after) * price

        if priced:
            gross_after = st.gross_notional - current_notional + after_notional

            # 9. Concentration -------------------------------------------
            # Measured against max(gross book, equity), not against gross
            # alone. "25% of book" read literally makes the first trade
            # impossible: one position is 100% of a one-position book, so a
            # limit measured purely on gross rejects every opening order and
            # the system can never start. Using equity as a floor gives the
            # rule its intended meaning - do not let one asset dominate -
            # while letting a small book grow into it.
            base = gross_after if gross_after > equity else equity
            if base > 0:
                same_symbol = sum(
                    (p.notional for (v, s), p in st.positions.items() if s == intent.symbol),
                    dec(0),
                ) - current_notional + after_notional
                if (same_symbol / base > lim.get("asset_concentration")
                        and after_notional > current_notional):
                    # Only reject *new* exposure, the same way checks 10 and 12
                    # already do. Without this clause a book that is already
                    # over-concentrated refuses the order that improves it:
                    # 0.60 concentration reduced to 0.54 is still over a 0.25
                    # limit, and rejecting it leaves 0.60. The limit exists to
                    # stop one asset dominating, not to stop it being unwound.
                    return reject(CHECKS[8], f"{intent.symbol} concentration "
                                             f"{same_symbol / base:.3f}")

            # 10. Gross exposure ------------------------------------------
            if equity > 0 and gross_after / equity > lim.get("gross_exposure"):
                # Only reject *new* exposure. A trade that shrinks the book is
                # exactly what you want while over the limit.
                if after_notional > current_notional:
                    return reject(CHECKS[9], f"gross {gross_after / equity:.2f}x")

        # 11. Order rate -------------------------------------------------
        if ctx.rate_limit is not None and not reducing:
            if ctx.rate_limit.weight_fraction > float(lim.get("order_rate")):
                throttle = True          # queue, do not reject

        # 12. Liquidation distance ---------------------------------------
        dist = ctx.liquidation_distance.get((intent.venue, intent.symbol))
        if dist is not None and dist < lim.get("liquidation_distance"):
            if priced and after_notional > current_notional:
                return reject(CHECKS[11], f"liquidation distance {dist:.3f}")

        # 13. Loss state --------------------------------------------------
        # The measurement and the switch stay, for a reduction as much as for
        # anything else. Only the rejection is exempt.
        if st.daily_loss >= lim.get("daily_loss"):
            self.killswitch.engage(Trigger.DAILY_LOSS, ctx.now, f"{st.daily_loss:.4f}")
            if not reducing:
                return reject(CHECKS[12], f"daily loss {st.daily_loss:.4f}")
        if st.weekly_loss >= lim.get("weekly_loss"):
            self.killswitch.engage(Trigger.WEEKLY_LOSS, ctx.now, f"{st.weekly_loss:.4f}")
            if not reducing:
                return reject(CHECKS[12], f"weekly loss {st.weekly_loss:.4f}")

        st.consecutive_rejects[intent.strategy_id] = 0
        return self._approve(intent, ctx, snapshot, quantity, throttle)

    def _approve(self, intent: OrderIntent, ctx: RiskContext,
                 snapshot: Mapping[str, Dec], quantity: Dec, throttle: bool) -> RiskDecision:
        # The invariant, asserted rather than assumed. If this ever trips, the
        # bug is here and not downstream.
        assert quantity <= intent.quantity, "risk may reduce or refuse, never enlarge"
        return RiskDecision(
            correlation_id=intent.correlation_id,
            emitted_at=ctx.now,
            source=self.source,
            intent_id=intent.client_order_id,
            approved=True,
            rejected_by=None,
            adjusted_quantity=quantity,
            limits_snapshot=snapshot,
            throttle=throttle,
        )

    def _snapshot(self, intent: OrderIntent, ctx: RiskContext) -> Dict[str, Dec]:
        """Limit utilisation at decision time, for the audit trail."""
        st = self.state
        return {
            "equity": st.equity,
            "drawdown": st.drawdown,
            "daily_loss": st.daily_loss,
            "weekly_loss": st.weekly_loss,
            "gross_exposure": st.gross_exposure,
            "asset_concentration": st.asset_concentration(intent.symbol),
            "venue_share": st.venue_share(intent.venue),
        }

    # ------------------------------------------------------------------
    # Continuous monitoring
    # ------------------------------------------------------------------

    def heartbeat(self, now: Nanos) -> bool:
        """Prove this service is alive, then record the beat. False if it is not.

        The beat is deliberately not a bare assignment. A heartbeat that only
        writes a timestamp proves that *the caller* is alive, and the dead-man
        exists for exactly the case where the caller and the risk service are
        not the same thing. So this touches the whole dependency chain a
        decision needs - the limit register, the portfolio state, the switch -
        and declines to beat if any of it is unreachable.

        The reads are side-effect free on purpose: a liveness probe that
        engages triggers would make the act of checking change the answer.

        This is called by something other than the loop that checks the switch.
        It has to be: a loop that beats and then asks whether it has been
        beaten always answers yes.
        """
        try:
            self.limits.get("per_trade_risk")
            _ = self.state.equity
            _ = self.state.drawdown
            _ = self.allocation_multiplier()
        except Exception:                                  # noqa: BLE001
            return False
        self.killswitch.heartbeat(now)
        return True

    def check_drawdown_ladder(self, now: Nanos) -> Optional[str]:
        """Run the ladder. Returns the level newly engaged, if any.

        The ladder is why the hard stop can be tightened rather than loosened:
        acting at 8% is what makes 12% rare.
        """
        dd = self.state.drawdown
        if dd >= self.limits.get("drawdown_hard"):
            self.killswitch.engage(Trigger.DRAWDOWN_HARD, now, f"drawdown {dd:.4f}")
            return Trigger.DRAWDOWN_HARD
        if dd >= self.limits.get("drawdown_soft"):
            self.killswitch.engage(Trigger.DRAWDOWN_SOFT, now, f"drawdown {dd:.4f}")
            return Trigger.DRAWDOWN_SOFT
        if dd >= self.limits.get("drawdown_amber"):
            return "drawdown_amber"
        return None

    def allocation_multiplier(self) -> Dec:
        """1.0 normally; 0.5 while the soft drawdown trigger is engaged."""
        return dec("0.5") if Trigger.DRAWDOWN_SOFT in self.killswitch.engaged else dec(1)

    def on_venue_concentration(self, now: Nanos) -> List[str]:
        """Venues holding more than the permitted share of capital."""
        cap = self.limits.get("venue_concentration")
        return [v for v in self.state.venue_capital if self.state.venue_share(v) > cap]
