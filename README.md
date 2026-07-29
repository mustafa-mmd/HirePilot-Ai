# HirePilot AI

HirePilot AI is a multi-tenant recruitment and candidate-assessment SaaS. It combines job and application management, evidence-based CV analysis, structured assessments, monitored candidate attempts, reports, analytics, and human-controlled hiring decisions.

All eight roadmap phases are implemented. The detailed implementation map is available in [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Important: frontend and backend run together

HirePilot AI is a Next.js App Router modular monolith. It does not have a separate Express, NestJS, or Python backend process.

- Frontend pages and React components run through Next.js.
- Backend API endpoints are Next.js Route Handlers under `src/app/api`.
- Server-side business logic lives under `src/modules`.
- MongoDB models live under `src/models`.
- `npm run dev` starts the frontend and backend together on port `3000`.

```text
Browser
  |
  | http://localhost:3000
  v
Next.js application
  |-- React pages and client components
  |-- Server Components
  |-- /api/* Route Handlers
  |-- authentication and authorization
  |-- domain services under src/modules
  |
  +--> MongoDB Atlas
  +--> Gemini API
  +--> Cloudinary
  +--> SMTP email (Gmail by default)
  +--> Upstash Redis
  +--> Judge0
  +--> Sentry
```

## Quick start on Windows

### 1. Install prerequisites

Install:

- Node.js `20.9` or newer
- npm
- A MongoDB Atlas cluster or another MongoDB replica set
- Git, if you are cloning the repository

The external integrations are described in [Environment variables](#environment-variables). For the complete product flow, configure MongoDB, Gemini, Cloudinary, SMTP email, Upstash, and Judge0.

### 2. Open the project

```powershell
cd D:\HirePilot_Ai
```

### 3. Install packages

```powershell
npm.cmd install
```

Using `npm.cmd` avoids the Windows PowerShell error saying that `npm.ps1` cannot be loaded because script execution is disabled.

### 4. Create the local environment file

If `.env.local` does not exist:

```powershell
Copy-Item .env.example .env.local
```

Add real values to `.env.local`. Never put real credentials in `.env.example`, and never commit `.env.local`.

The minimum values for basic local authentication and database access are:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/hirepilot?retryWrites=true&w=majority
AUTH_SECRET=YOUR_RANDOM_SECRET
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Most HirePilot features require the other integrations as well. See [Environment variables](#environment-variables).

### 5. Start the frontend and backend

```powershell
npm.cmd run dev
```

Open:

- Application: [http://localhost:3000](http://localhost:3000)
- Registration: [http://localhost:3000/register](http://localhost:3000/register)
- Login: [http://localhost:3000/login](http://localhost:3000/login)
- Recruiter dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- Public jobs: [http://localhost:3000/jobs](http://localhost:3000/jobs)

The same process serves API endpoints such as:

```text
http://localhost:3000/api/auth/register
http://localhost:3000/api/jobs
http://localhost:3000/api/applications
http://localhost:3000/api/assessment-templates
```

Keep this terminal open while using the application. Stop the server with `Ctrl+C`.

If you change `.env.local`, stop and restart the development server.

## Production start

Build the optimized application:

```powershell
npm.cmd run build
```

Start the production server:

```powershell
npm.cmd run start
```

The production server also contains both the frontend and backend. It defaults to `http://localhost:3000` unless the hosting platform supplies a different `PORT`.

For a Vercel deployment, add every required value under Project Settings -> Environment Variables. Use production credentials, set `NEXT_PUBLIC_APP_URL` to the final HTTPS domain, and add the production Google OAuth callback URL before deploying.

## Technology stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Full-stack framework | Next.js 16 App Router | Pages, Server Components, API Route Handlers, security headers, and production server |
| UI runtime | React 19 | Interactive recruiter and candidate interfaces |
| Language | TypeScript in strict mode | Type-safe frontend, backend, schemas, and services |
| Styling | Tailwind CSS 4 | Utility styling and responsive layouts |
| UI components | shadcn/ui and Radix UI | Accessible application components |
| Typography and icons | Geist and Lucide React | Product typography and icon system |
| Forms and validation | React Hook Form, Zod, Hookform Resolvers | Client and server input validation |
| Database | MongoDB and Mongoose | Multi-tenant application data, indexes, transactions, and audit records |
| Authentication | Auth.js / NextAuth v5 | Credentials login, optional Google OAuth, and JWT sessions |
| Password security | bcryptjs | Password hashing and verification |
| AI | Google Gemini through `@google/genai` | CV parsing, job requirements, matching, answer evaluation, summaries, and transcription |
| Document extraction | unpdf, mammoth, word-extractor | PDF, DOCX, and DOC CV extraction |
| Media storage | Cloudinary | Signed CV, image, audio, video, and assessment uploads |
| Email | Nodemailer over SMTP | Confirmations, invitations, reminders, OTPs, and team invitations |
| Rate limiting | Upstash Redis and `@upstash/ratelimit` | Auth, application, AI, and candidate request limits |
| Code execution | Monaco Editor and Judge0 | Candidate code editing and isolated execution against hidden tests |
| Tables and drag/drop | TanStack Table and dnd-kit | Candidate tables, builders, and pipeline interactions |
| Analytics | Recharts | Recruitment and product analytics charts |
| Monitoring | Sentry for Next.js | Production server, edge, navigation, and browser error monitoring |
| Testing | Vitest | Unit and route tests |
| Code quality | ESLint and TypeScript | Static analysis and type validation |

## Architecture

The application uses a modular-monolith architecture. Route files handle HTTP transport, while domain modules contain the actual business rules.

```text
src/
|-- app/
|   |-- (auth)/              # Login and registration pages
|   |-- admin/               # Platform administration
|   |-- api/                 # Backend Route Handlers
|   |-- apply/               # Public job application flow
|   |-- assessment/          # Candidate verification, setup, and attempts
|   |-- dashboard/           # Protected recruiter application
|   |-- jobs/                # Public job listings
|   |-- onboarding/          # Organization setup
|   `-- team/                # Team invitation acceptance
|-- components/
|   |-- ui/                  # Reusable UI primitives
|   `-- feature components   # Recruiter and candidate interfaces
|-- emails/                  # Escaped transactional email templates
|-- lib/                     # Database, Cloudinary, security, rate limiting, utilities
|-- models/                  # Mongoose schemas and indexes
|-- modules/                 # Domain services and business rules
|-- types/                   # Shared TypeScript declarations
|-- auth.ts                  # Auth.js configuration
|-- proxy.ts                 # Protected-navigation redirect layer
|-- instrumentation.ts       # Server and edge monitoring bootstrap
`-- instrumentation-client.ts # Browser monitoring bootstrap
```

### Domain modules

`src/modules` is divided into bounded feature areas:

- `admin`: platform-level administration
- `ai`: Gemini client, CV extraction, structured generation, scoring, and usage accounting
- `analytics`: tenant analytics aggregation
- `applications`: application submission and pipeline operations
- `assessments`: question bank, templates, publishing, invitations, and scoring rules
- `attempts`: OTP, consent, timers, autosave, recovery, and submission
- `auth`: registration and authentication schemas
- `authorization`: active organization, roles, and permission enforcement
- `candidates`: tenant-scoped candidate queries
- `coding`: Judge0 execution and hidden-test evaluation
- `jobs`: job CRUD, publishing, public listings, and scoring weights
- `media`: recording types and Gemini transcription
- `notifications`: SMTP delivery and notification state
- `organizations`: workspace creation and settings
- `reports`: AI assessment evaluation, overrides, notes, and decisions
- `subscriptions`: plan definitions, usage, and enforceable limits
- `team`: invitations, memberships, roles, and suspension

### Request lifecycle

A typical protected mutation works like this:

1. A browser sends a same-origin request to a route under `src/app/api`.
2. The Route Handler parses and validates input with Zod.
3. Auth.js verifies the user session.
4. The authorization module loads the active organization and membership.
5. The service checks the required permission.
6. The domain module runs tenant-scoped database operations.
7. Important mutations create audit-log records.
8. The Route Handler returns a structured JSON response.

The proxy redirects unauthenticated navigation, but it is not the only security boundary. Protected services repeat authentication, organization, membership, and permission checks on the server.

## How the product works

### Recruiter flow

1. Register with email/password or Google.
2. Create an organization during onboarding.
3. Configure organization branding, privacy, retention, team roles, and plan limits.
4. Create and publish jobs with requirements and AI scoring weights.
5. Receive candidate applications and verified Cloudinary CV uploads.
6. Run Gemini CV analysis and inspect evidence, score, confidence, missing points, and follow-up questions.
7. Move applications through the audited Kanban pipeline.
8. Build reusable questions and publish immutable assessment templates.
9. Invite candidates and send reminders through SMTP email.
10. Evaluate written, media, and coding answers.
11. Review transcripts, coding results, integrity signals, and evidence-backed AI evaluations.
12. Override a score only with a written reason and make the final human decision.

### Candidate application flow

1. The candidate opens a public job page.
2. The candidate submits personal information and a PDF, DOC, or DOCX CV.
3. The browser uploads the CV directly to Cloudinary using a short-lived server signature.
4. The backend verifies the Cloudinary asset, type, size, ownership, and file signature.
5. The application is created transactionally and duplicate submissions are blocked.
6. The configured SMTP account sends an application confirmation.

### Candidate assessment flow

1. The candidate opens the secure invitation URL.
2. A six-digit email OTP verifies access.
3. The candidate accepts privacy, monitoring, and recording consent.
4. The browser performs camera, microphone, and network checks.
5. The server creates a randomized question snapshot and authoritative deadlines.
6. Answers autosave while server-side timers prevent late submissions.
7. Media answers and monitoring evidence upload through signed Cloudinary requests.
8. Gemini transcribes spoken audio from audio/video answers.
9. Coding answers execute in Judge0, never inside the Next.js process.
10. The completed attempt becomes available for recruiter evaluation and human review.

### AI evaluation flow

1. HirePilot downloads the already-verified source asset.
2. Local libraries extract text from supported CV formats.
3. Gemini returns output constrained by JSON Schema.
4. Zod validates the response again inside the application.
5. Deterministic checks discard evidence quotes that do not literally exist in the source.
6. Unsupported categories receive zero points and uncertain results require manual review.
7. Model, provider, prompt version, tokens, and estimated cost are recorded per organization.

AI results are decision support only. Protected characteristics, appearance, accent, emotion, camera context, and unrelated personal information must not affect scores. HirePilot does not automatically reject candidates or make final hiring decisions.

## Environment variables

Real secrets belong in `.env.local` for local development and in the hosting provider's encrypted environment settings for production.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas or replica-set connection string |
| `AUTH_SECRET` | Yes | Random secret used for Auth.js sessions and assessment OTP protection |
| `AUTH_GOOGLE_ID` | Optional | Google OAuth web client ID; Google login appears only when both Google values exist |
| `AUTH_GOOGLE_SECRET` | Optional | Google OAuth client secret |
| `GEMINI_API_KEY` | AI features | Server-only Gemini API key |
| `GEMINI_MODEL` | No | Gemini model override; defaults to `gemini-2.5-flash` |
| `CLOUDINARY_CLOUD_NAME` | Uploads | Cloudinary product-environment cloud name |
| `CLOUDINARY_API_KEY` | Uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Uploads | Server-only Cloudinary signing secret |
| `SMTP_HOST` | Email flows | SMTP server; use `smtp.gmail.com` for Gmail |
| `SMTP_PORT` | Email flows | SMTP port; use `465` for Gmail with implicit TLS |
| `SMTP_SECURE` | Email flows | `true` for port 465; use `false` for STARTTLS on port 587 |
| `SMTP_USER` | Email flows | Gmail address or SMTP username used to send mail |
| `SMTP_PASS` | Email flows | Gmail App Password or SMTP password; never use your normal account password |
| `EMAIL_FROM` | No | Display sender; defaults to `HirePilot AI <SMTP_USER>` |
| `UPSTASH_REDIS_REST_URL` | Production | HTTPS Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Server-only Upstash standard REST token |
| `JUDGE0_API_URL` | Coding questions | Base URL of a secured Judge0 deployment, without `/submissions` |
| `JUDGE0_API_KEY` | Depends on Judge0 | Judge0 auth token; may be empty for a private instance with auth disabled |
| `SENTRY_DSN` | Optional | Server and edge Sentry project DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Browser Sentry DSN; intentionally public |
| `NEXT_PUBLIC_APP_URL` | Yes | Exact application origin, without a trailing slash |

Example local structure:

```env
MONGODB_URI=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
JUDGE0_API_URL=
JUDGE0_API_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Security rules:

- Never commit `.env.local`.
- Never expose `AUTH_SECRET`, database credentials, Gemini keys, API secrets, or tokens through a `NEXT_PUBLIC_` variable.
- Use separate development and production databases and provider credentials.
- Restart the Next.js server after changing environment values.
- Rotate any credential immediately if it appears in source control, logs, screenshots, or chat.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm.cmd install` | Install project dependencies |
| `npm.cmd run dev` | Start frontend and backend in development mode |
| `npm.cmd run build` | Create and type-check the optimized production build |
| `npm.cmd run start` | Start the previously built production server |
| `npm.cmd run typecheck` | Run TypeScript without emitting files |
| `npm.cmd run lint` | Run ESLint across the project |
| `npm.cmd run test` | Start Vitest in watch mode |
| `npm.cmd run test:run` | Run the test suite once for CI or validation |

Before deploying, run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Current validated baseline:

- 17 test files
- 46 passing tests
- 44 statically generated pages during the production build
- 0 known production dependency vulnerabilities in the offline audit cache

## Data and tenant isolation

- The application is multi-tenant.
- Organization-owned records include `organizationId`.
- Protected queries include both the resource ID and active organization ID.
- Authenticated identity does not automatically grant organization access.
- Membership status, role, and permissions are verified separately.
- The active organization is stored in an HTTP-only cookie.
- Important mutations write audit records.
- Organization creation uses a MongoDB transaction, so MongoDB must support transactions.

## Security design

- Passwords are hashed with bcrypt.
- Auth.js uses JWT sessions protected by `AUTH_SECRET`.
- Candidate invitation capabilities are random, expiring, and stored only as hashes.
- OTP values are HMAC-protected and attempt-limited.
- Same-origin checks protect state-changing application APIs.
- Upstash rate limits authentication, applications, AI analysis, and candidate assessment requests.
- Cloudinary uploads are signed, scoped, and verified server-side after upload.
- CV file signatures are checked instead of trusting extensions alone.
- Candidate code runs only in Judge0 with configured time and memory limits.
- Hidden coding tests never leave the server.
- Security headers restrict framing, content types, referrers, scripts, media, and camera/microphone/display access.
- Sentry is configured without default PII collection.
- Integrity events are reviewer evidence, not automatic rejection rules.

## Troubleshooting

### PowerShell says `npm.ps1 cannot be loaded`

Use the Windows command shim:

```powershell
npm.cmd run dev
```

### Port 3000 is already in use

Stop the other process or temporarily use another port:

```powershell
npm.cmd run dev -- -p 3001
```

Then update `NEXT_PUBLIC_APP_URL` and any Google OAuth localhost callback to use port `3001`.

### `MONGODB_URI is not configured`

Confirm that `.env.local` is in the project root, not inside `src`, and restart the server.

### MongoDB connection timeout

Check the Atlas IP access list, database username/password, cluster status, connection string, and URL encoding of special password characters.

### Google shows `redirect_uri_mismatch`

Add this exact local callback to the Google web OAuth client:

```text
http://localhost:3000/api/auth/callback/google
```

Use the equivalent HTTPS URL for production.

### Gemini says AI is not configured

Set `GEMINI_API_KEY` in `.env.local`, keep `GEMINI_MODEL=gemini-2.5-flash`, and restart the server.

### Uploads return `UPLOAD_UNAVAILABLE`

Check all three Cloudinary variables. The API key and API secret must belong to the same Cloudinary product environment as the cloud name.

### Configure free Gmail SMTP email

Gmail SMTP can deliver HirePilot invitations, reminders, confirmations, and OTPs to different Gmail, Outlook, Yahoo, or other email accounts without requiring a custom domain.

1. Use a dedicated Gmail account for HirePilot instead of a personal inbox.
2. Enable 2-Step Verification on that Google account.
3. Open Google Account → Security → App passwords.
4. Create an App Password named `HirePilot`.
5. Copy the generated 16-character password. This is not the normal Google account password.
6. Add the following values to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-hirepilot-sender@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM="HirePilot AI <your-hirepilot-sender@gmail.com>"
```

Spaces in a Google App Password are ignored by the application. The Gmail address in `EMAIL_FROM` should match `SMTP_USER`. Restart the development server after adding the values.

If the App passwords option is unavailable, confirm 2-Step Verification is enabled. Some managed work/school accounts and Advanced Protection accounts do not allow App Passwords.

### Emails remain failed

Check all SMTP variables, confirm `SMTP_PASS` is an App Password, and ensure the sender address in `EMAIL_FROM` matches `SMTP_USER`. A Gmail `534` error means an App Password is required; a `535` error normally means the username or App Password is incorrect.

### Production returns `RATE_LIMIT_UNAVAILABLE`

Production intentionally requires both Upstash REST variables. Copy the HTTPS REST URL and standard REST token from the same database.

### Coding questions return `JUDGE0_NOT_CONFIGURED`

Set `JUDGE0_API_URL` to the base of a secured Judge0 deployment. Do not include `/submissions` or a trailing slash. Add `JUDGE0_API_KEY` if the deployment requires `X-Auth-Token` authentication.

### Environment changes do not appear

Stop the server with `Ctrl+C` and run `npm.cmd run dev` again. `NEXT_PUBLIC_` values are bundled for browser use and require a restart or rebuild.

## Development notes

- The database, Gemini, SMTP, Upstash, and Cloudinary clients are lazily initialized so `next build` does not require live external connections.
- Server Components are the default; interactive browser features use focused Client Components.
- API Route Handlers remain thin and delegate business logic to `src/modules`.
- Mongoose development mode creates declared indexes automatically. Production disables automatic index creation, so production indexes must be provisioned deliberately from the model definitions.
- The repository uses a workspace-local npm cache because the host system drive may have limited free space. `.npm-cache` and `.tmp` are ignored.
- No payment provider was specified by the roadmap. Subscription plans and limits are operationally managed by platform administrators.

## License and production readiness

This repository does not currently declare an open-source license. Treat it as private source code unless the owner adds a license.

Before processing real candidate data, complete legal/privacy review, configure data retention, verify provider data-processing terms, secure the Judge0 network boundary, use production-grade secrets, enable monitoring, test backup and recovery, and perform an independent security assessment.
