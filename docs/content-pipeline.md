# Content Pipeline

## Goal

Make parody prompt generation cheap, scalable, and easy for open-source contributors to swap between providers when better models become available.

The runtime game is designed around shared rounds. One generated or curated prompt can serve every player in an hourly room, so player traffic mostly affects SQLite writes and WebSocket fanout rather than model spend.

## Recommendation

Do not generate prompts during gameplay.

Instead:

1. Run `bun run generate:posts` out of band.
2. Send generation requests to DeepSeek's OpenAI-compatible API by default.
3. Store approved candidates in SQLite with metadata:
   - category
   - persona
   - exposed `modelId` for the in-game bonus round
   - prompt template version
   - source model
   - moderation status
4. Keep runtime gameplay on stored prompts only.

For a no-provider baseline, the repo also has procedural archive tooling:

```bash
bun run archive:generate
bun run archive:schedule
```

The default target is `24 * 365 * 10 = 87,600` approved posts and 87,600 hourly rounds.

## Why this is cheaper

- Gameplay stays read-only and cache-friendly.
- Generation costs scale with content creation, not player traffic.
- You can start with `deepseek-chat` and swap to DeepSeek V4 once it is officially exposed through the API.
- A gateway can be added later for centralized logging, retries, and provider failover without coupling the app to one vendor.

## Runtime Shape

- A single Bun process serves HTTP, static assets, and WebSockets.
- SQLite stores generated posts, rounds, and submissions.
- There is one authoritative public hourly round.
- The public API exposes contest start/end metadata so the UI can show the archive countdown.
- Submissions are hidden until the round reveals.
- After reveal, the server publishes aggregate author and model pick distributions.

## Suggested provider interface

Keep the app provider-neutral by treating the model endpoint as a configurable base URL.

Environment variables:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_MODEL_ID`

Defaults target DeepSeek:

- `AI_BASE_URL=https://api.deepseek.com`
- `AI_MODEL=deepseek-chat`
- `AI_MODEL_ID=deepseek-v3-2`

That makes it easy to run against direct DeepSeek API today and swap to DeepSeek V4 or a gateway later.

## Rough future shape

- `scripts/generate-posts.js` for generation
- `admin/review` for dedupe and moderation
- provider fallback for official DeepSeek V4 when available
