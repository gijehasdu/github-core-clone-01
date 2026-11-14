# github-core-clone-01 — state and improvement notes

## Submitted

- Submission id: `01a1dac8-75bc-721c-9473-97f49ae4617c`
- Claim code: `AF-9VWZ6-8RANP-E0YS5-YG73M`
- Repo: https://github.com/gijehasdu/github-core-clone-01 @ `8fac8989ff81a09a11c6167331efaa9b2ab9dbb6`
- Server intake: stage `submitted`, 16 checks, 0 fails. Local bundle check: 15 passed, 0 failed, 7 skipped.
- Practice scores (local, this machine):
  - Kit SDK runner: **972/1000** — feature 600, agent 200, perf 172 (push 39, clone 43, read 43, write 47).
  - Sealed env + sealed scorer (the real trial path): **965/1000** — feature 600, agent 200, perf 165, perf_p50_us 315621, 120/120 checks, working 1.
- Server-side practice grade was still pending at submission time; re-check with
  `makefun status --submission 01a1dac8-75bc-721c-9473-97f49ae4617c --json`.

## Functional gaps

None known: all 120 conformance checks pass locally (SDK runner and the sealed suite agree).
Real git CLI 2.43 round-trip also passes: clone/push create/update/delete, non-FF refusal,
shallow clone, deepen (1 -> 2 -> complete), annotated tags with peel.

## Performance headroom (the only scoring gap: perf 165-172 of 200)

Per-workload points vs the 50-point cap, weakest first:

1. **push 39/50** (p50 ~750 ms for 200 sequential 1 KiB pushes; T_ref 1640 ms so we are
   already 2.2x faster than the reference). Ideas: trim receive-pack per-request work —
   the closure/ancestor walk per push, pack index building, and JSON/log touches on the
   hot path; keep the parsed pack objects cached by oid across requests (already global,
   but the commit-graph walk recomputes). Profile before changing: most time may be
   process-per-request overhead in the suite harness itself.
2. **clone 43/50** (p50 ~130 ms). The 200-commit repo pack is regenerated per clone;
   cache the pack bytes keyed by (tip oid, depth, shallow set) — depth-1 clones of the
   same tip dominate this workload and would become a memory copy.
3. **read 43/50** (p50 ~960 ms for 2,000 sequential GETs on one connection, ~0.48 ms/req).
   Ideas: cheaper JSON serialization for the issue shape (hand-rolled serializer for the
   hot object types), reuse the request-id counter formatting, ensure no per-request
   object graph rebuild in `issueJson` (labels array is rebuilt per call).
4. **write 47/50** (p50 ~100 ms for 200 creations) — least headroom; leave alone.

Caution: the trial pod is 2 CPU / 1024 MB while this VM differs; local perf deltas may not
transfer 1:1. Any perf change must re-run BOTH the SDK runner and the sealed env + scorer
(harness in `~/workspace/.makefun/forge-test/`, `sealed-run.sh`) and stay at 120/120 before
resubmitting. The final entry is the most recent submission; the deadline is
2026-11-21T06:30:00Z and the quota is 5 submissions/day, 10 total (1 used).

## Wire-protocol pitfalls (do not regress)

- pkt-line payloads in fetch sections and report-status lines end with `\n`; the suite
  parser joins section payloads and splits on `\n`. Section headers are compared as
  `'packfile\n'`.
- Fetch v2 framing: sections before packfile end with DELIM (0001) after `ready` acks;
  when the request carries `done`, send NO acknowledgments section (real git aborts).
- Have-exclusion must be shallow-aware: a shallow-held commit excludes only itself + its
  tree, never its ancestry; `closure()` traverses through excluded commits without
  collecting them; emit `unshallow` only when the pack includes the boundary's parents.
- Pack parsing: `zlib.inflateSync` ignores trailing bytes but throws on truncation — find
  exact object ends by binary search for the smallest prefix whose output length equals
  the declared size.
- Duplicate-repo 422 body must contain the text "already exists" (the git client only
  tolerates 422 then).
- GraphQL global ids are base64url of `Kind:key`; introspection entries and payload
  sub-objects must carry the right `__typename` tags, with a guarded plain-object fallback.
- State timestamps use a logical clock (base 1735689600 + tick), never Date.now — the
  contender stage replays trials and compares state exports byte-for-byte, so determinism
  matters beyond the practice score.
