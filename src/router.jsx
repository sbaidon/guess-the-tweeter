import { useSyncExternalStore } from "react";
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

// Two distinct languages are now tracked:
//
//   GAME_LANGUAGE_KEY → the language of the tweets / round being played.
//                       Driven by the URL path on /play/:lang and /archive/:lang
//                       (and `?lang=` on legacy fallbacks). Cached so unrelated
//                       routes can preview round data without a path slot.
//
//   UI_LANGUAGE_KEY  → the language of the chrome (nav, copy, Intl). Decoupled
//                       from any URL — the user picks it once with the
//                       interface chip and it sticks across navigations.
const GAME_LANGUAGE_KEY = "guess-the-tweeter-language";
const UI_LANGUAGE_KEY = "guess-the-tweeter-ui-language";

function makeLanguageStore(key) {
  function read() {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(key);
      return isLanguageKey(stored) ? stored : null;
    } catch {
      return null;
    }
  }
  function write(language) {
    if (typeof window === "undefined") return;
    try {
      if (isLanguageKey(language)) {
        window.localStorage.setItem(key, language);
      }
    } catch {
      // Storage may be blocked (private mode, quota); fail silently —
      // language still works for the rest of this session.
    }
  }
  return { read, write };
}

const gameStore = makeLanguageStore(GAME_LANGUAGE_KEY);
const uiStore = makeLanguageStore(UI_LANGUAGE_KEY);

// localStorage is not natively reactive, so we wire a tiny pub/sub on top
// and feed it through React's useSyncExternalStore. setUiLanguage emits
// locally; cross-tab changes piggyback on the native `storage` event.
const uiSubscribers = new Set();

function subscribeUiLanguage(callback) {
  uiSubscribers.add(callback);
  function onStorage(event) {
    if (event.key === UI_LANGUAGE_KEY) callback();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    uiSubscribers.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function emitUiLanguageChange() {
  for (const subscriber of uiSubscribers) subscriber();
}

function detectBrowserLanguage() {
  if (typeof navigator === "undefined") return null;
  const candidates = [];
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
  if (typeof navigator.language === "string") candidates.push(navigator.language);
  for (const candidate of candidates) {
    const prefix = String(candidate).slice(0, 2).toLowerCase();
    if (isLanguageKey(prefix)) return prefix;
  }
  return null;
}

function getUiLanguageSnapshot() {
  const stored = uiStore.read();
  if (stored) return stored;
  const browser = detectBrowserLanguage();
  if (browser) return browser;
  return DEFAULT_LANGUAGE;
}

function getServerSnapshot() {
  return DEFAULT_LANGUAGE;
}

export function useUiLanguage() {
  return useSyncExternalStore(subscribeUiLanguage, getUiLanguageSnapshot, getServerSnapshot);
}

export function setUiLanguage(language) {
  if (!isLanguageKey(language)) return;
  uiStore.write(language);
  emitUiLanguageChange();
}

// Game language: URL-derived, cached so home/identity/leaderboard can still
// pick a sensible language for round previews when no path param exists.
export function useGameLanguage() {
  return useRouterState({
    select: (state) => {
      const [, , pathLanguage] = state.location.pathname.split("/");
      if (LANGUAGES_BY_ID.has(pathLanguage)) {
        gameStore.write(pathLanguage);
        return pathLanguage;
      }
      const queryLang = state.location.search?.lang;
      if (isLanguageKey(queryLang)) {
        gameStore.write(queryLang);
        return queryLang;
      }
      const stored = gameStore.read();
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
