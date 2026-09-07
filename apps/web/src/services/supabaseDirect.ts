import { api } from './api.js';

// Fully disconnected from Supabase Cloud: All calls proxy directly through MySQL backend API
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error('Please use MySQL authentication') }),
    signUp: async () => ({ data: null, error: new Error('Please use MySQL authentication') }),
    signOut: async () => {
      localStorage.removeItem('eduforge_auth');
      localStorage.removeItem('eduforge_user');
      localStorage.removeItem('eduforge_token');
      return { error: null };
    }
  },
  storage: {
    from: () => ({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `/uploads/${path}` } }),
      upload: async () => ({ data: null, error: null }),
      list: async () => ({ data: [], error: null })
    })
  }
};

export const supabaseDirect = {
  getDocuments: () => api.getDocuments(),
  getDocument: (id: string) => api.getDocument(id),
  createDocument: (doc: any) => api.createDocument(doc),
  updateDocument: (id: string, doc: any) => api.updateDocument(id, doc),
  deleteDocument: (id: string) => api.deleteDocument(id),
  getSubjects: () => api.getSubjects(),
  createSubject: (sub: any) => api.createSubject(sub),
  updateSubject: (id: string, sub: any) => api.updateSubject(id, sub),
  deleteSubject: (id: string) => api.deleteSubject(id),
  getChapters: (subjectId?: string) => api.getChapters(subjectId),
  createChapter: (subjectId: string, chapter: any) => api.createChapter(subjectId, chapter),
  updateChapter: (id: string, chapter: any) => api.updateChapter(id, chapter),
  deleteChapter: (id: string) => api.deleteChapter(id),
  getQuestions: (filters?: Record<string, any>) => api.getQuestions(filters),
  getQuestion: (id: string) => api.getQuestion(id),
  createQuestion: (q: any) => api.createQuestion(q),
  updateQuestion: (id: string, q: any) => api.updateQuestion(id, q),
  deleteQuestion: (id: string) => api.deleteQuestion(id),
  deleteMultipleQuestions: (ids: string[]) => api.deleteMultipleQuestions(ids),
  getTemplates: () => api.getTemplates(),
  getMedia: (subject?: string) => api.getMedia(subject),
  uploadAsset: (file: File, subject?: string) => api.uploadAsset(file, subject),
  uploadBase64Image: (base64: string, subject?: string) => api.uploadBase64Image(base64, subject),
  deleteMedia: (id: string) => api.deleteMedia(id),
  getAttempts: () => api.getAttempts()
};
