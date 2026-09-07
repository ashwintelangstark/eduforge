import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/mysql.js';

export const templatesRouter = Router();

function parseJson(val: any, defaultVal: any = {}) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
}

// GET /api/templates
templatesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM `templates` ORDER BY `created_at` DESC');
    const formatted = (rows || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      settings: parseJson(t.settings, {}),
      defaultMetadata: parseJson(t.default_metadata, {}),
      defaultSections: parseJson(t.default_sections, []),
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/templates/:id
templatesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM `templates` WHERE `id` = ? LIMIT 1', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      });
    }

    const t = rows[0];
    res.json({
      success: true,
      data: {
        id: t.id,
        name: t.name,
        description: t.description,
        settings: parseJson(t.settings, {}),
        defaultMetadata: parseJson(t.default_metadata, {}),
        defaultSections: parseJson(t.default_sections, []),
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});
