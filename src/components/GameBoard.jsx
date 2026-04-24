import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AUTHORS_BY_ID,
  CATEGORY_META,
  CATEGORY_ORDER,
  POSTS_BY_ID,
  getAuthorsForMode,
  getPostsForCategory,
  getRosterGroups,
} from "../gameData";

function shuffle(items) {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function buildChoiceIds(post, category) {
  const pool = getAuthorsForMode(category, post.category).filter(
    (author) => author.id !== post.authorId,
  );
  const distractorIds = shuffle(pool)
    .slice(0, 3)
    .map((author) => author.id);

  return shuffle([post.authorId, ...distractorIds]);
}

function drawRound(category, existingDeck = []) {
  const nextDeck = existingDeck.length
    ? existingDeck
    : shuffle(getPostsForCategory(category).map((post) => post.id));
  const [currentPostId, ...remainingDeck] = nextDeck;
  const currentPost = POSTS_BY_ID.get(currentPostId);

  return {
    currentPostId,
    deck: remainingDeck,
    choiceIds: buildChoiceIds(currentPost, category),
  };
}

function createInitialGameState(category) {
  const initialRound = drawRound(category);

  return {
    ...initialRound,
    answered: 0,
    bestStreak: 0,
    locked: false,
    score: 0,
    selectedAuthorId: null,
    streak: 0,
    wasCorrect: null,
  };
}

export function GameBoard({ category }) {
  const [gameState, setGameState] = useState(() => createInitialGameState(category));
  const currentPost = POSTS_BY_ID.get(gameState.currentPostId);
  const currentAuthor = AUTHORS_BY_ID.get(currentPost.authorId);
  const currentPostMeta = CATEGORY_META[currentPost.category];
  const modeMeta = CATEGORY_META[category];
  const accuracy =
    gameState.answered === 0 ? 0 : Math.round((gameState.score / gameState.answered) * 100);

  function handleNextRound() {
    setGameState((currentState) => {
      const nextRound = drawRound(category, currentState.deck);

      return {
        ...currentState,
        ...nextRound,
        locked: false,
        selectedAuthorId: null,
        wasCorrect: null,
      };
    });
  }

  function handleAnswer(authorId) {
    setGameState((currentState) => {
      if (currentState.locked) {
        return currentState;
      }

      const activePost = POSTS_BY_ID.get(currentState.currentPostId);
      const wasCorrect = authorId === activePost.authorId;
      const nextStreak = wasCorrect ? currentState.streak + 1 : 0;

      return {
        ...currentState,
        answered: currentState.answered + 1,
        bestStreak: Math.max(currentState.bestStreak, nextStreak),
        locked: true,
        score: currentState.score + (wasCorrect ? 1 : 0),
        selectedAuthorId: authorId,
        streak: nextStreak,
        wasCorrect,
      };
    });
  }

  function handleResetScore() {
    setGameState(createInitialGameState(category));
  }

  return (
    <div
      className="game-layout"
      style={{
        "--active-accent": modeMeta.accent,
        "--active-accent-soft": modeMeta.soft,
      }}
    >
      <section className="control-panel">
        <div className="section-card">
          <p className="section-card__label">Choose a feed</p>
          <nav className="category-filters" aria-label="Categories">
            {CATEGORY_ORDER.map((categoryKey) => {
              const meta = CATEGORY_META[categoryKey];
              const postCount = getPostsForCategory(categoryKey).length;

              return (
                <Link
                  key={categoryKey}
                  activeProps={{ "data-active": "true" }}
                  inactiveProps={{ "data-active": "false" }}
                  className="category-button"
                  params={{ category: categoryKey }}
                  to="/play/$category"
                >
                  <div className="category-button__label-row">
                    <span className="category-button__name">{meta.name}</span>
                    <span className="category-button__count">{postCount}</span>
                  </div>
                  <p className="category-button__blurb">{meta.blurb}</p>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="section-card section-card--secondary">
          <p className="section-card__label">Session pulse</p>
          <div className="session-grid">
            <div className="session-grid__item">
              <span className="session-grid__name">Mode</span>
              <strong className="session-grid__value">{modeMeta.name}</strong>
            </div>
            <div className="session-grid__item">
              <span className="session-grid__name">Deck left</span>
              <strong className="session-grid__value">{gameState.deck.length}</strong>
            </div>
            <div className="session-grid__item">
              <span className="session-grid__name">Best streak</span>
              <strong className="session-grid__value">{gameState.bestStreak}</strong>
            </div>
            <div className="session-grid__item">
              <span className="session-grid__name">Route</span>
              <strong className="session-grid__value">{`/play/${category}`}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="stage">
        <div className="stage__meta">
          <div className="stage__pill">{currentPostMeta.name}</div>
          <div className="stage__round">Round {gameState.answered + 1}</div>
        </div>

        <article className="quote-card" aria-labelledby="quotePrompt">
          <p id="quotePrompt" className="quote-card__label">
            Who posted this?
          </p>
          <blockquote className="quote-card__text">{currentPost.text}</blockquote>
        </article>

        <div className="choice-grid" aria-label="Answer choices">
          {gameState.choiceIds.map((choiceId, index) => {
            const author = AUTHORS_BY_ID.get(choiceId);
            let dataState = "";

            if (gameState.locked) {
              if (choiceId === currentPost.authorId) {
                dataState = "correct";
              } else if (choiceId === gameState.selectedAuthorId) {
                dataState = "incorrect";
              }
            }

            return (
              <button
                key={choiceId}
                className="choice-button"
                data-disabled={gameState.locked ? "true" : "false"}
                data-state={dataState}
                disabled={gameState.locked}
                type="button"
                onClick={() => handleAnswer(choiceId)}
              >
                <div className="choice-button__top">
                  <span className="choice-button__badge">{index + 1}</span>
                  <span className="choice-button__name">{author.name}</span>
                </div>
                <span className="choice-button__handle">{author.handle}</span>
                <p className="choice-button__bio">{author.bio}</p>
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className={`feedback ${gameState.locked ? "" : "is-hidden"} ${
            gameState.wasCorrect ? "is-correct" : "is-incorrect"
          }`}
        >
          {gameState.locked && (
            <>
              <h2 className="feedback__title">
                {gameState.wasCorrect ? "Correct read." : "Wrong feed."} {currentAuthor.name}
              </h2>
              <p>{currentAuthor.signature}</p>
              <p className="feedback__meta">
                {currentAuthor.handle} / {currentAuthor.bio}
              </p>
            </>
          )}
        </div>

        <div className="stage__actions">
          <button
            className="button button--primary"
            disabled={!gameState.locked}
            type="button"
            onClick={handleNextRound}
          >
            Next Round
          </button>
          <button className="button button--ghost" type="button" onClick={handleResetScore}>
            Reset Score
          </button>
        </div>
      </section>

      <aside className="sidebar">
        <div className="scoreboard">
          <div className="scoreboard__item">
            <span className="scoreboard__label">Score</span>
            <strong className="scoreboard__value">{gameState.score}</strong>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">Accuracy</span>
            <strong className="scoreboard__value">{accuracy}%</strong>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">Streak</span>
            <strong className="scoreboard__value">{gameState.streak}</strong>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">Answered</span>
            <strong className="scoreboard__value">{gameState.answered}</strong>
          </div>
        </div>

        <section className="roster-card">
          <div className="roster-card__head">
            <p className="section-card__label">Suspect board</p>
            <span className="roster-card__hint">
              {category === "all" ? "All archetypes in the mixed feed" : "Current category lineup"}
            </span>
          </div>

          <div className="roster-list">
            {getRosterGroups(category).map((group) => (
              <section key={group.key} className="roster-group">
                {category === "all" && <h2 className="roster-group__title">{group.meta.name}</h2>}
                {group.authors.map((author) => (
                  <article key={author.id} className="roster-item">
                    <div className="roster-item__head">
                      <h3 className="roster-item__name">{author.name}</h3>
                      <span className="roster-item__handle">{author.handle}</span>
                    </div>
                    <p className="roster-item__bio">{author.bio}</p>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
