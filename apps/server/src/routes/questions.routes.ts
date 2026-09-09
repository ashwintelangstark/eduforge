import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from '../config/mysql.js';
import { primaryUploadsDir, mirrorFile, possibleUploadDirs } from './assets.routes.js';

export const questionsRouter = Router();

// Helper to safely parse JSON or return original
function parseJsonField(val: any, defaultVal: any = []) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
}

// Automatically extracts base64 data URIs from input, dumps them into public/uploads,
// records them in the MySQL assets table, and returns the updated content with /uploads/ path.
export async function dumpBase64Images(data: any): Promise<any> {
  if (!data) return data;

  if (typeof data === 'string') {
    // Check for single data URI or HTML with data URIs
    const base64Regex = /data:image\/([a-zA-Z+]+);base64,([A-Za-z0-9+/=]+)/g;
    let match;
    let resultStr = data;

    // Direct single data URI
    if (data.startsWith('data:image/')) {
      const singleMatch = data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (singleMatch) {
        const mimeSub = singleMatch[1];
        const ext = mimeSub.includes('jpeg') || mimeSub.includes('jpg') ? '.jpg' : (mimeSub.includes('webp') ? '.webp' : '.png');
        const buffer = Buffer.from(singleMatch[2], 'base64');
        const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(primaryUploadsDir, unique);
        fs.writeFileSync(filePath, buffer);
        mirrorFile(unique);
        const publicUrl = `/uploads/${unique}`;
        try {
          await db.query(
            `INSERT INTO \`assets\` (\`id\`, \`storage_path\`, \`public_url\`, \`filename\`, \`mime_type\`, \`size_bytes\`)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), `uploads/${unique}`, publicUrl, unique, `image/${mimeSub}`, buffer.length]
          );
        } catch {}
        return publicUrl;
      }
    }

    // Replace embedded data URIs in HTML/strings
    const matches: { full: string; mime: string; b64: string }[] = [];
    while ((match = base64Regex.exec(data)) !== null) {
      matches.push({ full: match[0], mime: match[1], b64: match[2] });
    }

    for (const m of matches) {
      try {
        const ext = m.mime.includes('jpeg') || m.mime.includes('jpg') ? '.jpg' : (m.mime.includes('webp') ? '.webp' : '.png');
        const buffer = Buffer.from(m.b64, 'base64');
        const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(primaryUploadsDir, unique);
        fs.writeFileSync(filePath, buffer);
        mirrorFile(unique);
        const publicUrl = `/uploads/${unique}`;
        try {
          await db.query(
            `INSERT INTO \`assets\` (\`id\`, \`storage_path\`, \`public_url\`, \`filename\`, \`mime_type\`, \`size_bytes\`)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), `uploads/${unique}`, publicUrl, unique, `image/${m.mime}`, buffer.length]
          );
        } catch {}
        resultStr = resultStr.split(m.full).join(publicUrl);
      } catch {}
    }
    return resultStr;
  }

  if (Array.isArray(data)) {
    const mapped = [];
    for (const item of data) {
      mapped.push(await dumpBase64Images(item));
    }
    return mapped;
  }

  if (typeof data === 'object') {
    const copy: any = {};
    for (const key of Object.keys(data)) {
      copy[key] = await dumpBase64Images(data[key]);
    }
    return copy;
  }

  return data;
}

// Helper to format a question record for frontend consumption
function formatQuestion(q: any, options: any[] = []) {
  const content = parseJsonField(q.content, []);
  const explanation = parseJsonField(q.explanation, []);

  let diagramSvg: string | null = null;
  let diagramUrl: string | null = null;

  if (Array.isArray(content)) {
    for (const blk of content) {
      if (blk.diagramSvg || blk.svg) {
        diagramSvg = blk.diagramSvg || blk.svg;
      }
      if (blk.type === 'diagram' && (blk.diagramSvg || blk.svg)) {
        diagramSvg = blk.diagramSvg || blk.svg;
      }
      if (blk.type === 'image' && (blk.url || blk.src || blk.imageUrl)) {
        diagramUrl = blk.url || blk.src || blk.imageUrl;
      }
      if (blk.diagramUrl || blk.imageUrl || blk.url) {
        diagramUrl = blk.diagramUrl || blk.imageUrl || blk.url;
      }
    }
  }

  // Also check if raw_text contains an <img> tag if diagramUrl wasn't found in blocks
  if (!diagramUrl && q.raw_text && /<img\s+/i.test(q.raw_text)) {
    const match = q.raw_text.match(/src=["']([^"']+)["']/i);
    if (match) diagramUrl = match[1];
  }

  const formattedOptions = (options || []).map((opt: any) => {
    const optContent = parseJsonField(opt.content, []);
    let textVal = opt.raw_text || '';
    if (!textVal && Array.isArray(optContent)) {
      textVal = optContent.map((c: any) => c.latex ? `\\(${c.latex}\\)` : (c.html || c.text || '')).join(' ');
    }

    // Extract option image from opt.imageUrl, opt.image_url, or optContent blocks
    let optImageUrl = opt.imageUrl || opt.image_url || undefined;
    if (!optImageUrl && Array.isArray(optContent)) {
      const imgBlock = optContent.find((b: any) => b.type === 'image' || b.imageUrl || b.url || b.src);
      if (imgBlock) optImageUrl = imgBlock.imageUrl || imgBlock.url || imgBlock.src;
    }
    if (!optImageUrl && opt.raw_text && /<img\s+/i.test(opt.raw_text)) {
      const m = opt.raw_text.match(/src=["']([^"']+)["']/i);
      if (m) optImageUrl = m[1];
    }

    return {
      id: opt.id,
      key: opt.option_key ? String(opt.option_key).toUpperCase() : 'A',
      option_key: opt.option_key ? String(opt.option_key).toLowerCase() : 'a',
      content: optContent,
      rawText: textVal,
      imageUrl: optImageUrl,
      image_url: optImageUrl,
      isCorrect: String(q.correct_option || '').toLowerCase() === String(opt.option_key || '').toLowerCase()
    };
  });

  // Fallback subject deduction from question code prefix if subject is null / General
  let resolvedSubject = q.subject_name;
  if (!resolvedSubject || resolvedSubject === 'General') {
    const code = String(q.question_code || '').toUpperCase();
    if (code.startsWith('PHY')) resolvedSubject = 'Physics';
    else if (code.startsWith('CHE')) resolvedSubject = 'Chemistry';
    else if (code.startsWith('BIO') || code.startsWith('BOT') || code.startsWith('ZOO')) resolvedSubject = 'Biology';
    else if (code.startsWith('MAT') || code.startsWith('MTH')) resolvedSubject = 'Mathematics';
    else resolvedSubject = 'General';
  }

  return {
    id: q.id,
    questionCode: q.question_code,
    question_code: q.question_code,
    questionType: q.question_type || 'MCQ_SINGLE',
    question_type: q.question_type || 'MCQ_SINGLE',
    content,
    explanation,
    difficulty: q.difficulty || 'Medium',
    marks: Number(q.marks) || 4,
    negativeMarks: Number(q.negative_marks) || 1,
    correctAnswer: String(q.correct_option || 'a').toUpperCase(),
    correctOption: String(q.correct_option || 'a').toLowerCase(),
    correct_option: String(q.correct_option || 'a').toLowerCase(),
    optionLayout: q.option_layout || 'grid_2x2',
    year: q.year,
    source: q.source,
    rawText: q.raw_text || '',
    diagramSvg: diagramSvg || undefined,
    diagramUrl: diagramUrl || undefined,
    imageUrl: diagramUrl || undefined,
    subject: resolvedSubject,
    subject_name: resolvedSubject,
    subjectId: q.subject_id,
    subject_id: q.subject_id,
    chapter: q.chapter_title || 'General',
    chapter_name: q.chapter_title || 'General',
    chapterId: q.chapter_id,
    chapter_id: q.chapter_id,
    options: formattedOptions,
    createdAt: q.created_at,
    updatedAt: q.updated_at
  };
}

// GET /api/questions - Full question list with options from MySQL
questionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, chapter, difficulty, search } = req.query;

    let sql = `
      SELECT 
        q.*,
        s.name AS subject_name,
        c.title AS chapter_title
      FROM \`questions\` q
      LEFT JOIN \`subjects\` s ON q.subject_id = s.id
      LEFT JOIN \`chapters\` c ON q.chapter_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (subject && subject !== 'all' && subject !== 'All') {
      sql += ' AND (LOWER(s.name) = LOWER(?) OR LOWER(s.code) = LOWER(?) OR q.subject_id = ?)';
      params.push(subject, subject, subject);
    }

    if (chapter && chapter !== 'all' && chapter !== 'All') {
      sql += ' AND (LOWER(c.title) = LOWER(?) OR LOWER(c.chapter_code) = LOWER(?) OR q.chapter_id = ?)';
      params.push(chapter, chapter, chapter);
    }

    if (difficulty && difficulty !== 'all') {
      sql += ' AND q.difficulty = ?';
      params.push(difficulty);
    }

    if (search) {
      sql += ' AND (q.raw_text LIKE ? OR q.question_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY q.created_at DESC';

    const [questions]: any = await db.query(sql, params);
    if (!questions || questions.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Fetch all options for these questions
    const [allOptions]: any = await db.query('SELECT * FROM `question_options` ORDER BY `sort_order` ASC');

    const optionsByQid = new Map<string, any[]>();
    for (const opt of allOptions || []) {
      const qId = String(opt.question_id);
      if (!optionsByQid.has(qId)) optionsByQid.set(qId, []);
      optionsByQid.get(qId)!.push(opt);
    }

    let formattedList = questions.map((q: any) =>
      formatQuestion(q, optionsByQid.get(String(q.id)) || [])
    );

    if (subject && subject !== 'all') {
      const subStr = String(subject).toLowerCase();
      formattedList = formattedList.filter((q: any) =>
        (q.subject || '').toLowerCase() === subStr ||
        (q.subject_name || '').toLowerCase() === subStr ||
        (q.subject || '').toLowerCase().includes(subStr) ||
        String(q.subject_id || '') === String(subject)
      );
    }

    if (chapter && chapter !== 'all') {
      const chStr = String(chapter).toLowerCase();
      formattedList = formattedList.filter((q: any) =>
        (q.chapter || '').toLowerCase() === chStr ||
        (q.chapter_name || '').toLowerCase() === chStr ||
        (q.chapter || '').toLowerCase().includes(chStr) ||
        String(q.chapter_id || '') === String(chapter)
      );
    }

    res.json({ success: true, data: formattedList });
  } catch (err) {
    next(err);
  }
});

// GET /api/questions/:id - Single question detail
questionsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [rows]: any = await db.query(
      `SELECT q.*, s.name AS subject_name, c.title AS chapter_title 
       FROM \`questions\` q
       LEFT JOIN \`subjects\` s ON q.subject_id = s.id
       LEFT JOIN \`chapters\` c ON q.chapter_id = c.id
       WHERE q.id = ? OR q.question_code = ?
       LIMIT 1`,
      [id, id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const q = rows[0];
    const [options]: any = await db.query(
      'SELECT * FROM `question_options` WHERE `question_id` = ? ORDER BY `sort_order` ASC',
      [q.id]
    );

    res.json({ success: true, data: formatQuestion(q, options || []) });
  } catch (err) {
    next(err);
  }
});

// POST /api/questions - Create new question in MySQL
questionsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = await dumpBase64Images(req.body);
    const newId = body.id || crypto.randomUUID();
    const qCode = body.questionCode || body.question_code || `Q-${Date.now().toString().slice(-6)}`;

    // Resolve subject & chapter IDs
    let subjectId = body.subjectId || body.subject_id || null;
    let chapterId = body.chapterId || body.chapter_id || null;

    if (!subjectId && body.subject) {
      const [s]: any = await db.query('SELECT `id` FROM `subjects` WHERE LOWER(`name`) = LOWER(?) LIMIT 1', [body.subject]);
      if (s && s.length > 0) subjectId = s[0].id;
    }

    if (!chapterId && body.chapter) {
      const [c]: any = await db.query('SELECT `id` FROM `chapters` WHERE LOWER(`title`) = LOWER(?) LIMIT 1', [body.chapter]);
      if (c && c.length > 0) chapterId = c[0].id;
    }

    const contentJson = JSON.stringify(body.content || []);
    const explanationJson = JSON.stringify(body.explanation || []);
    const difficulty = body.difficulty || 'Medium';
    const marks = Number(body.marks) || 4;
    const negMarks = Number(body.negativeMarks ?? body.negative_marks ?? 1);
    const correctOption = (body.correctOption || body.correct_option || body.correctAnswer || 'a').toLowerCase();
    const optionLayout = body.optionLayout || body.option_layout || 'grid_2x2';
    const year = body.year || 2024;
    const source = body.source || 'Question Bank';
    const rawText = body.rawText || body.raw_text || '';

    await db.query(
      `INSERT INTO \`questions\` 
       (\`id\`, \`question_code\`, \`subject_id\`, \`chapter_id\`, \`question_type\`, \`content\`, \`explanation\`, \`difficulty\`, \`marks\`, \`negative_marks\`, \`correct_option\`, \`option_layout\`, \`year\`, \`source\`, \`raw_text\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, qCode, subjectId, chapterId, body.questionType || 'MCQ', contentJson, explanationJson, difficulty, marks, negMarks, correctOption, optionLayout, year, source, rawText]
    );

    // Insert options
    if (Array.isArray(body.options)) {
      for (let i = 0; i < body.options.length; i++) {
        const opt = body.options[i];
        const optId = opt.id || crypto.randomUUID();
        const optKey = (opt.key || opt.option_key || String.fromCharCode(97 + i)).toLowerCase();
        let contentArr = opt.content || [];
        if (!Array.isArray(contentArr)) contentArr = [contentArr];
        const optImg = opt.imageUrl || opt.image_url;
        if (optImg && !contentArr.some((c: any) => c.type === 'image')) {
          contentArr.push({ type: 'image', url: optImg, src: optImg, imageUrl: optImg });
        }
        const optContent = JSON.stringify(contentArr);
        const optRaw = opt.rawText || opt.raw_text || '';
        await db.query(
          `INSERT INTO \`question_options\` (\`id\`, \`question_id\`, \`option_key\`, \`content\`, \`raw_text\`, \`sort_order\`)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [optId, newId, optKey, optContent, optRaw, i + 1]
        );
      }
    }

    const [created]: any = await db.query(
      `SELECT q.*, s.name AS subject_name, c.title AS chapter_title 
       FROM \`questions\` q
       LEFT JOIN \`subjects\` s ON q.subject_id = s.id
       LEFT JOIN \`chapters\` c ON q.chapter_id = c.id
       WHERE q.id = ?`,
      [newId]
    );

    const [savedOpts]: any = await db.query(
      'SELECT * FROM `question_options` WHERE `question_id` = ? ORDER BY `sort_order` ASC',
      [newId]
    );

    res.status(201).json({ success: true, data: formatQuestion(created[0], savedOpts || []) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/questions/:id - Update existing question in MySQL
questionsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = await dumpBase64Images(req.body);

    const [existing]: any = await db.query('SELECT * FROM `questions` WHERE `id` = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Resolve subject & chapter IDs if provided
    let subjectId = body.subjectId || body.subject_id;
    let chapterId = body.chapterId || body.chapter_id;

    if (!subjectId && body.subject) {
      const [s]: any = await db.query('SELECT `id` FROM `subjects` WHERE LOWER(`name`) = LOWER(?) LIMIT 1', [body.subject]);
      if (s && s.length > 0) subjectId = s[0].id;
    }

    if (!chapterId && body.chapter) {
      const [c]: any = await db.query('SELECT `id` FROM `chapters` WHERE LOWER(`title`) = LOWER(?) LIMIT 1', [body.chapter]);
      if (c && c.length > 0) chapterId = c[0].id;
    }

    const contentJson = body.content !== undefined ? JSON.stringify(body.content) : existing[0].content;
    const explanationJson = body.explanation !== undefined ? JSON.stringify(body.explanation) : existing[0].explanation;
    const correctOption = (body.correctOption || body.correct_option || body.correctAnswer || existing[0].correct_option || 'a').toLowerCase();
    const qCode = body.questionCode || body.question_code;

    await db.query(
      `UPDATE \`questions\` SET
         \`question_code\` = COALESCE(?, \`question_code\`),
         \`subject_id\` = COALESCE(?, \`subject_id\`),
         \`chapter_id\` = COALESCE(?, \`chapter_id\`),
         \`question_type\` = COALESCE(?, \`question_type\`),
         \`content\` = ?,
         \`explanation\` = ?,
         \`difficulty\` = COALESCE(?, \`difficulty\`),
         \`marks\` = COALESCE(?, \`marks\`),
         \`negative_marks\` = COALESCE(?, \`negative_marks\`),
         \`correct_option\` = ?,
         \`option_layout\` = COALESCE(?, \`option_layout\`),
         \`year\` = COALESCE(?, \`year\`),
         \`source\` = COALESCE(?, \`source\`),
         \`raw_text\` = COALESCE(?, \`raw_text\`),
         \`updated_at\` = CURRENT_TIMESTAMP
       WHERE \`id\` = ?`,
      [
        qCode,
        subjectId,
        chapterId,
        body.questionType || body.question_type,
        contentJson,
        explanationJson,
        body.difficulty,
        body.marks,
        body.negativeMarks ?? body.negative_marks,
        correctOption,
        body.optionLayout || body.option_layout,
        body.year,
        body.source,
        body.rawText || body.raw_text,
        id
      ]
    );

    // Update options if provided
    if (Array.isArray(body.options)) {
      await db.query('DELETE FROM `question_options` WHERE `question_id` = ?', [id]);
      for (let i = 0; i < body.options.length; i++) {
        const opt = body.options[i];
        const optId = opt.id || crypto.randomUUID();
        const optKey = (opt.key || opt.option_key || String.fromCharCode(97 + i)).toLowerCase();
        let contentArr = opt.content || [];
        if (!Array.isArray(contentArr)) contentArr = [contentArr];
        const optImg = opt.imageUrl || opt.image_url;
        if (optImg && !contentArr.some((c: any) => c.type === 'image')) {
          contentArr.push({ type: 'image', url: optImg, src: optImg, imageUrl: optImg });
        }
        const optContent = JSON.stringify(contentArr);
        const optRaw = opt.rawText || opt.raw_text || '';
        await db.query(
          `INSERT INTO \`question_options\` (\`id\`, \`question_id\`, \`option_key\`, \`content\`, \`raw_text\`, \`sort_order\`)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [optId, id, optKey, optContent, optRaw, i + 1]
        );
      }
    }

    const [updated]: any = await db.query(
      `SELECT q.*, s.name AS subject_name, c.title AS chapter_title 
       FROM \`questions\` q
       LEFT JOIN \`subjects\` s ON q.subject_id = s.id
       LEFT JOIN \`chapters\` c ON q.chapter_id = c.id
       WHERE q.id = ?`,
      [id]
    );

    const [savedOpts]: any = await db.query(
      'SELECT * FROM `question_options` WHERE `question_id` = ? ORDER BY `sort_order` ASC',
      [id]
    );

    res.json({ success: true, data: formatQuestion(updated[0], savedOpts || []) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/questions/:id
questionsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM `questions` WHERE `id` = ?', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
});
