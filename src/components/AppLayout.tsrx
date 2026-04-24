import { Link } from "@tanstack/react-router";

const navigationItems = [
  {
    label: "Home",
    to: "/",
    activeOptions: { exact: true },
  },
  {
    label: "Mixed Feed",
    to: "/play/$category",
    params: { category: "all" },
  },
  {
    label: "Tech",
    to: "/play/$category",
    params: { category: "tech" },
  },
  {
    label: "Politics",
    to: "/play/$category",
    params: { category: "politics" },
  },
  {
    label: "Sports",
    to: "/play/$category",
    params: { category: "sports" },
  },
  {
    label: "Host",
    to: "/host/$category",
    params: { category: "all" },
  },
];

export component AppLayout({ children }) {
  <div class="app-shell">
    <header class="topbar">
      <div class="page-shell page-shell--topbar">
        <Link className="brand" to="/">
          {"Guess the Tweeter"}
        </Link>

        <nav class="topnav" aria-label="Primary">
          for (const item of navigationItems) {
            <Link
              key={item.label}
              activeOptions={item.activeOptions}
              activeProps={{ "data-active": "true" }}
              inactiveProps={{ "data-active": "false" }}
              className="topnav__link"
              params={item.params}
              to={item.to}
            >
              {item.label}
            </Link>
          }
        </nav>
      </div>
    </header>

    <main class="app-main">
      <div class="page-shell">{children}</div>
    </main>
  </div>
}
