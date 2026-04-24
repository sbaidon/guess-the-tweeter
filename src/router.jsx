import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout.tsrx";
import { isCategoryKey } from "./gameData";
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
  component: PlayPage,
});

const archiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/archive",
  component: ArchivePage,
});

const legacyPlayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play/$category",
  beforeLoad: ({ params }) => {
    if (!isCategoryKey(params.category)) {
      throw redirect({
        to: "/play",
      });
    }

    throw redirect({
      to: "/play",
    });
  },
  component: PlayPage,
});

const routeTree = rootRoute.addChildren([homeRoute, playRoute, archiveRoute, legacyPlayRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
