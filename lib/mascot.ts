/**
 * Mini Shourobh, the site's mascot (settings.mascot). What the dashboard's Mascot page stores, its defaults, and the
 * cleaning that runs on every read and save. The drawing and the show are components/site/mascotRig.ts (one living
 * copy of him) and components/site/mascotEngine.ts (him on the page: sections, chat, games, rocket, throwing).
 * Chosen by the owner on 2026-11-21 from the preview https://claude.ai/artifact/S14ayCZy8ZurmMfkwP5CsA.
 */

export const MZ_SKINS = ["#f0c7a1", "#dba27a", "#c58a62", "#a36b45", "#7f4f31"] as const;
export const MZ_SHIRTS = { teal: ["#1f7f7c", "#0f3b3a", "Teal plaid"], maroon: ["#8c2f3c", "#45131b", "Maroon plaid"], navy: ["#2d4f86", "#14254a", "Navy plaid"], olive: ["#6b7a2e", "#333b12", "Olive plaid"] } as const;
export const MZ_JEANS = { light: ["#8fb3dc", "#6d93c2", "Light blue"], dark: ["#3f5a86", "#2b3f63", "Dark blue"], black: ["#3a3d45", "#25272d", "Black"] } as const;
export type MzShirt = keyof typeof MZ_SHIRTS;
export type MzJeans = keyof typeof MZ_JEANS;

/*
 * His wardrobe (the owner kept every outfit, pair of glasses and hat from the Wardrobe preview on 2026-11-26,
 * https://claude.ai/artifact/9TP9YUci5ckmKb1um2haFR). Drawn by components/site/mascotWear.ts. Everyday's colours are
 * `shirt` and `jeans` as before; every other outfit keeps its own colour (`colors`, an index into its list).
 */
