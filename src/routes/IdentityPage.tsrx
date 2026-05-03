import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCopy } from "../i18n";
import {
  clearIdentity,
  exportRecoveryKey,
  generateIdentity,
  getIdentity,
  hasIdentity,
  importRecoveryKey,
  signClaim,
} from "../identity";
import { claimIdentity, fetchMe, getClientId } from "../liveApi";
import { useCurrentLanguage } from "../router";

export component IdentityPage() {
  const language = useCurrentLanguage();
  const copy = getCopy(language);
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [recovery, setRecovery] = useState("");
  const [importValue, setImportValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getIdentity().catch(() => null);
      if (cancelled) return;
      setIdentity(id);
      try {
        const me = await fetchMe({ clientId: getClientId(), identity: id });
        if (!cancelled) setDisplayName(me.displayName ?? "");
      } catch {
        if (!cancelled) setDisplayName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function syncWithServer() {
    const fromClientId = getClientId();
    const sig = await signClaim(fromClientId);
    const me = await claimIdentity({ ...sig, fromClientId });
    setDisplayName(me.displayName ?? "");
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["identity"] });
    queryClient.invalidateQueries({ queryKey: ["round"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  async function handleClaim() {
    setPending(true);
    setError("");
    setInfo("");
    try {
      if (!(await hasIdentity())) await generateIdentity();
      await syncWithServer();
      setIdentity(await getIdentity());
      invalidate();
      setInfo(copy.identity.claimed);
    } catch (err) {
      setError(err.message || copy.identity.error);
    } finally {
      setPending(false);
    }
  }

  async function handleShowRecovery() {
    try {
      setRecovery(await exportRecoveryKey());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImport() {
    setPending(true);
    setError("");
    setInfo("");
    try {
      await importRecoveryKey(importValue);
      await syncWithServer();
      setIdentity(await getIdentity());
      setImportValue("");
      invalidate();
      setInfo(copy.identity.imported);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut() {
    await clearIdentity();
    setIdentity(null);
    setRecovery("");
    invalidate();
    setInfo(copy.identity.signedOut);
  }

  <section class="identity-card">
    <p class="eyebrow">{copy.identity.eyebrow}</p>
    <h1>{copy.identity.title}</h1>
    <p class="identity-card__intro">{copy.identity.intro}</p>

    if (error) {
      <div class="notice notice--bad">{error}</div>
    }

    if (info) {
      <div class="notice notice--good">{info}</div>
    }

    if (!identity) {
      <div class="identity-actions">
        <button class="button button--primary" disabled={pending} type="button" onClick={handleClaim}>
          {copy.identity.claim}
        </button>

        <details class="identity-import">
          <summary>{copy.identity.importHeading}</summary>
          <textarea
            class="identity-import__field"
            placeholder={copy.identity.importPlaceholder}
            value={importValue}
            onInput={(event) => setImportValue(event.currentTarget.value)}
          />
          <button
            class="button button--ghost"
            disabled={pending || !importValue.trim()}
            type="button"
            onClick={handleImport}
          >
            {copy.identity.importAction}
          </button>
        </details>
      </div>
    } else {
      <div class="identity-summary">
        <p class="eyebrow">{copy.identity.youAre}</p>
        <strong class="identity-summary__id">{displayName || "…"}</strong>
      </div>

      <div class="identity-actions">
        if (!recovery) {
          <button class="button button--ghost" type="button" onClick={handleShowRecovery}>
            {copy.identity.showRecovery}
          </button>
        } else {
          <p class="identity-recovery__warn">{copy.identity.recoveryWarn}</p>
          <textarea class="identity-recovery" readOnly value={recovery} />
        }

        <button class="button button--ghost" type="button" onClick={handleSignOut}>
          {copy.identity.signOut}
        </button>
      </div>
    }
  </section>
}
