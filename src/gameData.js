export const CATEGORY_ORDER = ["all", "tech", "politics", "sports"];

export const CATEGORY_META = {
  all: {
    name: "All Signals",
    blurb: "A mixed feed of every loud internet persona.",
    accent: "#f3ca59",
    soft: "rgba(243, 202, 89, 0.18)",
    heroTitle: "Mixed-feed mayhem for terminally online guessers.",
  },
  tech: {
    name: "Tech",
    blurb: "Founders, AI prophets, and productivity cult leaders.",
    accent: "#ff7445",
    soft: "rgba(255, 116, 69, 0.18)",
    heroTitle: "Startup fumes, infra panic, and AI sermons.",
  },
  politics: {
    name: "Politics",
    blurb: "Campaign operatives, committee goblins, and flag-pinned certainty.",
    accent: "#59abff",
    soft: "rgba(89, 171, 255, 0.18)",
    heroTitle: "Coalition math, committee knives, and endless certainty.",
  },
  sports: {
    name: "Sports",
    blurb: "Legacy wars, cap-sheet theology, and replay courtroom drama.",
    accent: "#48d69b",
    soft: "rgba(72, 214, 155, 0.18)",
    heroTitle: "Banner talk, fake trades, and officiating litigation.",
  },
};

export const AUTHORS = [
  {
    id: "scale-sorcerer",
    category: "tech",
    name: "Scale Sorcerer",
    handle: "@deckbeforedawn",
    bio: "Thinks every friendship is a distribution channel and every coffee is a pipeline.",
    signature: "Peak startup brain: taste talk, leverage talk, and just enough venture fumes.",
  },
  {
    id: "ai-doom-broker",
    category: "tech",
    name: "AI Doom Broker",
    handle: "@paperclipmaxi",
    bio: "Alternates between apocalyptic model warnings and suspiciously timed product launches.",
    signature: "If it reads like a manifesto with a waitlist, this one is nearby.",
  },
  {
    id: "cloud-gremlin",
    category: "tech",
    name: "Cloud Gremlin",
    handle: "@regionfailover",
    bio: "Treats every outage like a moral referendum on infrastructure discipline.",
    signature: "Infra panic, uptime religion, and intense feelings about observability spend.",
  },
  {
    id: "productivity-baron",
    category: "tech",
    name: "Productivity Baron",
    handle: "@calendarpilled",
    bio: "Builds a personal brand out of routines, ruthless scheduling, and weaponized focus.",
    signature: "Usually blaming your calendar, your habits, or your softness.",
  },
  {
    id: "poll-whisperer",
    category: "politics",
    name: "Poll Whisperer",
    handle: "@crosstabcult",
    bio: "Sees destiny inside shaky sample sizes and suburban turnout math.",
    signature: "Everything is a coalition story once the crosstabs drop.",
  },
  {
    id: "committee-hawk",
    category: "politics",
    name: "Committee Hawk",
    handle: "@markupmarshal",
    bio: "Lives for hearings, markups, and the quiet violence of procedure.",
    signature: "If the drama is inside the amendment tree, this is their habitat.",
  },
  {
    id: "flag-pin-maximalist",
    category: "politics",
    name: "Flag Pin Maximalist",
    handle: "@freedomblazer",
    bio: "Always one sentence away from a campaign spot with three flags in frame.",
    signature: "Pure certainty, patriotic branding, and no time for nuance.",
  },
  {
    id: "city-hall-goblin",
    category: "politics",
    name: "City Hall Goblin",
    handle: "@zoningtruth",
    bio: "Municipal politics sicko who can smell a council agenda from three neighborhoods away.",
    signature: "Local procedural warfare with highly specific civic grievances.",
  },
  {
    id: "ring-counter",
    category: "sports",
    name: "Ring Counter",
    handle: "@legacyledger",
    bio: "Believes every debate ends with hardware, banners, and disrespect.",
    signature: "Legacy math only. Everything else is studio filler.",
  },
  {
    id: "cap-space-shaman",
    category: "sports",
    name: "Cap Space Shaman",
    handle: "@midlevelmystic",
    bio: "Reads the salary cap like sacred text and trusts pick protections more than people.",
    signature: "Contract arithmetic, apron discourse, and fake-trade transcendence.",
  },
  {
    id: "locker-room-poet",
    category: "sports",
    name: "Locker Room Poet",
    handle: "@gritverse",
    bio: "Frames every regular season grind like high literature with sneakers.",
    signature: "Vibes, chemistry, and emotional weather over sterile counting stats.",
  },
  {
    id: "instant-replay-dad",
    category: "sports",
    name: "Instant Replay Dad",
    handle: "@freezeitthere",
    bio: "Never met a grainy freeze-frame he could not prosecute for five full minutes.",
    signature: "Rulebook obsession, slow motion outrage, and officiating conspiracies.",
  },
];

