import { Link } from "@tanstack/react-router";

export component HomePage() {
  <section class="home-card">
    <p class="eyebrow">{"Hourly parody game"}</p>
    <h1>{"Guess who posted the fake tweet."}</h1>
    <p>
      {
        "A live round shows one fake post. Type the handle, place your slip, and watch the crowd ledger after reveal."
      }
    </p>
    <Link className="button button--primary" to="/play">
      {"Play current round"}
    </Link>
  </section>
}
