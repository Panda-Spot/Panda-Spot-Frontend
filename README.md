# PandaSpot — web

_Spot yourself. Get your photos._

Frontend for PandaSpot, a SaaS product for photographers: create an event,
bulk-upload the photos, and share a public guest link. Guests open the link
(no account needed), upload a selfie, and find every photo they're in.

This app talks to the PandaSpot API (a separate Node/Express service, see
`../server`). It has its own auth (email/password, JWT stored in
`localStorage` and sent as `Authorization: Bearer <token>` — not a cookie;
the frontend and API live on different domains in production, and cross-site
cookies get silently dropped by third-party-cookie blocking in real browsers,
see `src/authToken.js`) — unrelated to any other Studio-Verse app.

## Pages

**Photographer (authenticated)**

- **Login / Register** (`/login`, `/register`) — email + password, or
  "Sign in with Google" (rendered only when `VITE_GOOGLE_CLIENT_ID` is
  configured — see Config below). A slim, non-blocking banner appears above
  the dashboard content for any signed-in user whose email isn't verified
  yet, with a button to resend the verification email.
- **Verify email** (`/verify-email/:token`) — the link from a verification
  email; confirms the token with the API and shows a success/error state. No
  login required (the token itself is the credential).
- **Forgot / reset password** (`/forgot-password`, `/reset-password/:token`)
  — request a reset link by email (the response never reveals whether an
  account exists for that address), then set a new password (min. 8
  characters) via the emailed token link.
- **Dashboard** (`/`) — list your events (each tagged with an "Owner" or
  "Collaborator" badge depending on whether you created it or were invited
  to help), create new ones, and copy each event's guest link.
