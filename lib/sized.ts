// Pictures on cards come in the size they're shown at, as WebP, instead of the full upload (often 100 to 250 KB).
// The browser picks one from srcSet by the card's width and the screen's sharpness; the original stays as `src`
// and is what the full-screen viewer and downloads use. GIFs (which may move) and anything not uploaded here
// are left as they are. Widths must be ones Next allows (images.deviceSizes / imageSizes).
const OURS = /^(https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/|\/media\/[0-9a-f]+$)/i;
const WIDTHS = [384, 640, 828, 1200];

export function srcSetFor(url?: string | null) {
  if (!url || !OURS.test(url) || /\.(gif|svg)(\?|$)/i.test(url)) return undefined;
  return WIDTHS.map((w) => `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75 ${w}w`).join(", ");
}

/** How wide a card's picture is on screen: nearly the whole width on phones, a card's width elsewhere. */
export const CARD_SIZES = "(max-width: 560px) 92vw, (max-width: 900px) 46vw, 460px";
