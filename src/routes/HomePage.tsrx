import { Link } from "@tanstack/react-router";
import { DEFAULT_LANGUAGE } from "../gameData";
import { getCopy } from "../i18n";

export component HomePage() {
  const copy = getCopy(DEFAULT_LANGUAGE);

  <section class="home-card">
    <p class="eyebrow">{copy.home.eyebrow}</p>
    <h1>{copy.home.title}</h1>
    <p>{copy.home.intro}</p>
    <Link className="button button--primary" params={{ language: DEFAULT_LANGUAGE }} to="/play/$language">
      {copy.home.cta}
    </Link>
  </section>
}
