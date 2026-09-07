import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/mysql.js';

export const symbolsRouter = Router();

// GET /api/symbols
symbolsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM `symbols` ORDER BY `category` ASC, `symbol_character` ASC');
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    next(err);
  }
});
