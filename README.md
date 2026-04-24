# Guess the Tweeter

A React + Vite parody trivia game using TanStack Router, with selective TSRX components for the routed layout and landing pages. Players join shared hourly rounds, submit picks, and see the crowd distribution after reveal.

## Current shape

- TanStack Router navigation for live play and archives
- TSRX wired into the Vite build for incremental adoption
- Home page plus `/play/:language` for the current live round
- `/archive/:language` for revealed past rounds
- Hidden prompt genres for mixed feed, tech, politics, sports, celebrities, and random people
- Multilingual post metadata and generation support
- Shared hourly rounds backed by SQLite
- WebSocket updates for live pick counts and reveals
- Author guesses using real public handles for shared hourly parody rounds
- Live voting close/reveal countdown and aggregate winner totals
- One authoritative public contest per hour per language
- OpenAI-compatible offline generation workers
- 10-year archive tooling for `87,600` hourly slots per language
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
For Hetzner/systemd deployment, reverse proxy config, health checks, and backups, see [docs/deploy-hetzner.md](./docs/deploy-hetzner.md).
The server maintains SQLite aggregate counters for each round and batches WebSocket room updates with `ROOM_SNAPSHOT_INTERVAL_MS` instead of fanning out every vote.

Operational commands:

```bash
bun run typecheck:server
bun run db:backup
bun run db:restore -- --file=/path/to/backup.sqlite --force
bun run load:test -- --url=http://127.0.0.1:8787 --ws-clients=250 --votes=1000 --duration=60
```

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
AI_API_KEY=sk-or-... bun run archive:generate-ai -- --count=87600 --batch-size=25 --language=all
bun run archive:schedule
```

Generate and schedule a full 10-year procedural archive:

```bash
ARCHIVE_LANGUAGE=all bun run archive:generate
bun run archive:schedule
```

That creates `24 * 365 * 10 = 87,600` approved post candidates. Scheduling creates one hourly round per supported language, so the default five-language schedule creates `438,000` round records. Runtime gameplay still only reads the current scheduled hour for the selected language.

Useful one-off generation environment variables:

- `AI_BASE_URL` defaults to `https://api.deepseek.com`
- `AI_MODEL` defaults to `deepseek-chat`
- `AI_MODEL_ID` defaults to `deepseek-v3-2`
- `GENERATE_CATEGORY` can be `all`, `tech`, `politics`, `sports`, `celebrities`, or `random`
- `GENERATE_LANGUAGE` can be `en`, `es`, `fr`, `pt`, or `de`

Useful archive generation environment variables:

- `AI_BASE_URL` defaults to `https://openrouter.ai/api/v1`
- `AI_MODEL_POOL` defaults to a balanced OpenRouter pool across OpenAI, Anthropic, Google, DeepSeek, xAI, Qwen, Mistral, and Meta
- `AI_MODEL` or `--model` can force a single model for a run
- `AI_MODEL_ID` can override the stored model id, but by default each row stores the actual response model
- `AI_ARCHIVE_CATEGORY` can be `all`, `tech`, `politics`, `sports`, `celebrities`, or `random`
- `AI_ARCHIVE_LANGUAGE` can be `all`, `en`, `es`, `fr`, `pt`, or `de`; `all` rotates languages
- `AI_BATCH_SIZE` defaults to `25`

The default balanced pool is:

```text
openai/gpt-5.4-mini,
anthropic/claude-haiku-4.5,
google/gemini-3-flash-preview,
deepseek/deepseek-v3.2,
x-ai/grok-4.1-fast,
qwen/qwen3.6-plus,
mistralai/mistral-large-2512,
meta-llama/llama-4-maverick
```

Multi-model archive runs continue past a failed provider by default. Use `--fail-fast` when you want the first model/provider error to stop the run.
Use `--start-index=N` to resume a long generation job from a deterministic slot without replaying earlier batches.

Scheduling defaults to every supported language:

```bash
bun run archive:schedule
```

Use `SCHEDULE_LANGUAGE=es` or `bun run archive:schedule -- --language=es` when you only want to schedule one language.

There is a more detailed note in [docs/content-pipeline.md](./docs/content-pipeline.md).

## Easy next steps

- Add a lightweight review screen for generated candidates
- Persist scores in local storage or a backend
- Add provider fallback for DeepSeek V4 when it is officially available
