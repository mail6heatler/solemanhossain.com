import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSettings, getSections, getSection, getItem } from "@/lib/data";
import { SiteShell } from "@/components/site/Chrome";
import Markdown, { excerpt } from "@/components/site/Markdown";
import { Mood, morphName } from "@/components/site/SectionBody";
import PollCard from "@/components/site/PollCard";
import Reactions from "@/components/site/Reactions";

type P = { params: Promise<{ slug: string; id: string }> };

async function load(slug: string, id: string) {
  const section = await getSection({ slug }, true);
  const item = /^\d+$/.test(id) ? await getItem(Number(id)) : null;
  if (!section || !item || !item.visible || item.section_id !== section.id) return null;
  return { section, item };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, id } = await params;
  const d = await load(slug, id);
  if (!d) return {};
  return {
    title: d.item.title,
    description: d.item.subtitle || excerpt(d.item.body, 160),
    openGraph: d.item.image_url ? { images: [d.item.image_url] } : undefined,
  };
}

export default async function EntryPage({ params }: P) {
  const { slug, id } = await params;
  const d = await load(slug, id);
  if (!d) notFound();
  const { section, item } = d;
  const [settings, sections] = await Promise.all([getSettings(), getSections({ visibleOnly: true })]);

  return (
    <SiteShell settings={settings} sections={sections} onHome={false}>
      <article className="entry">
        <a className="back" href={`/s/${section.slug}`}><i className="ti ti-arrow-left" />{section.title}</a>
        <div className="meta" style={{ marginTop: 26 }}>
          {section.code && <span className="chip dark">{section.code}</span>}
          {item.category && <span className="chip">{item.category}</span>}
          {item.status && <span className="chip line">{item.status}</span>}
          {item.date_label && <span>{item.date_label}</span>}
          {item.location && <span><i className="ti ti-map-pin" /> {item.location}</span>}
          <Mood mood={item.mood} />
        </div>
        <h1>{item.title}</h1>
        {item.subtitle && <p className="lead">{item.subtitle}</p>}
        {item.image_url && <img className="hero-img" src={item.image_url} alt="" style={morphName(settings.effects.morph, item.id)} />}
        {item.type === "poll" ? <div style={{ maxWidth: 520, marginTop: 20 }}><PollCard id={item.id} options={item.poll_options} confetti={settings.effects.confetti} /></div> : null}
        <Markdown>{item.body}</Markdown>
        {settings.effects.reactions && item.type !== "poll" && <Reactions id={item.id} />}
        {item.tags.length > 0 && <div className="tags" style={{ marginTop: 26 }}>{item.tags.map((t) => <span key={t}>{t}</span>)}</div>}
        {item.links.length > 0 && (
          <div className="btn-row">
            {item.links.map((l, i) => (
              <a key={i} href={l.url} className={i === 0 ? "btn-ink" : "btn-line"} {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {l.label}{l.url.startsWith("http") && <i className="ti ti-arrow-up-right" />}
              </a>
            ))}
          </div>
        )}
      </article>
    </SiteShell>
  );
}