export const MZ_OUTFITS = [
  ["everyday", "Everyday", "Plaid shirt open over a tee, jeans, white sneakers"],
  ["panjabi", "Panjabi", "Embroidered panjabi, white pajama, nagra shoes"],
  ["suit", "Suit and tie", "Jacket, white shirt, tie, pocket square, formal shoes"],
  ["winter", "Winter", "Puffer jacket, striped scarf, dark jeans, boots"],
  ["beach", "Beach", "Board shorts and flip-flops"],
  ["sporty", "Sporty", "Football jersey with number 10, shorts, socks, boots"],
  ["smart", "Smart casual", "Shirt with rolled sleeves, belt, chinos, loafers"],
  ["home", "At home", "Checked lungi, white genji, rubber chappals"],
] as const;
export type MzOutfit = (typeof MZ_OUTFITS)[number][0];
/** [name, main colour, second colour] */
export const MZ_OUTFIT_COLORS: Record<Exclude<MzOutfit, "everyday">, readonly (readonly [string, string, string])[]> = {
  panjabi: [["White", "#fbf9f2", "#d4a63a"], ["Cream", "#efe2c4", "#8a5a2b"], ["Sky blue", "#a9d2ef", "#ffffff"], ["Mint", "#b9e3cf", "#2f7d5b"], ["Maroon", "#7d1f2c", "#e8c36a"], ["Black", "#25262d", "#d8b45a"], ["Boishakh red & white", "#fbf9f2", "#d62828"]],
  suit: [["Navy", "#26355a", "#172238"], ["Charcoal", "#3b3e46", "#25272c"], ["Black", "#1a1b20", "#0c0c0f"], ["Beige", "#c9b48e", "#a38d66"]],
  winter: [["Mustard", "#e0a526", "#a8761a"], ["Red", "#c8372d", "#8e2219"], ["Navy", "#2b3c66", "#1a2544"], ["Olive", "#6b7a3a", "#465024"]],
  beach: [["Sky", "#4fb3e8", "#ffffff"], ["Coral", "#ff7a6b", "#ffe08a"], ["Sunny", "#ffc93c", "#e0553f"], ["Teal", "#1fa59a", "#ffd34d"]],
  sporty: [["Bangladesh green", "#00704f", "#f42a41"], ["Sky stripes", "#ffffff", "#6cb4ee"], ["Cricket whites", "#f7f7f2", "#1f7f4f"]],
  smart: [["White", "#f7f8fa", "#cfd5df"], ["Light blue", "#b8d4f2", "#7ea6d6"], ["Black", "#25262c", "#111216"], ["Olive", "#7a8450", "#545b33"]],
  home: [["Blue check", "#2f5fa7", "#9cc0ee"], ["Green check", "#2d7a4f", "#9fdcb6"], ["Maroon check", "#7d2433", "#e7a0ab"]],
};
export const MZ_BOISHAKH = 6; // the red and white panjabi
export const MZ_GLASSES = [["none", "None"], ["classic", "Rounded square"], ["round", "Round"], ["thin", "Thin rectangle"], ["bold", "Bold black"], ["aviator", "Aviators"], ["shades", "Sunglasses"]] as const;
export type MzGlasses = (typeof MZ_GLASSES)[number][0];
export const MZ_HATS = [["none", "No hat"], ["tupi", "Tupi"], ["cap", "Cap"], ["capback", "Cap backwards"], ["beanie", "Beanie"], ["straw", "Straw hat"], ["night", "Night cap"], ["party", "Party hat"]] as const;
export type MzHat = (typeof MZ_HATS)[number][0];
export const MZ_SHOES = [["own", "Outfit's own"], ["sneaker", "White sneakers"], ["sneakerdk", "Black sneakers"], ["formal", "Formal shoes"], ["loafer", "Loafers"], ["boot", "Boots"], ["nagra", "Nagra"], ["chappal", "Chappals"], ["flip", "Flip-flops"], ["studs", "Football boots"]] as const;
export type MzShoe = (typeof MZ_SHOES)[number][0];
/** special days: he dresses for them by himself, all day in the owner's time zone, then goes back to his chosen look */
export const MZ_AUTO = [
  ["eid", "Eid days", "Panjabi and tupi (the dates below, or the Eid switch under Moments)"],
  ["boishakh", "Pohela Boishakh (14 April)", "Red and white panjabi"],
  ["birthday", "Your birthday", "Suit and tie, with the party hat"],
  ["match", "Big match days", "Football jersey (the dates below)"],
  ["friday", "Fridays", "Panjabi"],
  ["winter", "Winter (December to February)", "Winter jacket and beanie"],
  ["visitors", "Visitors can dress him", "A Change clothes card in his chat; only for that visitor's visit, nothing is saved"],
] as const;
export type MzAuto = (typeof MZ_AUTO)[number][0];
/** what he has on at one moment */
export type MzWear = { outfit: MzOutfit; col: number; glasses: MzGlasses; hat: MzHat; shoes: MzShoe };

/** His move in each section, picked by the section's layout. */
export const MZ_BITS = [
  ["hero", "Hero", "Waves hello"], ["me", "Me (notes)", "Hand on heart, proud nod"], ["made", "Made (projects)", "Types on his laptop"],
  ["adventures", "Adventures (trips)", "Looks through binoculars"], ["influences", "Influences (shelf)", "Reads a book"], ["feed", "Feed (thoughts)", "Shouts through a megaphone"],
  ["growth", "Growth (milestones)", "Lifts a trophy and jumps"], ["life", "Life (snapshots)", "Snaps a photo"], ["connect", "Connect", "Sends a paper plane"],
] as const;
export type MzBit = (typeof MZ_BITS)[number][0];
export const MZ_BIT_OF_LAYOUT: Record<string, MzBit> = {
  notes: "me", windows: "made", cards: "made", tickets: "adventures", strip: "adventures", study: "influences", list: "influences",
  comic: "feed", stream: "feed", awards: "growth", timeline: "growth", scrapbook: "life", photos: "life", chat: "connect", connect: "connect",
};

export const MZ_TRICKS = [["wave", "👋 Wave"], ["flex", "💪 Flex"], ["dance", "🕺 Dance"], ["cheer", "🙌 Cheer"], ["backflip", "🤸 Backflip"], ["think", "💡 Big idea"], ["highfive", "✋ High five"], ["fireup", "🔥 Fired up"]] as const;
export type MzTrick = (typeof MZ_TRICKS)[number][0];

