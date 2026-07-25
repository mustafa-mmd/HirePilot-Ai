# HirePilot AI architecture and implementation plan

## Architecture

HirePilot AI starts as a modular monolith. App Router pages and route handlers are transport layers; feature logic lives under `src/modules`. MongoDB access is lazy and server-only. Organization-owned records require `organizationId`, and protected services query with both the resource identity and tenant identity. Auth.js proves user identity, while the authorization module independently verifies the HTTP-only active-organization cookie, active membership, role, and permission.

The tenant root (`Organization`) does not contain its own `organizationId`; every child resource does. Route proxy redirects are navigation convenience only and are never the sole authorization boundary.

## Phases

- [x] Phase 1 — foundation, MongoDB conventions, authentication, organizations, membership roles, protected dashboard, authorization helpers
- [x] Phase 2 — jobs, candidates, applications, public job pages, CV upload, application pipeline, confirmation email
- [x] Phase 3 — CV extraction, structured profile, requirement extraction, evidence-based AI matching, recruiter CV report
- [x] Phase 4 — question bank, assessment templates, scoring, timers, invitations, candidate instructions
- [x] Phase 5 — OTP, system check, timed attempt UI, autosave, server expiry, integrity event collection, recovery
- [x] Phase 6 — consented media capture, Cloudinary upload, transcription, Monaco, isolated Judge0 execution
- [x] Phase 7 — rubric-based structured evaluations, reports, confidence, human review, overrides, AI usage cost
- [x] Phase 8 — plans and limits, team invitations, analytics, branding, platform administration, Sentry production monitoring

## Phase 1 file map

- `src/auth.ts`, `src/modules/auth`, `src/app/api/auth` — identity, registration, password hashing, optional Google OAuth
- `src/lib/database.ts`, `src/models` — lazy MongoDB connection, schema conventions, indexes
- `src/modules/authorization` — active tenant, membership, roles, permission policy
- `src/modules/organizations`, `src/app/api/organizations` — transactional organization creation and tenant selection
- `src/app/onboarding`, `src/app/dashboard` — onboarding and protected product shell
- `src/proxy.ts`, `next.config.ts` — navigation guard and defense-in-depth headers

## Phase 1 environment variables

- Required locally: `MONGODB_URI`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
- Optional authentication: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- Required in production for auth rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Reserved for later phases: Gemini, Cloudinary, Resend, Judge0, and Sentry variables listed in `.env.example`

## Phase 2 implementation

- `src/models/{job,candidate,application,notification}.model.ts` — tenant-owned collections and compound indexes
- `src/modules/jobs` and `src/app/api/jobs` — tenant-scoped CRUD, publishing, public discovery
- `src/modules/applications` — duplicate-safe application transaction and server-validated pipeline stages
- `src/lib/cloudinary.ts` — signed upload requests, asset ownership/size/type verification, magic-byte checks, cleanup
- `src/modules/notifications`, `src/emails` — lazy Resend delivery, idempotency, escaped transactional email
- `src/app/jobs`, `src/app/apply` — public career and application routes
- `src/app/dashboard/jobs`, `src/app/dashboard/candidates` — recruiter job management, candidate table, Kanban pipeline

Phase 2 uses `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM`. Upstash remains required in production for application/upload rate limiting.

## Phase 3 implementation

- `src/modules/ai/cv-extraction.ts` — trusted Cloudinary fetch plus bounded PDF, DOC, and DOCX text extraction
- `src/modules/ai/{client,service,scoring}.ts` — lazy Gemini client, Zod-validated structured outputs, protected-characteristic exclusions, exact-quote verification, and deterministic weighted scoring
- `src/models/{evaluation,ai-usage}.model.ts` — tenant-scoped report, human-review state, model/prompt metadata, tokens, and estimated cost
- `src/modules/ai/analysis-service.ts` — stale-lock-safe processing, cached job requirements, transactional persistence, and audit events
- `src/app/api/applications/[applicationId]/{analyze,review}` — permission-checked, same-origin recruiter mutations with AI rate limiting
- `src/app/dashboard/applications/[applicationId]` — score, confidence, rubric evidence, structured profile, follow-up questions, usage trace, rerun, and human review UI
- `src/modules/jobs` — configurable skills/experience/education/role-fit weights that must total 100; requirement caches invalidate when relevant job content changes

Phase 3 requires `GEMINI_API_KEY` and defaults to the stable `gemini-2.5-flash` model through the Gemini Generate Content API; `GEMINI_MODEL` can override it. Cost estimation uses the model's standard text input, audio input, cached-input, output, and thinking-token rates captured on 2026-07-18. Upstash is required in production for per-user AI analysis rate limiting.

