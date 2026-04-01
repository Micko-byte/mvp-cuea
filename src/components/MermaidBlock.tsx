import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

const isDark = document.documentElement.classList.contains('dark');
mermaid.initialize({
  startOnLoad: false,
  theme: isDark ? 'dark' : 'neutral',
  securityLevel: 'loose',
  themeVariables: { fontFamily: 'inherit' },
});

export function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, code)
      .then(({ svg }) => { if (ref.current) ref.current.innerHTML = svg; })
      .catch(() => setError('Could not render diagram'));
  }, [code]);

  if (error) return <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto"><code>{code}</code></pre>;
  return <div ref={ref} className="my-3 overflow-x-auto" />;
}
