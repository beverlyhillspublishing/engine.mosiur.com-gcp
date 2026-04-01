# TechyPark

A full-featured email marketing + productivity platform built on GCP, featuring a complete suite of iCloud-inspired productivity apps alongside a powerful AI-driven email marketing engine.

---

## Features

### Email Marketing
- **Campaigns** — Multi-step campaign wizard with audience selection, HTML/template editor, scheduling, and analytics
- **Contacts & Lists** — CSV import, custom fields, list management, suppression lists
- **Segments** — Rule-based dynamic segments (filter by any contact attribute)
- **Templates** — Reusable HTML email templates with global template library
- **Automations** — Visual workflow builder: triggers → conditions → actions (send email, wait, branch)
- **Analytics** — Open rates, click rates, unsubscribe rates, top campaigns, subscriber growth charts
- **A/B Testing** — Subject line and content splits with automatic winner selection
- **Sender Profiles** — Multiple from addresses, DKIM/SPF verification
- **Webhooks** — Outbound webhooks for all campaign events (open, click, bounce, unsubscribe)
- **API Keys** — Per-organization API key management for external integrations

### AI Email Builder
Generate production-ready responsive HTML emails from any of five sources:
- **Prompt** — Describe your email in plain text; optionally apply branding from a URL
- **Import URL** — Fetch any public URL, preview in a sandboxed browser, convert to email with AI or use the HTML directly
- **Website Match** — Extract brand colors, fonts, and logo from your website URL; generate a fully branded email
- **Screenshot** — Upload a PNG/JPG/WebP screenshot; Claude Vision recreates it as a responsive email
- **Forward to Import** — Get a unique `import-{id}@icloud.mosiur.com` address; forward any email to it and it automatically appears in the builder (mail-tester.com style)

### Productivity Suite (iCloud-inspired)

#### Mail
- IMAP/SMTP webmail supporting Gmail, Outlook, iCloud, Yahoo, and custom providers
- Threaded inbox with starred, archive, and trash folders
- Full compose with Cc support using TipTap rich-text editor
- 15-minute background sync via BullMQ + imapflow
- AES-256-GCM encrypted credentials at rest

#### Drive
- GCS-backed file storage with folder hierarchy
- Drag-and-drop upload using react-dropzone
- GCS signed URL flow (direct browser → GCS upload, never through the API)
- Download via 1-hour signed URLs

#### Calendar
- Team calendar with month/week/day/list views powered by @fullcalendar/react
- Drag-and-drop event rescheduling
- Attendees with RSVP tracking
- Optional link to marketing campaigns
- RRULE support for recurring events

#### Notes
- TipTap rich-text editor with auto-save (800ms debounce)
- Folder organization and pinned notes
- Full-text search

#### Reminders
- iCloud Reminders-style task lists with color coding
- Priority levels (None / Low / Medium / High)
- Due dates, subtasks, and completion tracking
- Show/hide completed tasks toggle

#### Documents (iWork equivalent)
- **Pages** — Full TipTap rich-text document editor
- **Numbers** — Custom spreadsheet editor with multi-sheet support
- **Keynote** — Slide presentation editor with text element placement, slide panel, and property inspector
- Per-document collaborators with viewer/editor roles

