import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/mysql.js';

export const subjectsRouter = Router();

// GET /api/subjects
subjectsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [subsRows]: any = await db.query('SELECT * FROM `subjects` ORDER BY `name` ASC');
    const [chRows]: any = await db.query('SELECT `id`, `subject_id`, `title` FROM `chapters`');
    const [qRows]: any = await db.query('SELECT `id`, `subject_id`, `chapter_id` FROM `questions`');

    let subjects = subsRows || [];
    const userSubject = (req.query.userSubject || req.query.subject || req.headers['x-user-subject'] || 'All') as string;
    if (userSubject && userSubject !== 'All') {
      subjects = subjects.filter((s: any) => s.name.toLowerCase() === userSubject.toLowerCase());
    }

    const chapters = chRows || [];
    const questions = qRows || [];

    const formatted = subjects.map((s: any) => {
      const sId = String(s.id || '').toLowerCase();

      const chCount = chapters.filter((c: any) => {
        const cSubId = c.subject_id ? String(c.subject_id).toLowerCase() : '';
        return cSubId === sId;
      }).length;

      const qCount = questions.filter((q: any) => {
        const qSubId = q.subject_id ? String(q.subject_id).toLowerCase() : '';
        return qSubId === sId;
      }).length;

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        color: s.color || 'bg-slate-50 text-slate-700 border-slate-200',
        chapters: chCount,
        questions: qCount
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// POST /api/subjects
subjectsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, color } = req.body;
    const newId = crypto.randomUUID();
    const finalCode = code || name.substring(0, 3).toUpperCase();
    const finalColor = color || 'bg-sky-50 text-sky-700 border-sky-200';

    await db.query(
      'INSERT INTO `subjects` (`id`, `name`, `code`, `color`) VALUES (?, ?, ?, ?)',
      [newId, name, finalCode, finalColor]
    );

    const [rows]: any = await db.query('SELECT * FROM `subjects` WHERE `id` = ?', [newId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/subjects/:id
subjectsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, color } = req.body;

    await db.query(
      'UPDATE `subjects` SET `name` = COALESCE(?, `name`), `code` = COALESCE(?, `code`), `color` = COALESCE(?, `color`) WHERE `id` = ?',
      [name, code, color, id]
    );

    const [rows]: any = await db.query('SELECT * FROM `subjects` WHERE `id` = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/subjects/:id
subjectsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM `subjects` WHERE `id` = ?', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
});
