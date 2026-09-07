import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/mysql.js';

export const questionBankRouter = Router();

function parseJsonField(val: any, defaultVal: any = []) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
}

// GET /api/question-bank - Question Bank Listing from MySQL
questionBankRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
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

    const [allOptions]: any = await db.query('SELECT * FROM `question_options` ORDER BY `sort_order` ASC');
    const optionsByQid = new Map<string, any[]>();
    for (const opt of allOptions || []) {
      const qId = String(opt.question_id);
      if (!optionsByQid.has(qId)) optionsByQid.set(qId, []);
      optionsByQid.get(qId)!.push(opt);
    }

    let formatted = questions.map((q: any) => {
      const content = parseJsonField(q.content, []);
      const explanation = parseJsonField(q.explanation, []);
      const rawOpts = optionsByQid.get(String(q.id)) || [];

      let diagramSvg: string | null = null;
      let diagramUrl: string | null = null;

      if (Array.isArray(content)) {
        for (const blk of content) {
          if (blk.diagramSvg || blk.svg) diagramSvg = blk.diagramSvg || blk.svg;
          if (blk.type === 'diagram' && (blk.diagramSvg || blk.svg)) diagramSvg = blk.diagramSvg || blk.svg;
          if (blk.type === 'image' && (blk.url || blk.src)) diagramUrl = blk.url || blk.src;
          if (blk.diagramUrl || blk.imageUrl || blk.url) diagramUrl = blk.diagramUrl || blk.imageUrl || blk.url;
        }
      }

      if (!diagramUrl && q.raw_text && /<img\s+/i.test(q.raw_text)) {
        const m = q.raw_text.match(/src=["']([^"']+)["']/i);
        if (m) diagramUrl = m[1];
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
        correctAnswer: (q.correct_option || 'a').toUpperCase(),
        correctOption: (q.correct_option || 'a').toLowerCase(),
        correct_option: (q.correct_option || 'a').toLowerCase(),
        optionLayout: q.option_layout || 'grid_2x2',
        year: q.year,
        source: q.source,
        subject: q.subject_name || 'General',
        subject_name: q.subject_name || 'General',
        subjectId: q.subject_id,
        subject_id: q.subject_id,
        chapter: q.chapter_title || 'General',
        chapter_name: q.chapter_title || 'General',
        chapterId: q.chapter_id,
        chapter_id: q.chapter_id,
        rawText: q.raw_text || '',
        diagramSvg: diagramSvg || undefined,
        diagramUrl: diagramUrl || undefined,
        imageUrl: diagramUrl || undefined,
        options: rawOpts.map((opt: any) => {
          const optContent = parseJsonField(opt.content, []);
          let textVal = opt.raw_text || '';
          if (!textVal && Array.isArray(optContent)) {
            textVal = optContent.map((c: any) => c.latex ? `\\(${c.latex}\\)` : (c.html || c.text || '')).join(' ');
          }
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
            key: opt.option_key ? opt.option_key.toUpperCase() : 'A',
            option_key: opt.option_key || 'a',
            rawText: textVal,
            content: optContent,
            imageUrl: optImageUrl,
            image_url: optImageUrl,
            isCorrect: (q.correct_option || '').toLowerCase() === (opt.option_key || '').toLowerCase()
          };
        }),
        createdAt: q.created_at,
        updatedAt: q.updated_at
      };
    });

    if (subject && subject !== 'all') {
      const subStr = String(subject).toLowerCase();
      formatted = formatted.filter((q: any) =>
        (q.subject || '').toLowerCase() === subStr ||
        (q.subject_name || '').toLowerCase() === subStr ||
        (q.subject || '').toLowerCase().includes(subStr) ||
        String(q.subject_id || '') === String(subject)
      );
    }

    if (chapter && chapter !== 'all') {
      const chStr = String(chapter).toLowerCase();
      formatted = formatted.filter((q: any) =>
        (q.chapter || '').toLowerCase() === chStr ||
        (q.chapter_name || '').toLowerCase() === chStr ||
        (q.chapter || '').toLowerCase().includes(chStr) ||
        String(q.chapter_id || '') === String(chapter)
      );
    }

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/question-bank/:id
questionBankRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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
      return res.status(404).json({
        success: false,
        error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found' }
      });
    }

    const q = rows[0];
    const [options]: any = await db.query(
      'SELECT * FROM `question_options` WHERE `question_id` = ? ORDER BY `sort_order` ASC',
      [q.id]
    );

    const content = parseJsonField(q.content, []);
    const explanation = parseJsonField(q.explanation, []);

    let diagramSvg: string | null = null;
    let diagramUrl: string | null = null;

    if (Array.isArray(content)) {
      for (const blk of content) {
        if (blk.diagramSvg || blk.svg) diagramSvg = blk.diagramSvg || blk.svg;
        if (blk.type === 'diagram' && (blk.diagramSvg || blk.svg)) diagramSvg = blk.diagramSvg || blk.svg;
        if (blk.type === 'image' && (blk.url || blk.src)) diagramUrl = blk.url || blk.src;
        if (blk.diagramUrl || blk.imageUrl || blk.url) diagramUrl = blk.diagramUrl || blk.imageUrl || blk.url;
      }
    }

    if (!diagramUrl && q.raw_text && /<img\s+/i.test(q.raw_text)) {
      const m = q.raw_text.match(/src=["']([^"']+)["']/i);
      if (m) diagramUrl = m[1];
    }

    const formatted = {
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
      correctAnswer: (q.correct_option || 'a').toUpperCase(),
      correctOption: (q.correct_option || 'a').toLowerCase(),
      correct_option: (q.correct_option || 'a').toLowerCase(),
      optionLayout: q.option_layout || 'grid_2x2',
      year: q.year,
      source: q.source,
      subject: q.subject_name || 'General',
      chapter: q.chapter_title || 'General',
      rawText: q.raw_text || '',
      diagramSvg: diagramSvg || undefined,
      diagramUrl: diagramUrl || undefined,
      imageUrl: diagramUrl || undefined,
      options: (options || []).map((opt: any) => {
        const optContent = parseJsonField(opt.content, []);
        let textVal = opt.raw_text || '';
        if (!textVal && Array.isArray(optContent)) {
          textVal = optContent.map((c: any) => c.latex ? `\\(${c.latex}\\)` : (c.html || c.text || '')).join(' ');
        }
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
          key: opt.option_key ? opt.option_key.toUpperCase() : 'A',
          option_key: opt.option_key || 'a',
          rawText: textVal,
          content: optContent,
          imageUrl: optImageUrl,
          image_url: optImageUrl,
          isCorrect: (q.correct_option || '').toLowerCase() === (opt.option_key || '').toLowerCase()
        };
      }),
      createdAt: q.created_at,
      updatedAt: q.updated_at
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});