- **Event detail** (`/events/:eventId`) — bulk-upload photos for an event
  (each photo is scanned for faces); upload progress streams live over
  Server-Sent Events (overall progress, current file, photos/sec, ETA,
  running face/skip tallies) since the upload endpoint now responds
  immediately with a `job_id` and processes asynchronously. Also shows an
  analytics panel (searches, unique guests, match rate, feedback count), a
  "Generate guest card" section that composes a printable QR-code card (event
  name, studio branding, guest link) as a downloadable PNG, and the shareable
  guest link alongside a line showing when guest access closes/closed
  (`expires_at`) and current storage usage vs. the 10GB free-plan cap
  (`storage_used_bytes` / `storage_limit_bytes`). Owners additionally see a
  **Team** card here to invite a second shooter/assistant by email — the
  invitee gets their own login, scoped to just that one event (they never see
  the owner's other events or credentials). Collaborators don't see this card
  at all. Each photo in the grid has a Delete action (with a confirmation
  prompt); owners also see a **Danger zone** card to permanently delete the
  whole event, every photo, and its guest link. Free-tier limits (15 events
  per account, the 15th create attempt gets a 403; 10GB storage per event,
  files past the cap show up in the upload result's skipped list) surface
  through the existing error/skipped-list displays with no special UI. The
  upload modal has a second tab, "Import from Google Drive", alongside
  "Upload files" — paste a public Drive folder link and it's imported as a
  background job that streams progress through the exact same SSE display as
  direct uploads. Photos imported this way aren't copied onto PandaSpot's
  server; only thumbnails and face-search data are stored, and downloads/shares
  fetch the original from the Drive folder live, so the tab shows a notice
  that the folder should stay shared as "Anyone with the link can view" — if
  it's later restricted or a file is deleted there, that specific photo can no
  longer be downloaded through PandaSpot (search still works). A third tab,
  "Live from camera", sets up PandaShoots — camera-to-cloud live upload straight from
  a photographer's camera via its own built-in FTP transfer, no companion app
  needed. The first time, it warns what turning this on means, then shows the
  generated host/port/username/password to enter into the camera's FTP
  settings (re-viewable any time, plus "Regenerate credentials" and "Turn off
  camera upload"). While connected, the page also opens a live event stream so
  photos the camera sends appear in the gallery immediately, with a small
  banner naming each arrival — no manual refresh needed.
- **Invite acceptance** (`/invites/:token`) — the link an invited assistant
  opens. Shown to anonymous visitors too (it's not behind login); prompts
  them to log in or create an account (carrying the invite forward via a
  `redirect` query param through Login/Register), then automatically accepts
  the invite and drops them onto the event.
- **Branding** (`/branding`) — studio-wide settings: studio name, brand
  color, and logo. These flow through to guest event pages and generated
  guest cards. Platform admins (`is_admin`) also see a **Drive backup
  (advanced, beta — platform setup)** card here — a one-time "Connect
  Google Drive" action for the *entire platform's* single shared Drive
  account (not per-photographer), which the callback page shows as a
  refresh token to paste into the server's `.env`. Photographers on the
  server's `DRIVE_BACKUP_BETA_EMAILS` allowlist get a per-event toggle (on
  that event's own page, once it has both a Drive folder and PandaShoots set up)
  to mirror camera captures into that folder using the shared account, plus
  an "I've made my copies — free up space" button and a notice that
  backed-up captures are only kept 2 days on Drive / 7 days total before
  permanent deletion (see the server README's "Drive backup" section).
- **Billing** (`/billing`) — "coming soon" placeholder for paid plans; shows
  the free plan's limits (15 events, 10GB/event storage) and the account's
  current event count against that limit.
- **Admin** (`/admin`) — platform-wide overview (total users, events, photos,
  storage, searches, and a recent-events list) for platform operators only.
  The nav link only renders when the logged-in user's `is_admin` flag is
  true; the real authorization is server-side (`GET /admin/overview` 403s for
  non-admins) — the client-side check is just a UI nicety to hide the link
  from everyone else.

**Guest (public, no account)**

- **Guest event page** (`/e/:slug`) — a standalone branded page (no
  dashboard chrome) showing the event name (with the studio's own logo,
  name, and brand color if the photographer has set them, falling back to
  the PandaSpot look otherwise), an upload for up to 3 selfies, and a grid of
  matching photos with similarity scores. Each match has a "Not me" action to
  send feedback that helps tune matching for that event, and a "Share" action
  that composes a watermarked copy of that photo (studio/PandaSpot branding
  plus a link back to this guest page) and either opens the device's native
  share sheet (`navigator.share`, on browsers that support sharing files) or
  falls back to downloading the watermarked PNG — the viral loop: whoever
  receives a shared photo can click through and search for their own. Once an
  event's `expired` flag comes back true, the selfie-search form is replaced
  with a message telling the guest the search window has closed (the hero
  branding above it still renders either way); this also prevents the guest
  from ever hitting the 410 the search/feedback/download endpoints return
  for an expired event. Below the results, a small card lets the guest opt
  in to being notified (email or WhatsApp) if more photos of them show up
  later — useful now that photos can keep arriving live via PandaShoots during a
  shoot. Choosing WhatsApp also offers a one-off "just text me this link
  now" button, independent of the ongoing subscription.

  This page is also an installable PWA: it dynamically swaps the page's
  `<link id="app-manifest">` to a per-event Blob-URL manifest (name/short
  name derived from the studio and event name, `start_url` pointing at this
  event's `/e/:slug`, and the event's own brand color as `theme_color`) so a
  guest who installs from a specific event's page gets a home-screen icon
  that reopens straight into that event — the original manifest href is
  restored on unmount.

## Setup

```bash
cd web
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:4000 for local API testing
npm run dev
```

Run the PandaSpot API server first (see `../server`'s own README) for full
functionality — the UI still renders and shows error/loading states without
it.

## Config

`VITE_API_URL` in `.env` — base URL of the running PandaSpot API instance.
If unset at build time, the app falls back to the production API URL in
`src/api.js` (`https://git-pipeline.metatronhost.in/panda-spot`); set it
explicitly to `http://localhost:4000` for local backend testing. Authenticated requests send
`Authorization: Bearer <token>`, with the token read from `localStorage`
(`src/authToken.js`) — set on successful register/login/Google sign-in,
cleared on logout. `credentials: 'include'` is still sent too, so the
server's bonus cookie works if it's ever available, but nothing here
depends on it.

`VITE_GOOGLE_CLIENT_ID` in `.env` — the Google Cloud OAuth Client ID used for
"Sign in with Google" (Google Identity Services, loaded dynamically). Leave
it unset/empty and the button is simply omitted from Login/Register (no
error) until it's configured.

## Notes

- **Visual design**: bold/vibrant but light-first — light card/page surfaces
  throughout, with the purple/pink brand gradient (`--gradient-brand`, new
  `--accent-2` token) reserved for accents (buttons, hero sections, hover
  states, icons), not large background fills. A display font (Space Grotesk,
  loaded via Google Fonts in `index.html`) is used for headings. New shared
  components in `src/components/`: `Modal.jsx` + `Dropzone.jsx` (the event
  detail upload flow is now a drag-and-drop modal instead of a bare file
  input), `StatTile.jsx` (icon + value + label, via `lucide-react`), and
  `TrendChart.jsx` (a `recharts` line-chart wrapper used for the 30-day
  searches/matches trend on event analytics and the signups/events trends on
  the admin overview — its two series colors are a validated
  accessibility-checked pair, deliberately kept separate from the brand
  purple/pink, which failed that same check when tried as a chart pair).
- **PWA setup**: `index.html` links a baseline `public/manifest.json` (app
  name, `/icon.svg`, brand-purple theme color) via `<link id="app-manifest">`
  and `src/main.jsx` registers `public/sw.js` (a minimal service worker — no
  real caching strategy, just enough to satisfy installability) on window
  load. `GuestEvent.jsx` overrides that shared manifest's href with a
  per-event Blob URL while mounted (see above) so installs from an event page
  point back at that event specifically.
- No brand assets (logo, final color palette) exist yet — the UI uses a
  placeholder purple accent scheme defined as CSS custom properties in
  `src/index.css`.
- Plain CSS with a shared design-token system (`src/index.css`,
  `src/app.css`) — no CSS framework, no extra state-management library.
- Guest QR "visiting cards" are generated client-side via the `qrcode`
  package, drawn onto an offscreen `<canvas>`, and downloaded as a PNG — no
  server round-trip.
- Guests get a random id (`crypto.randomUUID()`) persisted in
  `localStorage` (`src/guestId.js`) so repeat visits/searches from the same
  browser can be recognized by the API for match feedback and tuning.
- Watermarking (`src/shareImage.js`) is entirely client-side too — it loads
  the matched photo, draws it plus a branded banner onto a `<canvas>`, and
  exports a PNG blob. No new server endpoint was needed for this: it reuses
  the photo URL and the guest link/branding info the page already has.
