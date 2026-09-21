import React, { useMemo } from 'react';
import katex from 'katex';

interface KaTeXRendererProps {
  math: string;
  block?: boolean;
  className?: string;
  onClick?: () => void;
}

// Global in-memory cache for rendered KaTeX HTML strings (0ms re-computation, 120fps smooth)
const katexHtmlCache = new Map<string, string>();

/**
 * Standard dictionary mapping Unicode Greek letters, math operators, arrows,
 * superscripts, and subscripts into LaTeX commands so KaTeX renders them perfectly
 * on every browser, platform, and operating system.
 */
export const UNICODE_TO_LATEX_MAP: Record<string, string> = {
  // Greek lowercase
  'α': '\\alpha ',
  'β': '\\beta ',
  'γ': '\\gamma ',
  'δ': '\\delta ',
  'ε': '\\epsilon ',
  'ϵ': '\\varepsilon ',
  'ζ': '\\zeta ',
  'η': '\\eta ',
  'θ': '\\theta ',
  'ϑ': '\\vartheta ',
  'ι': '\\iota ',
  'κ': '\\kappa ',
  'λ': '\\lambda ',
  'μ': '\\mu ',
  'ν': '\\nu ',
  'ξ': '\\xi ',
  'π': '\\pi ',
  'ϖ': '\\varpi ',
  'ρ': '\\rho ',
  'ϱ': '\\varrho ',
  'σ': '\\sigma ',
  'ς': '\\varsigma ',
  'τ': '\\tau ',
  'υ': '\\upsilon ',
  'φ': '\\phi ',
  'ϕ': '\\varphi ',
  'χ': '\\chi ',
  'ψ': '\\psi ',
  'ω': '\\omega ',

  // Greek uppercase
  'Γ': '\\Gamma ',
  'Δ': '\\Delta ',
  'Θ': '\\Theta ',
  'Λ': '\\Lambda ',
  'Ξ': '\\Xi ',
  'Π': '\\Pi ',
  'Σ': '\\Sigma ',
  'Υ': '\\Upsilon ',
  'Φ': '\\Phi ',
  'Ψ': '\\Psi ',
  'Ω': '\\Omega ',

  // Math Operators & Relations
  '±': '\\pm ',
  '∓': '\\mp ',
  '≤': '\\le ',
  '≥': '\\ge ',
  '≠': '\\ne ',
  '≈': '\\approx ',
  '≡': '\\equiv ',
  '∝': '\\propto ',
  '×': '\\times ',
  '÷': '\\div ',
  '·': '\\cdot ',
  '•': '\\cdot ',
  '∙': '\\cdot ',
  '°': '^\\circ ',
  '℃': '^\\circ\\text{C} ',
  '℉': '^\\circ\\text{F} ',
  'Å': '\\mathring{\\text{A}} ',
  'µ': '\\mu ',
  'Ω': '\\Omega ',
  '∞': '\\infty ',
  '√': '\\sqrt ',
  '∑': '\\sum ',
  '∏': '\\prod ',
  '∫': '\\int ',
  '∬': '\\iint ',
  '∭': '\\iiint ',
  '∮': '\\oint ',
  '∂': '\\partial ',
  '∇': '\\nabla ',
  '∈': '\\in ',
  '∉': '\\notin ',
  '⊂': '\\subset ',
  '⊆': '\\subseteq ',
  '⊃': '\\supset ',
  '⊇': '\\supseteq ',
  '∪': '\\cup ',
  '∩': '\\cap ',
  '∅': '\\emptyset ',
  '∀': '\\forall ',
  '∃': '\\exists ',
  '∴': '\\therefore ',
  '∵': '\\because ',
  '∠': '\\angle ',
  '⊥': '\\perp ',
  '∥': '\\parallel ',
  '∼': '\\sim ',
  '≅': '\\cong ',

  // Arrows
  '→': '\\to ',
  '⟶': '\\to ',
  '←': '\\leftarrow ',
  '⟵': '\\leftarrow ',
  '↔': '\\leftrightarrow ',
  '⟷': '\\leftrightarrow ',
  '⇒': '\\Rightarrow ',
  '⟹': '\\Rightarrow ',
  '⇐': '\\Leftarrow ',
  '⟸': '\\Leftarrow ',
  '⇔': '\\Leftrightarrow ',
  '⟺': '\\Leftrightarrow ',
  '⇌': '\\rightleftharpoons ',
  '⇋': '\\rightleftharpoons ',
  '↑': '\\uparrow ',
  '↓': '\\downarrow ',

  // Superscripts
  '⁰': '^0',
  '¹': '^1',
  '²': '^2',
  '³': '^3',
  '⁴': '^4',
  '⁵': '^5',
  '⁶': '^6',
  '⁷': '^7',
  '⁸': '^8',
  '⁹': '^9',
  '⁺': '^+',
  '⁻': '^-',

  // Subscripts
  '₀': '_0',
  '₁': '_1',
  '₂': '_2',
  '₃': '_3',
  '₄': '_4',
  '₅': '_5',
  '₆': '_6',
  '₇': '_7',
  '₈': '_8',
  '₉': '_9',
  '₊': '_+',
  '₋': '_-'
};

