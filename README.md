# Lab Tests Organizer

A ward-level lab test management app built for pediatric residents. Tracks which tests need to be sent for which patients, sorted by lab closing time so the most urgent ones always surface first.

---

## Features

### For Doctors (USER role)
- **Priority Board** — all pending tests grouped by lab and sorted by urgency (time remaining until lab closes). Color-coded: red → critical, orange → high, yellow → medium, green → low.
- **Patients** — add and manage ward patients (name, ward/bed, age, notes). Assign one or more tests at a time. Update test status (Pending → Sample Sent → Done) or undo/reopen any status.
- **Labs / Tests** — read-only reference view of all available labs and their tests with opening/closing times.
- **Save PDF** — export the Priority Board or Patients list as a PDF for offline reference (useful during network outages). All patients are auto-expanded in the PDF export.

### For Admins (ADMIN role)
- **Labs** — add, edit, and delete labs (name, opening time, closing time).
- **Tests** — add, edit, and delete tests, each linked to a lab.
- **Users** — create new doctor accounts (or admin accounts), update names/roles/passwords, delete accounts.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript) |
| Database    | PostgreSQL via Prisma ORM           |
| Auth        | NextAuth.js v4 (credentials + JWT)  |
| Styling     | Tailwind CSS                        |
| Hosting     | Vercel                              |
| DB Hosting  | Supabase / Neon (serverless Postgres)|

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login page (no sidebar)
│   │   └── login/
│   ├── (dashboard)/         # All authenticated pages
│   │   ├── dashboard/       # Priority board (doctors)
│   │   ├── patients/        # Patient management (doctors)
│   │   ├── labs/            # Lab management (admin) / view (doctors)
│   │   ├── tests/           # Test management (admin) / view (doctors)
│   │   └── users/           # User management (admin only)
│   └── api/
│       ├── auth/            # NextAuth handler
│       ├── admin/users/     # User CRUD (admin only)
│       ├── dashboard/       # Priority board data
│       ├── labs/            # Lab CRUD
│       ├── tests/           # Test CRUD
│       ├── patients/        # Patient CRUD
│       └── patient-tests/   # Test assignment + status updates
├── components/
│   ├── nav.tsx              # Sidebar (desktop) + bottom bar (mobile)
│   └── ui/                  # Button, Input, Select, Modal
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── db.ts                # Prisma client singleton
│   ├── hooks.ts             # useRequireAdmin / useRequireUser
│   └── utils.ts             # Urgency calculation, status styles
└── types/
    └── next-auth.d.ts       # Extended session types (id, role)

prisma/
├── schema.prisma            # DB schema
├── seed.ts                  # Seeds admin account + default labs/tests
└── tsconfig.seed.json       # ts-node config for seeding on Windows
```

---

## Data Model

```
User ──< Patient ──< PatientTest >── Test >── Lab
```

- A **User** (doctor) owns their own Patients.
- **Labs** and **Tests** are global — created and managed by admins, shared across all doctors.
- **PatientTest** links a patient to a test with a status (`PENDING` → `SAMPLE_COLLECTED` → `DONE`).

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or [Supabase](https://supabase.com) / [Neon](https://neon.tech) free tier)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```env
# PostgreSQL — use pooled URL for runtime queries
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lab_tests_organizer?sslmode=require"

# For Supabase/Neon with PgBouncer pooler, also add the direct (non-pooled) URL
# needed by Prisma for schema migrations
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/lab_tests_organizer?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

Also create a `.env` file (Prisma CLI reads this, not `.env.local`):

```env
DATABASE_URL="..."   # same as above
DIRECT_URL="..."     # same as above
```

> **Supabase note:** Use the **pooler URL** (port `6543`, append `?pgbouncer=true`) for `DATABASE_URL` and the **direct URL** (port `5432`) for `DIRECT_URL`.

### 3. Push schema and seed

```bash
# Apply schema to database + regenerate Prisma client
npm run db:push

# Seed default admin account + 7 labs + 37 tests
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Default Admin Account

The seed creates one admin account:

| Field    | Value                    |
|----------|--------------------------|
| Email    | `admin@hospital.com`     |
| Password | `Admin@123`              |

**Change this password immediately after first login** (Admin → Users → edit the admin account).

Doctors do not self-register — accounts are created by the admin from the **Users** page.

---

## User Roles

| Action                        | Doctor (USER) | Admin (ADMIN) |
|-------------------------------|:---:|:---:|
| View Priority Board           | ✅  | —   |
| Manage own patients + tests   | ✅  | —   |
| View labs / tests (read-only) | ✅  | ✅  |
| Add / edit / delete labs      | —   | ✅  |
| Add / edit / delete tests     | —   | ✅  |
| Create / manage user accounts | —   | ✅  |
| Save PDF (offline reference)  | ✅  | —   |

---

## Available Scripts

| Command           | Description                                      |
|-------------------|--------------------------------------------------|
| `npm run dev`     | Start development server (localhost:3000)        |
| `npm run build`   | Build for production                             |
| `npm run start`   | Start production server                          |
| `npm run db:push` | Push schema changes to DB + regenerate client    |
| `npm run db:seed` | Seed admin account and default labs/tests        |
| `npm run db:studio` | Open Prisma Studio (visual DB browser)         |
| `npm run db:migrate` | Run pending migrations (production use)       |

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/lab-tests-organizer.git
git push -u origin main
```

### 2. Import to Vercel

Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo. Vercel auto-detects Next.js.

### 3. Set environment variables

In your Vercel project → **Settings → Environment Variables**:

| Variable          | Value                                        |
|-------------------|----------------------------------------------|
| `DATABASE_URL`    | Supabase/Neon pooled connection string       |
| `DIRECT_URL`      | Supabase/Neon direct connection string       |
| `NEXTAUTH_URL`    | `https://your-app.vercel.app`                |
| `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32`          |

### 4. Seed the production database

After the first deploy, run from your local machine (with `.env` pointing to the production DB):

```bash
npm run db:seed
```

---

## Updating the Schema

When you change `prisma/schema.prisma`:

```bash
# Development
npm run db:push

# Production (creates a proper migration file)
npx prisma migrate dev --name describe-your-change
npm run db:migrate   # run this in CI or manually on production
```

---

## Offline / PDF Workflow

If the hospital network goes down, doctors can save a snapshot before starting their shift:

1. Open **Priority Board** or **Patients** page
2. Tap **Save PDF** (top-right of each page)
3. On phone: share sheet → Print → Save to Files
4. On laptop: print dialog → Save as PDF

The PDF strips all interactive buttons and shows all patients fully expanded with their test statuses and lab closing times.
