import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useParams,
} from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout.tsrx";
import { DEFAULT_LANGUAGE, isLanguageKey } from "./gameData";
import { ArchivePage } from "./routes/ArchivePage.tsrx";
import { HomePage } from "./routes/HomePage.tsrx";
import { PlayPage } from "./routes/PlayPage.tsrx";

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

const routeTree = rootRoute.addChildren([
  homeRoute,
  playRoute,
  playLanguageRoute,
  archiveRoute,
  archiveLanguageRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