export const MZ_QA = [
  ["who", "Proud pose with a cape and shades"], ["job", "Glasses on, types on his laptop"], ["from", "Waves a Bangladesh flag"], ["joke", "Drum hit, then rolls on the floor laughing"],
  ["food", "Sips cha, then a spicy fuchka"], ["single", "Blushes and kicks his foot"], ["sing", "Sings into a microphone"], ["trick", "Does his next trick"],
  ["game", "Rock, paper, scissors"], ["tour", "Takes you to the next section"], ["bye", "Rocket ship, back by parachute"],
] as const;
export type MzQa = (typeof MZ_QA)[number][0];
export type MzQaItem = { on: boolean; q: string; a: string };

export const MZ_GAMES = [["football", "⚽ Keepy-ups"], ["cricket", "🏏 Cricket six"], ["yawn", "🥱 Yawn and stretch"], ["whistle", "🎵 Whistles"], ["phone", "📱 Laughs at his phone"]] as const;
export type MzGame = (typeof MZ_GAMES)[number][0];

export type MascotSettings = {
  show: boolean; phones: boolean;
  /** shows he puts on by himself (2026-11-26): about every `every` seconds while someone's on the page, a random pick from what's switched on */
  shows: { on: boolean; every: number; tricks: boolean; games: boolean; moments: boolean };
  place: "corner" | "popup"; side: "right" | "left"; size: number;
  skin: string; hair: "curly" | "swept" | "short"; beard: "trim" | "stubble" | "clean"; glasses: MzGlasses; shirt: MzShirt; jeans: MzJeans;
  outfit: MzOutfit; colors: Record<Exclude<MzOutfit, "everyday">, number>; hat: MzHat; shoes: MzShoe;
  auto: Record<MzAuto, boolean>; eidDates: string[]; matchDates: string[];
  chat: "quiet" | "normal" | "chatty"; follow: boolean; duck: boolean; cheer: boolean; nap: boolean; napAfter: number;
  tricks: Record<MzTrick, boolean>;
  acts: Record<MzBit, boolean>;
  greet: string;
  lines: Record<Exclude<MzBit, "hero">, string>;
  qa: Record<MzQa, MzQaItem>;
  fun: {
    ground: boolean; throw: boolean; tickle: boolean; bored: boolean; boredAfter: number; games: Record<MzGame, boolean>;
    rocket: boolean; rocketName: string; backAfter: number; notice: { fast: boolean; end: boolean; back: boolean; point: boolean }; hearts: boolean; sounds: boolean;
  };
  moments: { auto: boolean; morning: boolean; night: boolean; rain: boolean; eid: boolean; birthday: string };
  /** Visitors sending him away and calling him back (2026-11-28, the owner's picks from https://claude.ai/artifact/1oUD8vJhp78vxLQ2btw7f2). */
  bye: MzBye;
  /** The talking scene (clicking him) and his voice. Speed, pitch and volume are percentages. */
  convo: {
    voice: boolean; voiceName: string; voiceKind: "male" | "female" | "any"; rate: number; pitch: number; volume: number;
    mic: boolean; dim: number; scale: number; hello: string; invite: boolean; inviteText: string; inviteEvery: number;
  };
};

/** How a visitor says bye and hi (settings.mascot.bye): the ways to send him away, how he leaves, what stays while he's away, how he comes back. */
export const MZ_BYE_EXITS = [["random", "Random each time"], ["rocket", "🚀 Rocket up"], ["suitcase", "🧳 Walks off with a suitcase"], ["hole", "🕳️ Digs a hole and drops in"], ["sparkle", "✨ Puff of sparkles"], ["curtain", "🎭 “Be right back” curtain"]] as const;
export const MZ_BYE_AWAY = [["peek", "👀 Peeking head"], ["badge", "🔘 Round face badge"], ["link", "🔗 Just a footer link"]] as const;
export const MZ_BYE_ENTERS = [["random", "Random each time"], ["parachute", "🪂 Parachutes in"], ["popup", "⬆️ Pops up from below"], ["jump", "🤸 Jumps in from the side"], ["sparkle", "✨ Appears in sparkles"]] as const;
export const MZ_BYE_STAY = [["visit", "For the rest of the visit"], ["device", "For good on this device"], ["minutes", "Back by himself after a few minutes"]] as const;
export type MzByeExit = (typeof MZ_BYE_EXITS)[number][0];
export type MzByeEnter = (typeof MZ_BYE_ENTERS)[number][0];
export type MzBye = {
  on: boolean; tab: boolean; fling: boolean; chat: boolean;
  exit: MzByeExit; away: (typeof MZ_BYE_AWAY)[number][0]; enter: MzByeEnter; stay: (typeof MZ_BYE_STAY)[number][0]; minutes: number;
  tabText: string; byeLine: string; hiLine: string;
};

