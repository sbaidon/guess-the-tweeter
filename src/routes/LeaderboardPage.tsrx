import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCopy } from "../i18n";
import { getIdentity } from "../identity";
import { fetchLeaderboard, getClientId } from "../liveApi";
import { useCurrentLanguage } from "../router";

export component LeaderboardPage() {
  const [clientId] = useState(getClientId);
  const language = useCurrentLanguage();
  const copy = getCopy(language);
  const { data: identity = null } = useQuery({ queryKey: ["identity"], queryFn: getIdentity });
  const { data, isError } = useQuery({
    queryKey: ["leaderboard", clientId, identity],
    queryFn: ({ signal }) => fetchLeaderboard(50, clientId, signal, identity),
    refetchInterval: 30_000,
  });
  const players = data?.players ?? [];

  <section class="leaderboard">
    <p class="eyebrow">{copy.leaderboard.eyebrow}</p>
    <h1>{copy.leaderboard.title}</h1>

    if (isError) {
      <div class="notice notice--bad">{copy.leaderboard.error}</div>
    }

    if (!isError && players.length === 0) {
      <div class="notice">
        <strong>{copy.leaderboard.emptyTitle}</strong>
        <span>{copy.leaderboard.emptyDetail}</span>
      </div>
    }

    if (players.length > 0) {
      <ol class="leaderboard__list">
        for (const player of players) {
          <li
            key={player.rank}
            class="leaderboard__row"
            data-you={player.you ? "true" : "false"}
          >
            <span class="leaderboard__rank">{`#${player.rank}`}</span>
            <span class="leaderboard__tag">{player.tag}</span>
            <span class="leaderboard__rounds">{copy.leaderboard.rounds(player.rounds)}</span>
            <strong class="leaderboard__points">{player.points}</strong>
          </li>
        }
      </ol>
    }
  </section>
}
