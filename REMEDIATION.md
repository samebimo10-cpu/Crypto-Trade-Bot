# Remediation brief — `tradesys`

Work through `FINDINGS-2.md` (20 findings) and the seven from `AUDIT.md`.

**Run each work package in its own fresh session.** WP1 and WP2 are
independent. WP3 must come last, and the ordering *within* WP3 is the point of
this document.

---

## 0. Two rules that apply to every fix

**Write the failing test first.** For each finding: a test that fails against
current `main`, then the fix, then the test passes. If the test cannot be made
to fail first, you have not understood the bug.

**Every bug here survived 787 passing tests.** The review documents why, one by
one: assertions that are vacuous (`"trials" in detail`, unconditionally true),
fakes that never write to the registry, synthetic data where `fraction` is
always exactly 1.0, an adapter only ever exercised against a transport that
echoes whatever URL it is handed. So for each fix, the test must exercise the
*real* collaborator, not a fake shaped to agree with the code. A fix whose test
uses the same fake that hid the bug has not been verified.

**Note on finding IDs.** `FINDINGS-2.md` uses `G-19` twice — once for
`walk_forward` in §3.1 and once for the dead-man switch in the summary table.
Renumber the second to `G-21` before starting, so the tracker doesn't collide.

---

## WP1 — Safety and security

No research judgment required. Nothing else should be touched until these are
done, because they are the findings that cause loss rather than
mismeasurement.

### G-1 — the flatten path is refused by the checks its own triggers set off

The fix is not to loosen the risk checks. It is to honour the design the code
already documents at `killswitch.py:193–199`: the dead-man path acts without
asking, because the service it would ask is the one that is not responding.

Implement a `reduce_only` exemption that covers every check which can be
tripped by a flatten trigger — 3 (reconciliation), 4 (feed freshness),
6 (single-order notional), 7 (per-trade risk), 13 (loss state) — while keeping
the checks that still protect a reducing order. Justify each check you exempt
and each you keep, in a comment.

Separately: exempt the `flatten` pseudo-strategy from
`consecutive_rejects` disabling at `service.py:108–111`. A flatten that has
been refused five times must not be permanently disabled — that is the exact
opposite of the correct failure direction.

Required tests: every row of the review's `p10_flatten2.py` probe output, as
test cases. All must place orders.

### G-4 — the signer's allowlist inspects a constant

`build_signed_query(params, signer)` has no path parameter, so `_call` signs
every request against the path bound at construction in `wiring.py:142`. The
probe got a withdrawal request signed and logged as `/api/v3/order`.

Thread the real path through to the signer on every signed call. The allowlist
must see what is actually being signed, and the audit row must record it.

Required test: drive the *real* `BinanceAdapter` against a spy transport,
attempt a `/sapi/v1/capital/withdraw/apply` call, assert it is refused and that
the audit row carries the real path.

### G-7 — check 8's reduce-and-return skips checks 9 to 13

A reduction should continue through the remaining checks, not approve early.
Verify the reduce-exemption logic in checks 10 and 12 still behaves once 8 no
longer short-circuits.

### G-14, G-21, G-20b, and F-4, F-6, F-7 from the first audit

`_flatten` discarding every `ExecutionResult`, skipping symbols with no mark,
and resting a limit at mark; the dead-man switch being fed by the loop it
polices; `BinanceAdapter.positions()` returning `[]` on futures; swallowed
cancel failures; rate-limit weight parsed but never enforced.

F-4 and F-7 in combination are the live-capital blocker: an IP ban while
holding a position you believe is flat.

**WP1 exit:** every test above passes, and a chaos run exercises flatten under
compound failure — venue 5xx, an order in QUERY, dead-man firing — and
terminates *flat*.

---

## WP2 — Cost model truth

Nothing the system concludes about profitability is trustworthy until this is
done.

### G-3 — funding settles every mark tick at the predicted rate

Three errors compound: revenue paid pro rata that Binance never pays, the
predicted rate integrated instead of the settled rate, and a full interval
credited for a one-second hold.

`Funding.next_settlement` is populated by every producer and read by nothing.
Use it. Settle at the boundary, at the settled rate, and pay nothing to a
position that was not open across one.

Do not hardcode `interval_hours=8` — Binance runs some perpetuals on 4h and
shortens the interval dynamically when funding hits the cap. Derive it.

Required test: the review's `p8_funding.py` cases. A position opened one hour
after a settlement and closed three hours later must be credited zero.

### Fee schedule — delete the tables, query the venue

Do not repair `BINANCE_SPOT_TIERS` and `BINANCE_FUTURES_TIERS`. Remove them.

The futures entries are confirmed wrong: futures VIP thresholds are roughly
15× the spot ladder (VIP 1 is $1m spot or $15m futures; VIP 2 is $5m spot or
$75m futures), not the spot thresholds the labels carry. USD-M rates run
0.0200% maker / 0.0500% taker at VIP 0 down to 0.0000% / 0.0170% at VIP 9. The
BNB discount is 25% on spot but 10% on futures, and a tier is reached by
meeting *either* the volume or the BNB-balance requirement — a pure-volume
function cannot express that. Published sources also disagree on spot VIP 9
(0.011/0.023 versus 0.012/0.024), which is the argument against hardcoding in
miniature.

Query instead, cache per symbol, refresh daily:

- Spot: `GET /api/v3/account/commission` — returns maker and taker per symbol
  plus the BNB discount rate directly
