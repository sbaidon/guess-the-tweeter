import { Link, useRouterState } from "@tanstack/react-router";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGES_BY_ID } from "../gameData";

export component AppLayout({ children }) {
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const [, , pathLanguage] = currentPath.split("/");
  const currentLanguage = LANGUAGES_BY_ID.has(pathLanguage) ? pathLanguage : DEFAULT_LANGUAGE;
  const languageRoute = currentPath.startsWith("/archive") ? "/archive/$language" : "/play/$language";

  <div class="app-shell">
    <header class="topbar">
      <div class="page-shell page-shell--topbar">
        <Link className="brand" to="/">
          {"Guess the Tweeter"}
        </Link>

        <nav class="topnav" aria-label="Primary">
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            params={{ language: currentLanguage }}
            to="/play/$language"
          >
            {"Play"}
          </Link>
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            params={{ language: currentLanguage }}
            to="/archive/$language"
          >
            {"Archive"}
          </Link>
        </nav>
      </div>
      <div class="language-rail page-shell">
        for (const language of LANGUAGES) {
          <Link
            key={language.id}
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="language-rail__link"
            params={{ language: language.id }}
            to={languageRoute}
          >
            {language.nativeName}
          </Link>
        }
      </div>
    </header>

    <main class="app-main">
      <div class="page-shell">{children}</div>
    </main>
  </div>
}
