# EventEase — Setup Guide

## Prerequisites

1. **Node.js 18+** — download from https://nodejs.org  
2. **A Supabase project** — create one free at https://supabase.com

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Set up Supabase

### a) Create a project at supabase.com

### b) Run the database migration

Open **Supabase Dashboard → SQL Editor**, paste the contents of  
`supabase/migrations/001_initial_schema.sql` and click **Run**.

This creates all tables, RLS policies, seeds event & service categories,
and adds an auto-profile trigger.

### c) Create your `.env` file

```bash
cp .env.example .env
```

Fill in your values from **Supabase Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173

---

## 4. Make someone an admin

After a user signs up, run this in **Supabase SQL Editor**:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@yourdomain.com';
```

---

## 5. Build for production

```bash
npm run build
```

The output is in `dist/` — deploy to Vercel, Netlify, or any static host.

---

## PWA icons

Add two PNG icons to `public/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

The app is installable as a PWA once served over HTTPS.
