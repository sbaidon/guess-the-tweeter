# Hetzner Deploy Runbook

This app is designed to run as one Bun process behind a reverse proxy. Gameplay should stay cheap: SQLite read/write plus WebSocket fanout. AI generation stays offline.

## Target Layout

- App checkout: `/opt/guess-the-tweeter/current`
- Environment file: `/etc/guess-the-tweeter/guess-the-tweeter.env`
- SQLite data: `/var/lib/guess-the-tweeter/guess-the-tweeter.sqlite`
- Backups: `/var/backups/guess-the-tweeter`
- App bind: `127.0.0.1:8787`
- Public proxy: Caddy on `80/443`; port `80` only redirects to HTTPS

## First Server Setup

```bash
sudo adduser --system --group --home /opt/guess-the-tweeter guess
sudo mkdir -p /opt/guess-the-tweeter /etc/guess-the-tweeter /var/lib/guess-the-tweeter /var/backups/guess-the-tweeter
sudo chown -R guess:guess /opt/guess-the-tweeter /var/lib/guess-the-tweeter /var/backups/guess-the-tweeter
```

Install Bun system-wide or ensure `/usr/local/bin/bun` points to the Bun binary used by systemd.

```bash
curl -fsSL https://bun.sh/install | bash
sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
```

## App Deploy

```bash
sudo -u guess git clone https://github.com/sbaidon/guess-the-tweeter.git /opt/guess-the-tweeter/current
cd /opt/guess-the-tweeter/current
sudo -u guess bun install --frozen-lockfile
sudo -u guess bun run typecheck:server
sudo -u guess bun run build
```

Create `/etc/guess-the-tweeter/guess-the-tweeter.env` from `deploy/env/guess-the-tweeter.env.example`.

Required production values:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=8787
DATABASE_PATH=/var/lib/guess-the-tweeter/guess-the-tweeter.sqlite
BACKUP_DIR=/var/backups/guess-the-tweeter
ADMIN_TOKEN=replace-with-a-long-random-token
TRUST_PROXY=true
SUBMISSION_RATE_LIMIT_WINDOW_MS=60000
SUBMISSION_RATE_LIMIT_MAX=20
ROOM_SNAPSHOT_INTERVAL_MS=2000
REQUEST_LOG_SAMPLE_RATE=0
MAX_JSON_BODY_BYTES=8192
CONTEST_YEARS=10
```

## systemd

```bash
sudo cp deploy/systemd/guess-the-tweeter.service /etc/systemd/system/
sudo cp deploy/systemd/guess-the-tweeter-backup.service /etc/systemd/system/
sudo cp deploy/systemd/guess-the-tweeter-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now guess-the-tweeter.service
sudo systemctl enable --now guess-the-tweeter-backup.timer
```

Useful commands:

```bash
sudo systemctl status guess-the-tweeter
sudo journalctl -u guess-the-tweeter -f
sudo systemctl restart guess-the-tweeter
sudo systemctl list-timers | grep guess-the-tweeter
```

## Reverse Proxy

Caddy is the simplest option because it handles TLS automatically.

```bash
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/guess-the-tweeter.example.com/YOUR_DOMAIN/g' /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

If using nginx, copy `deploy/nginx/guess-the-tweeter.conf`, replace the domain, enable the site, and put Certbot or another TLS layer in front of it.

## Health Check

The app exposes:

```bash
curl -fsS http://127.0.0.1:8787/healthz
```

Expected shape:

```json
{
  "ok": true,
  "uptimeSeconds": 123,
  "languages": ["en", "es", "fr", "pt", "de"],
  "sockets": 0,
  "rateLimitBuckets": 0
}
```

## Realtime Behavior

Submissions update durable SQLite aggregate counters in `round_totals` and `round_author_counts`. WebSocket clients do not receive one event per vote. Instead, rooms are marked dirty and the server sends compact `round:snapshot` payloads at `ROOM_SNAPSHOT_INTERVAL_MS`.

This keeps the hot path predictable:

- One idempotent submission insert per player.
- One aggregate counter increment for a new vote.
- One batched snapshot fanout per dirty language room.
- No result scans over raw submissions during live play or reveal.

## Backups

Manual backup:

```bash
sudo -u guess env DATABASE_PATH=/var/lib/guess-the-tweeter/guess-the-tweeter.sqlite BACKUP_DIR=/var/backups/guess-the-tweeter bun run db:backup
```

The included systemd timer runs this hourly. Ship `/var/backups/guess-the-tweeter` off-box with restic, rsync, Hetzner Storage Box, or object storage. A local-only backup is not enough.

Restore flow:

```bash
sudo systemctl stop guess-the-tweeter
sudo -u guess env DATABASE_PATH=/var/lib/guess-the-tweeter/guess-the-tweeter.sqlite bun run db:restore -- --file=/var/backups/guess-the-tweeter/backup.sqlite --force
sudo systemctl start guess-the-tweeter
```

## Updating

```bash
cd /opt/guess-the-tweeter/current
sudo -u guess git pull --ff-only
sudo -u guess bun install --frozen-lockfile
sudo -u guess bun run typecheck:server
sudo -u guess bun run build
sudo systemctl restart guess-the-tweeter
curl -fsS http://127.0.0.1:8787/healthz
```

## Load Testing

Run the built-in mixed load test against localhost first:

```bash
bun run load:test -- --url=http://127.0.0.1:8787 --ws-clients=250 --votes=1000 --duration=60 --concurrency=50
```

Then point the same test at the public URL:

```bash
bun run load:test -- --url=https://YOUR_DOMAIN --ws-clients=1000 --votes=5000 --duration=120 --concurrency=100
```

The test opens WebSockets across language rooms, submits unique votes, waits for `round:snapshot` messages, and reports HTTP vote latency plus snapshot lag. Use multiple load-generator machines for large tests; one laptop cannot simulate huge socket counts reliably.

## Current Scaling Boundary

One VM is fine for early traffic. The first likely pressure point is WebSocket fanout, not AI cost. If one process stops being enough, split live rooms across instances and add Redis pub/sub or another shared broadcast layer.