export const MZ_LIMITS = { minutes: [1, 120], size: [70, 140], napAfter: [15, 300], boredAfter: [5, 120], backAfter: [2, 30], rate: [60, 160], pitch: [50, 200], volume: [10, 100], dim: [30, 90], scale: [120, 240], inviteEvery: [15, 300], every: [10, 180] } as const;

const allOn = <K extends string>(keys: readonly (readonly [K, ...unknown[]])[]) => Object.fromEntries(keys.map(([k]) => [k, true])) as Record<K, boolean>;

/*
 * Everything he says can have several versions, picked at random each time and never the same twice in a row (the owner's
 * rule, 2026-11-21): | between versions of one line; in an answer, each line is a sentence, and an empty line starts a whole
 * other version of the answer (a joke's setup and punchline stay together). mascotRig.ts reads them with vary() and answer().
 */
export const DEFAULT_MASCOT: MascotSettings = {
  show: true, phones: true, shows: { on: true, every: 30, tricks: true, games: true, moments: true }, place: "corner", side: "right", size: 100,
  skin: "#c58a62", hair: "curly", beard: "trim", glasses: "none", shirt: "teal", jeans: "light",
  outfit: "everyday", colors: { panjabi: 0, suit: 0, winter: 0, beach: 0, sporty: 0, smart: 0, home: 0 }, hat: "none", shoes: "own",
  auto: allOn(MZ_AUTO), eidDates: [], matchDates: [],
  chat: "normal", follow: true, duck: true, cheer: true, nap: true, napAfter: 45,
  tricks: allOn(MZ_TRICKS),
  acts: allOn(MZ_BITS),
  greet: "Hey, I'm Mini Shourobh! Good {time} from Dhaka.|Good {time}! Mini Shourobh here. Come on in! 👋|Oh hi! Good {time} from Dhaka. Make yourself at home.|Welcome! I'm Mini Shourobh, your tiny host. Good {time}! 😄",
  lines: {
    me: "This bit is all about me. The big me, I mean.|Meet the real me. Well, the bigger one.|Who's Shourobh? Start right here.|The story so far. Spoiler: it's me. 😄",
    made: "Built all of these myself. Click one, they're real.|Fresh from my workshop. Go on, click one!|Made with code, cha and late nights. ☕|These actually work. Try one!",
    adventures: "Next stop? Somewhere with a sea view.|Pack your bags, we're going places! 🧳|Every trip has a story. Pick one!|Where to next? I vote beach. 🏖️",
    influences: "These shaped how I think. Borrow one?|My shelf of big ideas. Have a look!|Books, songs and people that changed me.|Good stuff in here. Pick something!",
    feed: "Hot takes ahead! Tap the art to vote.|Opinions! Fresh and a little spicy. 🌶️|Agree? Disagree? Tap and vote!|My brain, unfiltered. Vote away!",
    growth: "Every one of these took a while. Worth it.|The trophy wall! Took years, honestly. 🏆|Small wins, big wins. They all count.|Level ups, one by one. 💪",
    life: "Say cheese! The everyday stuff.|Little moments, big smiles. 📸|Just life, as it happens.|The everyday stuff that makes me, me.",
    connect: "Say hello! I do reply, promise.|Drop a message. I read every one! 💌|Go on, say hi. I don't bite!|Write me something. I'll write back!",
  },
  qa: {
    who: { on: true, q: "Who are you?", a: "I'm Shourobh! Well, the mini one.|Hi! I'm Shourobh. The pocket-sized version.|Shourobh here! The tiny edition. 😎\nData officer by day, maker by night.|By day I tame data. By night I build stuff.|Spreadsheets by day, side projects by night.\nBorn and raised in Dhaka.|Dhaka born, Dhaka raised.|A proud Dhaka kid, through and through.\nThis whole site? Mine. 😎|I built this whole site myself. 😎|Every pixel here? Mine. 😎" },
    job: { on: true, q: "What do you do?", a: "I make sense of data at work. 📊|At work, I turn messy data into answers. 📊|Data officer! I find the stories in numbers. 📈\nAnd I build things like this site for fun.|After work, I build things. Like this site!|For fun? I make websites. Like this one. 😄" },
    from: { on: true, q: "Where are you from?", a: "Dhaka, Bangladesh!|Dhaka, Bangladesh. Best city, wildest traffic.|I'm from Dhaka, Bangladesh! 🇧🇩\nHome of fuchka, cha and epic traffic.|Come for the fuchka, stay for the cha.|Where a 5 km ride can take an hour. 😅" },
    joke: { on: true, q: "Tell me a joke", a: "Why don't programmers like nature?\nToo many bugs. 🐛\n\nHow do you comfort a JavaScript bug?\nYou console it. 😄\n\nWhy did the developer go broke?\nHe used up all his cache. 💸\n\nWhy did the spreadsheet go to therapy?\nToo many issues in its cells." },
    food: { on: true, q: "Favourite food?", a: "Cha, always. ☕|Cha. Morning, noon and night. ☕|Milk cha with extra sugar. Always. ☕\nAnd fuchka. Extra spicy!|And fuchka, the spicier the better!|Plus fuchka. Extra spicy, no mercy! 🌶️" },
    single: { on: true, q: "Are you single?", a: "Haha… 🙈|Ooh, a personal question! 🙈|Whoa, straight to the point! 🙈\nAsk the big me. 😉|That's classified. Ask the big me. 😉|Say hello to the big me and find out. 😉" },
    sing: { on: true, q: "Sing a song", a: "🎵 La la la, welcome to my site…|🎵 Dhaka nights and cha so bright…|🎵 Click a card and stay a while…\n🎶 Scroll around, stay a while!|🎶 Every section, every smile!|🎶 Thanks for visiting, you're the best! 🎤" },
    trick: { on: true, q: "Do a trick!", a: "" },
    game: { on: true, q: "Let's play a game", a: "Rock, paper, scissors! You pick first.|Let's play rock, paper, scissors! Your move.|Rock, paper, scissors? Pick yours. I won't peek. 👀" },
    tour: { on: true, q: "Show me around", a: "Follow me!|This way!|Come on, I'll show you!|Let's go!" },
    bye: { on: true, q: "Goodbye!", a: "Bye! See you soon! 👋|Leaving already? Come back soon! 👋|Rocket time! Bye bye! 🚀|See you next time, friend! 👋" },
  },
  fun: {
    ground: true, throw: true, tickle: true, bored: true, boredAfter: 12, games: allOn(MZ_GAMES),
    rocket: true, rocketName: "SHOUROBH ONE", backAfter: 4, notice: { fast: true, end: true, back: true, point: true }, hearts: true, sounds: false,
  },
  moments: { auto: true, morning: true, night: true, rain: false, eid: false, birthday: "" },
  bye: {
    on: true, tab: true, fling: false, chat: false, exit: "random", away: "peek", enter: "random", stay: "visit", minutes: 5,
    tabText: "👋 Bye", byeLine: "Okay… I'll be right here if you need me 🥺", hiLine: "Hi again! Missed me? 👋",
  },
  convo: {
    voice: true, voiceName: "", voiceKind: "male", rate: 105, pitch: 135, volume: 100,
    mic: false, dim: 72, scale: 180, hello: "Hey there! I'm Mini Shourobh. 😄|Hi hi! Mini Shourobh, at your service. 😄|Oh, a visitor! Hi, I'm Mini Shourobh. 👋",
    invite: true, inviteText: "Wanna chat? 💬|Psst… talk to me! 💬|Got a question? 💬|Say hi to me! 👋|Bored? Let's chat! 😄", inviteEvery: 40,
  },
};

