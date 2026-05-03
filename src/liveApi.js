export function getClientId() {
  const storageKey = "guess-the-tweeter-client-id";
  const existingId = window.localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const nextId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(storageKey, nextId);
  return nextId;
}

export async function fetchCurrentRound(category, clientId, language = "en", signal, identity) {
  const params = new URLSearchParams({ category, clientId, language });
  if (identity) params.set("identity", identity);
  const response = await fetch(`/api/rounds/current?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error("Could not load the current round.");
  }

  return response.json();
}

export async function submitRoundPick(roundId, payload) {
  const response = await fetch(`/api/rounds/${encodeURIComponent(roundId)}/submissions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("This round is no longer accepting picks.");
  }

  return response.json();
}

export async function fetchMe({ clientId, identity, signal } = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (identity) params.set("identity", identity);
  const response = await fetch(`/api/players/me?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("Could not load player.");
  }
  return response.json();
}

export async function claimIdentity({ pubkey, signature, nonce, timestamp, fromClientId }) {
  const response = await fetch("/api/players/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pubkey, signature, nonce, timestamp, fromClientId }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claim failed: ${detail || response.status}`);
  }
  return response.json();
}

export async function fetchRoundHistory(limit = 12, language = "en", signal) {
  const params = new URLSearchParams({ limit: String(limit), language });
  const response = await fetch(`/api/rounds/history?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error("Could not load past rounds.");
  }

  return response.json();
}

export async function fetchLeaderboard({ limit = 50, clientId, identity, scope = "all", signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit), scope });
  if (clientId) params.set("clientId", clientId);
  if (identity) params.set("identity", identity);
  const response = await fetch(`/api/leaderboard?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error("Could not load leaderboard.");
  }

  return response.json();
}

export async function revealRound(roundId, adminToken) {
  return adminRequest(`/api/admin/rounds/${encodeURIComponent(roundId)}/reveal`, adminToken);
}

export async function resetRound(roundId, adminToken) {
  return adminRequest(`/api/admin/rounds/${encodeURIComponent(roundId)}/reset`, adminToken);
}

export async function createNextRound(category, adminToken) {
  return adminRequest("/api/admin/rounds/next", adminToken, { category });
}

async function adminRequest(url, adminToken, body = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(adminToken ? { "x-admin-token": adminToken } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? "Admin token rejected." : "Admin action failed.");
  }

  return response.json();
}

export function createRoundSocket(category, language = "en") {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ category, language });
  return new WebSocket(`${protocol}//${window.location.host}/ws?${params.toString()}`);
}
