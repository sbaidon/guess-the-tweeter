import { Link, useRouterState } from "@tanstack/react-router";
import { LANGUAGES } from "../gameData";
import { getCopy } from "../i18n";
import { setUiLanguage, useGameLanguage, useUiLanguage } from "../router";

function languageLinkProps(pathname, langId) {
  if (pathname.startsWith("/archive")) return { to: "/archive/$language", params: { language: langId } };
  return { to: "/play/$language", params: { language: langId } };
}

function showsGameRail(pathname) {
  return pathname.startsWith("/play") || pathname.startsWith("/archive");
}

export component AppLayout({ children }) {
  const uiLanguage = useUiLanguage();
  const gameLanguage = useGameLanguage();
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const copy = getCopy(uiLanguage);
  const showRail = showsGameRail(currentPath);

  <div class="app-shell">
    <header class="topbar">
      <div class="page-shell page-shell--topbar">
        <Link className="brand" to="/">
          {copy.brand}
        </Link>

        <nav class="topnav" aria-label={copy.nav.play}>
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            params={{ language: gameLanguage }}
            to="/play/$language"
          >
            {copy.nav.play}
          </Link>
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            params={{ language: gameLanguage }}
            to="/archive/$language"
          >
            {copy.nav.archive}
          </Link>
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            to="/leaderboard"
          >
            {copy.nav.leaderboard}
          </Link>
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            to="/identity"
          >
            {copy.nav.identity}
          </Link>
        </nav>

        <details class="ui-language-chip">
          <summary
            class="ui-language-chip__trigger"
            aria-label={`${copy.nav.interfaceLanguage}: ${uiLanguage.toUpperCase()}`}
            title={copy.nav.interfaceLanguage}
          >
            <span class="ui-language-chip__code">{uiLanguage.toUpperCase()}</span>
          </summary>
          <div class="ui-language-chip__menu" role="menu">
            for (const language of LANGUAGES) {
              <button
                key={language.id}
                class="ui-language-chip__option"
                data-current={language.id === uiLanguage ? "true" : "false"}
                aria-current={language.id === uiLanguage ? "true" : undefined}
                role="menuitemradio"
                type="button"
                onClick={(event) => {
                  setUiLanguage(language.id);
                  // Close the popover after selection.
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <span class="ui-language-chip__option-name">{language.nativeName}</span>
                <span class="ui-language-chip__option-code">{language.id.toUpperCase()}</span>
              </button>
            }
          </div>
        </details>
      </div>

      if (showRail) {
        <div class="language-rail page-shell" role="group" aria-label={copy.nav.gameLanguage}>
          <span class="language-rail__label">{copy.nav.gameLanguage}</span>
          <div class="language-rail__pills">
            for (const language of LANGUAGES) {
              <Link
                key={language.id}
                activeProps={{ "data-active": "true" }}
                inactiveProps={{ "data-active": "false" }}
                className="language-rail__pill"
                data-current={language.id === gameLanguage ? "true" : "false"}
                aria-current={language.id === gameLanguage ? "true" : undefined}
                {...languageLinkProps(currentPath, language.id)}
              >
                <span class="language-rail__pill-name">{language.nativeName}</span>
                <span class="language-rail__pill-code">{language.id.toUpperCase()}</span>
              </Link>
            }
          </div>
        </div>
      }
    </header>

    <main class="app-main">
      <div class="page-shell">{children}</div>
    </main>
  </div>
}
