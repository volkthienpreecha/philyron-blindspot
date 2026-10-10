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
