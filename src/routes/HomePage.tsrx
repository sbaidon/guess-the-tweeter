import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_LANGUAGE } from "../gameData";
import { getCopy, getLocale } from "../i18n";
import { fetchCurrentRound } from "../liveApi";

function formatClock(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export component HomePage() {
  const copy = getCopy(DEFAULT_LANGUAGE);
  const { data: round } = useQuery({
    queryKey: ["round", "all", DEFAULT_LANGUAGE],
    queryFn: ({ signal }) => fetchCurrentRound("all", "home", DEFAULT_LANGUAGE, signal),
  });

  const liveLine = round
    ? round.status === "open"
      ? `Round ${round.contest.roundNumber} · locks ${formatClock(round.locksAt, DEFAULT_LANGUAGE)}`
      : round.status === "locked"
        ? `Round ${round.contest.roundNumber} · reveal ${formatClock(round.revealsAt, DEFAULT_LANGUAGE)}`
        : `Round ${round.contest.roundNumber} · revealed`
    : null;

  <section class="home-card">
    <p class="eyebrow">{copy.home.eyebrow}</p>
    <h1>{copy.home.title}</h1>
    <p>{copy.home.intro}</p>

    if (liveLine) {
      <div class="home-live">
        <span class="live-dot" />
        <span class="home-live__text">
          <span class="home-live__line">{liveLine}</span>
          <span class="home-live__hint">{`${round.totals.connected} live`}</span>
        </span>
      </div>
    }

    <Link className="button button--primary" params={{ language: DEFAULT_LANGUAGE }} to="/play/$language">
      {copy.home.cta}
    </Link>
  </section>
}
