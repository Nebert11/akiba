# Akiba

Akiba is a Kenyan-first personal finance web app for budgeting, transaction tracking,
savings goals, recurring expenses, and financial insights.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth + Postgres)
- PWA support via `vite-plugin-pwa`

## Features

- Email/password authentication
- Onboarding profile setup (income, goals, debts, fixed expenses)
- Accounts and wallet management
- Budget generation and budget-vs-actual tracking
- Transaction and recurring transaction tracking
- Savings goals and notifications
- Installable PWA

## Project Structure

```text
src/
	components/
	context/
	layouts/
	lib/
	pages/
	types/
supabase/
	migrations/
```

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Important:

- Use the Supabase API URL format: `https://<project-ref>.supabase.co`
- Do not use the dashboard URL (`https://supabase.com/dashboard/project/...`)

### 3) Run the app

```bash
npm run dev
```

### 4) Type check

```bash
npm run typecheck
```

## Supabase Database Setup

This project includes SQL migrations in `supabase/migrations`.

### One-time CLI setup

```bash
brew install supabase/tap/supabase
supabase login
```

### Link this repo to your Supabase project

```bash
supabase link --project-ref <your-project-ref>
```

### Apply migrations

```bash
supabase db push
supabase migration list
```

Current migrations:

- `20260816045309_001_core_schema.sql`
- `20260816045327_002_seed_fee_rules.sql`
- `20260817092337_dedupe_and_constraint.sql`

## PWA (Installable App)

PWA is enabled in `vite.config.ts` using `vite-plugin-pwa`.

Required icons in `public/`:

- `pwa-192.png`
- `pwa-512.png`

If you already have `public/logo.png`, generate icons on macOS with:

```bash
# Run from project root
sips -z 192 192 public/logo.png --out public/pwa-192.png
sips -z 512 512 public/logo.png --out public/pwa-512.png
```

## Deployment

Recommended: Vercel

1. Import the GitHub repository in Vercel.
2. Use Vite preset.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables:
	 - `VITE_SUPABASE_URL`
	 - `VITE_SUPABASE_ANON_KEY`

After deploy, configure Supabase Auth settings:

- Site URL: your production app URL
- Redirect URLs: include your production URL pattern and localhost for development

## Troubleshooting

### CORS error calling Supabase auth

Usually caused by an incorrect `VITE_SUPABASE_URL`.

Use:

```text
https://<project-ref>.supabase.co
```

Not:

```text
https://supabase.com/dashboard/project/<project-ref>
```

### Env changes not taking effect

Restart the Vite dev server after editing `.env`.

### Supabase CLI says project ref not found

Run:

```bash
supabase link --project-ref <your-project-ref>
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
