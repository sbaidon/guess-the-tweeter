# Guess the Tweeter

A React + Vite parody trivia game using TanStack Router, with selective TSRX components for the routed layout and landing pages. Players land on a home page, pick a category route, and then guess which fake internet persona wrote each post.

## Current shape

- TanStack Router navigation with route-based game modes
- TSRX wired into the Vite build for incremental adoption
- Home page plus `/play/:category` routes
- Categories for mixed feed, tech, politics, and sports
- 24 parody prompts with multiple-choice rounds
- Score, streak, accuracy, and deck tracking
- MIT-licensed open-source setup

## Run it

```bash
npm install
npm run dev
```

Recommended runtime: Node `20.19.0` or newer. This repo includes `.tool-versions` for `asdf`.

Build for production:

```bash
npm run build
```

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
