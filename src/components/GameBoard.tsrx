import { useEffect, useState } from "react";
import { CATEGORY_META } from "../gameData";
import { getCopy, getLocale } from "../i18n";
import { createRoundSocket, fetchCurrentRound, getClientId, submitRoundPick } from "../liveApi";

function formatClock(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(round, language, copy) {
  if (!round) {
    return copy.game.loading;
  }

  if (round.status === "open") {
    return copy.game.openUntil(formatClock(round.locksAt, language));
  }

  if (round.status === "locked") {
    return copy.game.lockedUntil(formatClock(round.revealsAt, language));
  }

  return copy.game.revealed;
}

function formatContestCountdown(value, copy) {
  if (!value) {
    return copy.game.archiveLoading;
  }

  const remainingMs = Math.max(0, new Date(value).getTime() - Date.now());
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const years = Math.floor(totalHours / (24 * 365));
  const days = Math.floor((totalHours % (24 * 365)) / 24);
  const hours = totalHours % 24;

  if (years > 0) {
    return copy.game.endsInYears(years, days);
  }

  if (days > 0) {
    return copy.game.endsInDays(days, hours);
  }

  return copy.game.endsInHours(hours);
}

function formatDuration(ms) {
  const remainingSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPhaseCopy(round, now, language, copy) {
  if (!round) {
    return {
      label: copy.game.loading,
      value: "--:--",
      detail: copy.game.syncing,
    };
  }

  if (round.status === "open") {
    return {
      label: copy.game.votingClosesIn,
      value: formatDuration(new Date(round.locksAt).getTime() - now),
      detail: copy.game.picksLockAt(formatClock(round.locksAt, language)),
    };
  }

  if (round.status === "locked") {
    return {
      label: copy.game.answerDropsIn,
      value: formatDuration(new Date(round.revealsAt).getTime() - now),
      detail: copy.game.ledgerOpensAt(formatClock(round.revealsAt, language)),
    };
  }

  return {
    label: copy.game.answerLive,
    value: "00:00",
    detail: copy.game.winnersFromSlips(
      round.results?.winnerCount ?? 0,
      round.results?.authorTotal ?? 0,
    ),
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

function mergeRoundSnapshot(currentRound, snapshotRound) {
  if (!currentRound || currentRound.id !== snapshotRound.id) {
    return snapshotRound;
  }

  const snapshotStillIncludesSubmissionWindow =
    snapshotRound.totals.submissions >= currentRound.totals.submissions;

  return {
    ...snapshotRound,
    submission: snapshotStillIncludesSubmissionWindow
      ? currentRound.submission ?? snapshotRound.submission
      : snapshotRound.submission,
  };
}

component ResultList({ items, copy }) {
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
        <span class="result-row__mark">
          {item.correct
            ? `${copy.game.picks(item.count)} · ${copy.game.answer}`
            : copy.game.picks(item.count)}
        </span>
      </div>
    }
  </div>
}

export component GameBoard({ category, language = "en" }) {
  const [clientId] = useState(getClientId);
  const [round, setRound] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [handleGuess, setHandleGuess] = useState("");
  const [now, setNow] = useState(Date.now());
  const copy = getCopy(language);
  const postMeta = round ? CATEGORY_META[round.post.category] : CATEGORY_META.all;
  const categoryName = round
    ? copy.categories[round.post.category] ?? postMeta.name
    : copy.categories.all;
  const phaseCopy = getPhaseCopy(round, now, language, copy);
  const selectedAuthorId = round?.submission?.authorId ?? null;
  const selectedModelId = round?.submission?.modelId ?? null;
  const selectedAuthor =
    round?.authorChoices.find((author) => author?.id === selectedAuthorId) ?? null;
  const selectedModel =
    round?.modelChoices?.find((model) => model.id === selectedModelId) ?? null;
  const matchedAuthor = round ? matchAuthorGuess(handleGuess, round.authorChoices) : null;
  const matchedCurrentPick = Boolean(matchedAuthor && matchedAuthor.id === selectedAuthorId);
  const hasAuthorPick = Boolean(selectedAuthorId);
  const hasModelPick = Boolean(selectedModelId);
  const isOpen = round?.status === "open";
  const isRevealed = round?.status === "revealed";
  const authorCorrect =
    isRevealed && selectedAuthorId && selectedAuthorId === round.answer.author.id;
  const modelCorrect =
    isRevealed && selectedModelId && selectedModelId === round.answer.model.id;
  const stampLabel = isRevealed
    ? authorCorrect
      ? copy.game.paidOut
      : copy.game.voided
    : hasAuthorPick || round?.status === "locked"
      ? copy.game.placed
      : "";

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!round) {
      return;
    }

    setHandleGuess(selectedAuthor?.handle ?? "");
  }, [round?.id, selectedAuthorId]);

  useEffect(() => {
    if (!round || round.status === "revealed") {
      return;
    }

    const target = new Date(round.status === "open" ? round.locksAt : round.revealsAt).getTime();
    const timeout = window.setTimeout(() => {
      fetchCurrentRound(category, clientId, language)
        .then((nextRound) => {
          setRound(nextRound);
          setHandleGuess("");
          setError("");
        })
        .catch(() => setError(copy.errors.loadRound));
    }, Math.max(0, target - Date.now()) + 800);

    return () => window.clearTimeout(timeout);
  }, [category, clientId, language, round?.id, round?.locksAt, round?.revealsAt, round?.status]);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentRound(category, clientId, language, controller.signal)
      .then((nextRound) => {
        setRound(nextRound);
        setHandleGuess("");
        setError("");
      })
      .catch((nextError) => {
        if (nextError.name !== "AbortError") {
          setError(copy.errors.loadRound);
        }
      });

    return () => controller.abort();
  }, [category, clientId, language]);

  useEffect(() => {
    const socket = createRoundSocket(category, language);

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "round:snapshot" && message.round) {
        setRound((currentRound) => mergeRoundSnapshot(currentRound, message.round));
        setError("");
        return;
      }

      if (message.type === "round:update") {
        fetchCurrentRound(category, clientId, language)
          .then((nextRound) => {
            setRound(nextRound);
            setHandleGuess("");
            setError("");
          })
          .catch(() => setError(copy.errors.loadRound));
      }
    });

    return () => socket.close();
  }, [category, clientId, language]);

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
      if (payload.authorId) {
        setHandleGuess("");
      }
      setError("");
    } catch (nextError) {
      setError(copy.errors.roundClosed);
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
          {copy.game.live}
        </span>
        <span>{round ? getStatusLabel(round, language, copy) : copy.game.loading}</span>
      </div>

      <h1>
        {copy.game.titleTop}
        <br />
        <span>{copy.game.titleBottom}</span>
      </h1>

      <div class="genre-strip">
        {round
          ? copy.game.filedUnder(categoryName, round.post.languageNativeName)
          : copy.game.fetchingLiveRound}
      </div>
      <div class="contest-strip">
        {round
          ? `${formatContestCountdown(round.contest?.endsAt, copy)} · ${round.contest?.roundNumber ?? "?"}/${round.contest?.totalRounds ?? "?"}`
          : copy.game.archiveFallback}
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
      <div class="notice">{copy.game.loadingRound}</div>
    }

    if (round) {
      <article class="post-card">
        <div class="post-card__head">
          <div class={`post-card__avatar ${isRevealed ? "" : "is-hidden"}`}>
            {isRevealed ? round.answer.author.name.charAt(0) : ""}
          </div>
          <div>
            <div class="post-card__name">
              {isRevealed ? round.answer.author.name : copy.game.hiddenName}
            </div>
            <div class={`post-card__handle ${isRevealed ? "" : "is-blurred"}`}>
              {isRevealed ? round.answer.author.handle : "@xxxxxxxxxxxx"}
            </div>
          </div>
        </div>
        <p>{round.post.text}</p>
        <div class="fiction-notice">
          {copy.game.fictionNotice}
        </div>
        <div class="post-card__foot">
          <span>{copy.game.fakePost}</span>
          <span>{copy.game.picks(round.totals.submissions)}</span>
          <span>{copy.game.liveCount(round.totals.connected)}</span>
        </div>
      </article>

      <div class="prompt-row">{copy.game.whoPosted}</div>

      if (isOpen) {
        <div class="guess-box">
          <label class="guess-label" htmlFor="handle-guess">
            {copy.game.typeHandle}
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
              if (event.key === "Enter" && matchedAuthor && !matchedCurrentPick && !pending) {
                submitPick({ authorId: matchedAuthor.id });
              }
            }}
          />
          <div class="guess-help">
            {handleGuess && !matchedAuthor
              ? copy.game.noMatch
              : matchedAuthor
                ? copy.game.matched(matchedAuthor.handle)
                : copy.game.handleHelp}
          </div>
        </div>

        <button
          class="slip-action"
          disabled={!matchedAuthor || matchedCurrentPick || pending}
          type="button"
          onClick={() => submitPick({ authorId: matchedAuthor.id })}
        >
          {matchedAuthor
            ? matchedCurrentPick
              ? copy.game.currentPick
              : hasAuthorPick
                ? copy.game.updateSlip
                : copy.game.placeSlip
            : copy.game.enterHandle}
        </button>
      }

      if (hasAuthorPick || !isOpen) {
        <div
          class={`notice ${isRevealed ? (authorCorrect ? "notice--good" : "notice--bad") : ""}`}
        >
          if (isRevealed) {
            <span class="notice__label">{authorCorrect ? copy.game.youWereRight : copy.game.answerWas}</span>
            <strong>{round.answer.author.name}</strong>
            <span>{round.answer.author.signature}</span>
          } else {
            <span class="notice__label">
              {hasAuthorPick
                ? isOpen
                  ? copy.game.currentPick
                  : copy.game.slipPlaced
                : copy.game.roundLocked}
            </span>
            <strong>{hasAuthorPick ? (selectedAuthor?.handle ?? copy.game.pickLocked) : copy.game.noMorePicks}</strong>
            <span>
              {hasAuthorPick && isOpen
                ? copy.game.canChangeUntil(formatClock(round.locksAt, language))
                : copy.game.revealAt(formatClock(round.revealsAt, language))}
            </span>
          }
        </div>
      }

      if (round.modelChoices?.length) {
        <section class="bonus-card">
          <div class="bonus-card__header">
            <p class="eyebrow">{copy.game.modelBonus}</p>
            <h2>{copy.game.modelBonusDetail}</h2>
          </div>

          if (isOpen) {
            <div class="choices choices--compact">
              for (const model of round.modelChoices) {
                <button
                  key={model.id}
                  class="choice choice--bonus"
                  data-state={selectedModelId === model.id ? "selected" : "idle"}
                  disabled={pending || selectedModelId === model.id}
                  type="button"
                  onClick={() => submitPick({ modelId: model.id })}
                >
                  <span class="choice__main">
                    <strong>{model.name}</strong>
                    <span>{model.blurb}</span>
                  </span>
                  if (selectedModelId === model.id) {
                    <span class="choice__badge">{copy.game.currentPick}</span>
                  }
                </button>
              }
            </div>
          } else {
            <div class={`notice ${isRevealed ? (modelCorrect ? "notice--good" : "notice--bad") : ""}`}>
              if (isRevealed) {
                <span class="notice__label">{copy.game.modelCorrect}</span>
                <strong>{round.answer.model.name}</strong>
                <span>{round.answer.model.blurb}</span>
              } else {
                <span class="notice__label">{hasModelPick ? copy.game.modelPick : copy.game.roundLocked}</span>
                <strong>{hasModelPick ? (selectedModel?.name ?? copy.game.pickLocked) : copy.game.noMorePicks}</strong>
                <span>{copy.game.revealAt(formatClock(round.revealsAt, language))}</span>
              }
            </div>
          }
        </section>
      }

      if (isRevealed) {
        <section class="winner-card">
          <p class="eyebrow">{copy.game.winners}</p>
          <strong>{`${round.results.winnerCount}/${round.results.authorTotal}`}</strong>
          <span>{copy.game.hitHandle(round.results.winnerPercentage, round.answer.author.handle)}</span>
        </section>

        <section class="results-card">
          <h2>{copy.game.crowdLedger}</h2>
          <div>
            <p class="eyebrow">{copy.game.author}</p>
            <ResultList items={round.results.authors} copy={copy} />
          </div>
        </section>
      }
    }
  </section>
}
