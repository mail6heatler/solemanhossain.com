import { getSettings } from "@/lib/data";
import { MOODS } from "@/lib/settings";
import Game404 from "@/components/site/Game404";

export default async function NotFound() {
  const s = await getSettings().catch(() => null);
  const mood = s ? MOODS[s.mood] : undefined;
  const style = (mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties;
  return (
    <div className="site" style={{ ...style, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", width: "min(560px, 100%)" }}>
        <div className="eyebrow"><span className="tag">404</span> 🧭 Lost</div>
        <h1 className="stitle" style={{ margin: "0 auto" }}>This page wandered off.</h1>
        <p className="ssub" style={{ margin: "12px auto 0" }}>Maybe it&apos;s on an adventure too.</p>
        {s?.effects.game404 && <Game404 />}
        <a className="btn-ink" href="/" style={{ marginTop: 24 }}><i className="ti ti-arrow-left" />Back home</a>
      </div>
    </div>
  );
}
