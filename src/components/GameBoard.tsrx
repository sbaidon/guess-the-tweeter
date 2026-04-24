import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATEGORY_META, CATEGORY_ORDER, getPostsForCategory, getRosterGroups } from "../gameData";
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
    return `Locked, reveal at ${formatClock(round.revealsAt)}`;
  }

  return "Revealed";
}

component ResultList({ items, kind }) {
  <div class="results-list">
    for (const item of items) {
      const label = kind === "author" ? item.author.name : item.model.name;
      const key = kind === "author" ? item.author.id : item.model.id;

      <div key={key} class="result-row">
        <div class="result-row__meta">
          <span class="result-row__name">{label}</span>
          <span class="result-row__count">{`${item.count} picks / ${item.percentage}%`}</span>
        </div>
        <div class="result-row__track">
          <span
            class="result-row__bar"
            data-correct={item.correct ? "true" : "false"}
            style={{ width: `${item.percentage}%` }}
          />
        </div>
      </div>
    }
  </div>
}

export component GameBoard({ category }) {
  const [clientId] = useState(getClientId);
  const [round, setRound] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const modeMeta = CATEGORY_META[category];
  const postMeta = round ? CATEGORY_META[round.post.category] : modeMeta;
  const selectedAuthorId = round?.submission?.authorId ?? null;
  const selectedModelId = round?.submission?.modelId ?? null;
  const hasAuthorPick = Boolean(selectedAuthorId);
  const hasModelPick = Boolean(selectedModelId);
  const isOpen = round?.status === "open";
  const isRevealed = round?.status === "revealed";
  const authorCorrect =
    isRevealed && selectedAuthorId && selectedAuthorId === round.answer.author.id;
  const modelCorrect = isRevealed && selectedModelId && selectedModelId === round.answer.model.id;
  const authorCorrectRate =
    isRevealed && round.results.authorTotal
      ? round.results.authors.find((item) => item.correct)?.percentage ?? 0
      : 0;
  const modelCorrectRate =
    isRevealed && round.results.modelTotal
      ? round.results.models.find((item) => item.correct)?.percentage ?? 0
      : 0;

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

  <div
    class="game-layout"
    style={{
      "--active-accent": modeMeta.accent,
      "--active-accent-soft": modeMeta.soft,
    }}
  >
    <section class="control-panel">
      <div class="section-card">
        <p class="section-card__label">{"Choose a feed"}</p>
        <nav class="category-filters" aria-label="Categories">
          for (const categoryKey of CATEGORY_ORDER) {
            const meta = CATEGORY_META[categoryKey];
            const postCount = getPostsForCategory(categoryKey).length;

            <Link
              key={categoryKey}
              activeProps={{ "data-active": "true" }}
              inactiveProps={{ "data-active": "false" }}
              className="category-button"
              params={{ category: categoryKey }}
              to="/play/$category"
            >
              <div class="category-button__label-row">
                <span class="category-button__name">{meta.name}</span>
                <span class="category-button__count">{postCount}</span>
              </div>
              <p class="category-button__blurb">{meta.blurb}</p>
            </Link>
          }
        </nav>
      </div>

      <div class="section-card section-card--secondary">
        <p class="section-card__label">{"Live room"}</p>
        <div class="session-grid">
          <div class="session-grid__item">
            <span class="session-grid__name">{"Mode"}</span>
            <strong class="session-grid__value">{modeMeta.name}</strong>
          </div>
          <div class="session-grid__item">
            <span class="session-grid__name">{"Status"}</span>
            <strong class="session-grid__value">{getStatusLabel(round)}</strong>
          </div>
          <div class="session-grid__item">
            <span class="session-grid__name">{"Picks"}</span>
            <strong class="session-grid__value">{round?.totals.submissions ?? 0}</strong>
          </div>
          <div class="session-grid__item">
            <span class="session-grid__name">{"Live"}</span>
            <strong class="session-grid__value">{round?.totals.connected ?? 0}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="stage">
      if (error) {
        <div class="feedback is-incorrect">{error}</div>
      }

      if (!round && !error) {
        <div class="feedback">{"Loading round..."}</div>
      }

      if (round) {
        <div class="stage__meta">
          <div class="stage__pill">{postMeta.name}</div>
          <div class="stage__round">{getStatusLabel(round)}</div>
        </div>

        <article class="quote-card" aria-labelledby="quotePrompt">
          <p id="quotePrompt" class="quote-card__label">{"Who posted this?"}</p>
          <blockquote class="quote-card__text">{round.post.text}</blockquote>
        </article>

        <div class="choice-grid" aria-label="Answer choices">
          for (const [index, author] of round.authorChoices.entries()) {
            const dataState = getChoiceState(
              author.id,
              round.answer?.author.id,
              selectedAuthorId,
              round.status,
            );

            <button
              key={author.id}
              class="choice-button"
              data-disabled={!isOpen || hasAuthorPick ? "true" : "false"}
              data-state={dataState}
              disabled={!isOpen || hasAuthorPick || pending}
              type="button"
              onClick={() => submitPick({ authorId: author.id })}
            >
              <div class="choice-button__top">
                <span class="choice-button__badge">{index + 1}</span>
                <span class="choice-button__name">{author.name}</span>
              </div>
              <span class="choice-button__handle">{author.handle}</span>
              <p class="choice-button__bio">{author.bio}</p>
            </button>
          }
        </div>

        <div
          aria-live="polite"
          class={`feedback ${hasAuthorPick || !isOpen ? "" : "is-hidden"} ${
            isRevealed ? (authorCorrect ? "is-correct" : "is-incorrect") : ""
          }`}
        >
          if (isRevealed) {
            <h2 class="feedback__title">
              {`${authorCorrect ? "Author hit." : "Author reveal."} ${round.answer.author.name}`}
            </h2>
            <p>{round.answer.author.signature}</p>
            <p class="feedback__meta">
              {`${round.answer.author.handle} / ${round.answer.author.bio}`}
            </p>
          } else {
            <h2 class="feedback__title">
              {hasAuthorPick ? "Author pick locked." : "Round locked."}
            </h2>
            <p>{`Reveal at ${formatClock(round.revealsAt)}.`}</p>
          }
        </div>

        if (hasAuthorPick || !isOpen) {
          <section class="bonus-panel" aria-labelledby="bonusPrompt">
            <div class="bonus-panel__header">
              <div>
                <p id="bonusPrompt" class="quote-card__label">{"Bonus round"}</p>
                <h2 class="bonus-panel__title">{"Which model generated this fake post?"}</h2>
              </div>
              <span class="bonus-panel__value">{"+1 point"}</span>
            </div>

            <div class="choice-grid choice-grid--bonus" aria-label="Model choices">
              for (const [index, model] of round.modelChoices.entries()) {
                const dataState = getChoiceState(
                  model.id,
                  round.answer?.model.id,
                  selectedModelId,
                  round.status,
                );

                <button
                  key={model.id}
                  class="choice-button choice-button--model"
                  data-disabled={!isOpen || !hasAuthorPick || hasModelPick ? "true" : "false"}
                  data-state={dataState}
                  disabled={!isOpen || !hasAuthorPick || hasModelPick || pending}
                  type="button"
                  onClick={() => submitPick({ modelId: model.id })}
                >
                  <div class="choice-button__top">
                    <span class="choice-button__badge">{`M${index + 1}`}</span>
                    <span class="choice-button__name">{model.name}</span>
                  </div>
                  <p class="choice-button__bio">{model.blurb}</p>
                </button>
              }
            </div>

            <div
              class={`bonus-feedback ${hasModelPick || isRevealed ? "" : "is-hidden"} ${
                isRevealed ? (modelCorrect ? "is-correct" : "is-incorrect") : ""
              }`}
            >
              if (isRevealed) {
                <h3 class="feedback__title">
                  {`${modelCorrect ? "Model hit." : "Model reveal."} ${round.answer.model.name}`}
                </h3>
                <p>{round.answer.model.blurb}</p>
              } else {
                <h3 class="feedback__title">{"Model pick locked."}</h3>
                <p>{"Stored with the round until reveal."}</p>
              }
            </div>
          </section>
        }

        if (isRevealed) {
          <section class="results-panel">
            <div class="results-panel__grid">
              <div>
                <p class="section-card__label">{"Author picks"}</p>
                <ResultList items={round.results.authors} kind="author" />
              </div>
              <div>
                <p class="section-card__label">{"Model picks"}</p>
                <ResultList items={round.results.models} kind="model" />
              </div>
            </div>
          </section>
        }
      }
    </section>

    <aside class="sidebar">
      <div class="scoreboard">
        <div class="scoreboard__item">
          <span class="scoreboard__label">{"Picks"}</span>
          <strong class="scoreboard__value">{round?.totals.submissions ?? 0}</strong>
        </div>
        <div class="scoreboard__item">
          <span class="scoreboard__label">{"Live"}</span>
          <strong class="scoreboard__value">{round?.totals.connected ?? 0}</strong>
        </div>
        <div class="scoreboard__item">
          <span class="scoreboard__label">{"Author hit rate"}</span>
          <strong class="scoreboard__value">{isRevealed ? `${authorCorrectRate}%` : "--"}</strong>
        </div>
        <div class="scoreboard__item">
          <span class="scoreboard__label">{"Model hit rate"}</span>
          <strong class="scoreboard__value">{isRevealed ? `${modelCorrectRate}%` : "--"}</strong>
        </div>
      </div>

      <section class="roster-card">
        <div class="roster-card__head">
          <p class="section-card__label">{"Suspect board"}</p>
          <span class="roster-card__hint">
            {category === "all" ? "All archetypes in the mixed feed" : "Current category lineup"}
          </span>
        </div>

        <div class="roster-list">
          for (const group of getRosterGroups(category)) {
            <section key={group.key} class="roster-group">
              if (category === "all") {
                <h2 class="roster-group__title">{group.meta.name}</h2>
              }

              for (const author of group.authors) {
                <article key={author.id} class="roster-item">
                  <div class="roster-item__head">
                    <h3 class="roster-item__name">{author.name}</h3>
                    <span class="roster-item__handle">{author.handle}</span>
                  </div>
                  <p class="roster-item__bio">{author.bio}</p>
                </article>
              }
            </section>
          }
        </div>
      </section>
    </aside>
  </div>
}
