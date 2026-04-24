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

      <div
        key={key}
        class="result-row"
        data-correct={item.correct ? "true" : "false"}
        style={{ "--result-pct": `${item.percentage}%` }}
      >
        <div class="result-row__top">
          <span class="result-row__name">{label}</span>
          <span class="result-row__count">{`${item.percentage}%`}</span>
        </div>
        <div class="result-row__track">
          <span class="result-row__fill" />
        </div>
        <span class="result-row__mark">{item.correct ? `${item.count} picks · answer` : `${item.count} picks`}</span>
      </div>
    }
  </div>
}

export component GameBoard({ category }) {
  const [clientId] = useState(getClientId);
  const [round, setRound] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [draftAuthorId, setDraftAuthorId] = useState(null);
  const [draftModelId, setDraftModelId] = useState(null);
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
  const stampLabel = isRevealed
    ? authorCorrect
      ? "Paid out"
      : "Voided"
    : hasAuthorPick || round?.status === "locked"
      ? "Placed"
      : "";

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentRound(category, clientId, controller.signal)
      .then((nextRound) => {
        setRound(nextRound);
        setDraftAuthorId(null);
        setDraftModelId(null);
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
            setDraftAuthorId(null);
            setDraftModelId(null);
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
      setDraftAuthorId(null);
      setDraftModelId(null);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setPending(false);
    }
  }

  <section class="game-card" style={{ "--active-accent": postMeta.accent }}>
    if (stampLabel) {
      <div class="stamp" data-tone={isRevealed && !authorCorrect ? "void" : "red"}>
        {stampLabel}
      </div>
    }

    <header class="game-card__header">
      <div class="live-strip">
        <span>
          <span class="live-dot" />
          {"Live"}
        </span>
        <span>{round ? getStatusLabel(round) : "Loading"}</span>
      </div>

      <h1>
        {"Guess"}
        <br />
        <span>{"the Tweeter."}</span>
      </h1>

      <div class="genre-strip">
        {round ? `Filed under · ${postMeta.name}` : "Fetching live round"}
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
        <div class="post-card__head">
          <div class={`post-card__avatar ${isRevealed ? "" : "is-hidden"}`}>
            {isRevealed ? round.answer.author.name.charAt(0) : ""}
          </div>
          <div>
            <div class="post-card__name">
              {isRevealed ? round.answer.author.name : "— hidden —"}
            </div>
            <div class={`post-card__handle ${isRevealed ? "" : "is-blurred"}`}>
              {isRevealed ? round.answer.author.handle : "@xxxxxxxxxxxx"}
            </div>
          </div>
        </div>
        <p>{round.post.text}</p>
        <div class="post-card__foot">
          <span>{`${round.totals.submissions} picks`}</span>
          <span>{`${round.totals.connected} live`}</span>
        </div>
      </article>

      <div class="prompt-row">{"Who posted this?"}</div>
      <div class="choices" aria-label="Author choices">
        for (const [index, author] of round.authorChoices.entries()) {
          const dataState = getChoiceState(
            author.id,
            round.answer?.author.id,
            selectedAuthorId ?? draftAuthorId,
            round.status,
          );

          <button
            key={author.id}
            class="choice"
            data-state={dataState}
            disabled={!isOpen || hasAuthorPick || pending}
            type="button"
            onClick={() => setDraftAuthorId(author.id)}
          >
            <span class="choice__index">{String(index + 1).padStart(2, "0")}</span>
            <span class="choice__main">
              <strong>{author.name}</strong>
              <span>{author.handle}</span>
            </span>
          </button>
        }
      </div>

      if (!hasAuthorPick && isOpen) {
        <button
          class="slip-action"
          disabled={!draftAuthorId || pending}
          type="button"
          onClick={() => submitPick({ authorId: draftAuthorId })}
        >
          {draftAuthorId ? "Place slip" : "Pick a tweeter"}
        </button>
      }

      if (hasAuthorPick || !isOpen) {
        <div
          class={`notice ${isRevealed ? (authorCorrect ? "notice--good" : "notice--bad") : ""}`}
        >
          if (isRevealed) {
            <span class="notice__label">{authorCorrect ? "You were right" : "The answer was"}</span>
            <strong>{round.answer.author.name}</strong>
            <span>{round.answer.author.signature}</span>
          } else {
            <span class="notice__label">{hasAuthorPick ? "Slip placed" : "Round locked"}</span>
            <strong>{hasAuthorPick ? "Your pick is locked." : "No more picks."}</strong>
            <span>{`Reveal at ${formatClock(round.revealsAt)}.`}</span>
          }
        </div>
      }

      if (hasAuthorPick || !isOpen) {
        <section class="bonus-card">
          <div class="bonus-card__header">
            <p class="eyebrow">{"Bonus"}</p>
            <h2>{"Which model wrote it?"}</h2>
          </div>

          <div class="choices choices--compact" aria-label="Model choices">
            for (const [index, model] of round.modelChoices.entries()) {
              const dataState = getChoiceState(
                model.id,
                round.answer?.model.id,
                selectedModelId ?? draftModelId,
                round.status,
              );

              <button
                key={model.id}
                class="choice"
                data-state={dataState}
                disabled={!isOpen || !hasAuthorPick || hasModelPick || pending}
                type="button"
                onClick={() => setDraftModelId(model.id)}
              >
                <span class="choice__index">{`M${index + 1}`}</span>
                <span class="choice__main">
                  <strong>{model.name}</strong>
                </span>
              </button>
            }
          </div>

          if (!hasModelPick && hasAuthorPick && isOpen) {
            <button
              class="slip-action"
              disabled={!draftModelId || pending}
              type="button"
              onClick={() => submitPick({ modelId: draftModelId })}
            >
              {draftModelId ? "Submit bonus" : "Pick a model"}
            </button>
          }

          if (hasModelPick || isRevealed) {
            <div
              class={`notice ${isRevealed ? (modelCorrect ? "notice--good" : "notice--bad") : ""}`}
            >
              if (isRevealed) {
                <span class="notice__label">{modelCorrect ? "Model hit" : "Model answer"}</span>
                <strong>{round.answer.model.name}</strong>
                <span>{round.answer.model.blurb}</span>
              } else {
                <span class="notice__label">{"Bonus slip"}</span>
                <strong>{"Model pick locked."}</strong>
              }
            </div>
          }
        </section>
      }

      if (isRevealed) {
        <section class="results-card">
          <h2>{"Crowd ledger"}</h2>
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