/** The single-version words he started with: a saved setting still equal to one of these takes the new, varied default. */
const OLD_DEFAULTS: Record<string, string> = {
  greet: "Hey, I'm Mini Shourobh! Good {time} from Dhaka.",
  "lines.me": "This bit is all about me. The big me, I mean.", "lines.made": "Built all of these myself. Click one, they're real.", "lines.adventures": "Next stop? Somewhere with a sea view.",
  "lines.influences": "These shaped how I think. Borrow one?", "lines.feed": "Hot takes ahead! Tap the art to vote.", "lines.growth": "Every one of these took a while. Worth it.",
  "lines.life": "Say cheese! The everyday stuff.", "lines.connect": "Say hello! I do reply, promise.",
  "qa.who": "I'm Shourobh! Well, the mini one.\nData officer by day, maker by night.\nBorn and raised in Dhaka.\nThis whole site? Mine. 😎",
  "qa.job": "I make sense of data at work. 📊\nAnd I build things like this site for fun.", "qa.from": "Dhaka, Bangladesh!\nHome of fuchka, cha and epic traffic.",
  "qa.joke": "Why don't programmers like nature?\nToo many bugs.", "qa.food": "Cha, always. ☕\nAnd fuchka. Extra spicy!", "qa.single": "Haha… 🙈\nAsk the big me. 😉",
  "qa.sing": "🎵 La la la, welcome to my site…\n🎶 Scroll around, stay a while!", "qa.game": "Rock, paper, scissors! You pick first.", "qa.tour": "Follow me!", "qa.bye": "Bye! See you soon! 👋",
  hello: "Hey there! I'm Mini Shourobh. 😄", inviteText: "Wanna chat? 💬",
};
const fresh = (key: string, v: string, now: string) => (OLD_DEFAULTS[key] !== undefined && v.trim() === OLD_DEFAULTS[key] ? now : v);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max: number, fallback: string) => (typeof v === "string" ? v.replace(/[\u0000-\u0009\u000b-\u001f]/g, " ").slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => { const n = Number(v); return v !== "" && v !== null && Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : fallback; };
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const flags = <K extends string>(raw: unknown, def: Record<K, boolean>) => { const r = isObj(raw) ? raw : {}; return Object.fromEntries(Object.keys(def).map((k) => [k, bool(r[k], def[k as K])])) as Record<K, boolean>; };

const dates = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort().slice(-30) : []);

