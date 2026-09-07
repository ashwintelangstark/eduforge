import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { apiCache } from '../services/apiCache.js';
import { Question, DocumentModel, DocumentSection } from '@eduforge/shared';
import {
  Plus, Check, X, Printer, Download, Eye, FileText,
  HelpCircle, Shuffle, Award, Search, ArrowRight, ArrowLeft, Layers, CheckCircle2,
  Columns, Droplet, Building2, Sparkles, Tag, Hash, RotateCw, RefreshCw
} from 'lucide-react';
import { formatQuestionCode } from '../utils/questionCode.js';
import { MathTextRenderer } from '../equation/MathTextRenderer.js';
import { OptionLayoutRenderer } from '../questions/OptionLayoutRenderer.js';
import { getUserProfile } from '../utils/userProfile.js';
import { CollegeExamPaper } from '../components/CollegeExamPaper.js';
import { hasQuestionImage } from './QuestionBankPage.js';

export interface SectionConfig {
  id: string;
  name: string;
  questionsCount: number | string;
  subject?: string;
  chapter?: string;
}

/**
 * Props for GenerateTestPage component:
 * - initialDocument: Optional existing test paper document passed in for editing.
 * - onOpenDocument: Callback to navigate directly to the interactive test editor.
 * - onNavigateToTests: Callback to transition the user to the Tests listing page after publishing.
 */
interface GenerateTestPageProps {
  initialDocument?: DocumentModel | null;
  onOpenDocument?: (docId: string) => void;
  onNavigateToTests?: () => void;
}

/**
 * GenerateTestPage Component
 * 
 * Provides a 4-step interactive wizard for creating, configuring, and publishing test papers:
 * 1. Configure: Test metadata, exam type (NEET/JEE/KCET), subject, chapter, duration, and marking scheme.
 * 2. Select Questions: Manual or automated question selection from the question bank with live filters.
 * 3. Preview: Real-time printable preview matching academic exam formatting.
 * 4. Publish: Saves the test paper document to Supabase and lists it in the Tests section.
 */
