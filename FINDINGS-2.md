# FINDINGS-2 — independent adversarial review of `tradesys`

Scope and method per `INDEPENDENT-REVIEW.md`. Everything below was run against the
repository at `claude/independent-review-zvgfi4`. No production code was
changed. Probe scripts were written to `/tmp/probe/` and are quoted inline.
Baseline: `787 passed in 29.31s`.

The review is organised by the brief's priority order. Twenty findings, four
Critical. The single most important one is **G-1**: the flatten path is
refused by the risk checks whose trigger conditions caused the flatten.

---

## Summary

| ID | Sev | Area | One line |
|---|---|---|---|
| G-1 | Critical | flatten | Every realistic flatten trigger also trips a risk check that refuses the flatten order |
| G-2 | Critical | validation | Deflated Sharpe mixes per-period and annualised units; the DSR gate cannot be passed |
| G-3 | Critical | cost model | Funding is settled every mark tick at the predicted rate, not at 00/08/16 UTC at the settled rate |
| G-4 | Critical | security | The signer's endpoint allowlist is bound to a constant path and never sees the path being signed |
| G-5 | Major | validation | `purged_cv` is a tautology, and nothing in the system uses purged or embargoed splits |
| G-6 | Major | validation | `audit_registry` executes zero look-ahead checks across all 17 registered features |
| G-7 | Major | risk | Check 8's reduce-and-return skips checks 9–13, including the daily-loss kill |
| G-8 | Major | validation | PBO silently truncates the performance matrix to its first 16 blocks |
| G-9 | Major | validation | `test_same_code_path` compares a backtest to a backtest |
| G-10 | Major | validation | Per-event equity points are treated as daily returns by Sharpe and by expectancy |
| G-11 | Major | cost model | `viability.assess` prices two-venue trades on one fee tier, and `Viability` carries two cost numbers that disagree |
| G-12 | Moderate | cost model | `funding_dispersion`'s verdict flips inside a defensible range of the impact coefficient |
| G-13 | Moderate | cost model | The entire fee-tier and BNB-discount machinery is unreferenced |
| G-14 | Moderate | flatten | `_flatten` discards every `ExecutionResult`, skips symbols with no mark, and rests a limit at mark |
| G-15 | Moderate | validation | `monte_carlo` is a gate that cannot fail |
| G-16 | Moderate | validation | `_perturb` returning `None` silently passes the lag check; clipping features evade it |
| G-17 | Moderate | validation | Block bootstrap: fixed block length, and the head of the series is sampled 10x too rarely |
| G-18 | Moderate | validation | Every PBO and walk-forward slice is backtested from a cold start |
| G-19 | Moderate | live | The dead-man switch is fed by the loop it is supposed to police |
| G-20 | Minor | misc | Four smaller defects, grouped |

---

## 3.1 The validation harness

Findings are numbered in severity order across the whole review, so the
harness section below starts at G-2; G-1 is in §3.4.

---

### G-2 — Deflated Sharpe compares a per-period Sharpe against an annualised null

| | |
|---|---|
| **Severity** | **Critical** |
| **Location** | `research/harness.py:305`, `research/harness.py:309`, `research/harness.py:466–477`, `research/backtest.py:69–71`, `research/backtest.py:157–160` |
| **Confidence** | **High** |

**Claim.** `_check_deflated_sharpe` passes an observed Sharpe measured
*per observation* against a null built from trial Sharpes stored
*annualised at 365*, so `SR0` is inflated by `sqrt(365) ≈ 19.1` and the
`DSR > 0.95` gate is unreachable by any real strategy.

**Evidence.**

The two quantities come from different places and are never reconciled:

- `harness.py:305` — `per_period = sharpe(returns, periods_per_year=1)`.
- `backtest.py:69–71` — `BacktestResult.sharpe` calls `validation.sharpe(rets)`
  with the **default** `PERIODS_PER_YEAR=365`.
- `backtest.py:157–160` — that value is what `registry.finish(sharpe=...)` stores.
- `harness.py:309` — `_variance_of_trial_sharpes` reads those stored values back
  and hands the variance to `deflated_sharpe` as `variance_of_trial_sharpes`.

`expected_max_sharpe` returns `sqrt(V) * const`, so a variance 365× too large
produces an `SR0` 19.1× too large, in units where the observed Sharpe is ~0.1.

`/tmp/probe/p2_dsr_units.py`:

```
variance of trial sharpes AS STORED (annualised-ish): 0.134008
variance of trial sharpes in the OBSERVED unit      : 0.00036715
ratio                                               : 365.0  (expected 365)

SR0 used by the code   : 0.8015
SR0 in consistent units: 0.041953

observed per-period Sharpe: 0.13123   (t-stat 5.87)
DSR as the harness computes it : 0.000000  -> FAIL
DSR with consistent units      : 0.999968  -> PASS

per-period Sharpe required to pass the gate as coded: 0.845
  ... that is an annualised (365) Sharpe of 16.1 and a t-stat of 37.8 over the sample
```

In situ, driving the real `ValidationHarness` with a runner that registers
trials the way `Backtester` does (`/tmp/probe/p3_dsr_insitu.py`):

```
  [FAIL        ] deflated_sharpe              DSR 0.0000 over 4 trials (gate 0.95)
...
variance_of_trial_sharpes   : 1.1426   (sharpes stored annualised-as-daily)
SR0 (per-period units!)     : 2.2446
```

`SR0 = 2.2446` **per observation** means the null expects the best of four
trials to deliver a t-statistic of `2.24 * sqrt(4000) = 142` over the sample.

The formulae themselves are correct. `deflated_sharpe` at `validation.py:120–124`
is the Bailey–López de Prado expression
`Z[(SR - SR0)·sqrt(T-1) / sqrt(1 - γ3·SR + ((γ4-1)/4)·SR²)]`, and
`expected_max_sharpe` at `validation.py:90–92` is
`sqrt(V)·[(1-γ)·Z⁻¹(1-1/N) + γ·Z⁻¹(1-1/(Ne))]`. Both match the paper. The bug is
entirely in what the harness feeds them.

The fallback makes it worse, not better. `_variance_of_trial_sharpes` returns
`1.0` when fewer than three trials are recorded, documented at `harness.py:471`
as "the conservative direction". A variance of 1.0 against a per-period
observed Sharpe gives `SR0 = 0.52` at two trials — an annualised-daily Sharpe of
10. The only case that passes is `n_trials < 2`, where `expected_max_sharpe`
returns `0.0` and there is no deflation at all. The check is therefore binary:
trivially passed on a strategy's very first run, unreachable on every run after.

**Why 787 tests did not catch it.** `tests/test_harness.py` drives the harness
exclusively through `runner_from(...)`, a fake that returns a hand-built
`FakeResult` and **never writes to the registry**. The one test that names the
interaction, `test_deflated_sharpe_uses_the_registry_trial_count`
(`test_harness.py:180–189`), asserts
`"400" in check.detail or "trials" in check.detail` — and `"trials"` is
unconditionally present in the detail string, so the assertion is vacuous. It
never checks the verdict. `DSR_GATE` is imported at `test_harness.py:19` and
never used. No test anywhere asserts `report.passes is True`.

**Impact.** This is the gate the SPEC places between research and paper trading.
As shipped it rejects everything, which is why "no strategy has passed the
validation harness" is not evidence about the strategies. The dangerous
direction is the repair: whoever fixes this will be tempted to scale `SR0`
down, and the two ways to make the units agree (annualise the observed Sharpe,
or store per-period Sharpes in the registry) differ by whether `sqrt(n-1)` then
counts bars or days — which changes DSR by an order of magnitude. See G-10.

---

### G-5 — `purged_cv` is a tautology, and nothing in the system uses purged splits

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `research/harness.py:278–297`, `research/validation.py:174–199` |
| **Confidence** | **High** |

**Claim.** `_check_purged_cv` tests `purged_kfold_splits` against its own
exclusion rule using the identical inequality, so `leaked` is always `0` and
the check can never FAIL; separately, `purged_kfold_splits` is called from
nowhere else in the system, so no split that anything actually fits on is
purged or embargoed.

**Evidence.**

`purged_kfold_splits` excludes `[start-purge, stop+purge+embargo)` from train
(`validation.py:196–198`). `_check_purged_cv` then counts train indices
satisfying `lo - purge <= i <= hi + purge + embargo` — the same interval,
since `hi = stop-1`. Swept over every `(n, purge, embargo)` combination
(`/tmp/probe/p1_purged.py`):

```
n=   20 purge=  1 embargo=  1 -> leaked=0
n=  100 purge=  2 embargo=  1 -> leaked=0
n= 1000 purge= 20 embargo= 10 -> leaked=0
n= 4096 purge= 81 embargo= 40 -> leaked=0
parameter combos (n x purge x embargo) that produce ANY leak: 0 of 1875
```

Call sites for `purged_kfold_splits`, across `src/` and `tests/`:

```
src/tradesys/research/harness.py:291        <- the tautology above
src/tradesys/research/__init__.py:21,32     <- re-export
tests/test_research.py:183,192              <- its own unit tests
```

That is the complete list. The splits that the harness *does* use for
selection are contiguous slices with no purge and no embargo at all:
`_check_pbo` at `harness.py:330` (`events[b*size:(b+1)*size]`) and
`_check_walk_forward` at `harness.py:259` (`events[i*size:(i+1)*size]`).