/** Anything stored or sent becomes a complete, safe MascotSettings (missing parts take the defaults). */
export function cleanMascot(raw: unknown): MascotSettings {
  const r = isObj(raw) ? raw : {}, D = DEFAULT_MASCOT;
  const lr = isObj(r.lines) ? r.lines : {}, qr = isObj(r.qa) ? r.qa : {}, fr = isObj(r.fun) ? r.fun : {}, nr = isObj(fr.notice) ? fr.notice : {}, mr = isObj(r.moments) ? r.moments : {}, cr = isObj(r.convo) ? r.convo : {}, C = D.convo;
  return {
    show: bool(r.show, D.show), phones: bool(r.phones, D.phones),
    shows: (() => { const x = isObj(r.shows) ? r.shows : {}, S = D.shows; return { on: bool(x.on, S.on), every: num(x.every, MZ_LIMITS.every, S.every), tricks: bool(x.tricks, S.tricks), games: bool(x.games, S.games), moments: bool(x.moments, S.moments) }; })(),
    place: r.place === "peek" ? "popup" : oneOf(r.place, ["corner", "popup"] as const, D.place), side: oneOf(r.side, ["right", "left"] as const, D.side), size: num(r.size, MZ_LIMITS.size, D.size), // a saved "host" (walk-on host) becomes the corner and "peek" pops up from below now (both 2026-11-26)
    skin: typeof r.skin === "string" && /^#[0-9a-f]{6}$/i.test(r.skin) ? r.skin : D.skin,
    hair: oneOf(r.hair, ["curly", "swept", "short"] as const, D.hair), beard: oneOf(r.beard, ["trim", "stubble", "clean"] as const, D.beard), glasses: r.glasses === true ? "classic" : r.glasses === false ? "none" : oneOf(r.glasses, MZ_GLASSES.map(([k]) => k), D.glasses),
    shirt: oneOf(r.shirt, Object.keys(MZ_SHIRTS) as MzShirt[], D.shirt), jeans: oneOf(r.jeans, Object.keys(MZ_JEANS) as MzJeans[], D.jeans),
    outfit: oneOf(r.outfit, MZ_OUTFITS.map(([k]) => k), D.outfit), hat: oneOf(r.hat, MZ_HATS.map(([k]) => k), D.hat), shoes: oneOf(r.shoes, MZ_SHOES.map(([k]) => k), D.shoes),
    colors: Object.fromEntries((Object.keys(MZ_OUTFIT_COLORS) as (keyof typeof MZ_OUTFIT_COLORS)[]).map((k) => [k, num((isObj(r.colors) ? r.colors : {})[k], [0, MZ_OUTFIT_COLORS[k].length - 1], 0)])) as MascotSettings["colors"],
    auto: flags(r.auto, D.auto), eidDates: dates(r.eidDates), matchDates: dates(r.matchDates),
    chat: oneOf(r.chat, ["quiet", "normal", "chatty"] as const, D.chat), follow: bool(r.follow, D.follow), duck: bool(r.duck, D.duck), cheer: bool(r.cheer, D.cheer),
    nap: bool(r.nap, D.nap), napAfter: num(r.napAfter, MZ_LIMITS.napAfter, D.napAfter),
    tricks: flags(r.tricks, D.tricks), acts: flags(r.acts, D.acts),
    greet: fresh("greet", text(r.greet, 600, D.greet), D.greet),
    lines: Object.fromEntries(Object.keys(D.lines).map((k) => [k, fresh(`lines.${k}`, text(lr[k], 600, D.lines[k as keyof typeof D.lines]), D.lines[k as keyof typeof D.lines])])) as MascotSettings["lines"],
    qa: Object.fromEntries(MZ_QA.map(([k]) => { const q = isObj(qr[k]) ? qr[k] : {}; return [k, { on: bool(q.on, D.qa[k].on), q: text(q.q, 60, D.qa[k].q).replace(/\n/g, " "), a: fresh(`qa.${k}`, text(q.a, 1500, D.qa[k].a), D.qa[k].a) }]; })) as MascotSettings["qa"],
    fun: {
      ground: bool(fr.ground, D.fun.ground), throw: bool(fr.throw, D.fun.throw), tickle: bool(fr.tickle, D.fun.tickle), bored: bool(fr.bored, D.fun.bored),
      boredAfter: num(fr.boredAfter, MZ_LIMITS.boredAfter, D.fun.boredAfter), games: flags(fr.games, D.fun.games),
      rocket: bool(fr.rocket, D.fun.rocket), rocketName: text(fr.rocketName, 24, D.fun.rocketName).replace(/\n/g, " "), backAfter: num(fr.backAfter, MZ_LIMITS.backAfter, D.fun.backAfter),
      notice: flags(nr, D.fun.notice), hearts: bool(fr.hearts, D.fun.hearts), sounds: bool(fr.sounds, D.fun.sounds),
    },
    moments: {
      auto: bool(mr.auto, D.moments.auto), morning: bool(mr.morning, D.moments.morning), night: bool(mr.night, D.moments.night),
      rain: bool(mr.rain, D.moments.rain), eid: bool(mr.eid, D.moments.eid),
      birthday: typeof mr.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mr.birthday) ? mr.birthday : "",
    },
    bye: (() => { const b = isObj(r.bye) ? r.bye : {}, B = D.bye; return {
      on: bool(b.on, B.on), tab: bool(b.tab, B.tab), fling: bool(b.fling, B.fling), chat: bool(b.chat, B.chat),
      exit: oneOf(b.exit, MZ_BYE_EXITS.map(([k]) => k), B.exit), away: oneOf(b.away, MZ_BYE_AWAY.map(([k]) => k), B.away),
      enter: oneOf(b.enter, MZ_BYE_ENTERS.map(([k]) => k), B.enter), stay: oneOf(b.stay, MZ_BYE_STAY.map(([k]) => k), B.stay), minutes: num(b.minutes, MZ_LIMITS.minutes, B.minutes),
      tabText: text(b.tabText, 24, B.tabText).replace(/\n/g, " "), byeLine: text(b.byeLine, 300, B.byeLine).replace(/\n/g, " "), hiLine: text(b.hiLine, 300, B.hiLine).replace(/\n/g, " "),
    }; })(),
    convo: {
      voice: bool(cr.voice, C.voice), voiceName: text(cr.voiceName, 120, C.voiceName).replace(/\n/g, " "), voiceKind: oneOf(cr.voiceKind, ["male", "female", "any"] as const, C.voiceKind),
      rate: num(cr.rate, MZ_LIMITS.rate, C.rate), pitch: num(cr.pitch, MZ_LIMITS.pitch, C.pitch), volume: num(cr.volume, MZ_LIMITS.volume, C.volume),
      mic: bool(cr.mic, C.mic), dim: num(cr.dim, MZ_LIMITS.dim, C.dim), scale: num(cr.scale, MZ_LIMITS.scale, C.scale),
      hello: fresh("hello", text(cr.hello, 400, C.hello).replace(/\n/g, " "), C.hello), invite: bool(cr.invite, C.invite), inviteText: fresh("inviteText", text(cr.inviteText, 240, C.inviteText).replace(/\n/g, " "), C.inviteText),
      inviteEvery: num(cr.inviteEvery, MZ_LIMITS.inviteEvery, C.inviteEvery),
    },
  };
}

