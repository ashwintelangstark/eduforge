import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { apiCache } from '../services/apiCache.js';
import { DocumentModel, Question } from '@eduforge/shared';
import { Plus, BookOpen, Layers, HelpCircle, FileText, BarChart3, TrendingUp, Award, ArrowRight, CheckCircle2, RotateCw, RefreshCw } from 'lucide-react';
import { SubjectItem } from './SubjectsPage.js';
import { ChapterItem } from './ChaptersPage.js';
import { formatQuestionCode } from '../utils/questionCode.js';
import { getUserProfile } from '../utils/userProfile.js';

interface DashboardPageProps {
  subjectsList?: SubjectItem[];
  chaptersList?: ChapterItem[];
  onOpenDocument: (docId: string) => void;
  onNewPaperWizard: () => void;
  onOpenQuestionBuilder: () => void;
  onOpenTemplateGallery: () => void;
  onNavigateToQuestionBank: () => void;
  onNavigateToTemplates: () => void;
  onNavigateToScience: () => void;
  onNavigateToReports?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  subjectsList = [],
  chaptersList = [],
  onOpenDocument,
  onNewPaperWizard,
  onOpenQuestionBuilder,
  onNavigateToQuestionBank,
  onNavigateToReports
}) => {
  const user = getUserProfile();

  const [allBankQuestions, setAllBankQuestions] = useState<Question[]>([]);
  const [facultyScopedQuestions, setFacultyScopedQuestions] = useState<Question[]>([]);
  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [apiSubjects, setApiSubjects] = useState<any[]>([]);
  const [apiChapters, setApiChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
        apiCache.invalidate();
      } else {
        setLoading(true);
      }
      const [docs, qList, subList, chList] = await Promise.all([
        api.getDocuments(),
        api.getQuestions(undefined, force),
        api.getSubjects(),
        api.getChapters()
      ]);

      let rawDocs = docs || [];
      let rawQs = qList || [];
      let rawSubs = subList || [];
      let rawChs = chList || [];

      if (user.role === 'faculty' && user.assigned_subject && user.assigned_subject !== 'All') {
        const targetSubLower = user.assigned_subject.toLowerCase().trim();
        rawSubs = rawSubs.filter(s => (s.name || '').toLowerCase().trim() === targetSubLower || (s.code || '').toLowerCase().trim() === targetSubLower);
        rawChs = rawChs.filter(ch => {
          const sName = (ch.subject_name || ch.subject || (ch as any).subjects?.name || '').toLowerCase().trim();
          return sName === targetSubLower || sName.includes(targetSubLower) || targetSubLower.includes(sName);
        });
        rawQs = rawQs.filter(q => {
          const qSub = (q.subject || (q as any).subject_name || (q as any).subjects?.name || '').toLowerCase().trim();
          return qSub === targetSubLower || qSub.includes(targetSubLower) || targetSubLower.includes(qSub);
        });
        rawDocs = rawDocs.filter(d => {
          const title = (d.title || '').toLowerCase();
          const meta = JSON.stringify(d.metadata || {}).toLowerCase();
          return title.includes(targetSubLower) || meta.includes(targetSubLower);
        });
      }

      setDocuments(rawDocs);
      setAllBankQuestions(rawQs);
      setFacultyScopedQuestions(rawQs);
      setApiSubjects(rawSubs);
      setApiChapters(rawChs);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Dynamic Subject Colors Palette
  const defaultColors = [
    'bg-emerald-500',
    'bg-[#007a8c]',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-sky-500',
    'bg-teal-500'
  ];

  // Unify all distinct subjects across apiSubjects, apiChapters, and questions
  const allSubjectsMap = new Map<string, { id?: string; code?: string; name: string }>();

  apiSubjects.forEach(s => {
    if (s?.name) {
      allSubjectsMap.set(s.name.trim().toLowerCase(), {
        id: s.id,
        code: s.code || s.name.substring(0, 3).toUpperCase(),
        name: s.name.trim()
      });
    }
  });

  apiChapters.forEach(c => {
    const subName = (c.subject || c.subject_name || '').trim();
    if (subName && !allSubjectsMap.has(subName.toLowerCase())) {
      allSubjectsMap.set(subName.toLowerCase(), {
        name: subName,
        code: subName.substring(0, 3).toUpperCase()
      });
    }
  });

  allBankQuestions.forEach(q => {
    const subName = (q.subject || (q as any).subject_name || '').trim();
    if (subName && !allSubjectsMap.has(subName.toLowerCase())) {
      allSubjectsMap.set(subName.toLowerCase(), {
        name: subName,
        code: subName.substring(0, 3).toUpperCase()
      });
    }
  });

  const unifiedSubjectsList = Array.from(allSubjectsMap.values());
  const totalBankQuestionsCount = allBankQuestions.length;
  const totalChaptersCount = apiChapters.length;

  // Compute Real Question Counts, Chapters Count & Subject Share dynamically
  const subjectPerformance = unifiedSubjectsList.map((sub, idx) => {
    const subName = sub.name;
    const subNameLower = subName.toLowerCase();
    const subId = sub.id;

    // Filter chapters belonging to this subject
    const subjectChapters = apiChapters.filter(c => {
      const cSub = (c.subject || c.subject_name || '').trim().toLowerCase();
      const cSubId = c.subject_id || c.subjectId;
      return (cSub && cSub === subNameLower) || (subId && cSubId === subId);
    });
    const chaptersCount = subjectChapters.length;

    // Filter questions belonging to this subject
    const subjectQuestions = allBankQuestions.filter(q => {
      const qSub = (q.subject || (q as any).subject_name || (q as any).subjects?.name || '').trim().toLowerCase();
      const qSubId = (q as any).subject_id || (q as any).subjectId;
      return (qSub && (qSub === subNameLower || qSub.includes(subNameLower) || subNameLower.includes(qSub))) || (subId && qSubId === subId);
    });
    const count = subjectQuestions.length;

    // Dynamic Share percentage with 1 decimal place precision
    let percent = 0;
    if (totalBankQuestionsCount > 0) {
      const rawPct = (count / totalBankQuestionsCount) * 100;
      percent = rawPct === 0 ? 0 : Number(rawPct.toFixed(1));
    } else if (totalChaptersCount > 0) {
      const rawPct = (chaptersCount / totalChaptersCount) * 100;
      percent = rawPct === 0 ? 0 : Number(rawPct.toFixed(1));
    }

    return {
      name: subName,
      code: sub.code || subName.substring(0, 3).toUpperCase(),
      count,
      chaptersCount,
      percent,
      color: defaultColors[idx % defaultColors.length]
    };
  });

  const activeQuestionsForChapters = user.role === 'faculty' && user.assigned_subject !== 'All'
    ? facultyScopedQuestions
    : allBankQuestions;

  const chapterPerformance = apiChapters.map(ch => {
    const chId = String(ch.id || '').toLowerCase();
    const chTitle = (ch.title || ch.name || '').toLowerCase();
    const chSubLower = (ch.subject || ch.subject_name || '').trim().toLowerCase();

    const count = activeQuestionsForChapters.filter(q => {
      const qChId = String((q as any).chapter_id || (q as any).chapterId || '').toLowerCase();
      const qChapter = String((q as any).chapter || (q as any).chapter_name || '').toLowerCase();
      return (qChId && qChId === chId) || (qChapter && (qChapter === chTitle || qChapter.includes(chTitle) || chTitle.includes(qChapter)));
    }).length;

    const subjectQuestionsCount = activeQuestionsForChapters.filter(q => {
      const qSub = (q.subject || (q as any).subject_name || '').trim().toLowerCase();
      return qSub && chSubLower && (qSub === chSubLower || qSub.includes(chSubLower));
    }).length || totalBankQuestionsCount;

    const percent = subjectQuestionsCount > 0 ? Math.round((count / subjectQuestionsCount) * 100) : 0;

    return {
      title: ch.title || ch.name,
      code: ch.code || ch.chapter_code || 'CH-01',
      subject: ch.subject || ch.subject_name || 'General',
      count,
      percent
    };
  });

  // Real Difficulty Breakdown
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;

  allBankQuestions.forEach(q => {
    const diff = (q.difficulty || 'Medium').toLowerCase();
    if (diff === 'easy') easyCount++;
    else if (diff === 'hard') hardCount++;
    else mediumCount++;
  });

  const difficultyBreakdown = [
    {
      level: 'Easy',
      count: easyCount,
      percent: totalBankQuestionsCount > 0 ? Math.round((easyCount / totalBankQuestionsCount) * 100) : 0,
      color: 'bg-emerald-500'
    },
    {
      level: 'Medium',
      count: mediumCount,
      percent: totalBankQuestionsCount > 0 ? Math.round((mediumCount / totalBankQuestionsCount) * 100) : 0,
      color: 'bg-amber-500'
    },
    {
      level: 'Hard',
      count: hardCount,
      percent: totalBankQuestionsCount > 0 ? Math.round((hardCount / totalBankQuestionsCount) * 100) : 0,
      color: 'bg-rose-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-5 sm:space-y-7 font-sans animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner / Welcome */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {user.role === 'admin' 
              ? 'Multi-Subject Central Dashboard · Real dynamic backend statistics' 
              : `${user.assigned_subject} Department Dashboard · Scoped question authoring & test reports`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadDashboardData(true)}
          disabled={isRefreshing || loading}
          className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto disabled:opacity-50"
          title="Refresh Dashboard Statistics"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
          <span>Refresh Live Stats</span>
        </button>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Questions */}
        <div
          onClick={onNavigateToQuestionBank}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all duration-300 cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Total Questions
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loading ? '...' : totalBankQuestionsCount.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>
              {user.role === 'faculty' && user.assigned_subject !== 'All' 
                ? `${facultyScopedQuestions.length} in ${user.assigned_subject}`
                : `${apiSubjects.length || 4} Subjects Active`}
            </span>
            <span className="text-teal-700 font-bold group-hover:underline">View Bank →</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: totalBankQuestionsCount > 0 ? '100%' : '0%' }} />
          </div>
        </div>

        {/* Generated Tests */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all duration-300 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Generated Tests
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loading ? '...' : documents.length.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Test papers in library</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: documents.length > 0 ? '100%' : '0%' }} />
          </div>
        </div>

        {/* Subjects Active */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all duration-300 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {user.role === 'admin' ? 'Active Subjects' : 'Department'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loading ? '...' : user.role === 'admin' ? apiSubjects.length : user.assigned_subject}
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            {user.role === 'admin' ? apiSubjects.map(s => s.name).join(', ') : `${user.assigned_subject} Faculty Scoped`}
          </p>
        </div>

        {/* Active Chapters */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all duration-300 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Active Chapters
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loading ? '...' : apiChapters.length.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Live database sync
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Test Papers */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Generated Test Papers
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {documents.length} Total Papers
            </span>
          </div>

          <div className="space-y-3 min-h-[140px]">
            {loading ? (
              <div className="text-xs text-slate-400 py-6 text-center font-medium">Loading test papers...</div>
            ) : documents.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center font-medium">
                No test papers generated yet. Click "Generate Test Paper" to create your first exam.
              </div>
            ) : (
              documents.slice(0, 4).map(doc => {
                const qCount = (doc.sections && doc.sections.length > 0)
                  ? doc.sections.reduce((acc: number, s: any) => {
                      const items = s.blocks || s.items || s.questions || [];
                      return acc + (Array.isArray(items) ? items.length : 0);
                    }, 0)
                  : Number((doc.metadata as any)?.totalQuestions || (doc.metadata as any)?.questionsCount || (doc as any)?.totalQuestions || 0);

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition-all"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {doc.sections?.length || 0} Sections · {qCount} Questions
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 text-teal-800 rounded-lg text-[10px] font-bold font-mono shadow-2xs">
                      {qCount} Qs
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Real Question Distribution */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {user.role === 'admin' ? 'Subject Question Distribution' : `${user.assigned_subject} Chapter Distribution`}
            </h2>
          </div>

          <div className="space-y-3.5 min-h-[140px] text-xs font-semibold">
            {loading ? (
              <div className="text-xs text-slate-400 py-6 text-center font-medium">Loading distribution...</div>
            ) : user.role === 'admin' ? (
              subjectPerformance.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center font-medium">No subjects found.</div>
              ) : (
                subjectPerformance.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-slate-800 border-b border-slate-50 pb-2 last:border-0">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      {item.name}
                    </span>
                    <span className="font-extrabold text-[#007a87] font-mono text-xs">{item.count.toLocaleString()} Qs</span>
                  </div>
                ))
              )
            ) : (
              chapterPerformance.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center font-medium">No chapters found for {user.assigned_subject}.</div>
              ) : (
                chapterPerformance.map(item => (
                  <div key={item.title} className="flex items-center justify-between text-slate-800 border-b border-slate-50 pb-2 last:border-0">
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="font-extrabold text-[#007a87] font-mono text-xs shrink-0">{item.count.toLocaleString()} Qs</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* REPORTS GRAPHICAL ANALYTICS SECTION (100% SYNCED WITH REPORTS PAGE) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-7 space-y-6">
        {/* Section Header with Redirect Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-black text-slate-900 tracking-tight font-sans">
                Performance Reports & Analytics Graphs
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live synchronized real question share and difficulty balance metrics from Question Bank.
            </p>
          </div>

          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              <span>View Full Reports</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Graphical Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: Subject / Chapter Share */}
          <div className="p-5 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <BarChart3 className="w-4 h-4 text-teal-700" /> {user.role === 'admin' ? 'Subject Question Share' : `${user.assigned_subject} Chapter Share`}
              </h3>
              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                Live Dynamic Sync
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {loading ? (
                <div className="text-xs text-slate-400 py-4 text-center">Loading live share metrics...</div>
              ) : user.role === 'admin' ? (
                subjectPerformance.length > 0 ? (
                  subjectPerformance.map(s => (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${s.color}`} />
                          {s.name} ({s.code})
                        </span>
                        <span className="font-mono text-teal-800">{s.count} Qs · {s.chaptersCount} Chs ({s.percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${s.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(s.percent, s.count > 0 || s.chaptersCount > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">No subjects configured.</div>
                )
              ) : (
                chapterPerformance.length > 0 ? (
                  chapterPerformance.map(ch => (
                    <div key={ch.title} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                          <span className="truncate">{ch.title}</span>
                        </span>
                        <span className="font-mono text-teal-800 shrink-0">{ch.count} Qs ({ch.percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full transition-all duration-500"
                          style={{ width: `${ch.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">No chapters found for {user.assigned_subject}.</div>
                )
              )}
            </div>
          </div>

          {/* Graph 2: Difficulty Level Distribution */}
          <div className="p-5 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <Award className="w-4 h-4 text-amber-500" /> Question Bank Difficulty Balance
              </h3>
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Live Balance
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {loading ? (
                <div className="text-xs text-slate-400 py-4 text-center">Loading difficulty balance...</div>
              ) : (
                difficultyBreakdown.map(d => (
                  <div key={d.level} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${d.color}`} />
                        {d.level} Difficulty
                      </span>
                      <span className="font-mono text-slate-900">{d.count} Questions ({d.percent}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${d.color} rounded-full transition-all duration-500`}
                        style={{ width: `${d.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
