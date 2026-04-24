export const CATEGORY_ORDER = ["all", "tech", "politics", "sports", "celebrities", "random"];

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
    blurb: "Founders, AI prophets, code streamers, and terminal monks.",
    accent: "#ff7445",
    soft: "rgba(255, 116, 69, 0.18)",
    heroTitle: "Startup fumes, infra panic, and AI sermons.",
  },
  politics: {
    name: "Politics",
    blurb: "Campaign operatives, committee sickos, and polling mystics.",
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
  celebrities: {
    name: "Celebrities",
    blurb: "Publicists, pop stans, red carpets, and apology-note handwriting analysis.",
    accent: "#d6482a",
    soft: "rgba(214, 72, 42, 0.18)",
    heroTitle: "Notes-app diplomacy and fame-cycle meteorology.",
  },
  random: {
    name: "Random People",
    blurb: "HOA veterans, airport philosophers, recipe commenters, and neighborhood lore.",
    accent: "#0e1f3a",
    soft: "rgba(14, 31, 58, 0.18)",
    heroTitle: "The common poster, operating at uncommon volume.",
  },
};

export const MODELS = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    blurb: "Snappy, meme-literate, and a little too clean when it lands a joke.",
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    blurb: "Balanced phrasing, polished cadence, and a suspiciously tidy rhythm.",
  },
  {
    id: "gemini-2-0-flash",
    name: "Gemini 2.0 Flash",
    blurb: "Fast, assertive, and sometimes just a touch extra for no reason.",
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    blurb: "Open-weights swagger with longer phrasing and louder confidence.",
  },
  {
    id: "deepseek-v3-2",
    name: "DeepSeek V3.2",
    blurb: "Cheap, direct, and sharper than its token price should allow.",
  },
];

