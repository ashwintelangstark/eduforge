import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Question } from '@eduforge/shared';
import { MathTextRenderer, resolveImageUrl } from '../equation/MathTextRenderer.js';

interface StudentPreviewDrawerProps {
  isOpen: boolean;
  question?: Question | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalQuestions?: number;
}

export const StudentPreviewDrawer: React.FC<StudentPreviewDrawerProps> = ({
  isOpen,
  question,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalQuestions
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose]);

  if (!isOpen) return null;

  const contentArr = Array.isArray(question?.content) ? (question?.content as any[]) : [];
  const defaultQuestionText =
    question?.rawText ||
    contentArr
      .filter((b: any) => b.type === 'text' || b.text || b.html)
      .map((b: any) => b.text || b.html || '')
      .filter(Boolean)
      .join(' ') ||
    '';
  const defaultCode = question?.id ? `BIO-CELL-${question.id.slice(-4)}` : 'BIO-CELL-0016';
  const defaultOptions = question?.options || [];

  const diagSvg =
    question?.diagramSvg ||
    (question as any)?.diagram_svg ||
    contentArr.find((b: any) => b.type === 'diagram' || b.diagramSvg || b.svg)?.diagramSvg ||
    contentArr.find((b: any) => b.type === 'diagram' || b.diagramSvg || b.svg)?.svg;

  // Helper to check if an image is already embedded inline in the text HTML
  const isAlreadyInText = (url: string | undefined, targetText: string = defaultQuestionText) => {
    if (!url) return true;
    const cleanUrl = url.trim();
    if (!cleanUrl) return true;

    // If target text does not contain an <img> tag, it is NOT rendered inline
    if (!/<img\s+[^>]*>/i.test(targetText)) {
      return false;
    }

    // 1. Direct string or encoded URL match
    if (targetText.includes(cleanUrl) || targetText.includes(encodeURI(cleanUrl))) {
      return true;
    }

    // 2. Relative path match (e.g. physics/abc.png vs full Supabase URL)
    const relativePath = cleanUrl.replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/[^\/]+\//, '');
    if (relativePath && relativePath !== cleanUrl && targetText.includes(relativePath)) {
      return true;
    }

    // 3. Filename match (e.g. abc.png)
    const fileName = cleanUrl.split('/').pop()?.split('?')[0];
    if (fileName && fileName.length > 5 && targetText.includes(fileName)) {
      return true;
    }

    return false;
  };

  // Collect all attached image URLs that are NOT already embedded inside the text statement HTML
  const allImgUrls: string[] = [];
  if (question?.imageUrl && !isAlreadyInText(question.imageUrl)) {
    allImgUrls.push(question.imageUrl);
  }
  if (
    (question as any)?.diagramUrl &&
    !allImgUrls.includes((question as any).diagramUrl) &&
    !isAlreadyInText((question as any).diagramUrl)
  ) {
    allImgUrls.push((question as any).diagramUrl);
  }
  if (Array.isArray((question as any)?.imageUrls)) {
    (question as any).imageUrls.forEach((u: string) => {
      if (u && !allImgUrls.includes(u) && !isAlreadyInText(u)) allImgUrls.push(u);
    });
  }
  contentArr.forEach((b: any) => {
    if (b.type === 'image') {
      const u = b.url || b.imageUrl || b.src;
      if (u && !allImgUrls.includes(u) && !isAlreadyInText(u)) allImgUrls.push(u);
    }
  });

  const showNavigation = Boolean(onPrevious || onNext || currentIndex !== undefined);
  const canPrev = hasPrevious !== undefined ? hasPrevious : Boolean(onPrevious);
  const canNext = hasNext !== undefined ? hasNext : Boolean(onNext);

  return (
    <>
      {/* Background Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 animate-in fade-in duration-150"
      />

      {/* Right Slide-over Panel */}
      <aside className="fixed right-0 top-0 w-full sm:w-[560px] h-full bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 font-sans">
        {/* Drawer Header */}
        <div className="h-16 px-5 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 shrink-0">Student Preview</h3>
          </div>

          {/* Top Navigation Controls */}
          {showNavigation && (
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!canPrev}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-2xs disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                title="Previous Question (Left Arrow)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {currentIndex !== undefined && totalQuestions !== undefined && (
                <span className="text-[11px] font-extrabold font-mono text-slate-600 px-2.5 border-x border-slate-200/90 select-none">
                  {currentIndex + 1} / {totalQuestions}
                </span>
              )}

              <button
                type="button"
                onClick={onNext}
                disabled={!canNext}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-2xs disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                title="Next Question (Right Arrow)"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Content View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md font-mono tracking-wider">
              {(question as any)?.questionCode || (question as any)?.question_code || defaultCode}
            </span>
            {question?.subject && (
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                {question.subject} {question?.chapter ? `• ${question.chapter}` : ''}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900">Question Statement</h3>

          <div className="text-base leading-relaxed text-slate-900 font-medium">
            <MathTextRenderer text={defaultQuestionText} />
          </div>

          {/* SVG Diagram Rendering */}
          {diagSvg && (
            <div className="my-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-2xs">
              <div className="max-h-60 w-full flex items-center justify-center scale-95" dangerouslySetInnerHTML={{ __html: diagSvg }} />
            </div>
          )}

          {/* Attached Images */}
          {allImgUrls.length > 0 && (
            <div className="space-y-3 my-3">
              {allImgUrls.map((imgSrc, imgIdx) => {
                const resolved = resolveImageUrl(imgSrc);
                return (
                  <div key={`preview-img-${imgIdx}`} className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-2xs">
                    <img
                      src={resolved}
                      alt={`Question illustration ${imgIdx + 1}`}
                      className="max-h-64 max-w-full object-contain rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = 'true';
                          const cur = target.src;
                          if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                            target.src = cur.replace('/uploads/', '/api/uploads/');
                          }
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Answer Options</h4>
            {defaultOptions.length > 0 ? (
              defaultOptions.map((opt, idx) => {
                const isCorrect = opt.isCorrect || (question?.correctAnswer && (opt.key || String.fromCharCode(65 + idx)).toLowerCase() === String(question.correctAnswer).toLowerCase());
                const optRaw = (opt as any).rawText || (typeof (opt as any).content === 'string' ? (opt as any).content : (Array.isArray((opt as any).content) ? (opt as any).content.map((c: any) => c.latex ? `\\(${c.latex}\\)` : (c.html || c.text || '')).join(' ') : ''));
                const rawOptImg = opt.imageUrl || (opt as any).image_url;
                const optImg = rawOptImg && !isAlreadyInText(rawOptImg, optRaw) ? rawOptImg : null;

                return (
                  <div
                    key={opt.key || idx}
                    className={`p-3.5 border rounded-xl transition-colors flex items-start gap-3 text-sm font-medium ${
                      isCorrect ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <span className={`font-black text-xs ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                        ({opt.key?.toUpperCase() || String.fromCharCode(65 + idx)})
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="leading-snug">
                        <MathTextRenderer text={optRaw} />
                      </div>

                      {optImg && (
                        <div className="mt-1.5 p-1 bg-white border border-slate-200 rounded-lg max-w-xs shadow-2xs">
                          <img
                            src={resolveImageUrl(optImg)}
                            alt={`Option ${opt.key || idx}`}
                            className="max-h-36 max-w-full object-contain rounded"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.triedFallback) {
                                target.dataset.triedFallback = 'true';
                                const cur = target.src;
                                if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                                  target.src = cur.replace('/uploads/', '/api/uploads/');
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {isCorrect && (
                      <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs italic text-center font-medium">
                No options added to this question yet.
              </div>
            )}
          </div>

          {/* Solution / Explanation */}
          {(question?.explanationText || (question as any)?.explanation) && (
            <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Solution / Explanation</h4>
              <div className="text-sm text-slate-800 leading-relaxed font-medium">
                <MathTextRenderer
                  text={
                    typeof question?.explanationText === 'string'
                      ? question.explanationText
                      : (Array.isArray((question as any)?.explanation)
                          ? (question as any).explanation.map((e: any) => e.text || e.html || '').join(' ')
                          : String((question as any)?.explanation || ''))
                  }
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
