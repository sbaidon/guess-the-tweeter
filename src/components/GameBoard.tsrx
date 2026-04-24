import { useEffect, useState } from "react";
import { CATEGORY_META } from "../gameData";
import { createRoundSocket, fetchCurrentRound, getClientId, submitRoundPick } from "../liveApi";

function formatClock(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function formatDuration(ms) {
  const remainingSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPhaseCopy(round, now) {
  if (!round) {
    return {
      label: "Loading",
      value: "--:--",
      detail: "Syncing the live room.",
    };
  }

  if (round.status === "open") {
    return {
      label: "Voting closes in",
      value: formatDuration(new Date(round.locksAt).getTime() - now),
      detail: `Picks lock at ${formatClock(round.locksAt)}.`,
    };
  }

  if (round.status === "locked") {
    return {
      label: "Answer drops in",
      value: formatDuration(new Date(round.revealsAt).getTime() - now),
      detail: `Crowd ledger opens at ${formatClock(round.revealsAt)}.`,
    };
  }

  return {
    label: "Answer live",
    value: "00:00",
    detail: `${round.results?.winnerCount ?? 0} winners from ${round.results?.authorTotal ?? 0} slips.`,
  };
}

function normalizeGuess(value) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function matchAuthorGuess(value, authors = []) {
  const normalized = normalizeGuess(value);

  if (!normalized) {
    return null;
  }

  return (
    authors.find((author) => normalizeGuess(author.handle) === normalized) ??
    authors.find((author) => normalizeGuess(author.name) === normalized) ??
    null
  );
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
  const [handleGuess, setHandleGuess] = useState("");
  const [now, setNow] = useState(Date.now());
  const postMeta = round ? CATEGORY_META[round.post.category] : CATEGORY_META.all;
  const phaseCopy = getPhaseCopy(round, now);
  const selectedAuthorId = round?.submission?.authorId ?? null;
  const matchedAuthor = round ? matchAuthorGuess(handleGuess, round.authorChoices) : null;
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
    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!round || round.status === "revealed") {
      return;
    }

    const target = new Date(round.status === "open" ? round.locksAt : round.revealsAt).getTime();
    const timeout = window.setTimeout(() => {
      fetchCurrentRound(category, clientId)
        .then((nextRound) => {
          setRound(nextRound);
          setHandleGuess("");
          setError("");
        })
        .catch((nextError) => setError(nextError.message));
    }, Math.max(0, target - Date.now()) + 800);

    return () => window.clearTimeout(timeout);
  }, [category, clientId, round?.id, round?.locksAt, round?.revealsAt, round?.status]);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentRound(category, clientId, controller.signal)
      .then((nextRound) => {
        setRound(nextRound);
        setHandleGuess("");
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
            setHandleGuess("");
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
      setHandleGuess("");
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

      <div class="phase-meter" data-phase={round?.status ?? "loading"}>
        <span>{phaseCopy.label}</span>
        <strong>{phaseCopy.value}</strong>
        <small>{phaseCopy.detail}</small>
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

      if (!hasAuthorPick && isOpen) {
        <div class="guess-box">
          <label class="guess-label" htmlFor="handle-guess">
            {"Type the handle"}
          </label>
          <input
            id="handle-guess"
            class="guess-input"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="@handle"
            value={handleGuess}
            onInput={(event) => setHandleGuess(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matchedAuthor && !pending) {
                submitPick({ authorId: matchedAuthor.id });
              }
            }}
          />
          <div class="guess-help">
            {handleGuess && !matchedAuthor
              ? "No matching live handle yet."
              : matchedAuthor
                ? `Matched ${matchedAuthor.handle}`
                : "Handles are exact-match, with or without @."}
          </div>
        </div>

        <button
          class="slip-action"
          disabled={!matchedAuthor || pending}
          type="button"
          onClick={() => submitPick({ authorId: matchedAuthor.id })}
        >
          {matchedAuthor ? "Place slip" : "Enter handle"}
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
        <section class="winner-card">
          <p class="eyebrow">{"Winners"}</p>
          <strong>{`${round.results.winnerCount}/${round.results.authorTotal}`}</strong>
          <span>{`${round.results.winnerPercentage}% of slips hit ${round.answer.author.handle}.`}</span>
        </section>

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