export const AUTHORS = [
  {
    id: "alignment-monarch",
    category: "tech",
    name: "Alignment Monarch",
    handle: "@pauseandship",
    bio: "Speaks in civilization-scale warnings, then quietly launches a preview build.",
    signature: "Earnest AGI destiny, boardroom weather, and suspiciously crisp product timing.",
  },
  {
    id: "vim-arsonist",
    category: "tech",
    name: "Vim Arsonist",
    handle: "@hjklwarcrime",
    bio: "Livestreams refactors like contact sports and treats TypeScript errors as personal betrayal.",
    signature: "Keyboard violence, compiler yelling, and zero patience for framework etiquette.",
  },
  {
    id: "theo-coded-sermon",
    category: "tech",
    name: "Theo-Coded Sermon",
    handle: "@shipthetake",
    bio: "Turns frontend opinions into revival meetings with benchmarks in the footnotes.",
    signature: "Fast takes, stack conviction, and a faint smell of deployment adrenaline.",
  },
  {
    id: "txdr-terminal",
    category: "tech",
    name: "TXDR Terminal",
    handle: "@rawmodeonly",
    bio: "Believes every abstraction is hiding a crime scene and every TUI can become a lifestyle.",
    signature: "Systems minimalism, terminal romance, and refusal to let the mouse win.",
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
    id: "debate-clip-cartographer",
    category: "politics",
    name: "Debate Clip Cartographer",
    handle: "@thirtysecondwar",
    bio: "Can convert one awkward pause into an eight-state path to victory.",
    signature: "Clip analysis, body-language prophecy, and aggressive map screenshots.",
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
    id: "beltway-brunchlord",
    category: "politics",
    name: "Beltway Brunchlord",
    handle: "@greenroomtable",
    bio: "Mistakes proximity to power for a personality and calls every rumor a readout.",
    signature: "Access journalism cosplay, donor whispers, and ceremonial moderation.",
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
  {
    id: "pop-pr-crisis-manager",
    category: "celebrities",
    name: "Pop PR Crisis Manager",
    handle: "@notesappwarroom",
    bio: "Can hear a brand partnership collapsing from three group chats away.",
    signature: "Notes-app triage, soft accountability, and emergency font choices.",
  },
  {
    id: "red-carpet-forensicist",
    category: "celebrities",
    name: "Red Carpet Forensicist",
    handle: "@hemlineintel",
    bio: "Treats every stylist decision like a coded geopolitical communiqué.",
    signature: "Fabric analysis, publicist tea leaves, and suspiciously confident body language reads.",
  },
  {
    id: "stan-account-general",
    category: "celebrities",
    name: "Stan Account General",
    handle: "@chartfrontline",
    bio: "Maintains three spreadsheets, two burner accounts, and one impossible standard of loyalty.",
    signature: "Chart warfare, fancam discipline, and never admitting the bridge was weak.",
  },
  {
    id: "nepo-baby-apologist",
    category: "celebrities",
    name: "Nepo Baby Apologist",
    handle: "@lineagecinema",
    bio: "Believes inherited access is fine if the cheekbones understand lighting.",
    signature: "Industry realism, tasteful excuses, and a suspicious respect for last names.",
  },
  {
    id: "hoa-nightmare",
    category: "random",
    name: "HOA Nightmare",
    handle: "@mulchcompliance",
    bio: "Knows the bylaws, the fence heights, and exactly who left bins out overnight.",
    signature: "Petty governance, lawn theology, and laminated moral certainty.",
  },
  {
    id: "airport-gate-prophet",
    category: "random",
    name: "Airport Gate Prophet",
    handle: "@zonefourtruth",
    bio: "Derives a worldview from boarding groups, outlet access, and rolling suitcase etiquette.",
    signature: "Travel rage, institutional suspicion, and deep opinions about gate agents.",
  },
  {
    id: "recipe-commenter",
    category: "random",
    name: "Recipe Commenter",
    handle: "@subbedtheflour",
    bio: "Changed seven ingredients and is furious the soup became a cake.",
    signature: "Substitution chaos, one-star certainty, and a memoir before the complaint.",
  },
  {
    id: "neighborhood-app-detective",
    category: "random",
    name: "Neighborhood App Detective",
    handle: "@sawavanmaybe",
    bio: "Every sound is suspicious, every raccoon is organized, every sedan is casing the block.",
    signature: "Doorbell-camera noir with no plot and very high confidence.",
  },
];

export const POSTS = [
  {
    id: "tech-1",
    category: "tech",
    authorId: "alignment-monarch",
    modelId: "deepseek-v3-2",
    text: "The correct AI policy is to slow down, coordinate globally, and also please try our new agent runtime before the waitlist closes.",
  },
  {
    id: "tech-2",
    category: "tech",
    authorId: "alignment-monarch",
    modelId: "claude-3-5-haiku",
    text: "People keep asking if the model is conscious. I am asking why the demo still needs three product managers and a launch embargo.",
  },
  {
    id: "tech-3",
    category: "tech",
    authorId: "vim-arsonist",
    modelId: "gpt-4o-mini",
    text: "I deleted the abstraction and the app got faster, uglier, and spiritually honest. This is what senior engineering looks like.",
  },
  {
    id: "tech-4",
    category: "tech",
    authorId: "vim-arsonist",
    modelId: "llama-3-3-70b",
    text: "Your framework is not bad because it is slow. It is bad because it makes mediocrity feel like a component library.",
  },
  {
    id: "tech-5",
    category: "tech",
    authorId: "theo-coded-sermon",
    modelId: "gemini-2-0-flash",
    text: "The stack debate is simple: if your deploy story needs a campfire, a priest, and twelve environment variables, pick something else.",
  },
  {
    id: "tech-6",
    category: "tech",
    authorId: "theo-coded-sermon",
    modelId: "deepseek-v3-2",
    text: "Nobody hates your favorite framework. We just noticed it turned a button into a governance problem.",
  },
  {
    id: "tech-7",
    category: "tech",
    authorId: "txdr-terminal",
    modelId: "claude-3-5-haiku",
    text: "The terminal is not retro. It is the last honest room in computing and I will not be taking questions from dropdown enthusiasts.",
  },
  {
    id: "tech-8",
    category: "tech",
    authorId: "txdr-terminal",
    modelId: "gpt-4o-mini",
    text: "Every GUI eventually becomes a worse TUI with shadows. I am simply arriving early and refusing the onboarding modal.",
  },
  {
    id: "tech-9",
    category: "tech",
    authorId: "cloud-gremlin",
    modelId: "claude-3-5-haiku",
    text: "Nothing reveals character faster than how a team reacts to a 2:13 a.m. multi-region incident.",
  },
  {
    id: "tech-10",
    category: "tech",
    authorId: "cloud-gremlin",
    modelId: "gpt-4o-mini",
    text: "The database did not randomly go down. Someone treated observability like a personality trait instead of a budget item.",
  },
  {
    id: "tech-11",
    category: "tech",
    authorId: "productivity-baron",
    modelId: "llama-3-3-70b",
    text: "The first hour of the day belongs to caffeine, silence, and deleting meetings from weaker people's calendars.",
  },
  {
    id: "tech-12",
    category: "tech",
    authorId: "productivity-baron",
    modelId: "gemini-2-0-flash",
    text: "Inbox zero is not productivity. True productivity is making sure nobody can schedule time with you in the first place.",
  },
  {
    id: "politics-1",
    category: "politics",
    authorId: "poll-whisperer",
    modelId: "claude-3-5-haiku",
    text: "The election is not being decided by the loudest people online. It is being decided by a county you have only seen in crosstab PDFs.",
  },
  {
    id: "politics-2",
    category: "politics",
    authorId: "poll-whisperer",
    modelId: "gpt-4o-mini",
    text: "Every candidate says they are building a coalition. Show me one suburban bloc and two turnout assumptions and then we can talk.",
  },
  {
    id: "politics-3",
    category: "politics",
    authorId: "committee-hawk",
    modelId: "llama-3-3-70b",
    text: "If you think the headline matters more than the committee markup, you are not following where the real knives are.",
  },
  {
    id: "politics-4",
    category: "politics",
    authorId: "committee-hawk",
    modelId: "gemini-2-0-flash",
    text: "The amendment failed 11-10, which means congratulations, the staff memo has more power than your entire group chat.",
  },
  {
    id: "politics-5",
    category: "politics",
    authorId: "debate-clip-cartographer",
    modelId: "deepseek-v3-2",
    text: "That seven-second stumble was either fatal or meaningless, depending entirely on which county-level turnout model validates my personality.",
  },
  {
    id: "politics-6",
    category: "politics",
    authorId: "debate-clip-cartographer",
    modelId: "gpt-4o-mini",
    text: "The hand gesture at 12:41 tells us nothing, which is why I have prepared a thread with nine maps.",
  },
  {
    id: "politics-7",
    category: "politics",
    authorId: "flag-pin-maximalist",
    modelId: "gpt-4o-mini",
    text: "This nation was built by people who did not ask permission to lead, and frankly neither is my preferred candidate.",
  },
  {
    id: "politics-8",
    category: "politics",
    authorId: "flag-pin-maximalist",
    modelId: "llama-3-3-70b",
    text: "You can keep your nuance. I am interested in strength, momentum, and a camera angle with at least three flags in frame.",
  },
  {
    id: "politics-9",
    category: "politics",
    authorId: "city-hall-goblin",
    modelId: "gemini-2-0-flash",
    text: "The most dangerous person in municipal politics is not the mayor. It is the resident who knows how public comment rules actually work.",
  },
  {
    id: "politics-10",
    category: "politics",
    authorId: "city-hall-goblin",
    modelId: "claude-3-5-haiku",
    text: "Tonight's council agenda is 417 pages, which means somewhere around item 63 a neighborhood feud becomes housing policy.",
  },
  {
    id: "politics-11",
    category: "politics",
    authorId: "beltway-brunchlord",
    modelId: "deepseek-v3-2",
    text: "Several people who would benefit from this being true have told me privately that the vibes are shifting.",
  },
  {
    id: "politics-12",
    category: "politics",
    authorId: "beltway-brunchlord",
    modelId: "gemini-2-0-flash",
    text: "The lunch was off record, but the salad placement said more than any spokesperson could.",
  },
  {
    id: "sports-1",
    category: "sports",
    authorId: "ring-counter",
    modelId: "gpt-4o-mini",
    text: "I do not care about the efficiency case. Show me who closes in June when the banners are not theoretical.",
  },
  {
    id: "sports-2",
    category: "sports",
    authorId: "ring-counter",
    modelId: "llama-3-3-70b",
    text: "If your all-time ranking starts with vibes instead of rings, you are doing podcasting, not analysis.",
  },
  {
    id: "sports-3",
    category: "sports",
    authorId: "cap-space-shaman",
    modelId: "claude-3-5-haiku",
    text: "The trade is fake until I see the matching salary, the pick protections, and one fan base pretending it got fleeced.",
  },
  {
    id: "sports-4",
    category: "sports",
    authorId: "cap-space-shaman",
    modelId: "gemini-2-0-flash",
    text: "Second apron discourse has destroyed the casual fan, which is unfortunate because I finally feel alive.",
  },
  {
    id: "sports-5",
    category: "sports",
    authorId: "locker-room-poet",
    modelId: "claude-3-5-haiku",
    text: "Back-to-backs do not build excuses, they build mythology. You find out who still boxes out when the legs are gone.",
  },
  {
    id: "sports-6",
    category: "sports",
    authorId: "locker-room-poet",
    modelId: "llama-3-3-70b",
    text: "Some players score. Some players bend the emotional weather of an arena. The box score never admits the difference.",
  },
  {
    id: "sports-7",
    category: "sports",
    authorId: "instant-replay-dad",
    modelId: "gemini-2-0-flash",
    text: "Freeze it right there. The left foot is still grazing paint, the whistle is late, and the broadcast crew is lying to you in real time.",
  },
  {
    id: "sports-8",
    category: "sports",
    authorId: "instant-replay-dad",
    modelId: "gpt-4o-mini",
    text: "Officials say marginal contact the way magicians say nothing up my sleeve. I would simply like one honest replay.",
  },
  {
    id: "celebrities-1",
    category: "celebrities",
    authorId: "pop-pr-crisis-manager",
    modelId: "deepseek-v3-2",
    text: "The apology needed fewer adjectives, better line spacing, and absolutely no phrase that could become a tote bag by morning.",
  },
  {
    id: "celebrities-2",
    category: "celebrities",
    authorId: "pop-pr-crisis-manager",
    modelId: "claude-3-5-haiku",
    text: "A notes-app statement is not written. It is negotiated between fear, brand safety, and a publicist with 14 missed calls.",
  },
  {
    id: "celebrities-3",
    category: "celebrities",
    authorId: "red-carpet-forensicist",
    modelId: "gemini-2-0-flash",
    text: "That neckline was not an accident. That was a soft-launch, a feud denial, and a streaming deal in one silhouette.",
  },
  {
    id: "celebrities-4",
    category: "celebrities",
    authorId: "red-carpet-forensicist",
    modelId: "gpt-4o-mini",
    text: "You cannot convince me the earrings were random. Stylists do not choose emeralds during a friendship breakup by mistake.",
  },
  {
    id: "celebrities-5",
    category: "celebrities",
    authorId: "stan-account-general",
    modelId: "llama-3-3-70b",
    text: "If you streamed the single once and then posted criticism, congratulations on participating in cultural sabotage.",
  },
  {
    id: "celebrities-6",
    category: "celebrities",
    authorId: "stan-account-general",
    modelId: "deepseek-v3-2",
    text: "The bridge is not weak. Your loyalty is. Please update the spreadsheet before speaking on vocals again.",
  },
  {
    id: "celebrities-7",
    category: "celebrities",
    authorId: "nepo-baby-apologist",
    modelId: "claude-3-5-haiku",
    text: "Some people inherit connections. Others inherit cheekbones that understand natural light. Both are labor in different economies.",
  },
  {
    id: "celebrities-8",
    category: "celebrities",
    authorId: "nepo-baby-apologist",
    modelId: "gemini-2-0-flash",
    text: "Calling it nepotism ignores the emotional burden of being born already knowing three casting directors.",
  },
  {
    id: "random-1",
    category: "random",
    authorId: "hoa-nightmare",
    modelId: "gpt-4o-mini",
    text: "If the bylaws say earth-tone mulch, then your crimson playground confetti is not landscaping. It is a cry for enforcement.",
  },
  {
    id: "random-2",
    category: "random",
    authorId: "hoa-nightmare",
    modelId: "deepseek-v3-2",
    text: "I am not anti-fun. I am pro-community standards, which sometimes requires photographing a flamingo at 6:12 a.m.",
  },
  {
    id: "random-3",
    category: "random",
    authorId: "airport-gate-prophet",
    modelId: "gemini-2-0-flash",
    text: "Boarding group five is not a group. It is a social experiment with backpacks and no understanding of overhead geometry.",
  },
  {
    id: "random-4",
    category: "random",
    authorId: "airport-gate-prophet",
    modelId: "claude-3-5-haiku",
    text: "The airport reveals who you really are: patient, prepared, or standing sideways in the jet bridge like civilization ended.",
  },
  {
    id: "random-5",
    category: "random",
    authorId: "recipe-commenter",
    modelId: "llama-3-3-70b",
    text: "I replaced the butter with sparkling water and the flour with vibes. Family hated it. One star, too dense.",
  },
  {
    id: "random-6",
    category: "random",
    authorId: "recipe-commenter",
    modelId: "gpt-4o-mini",
    text: "My husband dislikes onions so I omitted the soup. Texture was confusing. Please test recipes for normal families.",
  },
  {
    id: "random-7",
    category: "random",
    authorId: "neighborhood-app-detective",
    modelId: "deepseek-v3-2",
    text: "White van circled twice. Could be delivery, could be reconnaissance. Either way I have enhanced the doorbell footage emotionally.",
  },
  {
    id: "random-8",
    category: "random",
    authorId: "neighborhood-app-detective",
    modelId: "gemini-2-0-flash",
    text: "To the person who coughed near Maple and 3rd: some of us are trying to maintain a community.",
  },
];

const categoryKeySet = new Set(CATEGORY_ORDER);
const scopedCategories = CATEGORY_ORDER.filter((category) => category !== "all");

export const AUTHORS_BY_ID = new Map(AUTHORS.map((author) => [author.id, author]));
export const MODELS_BY_ID = new Map(MODELS.map((model) => [model.id, model]));
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
