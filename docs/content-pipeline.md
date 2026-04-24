# Content Pipeline

## Goal

Make parody prompt generation cheap, scalable, and easy for open-source contributors to swap between providers when better models become available.

The runtime game is designed around shared rounds. One generated or curated prompt can serve every player in an hourly room, so player traffic mostly affects SQLite writes and WebSocket fanout rather than model spend.

## Recommendation

Do not generate prompts during gameplay.

Instead:

1. Run `bun run generate:posts` out of band.
2. Send generation requests to OpenRouter or a direct OpenAI-compatible API out of band.
3. Store approved candidates in SQLite with metadata:
   - category
   - persona
   - internal model metadata for cost/debugging
   - prompt template version
   - source model
   - moderation status
4. Keep runtime gameplay on stored prompts only.

Do not generate synchronously when a player opens the game. If the provider is slow, down, rate-limited, or returns malformed JSON, a live player should never feel that failure. Use generation as a cron/backfill job that keeps a buffer of future prompts.

For a no-provider baseline, the repo also has procedural archive tooling:

```bash
bun run archive:generate
bun run archive:schedule
```

The default target is `24 * 365 * 10 = 87,600` approved posts and 87,600 hourly rounds.

For a batched AI archive:

```bash
AI_API_KEY=sk-or-... bun run archive:estimate-ai
AI_API_KEY=sk-or-... bun run archive:generate-ai -- --count=87600 --batch-size=25
bun run archive:schedule
```

## Why this is cheaper

- Gameplay stays read-only and cache-friendly.
- Generation costs scale with content creation, not player traffic.
- You can start with OpenRouter's `openai/gpt-5.4-nano`, route to DeepSeek when useful, or point directly at a provider.
- A gateway can be added later for centralized logging, retries, and provider failover without coupling the app to one vendor.

## Runtime Shape

- A single Bun process serves HTTP, static assets, and WebSockets.
- SQLite stores generated posts, rounds, and submissions.
- There is one authoritative public hourly round.
- The public API exposes contest start/end metadata so the UI can show the archive countdown.
- Submissions are hidden until the round reveals.
- After reveal, the server publishes aggregate author pick distributions.

## Suggested provider interface

Keep the app provider-neutral by treating the model endpoint as a configurable base URL.

Environment variables:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_MODEL_ID`

Defaults for the batched archive generator:

- `AI_BASE_URL=https://openrouter.ai/api/v1`
- `AI_MODEL=openai/gpt-5.4-nano`
- `AI_MODEL_ID=openai/gpt-5.4-nano`

For direct DeepSeek one-off generation, `scripts/generate-posts.js` still defaults to:

- `AI_BASE_URL=https://api.deepseek.com`
- `AI_MODEL=deepseek-chat`
- `AI_MODEL_ID=deepseek-v3-2`

That makes it easy to run against direct DeepSeek API today and swap to DeepSeek V4 or a gateway later.

## Rough future shape

- `scripts/generate-ai-archive.js` for batched archive generation
- `scripts/generate-posts.js` for small one-off direct-provider generation
- `admin/review` for dedupe and moderation
- provider fallback for official DeepSeek V4 when available
