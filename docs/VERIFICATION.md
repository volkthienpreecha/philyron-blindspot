# Verification record — October 10, 2026

## Automated and local

Six tests pass and TypeScript checking passes. Tests cover real normalized MiniLM inference, coverage changes, negation, uncertainty, equipment/time gates, delayed records, missing archives, duplicate submissions, isolation and evidence-backed exports.

Local browser and HTTP walkthrough produced one verified finding and four interval labels. CSV evidence references and JSON model versions were checked. Refined screenshots were inspected at 1440×1000 and 390×844.

## Hosted preview

Connected preview: https://philyron-reporting-gaps-p5homa0vd.vercel.app
Implementation revision: f512bcb.

- Health reports supabase-postgres and the pinned MiniLM model.
- Browser: North Star bearing → added captain note → zero related reports becomes one → partly reported, original coverage preserved → synthetic inspection → confirmed review → refresh → saved review remains → export drawer shows one finding and four labels.
- Real Vercel inference returns 384 dimensions and norm approximately 1; explicit tracing includes native ONNX Runtime and CommonJS package metadata.
- Supabase unauthorized RPC returned 403; concurrent workspace writes retained both receipts and revision 2.
- Private tables have RLS and no direct anonymous access. Advisors' no-policy notices intentionally reflect denied direct access; public RPC warnings reflect deliberately callable functions guarded by an independent server secret and fixed search_path. The unrelated default event-trigger helper has execute privileges revoked. See https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable.

No accounts, user tables, laptop backend, proprietary integration or automatic retraining. Data and inspections are explicitly synthetic.

## Production

Production revision and repeated browser/HTTP verification will be recorded after deployment. Secrets remain server-only and ignored locally.

