import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSettings, getSections, getSection, getItems, getMessages } from "@/lib/data";
import { SiteShell } from "@/components/site/Chrome";
import SectionBody from "@/components/site/SectionBody";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await getSection({ slug: (await params).slug }, true);
  return s ? { title: s.title, description: s.subtitle } : {};
}

export default async function SectionPage({ params, searchParams }: P) {
  const { slug } = await params;
  const { c } = await searchParams;
  const section = await getSection({ slug }, true);
  if (!section) notFound();
  const [settings, sections, all] = await Promise.all([getSettings(), getSections({ visibleOnly: true }), getItems(section.id, { visibleOnly: true })]);
  const cats = Array.from(new Set(all.map((i) => i.category).filter(Boolean)));
  const items = c ? all.filter((i) => i.category === c) : all;
  const wall = section.layout === "connect" ? await getMessages("public") : undefined;

  return (
    <SiteShell settings={settings} sections={sections} onHome={false}>
      <section className="chap" style={{ minHeight: "80vh", justifyContent: "flex-start" }}>
        <div className="chap-inner">
          <a className="back" href={`/#${section.slug}`}><i className="ti ti-arrow-left" />Back home</a>
          <div className="eyebrow" style={{ marginTop: 26 }}>
            {section.code && <span className="tag">{section.code}</span>}
            {section.eyebrow_emoji && <span className="emo">{section.eyebrow_emoji}</span>} {section.eyebrow}
          </div>
          <h1 className="stitle">{section.title}</h1>
          {section.subtitle && <p className="ssub">{section.subtitle}</p>}
          {cats.length > 1 && (
            <div className="filters">
              <a href={`/s/${section.slug}`} className={!c ? "on" : ""}>All · {all.length}</a>
              {cats.map((k) => (
                <a key={k} href={`/s/${section.slug}?c=${encodeURIComponent(k)}`} className={c === k ? "on" : ""}>
                  {k} · {all.filter((i) => i.category === k).length}
                </a>
              ))}
            </div>
          )}
          <SectionBody section={section} items={items} settings={settings} wall={wall} />
        </div>
      </section>
    </SiteShell>
  );
}
