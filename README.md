# Guess the Tweeter

A React + Vite parody trivia game using TanStack Router, with selective TSRX components for the routed layout and landing pages. Players join shared hourly rounds, submit picks, and see the crowd distribution after reveal.

## Current shape

- TanStack Router navigation with route-based game modes
- TSRX wired into the Vite build for incremental adoption
- Home page plus `/play/:category` routes
- Categories for mixed feed, tech, politics, and sports
- Shared hourly rounds backed by SQLite
- WebSocket updates for live pick counts and reveals
- Author guesses plus a bonus round for guessing which model generated the parody
- Host controls at `/host/:category` for reveal/reset/new round
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
- Use an AI gateway or any OpenAI-compatible proxy for offline batch generation
- Generate candidate posts in the background, dedupe them, moderate them, and promote only approved prompts into the game dataset
- Keep the runtime app stateless and cheap; the expensive part happens asynchronously

There is a more detailed note in [docs/content-pipeline.md](./docs/content-pipeline.md).

## Easy next steps

- Move the parody dataset into JSON or a CMS
- Add timed modes, head-to-head play, or daily challenge routes
- Persist scores in local storage or a backend
- Add a generation worker that writes approved prompts into a published content table
