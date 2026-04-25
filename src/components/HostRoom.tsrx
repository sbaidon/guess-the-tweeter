import { useEffect, useState } from "react";
import { CATEGORY_META } from "../gameData";
import {
  createNextRound,
  createRoundSocket,
  fetchCurrentRound,
  getClientId,
  resetRound,
  revealRound,
} from "../liveApi";

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export component HostRoom({ category }) {
  const [clientId] = useState(getClientId);
  const [round, setRound] = useState(null);
  const [adminToken, setAdminToken] = useState(
    () => window.sessionStorage.getItem("guess-the-tweeter-admin-token") ?? "",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const meta = CATEGORY_META[category];

  useEffect(() => {
    if (adminToken) {
      window.sessionStorage.setItem("guess-the-tweeter-admin-token", adminToken);
    } else {
      window.sessionStorage.removeItem("guess-the-tweeter-admin-token");
    }
    window.localStorage.removeItem("guess-the-tweeter-admin-token");
  }, [adminToken]);

  useEffect(() => {
    fetchCurrentRound(category, clientId)
      .then((nextRound) => {
        setRound(nextRound);
        setError("");
      })
      .catch((nextError) => setError(nextError.message));
  }, [category, clientId]);

  useEffect(() => {
    const socket = createRoundSocket(category);

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "round:update") {
        fetchCurrentRound(category, clientId)
          .then((nextRound) => {
            setRound(nextRound);
            setError("");
          })
          .catch((nextError) => setError(nextError.message));
      }
    });

    return () => socket.close();
  }, [category, clientId]);

  async function runAdminAction(action) {
    setPending(true);

    try {
      const nextRound = await action();
      setRound(nextRound);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setPending(false);
    }
  }

  <div
    class="host-layout"
    style={{
      "--active-accent": meta.accent,
      "--active-accent-soft": meta.soft,
    }}
  >
    <section class="stage host-stage">
      <div class="stage__meta">
        <div class="stage__pill">{meta.name}</div>
        <div class="stage__round">{"Host Room"}</div>
      </div>

      if (error) {
        <div class="feedback is-incorrect">{error}</div>
      }

      if (round) {
        <article class="quote-card">
          <p class="quote-card__label">{round.status}</p>
          <blockquote class="quote-card__text">{round.post.text}</blockquote>
        </article>

        <div class="host-stats">
          <div class="session-grid__item">
            <span class="session-grid__name">{"Round"}</span>
            <strong class="session-grid__value">{round.id}</strong>
          </div>
          <div class="session-grid__item">
            <span class="session-grid__name">{"Picks"}</span>
            <strong class="session-grid__value">{round.totals.submissions}</strong>
          </div>
          <div class="session-grid__item">
            <span class="session-grid__name">{"Live"}</span>
            <strong class="session-grid__value">{round.totals.connected}</strong>
          </div>
          <div class="session-grid__item">
            <span class="session-grid__name">{"Reveal"}</span>
            <strong class="session-grid__value">{formatTime(round.revealsAt)}</strong>
          </div>
        </div>

        if (round.status === "revealed") {
          <div class="feedback is-correct">
            <h2 class="feedback__title">
              {round.answer.author.name}
            </h2>
            <p>{round.answer.author.signature}</p>
          </div>
        }
      }
    </section>

    <aside class="section-card host-controls">
      <p class="section-card__label">{"Controls"}</p>
      <label class="field-label" htmlFor="adminToken">{"Admin token"}</label>
      <input
        id="adminToken"
        class="field-input"
        type="password"
        value={adminToken}
        onChange={(event) => setAdminToken(event.target.value)}
      />

      <div class="host-actions">
        <button
          class="button button--primary"
          disabled={!round || pending}
          type="button"
          onClick={() => runAdminAction(() => revealRound(round.id, adminToken))}
        >
          {"Reveal Now"}
        </button>
        <button
          class="button button--ghost"
          disabled={!round || pending}
          type="button"
          onClick={() => runAdminAction(() => resetRound(round.id, adminToken))}
        >
          {"Reset Picks"}
        </button>
        <button
          class="button button--ghost"
          disabled={pending}
          type="button"
          onClick={() => runAdminAction(() => createNextRound(category, adminToken))}
        >
          {"New Round"}
        </button>
      </div>
    </aside>
  </div>
}
