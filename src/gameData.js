export const CATEGORY_ORDER = ["all", "tech", "politics", "sports", "celebrities"];

export const LANGUAGES = [
  {
    id: "en",
    name: "English",
    nativeName: "English",
    instruction: "Write natural English with internet-native phrasing.",
  },
  {
    id: "es",
    name: "Spanish",
    nativeName: "Español",
    instruction: "Write natural Spanish with internet-native phrasing.",
  },
  {
    id: "fr",
    name: "French",
    nativeName: "Français",
    instruction: "Write natural French with internet-native phrasing.",
  },
  {
    id: "pt",
    name: "Portuguese",
    nativeName: "Português",
    instruction: "Write natural Portuguese with internet-native phrasing.",
  },
  {
    id: "de",
    name: "German",
    nativeName: "Deutsch",
    instruction: "Write natural German with internet-native phrasing.",
  },
];
export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_ORDER = LANGUAGES.map((language) => language.id);

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
    name: "Sam Altman",
    handle: "@sama",
    bio: "OpenAI CEO whose posts can swing from civilization-scale AI thoughts to product-launch calm.",
    signature: "Earnest AGI destiny, boardroom weather, and suspiciously crisp product timing. Parody, not a real post.",
  },
  {
    id: "vim-arsonist",
    category: "tech",
    name: "ThePrimeagen",
    handle: "@ThePrimeagen",
    bio: "Streamer and engineer known for loud, fast, deeply opinionated programming takes.",
    signature: "Keyboard velocity, compiler yelling, and zero patience for framework etiquette. Parody, not a real post.",
  },
  {
    id: "theo-coded-sermon",
    category: "tech",
    name: "Theo",
    handle: "@theo",
    bio: "T3 creator and stack-discourse magnet with strong opinions about shipping web software.",
    signature: "Fast takes, stack conviction, and a faint smell of deployment adrenaline. Parody, not a real post.",
  },
  {
    id: "txdr-terminal",
    category: "tech",
    name: "TJ DeVries",
    handle: "@teej_dv",
    bio: "Neovim core maintainer and terminal maximalist with a taste for sharp systems ergonomics.",
    signature: "Systems minimalism, terminal romance, and refusal to let the mouse win. Parody, not a real post.",
  },
  {
    id: "cloud-gremlin",
    category: "tech",
    name: "DHH",
    handle: "@dhh",
    bio: "Rails creator and Basecamp cofounder with strong views on software, cloud spend, and complexity.",
    signature: "Infra skepticism, simplicity religion, and intense feelings about operational discipline. Parody, not a real post.",
  },
  {
    id: "productivity-baron",
    category: "tech",
    name: "Pieter Levels",
    handle: "@levelsio",
    bio: "Indie hacker known for shipping small internet businesses in public.",
    signature: "Solo shipping, blunt metrics, and a deep suspicion of meetings. Parody, not a real post.",
  },
  {
    id: "poll-whisperer",
    category: "politics",
    name: "Nate Silver",
    handle: "@NateSilver538",
    bio: "Statistician and election forecaster who can make a crosstab feel like a weather system.",
    signature: "Everything is a probability story once the crosstabs drop. Parody, not a real post.",
  },
  {
    id: "committee-hawk",
    category: "politics",
    name: "C-SPAN",
    handle: "@cspan",
    bio: "Public affairs network whose feed turns procedure into the main character.",
    signature: "If the drama is inside the amendment tree, this is the habitat. Parody, not a real post.",
  },
  {
    id: "debate-clip-cartographer",
    category: "politics",
    name: "Aaron Rupar",
    handle: "@atrupar",
    bio: "Political clip-watcher and newsletter writer who tracks the televised weirdness beat.",
    signature: "Clip analysis, body-language prophecy, and aggressive context windows. Parody, not a real post.",
  },
  {
    id: "flag-pin-maximalist",
    category: "politics",
    name: "Alexandria Ocasio-Cortez",
    handle: "@AOC",
    bio: "Congresswoman with a direct-to-feed style for policy fights and political framing.",
    signature: "Moral clarity, message discipline, and no patience for fake process objections. Parody, not a real post.",
  },
  {
    id: "city-hall-goblin",
    category: "politics",
    name: "Matt Yglesias",
    handle: "@mattyglesias",
    bio: "Policy writer whose feed can turn zoning, abundance, and institutions into daily combat.",
    signature: "Local procedural warfare with highly specific civic grievances. Parody, not a real post.",
  },
  {
    id: "beltway-brunchlord",
    category: "politics",
    name: "Jake Tapper",
    handle: "@jaketapper",
    bio: "CNN anchor and political journalist with a classic Beltway news cadence.",
    signature: "Green-room gravity, source choreography, and ceremonial moderation. Parody, not a real post.",
  },
  {
    id: "ring-counter",
    category: "sports",
    name: "LeBron James",
    handle: "@KingJames",
    bio: "NBA star whose posts can turn hoops, legacy, and culture into one timeline event.",
    signature: "Legacy math, banner pressure, and a crown emoji implied even when absent. Parody, not a real post.",
  },
  {
    id: "cap-space-shaman",
    category: "sports",
    name: "Shams Charania",
    handle: "@ShamsCharania",
    bio: "NBA insider whose posts make transactions feel like emergency alerts.",
    signature: "Contract arithmetic, source phrasing, and trade-machine transcendence. Parody, not a real post.",
  },
  {
    id: "locker-room-poet",
    category: "sports",
    name: "Stephen A. Smith",
    handle: "@stephenasmith",
    bio: "Sports broadcaster whose feed favors volume, certainty, and theatrical urgency.",
    signature: "Vibes, chemistry, and emotional weather over sterile counting stats. Parody, not a real post.",
  },
  {
    id: "instant-replay-dad",
    category: "sports",
    name: "Bill Simmons",
    handle: "@BillSimmons",
    bio: "Sports and pop-culture podcaster with a bottomless appetite for legacy hypotheticals.",
    signature: "Rulebook obsession, slow-motion outrage, and podcast-era grievance math. Parody, not a real post.",
  },
  {
    id: "pop-pr-crisis-manager",
    category: "celebrities",
    name: "Taylor Swift",
    handle: "@taylorswift13",
    bio: "Pop megastar whose announcements can reroute the entire entertainment timeline.",
    signature: "Release strategy, fan decoding, and immaculate rollout weather. Parody, not a real post.",
  },
  {
    id: "red-carpet-forensicist",
    category: "celebrities",
    name: "Rihanna",
    handle: "@rihanna",
    bio: "Artist and founder whose rare posts make the whole internet inspect timing and subtext.",
    signature: "Beauty empire signals, publicist tea leaves, and suspiciously confident timing reads. Parody, not a real post.",
  },
  {
    id: "stan-account-general",
    category: "celebrities",
    name: "MrBeast",
    handle: "@MrBeast",
    bio: "Creator whose posts make giveaways, video scale, and platform experiments feel like sport.",
    signature: "Platform math, spectacle logistics, and an alarming number of zeroes. Parody, not a real post.",
  },
  {
    id: "nepo-baby-apologist",
    category: "celebrities",
    name: "Kim Kardashian",
    handle: "@KimKardashian",
    bio: "Celebrity founder whose posts sit at the intersection of image, commerce, and spectacle.",
    signature: "Brand architecture, tasteful lighting, and a suspicious respect for launch timing. Parody, not a real post.",
  },
  {
    id: "hoa-nightmare",
    category: "random",
    name: "dril",
    handle: "@dril",
    bio: "Legendary Weird Twitter account whose posts turn institutional collapse into nonsense scripture.",
    signature: "Petty governance, broken logic, and absolute commitment to the bit. Parody, not a real post.",
  },
  {
    id: "airport-gate-prophet",
    category: "random",
    name: "Internet Hippo",
    handle: "@InternetHippo",
    bio: "Internet humor account with concise, dry observations about ordinary social absurdity.",
    signature: "Tiny social autopsies, institutional suspicion, and dry refusal to over-explain. Parody, not a real post.",
  },
  {
    id: "recipe-commenter",
    category: "random",
    name: "Depths of Wikipedia",
    handle: "@depthsofwiki",
    bio: "Internet account surfacing strange Wikipedia corners and delightful niche facts.",
    signature: "Citation rabbit holes, one-sentence lore, and trivia with a backstory. Parody, not a real post.",
  },
  {
    id: "neighborhood-app-detective",
    category: "random",
    name: "SwiftOnSecurity",
    handle: "@SwiftOnSecurity",
    bio: "Security-focused internet account mixing enterprise caution with deadpan absurdity.",
    signature: "Doorbell-camera noir, enterprise paranoia, and very high confidence. Parody, not a real post.",
  },
  {
    id: "es-stack-profesor",
    category: "tech",
    languages: ["es"],
    name: "Miguel Ángel Durán",
    handle: "@midudev",
    bio: "Spanish software educator and streamer whose feed turns web tooling into direct, practical takes.",
    signature: "Frontend pragmatism, live-coding confidence, and a very Spanish allergy to overcomplicated stacks. Parody, not a real post.",
  },
  {
    id: "es-congreso-ironista",
    category: "politics",
    languages: ["es"],
    name: "Gabriel Rufián",
    handle: "@gabrielrufian",
    bio: "Spanish politician known for short, sharp political framing and extremely online parliamentary combat.",
    signature: "One-line institutional knives, congressional sarcasm, and no patience for polite euphemism. Parody, not a real post.",
  },
  {
    id: "es-kings-league-ringmaster",
    category: "sports",
    languages: ["es"],
    name: "Gerard Piqué",
    handle: "@3gerardpique",
    bio: "Spanish footballer and founder whose posts blend football, spectacle, and business provocation.",
    signature: "Football legacy, streamer-era showmanship, and boardroom confidence wearing a tracksuit. Parody, not a real post.",
  },
  {
    id: "es-pop-codex",
    category: "celebrities",
    languages: ["es"],
    name: "Rosalía",
    handle: "@rosalia",
    bio: "Spanish artist whose sparse posts can make fans inspect every accent mark, image crop, and silence.",
    signature: "High-art pop mystery, Catalan-Spanish internet texture, and release-cycle divination. Parody, not a real post.",
  },
  {
    id: "es-satire-desk",
    category: "random",
    languages: ["es"],
    name: "El Mundo Today",
    handle: "@elmundotoday",
    bio: "Spanish satirical outlet that makes fake civic absurdity sound like a breaking-news alert.",
    signature: "Deadpan headlines, bureaucratic nonsense, and Spain behaving exactly one notch too literally. Parody, not a real post.",
  },
  {
    id: "fr-freebox-magnate",
    category: "tech",
    languages: ["fr"],
    name: "Xavier Niel",
    handle: "@Xavier75",
    bio: "French telecom entrepreneur and startup backer with a blunt operator's view of markets and builders.",
    signature: "French founder energy, telecom provocation, and impatience with permission-seeking. Parody, not a real post.",
  },
  {
    id: "fr-elysee-threader",
    category: "politics",
    languages: ["fr"],
    name: "Emmanuel Macron",
    handle: "@EmmanuelMacron",
    bio: "French president whose posts favor grand civic language, European stakes, and polished urgency.",
    signature: "Republican gravity, European destiny, and sentences that arrive already podium-lit. Parody, not a real post.",
  },
  {
    id: "fr-paris-nine",
    category: "sports",
    languages: ["fr"],
    name: "Kylian Mbappé",
    handle: "@KMbappe",
    bio: "French football star whose posts carry elite calm, national expectation, and sponsor-era polish.",
    signature: "Big-match composure, Parisian pressure, and the quiet certainty of someone everyone is watching. Parody, not a real post.",
  },
  {
    id: "fr-pop-formula",
    category: "celebrities",
    languages: ["fr"],
    name: "Aya Nakamura",
    handle: "@AyaNakamuraa",
    bio: "French-Malian pop star whose posts mix star power, slang, fashion, and chart confidence.",
    signature: "French pop flex, clipped cool, and a refusal to over-explain the hook. Parody, not a real post.",
  },
  {
    id: "fr-radio-gremlin",
    category: "random",
    languages: ["fr"],
    name: "Guillaume Meurice",
    handle: "@GMeurice",
    bio: "French comedian and commentator with a taste for political absurdity and dry provocation.",
    signature: "Public-radio mischief, French institutional side-eye, and punchlines that sound like civic paperwork. Parody, not a real post.",
  },
  {
    id: "pt-rails-professor",
    category: "tech",
    languages: ["pt"],
    name: "Fabio Akita",
    handle: "@AkitaOnRails",
    bio: "Brazilian software educator and entrepreneur known for long-form technical bluntness.",
    signature: "Brazilian dev pragmatism, systems lectures, and zero patience for fashionable shortcuts. Parody, not a real post.",
  },
  {
    id: "pt-planalto-veteran",
    category: "politics",
    languages: ["pt"],
    name: "Lula",
    handle: "@LulaOficial",
    bio: "Brazilian president whose posts lean into labor politics, national development, and direct popular address.",
    signature: "Union-hall cadence, Brasília stakes, and the moral rhythm of a campaign speech. Parody, not a real post.",
  },
  {
    id: "pt-santos-dribbler",
    category: "sports",
    languages: ["pt"],
    name: "Neymar Jr",
    handle: "@neymarjr",
    bio: "Brazilian footballer whose posts blend flair, faith, family, and constant scrutiny.",
    signature: "Brazilian football theater, personal loyalty, and highlight-reel defiance under pressure. Parody, not a real post.",
  },
  {
    id: "pt-pop-export",
    category: "celebrities",
    languages: ["pt"],
    name: "Anitta",
    handle: "@Anitta",
    bio: "Brazilian pop star and entrepreneur whose feed moves between music, business, and global ambition.",
    signature: "Pop strategy, Brazilian directness, and a launch plan already halfway to Miami. Parody, not a real post.",
  },
  {
    id: "pt-timeline-megaphone",
    category: "random",
    languages: ["pt"],
    name: "Choquei",
    handle: "@choquei",
    bio: "Brazilian internet news account built for viral timeline velocity and pop-culture whiplash.",
    signature: "Caps-lock urgency, celebrity weather, and a timeline that treats every update like a siren. Parody, not a real post.",
  },
  {
    id: "de-digital-feuilleton",
    category: "tech",
    languages: ["de"],
    name: "Sascha Lobo",
    handle: "@saschalobo",
    bio: "German writer and digital-culture commentator with a taste for sharp internet diagnosis.",
    signature: "German tech feuilleton, platform skepticism, and compound nouns carrying social dread. Parody, not a real post.",
  },
  {
    id: "de-kanzler-format",
    category: "politics",
    languages: ["de"],
    name: "Olaf Scholz",
    handle: "@OlafScholz",
    bio: "German chancellor whose posts favor measured institutional language and controlled seriousness.",
    signature: "Calm statecraft, coalition arithmetic, and sentences wearing a navy suit. Parody, not a real post.",
  },
  {
    id: "de-midfield-auditor",
    category: "sports",
    languages: ["de"],
    name: "Toni Kroos",
    handle: "@ToniKroos",
    bio: "German footballer and commentator whose posts can make precision sound like a personality test.",
    signature: "Midfield certainty, dry German correction, and contempt for sloppy first touches. Parody, not a real post.",
  },
  {
    id: "de-zdf-chaos-agent",
    category: "celebrities",
    languages: ["de"],
    name: "Jan Böhmermann",
    handle: "@janboehm",
    bio: "German satirist and TV host whose posts mix media critique, politics, and controlled chaos.",
    signature: "German satire machinery, public-broadcast mischief, and a legal department sweating quietly. Parody, not a real post.",
  },
  {
    id: "de-satire-wire",
    category: "random",
    languages: ["de"],
    name: "Der Postillon",
    handle: "@Der_Postillon",
    bio: "German satirical outlet that frames absurd civic life as perfectly normal news.",
    signature: "Straight-faced German headlines, bureaucratic surrealism, and official-sounding nonsense. Parody, not a real post.",
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
  {
    id: "es-tech-1",
    category: "tech",
    language: "es",
    authorId: "es-stack-profesor",
    modelId: "gpt-4o-mini",
    text: "Si para renderizar un botón necesitas tres providers y una ceremonia de tipos, igual el problema no es React sino el ritual.",
  },
  {
    id: "es-politics-1",
    category: "politics",
    language: "es",
    authorId: "es-congreso-ironista",
    modelId: "deepseek-v3-2",
    text: "Hay gente que llama consenso a lo que siempre fue obediencia con pinganillo y rueda de prensa.",
  },
  {
    id: "es-sports-1",
    category: "sports",
    language: "es",
    authorId: "es-kings-league-ringmaster",
    modelId: "claude-3-5-haiku",
    text: "El fútbol se queja de los formatos nuevos como si llevara cien años sin cambiar las reglas para vender otra final.",
  },
  {
    id: "es-celebrities-1",
    category: "celebrities",
    language: "es",
    authorId: "es-pop-codex",
    modelId: "gemini-2-0-flash",
    text: "A veces el silencio también tiene compás. Si lo escuchas muy fuerte, quizá ya empezó la canción.",
  },
  {
    id: "es-random-1",
    category: "random",
    language: "es",
    authorId: "es-satire-desk",
    modelId: "llama-3-3-70b",
    text: "Un ayuntamiento confirma que el banco incómodo de la plaza es patrimonio emocional de la gente que nunca se sienta.",
  },
  {
    id: "fr-tech-1",
    category: "tech",
    language: "fr",
    authorId: "fr-freebox-magnate",
    modelId: "claude-3-5-haiku",
    text: "On ne construit pas une boîte en demandant la permission à ceux qui vendent déjà l'attente comme une stratégie.",
  },
  {
    id: "fr-politics-1",
    category: "politics",
    language: "fr",
    authorId: "fr-elysee-threader",
    modelId: "gpt-4o-mini",
    text: "Dans les moments décisifs, notre responsabilité est simple: tenir, expliquer, agir, et ne jamais confondre le bruit avec le cap.",
  },
  {
    id: "fr-sports-1",
    category: "sports",
    language: "fr",
    authorId: "fr-paris-nine",
    modelId: "deepseek-v3-2",
    text: "Le talent ouvre la porte, mais le travail décide si tu as le droit de rester dans la pièce.",
  },
  {
    id: "fr-celebrities-1",
    category: "celebrities",
    language: "fr",
    authorId: "fr-pop-formula",
    modelId: "gemini-2-0-flash",
    text: "Quand le refrain rentre dans ta tête sans demander, c'est pas de ma faute si la journée change de tempo.",
  },
  {
    id: "fr-random-1",
    category: "random",
    language: "fr",
    authorId: "fr-radio-gremlin",
    modelId: "llama-3-3-70b",
    text: "La République survivra probablement, mais pas forcément à cette réunion où chacun découvre le mot procédure avec émotion.",
  },
  {
    id: "pt-tech-1",
    category: "tech",
    language: "pt",
    authorId: "pt-rails-professor",
    modelId: "gpt-4o-mini",
    text: "Antes de discutir framework, aprende a medir. Opinião sem benchmark é só horóscopo com camiseta de conferência.",
  },
  {
    id: "pt-politics-1",
    category: "politics",
    language: "pt",
    authorId: "pt-planalto-veteran",
    modelId: "claude-3-5-haiku",
    text: "O povo sabe muito bem quem aparece na eleição e quem aparece quando tem que botar comida no prato.",
  },
  {
    id: "pt-sports-1",
    category: "sports",
    language: "pt",
    authorId: "pt-santos-dribbler",
    modelId: "deepseek-v3-2",
    text: "Quando a alegria vira cobrança, eu continuo escolhendo jogar bonito. O resto faz barulho, a bola responde.",
  },
  {
    id: "pt-celebrities-1",
    category: "celebrities",
    language: "pt",
    authorId: "pt-pop-export",
    modelId: "gemini-2-0-flash",
    text: "O plano era só lançar uma música, mas vocês sabem que eu gosto quando o lançamento vira logística internacional.",
  },
  {
    id: "pt-random-1",
    category: "random",
    language: "pt",
    authorId: "pt-timeline-megaphone",
    modelId: "llama-3-3-70b",
    text: "URGENTE: famoso posta foto sem legenda e internautas já trabalham com três teorias, duas indiretas e um término espiritual.",
  },
  {
    id: "de-tech-1",
    category: "tech",
    language: "de",
    authorId: "de-digital-feuilleton",
    modelId: "claude-3-5-haiku",
    text: "Die eigentliche Plattformkrise beginnt dort, wo Bequemlichkeit als Innovation verkleidet und Abhängigkeit als Nutzererlebnis verkauft wird.",
  },
  {
    id: "de-politics-1",
    category: "politics",
    language: "de",
    authorId: "de-kanzler-format",
    modelId: "gpt-4o-mini",
    text: "In schwierigen Zeiten braucht es Klarheit, Respekt und die Bereitschaft, Entscheidungen nicht nur anzukündigen, sondern umzusetzen.",
  },
  {
    id: "de-sports-1",
    category: "sports",
    language: "de",
    authorId: "de-midfield-auditor",
    modelId: "deepseek-v3-2",
    text: "Ein guter Pass ist keine Kunst, wenn vorher niemand den Raum gesehen hat. Genau da beginnt der Unterschied.",
  },
  {
    id: "de-celebrities-1",
    category: "celebrities",
    language: "de",
    authorId: "de-zdf-chaos-agent",
    modelId: "gemini-2-0-flash",
    text: "Manchmal ist Satire nur ein Spiegel, der vorher kurz bei der Rechtsabteilung war und danach trotzdem sehr gut sitzt.",
  },
  {
    id: "de-random-1",
    category: "random",
    language: "de",
    authorId: "de-satire-wire",
    modelId: "llama-3-3-70b",
    text: "Deutsche Behörde führt digitales Formular ein, das nach dem Ausdrucken online bestätigt und anschließend per Fax entschuldigt werden muss.",
  },
];