**Impact.** A validation report prints `[PASS] purged_cv ... 0 leaking samples`
on every run, including runs where the splits feeding PBO and walk-forward
adjoin each other directly. For a strategy holding across a block boundary —
`funding_carry` holds 21 intervals, seven days — the training block's last
holding period overlaps the test block's first, which is exactly the leak the
machinery exists to prevent. The check reports the absence of a leak it never
looked for.

---

### G-6 — The look-ahead auditor executes zero checks on the real feature set

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `l2_features/audit.py:136–151`, `l2_features/registry.py`, all of `micro.py`/`trend.py`/`derivs.py` |
| **Confidence** | **High** |

**Claim.** `audit_registry` runs `assert_respects_lag` only when `spec.lag > 0`.
Every one of the 17 registered features declares `lag=0`. It therefore executes
no checks, and it never calls `assert_causal` at all — the check the module's
own docstring identifies as the one that catches "the classic killer".

**Evidence.** The brief asked for a leak the auditor should catch, then a
subtler one. Both were written (`/tmp/probe/p5_auditor.py`).

The machinery works in isolation:

```
=== A. does the machinery work at all? ===
  full-sample demean (series)      -> caught
  shift(-1) peek     (series)      -> caught
  reads-current-bar (point)        -> caught
```

What `audit_registry` actually executes, with `assert_respects_lag` spied on:

```
=== B. what audit_registry actually executes ===
  registered features        : 17
  features with lag > 0      : 0
  assert_respects_lag calls  : 0
  assert_causal calls        : 0  (audit_registry never calls it)
  returned 'unaudited' list  : []
```

A blatant future-reader, registered exactly the way the real features are:

```
=== C. a blatant future-reader, registered the way real features are ===
  @feature("leaks_the_future", lookback=4, lag=0)
  def leaks_the_future(prices): return max(prices)

  audit_registry verdict     : []
  -> reported clean. assert_causal on the same function:
     caught -> leaks_the_future: value at position 1 is Decimal('9') ...
```

`[]` is the "everything audited and clean" result. The CI gate that consumes it,
`test_every_registered_feature_is_audited` (`test_data_features.py:197–200`),
asserts `audit_registry(REGISTRY, samples) == []` — which establishes only that
someone wrote a sample for each feature, never that any sample was used.

The `lag=0` declarations are individually defensible: these features read a
running price series, not completed bars, so the current value is knowable.
`trend.py:74–81` argues this explicitly and correctly. The defect is that
`lag=0` is also the value that disables the audit, so "this feature may read
its latest input" and "this feature is never checked" are the same declaration.
`assert_causal` is the check that applies to `lag=0` features —
`audit.py:93–94` says so — and nothing wires it to the registry.

**Impact.** Two of the seventeen features are ones where the boundary is
genuinely delicate. `ewmac` warns at `trend.py:78–81` that recomputing it over
OHLC bars makes the lag 1 and the last bar must be closed; nothing enforces
that if the input source ever changes. `funding_zscore` and `spread_zscore`
have 30-point lookbacks, and a z-score computed over a window that includes the
current point is the textbook look-ahead. None of them is tested.

---

### G-8 — PBO silently discards every block past the sixteenth

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `research/validation.py:147–152` |
| **Confidence** | **High** |

**Claim.** `s = min(n_splits, n_blocks)` followed by `blocks = list(range(s))`
takes the **first** `s` columns of the performance matrix and drops the rest.
With the default `n_splits=16`, a 40-block matrix is evaluated on blocks 0–15
and blocks 16–39 are never read. An odd block count also loses one block to
`if s % 2: s -= 1`.

**Evidence.** `/tmp/probe/p12_misc.py`, on a matrix where configuration 0 is the
in-sample winner in blocks 0–15 and catastrophic in blocks 16–39:

```
   blocks supplied: 40, n_splits default: 16
   PBO (default n_splits=16): 0.000   <- sees only blocks 0..15
   PBO (n_splits=20, C(20,10)=184756 splits): 0.549
```

`0.000` clears the `PBO_GATE = 0.50`. `0.549` fails it. The difference is
entirely which columns the function chose to read.

```
   n_blocks=  7 -> s=6 blocks used, 1 discarded
   n_blocks=  9 -> s=8 blocks used, 1 discarded
   n_blocks= 17 -> s=16 blocks used, 1 discarded
```

