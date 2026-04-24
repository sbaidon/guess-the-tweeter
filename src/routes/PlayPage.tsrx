import { GameBoard } from "../components/GameBoard.tsrx";
import { CATEGORY_META } from "../gameData";

export component PlayPage() {
  const meta = CATEGORY_META.all;

  <div
    class="play-shell"
    style={{
      "--active-accent": meta.accent,
      "--active-accent-soft": meta.soft,
    }}
  >
    <GameBoard category="all" />
  </div>

  <style>
    .play-shell {
      --active-accent: #111827;
      --active-accent-soft: rgba(17, 24, 39, 0.08);
    }
  </style>
}
