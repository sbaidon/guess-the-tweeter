import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCopy } from "../i18n";
import { getIdentity } from "../identity";
import { fetchLeaderboard, getClientId } from "../liveApi";
import { useCurrentLanguage } from "../router";

export component LeaderboardPage() {
  const [clientId] = useState(getClientId);
  const [scope, setScope] = useState("all");
  const language = useCurrentLanguage();
  const copy = getCopy(language);
  const { data: identity = null } = useQuery({ queryKey: ["identity"], queryFn: getIdentity });
  const { data, isError } = useQuery({
    queryKey: ["leaderboard", scope, clientId, identity],
    queryFn: ({ signal }) => fetchLeaderboard({ scope, clientId, identity, signal }),
    refetchInterval: 30_000,
  });
  const players = data?.players ?? [];

  <section class="leaderboard">
    <p class="eyebrow">{copy.leaderboard.eyebrow}</p>
    <h1>{copy.leaderboard.title}</h1>

    <div class="leaderboard__scope" role="tablist">
      <button
        class="leaderboard__scope-tab"
        data-active={scope === "all" ? "true" : "false"}
        type="button"
        onClick={() => setScope("all")}
      >
        {copy.leaderboard.scopeAll}
      </button>
      <button
        class="leaderboard__scope-tab"
        data-active={scope === "claimed" ? "true" : "false"}
        type="button"
        onClick={() => setScope("claimed")}
      >
        {copy.leaderboard.scopeClaimed}
      </button>
    </div>

    if (isError) {
      <div class="notice notice--bad">{copy.leaderboard.error}</div>
    }

    if (!isError && players.length === 0) {
      <div class="notice">
        <strong>{copy.leaderboard.emptyTitle}</strong>
        <span>
          {scope === "claimed" ? copy.leaderboard.emptyClaimed : copy.leaderboard.emptyDetail}
        </span>
      </div>
    }

    if (players.length > 0) {
      <ol class="leaderboard__list">
        for (const player of players) {
          <li
            key={player.rank}
            class="leaderboard__row"
            data-you={player.you ? "true" : "false"}
            data-claimed={player.claimed ? "true" : "false"}
          >
            <span class="leaderboard__rank">{`#${player.rank}`}</span>
            <span class="leaderboard__tag">
              {player.tag}
              if (player.claimed) {
                <span class="leaderboard__claimed-mark" aria-label="claimed">{"·"}</span>
              }
            </span>
            <span class="leaderboard__rounds">{copy.leaderboard.rounds(player.rounds)}</span>
            <strong class="leaderboard__points">{player.points}</strong>
          </li>
        }
      </ol>
    }
  </section>
}
