import { questionsApi } from './api/questions.js';
import { papersApi } from './api/papers.js';
import { subjectsApi } from './api/subjects.js';
import { chaptersApi } from './api/chapters.js';
import { templatesApi } from './api/templates.js';
import { assetsApi } from './api/assets.js';
import { symbolsApi } from './api/symbols.js';
import { scienceApi } from './api/science.js';
import { settingsApi } from './api/settings.js';
import { attemptsApi } from './api/attempts.js';
import { apiCache } from './apiCache.js';

export const api = {
  // Papers & Documents (MySQL via Express Server)
  getDocuments: () => apiCache.fetchWithCache('documents', () => papersApi.getDocuments()),
  getDocument: (id: string) => papersApi.getDocument(id),
  createDocument: async (doc: any) => {
    apiCache.invalidate('documents');
    return papersApi.createDocument(doc);
  },
  updateDocument: async (id: string, doc: any) => {
    apiCache.invalidate('documents');
    return papersApi.updateDocument(id, doc);
  },
  duplicateDocument: async (id: string) => {
    apiCache.invalidate('documents');
    return papersApi.duplicateDocument(id);
  },
  deleteDocument: async (id: string) => {
    apiCache.invalidate('documents');
    return papersApi.deleteDocument(id);
  },
  exportDocx: papersApi.exportDocx.bind(papersApi),
  exportPdfHtml: papersApi.exportPdfHtml.bind(papersApi),

  // Test Attempt Logs (MySQL)
  getAttempts: () => apiCache.fetchWithCache('attempts', () => attemptsApi.getAttempts()),
  getAttempt: attemptsApi.getAttempt.bind(attemptsApi),
  createAttempt: (doc: any) => attemptsApi.createAttempt(doc),
  updateAttempt: (id: string, doc: any) => attemptsApi.updateAttempt(id, doc),
  deleteAttempt: (id: string) => attemptsApi.deleteAttempt(id),

  // Subjects & Chapters (MySQL)
  getSubjects: () => apiCache.fetchWithCache('subjects', () => subjectsApi.getSubjects(), 30000),
  createSubject: async (sub: any) => {
    apiCache.invalidate('subjects');
    return subjectsApi.createSubject(sub);
  },
  updateSubject: async (id: string, sub: any) => {
    apiCache.invalidate('subjects');
    return subjectsApi.updateSubject(id, sub);
  },
  deleteSubject: async (id: string) => {
    apiCache.invalidate('subjects');
    return subjectsApi.deleteSubject(id);
  },
  getChapters: (subjectId?: string) => apiCache.fetchWithCache(`chapters-${subjectId || 'all'}`, () => chaptersApi.getChapters(subjectId), 30000),
  createChapter: async (subjectId: string, chapter: any) => {
    apiCache.invalidate('chapters');
    return chaptersApi.createChapter(subjectId, chapter);
  },
  updateChapter: async (id: string, chapter: any) => {
    apiCache.invalidate('chapters');
    return chaptersApi.updateChapter(id, chapter);
  },
  deleteChapter: async (id: string) => {
    apiCache.invalidate('chapters');
    return chaptersApi.deleteChapter(id);
  },

  // Questions (MySQL)
  getQuestions: (filters?: Record<string, any>, forceRefresh = false) => {
    const key = `questions-${JSON.stringify(filters || {})}`;
    return apiCache.fetchWithCache(key, () => questionsApi.getQuestions(filters), 10000, forceRefresh);
  },
  getQuestionSummaries: (filters?: Record<string, any>, forceRefresh = false) => {
    const key = `qsummaries-${JSON.stringify(filters || {})}`;
    return apiCache.fetchWithCache(key, () => questionsApi.getQuestionSummaries(filters), 10000, forceRefresh);
  },
  getQuestion: (id: string) => questionsApi.getQuestion(id),
  createQuestion: async (question: any) => {
    apiCache.invalidate('questions');
    apiCache.invalidate('qsummaries');
    apiCache.invalidate('media');
    return questionsApi.createQuestion(question);
  },
  updateQuestion: async (id: string, question: any) => {
    apiCache.invalidate('questions');
    apiCache.invalidate('qsummaries');
    apiCache.invalidate('media');
    return questionsApi.updateQuestion(id, question);
  },
  duplicateQuestion: async (id: string) => {
    apiCache.invalidate('questions');
    apiCache.invalidate('qsummaries');
    apiCache.invalidate('media');
    return questionsApi.duplicateQuestion(id);
  },
  deleteQuestion: async (id: string) => {
    apiCache.invalidate('questions');
    apiCache.invalidate('qsummaries');
    apiCache.invalidate('media');
    return questionsApi.deleteQuestion(id);
  },
  deleteMultipleQuestions: async (ids: string[]) => {
    apiCache.invalidate('questions');
    apiCache.invalidate('qsummaries');
    apiCache.invalidate('media');
    return questionsApi.deleteMultipleQuestions(ids);
  },
  importQuestions: async (data: any) => {
    apiCache.invalidate('questions');
    apiCache.invalidate('qsummaries');
    apiCache.invalidate('media');
    return questionsApi.importQuestions(data);
  },
  getQuestionBankExportUrl: () => '/api/question-bank/export',

  // Templates (MySQL)
  getTemplates: (forceRefresh = false) => apiCache.fetchWithCache('templates', () => templatesApi.getTemplates(), 30000, forceRefresh),
  getTemplate: templatesApi.getTemplate.bind(templatesApi),
  createTemplate: (t: any) => templatesApi.createTemplate(t),
  deleteTemplate: (id: string) => templatesApi.deleteTemplate(id),

  // Assets & Media (MySQL)
  getMedia: (subject?: string, forceRefresh = false) => apiCache.fetchWithCache(`media-${subject || 'all'}`, () => assetsApi.getMedia(subject), 10000, forceRefresh),
  uploadAsset: async (file: File, subject?: string) => {
    apiCache.invalidate('media');
    return assetsApi.uploadAsset(file, subject);
  },
  uploadImage: async (file: File, subject?: string) => {
    apiCache.invalidate('media');
    return assetsApi.uploadImage(file, subject);
  },
  uploadBase64Image: async (base64Str: string, subject?: string, name?: string) => {
    apiCache.invalidate('media');
    return assetsApi.uploadBase64Image(base64Str, subject, name);
  },
  deleteMedia: async (id: string) => {
    apiCache.invalidate('media');
    return assetsApi.deleteMedia(id);
  },

  // Symbols & Science (MySQL)
  getSymbols: symbolsApi.getSymbols.bind(symbolsApi),
  getPhysicsChapters: scienceApi.getPhysicsChapters.bind(scienceApi),
  getChemistryElements: scienceApi.getChemistryElements.bind(scienceApi),
  getChemistryNotations: scienceApi.getChemistryNotations.bind(scienceApi),
  getUnits: scienceApi.getUnits.bind(scienceApi),
  getPrefixes: scienceApi.getPrefixes.bind(scienceApi),
  getConstants: scienceApi.getConstants.bind(scienceApi),

  // Settings (MySQL)
  getSettings: settingsApi.getSettings.bind(settingsApi),
  updateSettings: settingsApi.updateSettings.bind(settingsApi)
};
