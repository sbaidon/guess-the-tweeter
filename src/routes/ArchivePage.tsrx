import { useEffect, useState } from "react";
import { CATEGORY_META, DEFAULT_LANGUAGE, LANGUAGES_BY_ID } from "../gameData";
import { getCopy, getLocale } from "../i18n";
import { fetchRoundHistory } from "../liveApi";

function formatRoundTime(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export component ArchivePage({ language = DEFAULT_LANGUAGE }) {
  const [rounds, setRounds] = useState([]);
  const [error, setError] = useState("");
  const languageMeta = LANGUAGES_BY_ID.get(language);
  const copy = getCopy(language);

  useEffect(() => {
    const controller = new AbortController();

    fetchRoundHistory(18, language, controller.signal)
      .then((payload) => {
        setRounds(payload.rounds ?? []);
        setError("");
      })
      .catch((nextError) => {
        if (nextError.name !== "AbortError") {
          setError(copy.errors.loadArchive);
        }
      });

    return () => controller.abort();
  }, [language]);

  <section class="archive-card">
    <p class="eyebrow">{copy.archive.eyebrow}</p>
    <h1>{copy.archive.title}</h1>
    <p class="archive-card__intro">
      {copy.archive.intro(languageMeta?.nativeName ?? "English")}
    </p>

    if (error) {
      <div class="notice notice--bad">{error}</div>
    }

    if (!error && rounds.length === 0) {
      <div class="notice">
        <strong>{copy.archive.emptyTitle}</strong>
        <span>{copy.archive.emptyDetail}</span>
      </div>
    }

    if (rounds.length > 0) {
      <div class="archive-list">
        for (const round of rounds) {
          const meta = CATEGORY_META[round.post.category] ?? CATEGORY_META.all;

          <article key={round.id} class="archive-round">
            <div class="archive-round__meta">
              <span>{formatRoundTime(round.startsAt, language)}</span>
              <span>{`${copy.categories[round.post.category] ?? meta.name} · ${round.post.languageNativeName}`}</span>
            </div>
            <p>{round.post.text}</p>
            <div class="archive-round__answer">
              <strong>{round.answer.author.handle}</strong>
              <span>{round.answer.author.name}</span>
            </div>
            <div class="archive-round__winners">
              {copy.archive.winners(
                round.results.winnerCount,
                round.results.authorTotal,
                round.results.winnerPercentage,
              )}
            </div>
          </article>
        }
      </div>
    }
  </section>
}
