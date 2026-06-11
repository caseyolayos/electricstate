# Electric State Passport ⚡

Your passport to the Electric State — discover shows, check in, earn status.

## Stack

- **Next.js 14** App Router
- **TypeScript**
- **Tailwind CSS** with custom electric/neon palette
- **PWA-ready** (manifest.json, meta tags)
- **Mock/local data** — no APIs needed
- **localStorage** persistence via React Context

## Screens

| Route | Description |
|-------|-------------|
| `/` | Hero landing with animated gradient, feature cards, featured events |
| `/events` | Full event grid with search + genre filters |
| `/events/[id]` | Event detail with check-in, save, lineup |
| `/submit` | Community event submission form (+50 XP) |
| `/passport` | User profile — XP bar, badges, saved events, history |
| `/admin` | Pending event review — approve / reject / verify |

## XP & Levels

| Level | XP Range | Title |
|-------|----------|-------|
| 1 | 0–249 | Newcomer |
| 2 | 250–599 | Scene Regular |
| 3 | 600–999 | Underground Local |
| 4 | 1000+ | Electric State Native |

## Badges

| Badge | Condition |
|-------|-----------|
| ⚡ Early Supporter | Awarded on first load |
| 🎫 First Check-In | Check in to any event |
| 🎵 Scene Regular | Attend 3+ events |
| 🔌 Plugged In | Save 5+ events |
| 🏭 Warehouse Survivor | Check in at a warehouse venue |
| 🏠 House Head | Check in to 2+ house events |
| 🔊 Bass Addict | Check in to 2+ bass events |

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

```bash
npx vercel@latest --prod --yes
```