export const GenerateTestPage: React.FC<GenerateTestPageProps> = ({
  initialDocument,
  onOpenDocument,
  onNavigateToTests
}) => {
  // Current logged in user profile (for subject permission gating)
  const user = getUserProfile();

  // ==========================================
  // Backend & Metadata State
  // ==========================================
  const [questions, setQuestions] = useState<Question[]>([]); // Questions fetched from Question Bank
  const [subjects, setSubjects] = useState<any[]>([]); // Subjects fetched from backend
  const [chapters, setChapters] = useState<any[]>([]); // Chapters fetched from backend
  const [loading, setLoading] = useState<boolean>(true); // Loading indicator during API fetch
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Wizard active step (1: Configure, 2: Select Questions, 3: Preview, 4: Publish)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // User Subject scope (e.g., 'Biology', 'Physics', 'Chemistry', or 'All' for admin)
  const userSubject = user.assigned_subject;

  // ==========================================
  // Form Configuration State (Step 1)
  // ==========================================
  const [testName, setTestName] = useState<string>('NEET WEEKLY TEST (PCBM) PUC 1');
  const [examType, setExamType] = useState<string>('NEET');
  const [selectedSubject, setSelectedSubject] = useState<string>(userSubject !== 'All' ? userSubject : 'Biology');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number | string>(180);

  // College Exam Paper Layout & Header Customization
  const [instituteName, setInstituteName] = useState<string>('NLE SOCIETYS Dr RB PATIL MAHESH PU COLLEGE');
  const [isEditingInstitute, setIsEditingInstitute] = useState<boolean>(false);
  const [paperSet, setPaperSet] = useState<string>('1');
  const [standardName, setStandardName] = useState<string>('11 / PUC 1');
  const [columnLayout, setColumnLayout] = useState<'2-column' | '1-column'>('2-column');
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkText, setWatermarkText] = useState<string>('Test');
  const [showQuestionCode, setShowQuestionCode] = useState<boolean>(false);
  
  // ==========================================
  // Marking Scheme Configuration State
  // ==========================================
  const [marksPerQuestion, setMarksPerQuestion] = useState<number | string>(4); // Marks awarded for correct answer
  const [negativeMarks, setNegativeMarks] = useState<number | string>(-1); // Marks deducted for incorrect answer
  const [unansweredMarks, setUnansweredMarks] = useState<number | string>(0); // Marks for unanswered questions

  // ==========================================
  // Question Bank Selection & Filter State (Step 2)
  // ==========================================
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]); // Array of selected question UUIDs/codes
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(userSubject !== 'All' ? userSubject : 'all'); // Filter questions by subject
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('all'); // Filter questions by chapter
  const [searchQuery, setSearchQuery] = useState<string>(''); // Search input query for filtering questions
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All'); // Difficulty filter: All | Easy | Medium | Hard
  const [imageFilter, setImageFilter] = useState<'all' | 'with_image' | 'without_image'>('all'); // Image filter: all | with_image | without_image

  // ==========================================
  // Auto-Distribution Percentage Rules (Synced to 100%)
  // ==========================================
  const [easyPercent, setEasyPercent] = useState<number>(30);
  const [mediumPercent, setMediumPercent] = useState<number>(50);
  const [hardPercent, setHardPercent] = useState<number>(20);

  const handleEasyPercentChange = (val: number) => {
    const E = Math.max(0, Math.min(100, Math.round(val)));
    const oldM = mediumPercent;
    const oldH = hardPercent;
    const remaining = 100 - E;
    const oldOtherSum = oldM + oldH;

    let newM = 0;
    let newH = 0;

    if (oldOtherSum > 0) {
      newM = Math.round((oldM / oldOtherSum) * remaining);
      newH = remaining - newM;
    } else {
      newM = Math.round(remaining / 2);
      newH = remaining - newM;
    }

    setEasyPercent(E);
    setMediumPercent(newM);
    setHardPercent(newH);
  };

  const handleMediumPercentChange = (val: number) => {
    const M = Math.max(0, Math.min(100, Math.round(val)));
    const oldE = easyPercent;
    const oldH = hardPercent;
    const remaining = 100 - M;
    const oldOtherSum = oldE + oldH;

    let newE = 0;
    let newH = 0;

    if (oldOtherSum > 0) {
      newE = Math.round((oldE / oldOtherSum) * remaining);
      newH = remaining - newE;
    } else {
      newE = Math.round(remaining / 2);
      newH = remaining - newE;
    }

    setEasyPercent(newE);
    setMediumPercent(M);
    setHardPercent(newH);
  };

  const handleHardPercentChange = (val: number) => {
    const H = Math.max(0, Math.min(100, Math.round(val)));
    const oldE = easyPercent;
    const oldM = mediumPercent;
    const remaining = 100 - H;
    const oldOtherSum = oldE + oldM;

    let newE = 0;
    let newM = 0;

    if (oldOtherSum > 0) {
      newE = Math.round((oldE / oldOtherSum) * remaining);
      newM = remaining - newE;
    } else {
      newE = Math.round(remaining / 2);
      newM = remaining - newE;
    }

    setEasyPercent(newE);
    setMediumPercent(newM);
    setHardPercent(H);
  };

  // ==========================================
  // Paper Sections & Target Section Assignment State
  // ==========================================
  const [testSections, setTestSections] = useState<SectionConfig[]>([
    { id: 'sec-1', name: 'Section A — Biology', questionsCount: 50 }
  ]);
  const [targetSectionId, setTargetSectionId] = useState<string>('sec-1');
  const [questionSectionMap, setQuestionSectionMap] = useState<Record<string, string>>({});

  // ==========================================
  // Paper Settings & Randomization Options
  // ==========================================
  const [paperSettings, setPaperSettings] = useState({
    shuffleQuestions: true, // Shuffle questions order
    shuffleOptions: true, // Shuffle options A, B, C, D order
    showQuestionCode: false, // Display question code on paper
    generateAnswerKey: true, // Generate answer key sheet
    generateSolutionPaper: false // Generate step-by-step solutions
  });

  // ==========================================
  // Subject to Chapters / Topics Mapping
  // ==========================================
  /**
   * Returns a list of stored chapters for a given subject from the Supabase database.
   */
  const getAvailableChaptersForSubject = (subjectName: string) => {
    const effectiveSubject = (!subjectName || subjectName === 'all') && userSubject !== 'All' ? userSubject : subjectName;
    if (!effectiveSubject || effectiveSubject === 'all') {
      const stored = chapters.map(c => c.name || c.title || (c as any).chapter_name).filter(Boolean);
      return Array.from(new Set(stored));
    }
    const stored = chapters
      .filter(c => {
        const cSub = (c.subject || c.subjects?.name || '').toLowerCase();
        if (cSub === effectiveSubject.toLowerCase() || cSub.includes(effectiveSubject.toLowerCase())) return true;
        const matchingSub = subjects.find(s => s.name.toLowerCase() === effectiveSubject.toLowerCase());
        if (matchingSub && (c.subject_id === matchingSub.id || c.subjectId === matchingSub.id)) return true;
        return false;
      })
      .map(c => c.name || c.title || (c as any).chapter_name)
      .filter(Boolean);

    return Array.from(new Set(stored));
  };

  /**
   * Helper to retrieve list of available subject names
   */
  const getAvailableSubjectNames = (): string[] => {
    if (subjects.length > 0) {
      return subjects.map(s => s.name);
    }
    return ['Biology', 'Physics', 'Chemistry', 'Mathematics'];
  };

  /**
   * Handles Subject change from dropdown, updating default chapter and initial section name.
   */
  const handleSubjectChange = (newSub: string) => {
    setSelectedSubject(newSub);
    const availableChapters = getAvailableChaptersForSubject(newSub);
    if (availableChapters.length > 0) {
      setSelectedChapter(availableChapters[0]);
    }
    setTestSections(prev => {
      if (prev.length <= 1) {
        return [{ id: 'sec-1', name: `Section A — ${newSub}`, questionsCount: 50, subject: newSub, chapter: availableChapters[0] || 'all' }];
      }
      return prev;
    });
  };

  // Full Screen Preview Modal State & Answer Key Mode
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isAnswerKeyMode, setIsAnswerKeyMode] = useState<boolean>(false);

  // ==========================================
  // Lifecycle Data Fetching
  // ==========================================
  useEffect(() => {
    loadBackendData();
  }, [initialDocument]);

  /**
   * Fetches questions, subjects, and chapters from the Supabase backend.
   * If an initialDocument is provided (editing mode), populates ALL fields, sections, questions and options accordingly.
   */
  const loadBackendData = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
        apiCache.invalidate('questions');
      } else {
        setLoading(true);
      }
      const params = userSubject !== 'All' ? { subject: userSubject } : undefined;
      const [qList, subList, chList] = await Promise.all([
        api.getQuestions(params, force),
        api.getSubjects(),
        api.getChapters()
      ]);
      let initialQuestions = qList || [];
      let initialSubs = subList || [];
      let initialChs = chList || [];

      if (user.role === 'faculty' && userSubject !== 'All') {
        const targetSubLower = userSubject.toLowerCase().trim();
        initialSubs = initialSubs.filter(s => (s.name || '').toLowerCase().trim() === targetSubLower || (s.code || '').toLowerCase().trim() === targetSubLower);
        initialChs = initialChs.filter(ch => {
          const sName = (ch.subject_name || ch.subject || (ch as any).subjects?.name || '').toLowerCase().trim();
          return sName === targetSubLower || sName.includes(targetSubLower) || targetSubLower.includes(sName);
        });
        initialQuestions = initialQuestions.filter(q => {
          const qSub = (q.subject || (q as any).subject_name || (q as any).subjects?.name || '').toLowerCase().trim();
          return qSub === targetSubLower || qSub.includes(targetSubLower) || targetSubLower.includes(qSub);
        });
      }

      setQuestions(initialQuestions);
      setSubjects(initialSubs);
      setChapters(initialChs);

      // If editing an existing document, populate all document fields
      if (initialDocument) {
        setTestName(initialDocument.title || '');
        if (initialDocument.metadata?.subject) {
          setSelectedSubject(initialDocument.metadata.subject);
        }
        if ((initialDocument.metadata as any)?.examType) {
          setExamType((initialDocument.metadata as any).examType);
        } else if (initialDocument.metadata?.examName) {
          const exName = initialDocument.metadata.examName.toUpperCase();
          if (exName.includes('JEE')) setExamType('JEE');
          else if (exName.includes('KCET')) setExamType('KCET');
          else setExamType('NEET');
        }
        if ((initialDocument.metadata as any)?.chapter) {
          setSelectedChapter((initialDocument.metadata as any).chapter);
        }
        if (initialDocument.metadata?.timeAllowedMinutes) {
          setDurationMinutes(Number(initialDocument.metadata.timeAllowedMinutes));
        }
        if ((initialDocument.metadata as any)?.marksPerQuestion !== undefined) {
          setMarksPerQuestion(Number((initialDocument.metadata as any).marksPerQuestion));
        }
        if ((initialDocument.metadata as any)?.negativeMarks !== undefined) {
          setNegativeMarks(Number((initialDocument.metadata as any).negativeMarks));
        }
        if ((initialDocument.metadata as any)?.unansweredMarks !== undefined) {
          setUnansweredMarks(Number((initialDocument.metadata as any).unansweredMarks));
        }
        if ((initialDocument.metadata as any)?.easyPercent !== undefined) {
          setEasyPercent(Number((initialDocument.metadata as any).easyPercent));
        }
        if ((initialDocument.metadata as any)?.mediumPercent !== undefined) {
          setMediumPercent(Number((initialDocument.metadata as any).mediumPercent));
        }
        if ((initialDocument.metadata as any)?.hardPercent !== undefined) {
          setHardPercent(Number((initialDocument.metadata as any).hardPercent));
        }

        // Settings restoration
        if (initialDocument.settings) {
          setPaperSettings(initialDocument.settings as any);
        }
        if ((initialDocument.settings as any)?.instituteName || initialDocument.metadata?.instituteName) {
          setInstituteName((initialDocument.settings as any)?.instituteName || initialDocument.metadata?.instituteName || '');
        }
        if ((initialDocument.settings as any)?.paperSet) {
          setPaperSet((initialDocument.settings as any).paperSet);
        }
        if ((initialDocument.settings as any)?.standardName) {
          setStandardName((initialDocument.settings as any).standardName);
        }
        if ((initialDocument.settings as any)?.columnLayout) {
          setColumnLayout((initialDocument.settings as any).columnLayout);
        }
        if ((initialDocument.settings as any)?.showWatermark !== undefined) {
          setShowWatermark((initialDocument.settings as any).showWatermark);
        }
        if ((initialDocument.settings as any)?.watermarkText) {
          setWatermarkText((initialDocument.settings as any).watermarkText);
        }

        // Sections & questions restoration
        if (initialDocument.sections && initialDocument.sections.length > 0) {
          const restoredSections: SectionConfig[] = initialDocument.sections.map((sec, sIdx) => {
            const secBlocks = sec.blocks || [];
            let secSubject = (sec as any).subject || '';
            if (!secSubject && sec.title && sec.title.includes('—')) {
              secSubject = sec.title.split('—')[1].trim();
            }
            if (!secSubject) {
              secSubject = initialDocument.metadata?.subject || selectedSubject;
            }

            return {
              id: sec.id || `sec-${sIdx + 1}`,
              name: sec.title || `Section ${String.fromCharCode(65 + sIdx)}`,
              questionsCount: (sec as any).targetCount || (sec as any).questionsCount || (secBlocks.length > 0 ? secBlocks.length : 50),
              subject: secSubject,
              chapter: (sec as any).chapter || (initialDocument.metadata as any)?.chapter || 'all'
            };
          });

          setTestSections(restoredSections);
          setTargetSectionId(restoredSections[0]?.id || 'sec-1');

          const restoredQMap: Record<string, string> = {};
          const restoredQIds: string[] = [];
          const embeddedQuestions: any[] = [];

          initialDocument.sections.forEach((sec, sIdx) => {
            const secId = sec.id || `sec-${sIdx + 1}`;
            sec.blocks?.forEach((b: any) => {
              const qObj = b.question || b.data?.question || b;
              const qId = qObj?.id || b.questionId || b.id;
              if (qId) {
                const strQId = String(qId);
                restoredQIds.push(strQId);
                restoredQMap[strQId] = secId;
              }
              if (qObj && (qObj.rawText || qObj.content || qObj.options)) {
                embeddedQuestions.push({
                  ...qObj,
                  id: qId || `q-${Math.random()}`,
                  rawText: qObj.rawText || (typeof qObj.content === 'string' ? qObj.content : '') || '',
                  options: qObj.options || [],
                  correctAnswer: qObj.correctAnswer || (qObj as any).correct_answer || (qObj as any).correctOption || (qObj as any).correct_option || 'A',
                  subject: qObj.subject || (sec as any).subject || initialDocument.metadata?.subject || selectedSubject,
                  chapter: qObj.chapter || (sec as any).chapter || (initialDocument.metadata as any)?.chapter || ''
                });
              }
            });
          });

          setQuestionSectionMap(restoredQMap);
          setSelectedQuestionIds(Array.from(new Set(restoredQIds)));

          // Merge questions so that all options and questions exist in questions state
          let combinedQuestions = [...initialQuestions];
          if (embeddedQuestions.length > 0) {
            const existingMap = new Map(combinedQuestions.map(q => [String(q.id), q]));
            embeddedQuestions.forEach(eq => {
              const strId = String(eq.id);
              if (existingMap.has(strId)) {
                const existing = existingMap.get(strId)!;
                existingMap.set(strId, {
                  ...existing,
                  ...eq,
                  options: (eq.options && eq.options.length > 0) ? eq.options : existing.options
                });
              } else {
                existingMap.set(strId, eq);
              }
            });
            combinedQuestions = Array.from(existingMap.values());
          }
          setQuestions(combinedQuestions);
        } else {
          setQuestions(initialQuestions);
          if (initialQuestions.length > 0) {
            setSelectedQuestionIds([initialQuestions[0].id]);
          }
        }

        setCurrentStep(2); // Open directly to Step 2: Select Questions
      } else {
        setQuestions(initialQuestions);
        if (initialQuestions.length > 0) {
          setSelectedQuestionIds([initialQuestions[0].id]);
        }
      }
    } catch (err) {
      console.error('Failed to load test generator data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ==========================================
  // Question Filtering & Selection Helpers
  // ==========================================

  // Helper to match question by subject
  const isQuestionInSubject = (q: any, subFilter: string) => {
    if (!subFilter || subFilter === 'all') return true;
    const targetSubLower = subFilter.toLowerCase().trim();
    const qSubLower = (q.subject || (q as any).subject_name || '').toLowerCase().trim();
    const qSubId = String((q as any).subject_id || (q as any).subjectId || '').toLowerCase().trim();
    if (qSubLower === targetSubLower || qSubLower.includes(targetSubLower) || targetSubLower.includes(qSubLower)) return true;
    if (qSubId && qSubId === targetSubLower) return true;
    return false;
  };

  // Helper to match question by chapter (by name, ID, or subject code)
  const isQuestionInChapter = (q: any, chFilter: string) => {
    if (!chFilter || chFilter === 'all') return true;
    const targetCh = chFilter.toLowerCase().trim();
    const qCh = String((q as any).chapter_name || q.chapter || (q as any).chapterTitle || '').toLowerCase().trim();
    const qChId = String((q as any).chapterId || (q as any).chapter_id || '').toLowerCase().trim();
    const qCode = String((q as any).code || (q as any).question_code || q.id || '').toUpperCase();

    if (qCh && (qCh === targetCh || qCh.includes(targetCh) || targetCh.includes(qCh))) return true;
    if (qChId && qChId === targetCh) return true;

    if (targetCh.includes('living world') || targetCh.includes('liv')) return qCode.includes('LIV');
    if (targetCh.includes('animal kingdom') || targetCh.includes('ani')) return qCode.includes('ANI');
    if (targetCh.includes('plant kingdom') || targetCh.includes('pla')) return qCode.includes('PLA');
    if (targetCh.includes('basic concepts') || targetCh.includes('sbc')) return qCode.includes('SBC');
    if (targetCh.includes('thermodynamics') || targetCh.includes('the')) return qCode.includes('THE');
    if (targetCh.includes('units') || targetCh.includes('uam') || targetCh.includes('phy-01')) return qCode.includes('UAM') || qCode.includes('PHY-01') || qCode.includes('UNI');
    if (targetCh.includes('motion in a plane') || targetCh.includes('mip') || targetCh.includes('phy-02')) return qCode.includes('MIP') || qCode.includes('PHY-02');

    return false;
  };

  // Filters questions by subject, chapter, difficulty, and live search query
  const filteredQuestions = questions.filter(q => {
    // 1. Role-based user scoping
    if (userSubject !== 'All') {
      const userSubLower = userSubject.toLowerCase();
      const qSubLower = (q.subject || '').toLowerCase();
      if (qSubLower && !qSubLower.includes(userSubLower) && !userSubLower.includes(qSubLower)) {
        return false;
      }
    }

    // 2. Subject Filter
    if (selectedSubjectFilter !== 'all') {
      if (!isQuestionInSubject(q, selectedSubjectFilter)) return false;
    }

    // 3. Chapter Filter
    if (selectedChapterFilter !== 'all') {
      if (!isQuestionInChapter(q, selectedChapterFilter)) return false;
    }

    // 4. Difficulty Filter
    if (difficultyFilter !== 'All' && q.difficulty && q.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
      return false;
    }

    // 5. Image & Media Filter
    if (imageFilter === 'with_image' && !hasQuestionImage(q)) {
      return false;
    }
    if (imageFilter === 'without_image' && hasQuestionImage(q)) {
      return false;
    }

    // 5. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        (q.rawText && q.rawText.toLowerCase().includes(query)) ||
        (q.id && q.id.toLowerCase().includes(query)) ||
        ((q as any).code && (q as any).code.toLowerCase().includes(query)) ||
        (q.chapter && q.chapter.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Toggles question inclusion in the active section (targetSectionId) without corrupting other sections
  const toggleQuestionSelection = (id: string, customSecId?: string) => {
    const secToUse = customSecId || targetSectionId || testSections[0]?.id || 'sec-1';
    const currentAssignedSec = questionSectionMap[id];

    if (currentAssignedSec === secToUse) {
      // Unassign from this section
      const newMap = { ...questionSectionMap };
      delete newMap[id];
      setQuestionSectionMap(newMap);
      setSelectedQuestionIds(prev => prev.filter(qId => qId !== id));
    } else {
      // Assign or reassign to this section
      setQuestionSectionMap(prev => ({ ...prev, [id]: secToUse }));
      setSelectedQuestionIds(prev => Array.from(new Set([...prev, id])));
    }
  };

  // Selects all currently filtered questions and assigns them strictly to targetSectionId
  const handleSelectAll = () => {
    const secToUse = targetSectionId || testSections[0]?.id || 'sec-1';
    const filteredIds = filteredQuestions.map(q => q.id);
    setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    setQuestionSectionMap(prev => {
      const updated = { ...prev };
      filteredIds.forEach(id => {
        updated[id] = secToUse;
      });
      return updated;
    });
  };

  // Clears questions assigned to the active section only (does not affect other sections)
  const handleDeselectAll = () => {
    const secToUse = targetSectionId || testSections[0]?.id || 'sec-1';
    setSelectedQuestionIds(prev => prev.filter(qId => questionSectionMap[qId] !== secToUse));
    setQuestionSectionMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(qId => {
        if (updated[qId] === secToUse) {
          delete updated[qId];
        }
      });
      return updated;
    });
  };

  const toggleSelectAllForActiveSection = (filteredList: Question[]) => {
    const secToUse = targetSectionId || testSections[0]?.id || 'sec-1';
    const allSelected = filteredList.length > 0 && filteredList.every(q => questionSectionMap[q.id] === secToUse);
    if (allSelected) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  /**
   * Handles switching the active Target Test Section in Step 2.
   * Automatically syncs the Subject Filter and Chapter Filter to match the section's configured subject & chapter!
   */
  const handleTargetSectionChange = (newSecId: string) => {
    setTargetSectionId(newSecId);
    const targetSec = testSections.find(s => s.id === newSecId);
    if (targetSec) {
      let subToUse = (targetSec as any).subject;
      if (!subToUse && targetSec.name) {
        const parts = targetSec.name.split('—').map(s => s.trim());
        if (parts.length > 1) {
          subToUse = parts[1];
        } else {
          const matched = subjects.find(sub => targetSec.name.toLowerCase().includes(sub.name.toLowerCase()));
          if (matched) subToUse = matched.name;
        }
      }

      if (subToUse) {
        const availableSubs = getAvailableSubjectNames();
        const matched = availableSubs.find(s => s.toLowerCase() === subToUse?.toLowerCase());
        if (matched) {
          setSelectedSubjectFilter(matched);
        }
      }

      if ((targetSec as any).chapter) {
        setSelectedChapterFilter((targetSec as any).chapter);
      } else {
        setSelectedChapterFilter('all');
      }
    }
  };

  // Automatically selects questions for a SINGLE section based on its configured chapter, subject, and target count
  const handleAutoSelectForSingleSection = (secId: string) => {
    const sec = testSections.find(s => s.id === secId);
    if (!sec) return;

    const secTarget = Math.max(1, Number(sec.questionsCount) || 25);
    let secSub = (sec as any).subject;
    if (!secSub && sec.name) {
      const parts = sec.name.split('—').map(s => s.trim());
      if (parts.length > 1) secSub = parts[1];
    }
    if (!secSub) secSub = selectedSubject;
    const secChapter = (sec as any).chapter || 'all';

    // Find all question IDs assigned to OTHER sections
    const usedByOtherSections = new Set<string>();
    Object.entries(questionSectionMap).forEach(([qId, assignedSecId]) => {
      if (assignedSecId !== secId && selectedQuestionIds.includes(qId)) {
        usedByOtherSections.add(qId);
      }
    });

    // Pool matching this section's subject and chapter
    let pool = questions.filter(q => {
      if (usedByOtherSections.has(q.id)) return false;
      if (!isQuestionInSubject(q, secSub)) return false;
      if (secChapter !== 'all' && !isQuestionInChapter(q, secChapter)) return false;
      return true;
    });

    if (pool.length === 0 && secChapter !== 'all') {
      pool = questions.filter(q => !usedByOtherSections.has(q.id) && isQuestionInSubject(q, secSub));
    }
    if (pool.length === 0) {
      pool = questions.filter(q => !usedByOtherSections.has(q.id));
    }

    const calcEasy = Math.round((secTarget * easyPercent) / 100);
    const calcMed = Math.round((secTarget * mediumPercent) / 100);
    const calcHard = Math.max(0, secTarget - calcEasy - calcMed);

    const easyQ = pool.filter(q => (q.difficulty || '').toLowerCase() === 'easy').map(q => q.id);
    const medQ = pool.filter(q => (q.difficulty || '').toLowerCase() === 'medium').map(q => q.id);
    const hardQ = pool.filter(q => (q.difficulty || '').toLowerCase() === 'hard').map(q => q.id);

    const chosenEasy = easyQ.slice(0, calcEasy);
    const chosenMed = medQ.slice(0, calcMed);
    const chosenHard = hardQ.slice(0, calcHard);

    let finalSelection = Array.from(new Set([...chosenEasy, ...chosenMed, ...chosenHard]));
    if (finalSelection.length < secTarget) {
      const remainingPool = pool.filter(q => !finalSelection.includes(q.id)).map(q => q.id);
      finalSelection = [...finalSelection, ...remainingPool.slice(0, secTarget - finalSelection.length)];
    }
    if (finalSelection.length === 0) {
      finalSelection = pool.slice(0, secTarget).map(q => q.id);
    }

    // Update state: preserve other sections, overwrite only this section
    const newMap = { ...questionSectionMap };
    Object.keys(newMap).forEach(qId => {
      if (newMap[qId] === secId) delete newMap[qId];
    });
    finalSelection.forEach(qId => {
      newMap[qId] = secId;
    });

    const otherSecQuestionIds = selectedQuestionIds.filter(qId => questionSectionMap[qId] !== secId);
    const newSelectedIds = Array.from(new Set([...otherSecQuestionIds, ...finalSelection]));

    setQuestionSectionMap(newMap);
    setSelectedQuestionIds(newSelectedIds);
  };

  // Automatically selects questions across ALL sections independently based on their respective chapters & target counts
  const handleAutoSelectDistribution = () => {
    const newSectionMap: Record<string, string> = {};
    const usedQuestionIds = new Set<string>();
    const sectionAssignedCounts: Record<string, number> = {};

    testSections.forEach((sec) => {
      const secTarget = Math.max(1, Number(sec.questionsCount) || 25);
      let secSub = (sec as any).subject;
      if (!secSub && sec.name) {
        const parts = sec.name.split('—').map(s => s.trim());
        if (parts.length > 1) secSub = parts[1];
      }
      if (!secSub) secSub = selectedSubject;
      const secChapter = (sec as any).chapter || 'all';

      let secPool = questions.filter(q => {
        if (usedQuestionIds.has(q.id)) return false;
        if (!isQuestionInSubject(q, secSub)) return false;
        if (secChapter !== 'all' && !isQuestionInChapter(q, secChapter)) return false;
        return true;
      });

      if (secPool.length === 0 && secChapter !== 'all') {
        secPool = questions.filter(q => !usedQuestionIds.has(q.id) && isQuestionInSubject(q, secSub));
      }
      if (secPool.length === 0) {
        secPool = questions.filter(q => !usedQuestionIds.has(q.id));
      }

      const calcEasy = Math.round((secTarget * easyPercent) / 100);
      const calcMed = Math.round((secTarget * mediumPercent) / 100);
      const calcHard = Math.max(0, secTarget - calcEasy - calcMed);

      const easyQ = secPool.filter(q => (q.difficulty || '').toLowerCase() === 'easy').map(q => q.id);
      const medQ = secPool.filter(q => (q.difficulty || '').toLowerCase() === 'medium').map(q => q.id);
      const hardQ = secPool.filter(q => (q.difficulty || '').toLowerCase() === 'hard').map(q => q.id);

      const chosenEasy = easyQ.slice(0, calcEasy);
      const chosenMed = medQ.slice(0, calcMed);
      const chosenHard = hardQ.slice(0, calcHard);

      let finalSecSelection = Array.from(new Set([...chosenEasy, ...chosenMed, ...chosenHard]));
      if (finalSecSelection.length < secTarget) {
        const remainingPool = secPool.filter(q => !finalSecSelection.includes(q.id)).map(q => q.id);
        finalSecSelection = [...finalSecSelection, ...remainingPool.slice(0, secTarget - finalSecSelection.length)];
      }
      if (finalSecSelection.length === 0) {
        finalSecSelection = secPool.slice(0, secTarget).map(q => q.id);
      }

      finalSecSelection.forEach(qId => {
        newSectionMap[qId] = sec.id;
        usedQuestionIds.add(qId);
      });

      sectionAssignedCounts[sec.id] = finalSecSelection.length;
    });

    const allChosenIds = Array.from(usedQuestionIds);
    setSelectedQuestionIds(allChosenIds);
    setQuestionSectionMap(newSectionMap);

    const summary = testSections.map((s, i) => `${s.name || `Section #${i+1}`}: ${sectionAssignedCounts[s.id] || 0} Qs`).join(' • ');
    alert(`Successfully generated questions across all ${testSections.length} sections!\nTotal Questions: ${allChosenIds.length} Qs\n(${summary})`);
  };

  // Section Management: Adds a new section (e.g. Section B)
  const handleAddSection = () => {
    const nextChar = String.fromCharCode(65 + testSections.length);
    const availableSubs = getAvailableSubjectNames();
    const subForSec = availableSubs[testSections.length % availableSubs.length] || selectedSubject;
    const newSecId = `sec-${Date.now()}`;
    const newSec = {
      id: newSecId,
      name: `Section ${nextChar} — ${subForSec}`,
      questionsCount: 25,
      subject: subForSec
    };
    setTestSections(prev => [...prev, newSec]);
    handleTargetSectionChange(newSecId);
  };

  // Section Management: Removes a section and cleans up its assigned questions
  const handleRemoveSection = (id: string) => {
    if (testSections.length <= 1) return;
    const remaining = testSections.filter(s => s.id !== id);
    setTestSections(remaining);
    setSelectedQuestionIds(prev => prev.filter(qId => questionSectionMap[qId] !== id));
    setQuestionSectionMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(qId => {
        if (updated[qId] === id) {
          delete updated[qId];
        }
      });
      return updated;
    });
    if (targetSectionId === id) {
      handleTargetSectionChange(remaining[0]?.id || 'sec-1');
    }
  };

  // ==========================================
  // Dynamic Score & Document Construction
  // ==========================================
  const totalSelectedQuestionsCount = selectedQuestionIds.length;
  const numericMarksPerQ = marksPerQuestion === '' ? 0 : Number(marksPerQuestion);
  const computedTotalMarks = marksPerQuestion === ''
    ? ''
    : ((totalSelectedQuestionsCount || 1) * numericMarksPerQ);

  /**
   * Constructs the DocumentModel payload matching the backend schema
   * with complete metadata, sections, and structured question blocks.
   */
  const buildDocumentModel = (): Partial<DocumentModel> => {
    const selectedQuestionsList = questions.filter(q =>
      selectedQuestionIds.some(id => String(id) === String(q.id))
    );

    const docSections: DocumentSection[] = testSections.map((sec, idx) => {
      // Find questions strictly assigned to this section
      const sectionQuestions = selectedQuestionsList.filter(
        q => questionSectionMap[q.id] === sec.id
      );

      const numericMarks = Number(marksPerQuestion) || 0;
      const secCount = sectionQuestions.length;

      return {
        id: sec.id || `sec-${Date.now()}-${idx + 1}`,
        title: sec.name || `Section ${String.fromCharCode(65 + idx)} — ${selectedSubject}`,
        subject: (sec as any).subject || selectedSubject,
        chapter: (sec as any).chapter || selectedChapter,
        targetCount: (sec as any).questionsCount || 50,
        instructions: `Attempt all questions. Each question carries ${numericMarks} marks.`,
        marks: secCount * numericMarks,
        blocks: sectionQuestions.map((q, qIdx) => ({
          id: `blk-${Date.now()}-${idx}-${qIdx}`,
          type: 'question' as const,
          question: q,
          questionId: q.id
        }))
      };
    });

    const secSubs = Array.from(new Set(testSections.map(sec => {
      let sub = (sec as any).subject;
      if (!sub && sec.name) {
        const parts = sec.name.split('—').map(s => s.trim());
        if (parts.length > 1) sub = parts[1];
      }
      return sub || selectedSubject;
    }).filter(Boolean)));

    const finalSubjectString = secSubs.length > 1 ? secSubs.join(', ') : selectedSubject;

    return {
      title: testName.trim() || `${finalSubjectString} ${examType} Test Paper`,
      templateId: undefined,
      metadata: {
        instituteName: instituteName || 'APEX INSTITUTE OF SCIENCE & TECHNOLOGY',
        examName: `${examType} EXAMINATION 2026`,
        examType: examType,
        subject: finalSubjectString,
        chapter: selectedChapter,
        timeAllowedMinutes: Number(durationMinutes) || 60,
        marksPerQuestion: Number(marksPerQuestion) || 4,
        negativeMarks: Number(negativeMarks) || -1,
        unansweredMarks: Number(unansweredMarks) || 0,
        easyPercent: Number(easyPercent) || 40,
        mediumPercent: Number(mediumPercent) || 40,
        hardPercent: Number(hardPercent) || 20,
        maxMarks: computedTotalMarks,
        totalQuestions: totalSelectedQuestionsCount,
        createdBy: user.name || user.email,
        author: user.name || user.email,
        generalInstructions: [
          `There are ${totalSelectedQuestionsCount} multiple-choice questions.`,
          `Each question carries ${marksPerQuestion} marks.`,
          `One mark (${negativeMarks}) will be deducted for an incorrect answer.`,
          'Calculators and smart devices are strictly prohibited.'
        ]
      } as any,
      settings: {
        ...paperSettings,
        instituteName,
        paperSet,
        standardName,
        columnLayout,
        showWatermark,
        watermarkText
      } as any,
      sections: docSections
    };
  };

  /**
   * Saves the current test paper configuration as a draft to the Supabase database.
   */
  const handleSaveDraft = async () => {
    try {
      const docModel = buildDocumentModel();
      if (initialDocument?.id) {
        await api.updateDocument(initialDocument.id, { ...docModel, id: initialDocument.id } as DocumentModel);
        alert('Test paper updated successfully!');
      } else {
        const created = await api.createDocument(docModel);
        alert(`Test paper "${created?.title || docModel.title}" saved successfully!`);
      }
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      alert(`Failed to save test paper draft: ${err.message || 'Server error'}`);
    }
  };

  /**
   * Publishes the test paper, resets the form, and redirects the user to the Tests section.
   */
  const handlePublishTest = async () => {
    try {
      const docModel = buildDocumentModel();
      let savedDoc: DocumentModel;
      if (initialDocument?.id) {
        savedDoc = await api.updateDocument(initialDocument.id, { ...docModel, id: initialDocument.id } as DocumentModel);
        alert('Test paper updated and published successfully!');
      } else {
        savedDoc = await api.createDocument(docModel);
        alert(`Test paper "${savedDoc?.title || docModel.title}" published successfully to Tests section!`);
      }
      resetFormToBlank();
      if (onNavigateToTests) {
        onNavigateToTests();
      }
    } catch (err: any) {
      console.error('Failed to publish test:', err);
      alert(`Failed to publish test paper: ${err.message || 'Server error'}`);
    }
  };

  /**
   * Resets all form fields back to default state.
   */
  const resetFormToBlank = () => {
    setTestName('');
    setExamType('NEET');
    setSelectedSubject('Biology');
    setSelectedChapter('Cell Structure and Function');
    setDurationMinutes(60);
    setMarksPerQuestion(4);
    setNegativeMarks(-1);
    setUnansweredMarks(0);
    setSelectedQuestionIds([]);
    setSearchQuery('');
    setDifficultyFilter('All');
    setEasyPercent(30);
    setMediumPercent(50);
    setHardPercent(20);
    setTestSections([{ id: 'sec-1', name: 'Section A — Biology', questionsCount: 50 }]);
    setPaperSettings({
      shuffleQuestions: true,
      shuffleOptions: true,
      showQuestionCode: false,
      generateAnswerKey: true,
      generateSolutionPaper: false
    });
    setCurrentStep(1);
  };

  /**
   * Triggers the browser print dialog to print or save the test paper as PDF.
   * Clones paper sheet directly to document body to unwrap modal overflow clipping.
   */
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
    printRoot.innerHTML = paperElem.outerHTML;

    document.body.appendChild(printRoot);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const cleanupRoot = document.getElementById('print-paper-export-root');
        if (cleanupRoot) cleanupRoot.remove();
      }, 1000);
    }, 150);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 font-sans animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ========================================== */}
      {/* PAGE HEADER & TOP ACTION BUTTONS           */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
            Generate Test Paper
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create a test using questions from your question bank
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAnswerKeyMode(false);
              setCurrentStep(3);
              setIsPreviewModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Preview Paper
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* STEP INDICATOR NAVIGATION (1 to 4)         */}
      {/* ========================================== */}
      <div className="flex items-center gap-4 py-2 border-b border-slate-100 text-xs font-semibold">
        <div
          onClick={() => setCurrentStep(1)}
          className={`flex items-center gap-2 cursor-pointer ${
            currentStep >= 1 ? 'text-teal-900 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
            currentStep >= 1 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            1
          </div>
          <span>Configure</span>
        </div>

        <div className="w-12 h-[1px] bg-slate-200" />

        <div
          onClick={() => setCurrentStep(2)}
          className={`flex items-center gap-2 cursor-pointer ${
            currentStep >= 2 ? 'text-teal-900 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
            currentStep >= 2 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            2
          </div>
          <span>Select Questions</span>
        </div>

        <div className="w-12 h-[1px] bg-slate-200" />

        <div
          onClick={() => {
            setCurrentStep(3);
            setIsPreviewModalOpen(true);
          }}
          className={`flex items-center gap-2 cursor-pointer ${
            currentStep >= 3 ? 'text-teal-900 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
            currentStep >= 3 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            3
          </div>
          <span>Preview</span>
        </div>

        <div className="w-12 h-[1px] bg-slate-200" />

        <div
          onClick={handlePublishTest}
          className={`flex items-center gap-2 cursor-pointer ${
            currentStep >= 4 ? 'text-teal-900 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
            currentStep >= 4 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            4
          </div>
          <span>Publish</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* STEP 1: CONFIGURE TEST METADATA & MARKING  */}
      {/* ========================================== */}
      {currentStep === 1 && (
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* CARD 1: TEST INFORMATION */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                TEST INFORMATION
              </h2>
              <span className="px-3.5 py-1 border border-teal-300 text-teal-600 rounded-full text-xs font-bold bg-white">
                Draft
              </span>
            </div>

            {/* Grid: Test Name, Exam Type, Subject(s) & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  TEST NAME
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  placeholder="e.g. Unit Test 01 - Full Syllabus"
                  className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  EXAM TYPE
                </label>
                <select
                  value={examType}
                  onChange={e => setExamType(e.target.value)}
                  className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="NEET">NEET</option>
                  <option value="KCET">KCET</option>
                  <option value="JEE">JEE</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  SUBJECT(S) INCLUDED
                </label>
                <input
                  type="text"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  placeholder="e.g. Physics, Chemistry & Biology"
                  className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  DURATION (MINUTES)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                    className="w-full text-sm font-bold p-3 pr-16 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                  <span className="absolute right-3 text-xs text-slate-500 font-bold pointer-events-none">
                    Min
                  </span>
                </div>
                {/* Quick preset duration buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[30, 60, 90, 120, 180].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                        durationMinutes === mins
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: MARKING SCHEME */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-7 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                MARKING SCHEME
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  CORRECT ANSWER
                </label>
                <input
                  type="number"
                  value={marksPerQuestion}
                  onChange={e => setMarksPerQuestion(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  INCORRECT ANSWER
                </label>
                <input
                  type="number"
                  value={negativeMarks}
                  onChange={e => setNegativeMarks(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  UNANSWERED
                </label>
                <input
                  type="number"
                  value={unansweredMarks}
                  onChange={e => setUnansweredMarks(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 font-sans tracking-wide">
                  TOTAL MARKS
                </label>
                <input
                  type="number"
                  value={computedTotalMarks}
                  readOnly
                  className="w-full text-sm font-black p-3 border border-teal-300 rounded-xl text-teal-900 bg-[#e6f7f5] font-mono"
                />
              </div>
            </div>
          </div>

          {/* STEP 1 NAVIGATION FOOTER */}
          <div className="flex items-center justify-end pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              Next: Select Questions <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 2: SELECT QUESTIONS FROM QUESTION BANK*/}
      {/* ========================================== */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* LEFT COLUMN: Question Bank Selection & Configurations */}
          <div className="space-y-6 min-w-0">

            {/* 1. Section Builder Card (Test Sections Configuration) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Test Sections Configuration ({testSections.length})
                </h2>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </div>

              <div className="space-y-3">
                {testSections.map((sec, idx) => {
                  const assignedCount = selectedQuestionIds.filter(
                    qId => questionSectionMap[qId] === sec.id
                  ).length;
                  const isCurrentTarget = targetSectionId === sec.id;

                  return (
                    <div
                      key={sec.id}
                      className={`p-4 border rounded-xl space-y-3 transition-all ${
                        isCurrentTarget
                          ? 'border-teal-400 bg-teal-50/40 shadow-xs ring-1 ring-teal-400/50'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase text-slate-600">
                            Section #{idx + 1}
                          </span>
                          {isCurrentTarget ? (
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-md">
                              Active Selection Target
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTargetSectionChange(sec.id)}
                              className="text-[10px] font-bold text-slate-600 hover:text-teal-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs"
                            >
                              Select for this section →
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAutoSelectForSingleSection(sec.id)}
                            className="text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            title={`Auto-select ${sec.questionsCount} questions for this section from ${(sec as any).chapter || 'selected chapter'}`}
                          >
                            <Sparkles className="w-3 h-3 text-teal-600" />
                            Auto-Fill ({sec.questionsCount} Qs)
                          </button>
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            Number(assignedCount) >= Number(sec.questionsCount) && Number(assignedCount) > 0
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                              : 'text-teal-800 bg-teal-50 border-teal-200'
                          }`}>
                            {assignedCount} / {sec.questionsCount} Assigned
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Section Name
                          </label>
                          <input
                            type="text"
                            value={sec.name}
                            onChange={e => {
                              const updated = [...testSections];
                              updated[idx].name = e.target.value;
                              setTestSections(updated);
                            }}
                            placeholder="e.g., Section A — Physics"
                            className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Section Subject
                          </label>
                          <select
                            value={(sec as any).subject || (sec.name.split('—')[1] || '').trim() || selectedSubject}
                            onChange={e => {
                              const newSub = e.target.value;
                              const updated = [...testSections];
                              (updated[idx] as any).subject = newSub;
                              (updated[idx] as any).chapter = 'all';
                              const secLetter = String.fromCharCode(65 + idx);
                              updated[idx].name = `Section ${secLetter} — ${newSub}`;
                              setTestSections(updated);

                              if (targetSectionId === sec.id) {
                                setSelectedSubjectFilter(newSub);
                                setSelectedChapterFilter('all');
                              }
                            }}
                            className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg text-slate-900 bg-white cursor-pointer"
                          >
                            {getAvailableSubjectNames().map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                            Section Chapter
                          </label>
                          <select
                            value={(sec as any).chapter || 'all'}
                            onChange={e => {
                              const newChap = e.target.value;
                              const updated = [...testSections];
                              (updated[idx] as any).chapter = newChap;
                              setTestSections(updated);

                              if (targetSectionId === sec.id) {
                                setSelectedChapterFilter(newChap);
                              }
                            }}
                            className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg text-slate-900 bg-white cursor-pointer"
                          >
                            <option value="all">All Chapters</option>
                            {getAvailableChaptersForSubject((sec as any).subject || (sec.name.split('—')[1] || '').trim() || selectedSubject).map((chapTitle, cIdx) => (
                              <option key={cIdx} value={chapTitle}>{chapTitle}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                              Target Question Count
                            </label>
                            <input
                              type="number"
                              value={sec.questionsCount}
                              onChange={e => {
                                const updated = [...testSections];
                                updated[idx].questionsCount = e.target.value === '' ? '' : Number(e.target.value);
                                setTestSections(updated);
                              }}
                              className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                            />
                          </div>
                          {testSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(sec.id)}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors mt-4 cursor-pointer"
                              title="Delete section"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Difficulty Distribution Rules Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                    Difficulty Distribution Rules
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Target difficulty percentage ratio (Automatically synced to 100%)
                  </p>
                </div>
                <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                  Total: {easyPercent + mediumPercent + hardPercent}%
                </span>
              </div>

              {/* 3 Synced Percentage Sliders & Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Easy % */}
                <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Easy
                    </span>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={easyPercent}
                        onChange={e => handleEasyPercentChange(Number(e.target.value))}
                        className="w-12 text-right text-xs font-bold p-1 border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={easyPercent}
                    onChange={e => handleEasyPercentChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Medium % */}
                <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Medium
                    </span>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={mediumPercent}
                        onChange={e => handleMediumPercentChange(Number(e.target.value))}
                        className="w-12 text-right text-xs font-bold p-1 border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-amber-500 bg-white font-mono"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={mediumPercent}
                    onChange={e => handleMediumPercentChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Hard % */}
                <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Hard
                    </span>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={hardPercent}
                        onChange={e => handleHardPercentChange(Number(e.target.value))}
                        className="w-12 text-right text-xs font-bold p-1 border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-rose-500 bg-white font-mono"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={hardPercent}
                    onChange={e => handleHardPercentChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                </div>
              </div>

              {/* Progress Visual Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${easyPercent}%` }} className="bg-emerald-500 h-full transition-all duration-300" title={`Easy: ${easyPercent}%`} />
                <div style={{ width: `${mediumPercent}%` }} className="bg-amber-500 h-full transition-all duration-300" title={`Medium: ${mediumPercent}%`} />
                <div style={{ width: `${hardPercent}%` }} className="bg-rose-500 h-full transition-all duration-300" title={`Hard: ${hardPercent}%`} />
              </div>
            </div>

            {/* 3. Question Selection Main Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                    Select Questions ({selectedQuestionIds.filter(qId => questionSectionMap[qId] === targetSectionId).length} in this section • {selectedQuestionIds.length} Total)
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Filter by difficulty or search keywords to choose questions for the active section.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadBackendData(true)}
                    disabled={isRefreshing || loading}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                    title="Refresh Question Bank"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    Deselect Section
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoSelectDistribution}
                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    Auto Select
                  </button>
                </div>
              </div>

              {/* Filters Row: Target Section, Subject, Chapter, Difficulty, Media & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* 1. Target Test Section Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-teal-800 mb-1 tracking-wide">
                    Target Test Section
                  </label>
                  <select
                    value={targetSectionId}
                    onChange={e => handleTargetSectionChange(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-teal-300 rounded-xl text-teal-900 bg-teal-50/70 focus:ring-2 focus:ring-teal-600 cursor-pointer shadow-2xs"
                  >
                    {testSections.map((sec, idx) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name || `Section ${String.fromCharCode(65 + idx)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Subject Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 tracking-wide">
                    Filter by Subject
                  </label>
                  <select
                    value={selectedSubjectFilter}
                    onChange={e => {
                      setSelectedSubjectFilter(e.target.value);
                      setSelectedChapterFilter('all');
                    }}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="all">All Subjects</option>
                    {userSubject === 'All' ? (
                      subjects.length > 0 ? (
                        subjects.map(s => (
                          <option key={s.id || s.code || s.name} value={s.name}>{s.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Biology">Biology</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Mathematics">Mathematics</option>
                        </>
                      )
                    ) : (
                      <option value={userSubject}>{userSubject}</option>
                    )}
                  </select>
                </div>

                {/* 3. Chapter Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 tracking-wide">
                    Filter by Chapter
                  </label>
                  <select
                    value={selectedChapterFilter}
                    onChange={e => setSelectedChapterFilter(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="all">All Chapters</option>
                    {getAvailableChaptersForSubject(selectedSubjectFilter).map((chapTitle, idx) => (
                      <option key={idx} value={chapTitle}>{chapTitle}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Difficulty Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 tracking-wide">
                    Filter by Difficulty
                  </label>
                  <select
                    value={difficultyFilter}
                    onChange={e => setDifficultyFilter(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {/* 5. Media / Image Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 tracking-wide">
                    Filter by Media
                  </label>
                  <select
                    value={imageFilter}
                    onChange={e => setImageFilter(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Media</option>
                    <option value="with_image">🖼️ With Images</option>
                    <option value="without_image">📝 No Images (Text)</option>
                  </select>
                </div>

                {/* 6. Search Question Bank */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 tracking-wide">
                    Search Question Bank
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search text, code..."
                      className="w-full text-xs font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Questions List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr className="text-slate-600 text-xs uppercase font-bold tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredQuestions.length > 0 &&
                              filteredQuestions.every(q => questionSectionMap[q.id] === targetSectionId)
                            }
                            onChange={() => toggleSelectAllForActiveSection(filteredQuestions)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 cursor-pointer"
                            title="Select / Unselect All matching questions for this Section"
                          />
                        </th>
                        <th className="py-3 px-4 w-36">Code / ID</th>
                        <th className="py-3 px-4">Statement</th>
                        <th className="py-3 px-4 w-28">Subject</th>
                        <th className="py-3 px-4 w-36">Chapter</th>
                        <th className="py-3 px-4 w-24 text-center">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {filteredQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <HelpCircle className="w-8 h-8 text-slate-300" />
                              <p className="font-semibold text-sm">No questions matched the current filter criteria</p>
                              <p className="text-xs text-slate-500">Try changing or clearing filters above</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map(q => {
                          const isAssignedToThisSec = questionSectionMap[q.id] === targetSectionId;
                          const assignedSecId = questionSectionMap[q.id];
                          const otherSec = assignedSecId && assignedSecId !== targetSectionId
                            ? testSections.find(s => s.id === assignedSecId)
                            : null;
                          const qCode = formatQuestionCode(q);

                          return (
                            <tr
                              key={q.id}
                              className={`transition-colors hover:bg-slate-50/80 ${
                                isAssignedToThisSec ? 'bg-teal-50/50' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAssignedToThisSec}
                                  onChange={() => toggleQuestionSelection(q.id)}
                                  className="w-4 h-4 text-teal-600 rounded border-slate-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-700">
                                <div>{qCode}</div>
                                {otherSec && (
                                  <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-sans">
                                    {otherSec.name || 'Other Section'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-900">
                                <div className="line-clamp-2 max-w-md flex items-center gap-1.5 flex-wrap">
                                  <MathTextRenderer text={q.rawText || ''} />
                                  {hasQuestionImage(q) && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded shrink-0">
                                      🖼️ Image
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {q.subject || 'Biology'}
                              </td>
                              <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]">
                                {q.chapter || 'General'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    q.difficulty === 'Easy'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : q.difficulty === 'Medium'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {q.difficulty || 'Medium'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>



            {/* STEP 2 BOTTOM NAVIGATION FOOTER */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Configure
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAnswerKeyMode(false);
                  setCurrentStep(3);
                  setIsPreviewModalOpen(true);
                }}
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Preview Paper <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* ========================================== */}
          {/* RIGHT ASIDE: ACTION DECK                   */}
          {/* ========================================== */}
          <div className="sticky top-20 space-y-6">

            {/* Generate Action Buttons */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Generate Paper
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAnswerKeyMode(false);
                  setCurrentStep(3);
                  setIsPreviewModalOpen(true);
                }}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                Preview Test Paper
              </button>

              <button
                type="button"
                onClick={handleGeneratePdfStream}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" /> Export as PDF
              </button>

              {/* Question Code Quick Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-0.5 select-none hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showQuestionCode}
                  onChange={e => setShowQuestionCode(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 cursor-pointer"
                />
                <span>Show Question Code in PDF</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsAnswerKeyMode(true);
                  setIsPreviewModalOpen(true);
                }}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Generate Answer Key
              </button>

              <button
                type="button"
                onClick={handlePublishTest}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Publish Test
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* STEP 3 & MODAL: FULL PRINTABLE TEST PREVIEW*/}
      {/* ========================================== */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header with View Mode & College Exam Controls */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {isAnswerKeyMode ? '✓ Answer Key & Detailed Solutions' : 'Test Paper Preview (College Exam Format)'}
                </h3>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  {selectedQuestionIds.length} Qs • {columnLayout === '2-column' ? '📰 2-Column (Saves 70% Paper)' : '📄 1-Column'}
                </span>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 2-Column vs 1-Column Toggle */}
                <button
                  type="button"
                  onClick={() => setColumnLayout(prev => prev === '2-column' ? '1-column' : '2-column')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    columnLayout === '2-column'
                      ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle 2-column compact newspaper exam layout to save 70% paper"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>{columnLayout === '2-column' ? '2-Col Paper Saver' : '1-Col'}</span>
                </button>

                {/* Watermark Toggle */}
                <button
                  type="button"
                  onClick={() => setShowWatermark(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    showWatermark
                      ? 'bg-teal-50 text-teal-800 border-teal-300'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                  title="Toggle background watermark"
                >
                  <Droplet className="w-3.5 h-3.5" />
                  <span>Watermark {showWatermark ? 'ON' : 'OFF'}</span>
                </button>

                {/* Question Code Toggle */}
                <button
                  type="button"
                  onClick={() => setShowQuestionCode(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    showQuestionCode
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle displaying question codes (e.g. BIO-ANI-001) in test paper & PDF export"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Q-Code {showQuestionCode ? 'ON' : 'OFF'}</span>
                </button>

                {/* Edit Institute Header Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEditingInstitute(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                  title="Customize College / Institute Title on Paper"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Edit Header</span>
                </button>

                {/* View Mode Toggle Switch */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIsAnswerKeyMode(false)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      !isAnswerKeyMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📄 Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnswerKeyMode(true)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      isAnswerKeyMode ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✓ Key
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Header Editor Drawer if open */}
            {isEditingInstitute && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[10px] font-bold uppercase text-amber-900 mb-0.5">College / Institute Name</label>
                  <input
                    type="text"
                    value={instituteName}
                    onChange={e => setInstituteName(e.target.value)}
                    placeholder="e.g. NLE SOCIETYS Dr RB PATIL MAHESH PU COLLEGE"
                    className="w-full p-1.5 bg-white border border-amber-300 rounded font-bold text-slate-900 text-xs"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold uppercase text-amber-900 mb-0.5">Paper Set</label>
                  <input
                    type="text"
                    value={paperSet}
                    onChange={e => setPaperSet(e.target.value)}
                    placeholder="1 or A"
                    className="w-full p-1.5 bg-white border border-amber-300 rounded font-bold text-slate-900 text-xs"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] font-bold uppercase text-amber-900 mb-0.5">Standard</label>
                  <input
                    type="text"
                    value={standardName}
                    onChange={e => setStandardName(e.target.value)}
                    placeholder="11 / PUC 1"
                    className="w-full p-1.5 bg-white border border-amber-300 rounded font-bold text-slate-900 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingInstitute(false)}
                  className="mt-3.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            {/* Modal Body: Printable Document Paper */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-200/80">
              <div className="printable-paper-sheet max-w-[850px] mx-auto bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
                <CollegeExamPaper
                  instituteName={instituteName}
                  examTitle={(() => {
                    const secSubs = Array.from(new Set(testSections.map(sec => {
                      let sub = (sec as any).subject;
                      if (!sub && sec.name) {
                        const parts = sec.name.split('—').map(s => s.trim());
                        if (parts.length > 1) sub = parts[1];
                      }
                      return sub || selectedSubject;
                    }).filter(Boolean)));

                    return secSubs.length > 1
                      ? `${examType} MOCK TEST (${secSubs.join(' • ').toUpperCase()})`
                      : (testName.toUpperCase() || `${examType} ${selectedSubject.toUpperCase()} TEST`);
                  })()}
                  subjectNames={(() => {
                    const secSubs = Array.from(new Set(testSections.map(sec => (sec as any).subject || selectedSubject).filter(Boolean)));
                    return secSubs.join(', ') || selectedSubject;
                  })()}
                  standard={standardName}
                  paperSet={paperSet}
                  duration={durationMinutes}
                  totalMarks={Number(computedTotalMarks) || 720}
                  sections={testSections.map((sec, idx) => ({
                    id: sec.id || `sec-${idx}`,
                    name: sec.name || `Section ${String.fromCharCode(65 + idx)} (MCQ)`,
                    instructions: (sec as any).instructions
                  }))}
                  allQuestions={(() => {
                    const orderedQuestions: any[] = [];
                    let globalIdx = 1;
                    testSections.forEach((sec) => {
                      const secQs = questions.filter(q =>
                        selectedQuestionIds.includes(q.id) && questionSectionMap[q.id] === sec.id
                      );
                      secQs.forEach((q) => {
                        orderedQuestions.push({
                          id: q.id,
                          questionNumber: globalIdx++,
                          rawText: q.rawText || (typeof q.content === 'string' ? q.content : '') || '',
                          content: q.content,
                          options: q.options || [],
                          correctOption: (q as any).correct_option || (q as any).correctOption || q.correctAnswer || 'A',
                          correctAnswer: (q as any).correct_option || (q as any).correctOption || q.correctAnswer || 'A',
                          marks: q.marks || Number(marksPerQuestion) || 4,
                          negativeMarks: q.negativeMarks || Number(negativeMarks) || 1,
                          diagramSvg: q.diagramSvg || (q as any).diagram_svg,
                          imageUrl: q.imageUrl || q.diagramUrl,
                          explanationText: q.explanationText || (q as any).solution || (q as any).explanation || '',
                          solution: q.explanationText || (q as any).solution || (q as any).explanation || '',
                          sectionId: sec.id,
                          sectionName: sec.name || 'Section',
                          subject: (sec as any).subject || q.subject || selectedSubject,
                          chapter: q.chapter,
                          questionCode: q.questionCode || (q as any).question_code || formatQuestionCode(q)
                        });
                      });
                    });
                    return orderedQuestions;
                  })()}
                  isAnswerKeyMode={isAnswerKeyMode}
                  showWatermark={showWatermark}
                  watermarkText={watermarkText}
                  columnLayout={columnLayout}
                  showQuestionCode={showQuestionCode}
                />
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Back to Builder
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGeneratePdfStream}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" /> Export as PDF / Print
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handlePublishTest();
                  }}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Publish Test
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
