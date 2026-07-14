# AI-Frontend (test project — UI for AI-Backend)

A minimal Vite + React frontend that talks **only** to `AI-Backend`. It is not
part of Studio-Verse's `Frontend-1` — separate repo, separate app, no shared
code, no shared auth. Its only job is to exercise the face-search API end to
end: create an album, bulk-upload photos, and search by selfie.

## Pages

- **Albums** (`/`) — create an album, see existing albums and their photo counts.
- **Album detail** (`/albums/:albumId`) — bulk-upload photos into that album
  (each photo is sent to `AI-Backend`, which detects faces and stores an
  embedding per face) and see the uploaded photos with their detected face count.
- **Search** (`/search`) — pick an album, upload a selfie, and see every photo
  in that album containing a matching face, sorted by similarity.

## Setup

```bash
cd AI-Frontend
npm install
cp .env.example .env   # points at AI-Backend, defaults to http://localhost:8000
npm run dev
```

Run `AI-Backend` first (see its own README) — this app has no functionality
without it.

## Config

`VITE_AI_BACKEND_URL` in `.env` — base URL of the running AI-Backend instance.
Defaults to `http://localhost:8000`.

## What this deliberately does NOT do yet

- No auth — mirrors AI-Backend's current no-auth state.
- No styling system/design tokens shared with Studio-Verse's Frontend-1 —
  plain, minimal CSS.
- No integration with Studio-Verse's Events UI — an "album" here is its own
  AI-Backend concept.
