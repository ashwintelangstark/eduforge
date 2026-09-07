import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/mysql.js';

export const chaptersRouter = Router();

// Helper to resolve or auto-create valid subject_id UUID in MySQL
async function resolveSubjectId(subjectIdOrName?: any): Promise<string | null> {
  if (!subjectIdOrName) {
    const [firstSub]: any = await db.query('SELECT `id` FROM `subjects` LIMIT 1');
    return firstSub && firstSub.length > 0 ? firstSub[0].id : null;
  }

  const strVal = String(subjectIdOrName).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(strVal)) {
    return strVal;
  }

  const [allSubs]: any = await db.query('SELECT `id`, `name`, `code` FROM `subjects`');
  if (Array.isArray(allSubs)) {
    const norm = strVal.toLowerCase();
    const match = allSubs.find(s =>
      s.id === strVal ||
      (s.name || '').trim().toLowerCase() === norm ||
      (s.code || '').trim().toLowerCase() === norm ||
      norm.includes((s.name || '').trim().toLowerCase()) ||
      (s.name || '').trim().toLowerCase().includes(norm)
    );
    if (match) return match.id;
  }

  // Create subject if not exists
  const subCode = strVal.substring(0, 3).toUpperCase();
  const newId = crypto.randomUUID();
  await db.query(
    'INSERT INTO `subjects` (`id`, `name`, `code`, `color`) VALUES (?, ?, ?, ?)',
    [newId, strVal, subCode, 'bg-teal-50 text-teal-700 border-teal-200']
  );

  return newId;
}

// GET /api/chapters
chaptersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.query;

    let sql = `
      SELECT c.*, s.name AS subject_name 
      FROM \`chapters\` c
      LEFT JOIN \`subjects\` s ON c.subject_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (subjectId) {
      const targetUuid = await resolveSubjectId(subjectId as string);
      if (targetUuid) {
        sql += ' AND c.subject_id = ?';
        params.push(targetUuid);
      }
    }

    sql += ' ORDER BY c.created_at DESC';

    const [chaptersRows]: any = await db.query(sql, params);
    const [questionsRows]: any = await db.query('SELECT `id`, `chapter_id`, `subject_id` FROM `questions`');

    let chapters = chaptersRows || [];
    const userSubject = (req.query.userSubject || req.query.subject || req.headers['x-user-subject'] || 'All') as string;
    if (userSubject && userSubject !== 'All') {
      chapters = chapters.filter((c: any) => (c.subject_name || '').toLowerCase() === userSubject.toLowerCase());
    }

    const questions = questionsRows || [];

    const formatted = chapters.map((ch: any) => {
      const chId = String(ch.id || '').toLowerCase();

      const qCount = questions.filter((q: any) => {
        const qChId = q.chapter_id ? String(q.chapter_id).toLowerCase() : '';
        return qChId === chId;
      }).length;

      return {
        id: ch.id,
        title: ch.title,
        code: ch.chapter_code,
        subject: ch.subject_name || 'Biology',
        subjectId: ch.subject_id,
        count: qCount
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// POST /api/chapters
chaptersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, subject, title, name, code } = req.body;
    const targetUuid = await resolveSubjectId(subjectId || subject);
    const chapterTitle = (title || name || '').trim();

    // Prevent duplicate chapters under same subject
    if (targetUuid && chapterTitle) {
      const [existingChapters]: any = await db.query(
        'SELECT c.*, s.name AS subject_name FROM `chapters` c LEFT JOIN `subjects` s ON c.subject_id = s.id WHERE c.subject_id = ?',
        [targetUuid]
      );

      if (Array.isArray(existingChapters) && existingChapters.length > 0) {
        const cClean = chapterTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = existingChapters.find(c => {
          const tLower = (c.title || '').trim().toLowerCase();
          if (tLower === chapterTitle.toLowerCase()) return true;
          const tClean = tLower.replace(/[^a-z0-9]/g, '');
          if (tClean && cClean && tClean === cClean) return true;
          return false;
        });

        if (matched) {
          return res.status(200).json({
            success: true,
            data: {
              id: matched.id,
              title: matched.title,
              code: matched.chapter_code,
              subject: matched.subject_name || subject || 'Biology',
              subjectId: matched.subject_id,
              count: 0
            }
          });
        }
      }
    }

    const newId = crypto.randomUUID();
    const chapterCode = code || `CH-${Date.now().toString().slice(-4)}`;

    await db.query(
      'INSERT INTO `chapters` (`id`, `subject_id`, `title`, `chapter_code`) VALUES (?, ?, ?, ?)',
      [newId, targetUuid, chapterTitle, chapterCode]
    );

    const [created]: any = await db.query(
      'SELECT c.*, s.name AS subject_name FROM `chapters` c LEFT JOIN `subjects` s ON c.subject_id = s.id WHERE c.id = ?',
      [newId]
    );

    const formatted = {
      id: created[0].id,
      title: created[0].title,
      code: created[0].chapter_code,
      subject: created[0].subject_name || subject || 'Biology',
      subjectId: created[0].subject_id,
      count: 0
    };

    res.status(201).json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// PUT /api/chapters/:id
chaptersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, name, code, subject, subjectId } = req.body;

    let targetUuid: string | null = null;
    if (subjectId || subject) {
      targetUuid = await resolveSubjectId(subjectId || subject);
    }

    await db.query(
      'UPDATE `chapters` SET `title` = COALESCE(?, `title`), `chapter_code` = COALESCE(?, `chapter_code`), `subject_id` = COALESCE(?, `subject_id`) WHERE `id` = ?',
      [title || name, code, targetUuid, id]
    );

    const [rows]: any = await db.query(
      'SELECT c.*, s.name AS subject_name FROM `chapters` c LEFT JOIN `subjects` s ON c.subject_id = s.id WHERE c.id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chapter not found' });
    }

    const formatted = {
      id: rows[0].id,
      title: rows[0].title,
      code: rows[0].chapter_code,
      subject: rows[0].subject_name || subject || 'Biology',
      subjectId: rows[0].subject_id,
      count: 0
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chapters/:id
chaptersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM `chapters` WHERE `id` = ?', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
});
