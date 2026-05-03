import { Link, useRouterState } from "@tanstack/react-router";
import { LANGUAGES } from "../gameData";
import { getCopy } from "../i18n";
import { useCurrentLanguage } from "../router";

function languageLinkProps(pathname, langId) {
  if (pathname === "/") return { to: "/", search: { lang: langId } };
  if (pathname === "/leaderboard") return { to: "/leaderboard", search: { lang: langId } };
  if (pathname === "/identity") return { to: "/identity", search: { lang: langId } };
  if (pathname.startsWith("/archive")) return { to: "/archive/$language", params: { language: langId } };
  return { to: "/play/$language", params: { language: langId } };
}

export component AppLayout({ children }) {
  const currentLanguage = useCurrentLanguage();
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const copy = getCopy(currentLanguage);

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
            params={{ language: currentLanguage }}
            to="/play/$language"
          >
            {copy.nav.play}
          </Link>
          <Link
            activeProps={{ "data-active": "true" }}
            inactiveProps={{ "data-active": "false" }}
            className="topnav__link"
            params={{ language: currentLanguage }}
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
      </div>
      <div class="language-rail page-shell" role="group" aria-label={copy.nav.gameLanguage}>
        <span class="language-rail__label">{copy.nav.gameLanguage}</span>
        <div class="language-rail__pills">
          for (const language of LANGUAGES) {
            <Link
              key={language.id}
              activeProps={{ "data-active": "true" }}
              inactiveProps={{ "data-active": "false" }}
              className="language-rail__pill"
              data-current={language.id === currentLanguage ? "true" : "false"}
              aria-current={language.id === currentLanguage ? "true" : undefined}
              {...languageLinkProps(currentPath, language.id)}
            >
              <span class="language-rail__pill-name">{language.nativeName}</span>
              <span class="language-rail__pill-code">{language.id.toUpperCase()}</span>
            </Link>
          }
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="page-shell">{children}</div>
    </main>
  </div>
}
