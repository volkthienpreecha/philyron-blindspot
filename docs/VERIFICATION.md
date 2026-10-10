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
