import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout.tsrx";
import { DEFAULT_LANGUAGE, LANGUAGES_BY_ID, isLanguageKey } from "./gameData";
import { ArchivePage } from "./routes/ArchivePage.tsrx";
import { HomePage } from "./routes/HomePage.tsrx";
import { IdentityPage } from "./routes/IdentityPage.tsrx";
import { LeaderboardPage } from "./routes/LeaderboardPage.tsrx";
import { PlayPage } from "./routes/PlayPage.tsrx";

const LANGUAGE_STORAGE_KEY = "guess-the-tweeter-language";

function readStoredLanguage() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageKey(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredLanguage(language) {
  if (typeof window === "undefined") return;
  try {
    if (isLanguageKey(language)) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  } catch {
    // Storage may be blocked (private mode, quota); fail silently —
    // language still works for the rest of this session via the URL.
  }
}

export function useCurrentLanguage() {
  return useRouterState({
    select: (state) => {
      // 1. URL path param wins (`/play/:lang`, `/archive/:lang`) so deep
      //    links honor exactly the language the URL says.
      const [, , pathLanguage] = state.location.pathname.split("/");
      if (LANGUAGES_BY_ID.has(pathLanguage)) {
        writeStoredLanguage(pathLanguage);
        return pathLanguage;
      }
      // 2. Search param next (`?lang=`) for routes without a path slot.
      const queryLang = state.location.search?.lang;
      if (isLanguageKey(queryLang)) {
        writeStoredLanguage(queryLang);
        return queryLang;
      }
      // 3. Fall back to whatever the user last picked anywhere on the
      //    site, so chrome on /identity, /leaderboard etc. stays in
      //    their preferred language across navigations.
      const stored = readStoredLanguage();
      if (stored) return stored;
      return DEFAULT_LANGUAGE;
    },
  });
}

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play",
  beforeLoad: () => {
    throw redirect({
      to: "/play/$language",
      params: { language: DEFAULT_LANGUAGE },
    });
  },
  component: () => <PlayPage language={DEFAULT_LANGUAGE} />,
});

const archiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/archive",
  beforeLoad: () => {
    throw redirect({
      to: "/archive/$language",
      params: { language: DEFAULT_LANGUAGE },
    });
  },
  component: () => <ArchivePage language={DEFAULT_LANGUAGE} />,
});

const playLanguageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play/$language",
  beforeLoad: ({ params }) => {
    if (!isLanguageKey(params.language)) {
      throw redirect({
        to: "/play/$language",
        params: { language: DEFAULT_LANGUAGE },
      });
    }
  },
  component: () => {
    const { language } = useParams({ from: "/play/$language" });
    return <PlayPage language={language} />;
  },
});

const archiveLanguageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/archive/$language",
  beforeLoad: ({ params }) => {
    if (!isLanguageKey(params.language)) {
      throw redirect({
        to: "/archive/$language",
        params: { language: DEFAULT_LANGUAGE },
      });
    }
  },
  component: () => {
    const { language } = useParams({ from: "/archive/$language" });
    return <ArchivePage language={language} />;
  },
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leaderboard",
  component: LeaderboardPage,
});

const identityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/identity",
  component: IdentityPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  playRoute,
  playLanguageRoute,
  archiveRoute,
  archiveLanguageRoute,
  leaderboardRoute,
  identityRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
