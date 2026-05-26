# Deployment Guide

## Prerequisites

- Node.js 18+ installed locally
- A PostgreSQL database (Neon recommended for Vercel)
- A Vercel account

---

## 1. Set up the database (Neon — free tier)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project → copy the **connection string** (looks like `postgresql://...`)

---

## 2. Local development setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local
# Edit .env.local and set:
#   DATABASE_URL=<your Neon connection string>
#   NEXTAUTH_URL=http://localhost:3000
#   NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Push schema to database and generate client
npm run db:push

# Seed default labs and tests
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account, then log in.

---

## 3. Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option B: GitHub → Vercel (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Vercel auto-detects Next.js — no framework changes needed

### Set environment variables in Vercel dashboard

Go to your project → **Settings → Environment Variables** and add:

| Variable        | Value                                  |
|-----------------|----------------------------------------|
| `DATABASE_URL`  | Your Neon connection string            |
| `NEXTAUTH_URL`  | `https://your-app.vercel.app`          |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` locally |

4. **Redeploy** after adding env vars

### After first deploy — seed the database

Run this once from your local machine (with `.env.local` configured):

```bash
npm run db:seed
```

Or use Prisma Studio to inspect your data:

```bash
npm run db:studio
```

---

## 4. Database migrations

When you change `prisma/schema.prisma`:

```bash
# Development: push changes directly
npm run db:push

# Production: use proper migrations
npx prisma migrate dev --name <migration-name>
npm run db:migrate   # runs on production
```

---

## Environment Variables Reference

| Variable          | Description                                          |
|-------------------|------------------------------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string                         |
| `NEXTAUTH_URL`    | Full URL of your app (http://localhost:3000 for dev) |
| `NEXTAUTH_SECRET` | Random 32-byte secret for JWT signing                |

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v4 (credentials provider, JWT sessions)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (frontend + API routes)
- **DB Hosting**: Neon (serverless PostgreSQL)
