# Independent review brief — `tradesys`

**Give this file to a fresh session along with the repository. Do not give it the
prior session's history.**

---

## 0. Your task

Adversarially review the `crypto/` trading system (`tradesys`) for correctness.
Produce `FINDINGS-2.md`. **Write no production code and fix nothing.**

## 1. What you are reviewing, and why the framing matters

Read this carefully — it determines how you should work.

`src/tradesys/`, `SPEC.md`, and `AUDIT.md` were **all produced by the same AI
agent in a single build effort**. The audit is a self-audit. It is honest and it
found real bugs, including ones that reflect badly on the build. That is
evidence of good faith, not of coverage.

A self-audit cannot find errors in its own model of what correct looks like. It
verified the impact model exists; it could not notice the exponent is wrong. It
recorded that fee tables are hardcoded; it would not notice if the tier logic
misunderstood the fee schedule from the start. Shared assumptions survive
self-review.

**Therefore:**

- Treat `SPEC.md` as a statement of intent, not as ground truth about correctness.
  A requirement can itself be wrong.
- Treat `AUDIT.md` as a set of **claims to verify**, not findings to accept.
  Several are marked `[probed]`. Re-probe them.
- Assume the highest-value bugs are in code the audit rated highly. Data
  ingestion scored 70% and the audit looked hard at it. The risk service scored
  90%, the backtester 85% — that is where an unexamined assumption would sit
  undisturbed.

The system has **never traded with real money** and **no strategy has passed the
validation harness**. Nothing you find is urgent in the operational sense. Take
the time to be right.

## 2. Known findings — do not re-report these

F-1 futures REST paths are spot paths · F-2 failed depth resync terminates
capture · F-3 only `FundingCarry` is reachable live · F-4
`BinanceAdapter.positions()` returns `[]` · F-5 conformance suite skips three
declared Protocol methods · F-6 failed cancel during flatten is swallowed ·
F-7 rate-limit weight recorded but never enforced.

Also known: no depth REST snapshots in the archive; `l5_risk/sizing.py` and
`l6_execution/tca.py` exported but never called; `session.py:456` builds a
synthetic `MarketEvent` for the flatten path.

Report these only if you find the audit's **characterisation** is wrong — wrong
severity, wrong root cause, or a wider blast radius than stated.

## 3. Priority targets

Ordered by the damage a bug here would do. Spend your effort in this order.

### 3.1 The validation harness — highest priority

Every future go/no-go decision rests on this arithmetic. A subtle error here
does not cause a crash; it causes a green light on a strategy that loses money.
Nothing downstream can catch it.

- `research/validation.py` — verify the **deflated Sharpe ratio** implementation
  against the Bailey–López de Prado formulation. Check the variance term, the
  skew and kurtosis adjustment, and that the trial count actually used is the
  registry's true count.
- **PBO / CSCV** — verify the combinatorial split logic. Are the splits truly
  combinatorial, or a cheaper approximation labelled as CSCV?
- **Block bootstrap** — is block length chosen from the data's autocorrelation,
  or fixed? A fixed block length that is too short destroys the dependence
  structure the bootstrap exists to preserve.
- `PERIODS_PER_YEAR = 365` — confirm every Sharpe input is genuinely daily.
  Mixed frequencies here silently rescale the statistic.
- Walk-forward: the audit says the harness computes the statistic but the caller
  supplies the splits. Trace who supplies them and whether any caller can supply
  overlapping or leaky splits.
- **Test the auditor:** `l2_features/audit.py` claims to catch look-ahead by
  prefix recomputation and lag perturbation. Write a feature that leaks the
  future in a way the auditor should catch, and confirm it does. Then write one
  that leaks subtly — through a rolling window boundary, or a resampling edge —
  and see whether it slips through.

### 3.2 The cost model — second priority

`costs.py` and `research/viability.py`. Everything the system will ever conclude
about profitability passes through here.

- **Impact exponent `y=1`, hardcoded, never calibrated.** Assess how sensitive
  each strategy's verdict is to it. If a plausible range of exponents flips a
  verdict, say so explicitly — that strategy has no verdict, it has a guess.
- **Funding settlement timing.** Binance settles perpetual funding every 8 hours
  at 00:00, 08:00 and 16:00 UTC. Verify the backtester accrues and pays at those
  boundaries, not on a rolling or per-bar basis, and that a position opened and
  closed between settlements pays nothing.
- **Fee tier logic.** The VIP 0–9 tables at `research/viability.py:158–174` are
  copied from published schedules. Check them against Binance's current
  documented schedule, spot and futures separately, and check whether the BNB
  discount is applied where it should be and only there.
