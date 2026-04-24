# Content Pipeline

## Goal

Make parody prompt generation cheap, scalable, and easy for open-source contributors to swap between providers.

## Recommendation

Do not generate prompts during gameplay.

Instead:

1. Queue batch generation jobs out of band.
2. Send those jobs through an OpenAI-compatible gateway or proxy layer.
3. Store generated candidates with metadata:
   - category
   - persona
   - prompt template version
   - model
   - estimated cost
   - moderation status
4. Deduplicate and moderate candidates.
5. Promote approved prompts into the published dataset that the game serves.

## Why this is cheaper

- Gameplay stays read-only and cache-friendly.
- Generation costs scale with content creation, not player traffic.
- You can route cheap models for ideation and slightly better models only for repair or curation.
- A gateway gives you centralized logging, retries, and provider failover without coupling the app to one vendor.

## Suggested provider interface

Keep the app provider-neutral by treating the model endpoint as a configurable base URL.

Environment variables:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

That makes it easy to run against a direct provider API, an AI gateway, or a self-hosted compatible endpoint.

## Rough future shape

- `generator/queue` for batch job creation
- `generator/run` for model calls
- `generator/review` for dedupe and moderation
- `content/publish` for promoting approved prompts into the playable pool
