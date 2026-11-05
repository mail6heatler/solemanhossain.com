import { getSettings } from "@/lib/data";
import { saveThemePics } from "@/app/actions";
import { UploadField } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";
import { FAN_THEME_KEYS, SKIN_LABELS } from "@/lib/settings";
import { THEME_CREDITS } from "@/lib/themeCredits";

export default async function ThemePicturesPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  return (
    <form action={saveThemePics} className="adm-page">
      <h1 className="adm-h">Theme pictures</h1>
      <p className="adm-sub">Add your own picture to any fan theme. It fills the background of the first screen and fades behind your words. Leave a theme empty to keep its built-in art.</p>
      <div className="c" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        <i className="ti ti-info-circle" style={{ color: "var(--icon)" }} /> Your site is public, and most photos and character art belong to someone else, who could ask you to take them down. Pictures you took yourself, or ones with a free licence, are the safest choice. You can upload a file or paste a link; an uploaded file loads faster and can&apos;t disappear.
      </div>
      <div className="fx-grid" style={{ marginTop: 14 }}>
        {FAN_THEME_KEYS.map((k) => (
          <div key={k} className="c" style={{ marginBottom: 0 }}>
            <div className="c-row" style={{ marginBottom: 10 }}>
              <div className="grow c-title">{SKIN_LABELS[k]}</div>
              <a href={`/?theme=${k}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />Preview</a>
            </div>
            <UploadField name={`pic_${k}`} initial={s.themePics[k] ?? ""} shape="wide" useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} />
            <div className="hint" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
              {THEME_CREDITS[k] ? `Built-in: ${THEME_CREDITS[k].title}` : "Built-in: drawn art"}
            </div>
          </div>
        ))}
      </div>
      <div className="save-bar">
        <button className="b-mint"><i className="ti ti-device-floppy" />Save pictures</button>
        <a href="/" target="_blank" className="b-out"><i className="ti ti-eye" />View site</a>
      </div>
    </form>
  );
}
