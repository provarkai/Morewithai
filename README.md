# MoreWithAI

**AI-powered content management platform** — from research to revenue, fully automated.

MoreWithAI is a full-stack Next.js blog CMS that uses AI at every stage: research, writing, SEO optimization, content refresh, monetization, and growth analytics. Built with Next.js 14, Prisma (PostgreSQL), Tailwind CSS, and shadcn/ui.

---

## Features

### Content Pipeline
- **RSS Feed Ingestion** — Auto-fetch articles from RSS feeds with configurable refresh schedules
- **AI Rewriting** — Multi-step pipeline: research → outline → generate → SEO → quality → links → taxonomy
- **Rich Text Editor** — TipTap-based editor with AI panels, version history, and autosave
- **Workflow State Machine** — Fetched → Draft → Review → Approved → Scheduled → Published
- **Content Refresh** — AI monitors content freshness and suggests/automates rewrites

### AI Features (Tier 1)
- **Content Repurposing** — Transform articles into Twitter threads, LinkedIn posts, email newsletters, YouTube scripts, Instagram captions, Product Hunt launches
- **Smart Scheduler** — Analyzes 90 days of traffic to recommend optimal publish times
- **A/B Test Headlines** — Generate 4 headline variants, track CTR, auto-pick winner
- **Reader Engagement Scoring** — Track scroll depth, time-on-page, classify readers into 6 segments
- **Real-time Collaboration** — Y.js/CRDT session management with cursor awareness

### AI Features (Tier 2)
- **Internal Linking** — AI finds relevance-scored linking opportunities across all published articles
- **Content Briefs** — Generate comprehensive writing briefs with outlines, competitor analysis, FAQ schemas
- **Multi-Language Translation** — Translate to 13 languages with localized SEO and hreflang tags
- **Voice-to-Content** — Record audio → Whisper transcription → AI writes polished articles
- **Visual Content Generator** — Generate DALL-E/Stable Diffusion prompts for 6 template types

### Monetization (Tier 4)
- **Paid Newsletters** — Stripe-gated premium content tiers (Monthly/Yearly/Lifetime)
- **Course Builder** — Create and sell digital courses with chapters, lessons, enrollment tracking
- **Affiliate Link Cloaking** — Smart URL cloaking with auto FTC disclosure and A/B testing
- **Sponsored Marketplace** — Connect brands with publishers for paid guest posts
- **White-Label Portal** — Agencies manage multiple client blogs with custom branding

### Platform (Tier 3)
- **Performance Alerts** — Automated scanning for traffic drops, revenue declines, CTR changes
- **Bulk Operations** — Multi-select articles for batch tag/category/status changes
- **Content Audit Trail** — Full timeline of changes with field-level diffs
- **Custom Dashboard Widgets** — Configurable widget grid with 10+ data providers
- **Webhook Builder** — 11 event types, test delivery, delivery logs

### Growth & Analytics
- **Traffic Analytics** — Page views, visitors, sessions with source/device breakdowns
- **SEO Analysis** — AI-powered SEO scoring with actionable recommendations
- **Content Classification** — STAR / HIGH_POTENTIAL / STABLE / DECLINING / LOW_VALUE tiers
- **Revenue Forecasting** — Trend-based projections with confidence levels
- **Business Goals Engine** — Goal evaluation, health scoring, AI-generated strategies
- **Content Intelligence Dashboard** — Unified view of classification, gaps, forecasts, and quality

### Technical Features
- **Multi-Site SaaS** — Organization-scoped sites with role-based access (ADMIN/EDITOR/AUTHOR)
- **Email System** — Resend/SendGrid providers with campaigns, automations, and lead magnets
- **Stripe Integration** — Products, subscriptions, checkout, and webhook handling
- **Public Blog** — SEO-optimized public blog with sitemaps, author/category/tag archives
- **Content Decay Detection** — Automatic freshness scoring with refresh recommendations
- **Competitor Intelligence** — Track competitors, pages, and content changes
- **Content Orchestrator** — Priority and ROI engines for automated content scheduling
- **Agent Audit Logging** — Every AI call logged with prompt, model, tokens, and latency

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router, standalone output) |
| **Language** | TypeScript (strict mode) |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | Custom session-based with bcrypt, SameSite cookies |
| **Styling** | Tailwind CSS + shadcn/ui components |
| **Rich Text** | TipTap editor |
| **AI** | OpenAI/Anthropic via unified client with agent audit |
| **Email** | Resend / SendGrid providers |
| **Payments** | Stripe (checkout, subscriptions, webhooks) |
| **Testing** | Vitest + React Testing Library (159 tests) |
| **Runtime** | Node.js (standalone output) |

---

## Getting Started

```bash
# Install dependencies
bun install

# Set up database
bunx prisma generate
bunx prisma db push

# Start development server
bun run dev
```

### Environment Variables

Required environment variables (see Settings → Environment in the app):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session token hashing (64+ chars) |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional, alternative AI provider) |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `SENDGRID_API_KEY` | SendGrid API key (alternative email provider) |

---

## Project Structure

