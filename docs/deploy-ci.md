# GitHub Actions Deploy

`.github/workflows/deploy.yml` runs on every push to `main` (and via manual `workflow_dispatch`). It:

1. Builds and typechecks the repo on a GitHub-hosted runner.
2. Adds the runner's public IP to the Hetzner Cloud Firewall SSH allowlist (the runner IP is dynamic on every job).
3. SSHes to the prod box, pulls, installs, builds, restarts the systemd service, and probes `/healthz`.
4. Restores the firewall to admin-only on success **or** failure.

Concurrency is gated on `deploy-prod` so two deploys never overlap.

## Required repository secrets

| Secret | Example | Notes |
|---|---|---|
| `HCLOUD_TOKEN` | `m0tf…fU0D` | Hetzner Cloud API token, scope: read+write. Used to flip firewall rules. |
| `HCLOUD_FIREWALL_ID` | `10886751` | Numeric id of the firewall attached to the prod server. |
| `ADMIN_SSH_CIDR` | `70.184.64.37/32` | The admin's home IP that should keep SSH access between deploys. |
| `PROD_HOST` | `5.161.105.234` | Prod server IPv4 (or hostname). |
| `PROD_USER` | `root` | SSH user. Must have `sudo` (passwordless) for the deploy commands. |
| `PROD_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----` | Private key for the deploy account. **Do not reuse a personal key.** Generate a dedicated CI key (`ssh-keygen -t ed25519 -C github-actions-deploy`) and add the public half to `~PROD_USER/.ssh/authorized_keys` on the box. |

Set them in GitHub: repo → **Settings → Secrets and variables → Actions → New repository secret**.

## Generating a dedicated deploy key

On any local machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gtt-deploy -C "github-actions-deploy" -N ""
cat ~/.ssh/gtt-deploy.pub  # add this to authorized_keys on the box
cat ~/.ssh/gtt-deploy      # paste this into PROD_SSH_KEY secret
```

Then on the prod box, append the public key to the deploy user's `authorized_keys`:

```bash
echo "<paste-public-key>" | sudo tee -a /root/.ssh/authorized_keys
```

(or `~sbaidon/.ssh/authorized_keys` if you prefer a non-root deploy user with sudo).

After that, delete the local copy of the private key — it lives in GitHub now.

## Manual deploy

Trigger an out-of-band deploy from the **Actions** tab → "Deploy" → **Run workflow**. Same flow runs.

## Rolling back

```bash
ssh $PROD_USER@$PROD_HOST
cd /opt/guess-the-tweeter/current
sudo -u guess git log --oneline -10
sudo -u guess git reset --hard <good-sha>
sudo -u guess bun install --frozen-lockfile
sudo -u guess bun run build
sudo systemctl restart guess-the-tweeter
```

Then `git revert` the bad commit on `main` so the next deploy doesn't reintroduce it.

## What to do if the deploy fails mid-flight

The `Restore firewall` step runs unconditionally (`if: always()`), so the SSH allowlist always returns to admin-only. If the run is cancelled hard (e.g. force-cancelled while the runner IP is still allowlisted), use the Hetzner Console or this curl to restore manually:

```bash
HCLOUD_TOKEN=… ADMIN_SSH_CIDR=70.184.64.37/32 FIREWALL_ID=…
jq -n --arg admin "$ADMIN_SSH_CIDR" \
  '{rules: [
     {description: "ssh-admin", direction: "in", port: "22",  protocol: "tcp", source_ips: [$admin]},
     {description: "http",      direction: "in", port: "80",  protocol: "tcp", source_ips: ["0.0.0.0/0", "::/0"]},
     {description: "https",     direction: "in", port: "443", protocol: "tcp", source_ips: ["0.0.0.0/0", "::/0"]}
   ]}' \
| curl -fsS -X POST \
    -H "Authorization: Bearer $HCLOUD_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.hetzner.cloud/v1/firewalls/${FIREWALL_ID}/actions/set_rules" \
    --data-binary @-
```
