import { useEffect, useState } from "react";
import { CATEGORY_META } from "../gameData";
import { createRoundSocket, fetchCurrentRound, getClientId, submitRoundPick } from "../liveApi";

function formatClock(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getChoiceState(choiceId, correctId, selectedId, status) {
  if (status === "revealed") {
    if (choiceId === correctId) {
      return "correct";
    }

    if (choiceId === selectedId) {
      return "incorrect";
    }

    return "";
  }

  return choiceId === selectedId ? "selected" : "";
}

function getStatusLabel(round) {
  if (!round) {
    return "Loading";
  }

  if (round.status === "open") {
    return `Open until ${formatClock(round.locksAt)}`;
  }

  if (round.status === "locked") {
    return `Locked until ${formatClock(round.revealsAt)}`;
  }

  return "Revealed";
}

component ResultList({ items, kind }) {
  <div class="results-list">
    for (const item of items) {
      const label = kind === "author" ? item.author.name : item.model.name;
      const key = kind === "author" ? item.author.id : item.model.id;

      <div key={key} class="result-row">
        <span class="result-row__name">{label}</span>
        <span class="result-row__count">{`${item.count} / ${item.percentage}%`}</span>
        <span class="result-row__mark">{item.correct ? "Answer" : ""}</span>
      </div>
    }
  </div>
}

export component GameBoard({ category }) {
  const [clientId] = useState(getClientId);
  const [round, setRound] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const postMeta = round ? CATEGORY_META[round.post.category] : CATEGORY_META.all;
  const selectedAuthorId = round?.submission?.authorId ?? null;
  const selectedModelId = round?.submission?.modelId ?? null;
  const hasAuthorPick = Boolean(selectedAuthorId);
  const hasModelPick = Boolean(selectedModelId);
  const isOpen = round?.status === "open";
  const isRevealed = round?.status === "revealed";
  const authorCorrect =
    isRevealed && selectedAuthorId && selectedAuthorId === round.answer.author.id;
  const modelCorrect = isRevealed && selectedModelId && selectedModelId === round.answer.model.id;

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentRound(category, clientId, controller.signal)
      .then((nextRound) => {
        setRound(nextRound);
        setError("");
      })
      .catch((nextError) => {
        if (nextError.name !== "AbortError") {
          setError(nextError.message);
        }
      });

    return () => controller.abort();
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

  async function submitPick(payload) {
    if (!round || pending || !isOpen) {
      return;
    }

    setPending(true);

    try {
      const nextRound = await submitRoundPick(round.id, {
        clientId,
        ...payload,
      });
      setRound(nextRound);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setPending(false);
    }
  }

  <section class="game-card" style={{ "--active-accent": postMeta.accent }}>
    <header class="game-card__header">
      <div>
        <p class="eyebrow">{"Live round"}</p>
        <h1>{"Who posted this?"}</h1>
      </div>
      <div class="round-meta">
        <span>{round ? postMeta.name : "Loading"}</span>
        <span>{getStatusLabel(round)}</span>
      </div>
    </header>

    if (error) {
      <div class="notice notice--bad">{error}</div>
    }

    if (!round && !error) {
      <div class="notice">{"Loading round..."}</div>
    }

    if (round) {
      <article class="post-card">
        <p>{round.post.text}</p>
      </article>

      <div class="stats-line">
        <span>{`${round.totals.submissions} picks`}</span>
        <span>{`${round.totals.connected} live`}</span>
      </div>

      <div class="choices" aria-label="Author choices">
        for (const author of round.authorChoices) {
          const dataState = getChoiceState(
            author.id,
            round.answer?.author.id,
            selectedAuthorId,
            round.status,
          );

          <button
            key={author.id}
            class="choice"
            data-state={dataState}
            disabled={!isOpen || hasAuthorPick || pending}
            type="button"
            onClick={() => submitPick({ authorId: author.id })}
          >
            <strong>{author.name}</strong>
            <span>{author.handle}</span>
          </button>
        }
      </div>

      if (hasAuthorPick || !isOpen) {
        <div
          class={`notice ${isRevealed ? (authorCorrect ? "notice--good" : "notice--bad") : ""}`}
        >
          if (isRevealed) {
            <strong>{`Answer: ${round.answer.author.name}`}</strong>
            <span>{round.answer.author.signature}</span>
          } else {
            <strong>{hasAuthorPick ? "Pick locked." : "Round locked."}</strong>
            <span>{`Reveal at ${formatClock(round.revealsAt)}.`}</span>
          }
        </div>
      }

      if (hasAuthorPick || !isOpen) {
        <section class="bonus-card">
          <div class="bonus-card__header">
            <p class="eyebrow">{"Bonus"}</p>
            <h2>{"Guess the model"}</h2>
          </div>

          <div class="choices choices--compact" aria-label="Model choices">
            for (const model of round.modelChoices) {
              const dataState = getChoiceState(
                model.id,
                round.answer?.model.id,
                selectedModelId,
                round.status,
              );

              <button
                key={model.id}
                class="choice"
                data-state={dataState}
                disabled={!isOpen || !hasAuthorPick || hasModelPick || pending}
                type="button"
                onClick={() => submitPick({ modelId: model.id })}
              >
                <strong>{model.name}</strong>
              </button>
            }
          </div>

          if (hasModelPick || isRevealed) {
            <div
              class={`notice ${isRevealed ? (modelCorrect ? "notice--good" : "notice--bad") : ""}`}
            >
              if (isRevealed) {
                <strong>{`Model: ${round.answer.model.name}`}</strong>
                <span>{round.answer.model.blurb}</span>
              } else {
                <strong>{"Model pick locked."}</strong>
              }
            </div>
          }
        </section>
      }

      if (isRevealed) {
        <section class="results-card">
          <h2>{"Everyone picked"}</h2>
          <div class="results-card__grid">
            <div>
              <p class="eyebrow">{"Author"}</p>
              <ResultList items={round.results.authors} kind="author" />
            </div>
            <div>
              <p class="eyebrow">{"Model"}</p>
              <ResultList items={round.results.models} kind="model" />
            </div>
          </div>
        </section>
      }
    }
  </section>
}
