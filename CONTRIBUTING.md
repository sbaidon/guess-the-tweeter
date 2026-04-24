# Contributing

## Setup

```bash
npm install
npm run dev
```

## Guidelines

- Keep category routes stable unless there is a migration plan
- Treat prompt generation as an offline pipeline, not a gameplay dependency
- Prefer small, reviewable pull requests
- Document any new content source or model provider in `docs/content-pipeline.md`

## Before opening a pull request

- Run `npm run build`
- Update docs if the public interface, routes, or content pipeline changes
