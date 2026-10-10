# Verification record

## Local checks

Six tests pass, covering real inference, normalized vectors, coverage changes, negation, uncertainty, equipment gates, delayed records, archives, idempotency, isolation, inspection/category validation and export provenance. TypeScript checking passes.

Local production browser walkthrough: overview → North Star bearing → relevant note → partial coverage → synthetic inspection → confirmed review → one verified finding with four interval labels. A separate HTTP walkthrough checked the downloaded CSV contains the evidence ID and the JSON contains the pinned model version; a second visitor still saw zero related reports. Playwright CLI was used after computer-use runtime initialization failed.

Refined overview and investigation screenshots were checked at 1440×1000 and 390×844. Official SVG branding, concise counts, source evidence disclosure and responsive review layout were inspected.

## Hosted checks

The first Vercel preview built but inference failed because ONNX Runtime was omitted from tracing. Explicit tracing of the runtime, its CommonJS package metadata and Linux native bindings fixed the failure.

Hosted retest on preview `dpl_AmDTSXG6nE7jNFZCAvtTA5ZAth7i`: GET `/api/embedding-check` returned HTTP 200, 384 dimensions and norm 1.0000000309832793 with the pinned model version. This establishes actual Vercel inference, not just compilation. This diagnostic preview is protected and is not the interview handoff URL.

Supabase setup remains pending: the authorized generic project cannot be restored after over 400 paused days. A new project is required. No durable cloud flow or production URL is verified yet.

Record the committed production revision, URL, inference response, persistence/isolation checks, mobile screenshots and downloaded export results before declaring completion.
