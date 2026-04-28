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

export function useCurrentLanguage() {
  return useRouterState({
    select: (state) => {
      const [, , pathLanguage] = state.location.pathname.split("/");
      if (LANGUAGES_BY_ID.has(pathLanguage)) return pathLanguage;
      const queryLang = state.location.search?.lang;
      return isLanguageKey(queryLang) ? queryLang : DEFAULT_LANGUAGE;
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
