/**
 * The little vehicles on a boarding pass and its route. Original drawings, all facing right, coloured with the theme's tokens through
 * the v-* classes in site.css, so they suit every theme. An entry's vehicle comes from a tag if it has one (`car`, `boat`...),
 * otherwise from the words on it.
 */
export type VehicleKind = "plane" | "car" | "bus" | "train" | "boat" | "bike" | "shoe" | "balloon";

const WORDS: [VehicleKind, RegExp][] = [
  ["balloon", /\b(balloon|bucket list|bucket|someday|wish|dream|next|to be decided)\b/],
  ["shoe", /\b(shoes?|walk|walking|hike|hiking|trek|trekking|run|running|marathon|race|foot)\b/],
  ["boat", /\b(boat|ship|ferry|cruise|sail|sailing|launch)\b/],
  ["train", /\b(train|rail|railway)\b/],
  ["bus", /\b(bus|coach)\b/],
  ["bike", /\b(bike|bicycle|cycle|cycling|motorbike)\b/],
  ["car", /\b(car|drive|driving|road trip|road)\b/],
  ["plane", /\b(plane|flight|flew|fly|airport)\b/],
];

type Trip = { tags: string[]; category: string; title: string; subtitle: string; location: string };

export function vehicleFor(it: Trip): VehicleKind {
  const tags = it.tags.join(" ").toLowerCase();
  for (const [kind, words] of WORDS) if (words.test(tags)) return kind;
  const text = `${it.category} ${it.title} ${it.subtitle} ${it.location}`.toLowerCase();
  for (const [kind, words] of WORDS) if (words.test(text)) return kind;
  return "plane";
}

/** On the list, not yet done: it waits with a dashed edge and says so. */
export const isNextTrip = (it: { category: string; status: string; title: string; location: string }) =>
  /\b(bucket|someday|wish|dream|upcoming|planned|plan|next|to be decided)\b/i.test(`${it.category} ${it.status} ${it.title} ${it.location}`);

const wheel = (x: number, y: number) => <><circle className="v-d" cx={x} cy={y} r="6" /><circle className="v-e" cx={x} cy={y} r="2.4" /></>;

const ART: Record<VehicleKind, { box: string; art: React.ReactNode }> = {
  plane: { box: "0 0 64 44", art: <>
    <path className="v-b" d="M9 20 3 6h7l9 14z" />
    <path className="v-a" d="M4 24c0-3 3-5 7-5h32c7 0 14 3 17 6-3 3-10 5-17 5H12c-5 0-8-3-8-6z" />
    <path className="v-b" d="M26 25 15 40h7l19-15z" />
    <path className="v-e" d="M50 21.5c3 .5 5.500 1.600 7 3h-9v-3z" />
    <circle className="v-e" cx="20" cy="24" r="1.6" /><circle className="v-e" cx="27" cy="24" r="1.6" /><circle className="v-e" cx="34" cy="24" r="1.6" /><circle className="v-e" cx="41" cy="24" r="1.6" />
  </> },
  car: { box: "0 0 64 42", art: <>
    <path className="v-a" d="M4 31v-7c0-2 1-3 3-3.500l10-2L25 10c1-1 2-1.500 4-1.500h13c2 0 3 .5 4.500 2l8 8.500c4 .5 6 2.500 6 5v7c0 1-.5 1.500-1.500 1.500H5.500C4.500 32.500 4 32 4 31z" />
    <path className="v-e" d="m22 19 6-7c.4-.5 1-.7 1.700-.7H35V19zM38 11.300h4c1 0 1.800.3 2.500 1L50 19H38z" />
    {wheel(17, 33)}{wheel(47, 33)}
  </> },
  bus: { box: "0 0 64 42", art: <>
    <rect className="v-c" x="4" y="7" width="56" height="26" rx="5" />
    <rect className="v-b" x="4" y="24" width="56" height="3" />
    <rect className="v-e" x="9" y="11" width="9" height="9" rx="1.500" /><rect className="v-e" x="21" y="11" width="9" height="9" rx="1.500" /><rect className="v-e" x="33" y="11" width="9" height="9" rx="1.500" /><rect className="v-e" x="46" y="11" width="10" height="11" rx="1.500" />
    {wheel(16, 33)}{wheel(48, 33)}
  </> },
  train: { box: "0 0 64 42", art: <>
    <path className="v-b" d="M4 30V13c0-3 2-5 5-5h29c10 0 20 8 22 18v4z" />
    <rect className="v-e" x="10" y="13" width="8" height="7" rx="1.500" /><rect className="v-e" x="21" y="13" width="8" height="7" rx="1.500" /><rect className="v-e" x="32" y="13" width="8" height="7" rx="1.500" />
    <path className="v-e" d="M44 12.500c5 1.500 9 5 11 9.500H44z" />
    <rect className="v-d" x="3" y="33" width="58" height="3" rx="1.500" />
    <circle className="v-d" cx="14" cy="32" r="3" /><circle className="v-d" cx="30" cy="32" r="3" /><circle className="v-d" cx="46" cy="32" r="3" />
  </> },
  boat: { box: "0 0 64 44", art: <>
    <path className="v-a" d="M30 6v21H12C16 18 24 9 30 6z" />
    <path className="v-b" d="M34 10v17h16C47 20 41 13 34 10z" />
    <rect className="v-d" x="30.800" y="4" width="2.400" height="26" />
    <path className="v-c" d="M6 29h52l-6 9c-.6 1-1.500 1.500-3 1.500H15c-1.500 0-2.400-.5-3-1.500z" />
  </> },
  bike: { box: "0 0 64 44", art: <>
    <circle className="v-line" cx="14" cy="30" r="10" /><circle className="v-line" cx="50" cy="30" r="10" />
    <path className="v-line v-line-a" d="M14 30 25 16h16l9 14M25 16l9 14H14M41 16l-7 14" />
    <path className="v-line" d="M21 11h8M25 11v5M39 9l2 7M39 9h7" />
  </> },
  shoe: { box: "0 0 64 44", art: <>
    <path className="v-a" d="M6 12c0-1 1-2 2-2h9c1 0 2 .5 2.500 1.500L24 17l7 3 10 2c7 1 14 3 17 7 1 1 1 2 1 3H6z" />
    <path className="v-b" d="M12 22c5 0 9 3 12 8H10z" />
    <path className="v-d" d="M5 32h55v3c0 2-1.500 3.500-3.500 3.500h-48C6.500 38.500 5 37 5 35z" />
    <path className="v-line v-line-e" d="m24 18-3 4M29 20l-3 4M34 21.500l-2 4" />
  </> },
  balloon: { box: "0 0 48 64", art: <>
    <path className="v-b" d="M24 2C12 2 3 11 3 22c0 8 8 15 14 22h14c6-7 14-14 14-22C45 11 36 2 24 2z" />
    <path className="v-a" d="M24 2c-6 0-10 9-10 20 0 8 3 15 6 22h8c3-7 6-14 6-22 0-11-4-20-10-20z" />
    <path className="v-c" d="M24 2c-2 0-4 9-4 20 0 8 1 15 2 22h4c1-7 2-14 2-22 0-11-2-20-4-20z" />
    <path className="v-line" d="m18 45 2 8M30 45l-2 8" />
    <rect className="v-d" x="19" y="53" width="10" height="9" rx="2" />
  </> },
};

export function Vehicle({ kind, className }: { kind: VehicleKind; className?: string }) {
  const { box, art } = ART[kind];
  return <svg className={className} data-k={kind} viewBox={box} aria-hidden>{art}</svg>;
}
