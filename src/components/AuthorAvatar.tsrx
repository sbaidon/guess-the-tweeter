import { useState } from "react";

function avatarUrl(handle) {
  const stripped = handle.replace(/^@/, "").trim();
  return stripped ? `https://unavatar.io/x/${encodeURIComponent(stripped)}` : null;
}

export component AuthorAvatar({ author, hidden, size }) {
  const [failed, setFailed] = useState(false);
  const url = author && !hidden ? avatarUrl(author.handle) : null;
  const showImage = url && !failed;
  const className = size === "sm" ? "author-avatar author-avatar--sm" : "author-avatar";

  <div class={`${className} ${hidden ? "is-hidden" : ""}`}>
    if (showImage) {
      <img alt="" loading="lazy" src={url} onError={() => setFailed(true)} />
    } else if (!hidden && author) {
      <span>{author.name.charAt(0)}</span>
    }
  </div>
}
