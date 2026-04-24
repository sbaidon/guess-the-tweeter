# Guess the Tweeter

A React + Vite parody trivia game using TanStack Router, with selective TSRX components for the routed layout and landing pages. Players join shared hourly rounds, submit picks, and see the crowd distribution after reveal.

## Current shape

- TanStack Router navigation for live play and archives
- TSRX wired into the Vite build for incremental adoption
- Home page plus `/play` for the current live round
- `/archive` for revealed past rounds
- Hidden prompt genres for mixed feed, tech, politics, sports, celebrities, and random people
- Shared hourly rounds backed by SQLite
- WebSocket updates for live pick counts and reveals
- Author guesses for one shared hourly live round
- Live voting close/reveal countdown and aggregate winner totals
- One authoritative public contest per hour
- OpenAI-compatible offline generation workers
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
- Use OpenRouter or a direct OpenAI-compatible provider for offline generation
- Generate candidate posts in the background and write approved prompts into SQLite
- Keep the runtime app stateless and cheap; the expensive part happens asynchronously
- Avoid synchronous generation in the player request path

Generate approved posts:

```bash
DEEPSEEK_API_KEY=sk-... bun run generate:posts -- --count=12
```

Estimate and generate a larger AI archive through OpenRouter:

```bash
AI_API_KEY=sk-or-... bun run archive:estimate-ai
AI_API_KEY=sk-or-... bun run archive:generate-ai -- --count=87600 --batch-size=25
bun run archive:schedule
```

Generate and schedule a full 10-year procedural archive:

```bash
bun run archive:generate
bun run archive:schedule
```

That creates `24 * 365 * 10 = 87,600` approved post candidates and schedules the same number of hourly rounds in SQLite. Runtime gameplay still only reads the current scheduled hour.

Useful one-off generation environment variables:

- `AI_BASE_URL` defaults to `https://api.deepseek.com`
- `AI_MODEL` defaults to `deepseek-chat`
- `AI_MODEL_ID` defaults to `deepseek-v3-2`
- `GENERATE_CATEGORY` can be `all`, `tech`, `politics`, `sports`, `celebrities`, or `random`

Useful archive generation environment variables:

- `AI_BASE_URL` defaults to `https://openrouter.ai/api/v1`
- `AI_MODEL` defaults to `openai/gpt-5.4-nano`
- `AI_MODEL_ID` is stored as internal generation metadata only
- `AI_ARCHIVE_CATEGORY` can be `all`, `tech`, `politics`, `sports`, `celebrities`, or `random`
- `AI_BATCH_SIZE` defaults to `25`

There is a more detailed note in [docs/content-pipeline.md](./docs/content-pipeline.md).

## Easy next steps

- Add a lightweight review screen for generated candidates
- Persist scores in local storage or a backend
- Add provider fallback for DeepSeek V4 when it is officially available
