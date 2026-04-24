import { Link } from "@tanstack/react-router";
import { CATEGORY_META, CATEGORY_ORDER, getPostsForCategory } from "../gameData";

const homeTickerItems = [
  "TANSTACK ROUTER",
  "PARODY QUIZ",
  "TECH",
  "POLITICS",
  "SPORTS",
  "ROUTE-BASED MODES",
];

const repeatedTickerItems = homeTickerItems.concat(homeTickerItems);

export component HomePage() {
  <section
    class="hero hero--home"
    style={{
      "--active-accent": CATEGORY_META.all.accent,
      "--active-accent-soft": CATEGORY_META.all.soft,
    }}
  >
    <div class="hero__eyebrow">{"TANSTACK ROUTER / PARODY QUIZ / MULTI-FEED SATIRE"}</div>
    <div class="hero__grid">
      <div class="hero__copy">
        <p class="hero__kicker">{"Guess the Tweeter"}</p>
        <h1>{"Route into the feed, then call out the loudest internet archetype."}</h1>
        <p class="hero__lede">
          {
            "Start on a category route, read the fake post, and guess which parody persona posted it. Built to be silly first and expandable second."
          }
        </p>
        <div class="hero__actions">
          <Link className="button button--primary" params={{ category: "all" }} to="/play/$category">
            {"Launch Mixed Feed"}
          </Link>
          <Link className="button button--ghost" params={{ category: "tech" }} to="/play/$category">
            {"Start in Tech"}
          </Link>
        </div>
      </div>

      <div class="hero__panel">
        <p class="panel__label">{"What ships in v1"}</p>
        <p class="panel__text">
          {
            "Route-based modes, 24 parody prompts, category-specific suspect boards, and a score system that resets cleanly when you want a fresh run."
          }
        </p>
        <div class="panel__chips">
          <span>{"Vite"}</span>
          <span>{"React"}</span>
          <span>{"TSRX"}</span>
          <span>{"TanStack Router"}</span>
        </div>
      </div>
    </div>

    <div class="ticker" aria-hidden="true">
      <div class="ticker__track">
        for (const [index, item] of repeatedTickerItems.entries()) {
          <span key={`${item}-${index}`}>{item}</span>
        }
      </div>
    </div>
  </section>

  <section class="launch-grid">
    for (const category of CATEGORY_ORDER) {
      const meta = CATEGORY_META[category];
      const path = `/play/${category}`;

      <Link
        key={category}
        className="launch-card"
        params={{ category }}
        style={{
          "--card-accent": meta.accent,
          "--card-accent-soft": meta.soft,
        }}
        to="/play/$category"
      >
        <span class="launch-card__label">{"Route"}</span>
        <h2 class="launch-card__title">{meta.name}</h2>
        <p class="launch-card__body">{meta.blurb}</p>
        <div class="launch-card__footer">
          <strong class="launch-card__route">{path}</strong>
          <span>{`${getPostsForCategory(category).length} prompts`}</span>
        </div>
      </Link>
    }
  </section>

  <section class="feature-strip">
    <article class="feature-card">
      <p class="section-card__label">{"Why Router"}</p>
      <h2 class="feature-card__title">
        {"Modes become actual URLs instead of a UI toggle."}
      </h2>
      <p class="feature-card__body">
        {
          "Each category sits on its own route, which gives you cleaner navigation, future sharing, and an obvious place to grow daily challenge or versus modes later."
        }
      </p>
    </article>

    <article class="feature-card">
      <p class="section-card__label">{"Why TSRX"}</p>
      <h2 class="feature-card__title">
        {"This is the incremental trial: routed UI in .tsrx, game logic still in React."}
      </h2>
      <p class="feature-card__body">
        {
          "The experiment is intentionally narrow. TSRX handles the highly declarative layout work while the stateful quiz engine stays in regular React until there is a strong reason to move more."
        }
      </p>
    </article>

    <article class="feature-card">
      <p class="section-card__label">{"Where next"}</p>
      <h2 class="feature-card__title">{"Swap the seed data for anything."}</h2>
      <p class="feature-card__body">
        {
          "The game data is isolated, so you can replace the parody set with hand-written content, generated content, or a real backend without rewriting the router or layout."
        }
      </p>
    </article>
  </section>

  <style>
    .launch-card__route {
      font-weight: 700;
    }
  </style>
}
