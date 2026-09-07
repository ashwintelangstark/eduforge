import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/mysql.js';

export const settingsRouter = Router();

const defaultSettings = {
  defaultFont: 'Calibri, sans-serif',
  defaultFontSize: 10.5,
  defaultPaperSize: 'A4',
  defaultMargins: { top: 15, bottom: 15, left: 15, right: 15 },
  defaultQuestionStyle: 'number_dot',
  defaultOptionStyle: 'grid_2x2',
  defaultEquationSize: 12,
  autosaveIntervalMs: 2000,
  theme: 'white',
  exportSettings: {
    pdfDpi: 300,
    embedFonts: true,
    showPageNumbers: true
  },
  backupSettings: {
    autoBackupDaily: true,
    maxBackupsToKeep: 5
  }
};

// GET /api/settings
settingsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM `app_settings` WHERE `key_name` = 'general_settings' LIMIT 1");
    if (!rows || rows.length === 0 || !rows[0].value) {
      return res.json({ success: true, data: defaultSettings });
    }
    const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    res.json({ success: true, data: val });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
settingsRouter.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const jsonStr = JSON.stringify(body);

    await db.query(
      "INSERT INTO `app_settings` (`key_name`, `value`) VALUES ('general_settings', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [jsonStr]
    );

    res.json({ success: true, data: body });
  } catch (err) {
    next(err);
  }
});
