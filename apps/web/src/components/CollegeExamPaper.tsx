import React from 'react';
import { MathTextRenderer, resolveImageUrl, stripQuestionCode } from '../equation/MathTextRenderer.js';
import { formatQuestionCode } from '../utils/questionCode.js';
import { Check } from 'lucide-react';

export interface CollegeExamQuestion {
  id: string | number;
  questionNumber?: number;
  questionCode?: string;
  question_code?: string;
  rawText?: string;
  content?: any;
  options?: any[];
  correctOption?: string;
  correctAnswer?: string;
  marks?: number;
  negativeMarks?: number;
  diagramSvg?: string;
  diagramUrl?: string;
  imageUrl?: string;
  explanationText?: string;
  solution?: string;
  sectionName?: string;
  sectionId?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
}

export interface CollegeExamSection {
  id: string;
  name: string;
  instructions?: string;
  subject?: string;
  questions?: CollegeExamQuestion[];
}

export type HeaderPresetType = 'classic_boxed' | 'modern_elite' | 'nta_neet_jee' | 'minimal';

export interface CollegeExamPaperProps {
  instituteName?: string;
  examTitle?: string;
  subtitle?: string;
  subjectNames?: string;
  standard?: string;
  paperSet?: string;
  date?: string;
  duration?: string | number;
  totalMarks?: number;
  sections: CollegeExamSection[];
  allQuestions: CollegeExamQuestion[];
  headerPreset?: HeaderPresetType;
  isAnswerKeyMode?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
  columnLayout?: '2-column' | '1-column';
  showQuestionCode?: boolean;
  fontSize?: 'compact' | 'normal' | 'spacious';
  logoUrl?: string;
  instructionsText?: string;
  className?: string;
  onEditInstituteName?: (name: string) => void;
}

