import { notFound, redirect } from "next/navigation";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Settings → Tools → Short links: yoursite/<slug> opens the address it was given; anything else is the usual "not found" */
export default async function ShortLink({ params }: { params: Promise<{ short: string }> }) {
  const { short } = await params;
  const slug = decodeURIComponent(short).toLowerCase();
  const link = (await getSettings()).ops.links.find((l) => l.slug === slug);
  if (!link) notFound();
  redirect(link.url);
}
