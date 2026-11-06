/**
 * Turns a PDF's first page into a picture, in the browser, when it's added in the dashboard. Visitors only ever get that picture,
 * so the PDF library is never in their downloads. It runs without a separate worker file: one page, once, while the owner waits for an upload anyway.
 */
export async function pdfFirstPage(src: File | string, width = 1100): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const g = globalThis as unknown as { pdfjsWorker?: unknown };
    // @ts-expect-error the package ships no types for this file
    g.pdfjsWorker ??= await import("pdfjs-dist/build/pdf.worker.min.mjs");
    const base = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/`; // fonts and character maps some PDFs refer to instead of embedding
    const task = pdfjs.getDocument({
      ...(typeof src === "string" ? { url: src } : { data: new Uint8Array(await src.arrayBuffer()) }),
      cMapUrl: `${base}cmaps/`, cMapPacked: true, standardFontDataUrl: `${base}standard_fonts/`, wasmUrl: `${base}wasm/`,
    });
    try {
      const doc = await task.promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      return await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/webp", 0.86));
    } finally {
      await task.destroy();
    }
  } catch {
    return null;
  }
}