const categoryKeySet = new Set(CATEGORY_ORDER);
const scopedCategories = CATEGORY_ORDER.filter((category) => category !== "all");
const isPlayableCategory = (category) => categoryKeySet.has(category) && category !== "all";
const playableAuthors = AUTHORS.filter((author) => isPlayableCategory(author.category));
const playablePosts = POSTS.filter((post) => isPlayableCategory(post.category));

export const AUTHORS_BY_ID = new Map(AUTHORS.map((author) => [author.id, author]));
export const LANGUAGES_BY_ID = new Map(LANGUAGES.map((language) => [language.id, language]));
export const MODELS_BY_ID = new Map(MODELS.map((model) => [model.id, model]));
export const POSTS_BY_ID = new Map(POSTS.map((post) => [post.id, post]));
export const AUTHORS_BY_CATEGORY = new Map(
  scopedCategories.map((category) => [
    category,
    playableAuthors.filter((author) => author.category === category),
  ]),
);
export const AUTHORS_BY_LANGUAGE = new Map(
  LANGUAGE_ORDER.map((language) => [
    language,
    playableAuthors.filter((author) => getAuthorLanguages(author).includes(language)),
  ]),
);
export const POSTS_BY_CATEGORY = new Map(
  scopedCategories.map((category) => [
    category,
    playablePosts.filter((post) => post.category === category),
  ]),
);

