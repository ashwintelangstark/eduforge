import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { questionsRouter } from './routes/questions.routes.js';
import { questionBankRouter } from './routes/questionBank.routes.js';
import { subjectsRouter } from './routes/subjects.routes.js';
import { chaptersRouter } from './routes/chapters.routes.js';
import { templatesRouter } from './routes/templates.routes.js';
import { symbolsRouter } from './routes/symbols.routes.js';
import { scienceRouter } from './routes/science.routes.js';
import { assetsRouter } from './routes/assets.routes.js';
import { papersRouter } from './routes/papers.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { attemptsRouter } from './routes/attempts.routes.js';

export const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-subject', 'x-user-role', 'X-Requested-With']
}));
app.options('*', cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

import path from 'path';
import fs from 'fs';
import { db, getDbHealthInfo } from './config/mysql.js';

// Healthcheck & API Status Endpoints
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'EduForge API Server Running', timestamp: new Date().toISOString() });
});

app.get(['/health', '/api/health', '/db-health', '/api/db-health'], async (req, res) => {
  try {
    const [rows]: any = await db.query('SHOW TABLES;');
    const tables = (rows || []).map((r: any) => Object.values(r)[0]);
    res.json({
      status: 'healthy',
      connected: true,
      info: getDbHealthInfo(),
      tablesCount: tables.length,
      tables: tables,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      connected: false,
      info: getDbHealthInfo(),
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }
});


// Serve uploaded media files and frontend static assets
import { possibleUploadDirs } from './routes/assets.routes.js';

possibleUploadDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    app.use('/uploads', express.static(dir));
    app.use('/api/uploads', express.static(dir));
    app.use('/public/uploads', express.static(dir));
    app.use('/api/public/uploads', express.static(dir));
    app.use('/api/api/uploads', express.static(dir));
  }
});

// Dynamic fallback file streaming for uploads (searches all possible upload directories)
app.use(['/uploads', '/api/uploads', '/public/uploads', '/api/public/uploads', '/api/api/uploads'], (req, res, next) => {
  const filename = path.basename(req.path);
  if (!filename || filename === '.' || filename === '/') return next();

  for (const dir of possibleUploadDirs) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
  }

  try {
    const decoded = decodeURIComponent(filename);
    for (const dir of possibleUploadDirs) {
      const fullPath = path.join(dir, decoded);
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }
  } catch {}

  next();
});

const publicPath = path.join(process.cwd(), 'public');
const distStaticPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}
if (fs.existsSync(distStaticPath)) {
  app.use(express.static(distStaticPath));
}

// Auth Endpoints
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/api/api/auth', authRouter);

// REST API Endpoints (Support multiple base paths for cPanel Passenger compatibility)
app.use('/questions', questionsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/api/questions', questionsRouter);

app.use('/question-bank', questionBankRouter);
app.use('/api/question-bank', questionBankRouter);
app.use('/api/api/question-bank', questionBankRouter);

app.use('/subjects', subjectsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/api/subjects', subjectsRouter);

app.use('/chapters', chaptersRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/api/chapters', chaptersRouter);

app.use('/templates', templatesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/api/templates', templatesRouter);

app.use('/symbols', symbolsRouter);
app.use('/api/symbols', symbolsRouter);
app.use('/api/api/symbols', symbolsRouter);

app.use('/assets', assetsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/api/assets', assetsRouter);

app.use('/media', assetsRouter);
app.use('/api/media', assetsRouter);
app.use('/api/api/media', assetsRouter);

app.use('/papers', papersRouter);
app.use('/api/papers', papersRouter);
app.use('/api/api/papers', papersRouter);

app.use('/exam-papers', papersRouter);
app.use('/api/exam-papers', papersRouter);
app.use('/api/api/exam-papers', papersRouter);

app.use('/attempts', attemptsRouter);
app.use('/api/attempts', attemptsRouter);
app.use('/api/api/attempts', attemptsRouter);

app.use('/test-attempts', attemptsRouter);
app.use('/api/test-attempts', attemptsRouter);
app.use('/api/api/test-attempts', attemptsRouter);

app.use('/settings', settingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/api/settings', settingsRouter);

app.use('/', scienceRouter);
app.use('/api', scienceRouter);
app.use('/api/api', scienceRouter);

// SPA Routing Fallback for Frontend Single-Page App
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/auth') ||
    req.path.startsWith('/questions') ||
    req.path.startsWith('/question-bank') ||
    req.path.startsWith('/subjects') ||
    req.path.startsWith('/chapters') ||
    req.path.startsWith('/templates') ||
    req.path.startsWith('/assets') ||
    req.path.startsWith('/media') ||
    req.path.startsWith('/papers')
  ) {
    return next();
  }

  const indexInPublic = path.join(publicPath, 'index.html');
  const indexInDist = path.join(distStaticPath, 'index.html');

  if (fs.existsSync(indexInPublic)) {
    return res.sendFile(indexInPublic);
  } else if (fs.existsSync(indexInDist)) {
    return res.sendFile(indexInDist);
  }

  next();
});

// Global Error Handler
app.use(errorHandler);