- **The `0.001` silent fallback at `adapters/binance.py:468–469`.** Trace what
  consumes a wrong fee. How far does it propagate before anything would notice?
- **`funding_carry.round_trip_cost = 0.003`** is baked into the strategy rather
  than read from the venue. Find every other place a cost assumption is
  duplicated rather than sourced, and check the copies agree.
- **The 238% cost share for `funding_carry`.** Either that strategy is dead or
  the viability arithmetic is wrong. Determine which. Recompute it by hand from
  the fee schedule and a realistic funding path, and compare.
- Adverse selection: read the model. Is it derived from anything measurable, or
  is it a constant wearing a function's clothing?

### 3.3 Correctness of the shared execution path

- **`test_same_code_path` — verify it proves what it claims.** Read the
  assertion. Does it show backtest, paper and live traverse the same `Pipeline`
  object, or only that the same class is instantiated? Look for branches on mode
  anywhere below `Pipeline`.
- **Time-of-check / time-of-use** between `RiskService.evaluate` and
  `executor.py:190`. State can mutate between approval and placement. Can a
  decision be approved against state that is stale by the time the order goes
  out? The executor re-checks that risk did not enlarge the order — does it
  re-check anything else?
- **Concurrency.** The system is `asyncio`. Look for races between
  `in_flight()` counting and `submit`, between the reconciliation loop and the
  order FSM, and between the dead-man heartbeat and flatten.
- **Unit and rounding.** `dec()` refuses floats and `floor_to` always rounds
  down. Rounding quantity down is right. Confirm price rounding does not also
  floor where it should round to nearest or away — a floored sell price crosses
  the spread.
- **Timestamps.** Domain time is integer nanoseconds; Binance returns
  milliseconds and some endpoints accept microseconds. Audit every conversion
  boundary for a factor-of-1000 error. Check that `FeatureSnapshot` stamping
  from the last input timestamp cannot produce a snapshot dated before an input
  it consumed.

### 3.4 The flatten path

This is what the system relies on when everything else has already failed, and
it is the least-tested safety-critical path in the codebase.

- `session.py:456` evaluates risk against a **synthetic `MarketEvent`**, so
  feed-freshness and mark-price checks assess a fabricated event at exactly the
  moment real checks matter most. Assess what this can let through.
- `session.py:430–432` swallows cancel failures (F-6). Establish the blast
  radius: can a flatten place reducing orders while a stale working order is
  live, and can that leave a position larger than it started?
- Trace flatten under compound failure: venue returning 5xx, a position in
  QUERY state, and the dead-man switch firing. Does it terminate? Does it
  terminate *flat*?

### 3.5 Risk service ordering

`l5_risk/service.py:123–235`, 13 ordered checks. Ordering is load-bearing.
Determine whether any check's result can be invalidated by a later check's side
effects, whether any can be skipped by an early return, and whether the
"reduce, never enlarge" invariant holds across every combination of reductions.

## 4. Method

- **Probe, don't infer.** Where a claim can be tested by running something, run
  it. The audit's `[probed]` markings are the standard to meet or exceed.
- **`BinanceAdapter` is only ever tested against an injected fake transport that
  echoes whatever URL it is given.** That is how F-1 survived 787 tests. Assume
  the same blind spot hides other bugs: assert on constructed URLs, payloads,
  signature strings, and header handling directly.
- Where you cannot verify something without a live venue, say so and state what
  would settle it.
- **Distinguish "I could not verify this" from "this is correct."** Conflating
  them is the failure mode this review exists to prevent.

## 5. Output — `FINDINGS-2.md`

For each finding:

| Field | Content |
|---|---|
| ID | `G-1`, `G-2`, … |
| Severity | Critical / Major / Moderate / Minor |
| Location | File and line |
| Claim | One sentence |
| Evidence | The probe you ran and its output, or the reasoning if unprobeable |
| Impact | What happens with real money at stake |
| Confidence | High / Medium / Low |

Then three closing sections:

1. **Audit claims re-probed** — each one you checked, and whether it held.
2. **Verified correct** — what you examined and found sound. This is as useful
   as the findings; it tells the owner where not to spend review effort again.
3. **Unverifiable without a live venue** — with what would settle each.

## 6. Constraints

- Change no production code.
- Write throwaway probe scripts freely; put them in `/tmp`, not the repo.
- Do not run anything that touches a real venue, testnet included.
- If you find nothing serious in a section, say so plainly. Do not manufacture
  findings to appear thorough — a short honest review is worth more than a long
  padded one.