**On the brief's question — is it truly combinatorial, or a cheaper
approximation?** It is genuinely combinatorial:
`itertools.combinations(blocks, s // 2)` enumerates all `C(s, s/2)` splits, and
the relative-rank test at `validation.py:161–165` is the correct CSCV statistic
(counting `ω < 0.5` is equivalent to López de Prado's `P(λ < 0)`). The defect
is the input truncation, not the enumeration.

`ValidationHarness._check_pbo` hardcodes `blocks = 8` (`harness.py:324`) and
passes `n_splits=8`, so today nothing is truncated — but eight blocks is half
the S=16 the method is normally run at, and the exported function is part of
the public API at `research/__init__.py:32`. A researcher passing a 40-block
matrix gets a confident, silently wrong answer.

Related, same lines: `n_splits` is unbounded. `C(40,20) = 1.4e11`; the probe had
to be killed. There is no guard.

---

### G-9 — `test_same_code_path` compares a backtest to a backtest

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `tests/test_same_code_path.py:25–49` |
| **Confidence** | **High** |

**Claim.** The test the audit cites as proof that backtest, paper and live
traverse the same `Pipeline` runs `run_session(events)` twice, and both calls
go through `demo.build_pipeline()` against `SimAdapter`. It proves the backtest
is deterministic. It never constructs a live or paper session.

**Evidence.**

```python
def run_session(events) -> DecisionRecorder:
    pipeline, adapters, recorder = build_pipeline()      # the backtest wiring
    ...
def test_replay_reproduces_every_decision():
    first  = run_session(events)
    second = run_session(events)
```

`live/wiring.py`, `session.py` and `live/runner.py` are not imported by the
file. The docstring's "records a session's decisions, replays the identical
inbound events" describes `run_session`'s own drive loop, defined at
`test_same_code_path.py:28–36` — which is a **third** copy of the event loop,
distinct from both `Backtester.run` (`backtest.py:127–148`) and
`Session.on_event` (`session.py:235–280`). So the test does not exercise the
backtester either.

**What is actually true, and worth recording.** I grepped `pipeline.py`,
`l5_risk/service.py` and `l6_execution/executor.py` for any branch on mode,
environment, paper, live, dry-run or shadow. There are none — every hit is a
comment or a docstring. The `Pipeline` really is mode-agnostic, and the
differences between the three drive loops are in what they do *around* the
pipeline (the backtester calls `venue.apply_market_event` and `venue.step()`;
the session calls neither and drives `tick()`), not inside it. The property the
audit claims holds. The test does not establish it.

**Impact.** The three loops can diverge without any test noticing. They already
differ in one load-bearing way: `Backtester.run` calls `pipeline.on_fill`
synchronously in the same loop iteration as the event that caused the order,
while in live a fill arrives on a separate asyncio task (`runner._user_loop`).
Any ordering assumption the pipeline makes about fill-versus-event sequencing
is validated only under the synchronous arrangement.

---

### G-10 — Per-event equity points are treated as daily returns

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `research/backtest.py:148`, `research/backtest.py:69–71`, `research/harness.py:421`, `research/harness.py:356–363`, `research/validation.py:32` |
| **Confidence** | **High** |

**Claim.** `Backtester.run` appends one equity point per market event
(`backtest.py:148`, inside `for event in events`). Every consumer treats those
points as daily. `PERIODS_PER_YEAR = 365` is applied to them, and
`_check_expectancy` bootstraps them as if they were independent per-trade
outcomes.

**Evidence.** Measured event density in the shipped scenarios
(`/tmp/probe/p4_granularity.py`):

```
demo.build_events    events=   675 span=  14.667 days  events/day=        46.0
demo.build_cycling   events=  2400 span=  53.000 days  events/day=        45.3
trend                events=   950 span=   7.875 days  events/day=       120.6
cascade              events=   336 span=   2.460 days  events/day=       136.6
dispersion           events=  3280 span=  13.292 days  events/day=       246.8
carry                events=  5670 span=  23.292 days  events/day=       243.4
```

Against real captured data the ratio is far larger: `binance_live._on_mark`
emits an event per mark-price message, which Binance pushes every 1–3 seconds.

Three consequences, in increasing order of seriousness:

1. **`BacktestResult.sharpe`** annualises by `sqrt(365)` when the correct factor
   is `sqrt(365 × events_per_day)` — understated by 6.7× to 15.7× in the
   scenarios above. This is the number compared against the SPEC's Sharpe ≥ 1.5
   gate, and the number written to the registry.
2. **`_check_time_to_significance`** (`harness.py:421`) computes
   `sharpe(returns, PERIODS_PER_YEAR)` on the same points. In the in-situ run it
   reported *"at Sharpe 1.07, distinguishing it from zero takes 3.4 years"* for
   a series whose points are events, not days.
3. **`_check_expectancy`** (`harness.py:359`) calls `bootstrap_expectancy_ci` on
   per-bar returns, while its detail string and `validation.py:334–338` both
   describe per-trade expectancy and gate on the CI lower bound. With 4000 bars
   behind 30 trades the interval is roughly `sqrt(4000/30) ≈ 11×` too narrow,
   before accounting for the serial correlation of bar returns within a single
   trade, which an i.i.d. bootstrap ignores entirely. The in-situ run produced
   `95% CI [0.00010, 0.00035]` and a PASS.

Deflated Sharpe is itself close to frequency-invariant — `SR_per_period·sqrt(n)`
is unchanged by resampling — which is why G-2 is a unit mismatch rather than a
frequency error. Expectancy has no such protection: its gate gets easier the
finer the equity curve is sampled.

**Impact.** The `expectancy` gate is the one that decides whether a strategy may
be scaled, and it is materially over-optimistic in a way that gets worse the
more data you capture. Nothing in the pipeline records the equity curve's
sampling frequency, so there is no way for a consumer to correct for it.

---

### G-15 — `monte_carlo` is a gate that cannot fail

| | |
|---|---|
| **Severity** | **Moderate** |
| **Location** | `research/harness.py:343–354` |
| **Confidence** | **High** |

**Claim.** `_check_monte_carlo` computes the 5th-percentile drawdown and the
block-bootstrap drawdown, notes whether losses cluster, and then returns
`Verdict.PASS` unconditionally (`harness.py:354`). No drawdown figure, however
bad, produces a FAIL.

**Evidence.** The only `return` on the non-inconclusive path is
`Check("monte_carlo", Verdict.PASS, detail, mc.drawdown_p5)`. In the in-situ run
it reported `5th-pct drawdown 14.72% vs observed 7.22%; block bootstrap 15.80%`
and passed; a 15.8% clustered drawdown is above the `drawdown_hard` limit of
0.12 in `risk/limits.yaml`, which would full-stop the system in production.

`_check_time_to_significance` is also non-gating but says so explicitly —
`"""Not a gate. A statement of how long a verdict would actually take."""`
(`harness.py:417`). `_check_monte_carlo` carries no such note, and since
`ValidationReport.passes` requires `all(c.ok for c in self.checks)`, it reads
as one of eleven gates when it is one of nine.

**Impact.** A reader of the report counts eleven checks passing. Two of them
cannot fail (this one and `purged_cv`, G-5), and a third cannot pass (G-2).

---

### G-16 — The lag check silently disarms on non-arithmetic windows, and clipping features evade it

| | |
|---|---|
| **Severity** | **Moderate** |
| **Location** | `l2_features/audit.py:109–113`, `l2_features/audit.py:123–128` |
| **Confidence** | **High** |

**Claim.** `_perturb` returns `None` for any value that does not support
`x * 7 + 13`, and `assert_respects_lag` responds with a bare `return` —
reporting success. The feature is not added to `audit_registry`'s `unaudited`
list, so a silently skipped feature is indistinguishable from a passing one.
Separately, a feature that reads the current element through a clamp or a
saturating comparison survives the perturbation.

**Evidence.** `/tmp/probe/p5_auditor.py`:

```
=== D. _perturb silently disarms the lag check ===
  _perturb((Decimal('5'), 'sell')) -> None
  _perturb('a'                   ) -> None
  _perturb({'p': 1}              ) -> None
  _perturb(Decimal('1')          ) -> Decimal('20')
  audit_registry over a lag=2 feature whose window holds tuples: []
  -> [] means 'audited and clean'. It read window[-1] and nothing complained.

=== E. a saturating leak that survives the perturbation ===
  clipped reader (w[-1] clamped at 10), window ends at 50 -> NOT CAUGHT
```

This is not hypothetical for this codebase: `cascade_pressure` takes a sequence
of `(quantity, side)` tuples, and its own audit sample in
`test_data_features.py:192` is `[(dec("5"), "sell"), (dec("3"), "sell")]`. If
its lag were ever raised above zero, the check would silently pass.

**Impact.** Lower than G-6 only because no feature currently declares
`lag > 0`. It matters at the moment someone fixes G-6, because the obvious fix —
declaring honest lags — lands straight on this.

---

### G-17 — Block bootstrap: fixed block length, and the head of the series is sampled 10× too rarely

| | |
|---|---|
| **Severity** | **Moderate** |
| **Location** | `research/validation.py:260–282` |
| **Confidence** | **High** |

**Claim.** Two defects. (a) `block: int = 10` is a literal; the brief's question
— is the block length chosen from the data's autocorrelation? — answers no, and
`harness.py:348` passes `block=10` explicitly rather than deriving it. (b)
`start = rng.randrange(n)` with `trades[start:start + block]` truncates blocks
at the tail instead of wrapping, so observations near the start of the series
enter far fewer resamples than interior ones.

**Evidence.** `/tmp/probe/p12_misc.py`, `n=200`, `block=10`, 20 000 draws:

```
   mean draws for observations 0..8 :    489.8
   mean draws for observations 50..149:   1009.2
   observation 0 alone              :       97  (0.10x the interior rate)
```

Observation 0 can only be drawn when `start == 0`; observation 9 and beyond can
be drawn ten ways. A circular (wrapping) block bootstrap gives every
observation equal weight and is the standard remedy.

**Impact.** Moderate rather than Major because the check that consumes it
(`monte_carlo`) cannot fail anyway — see G-15. It becomes load-bearing the
moment that is fixed. The fixed block length is the more consequential half: the
function's entire purpose, stated at `validation.py:265–268`, is to preserve the
serial correlation that produces bad runs, and a block length picked without
looking at the data cannot be relied on to do that. The harness reports
"Losses cluster, so size against the block figure" based on a comparison whose
sensitivity nobody has calibrated.

---

### G-18 — Every PBO and walk-forward slice is backtested from a cold start

| | |
|---|---|
| **Severity** | **Moderate** |
| **Location** | `research/harness.py:259`, `research/harness.py:330` |
| **Confidence** | **High** |

**Claim.** Both checks slice `events` and call `self.run_backtest(chunk, ...)`
on each slice independently. The pipeline is rebuilt with empty feature state,
so every slice spends its opening events in warm-up producing no signals.

**Evidence.** `_check_pbo` uses `size = max(1, len(events) // 8)`. Registered
lookbacks: `ewmac` 32, `breakout_position` 32, `funding_zscore` 30,
`spread_zscore` 30, `hedge_ratio` 30, `spread_half_life` 30. On the demo's 675
events, `size = 84`, so 32 of every 84 events — 38% — are warm-up. On
`cascade_events` (336 events), `size = 42`, and a 32-point lookback consumes
76% of each block.

**Impact.** The PBO matrix measures configurations' behaviour on truncated
samples that are mostly warm-up. `_check_pbo` guards only against the
degenerate case (`all(all(v == 0 ...))` at `harness.py:334`), not against the
much more likely case of blocks with one or two trades each. A PBO computed
from such a matrix is noise, and it is reported to three decimal places.

---

### G-19 — `walk_forward` does not walk forward

| | |
|---|---|
| **Severity** | **Moderate** (folded into G-18's family; recorded separately because the audit's characterisation of it is wrong) |
| **Location** | `research/harness.py:251–276` |
| **Confidence** | **High** |

**Claim.** `_check_walk_forward` runs the **same fixed** `self.parameters` on
each of `windows-1` contiguous slices and counts how many were profitable.
Nothing is fitted on window `i-1` and tested on window `i`; window 0 is skipped
but nothing is trained on it. It is a stability check, not walk-forward
validation.

**Evidence.** The loop body at `harness.py:258–267` passes `self.parameters`
unchanged to every window. There is no optimisation step and no state carried
between windows.

This also corrects the audit. `AUDIT.md:240` says *"No walk-forward runner; the
harness computes the statistic but the caller supplies the splits."* The caller
does not supply the splits — the harness constructs them itself at
`harness.py:257–259` from a `windows: int = 4` argument, and no caller can
supply overlapping or leaky splits because no caller can supply splits at all.
The brief asked me to trace this; that is the answer.

**Impact.** `WALK_FORWARD_GATE = 0.70` is presented as an out-of-sample gate.
Passing it means "the strategy, with parameters chosen on the whole sample, was
profitable in 70% of contiguous chunks of that same sample" — which is a
statement about in-sample stability, and is consistent with severe overfitting.

---

## 3.2 The cost model

### G-3 — Funding is settled every mark tick at the predicted rate

| | |
|---|---|
| **Severity** | **Critical** |
| **Location** | `pipeline.py:523–551`, `live/binance_live.py:336–355`, `accounting.py:279–311` |
| **Confidence** | **High** |

**Claim.** The brief asks whether the backtester accrues and pays at the
00:00/08:00/16:00 UTC boundaries, and whether a position opened and closed
between settlements pays nothing. Neither holds. Funding is accrued *and
immediately settled* on every inbound funding event, at whatever rate that
event carries, with the fraction measured between consecutive **funding
events** rather than from the position's open.

**Evidence.**

`binance_live._on_mark` emits a `funding` MarketEvent for **every mark-price
message** (`binance_live.py:350–354`):

```python
if payload.get("r") is not None:
    out.append(self._event(
        symbol, "funding",
        Funding(rate=dec(str(payload["r"])), interval_hours=8,
                next_settlement=ms_to_ns(int(payload.get("T", 0)))),
        exchange_ts, recv))
```

Binance pushes `markPrice` every 1–3 seconds, and `r` is the *current estimated*
funding rate, which moves throughout the interval and is not the rate finally
charged.

`pipeline._accrue_funding` then accrues a sliver and settles it to cash in the
same call (`pipeline.py:547–549`):

```python
self.books.accrue_funding(event.venue, event.symbol, payload.rate, fraction, strategy_id)
self.books.settle_funding(event.venue, event.symbol)
```

`fraction` comes from `elapsed = event.exchange_ts - last` where `last` is the
previous *funding event's* timestamp (`pipeline.py:533–537`) — tracked per
`(venue, symbol)` and updated before the position check, so it is entirely
independent of when the position was opened.

`/tmp/probe/p8_funding.py`, short 1 BTC at 60 000, funding +0.01% per 8h:

```
  held the whole 8h interval             -> credited   6.0000
  opened 4h before settlement            -> credited   6.0000
  opened 1 SECOND before settlement      -> credited   6.0000
  opened at the settlement instant       -> credited   6.0000

Opened 1h AFTER a settlement, closed 3h after it, never open at 00/08/16:
  Binance pays: 0.0000
  This code credits: 0.7500  (cash delta 0.7500)
```

`Funding.next_settlement` — the field that would make this correct — is
populated by every producer (`binance_live.py:353`, `demo.py:134`,
`scenarios.py:325`, `scenarios.py:417`) and **read by nothing**. I grepped
`src/` and `tests/`: there are no consumers.

**Why no synthetic test catches it.** `demo.py:137` advances `ts` by exactly
`FUNDING_INTERVAL_NS` between funding events, so `fraction` is always `1.0` and
the behaviour is indistinguishable from correct settlement. The scenarios do
the same. The divergence appears only against captured live data — which is the
one input the system has never been run against end to end.

**Impact, with real money.** `funding_carry` is the only strategy wired for
live trading (`live/wiring.py:170`), and funding is its entire gross. Three
distinct errors compound:

1. **Revenue that does not exist.** A position held between settlements is paid
   pro rata. Binance pays nothing. A carry strategy that enters and exits around
   funding excursions — which is what `entry_z`/`exit_z` cause it to do —
   collects backtest revenue it will never see.
2. **Wrong rate.** Integrating the predicted rate over the interval is not the
   settled rate. In a fast-moving basis these differ materially and in an
   uncontrolled direction.
3. **A full interval for a one-second hold.** Because `fraction` is measured
   between funding events, a position opened just before an event that is 8h
   after the previous one receives a full interval's funding. This makes
   "enter just before funding" free money in the backtest.

`carry_breakeven_periods` (`costs.py:130–149`) computes that a round trip needs
~30 intervals to pay for itself at baseline funding. Every one of the three
errors above shortens that in the backtest and not in reality.

`interval_hours=8` is also hardcoded at `binance_live.py:352` rather than
derived from `next_settlement`; Binance runs some perpetuals on a 4h interval
and shortens the interval dynamically when funding hits the cap.

---

### G-11 — `viability.assess` prices two-venue trades on one fee tier, and `Viability` carries two cost numbers that disagree

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `research/viability.py:310–331`, `research/viability.py:71–90`, `l3_strategy/funding_carry.py:63` |
| **Confidence** | **High** |

**Claim.** Three separate cost-duplication defects in the module that produces
every published viability verdict.

**(a) `Viability` stores two round-trip costs that disagree by 2×.**
`assess` computes `cost` from `profile.fills` (`viability.py:327–330`) and
stores it as `round_trip_cost`, while the `CostStructure` it also stores
computes `round_trip_fraction()` from `self.fills`, which is the hardcoded
constant `4` (`viability.py:71–73`). `/tmp/probe/p6_viability.py`:

```
  profile              assess() round_trip_cost  structure.round_trip_fraction()
  trend                                 0.0800%                          0.1600%   <-- DISAGREE
  cascade                               0.1200%                          0.2000%   <-- DISAGREE
  funding_dispersion                    0.1700%                          0.1700%
  funding_carry                         0.2000%                          0.2000%
```

Both are reachable from the same object and both have a `__str__` that prints
"cost". Which one a caller gets depends on which attribute it happened to
reach for.

**(b) Four-fill profiles are two-venue trades priced entirely at futures
fees.** `funding_carry` and `funding_dispersion` both declare `fills=4` — perp
and spot, open and close. `assess` takes a single `(maker, taker)` pair,
defaulting to `0.0002 / 0.0005`, the futures VIP 0 rates, and applies it to all
four fills. The module's own `BINANCE_SPOT_TIERS` (`viability.py:159`) puts spot
VIP 0 at `0.001 / 0.001` — five times the futures maker rate. Recomputed by hand
from this file's own tables:

```
=== 3. funding_carry recomputed by hand ===
  expected_gross = 0.65*0.0021 - 0.35*0.0015 = 0.000840  (0.0840%)
  cost as coded (all four fills at FUTURES tier-0): 0.2000%  -> share 238.1%
  cost with the SPOT leg priced at spot tier-0   : 0.3600%  -> share 428.6%
  funding needed per 8h to clear 40% at 21 intervals: 0.0238%  (baseline is 0.0100%)
                                    two-venue cost: 0.0429%
```

**This answers the brief's question about the 238%.** The arithmetic is
internally consistent and reproduces exactly, so the strategy is dead — but
238% is the *optimistic* figure. Priced honestly across two venues the share is
429%, and the funding rate required to clear the gate is 0.0429% per 8h — 4.3×
baseline, an annualised 47%, which is the "crowded" to "mania" regime in the
module's own `OBSERVED_FUNDING` table. The conclusion "this strategy does not
clear at baseline funding" is right and is more robustly right than the number
printed.

**(c) `funding_carry.round_trip_cost = 0.003` disagrees with viability's
0.0020 for the same strategy.** The strategy's own break-even gate
(`funding_carry.py:188` → `carry_breakeven_periods`) uses 30 bps; the viability
module scores the same strategy at 20 bps. A 50% disagreement between the number
that decides whether to enter and the number that decides whether entering is
worthwhile. The audit records the constant at `AUDIT.md:501–503` but not that
it contradicts the other copy.

For completeness, every place a round-trip cost for `funding_carry` is
independently asserted:

| Location | Value | Used for |
|---|---|---|
| `l3_strategy/funding_carry.py:63` | `0.003` | the strategy's own entry gate |
| `research/viability.py:327–330` via `assess` | `0.0020` | the published 238% |
| `research/viability.py:75–90` via `CostStructure` | `0.0020` | agrees here, 2× off for trend/cascade |
| `demo.py:187–189` / `scenarios.py:205–210` | 2/5 bps + 1.5 or 2 bps adverse + impact | what the backtest actually charges |
| `adapters/sim.py:195` | `0.0002 / 0.0005` | the simulated venue's default schedule |
| `adapters/binance.py:468–469` | `0.001` | the live fallback (G-13) |

`funding_dispersion`'s two copies (`0.0017` in both the strategy and `assess`)
do agree.

**Minor, same module:** the `trend` profile declares `crossing_legs=0` while its
own note says *"One leg, resting entry, stop crosses"* (`viability.py:344–345`).
A crossing stop would put its cost at 0.10% rather than 0.08%.

---

### G-12 — `funding_dispersion`'s verdict flips inside a defensible range of the impact coefficient

| | |
|---|---|
| **Severity** | **Moderate** |
| **Location** | `costs.py:103–117`, `adapters/sim.py:411–418`, `research/viability.py` (absence) |
| **Confidence** | **High** |

**Claim.** The brief asks how sensitive each strategy's verdict is to the
hardcoded impact parameter, and to say so explicitly if a plausible range flips
one. One does: `funding_dispersion` crosses the 40% cost gate between `y=1.5`
and `y=2.0`.

**Evidence.** `/tmp/probe/p7_impact_y.py` re-runs all four scenario backtests
with `impact_y` swept, reading the measured `cost_ratio` against the
`COST_GATE = 0.40`:

```
 impact_y |            trend             |           cascade            |      funding_dispersion      |        funding_carry
      0.0 |    608.06         2.9% PASS |     25.86         2.3% PASS |      6.94        32.7% PASS |     11.73        10.7% PASS
      0.5 |    605.67         2.9% PASS |     25.86         2.3% PASS |      6.44        34.4% PASS |     11.56        10.8% PASS
      1.0 |    603.28         2.9% PASS |     25.86         2.3% PASS |      5.94        36.2% PASS |     11.39        11.0% PASS
      1.5 |    600.89         2.9% PASS |     25.86         2.3% PASS |      5.44        38.3% PASS |     11.21        11.1% PASS
      2.0 |    598.50         2.9% PASS |     25.86         2.3% PASS |      4.94        40.6% FAIL |     11.04        11.3% PASS
      3.0 |    593.72         3.0% PASS |     25.86         2.3% PASS |      3.94        46.1% FAIL |     10.69        11.6% PASS
```

**`funding_dispersion` has no verdict. It has a guess.** `trend`,
`cascade` and `funding_carry` are robust across the whole sweep.

Two things worth separating out:

**The parameter is a coefficient, not an exponent.** `AUDIT.md:241` describes
*"square-root with a hardcoded exponent `y=1`"*. In `costs.py:117`,
`return y * daily_vol_bps * dec(str(round(ratio ** 0.5, 6)))`, `y` multiplies —
it is the linear coefficient. The **exponent is hardcoded at `0.5`** and is not
a parameter at all, so it cannot be swept and its sensitivity is untestable
without editing the function. The brief's instruction to check "the exponent"
therefore has no handle in this code; the sweep above varies the coefficient,
which is the only thing exposed.

**`viability.assess` has no impact term whatsoever.** The published cost shares
at `AUDIT.md:399–404` — 5.0%, 18.2%, 31.3%, 238% — come from
`viability.py:327–330`, which sums fees, slippage and adverse selection only.
Those verdicts are insensitive to `y` by construction, not by robustness. The
`tradesys strategies` CLI prints them in a "predicted" column beside the
measured backtest shares as though they were comparable quantities; for
`funding_carry` the two are 238% and 11%.

**`cascade`'s cost share does not move at all across the sweep** (2.3% at every
value), which means it takes no liquidity in its own scenario — while its
viability profile declares `crossing_legs=1` and its note says it "pays the
spread on purpose". The scenario is not exercising the cost structure the
profile prices.

