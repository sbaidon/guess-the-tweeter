# Guess the Tweeter

A React + Vite parody trivia game using TanStack Router, with selective TSRX components for the routed layout and landing pages. Players join shared hourly rounds, submit picks, and see the crowd distribution after reveal.

## Current shape

- TanStack Router navigation with a single public play route
- TSRX wired into the Vite build for incremental adoption
- Home page plus `/play` for the current live round
- Hidden prompt genres for mixed feed, tech, politics, and sports
- Shared hourly rounds backed by SQLite
- WebSocket updates for live pick counts and reveals
- Author guesses plus a bonus round for guessing which model generated the parody
- One authoritative public contest per hour
- DeepSeek-compatible offline generation worker
- 10-year archive tooling for `87,600` hourly rounds
- MIT-licensed open-source setup

## Run it

```bash
bun install
bun run dev
```

Recommended runtime: Bun `1.3.9` or newer. This repo includes `.tool-versions` for `asdf`.

The dev command starts both the Bun server on `8787` and Vite on `5173`. Vite proxies `/api` and `/ws` to the server.

Build for production:

```bash
bun run build
bun start
```

Production serves the built frontend and API from the same Bun process. SQLite data is written to `data/guess-the-tweeter.sqlite` by default.

## Content generation direction

The cheapest scalable path is not to generate posts during gameplay.

- Serve gameplay from stored prompts only
- Use DeepSeek's OpenAI-compatible API for offline generation by default
- Generate candidate posts in the background and write approved prompts into SQLite
- Keep the runtime app stateless and cheap; the expensive part happens asynchronously

Generate approved posts:

```bash
DEEPSEEK_API_KEY=sk-... bun run generate:posts -- --count=12
```

Generate and schedule a full 10-year procedural archive:

```bash
bun run archive:generate
bun run archive:schedule
```

That creates `24 * 365 * 10 = 87,600` approved post candidates and schedules the same number of hourly rounds in SQLite. Runtime gameplay still only reads the current scheduled hour.

Useful generation environment variables:

- `AI_BASE_URL` defaults to `https://api.deepseek.com`
- `AI_MODEL` defaults to `deepseek-chat`
- `AI_MODEL_ID` defaults to the in-game label `deepseek-v3-2`
- `GENERATE_CATEGORY` can be `all`, `tech`, `politics`, or `sports`

There is a more detailed note in [docs/content-pipeline.md](./docs/content-pipeline.md).

## Easy next steps

- Add a lightweight review screen for generated candidates
- Persist scores in local storage or a backend
- Add provider fallback for DeepSeek V4 when it is officially available
