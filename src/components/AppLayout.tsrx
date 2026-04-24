import { Link } from "@tanstack/react-router";

const navigationItems = [
  {
    label: "Play",
    to: "/play",
  },
  {
    label: "Archive",
    to: "/archive",
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
