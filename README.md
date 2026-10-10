# Reporting gaps — Philyron interview demo

An independent synthetic demo: captain notes become searchable embeddings, related equipment complaints are grouped, and sensor intervals with missing reporting become investigation candidates. Missing reporting is not a confirmed failure.

## Run locally

Use Node 22 or newer.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://localhost:3000. Without cloud configuration, SQLite saves anonymous workspaces under `.local/`. No login or user table is required.

## Interview walkthrough

1. Open Reporting gaps and investigate an equipment pattern.
2. Compare sensor intervals with source notes and similar complaints from other vessels.
3. Add a relevant note for the same equipment and observation date; real MiniLM inference updates current coverage.
4. Expand matching evidence to see the original assessment, later reporting, source text, and similarity scores.
5. Run a labeled synthetic inspection on a training case, then save an engineer decision.
6. Export verified interval labels as JSON or CSV; confirmation without supporting evidence is rejected.

## Stack and deployment

Next.js, TypeScript, React, Transformers.js, and a pinned quantized MiniLM model run on Vercel. Supabase Postgres stores anonymous workspace notes, vectors, inspections, review provenance, and idempotency receipts. Signed cookies isolate visitors; there are no accounts. Python is not required by the hosted application.

Apply `supabase/schema.sql` to a dedicated project. Private tables have RLS enabled and no direct anonymous access. Two public RPC functions require an independent server secret and atomic version checks. Insert a SHA-256 hash of SUPABASE_BACKEND_KEY into philyron_private.settings under backend_key_hash.

Configure the server-only variables in `.env.example`: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_BACKEND_KEY, WORKSPACE_SECRET. Keep secrets out of Git and browser bundles. Verify durable writes before sharing a deployment; a successful build alone does not prove inference or persistence works.

## Computation and safeguards

- Consecutive abnormal samples form intervals; counts and durations are computed from fixtures.
- Notes and patterns use the same normalized 384-dimensional MiniLM embeddings, pinned revision 751bff37182d3f1213fa05d7196b954e230abad9, q8 quantization, mean pooling.
- Same equipment and a ±24 hour interval window are required before semantic matching; other vessels provide context only.
- Negated symptoms, routine service, uncertain wording, and incompatible equipment references do not establish affirmative coverage.
- Missing archives produce Insufficient records. Observation and ingestion dates are separate; later reporting cannot rewrite the original assessment.
- The synthetic development threshold is 0.56; complaint groups use 0.70 complete-link similarity within equipment categories. These tiny examples are not field validation.
- Sealed truth is used only by explicit simulated inspection, never matching or ranking. Held-out cases cannot become training labels.
- Submissions are validated, bounded, and idempotent; notes render as text. Errors never claim successful processing.

## Verification

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run prepare:data
```

Dataset preparation requires Python dependencies in requirements.txt; serving the web app does not. See [integration boundaries](docs/INTEGRATION.md) and [verification record](docs/VERIFICATION.md).

## Separate Python research prototype

The existing blindspot/ code retains the synthetic generator, FastAPI experiment, and model comparison research. Run it with `uvicorn blindspot.api:app --reload` after installing requirements.txt. Its optional lexical fallback and synchronous retraining are research features; neither is used by the web app. The web demo ends at verified-label export and makes no model-improvement claim.

Live interview demo: https://philyron-reporting-gaps.vercel.app

## Captain-report clarity update

The overview now shows a source captain note, a similar complaint on another vessel and computed sensor-interval coverage together. Captain reports has its own readable watch log and semantic search using the pinned server-side MiniLM model. Extracted symptoms, source timestamps, query similarity and links to sensor evidence make the matching inspectable. Routine/negated reports remain distinct from affirmative issue coverage. The matching-report shortcut performs real inference and storage, preserving the selected equipment while coverage changes.

The redundant Investigations navigation, fake avatar, oversized counters and repeated pipeline footer were removed. Case details and evidence-backed export remain accessible. Mock logs have varied symptom phrasing and watch context, explicitly labeled synthetic; PDF import, OCR and handwritten-document recognition are not implemented.
