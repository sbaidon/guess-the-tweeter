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

function formatContestCountdown(value) {
  if (!value) {
    return "Archive loading";
  }

  const remainingMs = Math.max(0, new Date(value).getTime() - Date.now());
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const years = Math.floor(totalHours / (24 * 365));
  const days = Math.floor((totalHours % (24 * 365)) / 24);
  const hours = totalHours % 24;

  if (years > 0) {
    return `Ends in ${years}y ${days}d`;
  }

  if (days > 0) {
    return `Ends in ${days}d ${hours}h`;
  }

  return `Ends in ${hours}h`;
}

component ResultList({ items }) {
  <div class="results-list">
    for (const item of items) {
      <div
        key={item.author.id}
        class="result-row"
        data-correct={item.correct ? "true" : "false"}
        style={{ "--result-pct": `${item.percentage}%` }}
      >
        <div class="result-row__top">
          <span class="result-row__name">{item.author.name}</span>
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
  const postMeta = round ? CATEGORY_META[round.post.category] : CATEGORY_META.all;
  const selectedAuthorId = round?.submission?.authorId ?? null;
  const hasAuthorPick = Boolean(selectedAuthorId);
  const isOpen = round?.status === "open";
  const isRevealed = round?.status === "revealed";
  const authorCorrect =
    isRevealed && selectedAuthorId && selectedAuthorId === round.answer.author.id;
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
      <div class="contest-strip">
        {round
          ? `${formatContestCountdown(round.contest?.endsAt)} · ${round.contest?.roundNumber ?? "?"}/${round.contest?.totalRounds ?? "?"}`
          : "87,600 round archive"}
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

      if (isRevealed) {
        <section class="results-card">
          <h2>{"Crowd ledger"}</h2>
          <div>
            <p class="eyebrow">{"Author"}</p>
            <ResultList items={round.results.authors} />
          </div>
        </section>
      }
    }
  </section>
}
