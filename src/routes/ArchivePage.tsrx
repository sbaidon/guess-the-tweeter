import { useEffect, useState } from "react";
import { CATEGORY_META } from "../gameData";
import { fetchRoundHistory } from "../liveApi";

function formatRoundTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export component ArchivePage() {
  const [rounds, setRounds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetchRoundHistory(18, controller.signal)
      .then((payload) => {
        setRounds(payload.rounds ?? []);
        setError("");
      })
      .catch((nextError) => {
        if (nextError.name !== "AbortError") {
          setError(nextError.message);
        }
      });

    return () => controller.abort();
  }, []);

  <section class="archive-card">
    <p class="eyebrow">{"Past slips"}</p>
    <h1>{"The ledger."}</h1>
    <p class="archive-card__intro">
      {"Revealed rounds stay visible here with the answer and how many players hit the handle."}
    </p>

    if (error) {
      <div class="notice notice--bad">{error}</div>
    }

    if (!error && rounds.length === 0) {
      <div class="notice">
        <strong>{"No reveals yet."}</strong>
        <span>{"The first archived round appears after the reveal window."}</span>
      </div>
    }

    if (rounds.length > 0) {
      <div class="archive-list">
        for (const round of rounds) {
          const meta = CATEGORY_META[round.post.category] ?? CATEGORY_META.all;

          <article key={round.id} class="archive-round">
            <div class="archive-round__meta">
              <span>{formatRoundTime(round.startsAt)}</span>
              <span>{meta.name}</span>
            </div>
            <p>{round.post.text}</p>
            <div class="archive-round__answer">
              <strong>{round.answer.author.handle}</strong>
              <span>{round.answer.author.name}</span>
            </div>
            <div class="archive-round__winners">
              {`${round.results.winnerCount}/${round.results.authorTotal} winners · ${round.results.winnerPercentage}% hit rate`}
            </div>
          </article>
        }
      </div>
    }
  </section>
}
