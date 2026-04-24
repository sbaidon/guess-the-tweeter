import { Link, useParams } from "@tanstack/react-router";
import { GameBoard } from "../components/GameBoard";
import { CATEGORY_META } from "../gameData";

export component PlayPage() {
  const { category } = useParams({ from: "/play/$category" });
  const meta = CATEGORY_META[category];

  <div
    class="play-shell"
    style={{
      "--active-accent": meta.accent,
      "--active-accent-soft": meta.soft,
    }}
  >
    <section class="hero hero--play">
      <div class="hero__eyebrow">{`LIVE ROUND / ${meta.name.toUpperCase()} / PARODY DETECTOR`}</div>
      <div class="hero__grid">
        <div class="hero__copy">
          <p class="hero__kicker">{meta.name}</p>
          <h1>{meta.heroTitle}</h1>
          <p class="hero__lede">{meta.blurb}</p>
        </div>

        <div class="hero__panel">
          <p class="panel__label">{"Current route"}</p>
          <p class="panel__text">{`/play/${category}`}</p>
          <div class="panel__chips">
            <span>{"4 choices"}</span>
            <span>{"Score streaks"}</span>
            <span>{"Reset anytime"}</span>
          </div>
          <div class="hero__actions hero__actions--stacked">
            <Link className="button button--ghost" to="/">
              {"Back Home"}
            </Link>
          </div>
        </div>
      </div>
    </section>

    <GameBoard key={category} category={category} />
  </div>

  <style>
    .play-shell {
      display: grid;
      gap: 22px;
    }
  </style>
}
