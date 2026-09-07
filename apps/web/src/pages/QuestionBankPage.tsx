import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Question, DocumentModel } from '@eduforge/shared';
import { Search, Plus, Trash2, Edit3, Eye, Filter, BookOpen, Layers, Send, Bookmark, FileText, Download, Check, X, Settings, ZoomIn, ZoomOut, FileEdit, Printer, Columns, Square, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw, FileDown, Tag, Hash } from 'lucide-react';
import { StudentPreviewDrawer } from '../components/StudentPreviewDrawer.js';
import { CollegeExamPaper, HeaderPresetType } from '../components/CollegeExamPaper.js';
import { formatQuestionCode } from '../utils/questionCode.js';
import { MathTextRenderer, cleanHtmlTags } from '../equation/MathTextRenderer.js';
import { getUserProfile } from '../utils/userProfile.js';

export const getPersistedStatusMap = (): Record<string, 'saved' | 'published'> => {
  try {
    const raw = localStorage.getItem('eduforge_question_status_map');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setPersistedStatus = (id: string, status: 'saved' | 'published') => {
  if (!id) return;
  try {
    const map = getPersistedStatusMap();
    map[id] = status;
    localStorage.setItem('eduforge_question_status_map', JSON.stringify(map));
  } catch {}
};

export const setPersistedStatusMultiple = (ids: string[], status: 'saved' | 'published') => {
  if (!Array.isArray(ids) || ids.length === 0) return;
  try {
    const map = getPersistedStatusMap();
    ids.forEach(id => {
      if (id) map[id] = status;
    });
    localStorage.setItem('eduforge_question_status_map', JSON.stringify(map));
  } catch {}
};

export const isQuestionPublished = (q: any): boolean => {
  if (!q) return false;
  if (typeof q.source === 'string' && q.source.startsWith('published:')) return true;
  const statusMap = getPersistedStatusMap();
  if (q.id && statusMap[q.id]) {
    return statusMap[q.id] === 'published';
  }
  if (q.status === 'published') return true;
  if (q.source === 'published') return true;
  if (q.isSystem === true) return true;
  if (q.isPublished === true) return true;
  return false;
};

export const isQuestionPending = (q: any): boolean => {
  if (!q) return false;
  if (typeof q.source === 'string' && q.source.startsWith('pending:')) return true;
  return false;
};

export const isQuestionSaved = (q: any): boolean => {
  if (!q) return false;
  if (q.source === 'saved') return true;
  return !isQuestionPublished(q) && !isQuestionPending(q);
};

export const hasQuestionImage = (q: any): boolean => {
  if (!q) return false;
  if (q.imageUrl && String(q.imageUrl).trim()) return true;
  if (q.diagramUrl && String(q.diagramUrl).trim()) return true;
  if (q.diagramSvg && String(q.diagramSvg).trim()) return true;
  if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) return true;
  if (typeof q.rawText === 'string' && /<img\s+/i.test(q.rawText)) return true;
  if (Array.isArray(q.content) && q.content.some((b: any) =>
    b.type === 'image' || b.type === 'diagram' || b.imageUrl || b.url || b.diagramSvg || b.svg || (typeof b.text === 'string' && /<img\s+/i.test(b.text)) || (typeof b.html === 'string' && /<img\s+/i.test(b.html))
  )) return true;
  if (Array.isArray(q.options) && q.options.some((o: any) =>
    o.imageUrl || (typeof o.rawText === 'string' && /<img\s+/i.test(o.rawText)) || (Array.isArray(o.content) && o.content.some((c: any) => c.type === 'image' || (typeof c.text === 'string' && /<img\s+/i.test(c.text)) || (typeof c.html === 'string' && /<img\s+/i.test(c.html))))
  )) return true;
  return false;
};

interface QuestionBankPageProps {
  mode?: 'all' | 'saved' | 'published' | 'approvals';
  onBackToDashboard?: () => void;
  onOpenCreateQuestion?: (q?: Question) => void;
  onOpenDocument?: (docId: string) => void;
  selectedChapter?: { id?: string; title?: string; subject?: string } | null;
  onClearChapterFilter?: () => void;
}

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({
  mode = 'all',
  onOpenCreateQuestion,
  onOpenDocument,
  selectedChapter,
  onClearChapterFilter
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const user = getUserProfile();
  const userSubject = user.assigned_subject || 'All';
  const userRoleStr = user.role === 'admin' ? 'System Admin' : user.assigned_subject === 'None' ? 'System' : `${user.assigned_subject} Faculty`;

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>(user.role === 'faculty' && userSubject !== 'All' ? userSubject : 'all');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [imageFilter, setImageFilter] = useState<'all' | 'with_image' | 'without_image'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fast Preview Drawer State
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Admin Approvals Tab State
  const [adminApprovalTab, setAdminApprovalTab] = useState<'sent' | 'received'>('sent');

  // PDF / Exam Studio Modal State & Controls
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<'student' | 'teacher_key'>('student');
  const [studioColumnLayout, setStudioColumnLayout] = useState<'2-column' | '1-column'>('2-column');
  const [studioHeaderPreset, setStudioHeaderPreset] = useState<HeaderPresetType>('classic_boxed');
  const [studioFontSize, setStudioFontSize] = useState<'compact' | 'normal' | 'spacious'>('compact');
  const [studioGroupBySubject, setStudioGroupBySubject] = useState<boolean>(true);
  const [studioZoom, setStudioZoom] = useState<number>(100);
  const [studioShowWatermark, setStudioShowWatermark] = useState<boolean>(true);
  const [studioWatermarkText, setStudioWatermarkText] = useState<string>('NEET PREP');
  const [studioShowQuestionCode, setStudioShowQuestionCode] = useState<boolean>(false);
  const [studioInstituteName, setStudioInstituteName] = useState<string>('NLE SOCIETYS Dr RB PATIL MAHESH PU COLLEGE');
  const [studioExamTitle, setStudioExamTitle] = useState<string>('QUESTION BANK ASSESSMENT TEST');
  const [studioSubtitle, setStudioSubtitle] = useState<string>('Department of Pre-University Education');
  const [studioStandard, setStudioStandard] = useState<string>('11 / PUC 1');
  const [studioPaperSet, setStudioPaperSet] = useState<string>('SET 1');
  const [studioDate, setStudioDate] = useState<string>(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'));
  const [studioDuration, setStudioDuration] = useState<number>(180);
  const [studioInstructions, setStudioInstructions] = useState<string>('Read all questions carefully. Each question carries equal marks.');
  const [isStudioSettingsOpen, setIsStudioSettingsOpen] = useState<boolean>(false);

  // Keyboard shortcut listener to clear selection on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.length > 0 && !isPdfModalOpen && !isPreviewOpen) {
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.length, isPdfModalOpen, isPreviewOpen]);

  useEffect(() => {
    loadMetadataAndQuestions();
  }, [difficultyFilter, selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      if (selectedChapter.id) {
        setSelectedChapterFilter(selectedChapter.id);
      } else if (selectedChapter.title) {
        setSelectedChapterFilter(selectedChapter.title);
      }
      if (selectedChapter.subject) {
        setSelectedSubject(selectedChapter.subject);
      }
    }
  }, [selectedChapter]);

  const loadMetadataAndQuestions = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const params: any = {};
      if (search) params.search = search;
      if (difficultyFilter !== 'all') params.difficulty = difficultyFilter;
      if (user.role === 'faculty' && userSubject !== 'All') {
        params.subject = userSubject;
      } else if (selectedSubject !== 'all') {
        params.subject = selectedSubject;
      }

      const [qData, subData, chData] = await Promise.all([
        api.getQuestions(params, force),
        api.getSubjects(),
        api.getChapters()
      ]);

      setQuestions(qData || []);
      setSubjects(subData || []);
      setChapters(chData || []);
    } catch (err) {
      console.error('Failed to load questions or metadata:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleSelectQuestion = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(q => q.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected question(s)?`)) {
      const idsToDelete = [...selectedIds];
      setQuestions(prev => prev.filter(q => !idsToDelete.includes(q.id)));
      setSelectedIds([]);
      try {
        await api.deleteMultipleQuestions(idsToDelete);
      } catch (err) {
        console.error('Failed bulk delete:', err);
      } finally {
        loadMetadataAndQuestions();
      }
    }
  };

  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Publish ${selectedIds.length} selected question(s) to Published Questions?`)) {
      const idsToPublish = [...selectedIds];
      const questionsToUpdate = questions.filter(q => idsToPublish.includes(q.id));
      const publishedSource = `published:${userRoleStr}`;

      setPersistedStatusMultiple(idsToPublish, 'published');
      setQuestions(prev =>
        prev.map(q =>
          idsToPublish.includes(q.id)
            ? { ...q, status: 'published', source: publishedSource, isSystem: true, isPublished: true }
            : q
        )
      );
      setSelectedIds([]);

      try {
        for (const q of questionsToUpdate) {
          await api.updateQuestion(q.id, {
            ...q,
            status: 'published',
            source: publishedSource,
            isSystem: true,
            isPublished: true
          } as any);
        }
        alert(`Successfully published ${idsToPublish.length} question(s) to Published Questions!`);
      } catch (err) {
        console.error('Failed bulk publish:', err);
      } finally {
        loadMetadataAndQuestions();
      }
    }
  };

  const handleSendForApproval = async () => {
    if (selectedIds.length === 0) return;
    
    const idsToSend = [...selectedIds];
    const questionsToUpdate = questions.filter(q => idsToSend.includes(q.id));

    // Validate that questions have a valid subject
    const invalidQuestions = questionsToUpdate.filter(q => !q.subject || q.subject.toLowerCase() === 'general');
    if (invalidQuestions.length > 0) {
      alert(`Validation Error: ${invalidQuestions.length} question(s) are missing a valid subject. Please assign subjects to these questions before sending for approval.`);
      return;
    }

    if (confirm(`Send ${selectedIds.length} selected question(s) to their respective Faculty for approval?`)) {
      setQuestions(prev =>
        prev.map(q => {
          if (idsToSend.includes(q.id)) {
            const targetSubject = q.subject || 'Unknown';
            return { ...q, source: `pending:${targetSubject}` };
          }
          return q;
        })
      );
      setSelectedIds([]);

      try {
        for (const q of questionsToUpdate) {
          const targetSubject = q.subject || 'Unknown';
          await api.updateQuestion(q.id, {
            ...q,
            source: `pending:${targetSubject}`
          } as any);
        }
        alert(`Successfully sent ${idsToSend.length} question(s) for approval!`);
      } catch (err) {
        console.error('Failed to send for approval:', err);
      } finally {
        loadMetadataAndQuestions();
      }
    }
  };

  const handleBulkUnpublish = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Move ${selectedIds.length} selected question(s) back to Saved Questions?`)) {
      const idsToSave = [...selectedIds];
      const questionsToUpdate = questions.filter(q => idsToSave.includes(q.id));

      setPersistedStatusMultiple(idsToSave, 'saved');
      setQuestions(prev =>
        prev.map(q =>
          idsToSave.includes(q.id)
            ? { ...q, status: 'saved', source: 'saved', isSystem: false, isPublished: false }
            : q
        )
      );
      setSelectedIds([]);

      try {
        for (const q of questionsToUpdate) {
          await api.updateQuestion(q.id, {
            ...q,
            status: 'saved',
            source: 'saved',
            isSystem: false,
            isPublished: false
          } as any);
        }
        alert(`Successfully moved ${idsToSave.length} question(s) back to Saved Questions!`);
      } catch (err) {
        console.error('Failed bulk unpublish:', err);
      } finally {
        loadMetadataAndQuestions();
      }
    }
  };

  const handleFastDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (confirm('Delete this question from your question bank?')) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));

      try {
        await api.deleteQuestion(id);
      } catch (err) {
        console.error('Failed to delete question on server:', err);
        loadMetadataAndQuestions();
      }
    }
  };

  const handleFastPreview = async (q: Question, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewQuestion(q);
    setIsPreviewOpen(true);
    try {
      if (q.id) {
        const fullDetail = await api.getQuestion(q.id);
        if (fullDetail) {
          setPreviewQuestion(fullDetail);
        }
      }
    } catch {
      // Fallback
    }
  };


  const handleEditQuestion = async (q: Question, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onOpenCreateQuestion) return;
    try {
      if (q.id) {
        const fullDetail = await api.getQuestion(q.id);
        if (fullDetail) {
          onOpenCreateQuestion(fullDetail);
          return;
        }
      }
    } catch {
      // Fallback
    }
    onOpenCreateQuestion(q);
  };

  const handleGeneratePdfStream = () => {
    const paperElem = document.querySelector('.printable-paper-sheet');
    if (!paperElem) {
      window.print();
      return;
    }

    const existingRoot = document.getElementById('print-paper-export-root');
    if (existingRoot) existingRoot.remove();

    const printRoot = document.createElement('div');
    printRoot.id = 'print-paper-export-root';
    
    // Deep clone the paper node and remove any interactive zoom/transform
    const clonedEl = paperElem.cloneNode(true) as HTMLElement;
    clonedEl.style.transform = 'none';
    clonedEl.style.margin = '0 auto';
    clonedEl.style.boxShadow = 'none';
    clonedEl.style.border = 'none';
    clonedEl.style.maxWidth = '100%';
    clonedEl.style.width = '100%';
    
    printRoot.appendChild(clonedEl);
    document.body.appendChild(printRoot);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const cleanupRoot = document.getElementById('print-paper-export-root');
        if (cleanupRoot) cleanupRoot.remove();
      }, 1000);
    }, 200);
  };

  const getCleanQuestionText = (htmlText?: string) => {
    if (!htmlText) return 'Question statement text';
    const clean = cleanHtmlTags(htmlText);
    return clean || 'Question statement text';
  };

  // Available chapters filtered by selected subject
  const availableChapters = chapters.filter(c => {
    if (selectedSubject === 'all') return true;
    const subName = (c.subject_name || c.subject || c.subjects?.name || '').toLowerCase();
    const subId = (c.subject_id || c.subjectId || '').toLowerCase();
    const targetSubLower = selectedSubject.toLowerCase();
    return subName === targetSubLower || subName.includes(targetSubLower) || targetSubLower.includes(subName) || subId === targetSubLower;
  });

  const filteredList = questions.filter(q => {
    // Mode Scoping (All vs Saved vs Published vs Approvals)
    if (mode === 'saved' && !isQuestionSaved(q)) return false;
    if (mode === 'published' && !isQuestionPublished(q)) return false;
    if (mode === 'approvals') {
      if (user.role === 'admin') {
        if (adminApprovalTab === 'sent') {
          if (!isQuestionPending(q)) return false;
        } else {
          // received: published by faculty (not System Admin)
          if (!isQuestionPublished(q)) return false;
          if (q.source === 'published:System Admin') return false;
        }
      } else {
        if (!isQuestionPending(q)) return false;
        if (userSubject !== 'All') {
          const expectedPending = `pending:${userSubject}`;
          if (q.source !== expectedPending) return false;
        }
      }
    }

    // 1. Subject Filter (when selected by user)
    if (selectedSubject !== 'all') {
      const targetSubLower = selectedSubject.toLowerCase();
      const qSubLower = (q.subject || (q as any).subject_name || '').toLowerCase();
      const qSubId = String((q as any).subject_id || (q as any).subjectId || '').toLowerCase();
      const matches =
        qSubLower === targetSubLower ||
        qSubLower.includes(targetSubLower) ||
        targetSubLower.includes(qSubLower) ||
        qSubId === targetSubLower;
      if (!matches) return false;
    }

    // 2. Chapter Filter Dropdown or Active Selected Chapter
    const activeChapterId = selectedChapterFilter !== 'all' ? selectedChapterFilter : (selectedChapter?.id || '');
    const activeChapterTitle = selectedChapterFilter !== 'all' ? '' : (selectedChapter?.title || '');

    if (activeChapterId || activeChapterTitle) {
      const targetCh = chapters.find(c => c.id === activeChapterId || c.title === activeChapterId || c.title === activeChapterTitle);
      const chTitle = (targetCh?.title || activeChapterTitle || activeChapterId).toLowerCase();
      const chId = (targetCh?.id || activeChapterId).toLowerCase();
      const qChId = String((q as any).chapter_id || (q as any).chapterId || '').toLowerCase();
      const qChapter = String((q as any).chapter || (q as any).chapter_name || (q as any).topic || '').toLowerCase();
      const code = formatQuestionCode(q).toLowerCase();

      let codeMatches = false;
      if (chTitle.includes('living world') && (code.includes('liv') || code.includes('01'))) codeMatches = true;
      if (chTitle.includes('animal kingdom') && (code.includes('ani') || code.includes('02'))) codeMatches = true;
      if (chTitle.includes('thermodynamics') && (code.includes('the') || code.includes('02'))) codeMatches = true;
      if (chTitle.includes('basic concepts') && (code.includes('sbc') || code.includes('01'))) codeMatches = true;
      if (chTitle.includes('motion in a plane') && (code.includes('mip') || code.includes('02'))) codeMatches = true;
      if (chTitle.includes('units and measurements') && (code.includes('uam') || code.includes('01'))) codeMatches = true;

      const matches =
        (chId && qChId && (qChId === chId || qChId.includes(chId) || chId.includes(qChId))) ||
        (chTitle && qChapter && (qChapter === chTitle || qChapter.includes(chTitle) || chTitle.includes(qChapter))) ||
        codeMatches;

      if (!matches) return false;
    }

    // 3. Search Text Filter
    if (search.trim()) {
      const s = search.toLowerCase();
      const code = formatQuestionCode(q).toLowerCase();
      const statement = getCleanQuestionText(q.rawText).toLowerCase();
      const qSub = (q.subject || '').toLowerCase();
      const qCh = String((q as any).chapter || (q as any).topic || '').toLowerCase();
      if (!code.includes(s) && !statement.includes(s) && !qSub.includes(s) && !qCh.includes(s)) return false;
    }

    // 4. Status Filter
    if (statusFilter === 'Draft' && q.isSystem) return false;
    if (statusFilter === 'Published' && !q.isSystem) return false;

    // 5. Image & Diagram Media Filter
    if (imageFilter === 'with_image' && !hasQuestionImage(q)) return false;
    if (imageFilter === 'without_image' && hasQuestionImage(q)) return false;

    return true;
  });

  const currentPreviewIndex = previewQuestion
    ? filteredList.findIndex(q => q.id === previewQuestion.id)
    : -1;

  const handlePrevQuestion = () => {
    if (currentPreviewIndex > 0) {
      handleFastPreview(filteredList[currentPreviewIndex - 1]);
    }
  };

  const handleNextQuestion = () => {
    if (currentPreviewIndex >= 0 && currentPreviewIndex < filteredList.length - 1) {
      handleFastPreview(filteredList[currentPreviewIndex + 1]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 font-sans animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
            {mode === 'saved' ? 'Saved Questions' : mode === 'published' ? 'Published Questions' : mode === 'approvals' ? 'Approvals' : 'Question Bank'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {mode === 'saved'
              ? `Manage newly created draft and saved questions (${filteredList.length} questions displayed). Select questions to send for approval or publish.`
              : mode === 'published'
              ? `View active published question repository (${filteredList.length} questions displayed). Select questions to move back to Saved Questions.`
              : mode === 'approvals'
              ? `Review questions sent to you for approval (${filteredList.length} pending). Select questions to publish them.`
              : `Manage, preview, and organize your question repository (${filteredList.length} questions displayed of ${questions.length} total).`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          {selectedIds.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-teal-50/90 border border-teal-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-900 shadow-2xs animate-in fade-in duration-150">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              <span>{selectedIds.length} Selected</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-teal-700 hover:text-teal-950 underline ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Live Refresh Button */}
          <button
            type="button"
            onClick={() => loadMetadataAndQuestions(true)}
            disabled={isRefreshing || loading}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            title="Refresh Questions Live from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Primary Create Question Button */}
          <button
            type="button"
            onClick={() => onOpenCreateQuestion && onOpenCreateQuestion()}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4" />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* Admin Approvals Executive Segmented Card Tabs */}
      {mode === 'approvals' && user.role === 'admin' && (
        <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 inline-flex flex-wrap items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              adminApprovalTab === 'sent'
                ? 'bg-white text-teal-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            onClick={() => {
              setAdminApprovalTab('sent');
              setSelectedIds([]);
            }}
          >
            <span>Sent (Pending Faculty Approval)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
              {questions.filter(q => typeof q.source === 'string' && q.source.startsWith('pending:')).length || filteredList.length}
            </span>
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              adminApprovalTab === 'received'
                ? 'bg-white text-teal-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            onClick={() => {
              setAdminApprovalTab('received');
              setSelectedIds([]);
            }}
          >
            <span>Received (Published by Faculty)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
              {questions.filter(q => typeof q.source === 'string' && q.source.startsWith('published:')).length}
            </span>
          </button>
        </div>
      )}

      {/* Chapter Filter Active Banner */}
      {selectedChapter && selectedChapter.title && (
        <div className="bg-teal-50/90 border border-teal-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-teal-900 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-teal-950">Active Chapter Banner:</span>
            <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-md font-mono font-bold text-[11px]">
              {selectedChapter.title}
            </span>
            <span className="text-teal-800 font-bold ml-1">
              — {filteredList.length > 0 ? `${filteredList.length} question(s) found for this topic.` : '0 questions exist.'}
            </span>
          </div>
          {onClearChapterFilter && (
            <button
              type="button"
              onClick={() => {
                setSelectedChapterFilter('all');
                if (onClearChapterFilter) onClearChapterFilter();
              }}
              className="px-3 py-1 bg-white hover:bg-teal-100 border border-teal-300 text-teal-800 font-bold rounded-md transition-colors cursor-pointer text-xs self-start sm:self-auto"
            >
              Clear Banner Filter
            </button>
          )}
        </div>
      )}

      {/* Search & Comprehensive Filter Row */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Instant Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by code, keyword, or statement..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white text-slate-900 shadow-2xs"
            />
          </div>

          {/* Subject Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedSubject}
              onChange={e => {
                setSelectedSubject(e.target.value);
                setSelectedChapterFilter('all');
              }}
              disabled={userSubject !== 'All'}
              className="w-full py-2.5 px-3 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white text-slate-900 font-semibold cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed shadow-2xs"
            >
              {userSubject === 'All' && <option value="all">All Subjects</option>}
              {subjects.map(s => (
                <option key={s.id || s.name} value={s.name}>
                  {s.name} ({s.code || s.name.substring(0, 3)})
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedChapterFilter}
              onChange={e => setSelectedChapterFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white text-slate-900 font-semibold cursor-pointer shadow-2xs"
            >
              <option value="all">All Chapters</option>
              {availableChapters.map(c => (
                <option key={c.id || c.title} value={c.id || c.title}>
                  {c.title} ({c.code || 'CH'})
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter Dropdown */}
          <div className="relative">
            <select
              value={difficultyFilter}
              onChange={e => setDifficultyFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white text-slate-900 font-semibold cursor-pointer shadow-2xs"
            >
              <option value="all">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Image & Diagram Media Filter Dropdown */}
          <div className="relative">
            <select
              value={imageFilter}
              onChange={e => setImageFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white text-slate-900 font-semibold cursor-pointer shadow-2xs"
            >
              <option value="all">All Media</option>
              <option value="with_image">🖼️ With Images</option>
              <option value="without_image">📝 No Images (Text)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        {(selectedSubject !== 'all' || selectedChapterFilter !== 'all' || difficultyFilter !== 'all' || imageFilter !== 'all' || search.trim()) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>
                Filters applied: 
                {selectedSubject !== 'all' && <b className="text-teal-700 ml-1">Subject: {selectedSubject}</b>}
                {selectedChapterFilter !== 'all' && <b className="text-teal-700 ml-1">· Chapter: {chapters.find(c => c.id === selectedChapterFilter)?.title || selectedChapterFilter}</b>}
                {difficultyFilter !== 'all' && <b className="text-teal-700 ml-1">· Difficulty: {difficultyFilter}</b>}
                {imageFilter === 'with_image' && <b className="text-teal-700 ml-1">· 🖼️ With Images</b>}
                {imageFilter === 'without_image' && <b className="text-teal-700 ml-1">· 📝 Text Only</b>}
                {search.trim() && <b className="text-teal-700 ml-1">· Search: "{search}"</b>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('all');
                setSelectedChapterFilter('all');
                setDifficultyFilter('all');
                setImageFilter('all');
                setStatusFilter('all');
                setSearch('');
                if (onClearChapterFilter) onClearChapterFilter();
              }}
              className="text-teal-700 hover:text-teal-900 hover:underline cursor-pointer self-start sm:self-auto font-bold"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Selection Feedback & Select All Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-teal-50/90 border border-teal-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-teal-950 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span>
                <b>{selectedIds.length}</b> question{selectedIds.length > 1 ? 's' : ''} selected.
              </span>
              {selectedIds.length < filteredList.length && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="ml-2 font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                >
                  Select all {filteredList.length} questions
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-teal-800 hover:text-teal-950 font-bold underline cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Questions Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">Question & Code</th>
                <th className="px-5 py-3.5">Subject & Chapter</th>
                <th className="px-5 py-3.5">Difficulty</th>
                <th className="px-5 py-3.5">Marks</th>
                <th className="px-5 py-3.5 text-right">Instant Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-semibold">
                    Loading questions from bank...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <p className="text-slate-700 font-bold text-sm">
                        No questions match your current subject or chapter filter.
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        Try selecting "All Subjects" / "All Chapters" or click "Create Question".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((q, idx) => {
                  const isSelected = selectedIds.includes(q.id);
                  const qChapterName = (q as any).chapter_name || (q as any).chapter || (q as any).topic || 'General Chapter';

                  return (
                    <tr
                      key={q.id || idx}
                      onClick={() => handleFastPreview(q as Question)}
                      className={`hover:bg-teal-50/40 transition-colors cursor-pointer group ${isSelected ? 'bg-teal-50/50' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => toggleSelectQuestion(q.id, e as any)}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Question Statement & Dynamic Code */}
                      <td className="px-5 py-3.5 max-w-md">
                        <div className="flex items-center gap-2">
                          <b className="text-[#007a87] font-mono text-[11px] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-black shrink-0">
                            {formatQuestionCode(q)}
                          </b>
                        </div>
                        <span className="text-slate-900 font-semibold line-clamp-2 mt-1 block">
                          <MathTextRenderer text={getCleanQuestionText(q.rawText)} />
                        </span>
                      </td>

                      {/* Subject & Chapter Badges */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 flex flex-col items-start">
                          <span className="inline-block font-bold text-[11px] text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md">
                            {q.subject || 'General'}
                          </span>
                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                            {qChapterName}
                          </p>
                          {typeof q.source === 'string' && q.source.startsWith('published:') && (
                            <span className="inline-block font-black text-[9.5px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Published by {q.source.replace('published:', '')}
                            </span>
                          )}
                          {typeof q.source === 'string' && q.source.startsWith('pending:') && (
                            <span className="inline-block font-black text-[9.5px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Pending Approval
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Difficulty */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            (q.difficulty || '').toLowerCase() === 'easy'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (q.difficulty || '').toLowerCase() === 'hard'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {q.difficulty || 'Medium'}
                        </span>
                      </td>

                      {/* Marks */}
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono">
                          +{q.marks || 4} / -{q.negativeMarks || 1}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Instant Fast Preview Button */}
                          <button
                            type="button"
                            onClick={e => handleFastPreview(q as Question, e)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-teal-50 text-teal-700 font-bold text-xs rounded-lg transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Instant Preview Question"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={e => handleEditQuestion(q as Question, e)}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Edit Question"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Instant Fast Delete Button */}
                          <button
                            type="button"
                            onClick={e => q.id && handleFastDelete(q.id, e)}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Instant Fast Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fast Preview Drawer */}
      <StudentPreviewDrawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        question={previewQuestion}
        onNext={handleNextQuestion}
        onPrevious={handlePrevQuestion}
        hasPrevious={currentPreviewIndex > 0}
        hasNext={currentPreviewIndex >= 0 && currentPreviewIndex < filteredList.length - 1}
        currentIndex={currentPreviewIndex >= 0 ? currentPreviewIndex : undefined}
        totalQuestions={filteredList.length}
      />

      {/* ========================================================================= */}
      {/* FLOATING ACTION DOCK (Light Glassmorphism matching EduForge brand)       */}
      {/* ========================================================================= */}
      {selectedIds.length > 0 && !isPdfModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] animate-in slide-in-from-bottom-5 fade-in zoom-in-95 duration-300 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-slate-800 ring-1 ring-slate-900/5">
            {/* Left Status & Selection Count */}
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-black rounded-full font-mono flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                {selectedIds.length} Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs font-bold text-slate-400 hover:text-slate-800 underline cursor-pointer transition-colors"
                title="Clear selection (Esc)"
              >
                Clear
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            {/* Middle Contextual Action Buttons */}
            <div className="flex items-center gap-2">
              {mode === 'saved' && (
                <>
                  <button
                    type="button"
                    onClick={handleSendForApproval}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-600" />
                    <span>Send for Approval</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkPublish}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Publish Selected</span>
                  </button>
                </>
              )}

              {mode === 'approvals' && (
                <button
                  type="button"
                  onClick={handleBulkPublish}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Approve & Publish</span>
                </button>
              )}

              {mode === 'published' && (
                <button
                  type="button"
                  onClick={handleBulkUnpublish}
                  className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                  <span>Move to Saved</span>
                </button>
              )}

              {/* PDF Generator Button (White Card Style) */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-4 py-2 bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-teal-700" />
                <span>Create PDF</span>
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            {/* Quick Esc Helper & Close */}
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="hidden md:inline font-mono opacity-70 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-bold">ESC</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Dismiss selection (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEXT-GEN EXAM PAPER STUDIO & PDF EXPORTER MODAL                            */}
      {/* ========================================================================= */}
      {isPdfModalOpen && (() => {
        const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
        const distinctSubjects = Array.from(new Set(selectedQuestions.map(q => q.subject || 'General').filter(Boolean)));
        const selectedSubjectNames = distinctSubjects.join(', ') || 'Mixed Subjects';
        const computedTotalMarks = selectedQuestions.reduce((acc, q) => acc + (q.marks || 4), 0);

        // Build Sections: either grouped by subject or unified
        let computedSections: any[] = [];
        let globalQIndex = 1;
        const allComputedQuestions: any[] = [];

        if (studioGroupBySubject && distinctSubjects.length > 1) {
          computedSections = distinctSubjects.map((sub, idx) => {
            const secQs = selectedQuestions.filter(q => (q.subject || 'General') === sub);
            const mappedSecQs = secQs.map(q => {
              const qObj = {
                id: q.id,
                questionNumber: globalQIndex++,
                rawText: q.rawText || (typeof q.content === 'string' ? q.content : '') || '',
                content: q.content,
                options: q.options || [],
                correctOption: (q as any).correct_option || (q as any).correctOption || q.correctAnswer || 'A',
                correctAnswer: (q as any).correct_option || (q as any).correctOption || q.correctAnswer || 'A',
                marks: q.marks || 4,
                negativeMarks: q.negativeMarks || 1,
                diagramSvg: q.diagramSvg || (q as any).diagram_svg,
                imageUrl: q.imageUrl || q.diagramUrl,
                explanationText: q.explanationText || (q as any).solution || (q as any).explanation || '',
                solution: q.explanationText || (q as any).solution || (q as any).explanation || '',
                sectionId: `sec-${idx + 1}`,
                sectionName: `Part ${String.fromCharCode(65 + idx)}: ${sub.toUpperCase()} (MCQ)`,
                subject: sub
              };
              allComputedQuestions.push(qObj);
              return qObj;
            });

            return {
              id: `sec-${idx + 1}`,
              name: `Part ${String.fromCharCode(65 + idx)}: ${sub.toUpperCase()} (MCQ)`,
              instructions: `All questions are compulsory in this section.`,
              subject: sub,
              questions: mappedSecQs
            };
          });
        } else {
          const mappedQs = selectedQuestions.map(q => {
            const qObj = {
              id: q.id,
              questionNumber: globalQIndex++,
              rawText: q.rawText || (typeof q.content === 'string' ? q.content : '') || '',
              content: q.content,
              options: q.options || [],
              correctOption: (q as any).correct_option || (q as any).correctOption || q.correctAnswer || 'A',
              correctAnswer: (q as any).correct_option || (q as any).correctOption || q.correctAnswer || 'A',
              marks: q.marks || 4,
              negativeMarks: q.negativeMarks || 1,
              diagramSvg: q.diagramSvg || (q as any).diagram_svg,
              imageUrl: q.imageUrl || q.diagramUrl,
              explanationText: q.explanationText || (q as any).solution || (q as any).explanation || '',
              solution: q.explanationText || (q as any).solution || (q as any).explanation || '',
              sectionId: 'sec-1',
              sectionName: 'Comprehensive Question Paper',
              subject: q.subject || 'General'
            };
            allComputedQuestions.push(qObj);
            return qObj;
          });

          computedSections = [{
            id: 'sec-1',
            name: 'Selected Questions',
            questions: mappedQs
          }];
        }

        const estPageCount = Math.max(1, Math.ceil(selectedQuestions.length / (studioColumnLayout === '2-column' ? (studioFontSize === 'compact' ? 14 : 10) : 6)));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1380px] h-[95vh] flex flex-col overflow-hidden ring-1 ring-slate-900/10">
              
              {/* ================================================================= */}
              {/* TOP STUDIO TOOLBAR (Clean EduForge Aesthetic)                    */}
              {/* ================================================================= */}
              <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 select-none">
                {/* Left Brand & Details */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                        Exam Paper Studio
                      </h3>
                      <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-full">
                        {selectedQuestions.length} Questions Selected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Est. ~{estPageCount} A4 Pages • Total Marks: {computedTotalMarks} • {selectedSubjectNames}
                    </p>
                  </div>
                </div>

                {/* Center Quick Switchers (Mode, Layout, Presets) */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Mode Switcher (Student vs Answer Key) */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-inner">
                    <button
                      type="button"
                      onClick={() => setStudioMode('student')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        studioMode === 'student'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Student Question Paper (No Answers Marked)"
                    >
                      Student Paper
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioMode('teacher_key')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        studioMode === 'teacher_key'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Teacher Master Key (With Answer Grid)"
                    >
                      Answer Key
                    </button>
                  </div>

                  {/* Layout Columns Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-inner">
                    <button
                      type="button"
                      onClick={() => setStudioColumnLayout('2-column')}
                      className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        studioColumnLayout === '2-column'
                          ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="2-Column Layout (Dense Authentic Exam Paper)"
                    >
                      <Columns className="w-3.5 h-3.5" /> 2-Col
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioColumnLayout('1-column')}
                      className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        studioColumnLayout === '1-column'
                          ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="1-Column Layout (Spacious Single Column)"
                    >
                      <Square className="w-3.5 h-3.5" /> 1-Col
                    </button>
                  </div>

                  {/* Header Preset Dropdown */}
                  <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
                    <span className="text-[10px] font-bold text-slate-400 mr-1.5 uppercase tracking-wider">Style:</span>
                    <select
                      value={studioHeaderPreset}
                      onChange={e => setStudioHeaderPreset(e.target.value as HeaderPresetType)}
                      className="bg-transparent text-slate-800 font-bold outline-hidden cursor-pointer text-xs"
                    >
                      <option value="classic_boxed">Classic College Boxed</option>
                      <option value="modern_elite">Modern Elite</option>
                      <option value="nta_neet_jee">NTA NEET / JEE Booklet</option>
                      <option value="minimal">Minimal Academic</option>
                    </select>
                  </div>

                  {/* Subject Auto-Group Toggle */}
                  {distinctSubjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setStudioGroupBySubject(!studioGroupBySubject)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        studioGroupBySubject
                          ? 'bg-teal-50 border-teal-300 text-teal-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Automatically split into Subject Sections"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600" /> Subject Split: {studioGroupBySubject ? 'ON' : 'OFF'}
                    </button>
                  )}

                  {/* Question Code Toggle */}
                  <button
                    type="button"
                    onClick={() => setStudioShowQuestionCode(!studioShowQuestionCode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      studioShowQuestionCode
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Toggle displaying question code in test paper & PDF export"
                  >
                    <Tag className="w-3.5 h-3.5 text-indigo-600" /> Q-Code {studioShowQuestionCode ? 'ON' : 'OFF'}
                  </button>

                  {/* Customize Header Button */}
                  <button
                    type="button"
                    onClick={() => setIsStudioSettingsOpen(!isStudioSettingsOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      isStudioSettingsOpen
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" /> Customize Details {isStudioSettingsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Right Zoom & Close */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-slate-100 rounded-xl border border-slate-200 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setStudioZoom(Math.max(60, studioZoom - 10))}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-mono text-[11px] text-slate-700 font-bold">{studioZoom}%</span>
                    <button
                      type="button"
                      onClick={() => setStudioZoom(Math.min(140, studioZoom + 10))}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setIsPdfModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ================================================================= */}
              {/* COLLAPSIBLE LIVE CUSTOMIZATION DRAWER                             */}
              {/* ================================================================= */}
              {isStudioSettingsOpen && (
                <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 animate-in slide-in-from-top-2 duration-200 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Institution / College Name</label>
                    <input
                      type="text"
                      value={studioInstituteName}
                      onChange={e => setStudioInstituteName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Exam Title</label>
                    <input
                      type="text"
                      value={studioExamTitle}
                      onChange={e => setStudioExamTitle(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Standard / Grade</label>
                    <input
                      type="text"
                      value={studioStandard}
                      onChange={e => setStudioStandard(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Paper Set Code</label>
                    <input
                      type="text"
                      value={studioPaperSet}
                      onChange={e => setStudioPaperSet(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Exam Date</label>
                    <input
                      type="text"
                      value={studioDate}
                      onChange={e => setStudioDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={studioDuration}
                      onChange={e => setStudioDuration(Number(e.target.value) || 60)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Font Density</label>
                    <select
                      value={studioFontSize}
                      onChange={e => setStudioFontSize(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-600 outline-hidden cursor-pointer"
                    >
                      <option value="compact">Compact (Paper Saver)</option>
                      <option value="normal">Balanced Standard</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 pt-3">
                    <label className="flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={studioShowWatermark}
                        onChange={e => setStudioShowWatermark(e.target.checked)}
                        className="rounded text-teal-700"
                      />
                      Watermark:
                    </label>
                    <input
                      type="text"
                      value={studioWatermarkText}
                      disabled={!studioShowWatermark}
                      onChange={e => setStudioWatermarkText(e.target.value)}
                      placeholder="e.g. NEET PREP"
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 disabled:opacity-50 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-2 pt-3">
                    <label className="flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={studioShowQuestionCode}
                        onChange={e => setStudioShowQuestionCode(e.target.checked)}
                        className="rounded text-indigo-700"
                      />
                      Show Question Code in Paper / PDF
                    </label>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* MAIN STUDIO CANVAS AREA (Realistic A4 Simulation)                */}
              {/* ================================================================= */}
              <div className="p-3 sm:p-8 overflow-y-auto flex-1 bg-slate-100/90 relative flex justify-center items-start">
                <div
                  className="printable-paper-sheet w-full max-w-[860px] mx-auto bg-white border border-slate-300/80 rounded-lg shadow-xl overflow-hidden transition-transform duration-150 origin-top"
                  style={{
                    transform: studioZoom !== 100 ? `scale(${studioZoom / 100})` : 'none',
                    marginBottom: studioZoom > 100 ? `${(studioZoom - 100) * 10}px` : '0px'
                  }}
                >
                  <CollegeExamPaper
                    instituteName={studioInstituteName}
                    examTitle={studioExamTitle}
                    subtitle={studioSubtitle}
                    subjectNames={selectedSubjectNames}
                    standard={studioStandard}
                    paperSet={studioPaperSet}
                    date={studioDate}
                    duration={studioDuration}
                    totalMarks={computedTotalMarks}
                    sections={computedSections}
                    allQuestions={allComputedQuestions}
                    headerPreset={studioHeaderPreset}
                    isAnswerKeyMode={studioMode === 'teacher_key'}
                    showWatermark={studioShowWatermark}
                    watermarkText={studioWatermarkText}
                    columnLayout={studioColumnLayout}
                    fontSize={studioFontSize}
                    instructionsText={studioInstructions}
                    showQuestionCode={studioShowQuestionCode}
                  />
                </div>
              </div>

              {/* ================================================================= */}
              {/* STUDIO FOOTER ACTION BAR                                          */}
              {/* ================================================================= */}
              <div className="px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between bg-white gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPdfModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Close
                  </button>

                  <span className="hidden sm:inline text-xs text-slate-500 font-medium">
                    Layout: <b className="text-slate-800 capitalize">{studioColumnLayout}</b> • Mode: <b className="text-slate-800 capitalize">{studioMode === 'teacher_key' ? 'Answer Key' : 'Student Paper'}</b>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleGeneratePdfStream}
                    className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Export PDF / Print Paper
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
