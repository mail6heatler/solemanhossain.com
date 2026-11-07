/**
 * What the owner enters in the dashboard for one entry of a Boarding passes section: what its pass says, and its note's tick lines.
 * An empty field means "work it out", in `passView` (components/site/TripFrame.tsx).
 */
export const TRIP_VEHICLES = [
  ["plane", "Plane", "Boarding pass"],
  ["car", "Car", "Road trip pass"],
  ["bus", "Bus", "Bus ticket"],
  ["train", "Train", "Train ticket"],
  ["boat", "Boat", "Boarding pass"],
  ["bike", "Bike", "Ride pass"],
  ["shoe", "On foot", "Trail pass"],
  ["balloon", "Balloon", "Boarding pass"],
] as const;
export type VehicleKind = (typeof TRIP_VEHICLES)[number][0];

export type TickLine = { text: string; done: boolean };

export type TripPass = {
  from: string; fromCode: string; to: string; toCode: string;
  report: string; depart: string; journey: string;
  seat: string; flight: string; passenger: string;
  /** the name on the pass, such as Train ticket */
  name: string;
  vehicle: VehicleKind | "";
  ticks: TickLine[];
};

export const MAX_TICKS = 20;

export const EMPTY_PASS: TripPass = { from: "", fromCode: "", to: "", toCode: "", report: "", depart: "", journey: "", seat: "", flight: "", passenger: "", name: "", vehicle: "", ticks: [] };

export function cleanPass(raw: unknown): TripPass {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  const text = (k: string, max = 60) => String(o[k] ?? "").trim().slice(0, max);
  const code = (k: string) => text(k, 4).toUpperCase();
  const ticks = Array.isArray(o.ticks) ? o.ticks : [];
  return {
    from: text("from"), fromCode: code("fromCode"), to: text("to"), toCode: code("toCode"),
    report: text("report", 30), depart: text("depart", 30), journey: text("journey", 30),
    seat: text("seat", 12), flight: text("flight", 16), passenger: text("passenger"), name: text("name", 30),
    vehicle: TRIP_VEHICLES.some(([v]) => v === o.vehicle) ? (o.vehicle as VehicleKind) : "",
    ticks: ticks.slice(0, MAX_TICKS)
      .map((t) => ({ text: String((t as TickLine)?.text ?? "").trim().slice(0, 120), done: !!(t as TickLine)?.done }))
      .filter((t) => t.text),
  };
}