export const CollegeExamPaper: React.FC<CollegeExamPaperProps> = ({
  instituteName = 'NLE SOCIETYS Dr RB PATIL MAHESH PU COLLEGE',
  examTitle = 'NEET WEEKLY TEST (PCBM) PUC 1',
  subtitle = '',
  subjectNames = 'Biology, Physics, Chemistry, Mathematics',
  standard = '11 / PUC',
  paperSet = '1',
  date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
  duration = '3H:00M',
  totalMarks = 720,
  sections = [],
  allQuestions = [],
  headerPreset = 'classic_boxed',
  isAnswerKeyMode = false,
  showWatermark = true,
  watermarkText = 'Test',
  columnLayout = '2-column',
  showQuestionCode = false,
  fontSize = 'compact',
  logoUrl = '',
  instructionsText = '',
  className = ''
}) => {
  // Format duration nicely
  const formattedDuration = typeof duration === 'number'
    ? (duration >= 60 ? `${Math.floor(duration / 60)}H:${String(duration % 60).padStart(2, '0')}M` : `${duration} Mins`)
    : String(duration);

  // Group questions by section
  const sectionGroups = React.useMemo(() => {
    if (sections.length === 0) {
      return [{
        id: 'sec-all',
        name: `${subjectNames.split(',')[0] || 'General'} - Section A (MCQ)`,
        instructions: undefined as string | undefined,
        questions: allQuestions
      }];
    }

    return sections.map((sec, sIdx) => {
      const secQs = allQuestions.filter(q => q.sectionId === sec.id || q.sectionName === sec.name || (sec.subject && q.subject === sec.subject));
      return {
        id: sec.id || `sec-${sIdx}`,
        name: sec.name || `Section ${String.fromCharCode(65 + sIdx)} (MCQ)`,
        instructions: sec.instructions,
        questions: secQs.length > 0 ? secQs : (sections.length === 1 ? allQuestions : [])
      };
    });
  }, [sections, allQuestions, subjectNames]);

  // Font size configuration class
  const fontSizeClasses = {
    compact: 'text-[11px] sm:text-[11.5px] leading-snug',
    normal: 'text-[12px] sm:text-[12.5px] leading-normal',
    spacious: 'text-[13px] sm:text-[13.5px] leading-relaxed'
  }[fontSize] || 'text-[11px] sm:text-[11.5px] leading-snug';

  return (
    <div className={`college-exam-sheet relative bg-white text-black font-sans ${fontSizeClasses} ${className}`} style={{ minHeight: '100%' }}>
      {/* Print & Screen Column Balancing CSS Rules */}
      <style>{`
        /* Screen Multi-Column Layout (Critical for balanced 2-column rendering) */
        .exam-columns-container {
          column-count: ${columnLayout === '2-column' ? 2 : 1};
          column-gap: 20px;
          column-rule: ${columnLayout === '2-column' ? '1px solid #cbd5e1' : 'none'};
          column-fill: balance !important;
          width: 100%;
        }
        .exam-sec-divider {
          column-span: ${columnLayout === '2-column' ? 'all' : 'none'};
          -webkit-column-span: ${columnLayout === '2-column' ? 'all' : 'none'};
          display: inline-block;
          width: 100%;
          break-inside: avoid;
          page-break-after: avoid;
        }
        .exam-q-block {
          break-inside: avoid;
          page-break-inside: avoid;
          -webkit-column-break-inside: avoid;
          display: inline-block;
          width: 100%;
          contain: layout style;
          box-sizing: border-box;
        }

        /* Print Specific CSS Rules */
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 10mm 8mm;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .college-exam-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .exam-columns-container {
            column-count: ${columnLayout === '2-column' ? 2 : 1} !important;
            column-gap: 16px !important;
            column-rule: ${columnLayout === '2-column' ? '1px solid #94a3b8' : 'none'} !important;
            column-fill: auto !important;
            width: 100% !important;
          }
          .exam-sec-divider {
            column-span: ${columnLayout === '2-column' ? 'all' : 'none'} !important;
            -webkit-column-span: ${columnLayout === '2-column' ? 'all' : 'none'} !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            -webkit-column-break-inside: avoid !important;
            display: inline-block !important;
            width: 100% !important;
            margin-top: 10px !important;
            margin-bottom: 6px !important;
          }
          .exam-q-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            break-inside: avoid-column !important;
            break-inside: avoid-page !important;
            display: inline-block !important;
            width: 100% !important;
            margin-bottom: 11px !important;
            padding-bottom: 2px !important;
            box-sizing: border-box !important;
            contain: layout style !important;
          }
          .exam-q-block * {
            -webkit-column-break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .exam-master-key-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            display: block !important;
            width: 100% !important;
          }
          .exam-q-block img,
          .exam-q-block svg,
          .exam-q-block table {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            max-width: 100% !important;
            height: auto !important;
          }
          .exam-q-block img {
            max-height: 120px !important;
            object-fit: contain !important;
          }
          .exam-q-block .grid img {
            max-height: 75px !important;
            object-fit: contain !important;
          }
        }
      `}</style>

      {/* Subtle Diagonal Watermark */}
      {showWatermark && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center select-none z-0">
          <div
            className="text-[100px] sm:text-[120px] font-black text-slate-400/25 uppercase tracking-widest rotate-[-35deg] select-none text-center"
            style={{ opacity: 0.12, userSelect: 'none' }}
          >
            {watermarkText}
          </div>
        </div>
      )}

      <div className="relative z-10 p-4 sm:p-6 text-black">
        {/* ========================================================================= */}
        {/* 1. AUTHENTIC EXAMINATION HEADERS (4 Switchable Presets)                    */}
        {/* ========================================================================= */}

        {/* Preset A: Classic College Boxed Header (PUC / State Board Format) */}
        {headerPreset === 'classic_boxed' && (
          <div className="border-2 border-black p-3 mb-3 bg-white">
            {/* Institution / College Name (Large Bold Centered) */}
            <div className="text-center pb-2 border-b-2 border-black">
              {logoUrl && <img src={logoUrl} alt="" className="h-8 max-h-8 mx-auto mb-1 object-contain" />}
              <h1 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-black font-sans">
                {instituteName}
              </h1>
              {subtitle && <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{subtitle}</p>}
            </div>

            {/* Exam Title & Metadata Grid */}
            <div className="pt-2 grid grid-cols-2 gap-x-4 text-[11px] sm:text-xs font-semibold leading-tight text-black">
              {/* Left Column */}
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20 font-bold shrink-0">Subject</span>
                  <span className="font-bold">:</span>
                  <span className="ml-1.5 font-medium truncate">{subjectNames}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-bold shrink-0">Standard</span>
                  <span className="font-bold">:</span>
                  <span className="ml-1.5 font-medium">{standard}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-bold shrink-0">Total Mark</span>
                  <span className="font-bold">:</span>
                  <span className="ml-1.5 font-bold">{totalMarks}</span>
                </div>
              </div>

              {/* Right Column with Exam Title */}
              <div className="space-y-1">
                <div className="text-center sm:text-left font-black text-xs sm:text-sm uppercase tracking-wide pb-0.5">
                  {examTitle}
                </div>
                <div className="flex justify-between sm:justify-start gap-4">
                  <div className="flex">
                    <span className="w-18 font-bold shrink-0">Paper Set</span>
                    <span className="font-bold">:</span>
                    <span className="ml-1.5 font-bold">{paperSet}</span>
                  </div>
                  <div className="flex">
                    <span className="w-12 font-bold shrink-0">Date</span>
                    <span className="font-bold">:</span>
                    <span className="ml-1.5 font-medium">{date}</span>
                  </div>
                </div>
                <div className="flex">
                  <span className="w-18 font-bold shrink-0">Time</span>
                  <span className="font-bold">:</span>
                  <span className="ml-1.5 font-medium">{formattedDuration}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preset B: Modern Elite Header (Sleek contemporary design) */}
        {headerPreset === 'modern_elite' && (
          <div className="border border-slate-300 rounded-lg p-3.5 mb-3.5 bg-gradient-to-r from-slate-50 to-white shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div>
                <span className="inline-block px-2 py-0.5 bg-teal-800 text-white text-[9px] font-black uppercase tracking-wider rounded-sm mb-1">
                  Official Examination
                </span>
                <h1 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-tight">
                  {instituteName}
                </h1>
                {subtitle && <p className="text-[10.5px] font-medium text-slate-600">{subtitle}</p>}
              </div>
              <div className="text-right sm:text-right">
                <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block">{examTitle}</span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                  Set {paperSet} • Date: {date}
                </span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-3 gap-2 text-[10.5px] sm:text-[11px] font-medium text-slate-700">
              <div><span className="font-bold text-slate-900">Subject:</span> {subjectNames}</div>
              <div className="text-center"><span className="font-bold text-slate-900">Class:</span> {standard}</div>
              <div className="text-right"><span className="font-bold text-slate-900">Time:</span> {formattedDuration} | <span className="font-bold text-slate-900">Marks:</span> {totalMarks}</div>
            </div>
          </div>
        )}

        {/* Preset C: National Board NTA NEET / JEE Booklet Header */}
        {headerPreset === 'nta_neet_jee' && (
          <div className="border-2 border-black p-3 mb-3 bg-white space-y-2">
            <div className="text-center border-b border-black pb-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">National Standard Assessment Test</div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight">{instituteName}</h1>
              <div className="font-black text-xs sm:text-sm uppercase tracking-wide mt-0.5">{examTitle}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] font-bold border-b border-black pb-1.5">
              <div>Subject: <span className="font-normal">{subjectNames}</span></div>
              <div>Duration: <span className="font-normal">{formattedDuration}</span></div>
              <div>Max Marks: <span className="font-bold">{totalMarks}</span></div>
              <div>Test Booklet Code: <span className="font-mono font-black">{paperSet}</span></div>
            </div>

            {/* Candidate Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 border border-black/60 rounded-xs">
              <div className="space-y-1">
                <div>Candidate's Name (in Capital): _______________________</div>
                <div className="flex items-center gap-1">
                  <span>Roll No:</span>
                  <div className="inline-flex border border-black text-center font-mono">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <span key={n} className="w-4 h-4 border-r border-black last:border-r-0 inline-block"></span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div>Examination Centre: _______________________________</div>
                <div>Candidate's Signature: ____________ Invigilator: _______</div>
              </div>
            </div>
          </div>
        )}

        {/* Preset D: Minimal Academic Header */}
        {headerPreset === 'minimal' && (
          <div className="pb-3 mb-3 border-b-2 border-black">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight">{instituteName}</h1>
                <div className="text-xs font-bold text-slate-800 uppercase mt-0.5">{examTitle}</div>
              </div>
              <div className="text-right text-[11px] font-medium space-y-0.5">
                <div><b>Date:</b> {date} | <b>Time:</b> {formattedDuration}</div>
                <div><b>Subject:</b> {subjectNames} | <b>Marks:</b> {totalMarks}</div>
              </div>
            </div>
          </div>
        )}

        {/* Optional Custom Instructions Box */}
        {instructionsText && (
          <div className="mb-3 p-2 border border-slate-400 bg-slate-50 text-[10px] text-slate-700 italic">
            <b>General Instructions:</b> {instructionsText}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. BALANCED 2-COLUMN / 1-COLUMN QUESTION BODY                             */}
        {/* ========================================================================= */}
        <div className="exam-columns-container">
          {sectionGroups.map((sec, sIdx) => {
            const secQuestions = sec.questions && sec.questions.length > 0
              ? sec.questions
              : allQuestions;

            return (
              <React.Fragment key={sec.id || sIdx}>
                {/* Section Header with Centered Border Box */}
                <div className="exam-sec-divider my-2.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="border-t border-dotted border-slate-400 flex-1 max-w-[25%]"></span>
                    <span className="border border-black px-2.5 py-0.5 font-bold text-xs uppercase bg-white shadow-2xs">
                      {sec.name}
                    </span>
                    <span className="border-t border-dotted border-slate-400 flex-1 max-w-[25%]"></span>
                  </div>
                  {sec.instructions && (
                    <p className="text-[10px] italic text-slate-600 mt-0.5">{sec.instructions}</p>
                  )}
                </div>

                {/* Questions in this section */}
                {secQuestions.map((q, qIdx) => {
                  const qNum = q.questionNumber || (allQuestions.indexOf(q) >= 0 ? allQuestions.indexOf(q) + 1 : qIdx + 1);
                  const targetOptKey = (q.correctOption || q.correctAnswer || (q as any).correct_option || (q as any).correct_answer || 'A').toString().toUpperCase().trim();

                  // Options extraction
                  const rawOpts = q.options && Array.isArray(q.options) && q.options.length > 0
                    ? q.options
                    : [
                        { key: 'A', rawText: 'Option A' },
                        { key: 'B', rawText: 'Option B' },
                        { key: 'C', rawText: 'Option C' },
                        { key: 'D', rawText: 'Option D' }
                      ];

                  // Deterministically sort options by Key (A, B, C, D) or sort_order
                  const sortedOpts = [...rawOpts].sort((a, b) => {
                    const orderMap: Record<string, number> = {
                      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
                      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
                      'I': 1, 'II': 2, 'III': 3, 'IV': 4
                    };
                    const keyA = (a.key || (a as any).option_key || '').toString().toUpperCase().trim();
                    const keyB = (b.key || (b as any).option_key || '').toString().toUpperCase().trim();
                    const valA = orderMap[keyA] ?? (a.sort_order ?? 99);
                    const valB = orderMap[keyB] ?? (b.sort_order ?? 99);
                    if (valA !== valB) return valA - valB;
                    return keyA.localeCompare(keyB);
                  });

                  // Question Text & Diagrams
                  const rawTextStr = stripQuestionCode(q.rawText || (typeof q.content === 'string' ? q.content : '') || '');
                  const hasEmbeddedImg = /<img\s+/i.test(rawTextStr);

                  // Diagrams & Images
                  const contentArr = Array.isArray(q.content) ? (q.content as any[]) : [];
                  const qSvg = q.diagramSvg || (q as any).diagram_svg || contentArr.find((b: any) => b.type === 'diagram' || b.diagramSvg || b.svg)?.diagramSvg || contentArr.find((b: any) => b.type === 'diagram' || b.diagramSvg || b.svg)?.svg;
                  const qImg = q.imageUrl || q.diagramUrl || contentArr.find((b: any) => b.type === 'image' || b.imageUrl || b.url)?.url;

                  // Check if options contain images or diagrams
                  const hasOptImages = sortedOpts.some(o => {
                    const t = String(o.rawText || o.text || o.label || o.imageUrl || '');
                    return /<img|data:image|\.png|\.jpg|\.jpeg|\.svg|\/assets\//i.test(t) || Boolean(o.imageUrl || (o as any).diagramUrl);
                  });

                  // Determine optimal option layout (2x2 vs 1-col vs inline 4)
                  const maxOptLen = Math.max(...sortedOpts.map(o => String(o.rawText || o.text || o.label || '').length));
                  const isUltraShort = !hasOptImages && maxOptLen <= 10 && sortedOpts.length === 4;
                  const isShort2x2 = hasOptImages || (maxOptLen <= 26 && sortedOpts.length === 4);

                  // Extract question code if enabled
                  const qCode = q.questionCode || (q as any).question_code || (q as any).code || formatQuestionCode(q);

                  return (
                    <div key={q.id || qIdx} className="exam-q-block mb-3 pl-0.5 text-black">
                      {/* Question Text */}
                      <div className="flex items-start gap-1.5 font-normal">
                        <div className="flex items-center gap-1 shrink-0 select-none">
                          <span className="font-bold">({qNum})</span>
                          {showQuestionCode && qCode && (
                            <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 px-1 py-0.5 rounded inline-block">
                              [{qCode}]
                            </span>
                          )}
                        </div>
                        <div className="flex-1 font-medium leading-relaxed">
                          <MathTextRenderer text={rawTextStr || 'Question Statement'} />
                        </div>
                      </div>

                      {/* Embedded Diagram / Image */}
                      {!hasEmbeddedImg && (qSvg || (qImg && qImg !== 'undefined' && qImg !== 'null' && String(qImg).trim() !== '')) && (
                        <div className="my-2 flex justify-center w-full">
                          {qSvg ? (
                            <div
                              className="max-w-full flex items-center justify-center scale-90"
                              dangerouslySetInnerHTML={{ __html: qSvg }}
                            />
                          ) : (
                            <img
                              src={resolveImageUrl(qImg)}
                              alt="Question Diagram"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.triedFallback) {
                                  target.dataset.triedFallback = 'true';
                                  const cur = target.src;
                                  if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                                    target.src = cur.replace('/uploads/', '/api/uploads/');
                                    return;
                                  }
                                }
                                target.style.display = 'none';
                                if (target.parentElement) target.parentElement.style.display = 'none';
                              }}
                              className="max-w-full h-auto object-contain border border-slate-300 p-1 rounded bg-white shadow-2xs"
                              style={{ maxHeight: 'none' }}
                            />
                          )}
                        </div>
                      )}

                      {/* MCQ Options with College Exam Format */}
                      <div className="mt-1 pl-3.5">
                        {(() => {
                          const getOptText = (opt: any) => {
                            if (opt.rawText && String(opt.rawText).trim()) return String(opt.rawText).trim();
                            if (opt.raw_text && String(opt.raw_text).trim()) return String(opt.raw_text).trim();
                            if (opt.text && String(opt.text).trim()) return String(opt.text).trim();
                            if (opt.label && String(opt.label).trim()) return String(opt.label).trim();
                            if (typeof opt.content === 'string' && opt.content.trim()) return opt.content.trim();
                            if (Array.isArray(opt.content)) {
                              return opt.content.map((c: any) => c.latex ? `\\(${c.latex}\\)` : (c.html || c.text || '')).filter(Boolean).join(' ');
                            }
                            return '';
                          };

                          if (isUltraShort) {
                            return (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                {sortedOpts.map((opt, oIdx) => {
                                  const key = (opt.key || String.fromCharCode(65 + oIdx)).toUpperCase();
                                  const isCorrect = isAnswerKeyMode && (key === targetOptKey || opt.isCorrect);
                                  const optText = getOptText(opt);

                                  return (
                                    <div key={opt.id || oIdx} className={`flex items-baseline gap-1 ${isCorrect ? 'font-bold text-emerald-800' : ''}`}>
                                      <span className="font-bold">({key})</span>
                                      <MathTextRenderer text={optText} />
                                      {isCorrect && <Check className="inline w-3 h-3 text-emerald-600 stroke-[3] ml-0.5" />}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          if (isShort2x2) {
                            return (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {sortedOpts.map((opt, oIdx) => {
                                  const key = (opt.key || String.fromCharCode(65 + oIdx)).toUpperCase();
                                  const isCorrect = isAnswerKeyMode && (key === targetOptKey || opt.isCorrect);
                                  const optText = getOptText(opt);

                                  return (
                                    <div key={opt.id || oIdx} className={`flex items-start gap-1 ${hasOptImages ? 'p-1 border border-slate-200 rounded-sm bg-white' : 'truncate'} ${isCorrect ? 'font-bold text-emerald-800 bg-emerald-50 px-1 rounded-xs' : ''}`}>
                                      <span className="font-bold shrink-0">({key})</span>
                                      <div className={`flex-1 ${hasOptImages ? 'flex justify-center items-center max-h-20 overflow-hidden' : 'truncate'}`}>
                                        <MathTextRenderer text={optText} />
                                      </div>
                                      {isCorrect && <Check className="inline w-3 h-3 text-emerald-600 stroke-[3] ml-0.5 shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-0.5">
                              {sortedOpts.map((opt, oIdx) => {
                                const key = (opt.key || String.fromCharCode(65 + oIdx)).toUpperCase();
                                const isCorrect = isAnswerKeyMode && (key === targetOptKey || opt.isCorrect);
                                const optText = getOptText(opt);
                                const optImg = (opt as any).imageUrl || (opt as any).image_url;

                                return (
                                  <div key={opt.id || oIdx} className={`flex items-start gap-1.5 ${isCorrect ? 'font-bold text-emerald-800 bg-emerald-50/70 px-1 rounded' : ''}`}>
                                    <span className="font-bold shrink-0">({key})</span>
                                    <div className="flex-1">
                                      <MathTextRenderer text={optText} />
                                      {optImg && (
                                        <div className="my-1">
                                          <img
                                            src={resolveImageUrl(optImg)}
                                            alt={`Option ${key}`}
                                            className="max-h-24 max-w-[160px] object-contain border border-slate-200 p-0.5 rounded bg-white inline-block shadow-2xs"
                                            onError={(e) => {
                                              const target = e.currentTarget;
                                              if (!target.dataset.triedFallback) {
                                                target.dataset.triedFallback = 'true';
                                                const cur = target.src;
                                                if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                                                  target.src = cur.replace('/uploads/', '/api/uploads/');
                                                  return;
                                                }
                                              }
                                              target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    {isCorrect && <Check className="inline w-3.5 h-3.5 text-emerald-600 stroke-[3] ml-1 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. MASTER ANSWER KEY TABLE (Compact Grid at bottom in Answer Key Mode)    */}
        {/* ========================================================================= */}
        {isAnswerKeyMode && allQuestions.length > 0 && (
          <div className="exam-master-key-block mt-4 pt-3 border-t-2 border-black text-black">
            <div className="text-center font-bold text-xs uppercase tracking-wider mb-2">
              Master Answer Key ({allQuestions.length} Questions)
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-[10px] text-center font-mono font-bold">
                <tbody>
                  {/* Split questions into rows of 15 */}
                  {(() => {
                    const rowSize = 15;
                    const rows: CollegeExamQuestion[][] = [];
                    for (let i = 0; i < allQuestions.length; i += rowSize) {
                      rows.push(allQuestions.slice(i, i + rowSize));
                    }

                    return rows.map((rowQs, rIdx) => (
                      <React.Fragment key={rIdx}>
                        {/* Q.No Header Row */}
                        <tr className="bg-slate-100 border-b border-black">
                          <td className="border border-black px-1.5 py-0.5 bg-slate-200 font-sans font-bold">Q.No</td>
                          {rowQs.map((q, cIdx) => (
                            <td key={cIdx} className="border border-black px-1 py-0.5">
                              {rIdx * rowSize + cIdx + 1}
                            </td>
                          ))}
                        </tr>
                        {/* Ans Row */}
                        <tr className="border-b border-black">
                          <td className="border border-black px-1.5 py-0.5 bg-slate-200 font-sans font-bold">Ans</td>
                          {rowQs.map((q, cIdx) => {
                            const correct = (q.correctOption || q.correctAnswer || (q as any).correct_option || (q as any).correct_answer || 'A').toString().toUpperCase().trim();
                            return (
                              <td key={cIdx} className="border border-black px-1 py-0.5 text-emerald-900 bg-emerald-50 font-bold">
                                {correct}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Page Number */}
        <div className="mt-4 pt-2 text-center text-[10px] text-slate-500 font-mono select-none border-t border-slate-200">
          — End of Question Paper —
        </div>
      </div>
    </div>
  );
};