---

### G-13 — The fee-tier and BNB-discount machinery is entirely unreferenced

| | |
|---|---|
| **Severity** | **Moderate** |
| **Location** | `costs.py:46–74`, `costs.py:208–247`, `adapters/binance.py:465–471`, `core/events.py:434` |
| **Confidence** | **High** |

**Claim.** The brief asks what consumes a wrong fee from the `0.001` fallback and
how far it propagates. The answer is: nothing, because **nothing reads the fee
schedule at all.** The wider finding is that the machinery the audit credits as
"fees by tier" is dead code.

**Evidence.** Call-site searches across `src/` and `tests/`:

| Symbol | Production call sites |
|---|---|
| `adapter.fee_schedule()` | **none** — declared in `base.py:82`, implemented by every adapter, listed in `conformance.py:32`, called by no session, runner, wiring, pipeline or risk code |
| `CostModel.round_trip()` | **none** |
| `FeeModel.fee()` | only from `CostModel.round_trip` (dead) and two unit tests |
| `FeeModel.rates_for_volume()` | only from `FeeModel.fee` (dead) |
| `FeeModel.tier_schedule` | **never populated anywhere in `src/`** |
| `volume_30d` | **never supplied by any caller** |
| `FeeSchedule.bnb_discount` | **read by nothing** |
| `FeeModel.bnb_discount` | read only inside `FeeModel.fee` (dead) |
| `costs.slippage_cost()` | **none in `src/`** — the sim uses its own `SimBook.walk` |

