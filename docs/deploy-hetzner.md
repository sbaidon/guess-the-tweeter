# Hetzner Deploy Notes

This MVP is intentionally small enough for one Hetzner VM.

## Runtime

- Bun `1.3.9` or newer
- SQLite file stored on the VM disk
- One Bun process for static assets, API, and WebSockets
- Reverse proxy with HTTPS in front of the Node process

## Environment

- `PORT=8787`
- `DATABASE_PATH=/var/lib/guess-the-tweeter/guess-the-tweeter.sqlite`
- `ADMIN_TOKEN=<long random token>`

## Process

```bash
bun install --frozen-lockfile
bun run build
bun start
```

For a durable setup, run the process under `systemd` and proxy traffic with Caddy or nginx.

## Scaling Boundary

This should be fine for the early version because the expensive work is offline content generation. The first pressure point will be WebSocket fanout, not AI cost. When that happens, split the live updates behind Redis pub/sub or move rooms onto separate app instances.