### Authentication
- **Email/Password** with bcrypt + JWT access tokens + httpOnly refresh token cookies
- **Google OAuth 2.0** — One-tap sign-in; creates organization on first login
- **Apple Sign In** — PKCE flow with form-POST callback; handles first-login `user` JSON
- **WebAuthn Passkeys** — Discoverable credentials via `@simplewebauthn/server` v9; challenge stored in Redis for replay prevention
- Passkey management UI: add, rename, delete; device type icons; synced/backed-up badges

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                 │
│  /app/(auth)     Login, Register, OAuth callback         │
│  /app/(app)      Authenticated app pages                 │
│    Email Marketing: dashboard, campaigns, contacts, ...  │
│    Productivity: mail, drive, calendar, notes, reminders │
│    Documents: pages/[id], numbers/[id], keynote/[id]     │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (Axios + TanStack Query)
┌──────────────────────▼──────────────────────────────────┐
│                    Backend (Express + TypeScript)         │
│  /api/v1/auth       Authentication endpoints             │
│  /api/v1/orgs/:id   Org-scoped authenticated routes      │
│    contacts, lists, segments, campaigns, templates       │
│    automations, analytics, billing, senders              │
│    mail, drive, calendar, notes, reminders, docs, ai     │
│  /api/v1/t          Email tracking (open pixel, clicks)  │
│  /api/v1/unsub      Unsubscribe handler                  │
└──────┬───────────────┬──────────────┬────────────────────┘
       │               │              │
  PostgreSQL        Redis          BullMQ Workers
  (Prisma ORM)   (sessions,      campaign send, imports,
                  challenges,    automations, mail sync,
                  inbound mail)  ab-tests, webhooks
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| State | TanStack Query v5, Zustand |
| Rich Text | TipTap 2 (Notes + Pages + Compose) |
| Calendar | @fullcalendar/react 6 |
| File Upload | react-dropzone |
| Backend | Express 4, TypeScript, Prisma 5, PostgreSQL |
| Queue | BullMQ 5 + Redis (ioredis) |
| Email Send | AWS SES / Mailgun / SendGrid / SMTP |
| Email IMAP | imapflow + mailparser |
| Storage | Google Cloud Storage |
| Auth | JWT + httpOnly cookies, Google OAuth, Apple Sign In, WebAuthn |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Billing | Stripe |
| Deployment | GKE (Google Kubernetes Engine) |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- GCP project with GCS bucket (for Drive and file uploads)

### Local Development

```bash
# Clone
git clone https://github.com/beverlyhillspublishing/engine.mosiur.com-gcp
cd engine.mosiur.com-gcp

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your values

# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Environment Variables

See `.env.example` for the full list of required variables. Key ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | JWT signing key (generate with `openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | AES-256-GCM key for credential encryption |
| `ANTHROPIC_API_KEY` | Claude AI API key for the AI Email Builder |
| `GCS_BUCKET_NAME` | GCS bucket for Drive file storage |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth credentials |
| `APPLE_CLIENT_ID` + `APPLE_PRIVATE_KEY` | Apple Sign In credentials |
| `INBOUND_EMAIL_DOMAIN` | Domain for forward-to-import email addresses |
| `STRIPE_SECRET_KEY` | Stripe API key for billing |

---

## Deployment

The project includes GKE deployment configuration. Use the included deployment scripts to deploy to Google Kubernetes Engine:

```bash
# Build and push Docker images to GCR
./scripts/build.sh

# Deploy to GKE
./scripts/deploy.sh
```

---

## Project Structure

```
engine.mosiur.com-gcp/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Full data model (50+ models)
│   ├── src/
│   │   ├── config/              # Environment config
│   │   ├── controllers/         # HTTP handlers
│   │   ├── middleware/          # Auth, tenancy, error handling
│   │   ├── queues/              # BullMQ jobs and workers
│   │   │   └── jobs/            # send-campaign, mail-sync, etc.
│   │   ├── routes/              # Express routers
│   │   ├── services/            # Business logic
│   │   └── utils/               # Helpers (JWT, hash, email renderer)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Login, register, OAuth callback
│   │   │   └── (app)/           # Authenticated pages
│   │   │       ├── dashboard/
│   │   │       ├── campaigns/
│   │   │       ├── contacts/
│   │   │       ├── mail/        # IMAP webmail
│   │   │       ├── drive/       # File storage
│   │   │       ├── calendar/    # Team calendar
│   │   │       ├── notes/       # Rich text notes
│   │   │       ├── reminders/   # Task lists
│   │   │       └── documents/   # Pages, Numbers, Keynote
│   │   ├── components/
│   │   │   ├── ai-builder/      # AI Email Builder tabs + dialog
│   │   │   ├── editor/          # TipTap, Spreadsheet editors
│   │   │   ├── layout/          # Sidebar, TopBar
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api.ts           # All API calls
│   │   │   └── utils.ts
│   │   └── providers/
│   │       └── AuthProvider.tsx
│   └── package.json
├── .env.example
└── README.md
```

---

## License

Proprietary — Beverly Hills Publishing. All rights reserved.
