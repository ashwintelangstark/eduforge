import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/mysql.js';

export const attemptsRouter = Router();

function parseJson(val: any, defaultVal: any = {}) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
}

// GET /api/attempts - Fetch all test attempt logs
attemptsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query(`
      SELECT a.*, p.title AS paper_title 
      FROM \`test_attempts\` a
      LEFT JOIN \`papers\` p ON a.paper_id = p.id
      ORDER BY a.created_at DESC
    `);

    const formatted = (rows || []).map((a: any) => ({
      id: a.id,
      paperId: a.paper_id,
      test: a.paper_title || 'General Assessment',
      student: a.student_name,
      studentId: a.student_id,
      answers: parseJson(a.answers, {}),
      score: a.score,
      totalMarks: a.total_marks,
      timeSpentSeconds: a.time_spent_seconds,
      status: a.status,
      createdAt: a.created_at
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/attempts/:id
attemptsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query(
      `SELECT a.*, p.title AS paper_title 
       FROM \`test_attempts\` a
       LEFT JOIN \`papers\` p ON a.paper_id = p.id
       WHERE a.id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ATTEMPT_NOT_FOUND', message: 'Test attempt record not found' }
      });
    }

    const a = rows[0];
    res.json({
      success: true,
      data: {
        id: a.id,
        paperId: a.paper_id,
        test: a.paper_title || 'General Assessment',
        student: a.student_name,
        studentId: a.student_id,
        answers: parseJson(a.answers, {}),
        score: a.score,
        totalMarks: a.total_marks,
        timeSpentSeconds: a.time_spent_seconds,
        status: a.status,
        createdAt: a.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/attempts
attemptsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const newId = body.id || crypto.randomUUID();
    const answersJson = JSON.stringify(body.answers || {});

    await db.query(
      `INSERT INTO \`test_attempts\` (\`id\`, \`paper_id\`, \`student_name\`, \`student_id\`, \`answers\`, \`score\`, \`total_marks\`, \`time_spent_seconds\`, \`status\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        body.paperId || null,
        body.student || body.student_name || 'Anonymous Student',
        body.studentId || null,
        answersJson,
        Number(body.score) || 0,
        Number(body.totalMarks) || 100,
        Number(body.timeSpentSeconds) || 0,
        body.status || 'completed'
      ]
    );

    const [rows]: any = await db.query('SELECT * FROM `test_attempts` WHERE `id` = ?', [newId]);
    const a = rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: a.id,
        student: a.student_name,
        test: 'General Assessment',
        score: a.score,
        status: a.status,
        createdAt: a.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/attempts/:id
attemptsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM `test_attempts` WHERE `id` = ?', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
});
