# LearnLoop AI — Adaptive Lecture Learning Journey with Gemini AI & Supabase

LearnLoop AI transforms video lecture transcripts into active learning materials—including key concept extraction, structured summaries, interactive flashcards, and 4-option multiple-choice quizzes—powered by Google Gemini AI and Supabase Cloud PostgreSQL.

---

## Architecture Overview

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase Cloud PostgreSQL + RLS (Row Level Security)
- **Authentication**: Supabase Auth (with JWT session support)
- **AI Engine**: Google Gemini API (`@google/genai` & `@google/generative-ai`)
- **Validation**: Zod (100% strict schema validation for AI JSON output)

---

## Setup & Environment Configuration

### 1. Environment Variables

Create `.env` in the root directory (or inside `server/` and `client/` as appropriate).

#### Backend Environment Variables (`server/.env`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Google Gemini API Key (Server-side ONLY)
# Obtain your free API key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_google_gemini_api_key_here

# Supabase Cloud PostgreSQL & Auth (Server-side ONLY)
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

AUTH_SECRET=learnloop-super-secure-jwt-secret-key-change-in-prod-2026
```

#### Frontend Environment Variables (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_public_anon_key_here
```

> ⚠️ **CRITICAL SECURITY NOTE**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in the frontend client, client environment variables, git repositories, or API responses.

---

## Database Migration & Schema

Apply the Supabase migration script located at:
`/supabase/migrations/001_initial_schema.sql`

This creates:
- `profiles` table linked to `auth.users(id)` with auto-signup trigger.
- `lectures`, `concepts`, `flashcards`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers`, `concept_mastery`, and `revision_tasks` tables.
- Strict Row Level Security (RLS) policies enforcing user isolation via `auth.uid()`.

---

## Running Locally

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start the development server (runs Express API on 5000 and Vite client on 5173):
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`.

---

## Deployment Guide

### Option 1: Deploy on Render (Recommended Full-Stack)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) blueprint that deploys the Express server and automatically serves the Vite React frontend as a unified single web service:

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint** and connect this repository: `rhishikeshtayade-maker/learn-loop-ai`.
3. Render will auto-detect [`render.yaml`](./render.yaml).
4. Configure the environment variables:
   - `NODE_ENV`: `production`
   - `SUPABASE_URL`: *(Your Supabase URL)*
   - `SUPABASE_SERVICE_ROLE_KEY`: *(Your Supabase Service Role Key)*
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
   - `AUTH_SECRET`: *(A random 32+ character JWT secret)*
5. Click **Apply**. Render will run `npm run install:all && npm run build` and launch with `npm start`.

### Option 2: Deploy on Vercel

The repository includes [`vercel.json`](./vercel.json) for Vercel deployment:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Import the repository: `rhishikeshtayade-maker/learn-loop-ai`.
3. Vercel will detect Vite and use `vercel.json` with build command `npm run build` and output directory `client/dist`.
4. Under **Project Settings → Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `AUTH_SECRET`
5. Click **Deploy**. Vercel will deploy the client frontend and route API requests via the serverless function handler in `/api/index.ts`.

