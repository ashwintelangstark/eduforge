import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/mysql.js';

export const papersRouter = Router();

function parseJson(val: any, defaultVal: any = {}) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
}

// GET /api/papers
papersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, subject } = req.query;
    let sql = 'SELECT * FROM `papers` WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND `title` LIKE ?';
      params.push(`%${search}%`);
    }

    if (subject && subject !== 'all' && subject !== 'All') {
      sql += ' AND (LOWER(`title`) LIKE ? OR LOWER(`metadata`) LIKE ? OR LOWER(`sections`) LIKE ?)';
      const s = `%${String(subject).toLowerCase()}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY `created_at` DESC';

    const [rows]: any = await db.query(sql, params);
    const formatted = (rows || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      templateId: p.template_id || 'a4-single-column',
      metadata: parseJson(p.metadata, {}),
      settings: parseJson(p.settings, {}),
      sections: parseJson(p.sections, []),
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/papers/:id
papersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM `papers` WHERE `id` = ? LIMIT 1', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAPER_NOT_FOUND', message: 'Paper not found' }
      });
    }

    const p = rows[0];
    const formatted = {
      id: p.id,
      title: p.title,
      templateId: p.template_id || 'a4-single-column',
      metadata: parseJson(p.metadata, {}),
      settings: parseJson(p.settings, {}),
      sections: parseJson(p.sections, []),
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

// POST /api/papers
papersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const newId = body.id || crypto.randomUUID();
    const template_id = isUuid(body.templateId) ? body.templateId : null;
    const metaJson = JSON.stringify(body.metadata || {});
    const settingsJson = JSON.stringify(body.settings || {});
    const sectionsJson = JSON.stringify(body.sections || []);

    await db.query(
      `INSERT INTO ` + '`papers`' + ` (\`id\`, \`title\`, \`template_id\`, \`metadata\`, \`settings\`, \`sections\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, body.title || 'Untitled Test', template_id, metaJson, settingsJson, sectionsJson]
    );

    const [created]: any = await db.query('SELECT * FROM `papers` WHERE `id` = ?', [newId]);
    const p = created[0];

    res.status(201).json({
      success: true,
      data: {
        id: p.id,
        title: p.title,
        templateId: p.template_id || body.templateId || 'a4-single-column',
        metadata: parseJson(p.metadata, {}),
        settings: parseJson(p.settings, {}),
        sections: parseJson(p.sections, []),
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/papers/:id
papersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const metaJson = body.metadata !== undefined ? JSON.stringify(body.metadata) : null;
    const settingsJson = body.settings !== undefined ? JSON.stringify(body.settings) : null;
    const sectionsJson = body.sections !== undefined ? JSON.stringify(body.sections) : null;

    await db.query(
      `UPDATE \`papers\` SET
         \`title\` = COALESCE(?, \`title\`),
         \`metadata\` = COALESCE(?, \`metadata\`),
         \`settings\` = COALESCE(?, \`settings\`),
         \`sections\` = COALESCE(?, \`sections\`),
         \`updated_at\` = CURRENT_TIMESTAMP
       WHERE \`id\` = ?`,
      [body.title, metaJson, settingsJson, sectionsJson, id]
    );

    const [rows]: any = await db.query('SELECT * FROM `papers` WHERE `id` = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    const p = rows[0];
    res.json({
      success: true,
      data: {
        id: p.id,
        title: p.title,
        templateId: p.template_id,
        metadata: parseJson(p.metadata, {}),
        settings: parseJson(p.settings, {}),
        sections: parseJson(p.sections, []),
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/papers/:id
papersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM `papers` WHERE `id` = ?', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
});