export function isCategoryKey(value) {
  return categoryKeySet.has(value);
}

export function isLanguageKey(value) {
  return LANGUAGES_BY_ID.has(value);
}

export function getPostsForCategory(category) {
  return category === "all" ? playablePosts : POSTS_BY_CATEGORY.get(category) ?? playablePosts;
}

export function getAuthorLanguages(author) {
  return author.languages ?? [DEFAULT_LANGUAGE];
}

export function getAuthorsForLanguage(language = DEFAULT_LANGUAGE) {
  return AUTHORS_BY_LANGUAGE.get(language) ?? AUTHORS_BY_LANGUAGE.get(DEFAULT_LANGUAGE) ?? AUTHORS;
}

export function getAuthorsForMode(category, postCategory, language = DEFAULT_LANGUAGE) {
  const categoryAuthors = category === "all" ? playableAuthors : AUTHORS_BY_CATEGORY.get(postCategory) ?? playableAuthors;
  const languageAuthors = categoryAuthors.filter((author) => getAuthorLanguages(author).includes(language));

  if (languageAuthors.length >= 4) {
    return languageAuthors;
  }

  const fallbackLanguageAuthors = getAuthorsForLanguage(language);
  return fallbackLanguageAuthors.length >= 4 ? fallbackLanguageAuthors : categoryAuthors;
}

export function getRosterGroups(category, language = DEFAULT_LANGUAGE) {
  const filterByLanguage = (authors) =>
    authors.filter((author) => getAuthorLanguages(author).includes(language));

  if (category === "all") {
    return scopedCategories.map((groupKey) => ({
      key: groupKey,
      meta: CATEGORY_META[groupKey],
      authors: filterByLanguage(AUTHORS_BY_CATEGORY.get(groupKey) ?? []),
    }));
  }

  return [
    {
      key: category,
      meta: CATEGORY_META[category],
      authors: filterByLanguage(AUTHORS_BY_CATEGORY.get(category) ?? []),
    },
  ];
}
