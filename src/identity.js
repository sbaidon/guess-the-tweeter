const DB_NAME = "guess-the-tweeter-identity";
const STORE = "keys";
const KEY = "ecdsa-p256";

let cached = null;
let openPromise = null;

function openDb() {
  if (openPromise) return openPromise;
  openPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return openPromise;
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function bufToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function importPrivate(jwk) {
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
}

async function load() {
  if (cached) return cached;
  const db = await openDb();
  const stored = await idbGet(db, KEY);
  if (!stored) return null;
  const privateKey = await importPrivate(stored.privateKeyJwk);
  cached = {
    privateKey,
    publicKey: stored.publicKeySpkiBase64,
    privateKeyJwk: stored.privateKeyJwk,
  };
  return cached;
}

export async function getIdentity() {
  const k = await load();
  return k ? `pk:${k.publicKey}` : null;
}

export async function getPublicKey() {
  const k = await load();
  return k ? k.publicKey : null;
}

export async function hasIdentity() {
  return (await load()) !== null;
}

export async function generateIdentity() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const publicKey = bufToBase64(spki);
  const db = await openDb();
  await idbPut(db, KEY, { privateKeyJwk, publicKeySpkiBase64: publicKey });
  cached = { privateKey: pair.privateKey, publicKey, privateKeyJwk };
  return cached;
}

function randomNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufToBase64(bytes.buffer).replace(/=+$/, "");
}

async function signEnvelope(message) {
  const k = await load();
  if (!k) throw new Error("No identity claimed.");
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    k.privateKey,
    new TextEncoder().encode(message),
  );
  return { signature: bufToBase64(sig), pubkey: k.publicKey };
}

export async function signClaim(fromClientId) {
  const nonce = randomNonce();
  const timestamp = Date.now();
  const k = await load();
  if (!k) throw new Error("No identity claimed.");
  const { signature, pubkey } = await signEnvelope(
    `claim|${timestamp}|${nonce}|${k.publicKey}|${fromClientId ?? ""}`,
  );
  return { pubkey, signature, nonce, timestamp };
}

export async function signSubmit(roundId, clientId) {
  const nonce = randomNonce();
  const timestamp = Date.now();
  const k = await load();
  if (!k) throw new Error("No identity claimed.");
  const { signature, pubkey } = await signEnvelope(
    `submit|${roundId}|${clientId}|${timestamp}|${nonce}|${k.publicKey}`,
  );
  return { pubkey, signature, nonce, timestamp };
}

export async function exportRecoveryKey() {
  const k = await load();
  if (!k) throw new Error("No identity to export.");
  return btoa(
    JSON.stringify({ v: 1, privateKeyJwk: k.privateKeyJwk, publicKeySpkiBase64: k.publicKey }),
  );
}

export async function importRecoveryKey(blob) {
  const decoded = JSON.parse(atob(blob.trim()));
  if (decoded.v !== 1) throw new Error("Unsupported recovery format.");
  const privateKey = await importPrivate(decoded.privateKeyJwk);
  const db = await openDb();
  await idbPut(db, KEY, {
    privateKeyJwk: decoded.privateKeyJwk,
    publicKeySpkiBase64: decoded.publicKeySpkiBase64,
  });
  cached = {
    privateKey,
    publicKey: decoded.publicKeySpkiBase64,
    privateKeyJwk: decoded.privateKeyJwk,
  };
  return cached;
}

export async function clearIdentity() {
  const db = await openDb();
  await idbDelete(db, KEY);
  cached = null;
}