const UNICODE_REGEX = new RegExp(
  Object.keys(UNICODE_TO_LATEX_MAP)
    .map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|'),
  'g'
);

export const KATEX_RENDER_OPTIONS: katex.KatexOptions = {
  throwOnError: false,
  strict: false,
  trust: true,
  output: 'htmlAndMathml',
  macros: {
    '\\degree': '^\\circ',
    '\\celsius': '^\\circ\\text{C}',
    '\\micro': '\\mu',
    '\\ohm': '\\Omega',
    '\\angstrom': '\\mathring{\\text{A}}',
    '\\AA': '\\mathring{\\text{A}}',
    '\\unit': '\\mathrm',
    '\\pu': '\\mathrm',
    '\\ce': '\\mathrm',
    '\\boldsymbol': '\\mathbf',
    '\\textsubscript': '_',
    '\\textsuperscript': '^',
    '\\le': '\\leq',
    '\\ge': '\\geq',
    '\\to': '\\rightarrow',
    '\\rarr': '\\rightarrow',
    '\\larr': '\\leftarrow',
    '\\lrarr': '\\leftrightarrow'
  }
};

/**
 * Robust LaTeX sanitizer before passing to KaTeX
 */
export function sanitizeLatexFormula(latex: string): string {
  if (!latex) return '';
  let s = String(latex).trim();

  // Strip accidental outer $ or $$ or \( \) or \[ \] or \\( \\) or \\[ \\]
  s = s.replace(/^\\+\[([\s\S]*?)\\+\]$/, '$1')
       .replace(/^\\+\(([\s\S]*?)\\+\)$/, '$1')
       .replace(/^\$\$([\s\S]*?)\$\$$/, '$1')
       .replace(/^\$([\s\S]*?)\$$/, '$1')
       .trim();

  // Decode any HTML entities
  s = s.replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'")
       .replace(/&#92;/g, '\\')
       .replace(/&bsol;/g, '\\')
       .replace(/&nbsp;/g, ' ')
       .replace(/&#160;/g, ' ');

  // Convert any embedded Unicode Greek/math characters to KaTeX commands
  s = s.replace(UNICODE_REGEX, match => UNICODE_TO_LATEX_MAP[match] || match);

  // Normalize excessive backslashes e.g. \\mathrm -> \mathrm, \\frac -> \frac, \\left -> \left
  s = s.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Fix \text{...} containing ^ or _ or - which KaTeX math-mode rejects inside \text
  s = s.replace(/\\text\{([^{}]*?)[\^]([+-]?\d+|\{[^{}]+\})\}/g, '\\text{$1}^{$2}');
  s = s.replace(/\\text\{([^{}]*?)_([a-zA-Z0-9]+|\{[^{}]+\})\}/g, '\\text{$1}_{$2}');
  s = s.replace(/\\text\{([a-zA-Z]+)-(\d+)\}/g, '\\text{$1}^{-$2}');

  // Fix nested \mathrm{\text{...}} or double wrappers
  s = s.replace(/\\mathrm\{([^{}]*?)\s*\\text\{([^{}]*)\}\s*\}/g, '\\mathrm{$1 $2}');

  // Auto-balance curly braces
  let openBraces = (s.match(/\{/g) || []).length;
  let closeBraces = (s.match(/\}/g) || []).length;
  while (openBraces > closeBraces) {
    s += '}';
    openBraces--;
  }
  while (closeBraces > openBraces && s.endsWith('}')) {
    s = s.slice(0, -1);
    closeBraces--;
  }

  return s;
}

const KaTeXRendererComponent: React.FC<KaTeXRendererProps> = ({
  math,
  block = false,
  className = '',
  onClick
}) => {
  const html = useMemo(() => {
    if (!math) return '';
    const cleanMath = sanitizeLatexFormula(math);
    if (!cleanMath) return '';

    const cacheKey = `${block ? 'B' : 'I'}:${cleanMath}`;
    const cached = katexHtmlCache.get(cacheKey);
    if (cached) return cached;

    try {
      const rendered = katex.renderToString(cleanMath, {
        ...KATEX_RENDER_OPTIONS,
        displayMode: block
      });

      // If KaTeX produced an error span (class katex-error), attempt a sanitized fallback
      if (rendered.includes('katex-error')) {
        const simplified = cleanMath
          .replace(/\\(mathrm|mathbf|mathit|text|textsubscript|textsuperscript)\{([^{}]*)\}/g, '$2')
          .replace(/\\,/g, ' ')
          .replace(/\\;/g, ' ')
          .replace(/\\quad/g, ' ')
          .replace(/\\/g, '');

        try {
          const secondTry = katex.renderToString(simplified, {
            ...KATEX_RENDER_OPTIONS,
            displayMode: block
          });
          if (!secondTry.includes('katex-error')) {
            katexHtmlCache.set(cacheKey, secondTry);
            return secondTry;
          }
        } catch {
          // fall through to formatted clean math span
        }

        // Clean formatted span fallback without red error codes
        const formattedFallback = `<span class="inline-math-fallback font-serif italic">${simplified
          .replace(/\^\{?([+-]?\d+)\}?/g, '<sup>$1</sup>')
          .replace(/_\{?([a-zA-Z0-9]+)\}?/g, '<sub>$1</sub>')}</span>`;
        katexHtmlCache.set(cacheKey, formattedFallback);
        return formattedFallback;
      }

      katexHtmlCache.set(cacheKey, rendered);
      return rendered;
    } catch {
      const simplified = cleanMath
        .replace(/\\(mathrm|mathbf|mathit|text)\{([^{}]*)\}/g, '$2')
        .replace(/\\,/g, ' ')
        .replace(/\\/g, '');
      const fallback = `<span class="inline-math-fallback font-serif italic">${simplified
        .replace(/\^\{?([+-]?\d+)\}?/g, '<sup>$1</sup>')
        .replace(/_\{?([a-zA-Z0-9]+)\}?/g, '<sub>$1</sub>')}</span>`;
      katexHtmlCache.set(cacheKey, fallback);
      return fallback;
    }
  }, [math, block]);

  if (block) {
    return (
      <div
        className={`katex-block my-2 text-center overflow-x-auto select-none ${onClick ? 'cursor-pointer hover:bg-sky-50/50 p-1 rounded transition-colors' : ''} ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={onClick}
      />
    );
  }

  return (
    <span
      className={`katex-inline inline-block mx-0.5 select-none ${onClick ? 'cursor-pointer hover:bg-sky-50/50 px-1 rounded transition-colors' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={onClick}
    />
  );
};

export const KaTeXRenderer = React.memo(KaTeXRendererComponent);
