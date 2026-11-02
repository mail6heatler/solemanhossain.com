import ReactMarkdown from "react-markdown";

export default function Markdown({ children, className = "md" }: { children: string; className?: string }) {
  if (!children?.trim()) return null;
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) =>
            href?.startsWith("http")
              ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
              : <a href={href}>{children}</a>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function excerpt(md: string, n = 150) {
  const plain = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]+/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > n ? plain.slice(0, n).replace(/\s\S*$/, "") + "…" : plain;
}

/** "builder by *night.*" → highlights the starred part in mint. */
export function Accent({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2
          ? <span key={i} className="accent">{p.slice(1, -1)}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}
