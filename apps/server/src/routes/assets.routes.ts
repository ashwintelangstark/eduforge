import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from '../config/mysql.js';

export const assetsRouter = Router();

// Robust detection of uploads directory for monorepo dev and standalone server
export const possibleUploadDirs: string[] = Array.from(new Set([
  path.resolve(process.cwd(), 'public', 'uploads'),
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), '..', 'public', 'uploads'),
  path.resolve(process.cwd(), '..', 'uploads'),
  path.resolve(process.cwd(), '..', 'public_html', 'public', 'uploads'),
  path.resolve(process.cwd(), '..', 'public_html', 'uploads'),
  path.resolve(process.cwd(), '..', 'public_html', 'eduforge.haegl.in', 'public', 'uploads'),
  path.resolve(process.cwd(), '..', 'public_html', 'eduforge.haegl.in', 'uploads'),
  path.resolve(process.cwd(), 'apps', 'server', 'public', 'uploads')
]));

// Ensure all possible upload directories exist
for (const dir of possibleUploadDirs) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

// Primary upload directory where files are written
export const primaryUploadsDir = possibleUploadDirs[0];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, primaryUploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Helper to duplicate uploaded file across directory mirrors for instant local serving
export function mirrorFile(filename: string) {
  const src = path.join(primaryUploadsDir, filename);
  if (!fs.existsSync(src)) return;
  for (const dir of possibleUploadDirs) {
    if (dir !== primaryUploadsDir) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const dest = path.join(dir, filename);
        fs.copyFileSync(src, dest);
      } catch {}
    }
  }
}

// GET /api/assets - List all media assets from MySQL
assetsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedSubject = (req.query.subject || req.query.userSubject) as string;
    const [rows]: any = await db.query('SELECT * FROM `assets` ORDER BY `created_at` DESC');

    let assetsList: any[] = (rows || []).map((a: any) => ({
      id: a.id,
      name: a.filename || 'Media Asset',
      filename: a.filename,
      label: (a.storage_path && a.storage_path.includes('/')) ? a.storage_path.split('/')[0].toUpperCase() : 'FIGURE',
      url: a.public_url || '',
      public_url: a.public_url || '',
      storagePath: a.storage_path || '',
      mimeType: a.mime_type || 'image/png',
      sizeBytes: a.size_bytes || 0,
      usesCount: 0,
      createdAt: a.created_at
    }));

    // Filter by subject if requested
    if (requestedSubject && requestedSubject !== 'All' && requestedSubject !== 'all') {
      const subLower = requestedSubject.toLowerCase().trim();
      assetsList = assetsList.filter((a: any) => {
        const pathLower = (a.storagePath || '').toLowerCase();
        const nameLower = (a.name || '').toLowerCase();
        const urlLower = (a.url || '').toLowerCase();
        return pathLower.includes(subLower) || nameLower.includes(subLower) || urlLower.includes(subLower);
      });
    }

    res.json({ success: true, data: assetsList });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets - Upload asset to local disk and save metadata in MySQL
assetsRouter.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE_PROVIDED', message: 'No upload file provided' }
      });
    }

    mirrorFile(file.filename);

    const rawSubject = (req.body.subject || req.query.subject || req.headers['x-user-subject'] || 'general') as string;
    const newId = crypto.randomUUID();
    const publicUrl = `/uploads/${file.filename}`;
    const storagePath = `uploads/${file.filename}`;

    try {
      await db.query(
        `INSERT INTO \`assets\` (\`id\`, \`storage_path\`, \`public_url\`, \`filename\`, \`mime_type\`, \`size_bytes\`)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, storagePath, publicUrl, file.originalname, file.mimetype, file.size]
      );
    } catch (dbErr: any) {
      console.warn('[Assets Upload] Database record warning:', dbErr.message);
    }

    const result = {
      id: newId,
      url: publicUrl,
      public_url: publicUrl,
      originalName: file.originalname,
      filename: file.originalname,
      storagePath,
      subject: rawSubject,
      sizeBytes: file.size
    };

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/base64 - Save base64 image data to disk and record in MySQL
assetsRouter.post('/base64', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { base64, subject, name, filename } = req.body;
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_BASE64_PROVIDED', message: 'No base64 data provided' }
      });
    }

    // Extract format and payload
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let ext = '.png';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : (mimeType.includes('webp') ? '.webp' : '.png');
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    }

    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(primaryUploadsDir, uniqueName);
    fs.writeFileSync(filePath, buffer);
    mirrorFile(uniqueName);

    const newId = crypto.randomUUID();
    const publicUrl = `/uploads/${uniqueName}`;
    const storagePath = `uploads/${uniqueName}`;
    const originalName = filename || name || `image_${Date.now()}${ext}`;

    try {
      await db.query(
        `INSERT INTO \`assets\` (\`id\`, \`storage_path\`, \`public_url\`, \`filename\`, \`mime_type\`, \`size_bytes\`)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, storagePath, publicUrl, originalName, mimeType, buffer.length]
      );
    } catch (dbErr: any) {
      console.warn('[Assets Base64 Upload] Database record warning:', dbErr.message);
    }

    const result = {
      id: newId,
      url: publicUrl,
      public_url: publicUrl,
      originalName,
      filename: uniqueName,
      storagePath,
      subject: subject || 'general',
      sizeBytes: buffer.length
    };

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assets/:id
assetsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM `assets` WHERE `id` = ? LIMIT 1', [id]);
    if (rows && rows.length > 0) {
      const a = rows[0];
      if (a.storage_path) {
        for (const dir of possibleUploadDirs) {
          const fullPath = path.join(dir, path.basename(a.storage_path));
          if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch {}
          }
        }
      }
      await db.query('DELETE FROM `assets` WHERE `id` = ?', [id]);
    }
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/raw/:filename or /api/assets/uploads/:filename - Direct file streaming
assetsRouter.get(['/raw/:filename', '/uploads/:filename'], (req: Request, res: Response, next: NextFunction) => {
  const filename = path.basename(req.params.filename);
  for (const dir of possibleUploadDirs) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
  }
  res.status(404).json({ success: false, error: { message: 'Asset file not found' } });
});
