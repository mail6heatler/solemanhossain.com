export default function NotFound() {
  return (
    <div className="site" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow"><span className="tag">404</span> 🧭 Lost</div>
        <h1 className="stitle" style={{ margin: "0 auto" }}>This page wandered off.</h1>
        <p className="ssub" style={{ margin: "12px auto 26px" }}>Maybe it's on an adventure too.</p>
        <a className="btn-ink" href="/"><i className="ti ti-arrow-left" />Back home</a>
      </div>
    </div>
  );
}
