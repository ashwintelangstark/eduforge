import React, { useState, useEffect } from 'react';
import { Sidebar, PageView } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { QuestionBankPage } from './pages/QuestionBankPage.js';
import { CreateQuestionPage } from './pages/CreateQuestionPage.js';
import { SubjectsPage, SubjectItem } from './pages/SubjectsPage.js';
import { ChaptersPage, ChapterItem } from './pages/ChaptersPage.js';
import { TestsPage } from './pages/TestsPage.js';
import { GenerateTestPage } from './pages/GenerateTestPage.js';
import { TestAttemptsPage } from './pages/TestAttemptsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { MediaLibraryPage } from './pages/MediaLibraryPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { EditorPage } from './pages/EditorPage.js';
import { TemplatesPage } from './pages/TemplatesPage.js';
import { ScienceLibraryPage } from './pages/ScienceLibraryPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { PaperWizardModal } from './paper/PaperWizardModal.js';
import { QuestionBuilderModal } from './questions/QuestionBuilderModal.js';
import { TemplateGalleryModal } from './templates/TemplateGalleryModal.js';
import { api } from './services/api.js';
import { supabase } from './services/supabaseDirect.js';
import { DocumentModel, Template, Question } from '@eduforge/shared';
import { ThemeProvider } from './state/ThemeContext.js';