What actually charges fees is `SimAdapter._fill` (`sim.py:371–372`):
`rate = self.fees.maker_rate if maker else self.fees.taker_rate` — a flat
two-rate `FeeSchedule` constructed from literals in `demo.py:224` and
`scenarios.py:218`, with no tier logic and no discount.

**On the brief's BNB-discount question.** It is applied nowhere, so "applied
where it should be and only there" is vacuously satisfied. Two things to note
for when it is wired: `FeeModel.fee` applies one discount rate to both maker and
taker and to both venue types, whereas Binance's discounts differ by product
(spot and futures are not the same percentage); and
`notional * rate * (1 - discount)` shrinks a *rebate* when `rate` is negative,
which is the wrong direction — `FeeSchedule.maker_rate`'s own comment at
`core/events.py:431` says "negative = rebate".

**On the `0.001` fallback specifically.** `adapters/binance.py:468–469`:

```python
maker_rate=dec(str(data.get("commissionRates", {}).get("maker", "0.001"))),
taker_rate=dec(str(data.get("commissionRates", {}).get("taker", "0.001"))),
```

`0.001` is *spot* VIP 0. For a futures account the correct default is
`0.0002 / 0.0005`, so the fallback is 5× and 2× too high. It also masks a
missing field rather than raising: Binance's USDⓈ-M account endpoint does not
carry `commissionRates` at all — the futures rate comes from a different
endpoint — so on futures the fallback fires on every call and always will. That
interacts with F-1: the path is `/api/v3/account`, a spot path, so on futures the
call 404s *and* the fee silently becomes a spot constant.

**Impact.** Today, none — the value is discarded. But the system therefore has
**no live fee input whatsoever**. Every cost number it produces is a literal in
`demo.py`, `scenarios.py` or `viability.py`, and the docstrings assert the
opposite: `core/events.py:428` says "The ACTUAL tier, read from the venue. Never
a constant in code", and `binance.py:466` says "Read the ACTUAL tier. Never a
constant in code (Annex B section 1)." Those describe an intention no wiring
realises. This widens `AUDIT.md`'s note that fee tables are hardcoded: the
machinery to un-hardcode them exists, is tested, and is not connected.

---

### On adverse selection — the brief's question answered directly

`CostModel.adverse_selection_bps` (`costs.py:204`) is a plain `Dec` field. It is
consumed at `sim.py:421` as `price * adverse_selection_bps / 10_000` on every
maker fill. It is not a function of spread, volatility, queue position, holding
horizon, order size, or anything measurable. **It is a constant wearing a
function's clothing.** Its values are `1.5` in `demo.py:188` and `2` in
`scenarios.py:208`, both literals with no derivation recorded. `l6_execution/tca.py`,
which would be the natural place to estimate it from realised fills, is exported
and never called — a fact the audit already records.

The one thing that *is* modelled correctly is its sign and its application: it
is charged only on maker fills, never on taker fills, and always against the
fill, which matches the mechanism described at `costs.py:200–203`.

**Related, and worth flagging as a Moderate in its own right:** the cost-stress
check is narrower than its name. `_check_cost_sensitivity` runs at
`cost_multiple=1.5`, and `demo.build_pipeline` scales only
`adverse_selection_bps` (`demo.py:213`) and the adapter's `FeeSchedule`
(`demo.py:224`). `impact_y` is not scaled, the `CostModel.fees` copy is not
scaled, and depth-walk slippage is not scaled. In `scenarios.py` it is worse:
`_cost_model(multiple)` accepts a multiple and is called at `scenarios.py:219`
with no argument, so the parameter is dead and the scenario cost stress does
nothing at all. "A strategy that dies at 1.5× costs is one fee-tier change from
dead" is true of the check as written only for fees and adverse selection.

---

## 3.3 Correctness of the shared execution path

### G-4 — The signer's endpoint allowlist never sees the endpoint

| | |
|---|---|
| **Severity** | **Critical** |
| **Location** | `live/wiring.py:142`, `adapters/binance.py:432–450`, `adapters/binance.py:137–150`, `security/signer.py:244–255` |
| **Confidence** | **High** |

**Claim.** `SigningService.as_signer(strategy_id, environment, endpoint)` closes
over a **fixed** endpoint string. `live/wiring.py:142` binds it to
`"/api/v3/order"` once, at construction. `BinanceAdapter._call` then signs every
signed request through that same scoped signer without passing the path it is
actually calling. The allowlist — described at `signer.py:7–11` as the control
that matters most, the last defence against the one unrecoverable failure —
inspects a constant.

**Evidence.** `/tmp/probe/p11_signer.py` drives the real `SigningService` and the
real `BinanceAdapter` against a spy transport:

```
=== 1. the signer refuses a withdrawal when it is told the real path ===
   refused -> refusing to sign '/sapi/v1/capital/withdraw/apply': it moves funds off ...

=== 2. how live/wiring.py builds the adapter's signer ===
   wiring.py:142 -> service.as_signer("tradesys", environment, "/api/v3/order")
   request sent: POST https://testnet.binance.vision/sapi/v1/capital/withdraw/apply
   signed query: coin=BTC&address=attacker&amount=10&timestamp=...&recvWindow=5000&signature=e616416232c71390...
   signer audit rows: [('/sapi/v1/capital/withdraw/apply', True), ('/api/v3/order', False)]
   refusals recorded: 1
```

The first audit row is the direct call in step 1, correctly refused. The second
row is the withdrawal request that went through the adapter: **signed, not
refused, and logged as `/api/v3/order`.**

The mechanism is visible in one line. `binance.py:442`:

```python
query = build_signed_query(params, self.signer)
```

`build_signed_query(params, signer)` (`binance.py:137–150`) takes params and a
signer. It has no path parameter. `_call` has the path in hand as its own
argument and never passes it on.

**Impact.** Two distinct harms.

1. **The control is inoperative.** No code in this repository calls a
   withdrawal endpoint, so nothing is being exfiltrated today. But the defence
   is described as defence-in-depth precisely for the case where something else
   has already gone wrong — a compromised dependency, an injected path, an
   operator error. In that case it does not fire. `signer.py:186` promises
   *"There is no fourth reason and no override"*; the override is that the
   caller decides what the signer is told.
2. **The audit trail is wrong for every signed request.** `signer.py:225–226`
   records `endpoint` from the same constant, so `SigningService.audit` claims
   every signed request in the system's history was `/api/v3/order`. The log
   that exists to reconstruct what was signed cannot do so.

`tests/test_security.py:97` constructs `as_signer("carry", "testnet", "/api/v3/order")`
and tests the service directly, never through an adapter — which is the blind
spot the brief predicted: `BinanceAdapter` is only ever exercised against an
injected fake transport, so nothing asserts on what the *signer* was asked.

---

### G-7 — Check 8 reduces and returns early, skipping checks 9–13

| | |
|---|---|
| **Severity** | **Major** |
| **Location** | `l5_risk/service.py:180–192` |
| **Confidence** | **High** |

**Claim.** The brief asks whether any of the 13 ordered checks can be skipped by
an early return. One can, and it is the only check with a reduce-and-approve
path. When check 8 (position limit) reduces an order, it returns
`self._approve(...)` immediately, so checks 9 (concentration), 10 (gross
exposure), 11 (order rate), 12 (liquidation distance) and 13 (loss state) never
run for that order.

