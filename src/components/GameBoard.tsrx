import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_META } from "../gameData";
import { getCopy, getLocale } from "../i18n";
import { getIdentity, signSubmit } from "../identity";
import { createRoundSocket, fetchCurrentRound, getClientId, submitRoundPick } from "../liveApi";
import { useUiLanguage } from "../router";
import { AuthorAvatar } from "./AuthorAvatar.tsrx";

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
    player: currentRound.player ?? snapshotRound.player,
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

const STAKE_CHIPS = [0, 10, 25];

function formatPayout(value) {
  if (value > 0) return `+${value} pts`;
  if (value < 0) return `${value} pts`;
  return "0 pts";
}

function pickHandle(pick) {
  if (!pick) return "";
  return pick.kind === "matched" ? pick.handle : pick.text;
}

function pickAuthorId(pick) {
  return pick && pick.kind === "matched" ? pick.authorId : null;
}

export component GameBoard({ category, language = "en" }) {
  const [clientId] = useState(getClientId);
  const [handleGuess, setHandleGuess] = useState("");
  const [now, setNow] = useState(Date.now());
  const queryClient = useQueryClient();
  // `language` (the prop) is the GAME language — drives the round/post pool
  // and stays in sync with the URL on /play/:lang. The UI chrome (copy +
  // Intl) follows the user's separate interface preference.
  const uiLanguage = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const { data: identity = null } = useQuery({ queryKey: ["identity"], queryFn: getIdentity });
  const queryKey = ["round", category, language, clientId, identity];

  const { data: round = null, isError: roundQueryError, refetch: refetchRound } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchCurrentRound(category, clientId, language, signal, identity),
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const body = { clientId, ...payload };
      if (identity) {
        const sig = await signSubmit(round.id, clientId);
        Object.assign(body, sig);
      }
      return submitRoundPick(round.id, body);
    },
    onSuccess: (nextRound, payload) => {
      queryClient.setQueryData(queryKey, nextRound);
      if (payload.authorGuess) setHandleGuess("");
    },
  });

  const error = submitMutation.isError
    ? copy.errors.roundClosed
    : roundQueryError
      ? copy.errors.loadRound
      : "";
  const pending = submitMutation.isPending;
  const postMeta = round ? CATEGORY_META[round.post.category] : CATEGORY_META.all;
  const categoryName = round
    ? copy.categories[round.post.category] ?? postMeta.name
    : copy.categories.all;
  const phaseCopy = getPhaseCopy(round, now, uiLanguage, copy);
  const player = round?.player ?? null;
  const submission = round?.submission ?? null;
  const placedAuthor = submission?.author ?? null;
  const selectedAuthorGuess = pickHandle(placedAuthor);
  const selectedAuthorId = pickAuthorId(placedAuthor);
  const selectedModelId = submission?.modelId ?? null;
  const selectedModel =
    round?.modelChoices?.find((model) => model.id === selectedModelId) ?? null;
  const matchedAuthor = round ? matchAuthorGuess(handleGuess, round.authorChoices) : null;
  const normalizedHandleGuess = normalizeGuess(handleGuess);
  const normalizedSelectedAuthorGuess = normalizeGuess(selectedAuthorGuess);
  const matchedCurrentPick = Boolean(
    normalizedHandleGuess && normalizedHandleGuess === normalizedSelectedAuthorGuess,
  );
  const hasAuthorPick = Boolean(placedAuthor);
  const hasModelPick = Boolean(selectedModelId);
  const isOpen = round?.status === "open";
  const isRevealed = round?.status === "revealed";
  const placedStake = submission ? submission.stake : 0;
  const maxStake = player ? player.points + placedStake : 0;
  const authorCorrect =
    isRevealed && selectedAuthorId && selectedAuthorId === round.answer.author.id;
  const modelCorrect =
    isRevealed && selectedModelId && selectedModelId === round.answer.model.id;
  // Stamps used to flash on every state (placed / locked / paid / void). That
  // turned the corner ribbon into ambient noise — a first-time player saw a
  // red stamp and worried something was wrong. Limit it to the reveal moment,
  // where it actually means win/loss.
  const stampLabel = isRevealed
    ? authorCorrect
      ? copy.game.paidOut
      : copy.game.voided
    : "";

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!round) {
      return;
    }

    setHandleGuess(selectedAuthorGuess);
  }, [round?.id, selectedAuthorGuess]);

  useEffect(() => {
    if (!round || round.status === "revealed") return;
    const target = new Date(round.status === "open" ? round.locksAt : round.revealsAt).getTime();
    const timeout = window.setTimeout(
      () => refetchRound(),
      Math.max(0, target - Date.now()) + 800,
    );
    return () => window.clearTimeout(timeout);
  }, [round?.id, round?.locksAt, round?.revealsAt, round?.status, refetchRound]);

  useEffect(() => {
    const socket = createRoundSocket(category, language);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "round:snapshot" && message.round) {
        queryClient.setQueryData(["round", category, language, clientId, identity], (current) =>
          mergeRoundSnapshot(current, message.round),
        );
      } else if (message.type === "round:update") {
        refetchRound();
      }
    });
    return () => socket.close();
  }, [category, clientId, language, identity, queryClient, refetchRound]);

  function submitPick(payload) {
    if (!round || pending || !isOpen) return;
    submitMutation.mutate(payload);
  }

  function setStake(value) {
    if (value === placedStake) return;
    submitPick({ stake: value });
  }

  <section class="game-card" style={{ "--active-accent": postMeta.accent }}>
    if (stampLabel) {
      <div class="stamp" data-tone={isRevealed && !authorCorrect ? "void" : "red"}>
        {stampLabel}
      </div>
    }

    <header class="game-card__header">
      <div class="game-meta">
        <span class="game-meta__live">
          <span class="live-dot" />
          {copy.game.live}
        </span>
        if (player) {
          <span class="game-meta__chip" aria-label="balance">{`BAL ${player.points}`}</span>
        }
      </div>

      <div class="game-clock" data-phase={round?.status ?? "loading"}>
        <span class="game-clock__label">{phaseCopy.label}</span>
        <strong class="game-clock__value">{phaseCopy.value}</strong>
      </div>
    </header>

    if (round) {
      <p class="game-howto">{copy.game.handleHelp}</p>
    }

    if (error) {
      <div class="notice notice--bad">{error}</div>
    }

    if (!round && !error) {
      <div class="notice">{copy.game.loadingRound}</div>
    }

    if (round) {
      <article class="post-card">
        <div class="post-card__head">
          <AuthorAvatar author={isRevealed ? round.answer.author : null} hidden={!isRevealed} />
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
          <span>{copy.game.picks(round.totals.submissions)}</span>
          <span>{copy.game.liveCount(round.totals.connected)}</span>
        </div>
      </article>

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
              if (event.key === "Enter" && normalizedHandleGuess && !matchedCurrentPick && !pending) {
                submitPick({ authorGuess: handleGuess.trim() });
              }
            }}
          />
          <div class="guess-help">
            {normalizedHandleGuess
              ? matchedCurrentPick
                ? ""
                : matchedAuthor
                ? copy.game.matched(matchedAuthor.handle)
                : copy.game.freeformGuess(handleGuess.trim())
              : copy.game.handleHelp}
          </div>
        </div>

        if (player) {
          <div class="stake-row" role="radiogroup" aria-label="bet">
            <span class="stake-row__label">{"BET"}</span>
            for (const value of STAKE_CHIPS) {
              <button
                key={String(value)}
                class="stake-chip"
                data-state={placedStake === value ? "selected" : "idle"}
                disabled={pending || value > maxStake}
                type="button"
                onClick={() => setStake(value)}
              >
                {value === 0 ? "PASS" : value}
              </button>
            }
            <button
              class="stake-chip"
              data-state={placedStake > 0 && placedStake === maxStake ? "selected" : "idle"}
              disabled={pending || maxStake <= 0}
              type="button"
              onClick={() => setStake(maxStake)}
            >
              {"MAX"}
            </button>
          </div>
        }

        if (!matchedCurrentPick) {
          <button
            class="slip-action"
            disabled={!normalizedHandleGuess || pending}
            type="button"
            onClick={() => submitPick({ authorGuess: handleGuess.trim() })}
          >
            {normalizedHandleGuess
              ? hasAuthorPick
                ? copy.game.updateSlip
                : copy.game.placeSlip
              : copy.game.enterHandle}
          </button>
        }
      }

      if (hasAuthorPick || !isOpen) {
        <div
          class={`notice ${isRevealed ? (authorCorrect ? "notice--good" : "notice--bad") : ""}`}
        >
          if (isRevealed) {
            <span class="notice__label">{authorCorrect ? copy.game.youWereRight : copy.game.answerWas}</span>
            <strong>{round.answer.author.name}</strong>
            <span>{round.answer.author.signature}</span>
            if (submission && submission.outcome.settled && (placedStake > 0 || submission.outcome.payout !== 0)) {
              <span class="payout-line" data-tone={submission.outcome.payout > 0 ? "win" : submission.outcome.payout < 0 ? "lose" : "push"}>
                {formatPayout(submission.outcome.payout)}
                {placedStake > 0 ? ` · staked ${placedStake}` : ""}
              </span>
            }
          } else {
            <span class="notice__label">
              {hasAuthorPick
                ? isOpen
                  ? copy.game.currentPick
                  : copy.game.slipPlaced
                : copy.game.roundLocked}
            </span>
            <strong>{hasAuthorPick ? selectedAuthorGuess : copy.game.noMorePicks}</strong>
            <span>
              {hasAuthorPick && isOpen
                ? copy.game.canChangeUntil(formatClock(round.locksAt, uiLanguage))
                : copy.game.revealAt(formatClock(round.revealsAt, uiLanguage))}
            </span>
            if (placedStake > 0) {
              <span class="payout-line" data-tone="push">{`Staked ${placedStake}`}</span>
            }
          }
        </div>
      }

      if (round.modelChoices?.length) {
        <section class="bonus-card">
          <div class="bonus-card__header">
            <p class="eyebrow">{copy.game.modelBonus}</p>
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
                <span>{copy.game.revealAt(formatClock(round.revealsAt, uiLanguage))}</span>
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
