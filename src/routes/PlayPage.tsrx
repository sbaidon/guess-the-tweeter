import { GameBoard } from "../components/GameBoard.tsrx";
import { CATEGORY_META, DEFAULT_LANGUAGE, LANGUAGES_BY_ID } from "../gameData";
import { getCopy } from "../i18n";
import { useUiLanguage } from "../router";

export component PlayPage({ language = DEFAULT_LANGUAGE }) {
  // `language` (the prop) is the GAME language from the URL; chrome
  // reads the user's interface preference instead.
  const uiLanguage = useUiLanguage();
  const meta = CATEGORY_META.all;
  const languageMeta = LANGUAGES_BY_ID.get(language);
  const copy = getCopy(uiLanguage);

  <div
    class="play-shell"
    style={{
      "--active-accent": meta.accent,
      "--active-accent-soft": meta.soft,
    }}
  >
    <GameBoard category="all" language={language} />
    <p class="language-caption">
      {copy.play.roomCaption(languageMeta?.nativeName ?? "English")}
    </p>
  </div>

  <style>
    .play-shell {
      --active-accent: #111827;
      --active-accent-soft: rgba(17, 24, 39, 0.08);
    }
  </style>
}
