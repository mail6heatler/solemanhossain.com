import type { SiteSettings } from "@/lib/settings";
import { connectView, linkView, type ConnectPiece } from "@/lib/connectLook";
import ChatWall, { type ChatNote } from "./ChatWall";
import { partFn } from "./cardParts";

/** What the chat window needs from the site's settings. */
export type ChatSettings = Pick<SiteSettings, "nickname" | "fullName" | "avatarUrl" | "initials" | "connectFormTitle" | "socials" | "connect" | "effects">;

/**
 * The Connect section as one messenger window (layout `chat`, G8). On the left the chat's face, name and availability, then the links as contacts,
 * each with its logo (found from its address, or uploaded) and its own line; under them the pinned testimonials (`pins`, drawn by whoever calls,
 * because on the site they're full cards) or a note on how the wall works. On the right the chat itself (ChatWall). Everything it says and how it
 * looks comes from settings.connect (lib/connectLook.ts), set in the dashboard's live editor, which draws this with `edit`: every piece is named
 * (`data-part`) for its labels and nothing moves or sends.
 */
export default function ChatWindow({ s, notes, pins, edit = false, motion }: {
  s: ChatSettings; notes: ChatNote[]; pins?: React.ReactNode; edit?: boolean;
  /** the movement switch; the editor passes its own draft */ motion?: boolean;
}) {
  const c = s.connect;
  const v = connectView(c, s);
  const p = partFn(edit, c.parts);
  const on = (k: ConnectPiece) => !c.hide[k];
  const live = motion ?? s.effects.chatfx;
  const links = on("links") ? s.socials : [];
  const showPins = on("pins");
  const wall = c.wallpaper === "photo" && c.wallPic ? ({ "--cw-pic": `url("${c.wallPic}")` } as React.CSSProperties) : undefined;
  const cls = ["cw", edit ? "" : "reveal r3", `cw-wp-${c.wallpaper === "photo" && !c.wallPic ? "dots" : c.wallpaper}`, `cw-b-${c.bubbles}`, `cw-mine-${c.mine}`, `cw-theirs-${c.theirs}`,
    c.brandColors ? "cw-brand" : "", showPins ? "" : "no-pins", live ? "cw-live" : "", edit ? "cw-edit" : ""].filter(Boolean).join(" ");

  return (
    <div className={cls} style={wall}>
      <div className="cw-side" data-lenis-prevent>
        {on("face") && (
          <i className="cw-face" {...p("cw-face")}>
            <span className="cw-halo" aria-hidden />
            <span className="cw-pic">{v.face ? <img src={v.face} alt="" loading="lazy" /> : v.initials}</span>
            {on("avail") && <span className={`cw-badge av-${c.avail}`} aria-hidden />}
          </i>
        )}
        <div className="cw-me" {...p("cw-me")}>
          <b>{v.owner}</b>
          {on("sub") && v.sub && <small>{v.sub}</small>}
          {on("avail") && <span className={`cw-online av-${c.avail}`}><i className="cw-dot" aria-hidden />{v.availText}</span>}
          {on("reply") && c.replyTime && <span className="cw-reply">⏱ {c.replyTime}</span>}
        </div>
        {links.length > 0 && (
          <div className="cw-links" {...p("cw-links")}>
            {c.linksTitle && <h3 className="cw-h">{c.linksTitle}</h3>}
            {links.map((l, i) => {
              const lv = linkView(l);
              const style = { "--i": i, ...(lv.color ? { "--brand": lv.color, "--ink": lv.ink } : {}) } as React.CSSProperties;
              const go = edit ? {} : { href: l.url, ...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {}) };
              return (
                <a key={i} className={`cw-link${lv.color ? " has-brand" : ""}`} style={style} {...go}>
                  <i className={`cw-logo${lv.logo ? " pic" : ""}`} aria-hidden>{lv.logo ? <img src={lv.logo} alt="" loading="lazy" /> : <i className={`ti ti-${lv.icon}`} />}</i>
                  <span><b>{l.label}</b><small>{lv.note}</small></span>
                  <i className="ti ti-arrow-up-right cw-go" aria-hidden />
                </a>
              );
            })}
          </div>
        )}
      </div>
      {showPins && (
        <div className="cw-pins" data-lenis-prevent>
          <div className="cw-pins-in" {...p("cw-pins")}>
            {pins || (
              <div className="cw-note">
                <b>📌 The wall</b>
                {c.wallNote}
              </div>
            )}
          </div>
        </div>
      )}
      <ChatWall c={c} title={v.title} owner={v.owner} avatar={v.face} initials={v.initials} greet={v.greet} emojis={v.emojis} notes={notes}
        plane={s.effects.plane} live={live} edit={edit} />
    </div>
  );
}
