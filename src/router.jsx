import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout.tsrx";
import { isCategoryKey } from "./gameData";
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
  path: "/play/$category",
  beforeLoad: ({ params }) => {
    if (!isCategoryKey(params.category)) {
      throw redirect({
        to: "/play/$category",
        params: { category: "all" },
      });
    }
  },
  component: PlayPage,
});

const routeTree = rootRoute.addChildren([homeRoute, playRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