Verified production release: https://philyron-reporting-gaps.vercel.app
Functional commit: 621cda95ff8d66e8d4ba8dad06a647efae50229a (merged PR #1).
Deployment: dpl_GeUjhScGQBtSEAnombeVyBTgDLE6.

Repeated production browser flow: note ingestion → partly reported → synthetic inspection → confirmed review → refresh → persisted review → four labels in export drawer. Browser console: zero errors/warnings. Public HTTP checks independently verified Supabase storage, no coverage from negation or unrelated text, real inference changing coverage, duplicate note idempotency, HTTP 422 for confirmation without evidence, review persistence, CSV evidence references, four JSON labels and isolation of a second visitor. Missing-archive histories remain insufficient records. Desktop and mobile layouts were inspected; the note dialog closes with Escape.

The documentation commit recording this release contains no application changes; the functional revision above is the tested implementation.

## Captain-report clarity update, October 10

Seven tests pass, including semantic source retrieval, paraphrases and workspace isolation. Hosted preview dpl_9HYadocR4gmPyNdLx1xEiBUFsW6V verifies real search and the before/after shortcut: North Star remains selected, coverage changes from zero to one of four intervals, and a query for bearing shaking and running hot retrieves nine ranked sources with actual MiniLM scores. An independent visitor sees only the 63 seeded records. Desktop and mobile source layouts were inspected and the hosted browser reports zero console errors.

The final small storage change uses one workspace snapshot for source text and vectors, preventing mismatched concurrent retrieval. No simulated search result or report-coverage animation substitutes for server computation.

Captain-report clarity production release: f6158e14878c5c8e0d2cbb1c31da9204beb24406, deployment dpl_C7y3A2QqL43mg8kpBGQAs719DGfV, https://philyron-reporting-gaps.vercel.app.

Repeated on the public production URL: the matching-report shortcut keeps North Star selected and changes coverage from 0/4 to 1/4; semantic search returns nine ranked original reports; the added note survives refresh. Independently repeated HTTP checks confirm negation does not create coverage, duplicate submissions are idempotent, confirmation without evidence returns 422, reviews persist, exports contain four labels with evidence references, and a separate visitor sees none of the added records. Production browser console has zero errors/warnings. The final watch-log dataset preserves all sensor intervals and uses vessel-specific phrasing and observation-aligned watch labels.

## Reporting-goal audit, October 10

Reproduced on production before fixing:

- A healthy bearing clause followed by a vibrating/hot pump clause incorrectly closed the bearing reporting gap (cosine 0.81). Equipment references now constrain symptom clauses before embedding.
- A question qualified by "Cannot tell yet" incorrectly counted as an affirmative issue. Unresolved observations now stay uncertain.
- "Runs hotter ... and squeals" was classified as routine. Those everyday symptom forms now reach real semantic matching; negated versions remain excluded.
- Failed report loading incorrectly displayed a successful empty-search state. It now displays unavailable records and an explicit retry.
- A delayed search overwrote the user's reset to all logs. Reset now aborts and invalidates pending retrieval.
- Fully covered patterns still carried an investigation-candidate label; unavailable archives displayed a coverage fraction. Both states now have distinct, accurate explanations.
- Captain reports required an unrelated sensor-detail request. Report browsing now loads independently of sensor-detail availability.
- Running an inspection erased the engineer's classification and supporting note. Inspection refresh now preserves that review draft.

Eleven automated tests and TypeScript checks pass. Browser regressions were first observed failing, then repeated successfully against localhost:3002. The full browser/API flow checks ingestion, source search, complaint groups, equipment and intent gates, delayed reporting, idempotency, future-input rejection, unknown archives, evidence-required review, JSON/CSV exports, refresh persistence, isolated visitors, Escape dismissal, and responsive layouts at 1440×1000 and 390×844. Local browser console has no application errors or warnings. Temporary browser scripts and screenshots are outside the repository.

The intent gate is a conservative English rule set, not a general language-understanding model. Explicit multi-equipment clauses and unresolved wording require clarification. Reporting coverage still uses equipment identity, observation time, affirmative symptoms and calibrated embedding similarity; synthetic inspection remains separate from matching. Arbitrary real fleet notes and operational thresholds require domain validation before integration.

Hosted audit preview: functional commit dcc1dc1, deployment dpl_Hw7PXbtMp7g28Whfi2Kmy8f6aq7g, https://philyron-reporting-gaps-nkg0w4zkz.vercel.app. The complete flow and all four browser regression scripts passed against this deployment, including real Vercel embeddings and Supabase writes. Desktop/mobile screenshots were inspected; application console errors and warnings: zero. A fresh visitor receives 63 seeded notes and no labels; the tested session retains its additions and exports four inspection-backed interval labels. Fault-injection tests separately verified HTTP 503 catalog recovery, delayed-search reset, unavailable sensor-detail independence, and preserved inspection drafts.

Production audit release: d7677bdc811f47d0a62485b777bd5979534aae81 (merged PR #3), deployment dpl_AMVcoWfVNqVNiKtdh1GogiPCW8GM, https://philyron-reporting-gaps.vercel.app. The same complete browser/API flow and all five targeted browser regressions pass on the public production URL. The fifth regression forces a failed ingestion: no success message or coverage change appears, retry reuses the idempotency key, and exactly one note is stored. The normal production flow has zero console errors/warnings, no framework overlay, successful source search and groups, four evidence-backed exported interval labels, and isolated persistent workspaces. Production screenshots were inspected at 1440×1000 and 390×844; no horizontal page overflow occurred. Tests use Chrome/Chromium; Safari and arbitrary real fleet prose were not validated. The documentation commit recording these results changes no application code.

## Partial coverage and simpler labels

Dataset v3 adds one watch-log observation on January 3 at 20:00 UTC, received at 21:00, before the first detector interval on January 4 at 04:00. Actual pinned MiniLM embedding and unchanged equipment/time/semantic gates cover two of North Star's four intervals; two remain uncovered. There are now 64 seeded records. Dataset metadata features this example without changing fleet ranking. Browser testing verifies a relevant added note changes coverage from 2/4 to 3/4 and semantic search retrieves the original watch-log wording. Sensor chart shading uses the same shared coverage function as server assessment, with explicit reported/unreported legends; incomplete archives stay unknown.

Thirteen tests and TypeScript checking pass. Local browser checks at 1440×1000 and 390×844 verify the seeded story, interval colors, original source text, real added-note inference and semantic retrieval. The new review flow is inspection → explicit confirmation → automatically opened CSV/JSON downloads. Browser checks confirm four labels retain matching category, evidence and the engineer's note, CSV downloads contain model metadata, labels persist on refresh, normal inspection results cannot enable confirmation, and held-out histories stay read-only. Normal-flow console errors/warnings: zero. A mobile overflow caused by an absolutely positioned screen-reader table heading was fixed by containing it within the scrollable table wrapper.

Verified hosted preview: 80d1b633d857483ba4aa529d94088ae0c6a79a2c, deployment dpl_HBEB8RHZvZc5adhTyBMvWMsjM9b3. Verified production: 69dd254ef11fc9015f6251fc014ab3eab76216a6 (merged PR #4), deployment dpl_5FfJP2H7YvcwqRT7FgCRydptGAic, https://philyron-reporting-gaps.vercel.app. Both deployments pass the partial-story and two-step-label browser scripts plus catalog recovery, stale-search reset and report/sensor-detail independence regressions. Production page URL/title are correct; meaningful content renders without an overlay or application console errors/warnings. Fresh sessions show one seeded related report and 2/4 coverage, a new relevant note changes coverage to 3/4, and explicit inspection confirmation opens four labels with matching evidence/category and review text. Actual CSV downloading and refresh persistence pass; normal inspection and held-out protections pass. Desktop/mobile screenshots were inspected. This final documentation commit changes no application behavior.
