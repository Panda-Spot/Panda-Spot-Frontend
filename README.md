# PandaSpot — web

_Spot yourself. Get your photos._

Frontend for PandaSpot, a SaaS product for photographers: create an event,
bulk-upload the photos, and share a public guest link. Guests open the link
(no account needed), upload a selfie, and find every photo they're in.

This app talks to the PandaSpot API (a separate Node/Express service, see
`../server`). It has its own auth (email/password, httpOnly JWT cookie) —
unrelated to any other Studio-Verse app.

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
  guest link. Owners additionally see a **Team** card here to invite a
  second shooter/assistant by email — the invitee gets their own login,
  scoped to just that one event (they never see the owner's other events or
  credentials). Collaborators don't see this card at all.
- **Invite acceptance** (`/invites/:token`) — the link an invited assistant
  opens. Shown to anonymous visitors too (it's not behind login); prompts
  them to log in or create an account (carrying the invite forward via a
  `redirect` query param through Login/Register), then automatically accepts
  the invite and drops them onto the event.
- **Branding** (`/branding`) — studio-wide settings: studio name, brand
  color, and logo. These flow through to guest event pages and generated
  guest cards.

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
  receives a shared photo can click through and search for their own.

## Setup

```bash
cd web
npm install
cp .env.example .env   # points at the PandaSpot API, defaults to http://localhost:4000
npm run dev
```

Run the PandaSpot API server first (see `../server`'s own README) for full
functionality — the UI still renders and shows error/loading states without
it.

## Config

`VITE_API_URL` in `.env` — base URL of the running PandaSpot API instance.
Defaults to `http://localhost:4000`. Authenticated requests are sent with
`credentials: 'include'` so the server's httpOnly session cookie is used.

`VITE_GOOGLE_CLIENT_ID` in `.env` — the Google Cloud OAuth Client ID used for
"Sign in with Google" (Google Identity Services, loaded dynamically). Leave
it unset/empty and the button is simply omitted from Login/Register (no
error) until it's configured.

## Notes

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