## Phase 4 implementation

- `src/models/{question,assessment-template,assessment-invitation}.model.ts` — tenant-owned authoring and invitation collections with compound indexes and status enums
- `src/modules/assessments/question-service.ts` — reusable question CRUD, conditional answer validation, published-template immutability, and audit events
- `src/modules/assessments/template-service.ts` — template scoring/timer validation, equal-score randomized pools, draft publishing, archiving, and deletion rules
- `src/modules/assessments/invitation-service.ts` — 256-bit capability tokens, SHA-256-only persistence, candidate/job ownership checks, reissue rules, reminder delivery, and invitation status tracking
- `src/app/dashboard/assessments` — assessment library, question bank, template builder, and invitation manager
- `src/app/assessment/[token]` — token-protected candidate instructions with duration, monitoring, deadlines, and readiness guidance; it does not expose answer keys
- `src/emails/assessment-invitation.ts` and `src/modules/notifications/service.ts` — escaped invitation/reminder emails and idempotent Resend delivery

Phase 4 uses the existing `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL` settings. Reminder messages intentionally reference the original secure email because invitation tokens are hashed and cannot be recovered from the database.

## Phase 5 implementation

- `src/models/{assessment-attempt,answer,integrity-event}.model.ts` keeps attempt state, response payloads, and append-only integrity signals in bounded tenant-owned collections.
- `src/modules/attempts` implements HMAC-protected six-digit OTPs, maximum verification attempts, consent/system checks, randomized question snapshots, server-owned deadlines, required-answer validation, idempotent submission, autosave, refresh recovery, and multiple-session blocking.
- `src/app/assessment/[token]/{verify,setup,attempt}` provides the candidate flow without exposing answer keys or hidden tests.
- Candidate APIs validate the invitation capability, verified candidate email, browser session, current question, deadline, and organization ownership on every mutation.

Phase 5 uses `AUTH_SECRET`, Resend, and production Upstash rate limiting. MongoDB server timestamps are authoritative; browser countdowns are display-only.

## Phase 6 implementation

- `src/modules/media` and `src/lib/cloudinary.ts` issue scoped signed uploads, verify Cloudinary ownership/type/size/duration, collect identity/snapshot/proctor evidence under consent, record optional screen capture, and transcribe audio/video responses.
- `src/modules/coding` uses Monaco in the browser and Judge0 over HTTP for run/submit operations. Hidden test inputs and outputs never leave the server.
- Coding configuration supports allowed languages, starter code, examples, hidden tests, runtime limits, and memory limits.
- The Content Security and Permissions policies allow only same-origin camera/microphone/display capture and trusted Cloudinary/Sentry endpoints.

Phase 6 requires the Cloudinary variables, `GEMINI_API_KEY`, `JUDGE0_API_URL`, and optionally `JUDGE0_API_KEY`. Candidate code is never passed to `eval`, `child_process`, or the main application runtime.

## Phase 7 implementation

- `src/modules/reports/evaluation-service.ts` evaluates only job-related answer evidence against configured rubrics using Zod Structured Outputs and literal-source quote verification.
- `src/app/dashboard/applications/[applicationId]/report` combines candidate/CV data, assessment and section scores, written/media/coding responses, transcripts, AI evaluations, integrity evidence, recruiter notes, and the final human decision.
- Score overrides require a written explanation, recalculate totals, and write an audit event. Integrity evidence never triggers an automated outcome.
- `AIUsage` records model, prompt version, tokens, estimated cost, operation, application, attempt, answer, and evaluation references.

Phase 7 requires `GEMINI_API_KEY`; production AI calls are also constrained by Upstash and subscription usage limits.

## Phase 8 implementation

- `src/models/{subscription,invitation}.model.ts` and `src/modules/subscriptions` provide Starter/Growth/Business limits enforced in server services for members, active jobs, monthly assessments, and AI tokens.
- `src/modules/team` provides email-bound, hash-only, expiring team invitations plus role and suspension controls.
- `/dashboard/analytics`, `/dashboard/settings`, `/dashboard/settings/team`, and `/dashboard/settings/billing` provide operational analytics, branding/privacy/retention, team, and plan usage surfaces.
- `/admin` is protected by the global `platform_admin` role and supports cross-tenant operational totals and audited plan changes.
- `src/instrumentation.ts`, Sentry runtime configs, and the dashboard error boundary capture production server, edge, navigation, and client failures without sending default PII.

Phase 8 uses `SENTRY_DSN` for server/edge monitoring and optional `NEXT_PUBLIC_SENTRY_DSN` for browser monitoring. This roadmap does not name a payment provider, so plan changes are platform-admin controlled rather than backed by a fake checkout.