import { getUserProfile, UserProfile } from './utils/userProfile.js';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('eduforge_auth') === 'true';
  });
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [activeChapterFilter, setActiveChapterFilter] = useState<{ id?: string; title?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getUserProfile());

  useEffect(() => {
    const isAuth = localStorage.getItem('eduforge_auth') === 'true';
    setIsAuthenticated(isAuth);
    if (isAuth) {
      setCurrentUser(getUserProfile());
    }
  }, []);

  // Shared frontend state for subjects and chapters synced with Supabase DB
  const [subjectsList, setSubjectsList] = useState<SubjectItem[]>([]);
  const [chaptersList, setChaptersList] = useState<ChapterItem[]>([]);

  const loadBackendSubjects = async () => {
    try {
      const data = await api.getSubjects();
      if (data && Array.isArray(data)) {
        setSubjectsList(data);
      }
    } catch (e) {
      console.error('Failed loading backend subjects:', e);
    }
  };

  const loadBackendChapters = async () => {
    try {
      const data = await api.getChapters();
      if (data && Array.isArray(data)) {
        const mapped: ChapterItem[] = data.map((ch: any, idx: number) => ({
          num: String(idx + 1).padStart(2, '0'),
          id: String(ch.id || `CH-${idx + 1}`),
          code: ch.code || ch.chapter_code || `CH-${String(idx + 1).padStart(2, '0')}`,
          title: ch.title || ch.name || 'Untitled Chapter',
          subject: ch.subject || 'Biology',
          count: ch.count || 0
        }));
        setChaptersList(mapped);
      }
    } catch (e) {
      console.error('Failed loading backend chapters:', e);
    }
  };

  useEffect(() => {
    loadBackendSubjects();
    loadBackendChapters();
  }, [currentPage]);

  const handleAddSubject = async (newSub: SubjectItem) => {
    setSubjectsList(prev => [...prev, newSub]);
    try {
      await api.createSubject(newSub);
    } catch (err) {
      console.error('Failed to create subject in Supabase:', err);
    } finally {
      loadBackendSubjects();
    }
  };

  const handleEditSubject = async (originalCode: string, updatedSub: SubjectItem) => {
    setSubjectsList(prev => prev.map(s => s.code === originalCode ? updatedSub : s));
    try {
      const target = subjectsList.find(s => s.code === originalCode);
      if (target?.id) {
        await api.updateSubject(String(target.id), updatedSub);
      }
    } catch (err) {
      console.error('Failed to edit subject in Supabase:', err);
    } finally {
      loadBackendSubjects();
    }
  };

  const handleAddChapter = async (newCh: ChapterItem) => {
    setChaptersList(prev => [newCh, ...prev]);
    try {
      await api.createChapter(newCh.subject, {
        title: newCh.title,
        code: newCh.id,
        name: newCh.title
      });
    } catch (err) {
      console.error('Failed to add chapter in Supabase:', err);
    } finally {
      loadBackendChapters();
      loadBackendSubjects();
    }
  };

  const handleEditChapter = async (originalId: string, updatedCh: ChapterItem) => {
    setChaptersList(prev => prev.map(c => c.id === originalId ? updatedCh : c));
    try {
      await api.updateChapter(originalId, {
        title: updatedCh.title,
        code: updatedCh.id
      });
    } catch (err) {
      console.error('Failed to edit chapter in Supabase:', err);
    } finally {
      loadBackendChapters();
    }
  };

  const handleDeleteSubject = async (codeOrId: string) => {
    const subObj = subjectsList.find(s => (s as any).code === codeOrId || String((s as any).id) === String(codeOrId));
    const targetId = (subObj as any)?.id || codeOrId;
    setSubjectsList(prev => prev.filter(s => (s as any).code !== codeOrId && String((s as any).id) !== String(codeOrId)));
    try {
      await api.deleteSubject(targetId);
    } catch (err) {
      console.error('Failed to delete subject:', err);
    } finally {
      loadBackendSubjects();
    }
  };

  const handleDeleteChapter = async (id: string) => {
    setChaptersList(prev => prev.filter(c => String(c.id) !== String(id)));
    try {
      await api.deleteChapter(id);
    } catch (err) {
      console.error('Failed to delete chapter:', err);
    } finally {
      loadBackendChapters();
    }
  };

  // Pre-warm in-memory caches on startup for instantaneous 0ms loading
  useEffect(() => {
    loadDocs();
    api.getPhysicsChapters().catch(() => {});
    api.getChemistryElements().catch(() => {});
    api.getChemistryNotations().catch(() => {});
    api.getUnits().catch(() => {});
    api.getConstants().catch(() => {});
    api.getTemplates().catch(() => {});
    api.getSymbols().catch(() => {});
  }, []);

  const loadDocs = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const [editingQuestionForCreatePage, setEditingQuestionForCreatePage] = useState<Question | null>(null);

  const handleOpenCreatePage = (q?: Question) => {
    setEditingQuestionForCreatePage(q || null);
    setCurrentPage('create');
  };
  const [isPaperWizardOpen, setIsPaperWizardOpen] = useState(false);
  const [isQuestionBuilderOpen, setIsQuestionBuilderOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);

  const [editingDocumentForGenerate, setEditingDocumentForGenerate] = useState<DocumentModel | null>(null);

  const handleOpenSelectQuestions = (doc: DocumentModel) => {
    setEditingDocumentForGenerate(doc);
    setCurrentPage('generate_test');
  };

  const handleOpenDocument = (docId: string) => {
    setActiveDocumentId(docId);
    setCurrentPage('editor');
  };

  const handleCreatePaper = async (newDoc: Partial<DocumentModel>) => {
    try {
      const created = await api.createDocument(newDoc);
      setActiveDocumentId(created.id);
      loadDocs();
      setCurrentPage('tests');
    } catch (err) {
      console.error('Failed to create paper:', err);
      alert('Failed to create paper');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (confirm('Delete this document?')) {
      try {
        await api.deleteDocument(docId);
        loadDocs();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDuplicateDocument = async (docId: string) => {
    try {
      await api.duplicateDocument(docId);
      loadDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTemplateAndCreate = async (tpl: Template) => {
    const newDoc: Partial<DocumentModel> = {
      title: `${tpl.name} - ${new Date().toLocaleDateString()}`,
      templateId: tpl.id,
      settings: tpl.settings,
      metadata: {
        ...tpl.defaultMetadata,
        subject: tpl.defaultMetadata.subject || 'Physics & Chemistry',
        timeAllowedMinutes: tpl.defaultMetadata.timeAllowedMinutes || 180,
        maxMarks: tpl.defaultMetadata.maxMarks || 100
      },
      sections: tpl.defaultSections.map((s, idx) => ({
        id: `sec-${Date.now()}-${idx + 1}`,
        title: s.defaultTitle,
        instructions: s.defaultInstructions,
        marks: s.defaultMarks,
        blocks: []
      }))
    };
    await handleCreatePaper(newDoc);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signout error if offline
    }
    localStorage.removeItem('eduforge_auth');
    localStorage.removeItem('eduforge_user');
    setCurrentUser(getUserProfile());
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('eduforge_auth', 'true');
    setCurrentUser(getUserProfile());
    setIsAuthenticated(true);
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentPage === 'editor' && activeDocumentId) {
    return (
      <EditorPage
        documentId={activeDocumentId}
        onNavigateHome={() => {
          loadDocs();
          setCurrentPage('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Left Sidebar Navigation (Desktop Persistent + Mobile Drawer) */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <Header
          currentPage={currentPage}
          onLogout={handleLogout}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 bg-slate-50 pb-12">
          {currentPage === 'dashboard' && (
            <DashboardPage
              subjectsList={subjectsList}
              chaptersList={chaptersList}
              onOpenDocument={handleOpenDocument}
              onNewPaperWizard={() => setIsPaperWizardOpen(true)}
              onOpenQuestionBuilder={() => handleOpenCreatePage()}
              onOpenTemplateGallery={() => setIsTemplateGalleryOpen(true)}
              onNavigateToQuestionBank={() => setCurrentPage('question_bank')}
              onNavigateToTemplates={() => setCurrentPage('templates')}
              onNavigateToScience={() => setCurrentPage('media_library')}
              onNavigateToReports={() => setCurrentPage('reports')}
            />
          )}

          {currentPage === 'question_bank' && (
            <QuestionBankPage
              mode="all"
              onBackToDashboard={() => setCurrentPage('dashboard')}
              onOpenCreateQuestion={q => handleOpenCreatePage(q)}
              onOpenDocument={handleOpenDocument}
              selectedChapter={activeChapterFilter}
              onClearChapterFilter={() => setActiveChapterFilter(null)}
            />
          )}

          {currentPage === 'saved_questions' && (
            <QuestionBankPage
              mode="saved"
              onBackToDashboard={() => setCurrentPage('dashboard')}
              onOpenCreateQuestion={q => handleOpenCreatePage(q)}
              onOpenDocument={handleOpenDocument}
              selectedChapter={activeChapterFilter}
              onClearChapterFilter={() => setActiveChapterFilter(null)}
            />
          )}

          {currentPage === 'approvals' && (
            <QuestionBankPage
              mode="approvals"
              onBackToDashboard={() => setCurrentPage('dashboard')}
              onOpenCreateQuestion={q => handleOpenCreatePage(q)}
              onOpenDocument={handleOpenDocument}
              selectedChapter={activeChapterFilter}
              onClearChapterFilter={() => setActiveChapterFilter(null)}
            />
          )}

          {currentPage === 'published_questions' && (
            <QuestionBankPage
              mode="published"
              onBackToDashboard={() => setCurrentPage('dashboard')}
              onOpenCreateQuestion={q => handleOpenCreatePage(q)}
              onOpenDocument={handleOpenDocument}
              selectedChapter={activeChapterFilter}
              onClearChapterFilter={() => setActiveChapterFilter(null)}
            />
          )}

          {currentPage === 'create' && (
            <CreateQuestionPage
              initialQuestion={editingQuestionForCreatePage}
              onBackToQuestionBank={(targetTab) => {
                setEditingQuestionForCreatePage(null);
                setCurrentPage(targetTab || 'saved_questions');
              }}
            />
          )}

          {currentPage === 'subjects' && (
            <SubjectsPage
              subjectsList={subjectsList}
              onAddSubject={handleAddSubject}
              onEditSubject={handleEditSubject}
              onDeleteSubject={handleDeleteSubject}
            />
          )}

          {currentPage === 'chapters' && (
            <ChaptersPage
              subjectsList={subjectsList}
              chaptersList={chaptersList}
              onAddChapter={handleAddChapter}
              onEditChapter={handleEditChapter}
              onDeleteChapter={handleDeleteChapter}
              onNavigateToQuestionBank={ch => {
                setActiveChapterFilter(ch || null);
                setCurrentPage('question_bank');
              }}
            />
          )}

          {currentPage === 'generate_test' && (
            <GenerateTestPage
              initialDocument={editingDocumentForGenerate}
              onOpenDocument={handleOpenDocument}
              onNavigateToTests={async () => {
                setEditingDocumentForGenerate(null);
                await loadDocs();
                setCurrentPage('tests');
              }}
            />
          )}

          {currentPage === 'tests' && (
            <TestsPage
              documents={documents}
              onOpenDocument={handleOpenDocument}
              onOpenSelectQuestions={handleOpenSelectQuestions}
              onNewPaperWizard={() => {
                setEditingDocumentForGenerate(null);
                setCurrentPage('generate_test');
              }}
              onDeleteDocument={handleDeleteDocument}
              onDuplicateDocument={handleDuplicateDocument}
            />
          )}

          {currentPage === 'test_attempts' && <TestAttemptsPage documents={documents} />}

          {currentPage === 'reports' && <ReportsPage />}

          {currentPage === 'media_library' && <MediaLibraryPage />}

          {currentPage === 'settings' && <SettingsPage />}

          {currentPage === 'templates' && (
            <TemplatesPage
              onBackToDashboard={() => setCurrentPage('dashboard')}
              onUseTemplate={handleSelectTemplateAndCreate}
            />
          )}

          {currentPage === 'science' && (
            <ScienceLibraryPage onBackToDashboard={() => setCurrentPage('dashboard')} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <PaperWizardModal
        isOpen={isPaperWizardOpen}
        onClose={() => setIsPaperWizardOpen(false)}
        onCreatePaper={handleCreatePaper}
      />

      <QuestionBuilderModal
        isOpen={isQuestionBuilderOpen}
        onClose={() => setIsQuestionBuilderOpen(false)}
        onSave={async q => {
          await api.createQuestion(q);
          alert('Question saved to Question Bank!');
        }}
      />

      <TemplateGalleryModal
        isOpen={isTemplateGalleryOpen}
        onClose={() => setIsTemplateGalleryOpen(false)}
        onSelectTemplate={handleSelectTemplateAndCreate}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};