```
src/
├── app/
│   ├── api/              # 50+ API routes
│   │   ├── ai/           # AI services (repurpose, briefs, translate, voice, visual, etc.)
│   │   ├── auth/         # Login, logout, session, password reset
│   │   ├── articles/     # CRUD, versions, refresh, publish
│   │   ├── bulk/         # Bulk operations
│   │   ├── alerts/       # Performance alerts
│   │   ├── audit/        # Audit trail
│   │   ├── collaboration/ # Real-time editing
│   │   ├── command-center/ # Events, attribution, health, economics
│   │   ├── dashboard-widgets/ # Custom dashboard
│   │   ├── engagement/   # Reader engagement tracking
│   │   ├── marketplace/  # Sponsored content
│   │   ├── monetization/ # Newsletters, courses, affiliate links
│   │   ├── saas/         # White-label, organizations
│   │   └── webhooks/     # Webhook management
│   ├── (public)/         # Public blog routes
│   ├── dashboard/        # Auth-gated dashboard
│   └── page.tsx          # Main app shell with view routing
├── components/
│   ├── editor/           # Article editor (15+ tab panels)
│   ├── views/            # 35+ dashboard views
│   ├── blog/             # Public blog components
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── ai/               # AI client, prompts, services (repurpose, briefs, translation, etc.)
│   ├── alerts/           # Performance alerts
│   ├── audit/            # Audit trail
│   ├── bulk/             # Bulk operations
│   ├── collaboration/    # Real-time editing
│   ├── command-center/   # Dashboard, health, economics
│   ├── competitor/       # Competitor intelligence
│   ├── dashboard/        # Custom widgets
│   ├── email/            # Email providers, templates, automations
│   ├── events/           # Event tracking
│   ├── growth/           # Content gaps, classification, business goals
│   ├── marketplace/      # Sponsored content
│   ├── monetization/     # Newsletters, courses, affiliate cloaking
│   ├── orchestrator/     # Content orchestration, priority, ROI
│   ├── revenue/          # Attribution, forecasting
│   ├── saas/             # Organizations, white-label
│   ├── security/         # HTML sanitization
│   ├── services/         # Publish, rewrite services
│   └── webhooks/         # Webhook builder
├── prisma/
│   └── schema.prisma     # 60+ models, PostgreSQL
└── tests/
    └── setup.ts          # Vitest configuration
```

---

## Database Schema

The Prisma schema defines **60+ models** across these domains:

- **Core** — Site, Article, Author, Category, Tag, RssFeed, Setting
- **Monetization** — Subscriber, Lead, EmailCampaign, CallToAction, AffiliateProgram, Product, AdPlacement, RevenueEvent
- **Growth** — TrafficMetric, SearchMetric, ContentOpportunity, TopicCluster, SocialPost, ContentCalendarEvent
- **AI** — AiJob, ContentRefresh, ContentDecayScore, ContentEconomics, AgentAudit
- **SaaS** — Organization, UserAccess, ContentJob, ApprovalTask, ScheduledTask, Webhook, ApiKey
- **Analytics** — DashboardSnapshot, BusinessHealthScore, NextBestAction, RevenueForecast, ProfitSnapshot
- **Orchestration** — Workflow, WorkflowVersion, WorkflowStep, WorkflowRun, Agent, AgentRun
- **Marketplace** — Competitor, CompetitorPage, CompetitorChange
- **Billing** — Plan, Subscription, Entitlement, UsageCounter, BillingEvent, Invoice

---

## API Routes (50+)

| Category | Routes |
|----------|--------|
| **Auth** | `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`, `/api/auth/reset` |
| **Articles** | `/api/articles`, `/api/articles/[id]`, `/api/articles/[id]/versions`, `/api/articles/[id]/refresh` |
| **AI** | `/api/ai/repurpose`, `/api/ai/smart-schedule`, `/api/ai/headline-ab`, `/api/ai/content-brief`, `/api/ai/translate`, `/api/ai/voice-to-content`, `/api/ai/visual-content`, `/api/ai/internal-links`, `/api/ai/quality-memory` |
| **Monetization** | `/api/monetization/newsletters`, `/api/monetization/courses`, `/api/monetization/affiliate-links` |
| **Platform** | `/api/alerts`, `/api/bulk`, `/api/audit`, `/api/dashboard-widgets`, `/api/webhooks` |
| **Collaboration** | `/api/collaboration` |
| **Command Centre** | `/api/command-center/events`, `/api/command-center/attribution`, `/api/command-center/dashboard`, `/api/command-center/health`, `/api/command-center/competitors`, `/api/command-center/workflows`, `/api/command-center/agents`, `/api/command-center/economics` |
| **Engagement** | `/api/engagement` |
| **Marketplace** | `/api/marketplace/sponsorships` |
| **SaaS** | `/api/saas/white-label` |
| **Stripe** | `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/subscription` |

---

## Testing

```bash
# Run all tests
bunx vitest run

# Run specific test file
bunx vitest run src/lib/articles/workflow.test.ts
```

**159 tests** across 10 test files covering:
- Article workflow state machine (56 tests)
- RBAC permissions (25 tests)
- HTML sanitization / XSS prevention (19 tests)
- Email templates (13 tests)
- Rate limiting (10 tests)
- Content editor stats (10 tests)
- Auth (token hashing, CSRF, webhook signatures) (8 tests)
- Password hashing (bcrypt) (10 tests)
- Email HTML-to-text (5 tests)
- Tailwind class merging (3 tests)

---

## Deployment

### Freebuff Cloud (Managed)
The app is configured for Freebuff's managed hosting with standalone Next.js output.

### Self-Hosted
```bash
bun run build       # Next.js standalone build
bun run start       # Production server
```

---

## License

Private — All rights reserved.
