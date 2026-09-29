# PrepX

### O/L Examination Results Portal

PrepX is a web application for managing O/L model examination records and building a student-facing results portal. It brings student records, examination listings, and subject management into an authenticated admin workspace.

Built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

> **Status: In development.** The admin foundation is implemented. Public result lookup, grade entry, imports, and publication workflows are still being developed.

## Features

### Available now

- **Admin authentication:** Supabase email/password sign-in with administrator profile checks and protected routes.
- **Dashboard:** Database-backed statistics and recent examinations.
- **Examination listings:** Status filtering and student counts.
- **Student management:** Create, edit, delete, search, filter, and paginate student records, with per-examination identifier validation.
- **Subject management:** Configure examination subjects, including display order and active/required settings.
- **Responsive interface:** Desktop sidebar, mobile navigation, and loading feedback.
- **Database foundation:** SQL migrations, row-level security policies, and server-side audit logging for student and subject changes.

### Planned / in progress

- Public result search and result cards.
- Examination creation and editing forms.
- Grade entry and result review.
- Spreadsheet imports.
- Publication management and audit-log viewer.
- Request rate limiting.

## Tech stack

| Layer | Technology |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, Lucide icons, locally bundled Inter font |
| Authentication and database | Supabase Auth and PostgreSQL |
| Validation | Zod |
| Development checks | ESLint and TypeScript |

## Getting started

### 1. Install dependencies

Use Node.js 22 or newer, npm, and a Supabase project. After cloning or downloading this repository, run these commands from the repository root:

```bash
cd prepx
npm ci
```

All subsequent npm commands run from the `prepx/` directory.

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` inside `prepx/`:

```powershell
# PowerShell
Copy-Item .env.local.example .env.local
```

```bash
# macOS / Linux
cp .env.local.example .env.local
```

Fill in the values for your Supabase project:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_key

NEXT_PUBLIC_APP_NAME=PrepX
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY` is used by trusted server-side operations and bypasses row-level security. Keep it out of browser code and Git commits. Local environment files are ignored by the application's `.gitignore`.

The commented Upstash variables in the example file are reserved for future rate limiting and are not needed for the current implementation.

### 3. Set up the database

Run these SQL files in your Supabase project's SQL editor, in order, on a fresh database:

1. [001_initial_schema.sql](prepx/supabase/migrations/001_initial_schema.sql)
2. [002_student_nic_uniqueness.sql](prepx/supabase/migrations/002_student_nic_uniqueness.sql)

The schema includes `admin_profiles`, `examinations`, `students`, `subjects`, `student_results`, and `audit_logs`, along with indexes and row-level security policies.

Verify connectivity and read access to all six tables:

```bash
npm run test:db
```

Optional development fixtures are available in [prepx/supabase/seeds/](prepx/supabase/seeds/). Review them before applying them to a development database; they are separate from the migrations.

### 4. Create an administrator

Create an email/password user in Supabase Authentication, then copy that user's UUID. Run this SQL after replacing the placeholder with the actual UUID:

```sql
insert into public.admin_profiles (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

A Supabase Auth account must also have an `admin_profiles` row to access the admin area.

### 5. Start the application

```bash
npm run dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) and sign in with the administrator account. The public homepage currently displays a placeholder.

Examination creation is still in progress. To explore student and subject management, create an examination in Supabase or use the supplied development fixtures.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Check TypeScript without emitting files |
| `npm run test:db` | Check database connectivity and table read access |

Additional development, verification, and measurement scripts live in [prepx/scripts/](prepx/scripts/). Some require a running server, configured accounts, or test data; inspect each script before running it.

## Project structure

```text
PrepX-Website/
├── README.md
├── PrepX.pdf
└── prepx/
    ├── src/
    │   ├── app/
    │   │   ├── (public)/       # Public portal routes (in progress)
    │   │   ├── admin/          # Login and protected admin pages
    │   │   └── api/            # Health endpoint and API scaffolding
    │   ├── components/        # Admin, public, and shared UI components
    │   ├── lib/               # Actions, data queries, validation, Supabase clients
    │   ├── types/             # Shared and database types
    │   └── middleware.ts      # Admin route authentication checks
    ├── supabase/
    │   ├── migrations/        # Database schema changes
    │   └── seeds/             # Optional development fixtures
    ├── scripts/               # Verification, seed, and performance scripts
    ├── .env.local.example
    └── package.json
```

## Production build

From `prepx/`, with the environment configured:

```bash
npm run lint
npm run type-check
npm run build
npm start
```

For hosting, set the application root to **`prepx`**, configure the environment variables above, and use the production URL for `NEXT_PUBLIC_APP_URL`. Apply the database migrations and provision the administrator account for the target Supabase project.

`GET /api/health` returns the service status and timestamp. It checks that the application responds; it does not check database connectivity. The unfinished workflows listed above remain unavailable in a deployed build.

## Project notes

- [Performance audit](prepx/PERFORMANCE-AUDIT.md) — navigation improvements, measurements, and validation notes.
- [Step 5.1 verification](prepx/STEP-5.1-VERIFICATION.md)
- [Step 5.2 verification](prepx/STEP-5.2-VERIFICATION.md)

## Contributing

Keep changes focused and describe how they were verified. Run lint and type checks before submitting changes, and include a SQL migration when changing the database schema. Use development data when testing database mutations.

## License

No project license has been added yet. The bundled Inter font has its own [license](prepx/src/app/fonts/LICENSE.txt).
