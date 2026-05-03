import { useQuery } from "@tanstack/react-query";
import { AuthorAvatar } from "../components/AuthorAvatar.tsrx";
import { CATEGORY_META, DEFAULT_LANGUAGE, LANGUAGES_BY_ID } from "../gameData";
import { getCopy, getLocale } from "../i18n";
import { fetchRoundHistory } from "../liveApi";
import { useUiLanguage } from "../router";

function formatRoundTime(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export component ArchivePage({ language = DEFAULT_LANGUAGE }) {
  // `language` (the prop) is the GAME language (URL path param) — drives
  // which past rounds we fetch. UI chrome uses the user's separate
  // interface preference.
  const uiLanguage = useUiLanguage();
  const languageMeta = LANGUAGES_BY_ID.get(language);
  const copy = getCopy(uiLanguage);
  const { data, isError } = useQuery({
    queryKey: ["roundHistory", language],
    queryFn: ({ signal }) => fetchRoundHistory(18, language, signal),
  });
  const rounds = data?.rounds ?? [];
  const error = isError ? copy.errors.loadArchive : "";

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
              <span>{formatRoundTime(round.startsAt, uiLanguage)}</span>
              <span>{`${copy.categories[round.post.category] ?? meta.name} · ${round.post.languageNativeName}`}</span>
            </div>
            <p>{round.post.text}</p>
            <div class="fiction-notice fiction-notice--archive">
              {copy.game.fictionNotice}
            </div>
            <div class="archive-round__answer">
              <AuthorAvatar author={round.answer.author} size="sm" />
              <div class="archive-round__answer-text">
                <strong>{round.answer.author.handle}</strong>
                <span>{round.answer.author.name}</span>
              </div>
            </div>
            if (round.answer.model) {
              <span class="archive-round__model">{`Model · ${round.answer.model.name}`}</span>
            }
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