**Evidence.** `/tmp/probe/p13_risk_order.py`, identical account state in both
rows, daily loss 5% against a 3% limit:

```
=== A. a full-size order during a daily-loss breach ===
   qty 0.01  approved=False  rejected_by=13_loss_state: daily loss 0.0500

=== B. an order big enough to trip check 8, same daily-loss breach ===
   qty 0.010 approved=True  adjusted=0.00333  rejected_by=None
   daily loss is 0.050 against a 0.03 limit;
   kill switch engaged by check 13? False

=== C. which checks a reduced order skips ===
   # 9. runs before the early return: False
   # 10. runs before the early return: False
   # 11. runs before the early return: False
   # 12. runs before the early return: False
   # 13. runs before the early return: False
```

The same order is refused when small and approved when large enough to trigger
the reduction path.

Two knock-on effects:

- **The daily-loss kill switch is not engaged.** Check 13 does not merely
  reject; it calls `self.killswitch.engage(Trigger.DAILY_LOSS, ...)`
  (`service.py:228`). Bypassing check 13 means the breach goes unrecorded and
  the flatten it should have triggered never fires.
- **`throttle` is always `False` on the early-return path.** `_approve` is
  called with `throttle`, but check 11 — the only thing that sets it — runs
  after check 8. A reduced order is never throttled, whatever the rate-limit
  budget says.

**On the "reduce, never enlarge" invariant.** That half holds and is defended
twice: `service.py` asserts it, and `executor.py:167–169` re-checks
`quantity > intent.quantity` independently. I could not construct a combination
of reductions that enlarges an order. The invariant that fails is the weaker but
equally load-bearing one — that an approved order has passed all thirteen checks.

**Impact.** The condition that makes an order large enough to trip check 8 —
an account already near its position cap — correlates with the conditions checks
9, 10, 12 and 13 exist to catch. The checks are bypassed in precisely the state
they were written for. The audit's "All 13 declared checks are implemented and
ordered" (`AUDIT.md:246`) is true of the code and not of its execution.

---

### On time-of-check/time-of-use, and concurrency — what I found and did not find

**TOCTOU between `RiskService.evaluate` and `executor.py` submission: narrow.**
In `pipeline.py:294–302` the sequence `evaluate` → `recorder.add` →
`_record_audit` → `await executor.submit` contains no `await` before the submit,
so no other coroutine interleaves between approval and the decision to place.
The first suspension point is inside `submit`, at `await adapter.place(sized)`
(`binance.py`/`sim.py`), by which time the order has already been constructed
from the approved quantity.

**What the executor re-checks.** `executor.submit` (`executor.py:150–180`)
re-checks: halt state, decision presence, `decision.approved`, that
`decision.intent_id` matches the intent, that the quantity was not enlarged, and
that the quantity is above zero. It also refuses if a machine with the same
`client_order_id` is in a state that may still exist at the venue. It does **not**
re-check position limits, exposure, feed freshness, or anything else — but since
there is no suspension point between evaluate and submit, that is a defensible
design rather than a defect.

**`in_flight` vs `submit`: no race.** `executor.py:186–188` registers the machine
in `self.machines` and calls `machine.on_sent(now)` **before** awaiting
`place()`, so `in_flight()` (`executor.py:274–292`) counts the order from the
instant it is decided rather than from the ack. `pipeline.py:248–249` subtracts
it: `delta = target.target - current - in_flight`. This is the rapid-fire failure
mode of SPEC §8.5, and it is closed.

**A real race I could not fully resolve without a live venue.**
`live/runner.py:187–190` starts three concurrent tasks — `_market_loop`,
`_tick_loop`, `_user_loop` — with no lock between them. Two consequences I can
reason about but not probe without a venue:

- `Session.on_event` ends with `await self.tick(...)` (`session.py:279`), and
  `_tick_loop` calls `session.tick()` independently (`runner.py:414`). Both can
  therefore reach `_flatten` concurrently. The `state == SessionState.RUNNING`
  guard at `session.py:306` narrows but does not close this, because `_flatten`
  sets `HALTED` as its first statement and the check is not atomic with it.
- `_flatten` cancels each open machine and then places reduce-only orders. A
  machine registered by `_market_loop` but still awaiting `place()` is
  non-terminal, so it is cancelled; the cancel gets `OrderNotFound`,
  `machine.on_not_found()` moves it to a terminal state, and then the in-flight
  `place()` returns and calls `machine.on_ack(...)` on it. Whether the FSM
  tolerates that transition is testable in isolation; whether the interleaving
  occurs depends on venue latency.

See §"Unverifiable without a live venue".

**Unit and rounding: sound.** The brief asks whether price rounding floors where
it should round to nearest or away. It does not. `floor_to`
(`core/types.py:77–91`) is used only for quantity, via
`FilterRounder.round_quantity`. Price goes through `round_price_conservative`
(`core/types.py:94–113`), which rounds buys down and sells **up** — never making
the order more aggressive, so a floored sell price cannot cross the spread.
`FilterRounder.prepare` (`base.py:159–165`) rounds then validates in that order,
and `validate` re-checks the tick and step multiples and re-checks
`min_notional` *after* rounding. `executor.build_intent` (`executor.py:121–123`)
is the single funnel and it calls `prepare`. I found no defect here.

**Timestamps: sound at the conversion boundaries.** Every millisecond-to-
nanosecond conversion in `adapters/binance.py` and `live/binance_live.py` goes
through `ms_to_ns` (`core/types.py:73–74`, `ms * 1_000_000`). I checked all nine
call sites; none multiplies or divides by 1000 directly and none uses a raw
millisecond value as nanoseconds. `FeatureSnapshot.as_of` stamping is also
correct for the property the brief asked about: `engine.py:58` does
`self.last_input_ts = max(self.last_input_ts, event.exchange_ts)`, a monotone
maximum, so a snapshot can never be dated before an input it consumed. (The
converse is possible — an out-of-order event is absorbed without moving `as_of`
backwards, so the snapshot overstates its own freshness — but that is not
look-ahead.)

One timestamp defect, recorded under G-20: `binance.py:440` signs with
`int(time.time() * 1000)`, the process wall clock, rather than the adapter's
server-time-corrected clock.

---

## 3.4 The flatten path

### G-1 — Every realistic flatten trigger also trips a risk check that refuses the flatten

| | |
|---|---|
| **Severity** | **Critical** |
| **Location** | `session.py:418–456`, `l5_risk/service.py:123–235`, `l5_risk/killswitch.py:192–206` |
| **Confidence** | **High** |

**Claim.** `_flatten` submits every reducing order through
`RiskService.evaluate`. Only check 1 exempts a `reduce_only` order. Checks 3, 4,
6, 7 and 13 do not — and each of them is tripped by a condition that is a
*cause* of flattening. The flatten is therefore refused in most of the
circumstances it exists for, and because `_flatten` discards the
`ExecutionResult` this happens silently.

**Evidence.** `/tmp/probe/p10_flatten2.py` builds a real `TradingSession` with a
real position, engages the kill switch the way the system does, calls
`session._flatten(...)`, and counts what reaches the adapter:

```
  dead-man fires, everything else healthy, position 1% of equity
      orders placed: 1   rejections: none

  dead-man fires AND reconciliation is not clean
      orders placed: 0   rejections: {'3_reconciliation_clean': 1}

  dead-man fires because the FEED DIED (last event 120s ago)
      orders placed: 0   rejections: {'4_feed_fresh': 1}

  daily-loss limit breached (5% down, limit 3%) - the trigger IS the loss
      orders placed: 0   rejections: {'13_loss_state': 1}

  manual kill, position 5% of equity
      orders placed: 0   rejections: {'7_per_trade_risk': 1}

  manual kill, position 50% of equity
      orders placed: 0   rejections: {'6_single_order_notional': 1}

  dead-man + dirty reconciliation, flatten retried 6 times
      orders placed: 0   rejections: {'2_strategy_enabled': 1, '3_reconciliation_clean': 5}
      'flatten' now in disabled_strategies: True
```

Row by row, against `risk/limits.yaml`:

- **Check 7 (`per_trade_risk`, 0.02).** `ctx.stop_distance_frac` is built from
  `_stop_distances()` (`pipeline.py:509–521`), which iterates registered
  strategies. `"flatten"` is not one, so `stop` defaults to `dec(1)` at
  `service.py:172` and `risk_frac = notional / equity`. **Any position larger
  than 2% of equity fails.** `gross_exposure` permits 3×, so positions well above
  2% are the normal case.
- **Check 6 (`single_order_equity_frac`, 0.02).** Same threshold from the other
  direction, and it fires first on very large positions.
- **Check 13 (`daily_loss`, 0.03).** A daily-loss breach is one of the two
  triggers whose `RECOVERY` entry has `flatten=True` (`killswitch.py:88`). The
  breach that orders the flatten is the condition that refuses it.
- **Check 4 (`feed_staleness_s`, 30).** `_risk_context` reads the **real**
  `self._feed_last` (`pipeline.py:497`), not the synthetic event. A flatten
  triggered by a dead feed is refused because the feed is dead.
- **Check 3 (reconciliation).** Same — `_risk_context` reads the real
  `executor.reconciliation_clean` (`pipeline.py:498`).
- **Check 2, after five rejects.** `reject()` increments
  `st.consecutive_rejects[intent.strategy_id]` and, at
  `consecutive_rejects = 5`, adds the strategy to `st.disabled_strategies`
  (`service.py:108–111`). The pseudo-strategy `"flatten"` is not exempt, so a
  flatten that is refused five times **permanently disables the flatten path**.
  Nothing clears it.

