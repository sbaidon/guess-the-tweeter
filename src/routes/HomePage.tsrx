import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCopy, getLocale } from "../i18n";
import { fetchCurrentRound } from "../liveApi";
import { useCurrentLanguage } from "../router";

function formatClock(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function roundPhase(round, language) {
  if (round.status === "open") return `locks ${formatClock(round.locksAt, language)}`;
  if (round.status === "locked") return `reveal ${formatClock(round.revealsAt, language)}`;
  return "revealed";
}

export component HomePage() {
  const language = useCurrentLanguage();
  const copy = getCopy(language);
  const { data: round } = useQuery({
    queryKey: ["round", "all", language],
    queryFn: ({ signal }) => fetchCurrentRound("all", "home", language, signal),
  });

  const liveLine = round ? `Round ${round.contest.roundNumber} · ${roundPhase(round, language)}` : null;

  <section class="home-card">
    <p class="eyebrow">{copy.home.eyebrow}</p>
    <h1>{copy.home.title}</h1>

    if (liveLine) {
      <div class="home-live">
        <span class="live-dot" />
        <span class="home-live__text">
          <span class="home-live__line">{liveLine}</span>
          <span class="home-live__hint">{`${round.totals.connected} live`}</span>
        </span>
      </div>
    }

    <Link className="button button--primary" params={{ language }} to="/play/$language">
      {copy.home.cta}
    </Link>
  </section>
}
