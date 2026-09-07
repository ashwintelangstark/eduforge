import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/mysql.js';

export const scienceRouter = Router();

// GET /api/physics/chapters or /api/physics
scienceRouter.get('/physics/chapters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM `science_libraries` WHERE `category` = 'physics' ORDER BY `name` ASC");
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/chemistry/elements
scienceRouter.get('/chemistry/elements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM `science_libraries` WHERE `category` = 'chemistry' ORDER BY `name` ASC");
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/chemistry/notations
scienceRouter.get('/chemistry/notations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM `science_libraries` WHERE `category` = 'chemistry_notations' ORDER BY `name` ASC");
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/units
scienceRouter.get('/units', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM `science_libraries` WHERE `category` = 'units' ORDER BY `name` ASC");
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/constants
scienceRouter.get('/constants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM `science_libraries` WHERE `category` = 'constants' ORDER BY `name` ASC");
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    next(err);
  }
});
