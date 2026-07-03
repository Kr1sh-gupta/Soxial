# Soxial

**An AI social media manager that researches your accounts, learns your voice, builds your growth strategy, and executes — with your approval at every step.**

Submission for It's Today Media — Marketing Development Engineer Build Challenge
By Hossain Jahed

---

## Download

| Platform | Download | Size | Instructions |
|----------|----------|------|--------------|
| **Linux** (AppImage) | [Soxial-0.1.2.AppImage](https://github.com/rabden/Soxial/releases/download/v0.1.2/Soxial-0.1.2.AppImage) | ~187 MB | `chmod +x Soxial-0.1.2.AppImage && ./Soxial-0.1.2.AppImage` |
| **Linux** (deb) | [soxial_0.1.2_amd64.deb](https://github.com/rabden/Soxial/releases/download/v0.1.2/soxial_0.1.2_amd64.deb) | ~143 MB | `sudo dpkg -i soxial_0.1.2_amd64.deb` |
| **macOS** (Apple Silicon) | [Soxial-0.1.2-arm64.dmg](https://github.com/rabden/Soxial/releases/download/v0.1.2/Soxial-0.1.2-arm64.dmg) | ~180 MB | Open dmg → drag to Applications. First launch: right-click → Open (unsigned) |
| **Windows** | [Soxial.Setup.0.1.2.exe](https://github.com/rabden/Soxial/releases/download/v0.1.2/Soxial.Setup.0.1.2.exe) | ~147 MB | Run installer. SmartScreen warning → "More info" → "Run anyway" |

> **Loom walkthrough**: [https://youtu.be/vRNKqhSeWgY](https://youtu.be/vRNKqhSeWgY)

**Why the security warnings?** The app is unsigned (no $99/yr Apple Developer cert or Windows code signing cert). The binaries are built via GitHub Actions CI from the source in this repo — you can verify the build yourself. macOS: right-click → Open to bypass Gatekeeper. Windows: click "More info" → "Run anyway" to bypass SmartScreen.

To run from source instead:

```bash
npm install
npm run dev
```

Requires a free [Google AI Studio API key](https://aistudio.google.com/apikey). X and Reddit are optional — the agent works with whatever accounts you connect.

---

## The three questions

### 1. What does this tool do?

Soxial is a desktop application that acts as a personal social media manager for X/Twitter and Reddit. You talk to it in a chat interface like you would a real person managing your accounts.

**The 5-minute onboarding is the core of it.** You answer a few questions about who you are and what you want. The AI then:

- Connects to your X and Reddit accounts (via cookie-based CLI tools — no API approvals, no rate-limit walls)
- Pulls your posts, replies, engagement metrics, who you follow, what you like
- Analyzes your actual writing voice — vocabulary, sentence structure, humor, quirks
- Asks you 4-8 targeted questions about gaps it can't infer (risk tolerance, time budget, what you want to be known for)
- Builds a complete growth operating system: positioning document, content pillars, hook library, target accounts, voice rules, baseline metrics, and a starter set of posts/replies

After onboarding, it's a working manager. You can ask it to:

- Research a topic across X and Reddit, find conversation gaps, and draft posts that fill them
- Scan your feed for engagement opportunities and draft replies in your voice
- Track your follower growth, identify what content is working, and adapt the strategy
- Generate images for posts when visuals help
- Propose the next best action — and wait for your approval before doing anything public

**The approval system is non-negotiable.** Every post, reply, comment, like, follow — the agent shows you exactly what it's about to do, and waits. It can research and draft autonomously, but it never touches a public-facing action without a yes.

### 2. Why did you build THIS one?

I'll be direct about the reasoning, because I think the "why" matters more than the "what."

**I started with a skill, not an app.** A few months ago I open-sourced [a multi-platform social media manager skill](https://github.com/rabden/X-twitter-social-manager-skill) — a detailed prompt/guide that turned any AI coding agent (Claude Code, OpenCode, Cursor) into a social media manager. It worked. People used it. But it had a ceiling:

- It depended on whatever IDE the user happened to run. No IDE, no manager.
- Memory was markdown files. Lose a file, lose the strategy.
- The agent couldn't run its own loop — it was reactive to whatever the user typed next.
- No real UI. No onboarding flow. No way to show rich content inline.

**Soxial is that skill, rebuilt as a real system.** The architecture decisions are deliberate:

- **A dedicated agent loop** — the app has its own Gemini-powered agent with streaming responses, tool calls, and thinking. It doesn't piggyback on Claude or Cursor. It runs the show.
- **Persistent SQLite, not markdown** — profile, memory, hooks, pillars, targets, voice rules, social content archive. Structured, queryable, survives restarts.
- **CLI integration, not browser scraping** — I use `twitter-cli` and `rdt-cli` for fast, JSON-structured platform access. Cookie-based auth means no API approval gauntlets, no rate-limit walls on day one.
- **Rich content rendering** — when the agent shows you a tweet, it renders an actual tweet card with live data. When it proposes a reply, you see the original post and your reply side by side. This isn't a text dump; it's a working interface.

**But here's the actual answer to "why this one":**

I'm an engineer who taught himself marketing by building tools for it. I didn't start with a marketing background — I started with the observation that social media management is a problem that breaks down cleanly into research, voice modeling, strategy, and execution. Each of those is a thing an AI agent can do well *if* it has the right structure.

So I built the structure. The skill was version one — a proof that the workflows made sense. Soxial is version two — a proof that the workflows can run as a real product.

I built this specific tool because I believe the pattern generalizes. The agent loop, the tool system, the memory, the approval flow — none of that is specific to X and Reddit. It's a marketing operations framework that happens to be pointed at social platforms today. Point it at ad platforms tomorrow and it's the same system doing different work.

That's the bet I'm making with this submission.

### 3. What would you build next if this were your full-time job?

I'll be specific, because vague vision statements are useless.

**The framing:** It's Today Media advertises at scale across Google, Meta, Taboola, and TikTok. The money is made and lost in paid media. Soxial today manages the organic side — the brand-building, the audience research, the trust that makes landing pages convert. The next moves close the loop between organic and paid.

**1. Ad platform connectors — the immediate priority.**

The agent loop in Soxial already executes 60+ tools against X, Reddit, and a local strategy database. Adding ad platform tools is incremental, not a rebuild. I'd build read-only connectors first:

- **Google Ads / Meta Ads / TikTok Ads APIs** — pull campaign structure, spend, CTR, CPA, creative performance
- **Taboola** — content recommendation performance, which placements convert

Once the agent can see ad performance, it can do what it already does for social: surface what's working, flag what's fatiguing, and recommend the next move. Same loop, new data sources.

**2. Creative generation pipeline.**

This is where organic and paid converge. The agent already knows the user's voice, positioning, and what content resonates. Extend that into ad creative:

- Generate headline + body copy variations for ad sets, grounded in the voice model
- Generate landing page copy (hook, social proof, CTA) that matches the ad's promise
- A/B test tracking — feed results back into memory so the agent learns what converts, not just what gets likes

The insight: ad creative that sounds like a real person (because it's modeled on the user's actual writing) outperforms generic copy. Soxial already builds that voice model. Extending it to paid creative is the natural next step.

**3. Unified performance view.**

A single surface where the team sees organic signals (engagement, follower growth, audience sentiment from X/Reddit) alongside paid metrics (CTR, CPA, ROAS from the ad platforms). The agent connects the two: "Your post about X got 3x normal engagement. Your ads mentioning X are also outperforming. Here's why, and here's what to do next."

**The longer bet:**

A marketing operating system where one agent understands the brand, the audience, the ad spend, and the landing pages — and coordinates them. Not five disconnected tools. One system that knows the whole funnel and acts on it.

I'm not pretending this is a week's work. I'm saying it's the direction, and Soxial's architecture is built to move that way.

---

## How I think about marketing

You said the best submission demonstrates "a true understanding of marketing." I won't pretend to be a veteran media buyer. I'm an engineer who learned marketing by building things and studying what works. Here's what I've learned, and where I think the leverage is:

**Social presence is the top of a media buyer's funnel.** Paid traffic hits a landing page. That page converts better when the person behind it has credibility — an active X account with real takes, Reddit comments that show expertise, a track record a prospect can verify in 30 seconds. Organic brand-building isn't separate from media buying; it's the trust layer that makes paid spend efficient.

**Audience intelligence flows both ways.** When the agent reads X and Reddit conversations, it learns what the audience actually cares about — the language they use, the objections they raise, the problems they describe. That intelligence is exactly what makes ad targeting and landing page copy sharper. The same data that informs a good tweet informs a good ad.

**Creative fatigue is the silent margin killer.** Ad performance decays. The teams that win are the ones who can generate, test, and iterate creative fastest. An agent that can produce on-voice, on-brand variations at speed — and learn from which ones convert — is direct margin.

**The boring truth:** most marketing teams don't lack strategy. They lack execution speed. They know what to do; they can't do it fast enough across enough platforms. That's the gap an AI agent closes. Not by being smarter than the team, but by doing the work the team doesn't have hours for.

I built Soxial to test that thesis on the organic side. It works. I'd build the paid side next.

---

## Architecture (for the engineers reading)

```
soxial/
├── electron/main/
│   ├── index.ts                    # App entry, IPC handlers, onboarding orchestration
│   ├── agent.ts                    # Gemini agent loop: streaming, tool execution, thinking
│   ├── agent-system-prompt.ts      # Main chat agent system prompt
│   ├── onboarding-system-prompt.ts # Onboarding agent system prompt (6-phase strategy build)
│   ├── tools.ts                    # 60+ tool definitions (X, Reddit, strategy, memory, image gen)
│   ├── cli.ts                      # twitter-cli / rdt-cli wrapper (uv-installed, cookie auth)
│   ├── db.ts                       # SQLite schema + queries (better-sqlite3, WAL mode)
│   ├── puter.ts                    # Image generation: Gemini primary, Puter.js fallback
│   └── social-content.ts           # Auto-archive of fetched posts/replies/comments
├── electron/preload/
│   └── index.ts                    # contextBridge IPC surface
├── src/components/
│   ├── Onboarding.tsx              # Multi-step wizard (welcome → identity → API key → platforms → AI onboarding)
│   ├── Chat.tsx                    # Chat interface: streaming, tool steps, questions, sessions
│   ├── rich-content.tsx            # Parser/renderer for :::tweet-card, :::reddit-post, etc.
│   └── ui/                         # tweet-card, reddit-post-card, prompt-input, question-input
└── package.json
```

**Key design decisions:**

- **Tool-per-action, not one mega-function.** Each platform capability is its own tool with a Zod schema, so the agent learns the interface and the system stays auditable. Adding a new platform means adding tools — the loop doesn't change.
- **Approval as a first-class concept.** The agent can research and draft freely. Every public-facing action goes through the user. This is enforced at the tool level, not just the prompt level.
- **Structured memory, not prompt stuffing.** Strategy data lives in typed tables (hooks, pillars, voice rules, targets, milestones, memory entries). The agent queries what it needs instead of loading everything into context.
- **Two agent modes.** The onboarding agent builds the strategy from scratch (60-step budget, bulk saves). The chat agent operates on it day-to-day. Same loop, different system prompts and tool emphasis.

---

## Who I am

I'm Hossain Jahed. I'm an engineer who builds tools and learns the domain by building.

I'm based outside the US and applying as an exceptional non-US candidate. I work East Coast business hours. I'm ready to start full-time immediately. The work above is my case for why that exception is worth making.

**Things I've shipped:**

- **[Soxial](https://github.com/rabden/soxial)** (this submission) — AI social media manager. Electron + React + Gemini agent loop.
- **[X-twitter-social-manager-skill](https://github.com/rabden/X-twitter-social-manager-skill)** — the open-source skill that Soxial grew out of. Multi-platform social media manager for any AI coding agent.
- **[Hone Compose](https://github.com/rabden/hone-compose)** — a free Chrome extension. A better alternative to Grammarly for people who want clean writing help without the subscription.
- **[Webhook SMS Forwarder](https://github.com/rabden/webhook-smsforwarder)** — a modern Android app (Kotlin) that forwards SMS messages to webhooks. Built for automation workflows.

I ship publicly because I believe in standing behind work. Every project above is out there, working, and mine.

**What I want:** To build the marketing tools that make a real team faster. I'm not here for the $5,000 (though I won't pretend it doesn't help). I'm here because this is the exact job I want — building AI systems that solve real marketing problems at scale. If that's what you need, I'm ready.

---

## Quick start (for anyone who wants to run it)

```bash
# Clone and install
git clone https://github.com/rabden/soxial.git
cd soxial
npm install

# Run in development
npm run dev

# Or build a distributable
npm run dist
```

You'll need:
- Node.js 20+
- A free [Google AI Studio API key](https://aistudio.google.com/apikey)
- (Optional) Logged-in X and Reddit browser sessions for platform features

The app stores everything locally — SQLite database in the Electron user data directory. No cloud, no account, no tracking.

---

*Built with TypeScript, Electron, React, SQLite, and Google Gemini AI.*
