import { Link } from "@tanstack/react-router";

export component HomePage() {
  <section class="home-card">
    <p class="eyebrow">{"Hourly parody game"}</p>
    <h1>{"Guess who posted the fake tweet."}</h1>
    <p>
      {
        "A live round shows one fake post. Pick the parody account, then guess which model wrote it."
      }
    </p>
    <Link className="button button--primary" to="/play">
      {"Play current round"}
    </Link>
  </section>
}