/** What the public page needs besides the settings: the owner's clock, for "good evening" and the moments. */
export type MascotView = { m: MascotSettings; timezone: string };

/** what he wears by his own choice (the dashboard's look) */
export const wearOf = (m: MascotSettings): MzWear => ({ outfit: m.outfit, col: m.outfit === "everyday" ? 0 : m.colors[m.outfit], glasses: m.glasses, hat: m.hat, shoes: m.shoes });
/** today in the owner's time zone: 2026-11-26, its month and day, the weekday (0 Sunday) and the month (1 to 12) */
export type MzDay = { ymd: string; md: string; dow: number; month: number };
export function mzDay(timezone: string, at = new Date()): MzDay {
  try {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(at);
    const g = (t: string) => p.find((x) => x.type === t)?.value || "", ymd = `${g("year")}-${g("month")}-${g("day")}`;
    return { ymd, md: ymd.slice(5), dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")), month: Number(g("month")) };
  } catch { const ymd = at.toISOString().slice(0, 10); return { ymd, md: ymd.slice(5), dow: at.getDay(), month: at.getMonth() + 1 }; }
}
export const isEid = (m: MascotSettings, d: MzDay) => m.moments.eid || m.eidDates.includes(d.ymd);
/** a special day's look, or null on an ordinary day (birthday first, then Eid, Boishakh, a match, Friday, winter) */
export function autoWear(m: MascotSettings, d: MzDay): (Partial<MzWear> & { day: MzAuto }) | null {
  const A = m.auto;
  if (A.birthday && m.moments.birthday && m.moments.birthday.slice(5) === d.md) return { day: "birthday", outfit: "suit", col: m.colors.suit, shoes: "own" };
  if (A.eid && isEid(m, d)) return { day: "eid", outfit: "panjabi", col: m.colors.panjabi === MZ_BOISHAKH ? 0 : m.colors.panjabi, hat: "tupi", shoes: "own" };
  if (A.boishakh && d.md === "04-14") return { day: "boishakh", outfit: "panjabi", col: MZ_BOISHAKH, shoes: "own" };
  if (A.match && m.matchDates.includes(d.ymd)) return { day: "match", outfit: "sporty", col: m.colors.sporty, shoes: "own" };
  if (A.friday && d.dow === 5) return { day: "friday", outfit: "panjabi", col: m.colors.panjabi, shoes: "own" };
  if (A.winter && (d.month === 12 || d.month <= 2)) return { day: "winter", outfit: "winter", col: m.colors.winter, hat: m.hat === "none" ? "beanie" : m.hat, shoes: "own" };
  return null;
}