**This contradicts an invariant the code states explicitly.**
`killswitch.check_deadman`'s docstring (`killswitch.py:193–199`):

> *The execution service acts on this **without asking**, because the service it
> would ask is the one that is not responding. It is the one place in the system
> where a component touches positions without risk approval, and it is safe
> precisely because its only possible action is to reduce.*

`session.py:454–456` asks. The documented design is right and is not what ships.

**On the synthetic `MarketEvent` (`session.py:451–454`), which the brief asked
me to assess.** Its effect is narrower than the brief supposes and cuts the
other way. `_risk_context` takes only `now` from the event
(`pipeline.py:496`); `feed_last_event`, `reconciliation_clean`, `mark_prices`
and `filters` all come from real pipeline state. So the fabricated event does
**not** let a stale feed through — it makes `now` the wall clock, against which
the real (stale) `_feed_last` is measured, which is what produces the
`4_feed_fresh` rejection above. The synthetic event is not the vulnerability;
the absence of a `reduce_only` exemption is.

**Impact.** This is the path the system relies on when everything else has
already failed. As shipped, it works in one case: the dead-man switch firing
while the feed is alive, reconciliation is clean, no loss limit is breached, and
the position is under 2% of equity. In the compound failures the brief asks
about — venue 5xx, an order in QUERY, dead-man firing — it terminates, and it
does not terminate flat.

---

### G-14 — `_flatten` discards every result, skips unmarked symbols, and rests a limit at mark

| | |
|---|---|
| **Severity** | **Moderate** (Critical in combination with G-1) |
| **Location** | `session.py:418–456` |
| **Confidence** | **High** |

Four defects in thirty lines, each of which turns a failed flatten into a silent
one.

**(a) The `ExecutionResult` is discarded.** `session.py:456` is
`await self.pipeline.executor.submit(intent, decision)` with no assignment.
`submit` returns `ExecutionResult(False, reason=...)` for a risk rejection, an
executor halt, a filter violation, insufficient balance, a rate limit, and an
unknown venue state. None of these raises. Every one of the G-1 rejections above
returns through this line and is thrown away. There is no alert, no counter, no
log, and no retry.

**(b) A missing mark silently skips the position.** `session.py:436–438`:

```python
price = self.pipeline._marks.get((venue, symbol))
if price is None:
    continue
```

A `continue` with no alert. The trigger conditions that produce a flatten — a
dead feed, a failed reconnect — are the conditions under which marks go missing.

**(c) `build_intent` failures silently skip the position.**
`session.py:446–447`, `except Exception: continue`. A dust position below
`min_notional` raises `FilterViolation` inside `FilterRounder.prepare` and is
skipped without record.

**(d) A reduce-only *limit at mark* does not guarantee flat.** The intent is
built with `order_type="limit", price=price` where `price` is the mark. Binance's
mark is an index-derived fair price, not a book price; a limit resting at it may
never fill. There is no timeout, no re-price, and no escalation to a marketable
order. Combined with `self.state = SessionState.HALTED` at `session.py:422` —
after which `on_event` early-returns (`session.py:238–239`) and the
`must_flatten` re-check at `session.py:306` is gated on `state == RUNNING` — **the
flatten runs exactly once and is never retried.**

**On F-6's blast radius, which the brief asked me to establish.** The audit rates
the swallowed cancel Moderate. Tracing it through: `reduce_only=True` means the
venue will not let the flatten order increase the position, so the direct harm is
bounded. But the *stale working order* is not reduce-only, and it can still fill.
Start at +10 with an uncancelled working buy for +20; the flatten places a
reduce-only sell 10; if the buy fills first the position is +30 and the sell
leaves +20 — **larger than it started**, on a halted session that has stopped
processing events. So the answer to the brief's question is yes. But F-6 is not
the binding constraint: per G-1, in most trigger conditions the reducing orders
are never placed at all, so the stale order is the only order working.

---

## 3.5 Risk service ordering

Covered by **G-7** above. Three further observations, none of which I could turn
into a finding:

- **No check's result is invalidated by a later check's side effects.** Only two
  checks have side effects: check 13 engages the kill switch, and `reject()`
  increments `consecutive_rejects`. Both occur on paths that return
  immediately. Check 11 sets `throttle`, which is read only by `_approve`.
- **The "reduce, never enlarge" invariant holds**, and is defended in two
  independent places (`service.py` and `executor.py:167–169`). I tried to
  construct a combination of reductions that enlarges an order and could not.
- **Checks 10 and 12 correctly exempt reducing trades**
  (`service.py:216`, `service.py:226`: `if after_notional > abs(current) * price`).
  The author clearly understood the principle. It is applied in checks 1, 10 and
  12, and omitted in 3, 4, 6, 7 and 13 — which is G-1.

---

### G-20 — Four smaller defects

| | |
|---|---|
| **Severity** | **Minor** |
| **Confidence** | **High** |

**(a) Zero-quantity depth walk raises `DivisionUndefined`.**
`costs.py:97–99` and `sim.py:127–128` share the same loop; with `quantity=0` the
first level takes zero, `filled >= quantity` is `0 >= 0`, and `cost / filled`
divides zero by zero:

```
   costs.slippage_cost(qty=0) -> InvalidOperation: [<class 'decimal.DivisionUndefined'>]
   SimBook.walk('buy', 0)     -> InvalidOperation: [<class 'decimal.DivisionUndefined'>]
```

Upstream filters reject zero quantities, so this needs a defect elsewhere to
reach — but `slippage_cost` is exported at `research/__init__.py:26` as a public
research helper with no such guard.

**(b) Clock drift produces a flood of QUERY orders rather than a halt.**
`binance.py:440` signs with `int(time.time() * 1000)` — the process wall clock,
not `server_time()` and not the session's drift-checked clock. Binance returns
`-1021` when the timestamp falls outside `recvWindow`; `_ERROR_MAP` maps `-1021`
to a bare `VenueError` (`binance.py:164`), and `executor.submit`'s handler
(`executor.py:203–207`) treats any unclassified `VenueError` as **unknown**, not
as failed. Verified:

```
   -1021 -> VenueError           (timestamp outside recvWindow)
   -1022 -> AuthFailed           (bad signature)
   -1007 -> UnknownState         (timeout, status unknown)
```

So a clock-drift incident sends every subsequent order to QUERY state instead of
tripping the `clock_drift_ms` halt. The conservative treatment of unclassified
errors is right in general; `-1021` is the case where the order provably never
reached the matching engine and the state is *not* unknown.

**(c) Funding is misattributed when two strategies hold the same instrument.**
`pipeline._position_owner` (`pipeline.py:552–557`) returns the **first**
strategy whose ledger contains the key, and `"unattributed"` when none does —
creating a phantom ledger via `Books.ledger()`. With two strategies on one
symbol, all funding lands on whichever is iterated first. `l4_portfolio/netting.py`
exists precisely because two strategies can hold the same instrument.

**(d) The report's headline trial count is not the one deflation uses.**
`ValidationReport.trial_count` is read once at `harness.py:219`, before any
check runs, while `_check_deflated_sharpe` re-reads
`self.registry.count(...)` at `harness.py:300` — after `_check_walk_forward`
has registered three more trials. `tradesys validate` prints the discrepancy on
its own:

```
  trial count  1   (from the registry, not from memory)
  ...
  [INCONCLUSIVE] deflated_sharpe   needs 30 trades; trial count would be 4
  ...
  Trials registered during validation: 32
```

The header says 1, the check used 4, and 32 were registered by the end. The
line's own parenthetical — "from the registry, not from memory" — is the claim
that fails.

---

## 1. Audit claims re-probed