- Futures: `GET /fapi/v1/commissionRate` — per symbol, weight 20. There is no
  `commissionRates` field on the futures account endpoint, which is why the
  `0.001` fallback would fire on every futures call

**Fail closed.** If the query fails, refuse to price the strategy. Never
substitute a guess. Reference implementation: NautilusTrader queries
`/fapi/v1/commissionRate` per symbol in parallel at instrument load.

This single change resolves G-13, the two disagreeing cost numbers in G-11, and
`funding_carry`'s hardcoded `round_trip_cost = 0.003`.

### G-11 — one fee tier applied to two-venue trades

A cross-venue trade prices each leg on its own venue's schedule. Fix alongside
the change above.

### G-12 — impact sensitivity

`funding_dispersion` flips PASS to FAIL between y=1.5 and y=2.0. Do not pick a
value. Make `assess` report the verdict across a range of y, and treat a
verdict that flips inside a defensible range as **no verdict**. That is a
reporting change, not a calibration — the exponent cannot be calibrated until
Phase 3 fill data exists.

### `funding_carry` at 238% — now 429% across two venues

It does not clear its own gate by a factor of four. Retire it or rework it. Do
not leave it as the only strategy reachable by `live/wiring.py` (F-3).

**WP2 exit:** every cost number in the system traces to a venue query or a
documented assumption with a sensitivity range. No cost constant appears in two
places.

---

## WP3 — The validation harness

**Order within this package is the whole point.**

Right now every control designed to reject is inert — PBO truncates and reports
0.000 where the truth is 0.549, the look-ahead auditor runs zero checks and
passes a blatant future-reader, `purged_cv` is a tautology, `monte_carlo`
cannot fail. Meanwhile DSR rejects everything unconditionally.

DSR is currently the only thing standing between a broken harness and a green
light. **Fix it last.** If you repair the units first, you open the gate while
every control behind it is still switched off.

### Stage 1 — repair the inert controls

- **G-6:** `audit_registry` executes zero checks — all 17 features declare
  `lag=0` and it never calls `assert_causal`. Make it run. A blatant
  future-reader must fail.
- **G-16:** `_perturb` returning `None` silently passes the lag check, and
  clipping features evade it.
- **G-8:** PBO silently truncates to the first 16 blocks. Either handle the
  full matrix or refuse loudly — never silently.
- **G-5:** `purged_cv` is a tautology, and nothing in the system uses purged
  splits. `purged_kfold_splits` itself is correct; wire it in.
- **G-15:** `monte_carlo` cannot fail.
- **G-17:** fixed block length; the head of the series is sampled 10× too
  rarely. Choose block length from measured autocorrelation.
- **G-18:** every PBO and walk-forward slice is backtested from a cold start.
- **G-19 (`walk_forward`):** does not walk forward.

**Stage 1 exit — the acceptance test for this whole package:** construct a
strategy that is deliberately overfitted and a feature that deliberately reads
the future. Both must be *rejected* by the repaired controls, with DSR still
broken. If the controls cannot catch a bug you planted yourself, they will not
catch one you didn't.

### Stage 2 — then, and only then, the DSR units

`deflated_sharpe` and `expected_max_sharpe` are correct term for term against
Bailey–López de Prado. The bug is entirely in what the harness feeds them: a
per-observation Sharpe against a null built from Sharpes stored annualised at
365, inflating `SR0` by √365.

**The review flags the danger and it is real.** The two ways to reconcile the
units — annualise the observed Sharpe, or store per-period Sharpes in the
registry — differ by a `sqrt(n-1)` factor. Getting it wrong in the lenient
direction converts an unpassable gate into a rubber stamp, which is a worse
state than today.

So: derive the correction from the paper rather than tuning until something
passes. Write down which unit convention you chose and why, before changing
code. Then validate the repaired gate against known inputs — a strategy that
should pass, and one that should not.

Also fix the `_variance_of_trial_sharpes` fallback of `1.0` below three trials,
and the vacuous assertion at `test_harness.py:180–189`. No test anywhere
currently asserts `report.passes is True`; add one.

### Stage 3 — measurement plumbing

- **G-10:** per-event equity points treated as daily returns by Sharpe and by
  expectancy, at 45–247 events per day. `PERIODS_PER_YEAR = 365` is defensible;
  its inputs are not. Resample to daily.
- **G-9:** `test_same_code_path` compares a backtest to a backtest. The
  property holds — no mode branches exist below `Pipeline` — but the test does
  not establish it. Make it compare a backtest to a sim run.

**WP3 exit:** the planted overfitted strategy and the planted future-reading
feature are both rejected, and a strategy known to be sound passes.

---

## WP4 — Second review, unreviewed scope

The reviewer ran out of effort before `l1_data/` (archive, book reconstruction,
quality scoring), `l4_portfolio/`, the four strategies other than
`funding_carry`, and `chaos.py`. It says so plainly rather than implying
coverage.

Run a second independent review over that scope, with `INDEPENDENT-REVIEW.md`
retargeted. Do it after WP1–WP3, so the reviewer reads repaired code.

Also add, before the three-month capture begins: **depth REST snapshots in the
archive.** Without them the archive cannot rebuild a book from its true
starting state, and it is not retrofittable — capture without it and the data
is permanently partial. The review notes a second reason: an archive containing
`next_settlement` timestamps would immediately settle the open question of the
real `markPrice` cadence, which G-3's severity depends on.

---

## Only then

Run all five strategies through the repaired harness and publish the verdicts.
That is the Phase 1 gate in `SPEC.md` §15. Until it is passed with controls
that work, there is nothing to deploy and nothing to decide.