export const POSTS = [
  {
    id: "tech-1",
    category: "tech",
    authorId: "scale-sorcerer",
    text: "If your startup needs more than one weekly standup, what it actually needs is less hiring and better taste.",
  },
  {
    id: "tech-2",
    category: "tech",
    authorId: "scale-sorcerer",
    text: "The seed round is not for product-market fit. It is for finding out which of your friends can introduce you to enterprise.",
  },
  {
    id: "tech-3",
    category: "tech",
    authorId: "ai-doom-broker",
    text: "We are five demos away from replacing half of middle management and somehow still using PDFs to onboard.",
  },
  {
    id: "tech-4",
    category: "tech",
    authorId: "ai-doom-broker",
    text: "My position on frontier models is simple: slow down immediately, unless the launch has a waitlist.",
  },
  {
    id: "tech-5",
    category: "tech",
    authorId: "cloud-gremlin",
    text: "Nothing reveals character faster than how a team reacts to a 2:13 a.m. multi-region incident.",
  },
  {
    id: "tech-6",
    category: "tech",
    authorId: "cloud-gremlin",
    text: "The database did not randomly go down. Someone treated observability like a personality trait instead of a budget item.",
  },
  {
    id: "tech-7",
    category: "tech",
    authorId: "productivity-baron",
    text: "The first hour of the day belongs to caffeine, silence, and deleting meetings from weaker people's calendars.",
  },
  {
    id: "tech-8",
    category: "tech",
    authorId: "productivity-baron",
    text: "Inbox zero is not productivity. True productivity is making sure nobody can schedule time with you in the first place.",
  },
  {
    id: "politics-1",
    category: "politics",
    authorId: "poll-whisperer",
    text: "The election is not being decided by the loudest people online. It is being decided by a county you have only seen in crosstab PDFs.",
  },
  {
    id: "politics-2",
    category: "politics",
    authorId: "poll-whisperer",
    text: "Every candidate says they are building a coalition. Show me one suburban bloc and two turnout assumptions and then we can talk.",
  },
  {
    id: "politics-3",
    category: "politics",
    authorId: "committee-hawk",
    text: "If you think the headline matters more than the committee markup, you are not following where the real knives are.",
  },
  {
    id: "politics-4",
    category: "politics",
    authorId: "committee-hawk",
    text: "The amendment failed 11-10, which means congratulations, the staff memo has more power than your entire group chat.",
  },
  {
    id: "politics-5",
    category: "politics",
    authorId: "flag-pin-maximalist",
    text: "This nation was built by people who did not ask permission to lead, and frankly neither is my preferred candidate.",
  },
  {
    id: "politics-6",
    category: "politics",
    authorId: "flag-pin-maximalist",
    text: "You can keep your nuance. I am interested in strength, momentum, and a camera angle with at least three flags in frame.",
  },
  {
    id: "politics-7",
    category: "politics",
    authorId: "city-hall-goblin",
    text: "The most dangerous person in municipal politics is not the mayor. It is the resident who knows how public comment rules actually work.",
  },
  {
    id: "politics-8",
    category: "politics",
    authorId: "city-hall-goblin",
    text: "Tonight's council agenda is 417 pages, which means somewhere around item 63 a neighborhood feud becomes housing policy.",
  },
  {
    id: "sports-1",
    category: "sports",
    authorId: "ring-counter",
    text: "I do not care about the efficiency case. Show me who closes in June when the banners are not theoretical.",
  },
  {
    id: "sports-2",
    category: "sports",
    authorId: "ring-counter",
    text: "If your all-time ranking starts with vibes instead of rings, you are doing podcasting, not analysis.",
  },
  {
    id: "sports-3",
    category: "sports",
    authorId: "cap-space-shaman",
    text: "The trade is fake until I see the matching salary, the pick protections, and one fan base pretending it got fleeced.",
  },
  {
    id: "sports-4",
    category: "sports",
    authorId: "cap-space-shaman",
    text: "Second apron discourse has destroyed the casual fan, which is unfortunate because I finally feel alive.",
  },
  {
    id: "sports-5",
    category: "sports",
    authorId: "locker-room-poet",
    text: "Back-to-backs do not build excuses, they build mythology. You find out who still boxes out when the legs are gone.",
  },
  {
    id: "sports-6",
    category: "sports",
    authorId: "locker-room-poet",
    text: "Some players score. Some players bend the emotional weather of an arena. The box score never admits the difference.",
  },
  {
    id: "sports-7",
    category: "sports",
    authorId: "instant-replay-dad",
    text: "Freeze it right there. The left foot is still grazing paint, the whistle is late, and the broadcast crew is lying to you in real time.",
  },
  {
    id: "sports-8",
    category: "sports",
    authorId: "instant-replay-dad",
    text: "Officials say marginal contact the way magicians say nothing up my sleeve. I would simply like one honest replay.",
  },
];

const categoryKeySet = new Set(CATEGORY_ORDER);
const scopedCategories = CATEGORY_ORDER.filter((category) => category !== "all");

export const AUTHORS_BY_ID = new Map(AUTHORS.map((author) => [author.id, author]));
export const POSTS_BY_ID = new Map(POSTS.map((post) => [post.id, post]));
export const AUTHORS_BY_CATEGORY = new Map(
  scopedCategories.map((category) => [
    category,
    AUTHORS.filter((author) => author.category === category),
  ]),
);
export const POSTS_BY_CATEGORY = new Map(
  scopedCategories.map((category) => [
    category,
    POSTS.filter((post) => post.category === category),
  ]),
);

export function isCategoryKey(value) {
  return categoryKeySet.has(value);
}

export function getPostsForCategory(category) {
  return category === "all" ? POSTS : POSTS_BY_CATEGORY.get(category) ?? POSTS;
}

export function getAuthorsForMode(category, postCategory) {
  return category === "all" ? AUTHORS : AUTHORS_BY_CATEGORY.get(postCategory) ?? AUTHORS;
}

export function getRosterGroups(category) {
  if (category === "all") {
    return scopedCategories.map((groupKey) => ({
      key: groupKey,
      meta: CATEGORY_META[groupKey],
      authors: AUTHORS_BY_CATEGORY.get(groupKey) ?? [],
    }));
  }

  return [
    {
      key: category,
      meta: CATEGORY_META[category],
      authors: AUTHORS_BY_CATEGORY.get(category) ?? [],
    },
  ];
}