| Claim | Location | Held? |
|---|---|---|
| "Same `Pipeline` object as live — **proven by `test_same_code_path`**" | `AUDIT.md:240` | **No.** The test compares two backtests (G-9). The underlying property is true — no mode branches exist below `Pipeline` — but this test does not establish it. |
| "No walk-forward runner; the harness computes the statistic but **the caller supplies the splits**" | `AUDIT.md:240` | **No.** The harness constructs its own contiguous splits at `harness.py:257–259`; no caller can supply any (G-19). The check also does no re-fitting, so it is not walk-forward. |
| "Impact model is square-root with a hardcoded **exponent** `y=1`" | `AUDIT.md:241` | **Partly.** `y` is a linear coefficient (`costs.py:117`); the exponent is hardcoded at `0.5` and is not exposed. Sweeping `y` flips `funding_dispersion`'s verdict between 1.5 and 2.0 (G-12). |
| "**Fees by tier**, slippage walked against real depth, adverse selection, impact, funding, borrow" | `AUDIT.md:242` | **No on fees by tier.** `tier_schedule` is never populated, `rates_for_volume` and `CostModel.round_trip` are never called, `volume_30d` is never supplied (G-13). Slippage *is* walked against real depth, but by `SimBook.walk`, not by the `slippage_cost` the claim points at — that one has no production caller. |
| "Trial registry **the harness refuses to run without**" | `AUDIT.md:244` | **Partly.** `Backtester.__init__` refuses (`backtest.py:94–99`). `ValidationHarness` neither refuses nor writes; its headline count is stale (G-20d). |
| "Deflated Sharpe, PBO/CSCV, block bootstrap, power, `INCONCLUSIVE` verdict" — listed as Present | `AUDIT.md:245` | **Present but not functional.** DSR's gate cannot be passed (G-2); PBO truncates its input (G-8); the block bootstrap uses a fixed length and under-samples the head (G-17). CSCV *is* genuinely combinatorial — that part of the claim holds. |
| "All 13 declared checks are implemented and ordered" | `AUDIT.md:246` | **True of the code, not of its execution.** Checks 9–13 are skipped whenever check 8 reduces (G-7). |
| `funding_carry` cost share **238%** | `AUDIT.md:403` | **Reproduces exactly, and is optimistic.** Priced across two venues from this file's own tables it is 429% (G-11). The verdict "does not clear" is right and more robustly right than stated. |
| F-6 "A failed cancel during a flatten is silent. **Moderate.**" | `AUDIT.md:427–431` | **Root cause understated.** The characterisation is accurate and the blast radius extends to a position *larger* than it started. But F-6 is the least of `_flatten`'s problems: per G-1 the reducing orders are usually never placed, and per G-14 three other silent-skip paths sit in the same function. |
| `funding_carry.round_trip_cost = 0.003` is baked in | `AUDIT.md:501–503` | **True, and incomplete.** It also disagrees by 50% with `viability.assess`'s 0.0020 for the same strategy (G-11c). |
| `PERIODS_PER_YEAR = 365` — "Daily annualisation" | `AUDIT.md:466` | **The constant is defensible; its inputs are not.** The equity curve is sampled per event at 45–247 events/day (G-10). |
| F-1 futures REST paths are spot paths | `AUDIT.md:279` | **Held, with a wider blast radius.** On futures, `fee_schedule()` hits a spot path *and* silently falls back to the spot VIP-0 rate (G-13). |

---

## 2. Verified correct

Examined closely and found sound. Listed so the owner does not pay to review
them again.

- **The deflated-Sharpe and expected-max-Sharpe formulae.** `validation.py:90–92`
  and `validation.py:120–124` match Bailey–López de Prado term for term,
  including the skew and kurtosis adjustment and the `sqrt(T-1)` scaling. The
  doctest `expected_max_sharpe(100, 1.0) == 2.531` reproduces by hand. The bug in
  G-2 is entirely in the units the harness supplies, not in the arithmetic. The
  "do not fix the sign" note at `validation.py:110–115` is correct.
- **CSCV is genuinely combinatorial.** `itertools.combinations(blocks, s//2)`
  enumerates all `C(s, s/2)` splits; the relative-rank test is the correct
  statistic. Only the input truncation is wrong (G-8).
- **`sharpe`, `max_drawdown`, `time_to_significance_years`, `maker_edge_bps`,
  `carry_breakeven_periods`.** All five reproduce their doctests by hand.
  `time_to_significance_years(1.5) == 1.71` and `maker_edge_bps(0.5, 1.5, 2) == -5.0`
  are both right, and the latter's sign convention for rebates is right.
- **`purged_kfold_splits` itself.** The purge and embargo windows are correctly
  placed (`validation.py:196–197`); purge on both sides plus embargo after is
  slightly conservative and defensible. The function is correct; nothing uses it
  (G-5).
- **Price and quantity rounding, end to end.** `floor_to` for quantity,
  `round_price_conservative` for price (buys down, sells up), `prepare` rounding
  before validating, `min_notional` re-checked after rounding,
  `executor.build_intent` as the single funnel. No defect found.
- **Millisecond-to-nanosecond conversions.** All nine call sites go through
  `ms_to_ns`. No factor-of-1000 error anywhere in `adapters/binance.py` or
  `live/binance_live.py`.
- **`FeatureSnapshot.as_of` monotonicity.** `engine.py:58` takes a running
  maximum, so a snapshot cannot be dated before an input it consumed.
- **`in_flight` counting.** The machine is registered before the `place()` await
  (`executor.py:186–188`), so `in_flight` counts from the decision rather than
  the ack, and `pipeline.py:248–249` subtracts it. The SPEC §8.5 rapid-fire
  failure mode is closed.
- **`executor.submit`'s approval gate.** `decision is None` is a reject; an
  unapproved decision is a reject; a mismatched `intent_id` is a reject; an
  enlarged quantity is refused independently of the risk service. An
  unclassified `VenueError` becoming UNKNOWN rather than FAILED is the right
  default (the `-1021` exception is G-20b).
- **No mode branches below `Pipeline`.** Grepped `pipeline.py`,
  `l5_risk/service.py` and `l6_execution/executor.py` for paper/live/mode/
  dry-run/shadow. Every hit is a comment. The claimed property holds even though
  the test does not establish it (G-9).
- **`RiskService`'s "reduce, never enlarge" invariant**, and the reduce-exemption
  logic in checks 10 and 12.
- **Fill matching in `SimAdapter`.** Taker fills walk real depth via
  `SimBook.walk`, which returns `None` rather than filling the remainder at the
  last level — the failure the module docstring warns about, correctly avoided.
  The queue model (join behind resting size, consume `volume_seen`, fill on a
  sweep) is a reasonable simplification and is documented as one.
- **`Books` equity and funding-sign arithmetic.** `accrue_funding`'s sign
  convention (`accounting.py:296–298`, a short receives when the rate is
  positive) is correct. `equity = cash + unrealised + accrued_funding -
  accrued_borrow` is defined once and pushed into `PortfolioState` by
  `apply_to`, so the books and risk cannot hold different views. The *timing* is
  wrong (G-3); the arithmetic is not.
- **The aggressor-side and liquidation-side mappings.**
  `binance_live.py:329` (`m` = buyer is maker ⟹ aggressor is the seller) and
  `binance_live.py:371–380` (Binance reports the side of the *closing* order) are
  both right, and both are the kind of inversion that survives review. The
  comments explaining them are accurate.
- **`SigningService` itself.** Given the real path, the allowlist refuses
  correctly, including the substring rule. `add_key` refuses a key carrying
  withdrawal permission. Keys are scoped per strategy and environment with no
  fallback. Every refusal is logged. The defect is the caller (G-4), not the
  service.
- **`HoldoutStore`.** Second reads raise, the refused attempt is itself logged,
  and the log lives in the registry rather than in the process.

---

## 3. Unverifiable without a live venue

Each with what would settle it.

1. **Whether Binance's `markPrice` stream cadence is what I assume (1–3s).**
   G-3's severity depends on it: at a true 8-hour cadence the pro-rata accrual
   would coincide with correct settlement. *Settles it:* capture one hour of
   `<symbol>@markPrice` from production and count messages, or read the
   timestamps in an existing archive. The `next_settlement` field is already
   captured, so an archive would answer this immediately — which is itself a
   reason the "no depth REST snapshots in the archive" gap matters more than it
   looks.
2. **The current Binance fee schedules.** `BINANCE_SPOT_TIERS` matches the spot
   schedule as I know it (VIP 0 0.1/0.1, VIP 1 0.09/0.1, VIP 4 0.042/0.06,
   VIP 9 0.012/0.024). `BINANCE_FUTURES_TIERS` I could not confirm: the entries
   labelled "VIP 3" and "VIP 6" pair a maker rate from one published tier with a
   taker rate from another as I recall the USDⓈ-M table, and the **volume
   thresholds in the futures labels (25m / 400m / 4bn) are the spot ladder's
   thresholds**, which cannot be right for both products since Binance publishes
   separate ladders. I am confident about the internal inconsistency and not
   about the specific correct values. *Settles it:* read
   `https://www.binance.com/en/fee/schedule` and
   `https://www.binance.com/en/fee/futureFee` and diff both tables and both
   volume ladders against `viability.py:158–174`. I did not fetch these; the
   brief forbids touching a venue and I did not want to interpret that
   narrowly.
3. **Whether the futures account endpoint returns `commissionRates`.** G-13's
   claim that the `0.001` fallback fires on *every* futures call rests on my
   recollection that USDⓈ-M exposes the rate via a separate endpoint.
   *Settles it:* one authenticated read of the futures account endpoint on
   testnet, or the Binance API docs for `/fapi/v2/account`.
4. **Whether a reduce-only limit at mark price fills in practice** (G-14d).
   *Settles it:* measure the distribution of mark minus best bid/ask from
   captured data; if the mark sits inside the spread the order rests, and the
   fill probability is then a queue question.
5. **The `_flatten`/`_market_loop` FSM race** (§3.3). Whether
   `machine.on_ack()` after `machine.on_not_found()` is tolerated is testable in
   isolation against `OrderMachine`; whether the interleaving actually occurs
   depends on venue ack latency relative to `tick_interval_s = 5.0`.
   *Settles it:* a unit test driving the FSM through that sequence, plus the
   measured ack-latency distribution.
6. **Whether rate-limit weight would trip before an IP ban** (F-7's severity).
   `X-MBX-USED-WEIGHT-1M` is parsed and surfaced but nothing backs off.
   *Settles it:* the measured weight consumption of one hour of normal operation
   against the documented budget.

---

## Closing note on what this review did not cover

I spent the effort in the brief's order and ran out of it before reaching
`l1_data/` (archive, book reconstruction, quality scoring), `l4_portfolio/`,
the strategies other than `funding_carry`, and `chaos.py`. The data layer is
where the audit already looked hardest and scored itself lowest, which by the
brief's own reasoning makes it the least likely place for an unexamined
assumption — but "I did not look" is not "I found it sound", and it is listed
here so the distinction survives.
