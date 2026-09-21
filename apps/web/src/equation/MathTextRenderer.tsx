import React from 'react';
import { KaTeXRenderer, sanitizeLatexFormula, UNICODE_TO_LATEX_MAP } from './KaTeXRenderer.js';

interface MathTextRendererProps {
  text?: string;
  className?: string;
  block?: boolean;
}

export function resolveImageUrl(src: string | undefined): string {
  if (!src) return '';
  let imgSrc = src.trim();
  imgSrc = imgSrc.replace(/&amp;/g, '&');

  // If already absolute URL, blob, or data URI, return as-is
  if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:') || imgSrc.startsWith('blob:')) {
    return imgSrc;
  }

  // Handle /assets/raw/... or assets/raw/...
  if (imgSrc.startsWith('/assets/raw/') || imgSrc.startsWith('assets/raw/')) {
    const clean = imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `/api${clean}`;
    }
    return clean;
  }

  // Handle /api/assets/raw/... or api/assets/raw/...
  if (imgSrc.startsWith('/api/assets/raw/') || imgSrc.startsWith('api/assets/raw/')) {
    const clean = imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`;
    return clean;
  }

  // Handle local server uploads (/uploads/... or uploads/...)
  if (imgSrc.startsWith('/uploads/') || imgSrc.startsWith('uploads/')) {
    const clean = imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `/api${clean}`;
    }
    return clean;
  }

  // Handle /api/uploads/... or api/uploads/...
  if (imgSrc.startsWith('/api/uploads/') || imgSrc.startsWith('api/uploads/')) {
    const clean = imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`;
    return clean;
  }

  // Handle /public/uploads/... or public/uploads/...
  if (imgSrc.startsWith('/public/uploads/') || imgSrc.startsWith('public/uploads/')) {
    const clean = imgSrc.replace(/^\/?public\/uploads\//, '/uploads/');
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `/api${clean}`;
    }
    return clean;
  }

  // Handle bare filenames like '1788169529942_veu3an.jpg'
  if (/\.(png|jpe?g|svg|webp|gif)$/i.test(imgSrc) && !imgSrc.includes('/')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `/api/uploads/${imgSrc}`;
    }
    return `/uploads/${imgSrc}`;
  }

  const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const bucketName = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_STORAGE_BUCKET) || 'question-assets';

  const isConfiguredSupabase = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('example.com');

  if (isConfiguredSupabase && (
    imgSrc.startsWith('biology/') ||
    imgSrc.startsWith('physics/') ||
    imgSrc.startsWith('chemistry/') ||
    imgSrc.startsWith('mathematics/') ||
    imgSrc.startsWith('general/') ||
    imgSrc.startsWith('questions/')
  )) {
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucketName}/${imgSrc}`;
  }

  if (isConfiguredSupabase && imgSrc.startsWith('storage/v1/object/public/')) {
    return `${supabaseUrl.replace(/\/$/, '')}/${imgSrc}`;
  }

  if (!imgSrc.startsWith('/')) {
    imgSrc = `/${imgSrc}`;
  }

  return imgSrc;
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';
  let str = String(text);

  // 1. Temporarily protect any explicit LaTeX blocks from being mangled
  const protectedMath: string[] = [];
  const protect = (m: string) => {
    const id = `\uE000MATHNUM${protectedMath.length}\uE001`;
    protectedMath.push(m);
    return ` ${id} `;
  };

  str = str.replace(/\$\$([\s\S]*?)\$\$/g, protect)
           .replace(/\\+\[([\s\S]*?)\\+\]/g, protect)
           .replace(/\\+begin\{([a-zA-Z*]+)\}([\s\S]*?)\\+end\{\1\}/g, protect)
           .replace(/\\+\(([\s\S]*?)\\+\)/g, protect)
           .replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, protect);

  // 2. Decode HTML entities so escaped tags (&lt;p&gt;&lt;/p&gt;, &lt;br&gt;, etc.) become standardized
  str = str
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#92;/gi, '\\')
    .replace(/&bsol;/gi, '\\')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ');

  // 3. Convert subscripts and superscripts to LaTeX before stripping tags so chemical formulas (e.g. HNO2) render properly
  str = str.replace(/<sub>\s*([^{}<>]*?)\s*<\/sub>/gi, '_{$1}');
  str = str.replace(/<sup>\s*([^{}<>]*?)\s*<\/sup>/gi, '^{$1}');

  // 4. Convert HTML line breaks and paragraph breaks into newline characters (\n)
  str = str
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*(?:p|div|li|tr|h[1-6])[^>]*>/gi, '\n');

  // 5. Strip remaining HTML formatting tags (except <img>)
  str = str.replace(/<\/?(span|strong|b|em|i|u|del|ul|ol|table|tbody|thead|td|th)[^>]*>/gi, (match) => {
    if (/img/i.test(match)) return match;
    return '';
  });

  // 6. Multi-statement separation when text is on a single line without newlines
  str = str.replace(
    /(?<=\S)\s+(Statement-[I|V|X\d]+:|Statement\s+\d+:|Statement\s+[I|V|X\d]+:|Assertion\s*(\([A-Z]\))?:|Reason\s*(\([A-Z]\))?:|List-[I|V|X\d]+:|List\s+[I|V|X\d]+:|Column-[I|V|X\d]+:|Column\s+[I|V|X\d]+:)/gi,
    '\n$1'
  );

  // 7. Clean up line spaces while preserving distinct \n newlines
  str = str
    .split(/\r?\n/)
    .map(line => line.replace(/[^\S\r\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  // 8. Restore protected LaTeX tokens
  str = str.replace(/\uE000MATHNUM(\d+)\uE001/g, (_, id) => {
    return protectedMath[parseInt(id, 10)] || '';
  });

  return str.trim();
}

/**
 * Strips question code identifiers like [Q-BIO-001], [Q-PHY-01-001], Q-BIO-001:, (Q-001), [Q101], etc.
 * while preserving multi-line statement formatting.
 */
export function stripQuestionCode(text: string | undefined): string {
  if (!text) return '';
  let str = cleanHtmlTags(text);
  str = str.replace(/^\s*\[?\s*Q\s*[-_]?[A-Za-z0-9_-]+\s*\]?\s*[:.-]?\s*/i, '');
  str = str.replace(/^\s*\[?\s*[A-Z]{2,6}-[A-Z0-9]{2,6}-[0-9]{1,6}\s*\]?\s*[:.-]?\s*/i, '');
  return str.trim();
}

export type MathToken =
  | { type: 'text'; content: string }
  | { type: 'math'; latex: string; block: boolean };

const UNICODE_MATH_REGEX = new RegExp(
  Object.keys(UNICODE_TO_LATEX_MAP)
    .map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|'),
  'g'
);

/**
 * Parses any text containing LaTeX, delimiters, un-delimited math, units, chemical formulas,
 * and Unicode math symbols into clean React nodes with 100% token isolation.
 */
export function parseAndTokenizeMath(text: string, defaultBlock = false): MathToken[] {
  if (!text) return [];
  let s = String(text);

  const mathBlocks: Array<{ latex: string; block: boolean }> = [];

  const addMath = (rawLatex: string, block: boolean) => {
    const id = `\uE000MATHNUM${mathBlocks.length}\uE001`;
    mathBlocks.push({
      latex: sanitizeLatexFormula(rawLatex),
      block: block || defaultBlock
    });
    return ` ${id} `;
  };

  // STAGE 1: Extract and protect explicit math blocks (supporting single and double escaped backslashes)
  // 1. $$ ... $$
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => addMath(math, true));
  
  // 2. \[ ... \] or \\[ ... \\]
  s = s.replace(/\\+\[([\s\S]*?)\\+\]/g, (_, math) => addMath(math, true));

  // 3. \begin{env} ... \end{env}
  s = s.replace(/\\+begin\{([a-zA-Z*]+)\}([\s\S]*?)\\+end\{\1\}/g, (full) => addMath(full, true));

  // 4. \( ... \) or \\( ... \\)
  s = s.replace(/\\+\(([\s\S]*?)\\+\)/g, (_, math) => addMath(math, false));

  // 5. $ ... $
  s = s.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, math) => addMath(math, false));

  // STAGE 2: Clean HTML tags & decode entities in the non-math portions
  s = s.replace(/&lt;/gi, '<')
       .replace(/&gt;/gi, '>')
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/gi, "'")
       .replace(/&#92;/gi, '\\')
       .replace(/&bsol;/gi, '\\')
       .replace(/&amp;/gi, '&')
       .replace(/&nbsp;/gi, ' ')
       .replace(/&#160;/gi, ' ');

  // Subscripts & Superscripts from HTML
  s = s.replace(/<sub>\s*([^{}<>]*?)\s*<\/sub>/gi, '_{$1}');
  s = s.replace(/<sup>\s*([^{}<>]*?)\s*<\/sup>/gi, '^{$1}');

  // Linebreaks
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n')
       .replace(/<\/\s*(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
       .replace(/<\s*(?:p|div|li|tr|h[1-6])[^>]*>/gi, '\n');

  // Strip remaining HTML tags (except <img>)
  s = s.replace(/<\/?(span|strong|b|em|i|u|del|ul|ol|table|tbody|thead|td|th)[^>]*>/gi, (match) => {
    if (/img/i.test(match)) return match;
    return '';
  });

  // Statement separator
  s = s.replace(
    /(?<=\S)\s+(Statement-[I|V|X\d]+:|Statement\s+\d+:|Statement\s+[I|V|X\d]+:|Assertion\s*(\([A-Z]\))?:|Reason\s*(\([A-Z]\))?:|List-[I|V|X\d]+:|List\s+[I|V|X\d]+:|Column-[I|V|X\d]+:|Column\s+[I|V|X\d]+:)/gi,
    '\n$1'
  );

  // STAGE 3: On the remaining text outside protected tokens, detect raw un-delimited math:
  
  // 3a. Degree expressions: 30^\circ, 30^\circ C, 30^\circ\text{C}, 100°C, 45^\circ
  s = s.replace(/(\d+(?:\.\d+)?\s*[\^]\s*(?:\\circ|\{?\\circ\}?)(?:\s*\\text\{[CF]\})?)/gi, (m) => {
    if (m.includes('\uE000')) return m;
    return addMath(m, false);
  });

  // Standalone ^\circ
  s = s.replace(/([\^]\s*(?:\\circ|\{?\\circ\}?)(?:\s*\\text\{[CF]\})?)/gi, (m) => {
    if (m.includes('\uE000')) return m;
    return addMath(m, false);
  });

  // 3b. Scientific notation: 6.67 x 10^-11, 2.5 \times 10^5, 10^{-5}
  s = s.replace(/\b(\d+(?:\.\d+)?\s*(?:x|×|\*|\\times)\s*10\s*[\^]\s*(?:\{[+-]?\d+\}|[+-]?\d+))\b/gi, (m) => {
    if (m.includes('\uE000')) return m;
    const latex = m.replace(/\s*(?:x|×|\*)\s*/gi, ' \\times ').replace(/10\^([+-]?\d+)/g, '10^{$1}');
    return addMath(latex, false);
  });

  s = s.replace(/\b(10\s*[\^]\s*(?:\{[+-]?\d+\}|[+-]?\d+))\b/gi, (m) => {
    if (m.includes('\uE000')) return m;
    const latex = m.replace(/10\^([+-]?\d+)/g, '10^{$1}');
    return addMath(latex, false);
  });

  // 3c. Dimensional formulas [M L^2 T^-2]
  s = s.replace(/(\[[MmLlTtAaKk\d\s\^\-\+\{\}]+\])/g, (m) => {
    if (m.includes('\uE000')) return m;
    return addMath(m, false);
  });

  // 3d. Chemical formulas e.g. CaCO_3, H_2O, CO_2, H_2SO_4, KMnO_4, HNO_2, HNO_3
  s = s.replace(/\b(CaCO_3|H_2O|CO_2|O_2|N_2|H_2SO_4|KMnO_4|FeSO_4|NaCl|C_6H_12O_6|NO_2|SO_2|NH_3|HCl|HNO_3|HNO_2|NaOH|KOH)\b/g, (m) => {
    if (m.includes('\uE000')) return m;
    return addMath(`\\mathrm{${m}}`, false);
  });

  // 3e. Variables and parenthesized expressions with exponents or subscripts: x^2, y_1, (a+b)^2, HNO_{2}
  s = s.replace(/(\([a-zA-Z0-9\+\-\s\.]+\)\s*[\^\_]\s*(?:\{[^{}]+\}|[a-zA-Z0-9\+\-]+))/g, (m) => {
    if (m.includes('\uE000')) return m;
    return addMath(m, false);
  });

  // 3f. Complete LaTeX commands starting with \ or \\ (e.g. \frac{a}{b}, \sqrt{x}, \alpha, \pm, \int_0^1, \vec{v})
  const latexCommandRegex = /\\+([a-zA-Z]+|[,;:! %])(?:\s*\[[^\]]*\])?(?:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*(?:\s*[_^]\s*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[a-zA-Z0-9+-]+))*/g;
  s = s.replace(latexCommandRegex, (match) => {
    const trimmed = match.trim();
    if (!trimmed || trimmed === '\\' || trimmed === '\\\\' || trimmed.includes('\uE000')) return match;
    return addMath(trimmed, false);
  });

  s = s.replace(/\b([a-zA-Z]+\s*[\^\_]\s*(?:\{[^{}]+\}|[a-zA-Z0-9\+\-]+))\b/g, (m) => {
    if (m.includes('\uE000')) return m;
    return addMath(m, false);
  });

  // 3g. Units with shorthand exponents: 10ms-2, 10 ms^-2, ms^-2, m/s^2, kg m^-3, N m^-2
  s = s.replace(/\b(\d+(?:\.\d+)?\s*(?:m|cm|mm|km|kg|g|s|N|dyne|dyn|J|W|V|A|Hz|rad|Pa)\s*(?:s|m|cm|g|kg)?\s*[\^]?\s*[-]?\d+)\b/gi, (m) => {
    if (m.includes('\uE000')) return m;
    let formatted = m.trim();
    formatted = formatted.replace(/^(\d+(?:\.\d+)?)\s*/, '$1\\text{ ');
    formatted = formatted.replace(/([a-zA-Z]+)\s*[\^]?\s*([+-]?\d+)/g, '$1}^{$2');
    if (formatted.includes('\\text{')) {
      formatted = formatted.replace(/\}\^\{([+-]?\d+)\}/g, '}^{$1}') + '}';
    }
    return addMath(formatted, false);
  });

  s = s.replace(/\b((?:[Nn]|dyne|dyn|[Gg]|kg|[Cc]m|[Mm]|s)\s*(?:s|m|cm)?\s*[\^]?\s*[-]?\d+)\b/g, (m) => {
    if (m.includes('\uE000') || /^\d+$/.test(m)) return m;
    let formatted = m.replace(/([a-zA-Z]+)\s*[\^]?\s*([+-]?\d+)/g, '\\text{$1}^{$2}');
    return addMath(formatted, false);
  });

  // 3h. Unicode Greek letters & math symbols in plain text -> render as crisp KaTeX math
  s = s.replace(UNICODE_MATH_REGEX, (m) => {
    if (m.includes('\uE000')) return m;
    const latexVal = UNICODE_TO_LATEX_MAP[m];
    if (latexVal) {
      return addMath(latexVal, false);
    }
    return m;
  });

  // STAGE 4: Tokenize into clean array of text and math, preserving necessary spacing
  const tokens: MathToken[] = [];
  const parts = s.split(/(\uE000MATHNUM\d+\uE001)/g);

  for (const part of parts) {
    if (!part) continue;
    const match = part.match(/^\uE000MATHNUM(\d+)\uE001$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const mb = mathBlocks[idx];
      if (mb && mb.latex) {
        tokens.push({ type: 'math', latex: mb.latex, block: mb.block });
      }
    } else {
      let cleanPart = part
        .replace(/<\/?p>/gi, '')
        .replace(/&lt;\/?p&gt;/gi, '')
        .replace(/<p\s*\/?>/gi, '')
        .replace(/<\/p>/gi, '')
        .replace(/&lt;p&gt;&lt;\/p&gt;/gi, '')
        .replace(/[^\S\r\n]+/g, ' ');

      if (cleanPart && cleanPart !== ' ') {
        tokens.push({ type: 'text', content: cleanPart });
      }
    }
  }

  return tokens;
}

export function groupTokensIntoLines(tokens: MathToken[]): MathToken[][] {
  const lines: MathToken[][] = [[]];
  for (const token of tokens) {
    if (token.type === 'math') {
      lines[lines.length - 1].push(token);
    } else {
      const textParts = token.content.split(/\r?\n/);
      for (let i = 0; i < textParts.length; i++) {
        if (i > 0) {
          lines.push([]);
        }
        const part = textParts[i];
        if (part && part.trim()) {
          lines[lines.length - 1].push({ type: 'text', content: part });
        }
      }
    }
  }
  return lines.filter(line => line.length > 0);
}

/**
 * Backward compatibility helper for wrapping raw text into $...$
 */
export function autoDetectAndWrapLatex(str: string): string {
  if (!str) return '';
  const tokens = parseAndTokenizeMath(str);
  return tokens.map(t => {
    if (t.type === 'math') {
      return t.block ? `$$${t.latex}$$` : `$${t.latex}$`;
    }
    return t.content;
  }).join('');
}

function RenderSingleMathTextChunk({ text, block, className }: { text: string; block?: boolean; className?: string }) {
  if (!text) return null;
  const tokens = parseAndTokenizeMath(text, block);
  if (tokens.length === 0) return null;

  const lines = groupTokensIntoLines(tokens);
  if (lines.length > 1) {
    return (
      <div className={`space-y-1.5 ${className || ''}`}>
        {lines.map((lineTokens, lIdx) => (
          <div key={`line-${lIdx}`} className="leading-relaxed">
            {lineTokens.map((token, tIdx) => {
              if (token.type === 'math') {
                return (
                  <KaTeXRenderer
                    key={`m-${lIdx}-${tIdx}`}
                    math={token.latex}
                    block={token.block || block}
                  />
                );
              }
              return <span key={`t-${lIdx}-${tIdx}`}>{token.content}</span>;
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'math') {
          return (
            <KaTeXRenderer
              key={`math-${idx}`}
              math={token.latex}
              block={token.block || block}
            />
          );
        }
        return <span key={`txt-${idx}`}>{token.content}</span>;
      })}
    </span>
  );
}

const MathTextRendererComponent: React.FC<MathTextRendererProps> = ({
  text = '',
  className = '',
  block = false
}) => {
  if (!text) return null;

  // Support JSON-stringified block arrays e.g. [{"type":"equation","latex":"..."}]
  if (typeof text === 'string' && (text.startsWith('[') || text.startsWith('{'))) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return (
          <span className={className}>
            {parsed.map((item: any, idx: number) => {
              if (item.type === 'equation' || item.latex) {
                return <KaTeXRenderer key={idx} math={item.latex || item.rawLatex || ''} block={item.displayMode === 'block'} />;
              }
              if (item.type === 'image' || item.imageUrl || item.url || item.src) {
                const imgSrc = item.imageUrl || item.url || item.src;
                return (
                  <img
                    key={`img-item-${idx}`}
                    src={resolveImageUrl(imgSrc)}
                    alt={item.alt || 'Question Image'}
                    className="my-2 max-w-full h-auto object-contain border border-slate-200 p-1 bg-white rounded-md block shadow-2xs"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = 'true';
                        const current = target.src;
                        if (current.includes('/uploads/') && !current.includes('/api/uploads/')) {
                          target.src = current.replace('/uploads/', '/api/uploads/');
                        }
                      }
                    }}
                  />
                );
              }
              if (item.type === 'diagram' && (item.diagramSvg || item.svg)) {
                return (
                  <div
                    key={`diag-${idx}`}
                    className="my-2 p-2 bg-white border border-slate-200 rounded flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: item.diagramSvg || item.svg }}
                  />
                );
              }
              if (item.html || item.text) {
                return <MathTextRenderer key={idx} text={item.html || item.text} />;
              }
              return null;
            })}
          </span>
        );
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.type === 'equation' || parsed.latex) {
          return <KaTeXRenderer math={parsed.latex || parsed.rawLatex || ''} block={parsed.displayMode === 'block'} className={className} />;
        }
        if (parsed.type === 'image' || parsed.imageUrl || parsed.url || parsed.src) {
          const imgSrc = parsed.imageUrl || parsed.url || parsed.src;
          return (
            <img
              src={resolveImageUrl(imgSrc)}
              alt={parsed.alt || 'Question Image'}
              className={`my-2 max-w-full h-auto object-contain border border-slate-200 p-1 bg-white rounded-md block shadow-2xs ${className}`}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.triedFallback) {
                  target.dataset.triedFallback = 'true';
                  const current = target.src;
                  if (current.includes('/uploads/') && !current.includes('/api/uploads/')) {
                    target.src = current.replace('/uploads/', '/api/uploads/');
                  }
                }
              }}
            />
          );
        }
      }
    } catch {
      // Not valid JSON, proceed to standard text parsing
    }
  }

  const rawTextStr = typeof text === 'string' ? text : String(text);

  // If contains HTML <img> tags, parse them into uncropped JSX <img> elements
  if (/<img\s+/i.test(rawTextStr)) {
    const imgTagRegex = /(<img\s+[^>]*>)/gi;
    const parts = rawTextStr.split(imgTagRegex);

    return (
      <span className={className}>
        {parts.map((part, idx) => {
          if (!part) return null;

          if (/^<img\s+/i.test(part.trim())) {
            const srcMatch = part.match(/src=["']([^"']+)["']/i) || part.match(/src=([^\s>]+)/i);
            const widthMatch = part.match(/width=["']([^"']+)["']/i);
            const altMatch = part.match(/alt=["']([^"']+)["']/i);
            const imgSrc = srcMatch ? srcMatch[1] : '';

            if (!imgSrc) return null;

            const resolvedSrc = resolveImageUrl(imgSrc);
            const customWidth = widthMatch ? widthMatch[1] : undefined;

            return (
              <img
                key={`img-${idx}`}
                src={resolvedSrc}
                alt={altMatch ? altMatch[1] : 'Question Image'}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    const current = target.src;
                    if (current.includes('/uploads/') && !current.includes('/api/uploads/')) {
                      target.src = current.replace('/uploads/', '/api/uploads/');
                    }
                  }
                }}
                style={{
                  width: customWidth || undefined,
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: 'none',
                  objectFit: 'contain'
                }}
                className="my-2 max-w-full h-auto object-contain border border-slate-300 p-1 bg-white rounded-md block shadow-2xs"
              />
            );
          }

          const cleanedChunk = cleanHtmlTags(part);
          if (!cleanedChunk) return null;

          return <RenderSingleMathTextChunk key={`chunk-${idx}`} text={cleanedChunk} block={block} className={className} />;
        })}
      </span>
    );
  }

  const cleanedStr = cleanHtmlTags(rawTextStr);
  if (!cleanedStr) return null;

  return <RenderSingleMathTextChunk text={cleanedStr} block={block} className={className} />;
};

export const MathTextRenderer = React.memo(MathTextRendererComponent);
