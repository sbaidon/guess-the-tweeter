import { Link } from "@tanstack/react-router";
import { DEFAULT_LANGUAGE } from "../gameData";

export component HomePage() {
  <section class="home-card">
    <p class="eyebrow">{"Hourly parody game"}</p>
    <h1>{"Guess who posted the fake tweet."}</h1>
    <p>
      {
        "A live round shows one fake multilingual post. Type the real handle, place your slip, and watch the crowd ledger after reveal."
      }
    </p>
    <Link className="button button--primary" params={{ language: DEFAULT_LANGUAGE }} to="/play/$language">
      {"Play current round"}
    </Link>
  </section>
}
