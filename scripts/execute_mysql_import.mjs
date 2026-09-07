import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const WORKSPACE = '/Users/ashwintelangstark/Desktop/dot.files/PROJECTS.HAEGL.IN/EduForge/eduforge-main';
dotenv.config({ path: path.join(WORKSPACE, '.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eduforge',
  multipleStatements: true
};

const DATA_DIR = path.join(WORKSPACE, 'scratch', 'migration_data');

function nullIfEmpty(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function runMigration() {
  console.log('Connecting to MySQL database...', {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    database: DB_CONFIG.database
  });

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Connected successfully to MySQL!\n');

  try {
    // 0. Ensure default templates exist
    console.log('=== Step 0: Ensuring Default Template Exists ===');
    await conn.query(`
      INSERT INTO \`templates\` (\`id\`, \`name\`, \`description\`, \`settings\`, \`default_metadata\`, \`default_sections\`)
      VALUES (
        'a4-single-column',
        'A4 Standard Single-Column',
        'Standard single-column academic layout for competitive and school exams.',
        '{"defaultFont":"Inter","defaultFontSize":10.5,"lineSpacing":1.3,"columns":1,"columnGap":10,"questionSpacing":8,"optionSpacing":4,"margins":{"top":15,"bottom":15,"left":15,"right":15}}',
        '{"instituteName":"EduForge Academy","testTitle":"Practice Examination","headerTemplate":"boxed"}',
        '[]'
      )
      ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`)
    `);
    console.log('Ensured template "a4-single-column" exists.');

    // 1. App Settings
    console.log('\n=== Step 1: Migrating App Settings ===');
    const appSettings = readJson('app_settings.json');
    for (const item of appSettings) {
      await conn.query(
        `INSERT INTO \`app_settings\` (\`key_name\`, \`value\`)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        [item.key_name, item.value]
      );
    }
    console.log(`Migrated ${appSettings.length} app settings.`);

    // 2. User Profiles
    console.log('\n=== Step 2: Migrating User Profiles ===');
    const userProfiles = readJson('user_profiles.json');
    for (const u of userProfiles) {
      await conn.query(
        `INSERT INTO \`user_profiles\` (\`id\`, \`email\`, \`name\`, \`role\`, \`assigned_subject\`)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`name\` = VALUES(\`name\`),
           \`role\` = VALUES(\`role\`),
           \`assigned_subject\` = VALUES(\`assigned_subject\`)`,
        [u.id, u.email, u.name, u.role, u.assigned_subject]
      );
    }
    console.log(`Migrated ${userProfiles.length} user profiles.`);

    // 3. Subjects
    console.log('\n=== Step 3: Migrating Subjects ===');
    const subjects = readJson('subjects.json');
    for (const s of subjects) {
      await conn.query(
        `INSERT INTO \`subjects\` (\`id\`, \`name\`, \`code\`, \`color\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`name\` = VALUES(\`name\`),
           \`code\` = VALUES(\`code\`),
           \`color\` = VALUES(\`color\`)`,
        [s.id, s.name, s.code, s.color]
      );
    }
    console.log(`Migrated ${subjects.length} subjects.`);

    // 4. Chapters
    console.log('\n=== Step 4: Migrating Chapters ===');
    const chapters = readJson('chapters.json');
    for (const c of chapters) {
      await conn.query(
        `INSERT INTO \`chapters\` (\`id\`, \`subject_id\`, \`chapter_code\`, \`title\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`subject_id\` = VALUES(\`subject_id\`),
           \`chapter_code\` = VALUES(\`chapter_code\`),
           \`title\` = VALUES(\`title\`)`,
        [c.id, nullIfEmpty(c.subject_id), c.chapter_code, c.title]
      );
    }
    console.log(`Migrated ${chapters.length} chapters.`);

    // 5. Assets
    console.log('\n=== Step 5: Migrating Assets ===');
    const assets = readJson('assets.json');
    for (const a of assets) {
      await conn.query(
        `INSERT INTO \`assets\` (\`id\`, \`storage_path\`, \`public_url\`, \`filename\`, \`mime_type\`, \`size_bytes\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`storage_path\` = VALUES(\`storage_path\`),
           \`public_url\` = VALUES(\`public_url\`),
           \`filename\` = VALUES(\`filename\`),
           \`mime_type\` = VALUES(\`mime_type\`),
           \`size_bytes\` = VALUES(\`size_bytes\`)`,
        [a.id, a.storage_path, a.public_url, a.filename, a.mime_type, a.size_bytes]
      );
    }
    console.log(`Migrated ${assets.length} assets.`);

    // 6. Questions
    console.log('\n=== Step 6: Migrating Questions (450 rows) ===');
    const questions = readJson('questions.json');
    let qCount = 0;
    for (const q of questions) {
      await conn.query(
        `INSERT INTO \`questions\` (
           \`id\`, \`question_code\`, \`subject_id\`, \`chapter_id\`, \`question_type\`,
           \`content\`, \`explanation\`, \`difficulty\`, \`marks\`, \`negative_marks\`,
           \`correct_option\`, \`option_layout\`, \`year\`, \`source\`, \`raw_text\`
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`question_code\` = VALUES(\`question_code\`),
           \`subject_id\` = VALUES(\`subject_id\`),
           \`chapter_id\` = VALUES(\`chapter_id\`),
           \`question_type\` = VALUES(\`question_type\`),
           \`content\` = VALUES(\`content\`),
           \`explanation\` = VALUES(\`explanation\`),
           \`difficulty\` = VALUES(\`difficulty\`),
           \`marks\` = VALUES(\`marks\`),
           \`negative_marks\` = VALUES(\`negative_marks\`),
           \`correct_option\` = VALUES(\`correct_option\`),
           \`option_layout\` = VALUES(\`option_layout\`),
           \`year\` = VALUES(\`year\`),
           \`source\` = VALUES(\`source\`),
           \`raw_text\` = VALUES(\`raw_text\`)`,
        [
          q.id, q.question_code, nullIfEmpty(q.subject_id), nullIfEmpty(q.chapter_id), q.question_type,
          q.content, q.explanation, q.difficulty, q.marks, q.negative_marks,
          q.correct_option, q.option_layout, q.year, q.source, q.raw_text
        ]
      );
      qCount++;
      if (qCount % 50 === 0) {
        process.stdout.write(`  Inserted/Updated ${qCount}/${questions.length} questions...\r`);
      }
    }
    console.log(`\nSuccessfully migrated all ${qCount} questions.`);

    // 7. Question Options
    console.log('\n=== Step 7: Migrating Question Options (1,800 rows) ===');
    const options = readJson('options.json');
    let optCount = 0;
    for (const opt of options) {
      await conn.query(
        `INSERT INTO \`question_options\` (
           \`id\`, \`question_id\`, \`option_key\`, \`content\`, \`raw_text\`, \`sort_order\`
         )
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`question_id\` = VALUES(\`question_id\`),
           \`option_key\` = VALUES(\`option_key\`),
           \`content\` = VALUES(\`content\`),
           \`raw_text\` = VALUES(\`raw_text\`),
           \`sort_order\` = VALUES(\`sort_order\`)`,
        [opt.id, opt.question_id, opt.option_key, opt.content, opt.raw_text, opt.sort_order]
      );
      optCount++;
      if (optCount % 200 === 0) {
        process.stdout.write(`  Inserted/Updated ${optCount}/${options.length} options...\r`);
      }
    }
    console.log(`\nSuccessfully migrated all ${optCount} question options.`);

    // 8. Papers
    console.log('\n=== Step 8: Migrating Papers ===');
    const papers = readJson('papers.json');
    for (const p of papers) {
      await conn.query(
        `INSERT INTO \`papers\` (\`id\`, \`title\`, \`template_id\`, \`settings\`, \`metadata\`, \`sections\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`title\` = VALUES(\`title\`),
           \`template_id\` = VALUES(\`template_id\`),
           \`settings\` = VALUES(\`settings\`),
           \`metadata\` = VALUES(\`metadata\`),
           \`sections\` = VALUES(\`sections\`)`,
        [p.id, p.title, nullIfEmpty(p.template_id), p.settings, p.metadata, p.sections]
      );
    }
    console.log(`Migrated ${papers.length} papers.`);

    // 9. Paper Questions
    console.log('\n=== Step 9: Migrating Paper Questions ===');
    const paperQuestions = readJson('paper_questions.json');
    const qIdsSet = new Set(questions.map(q => q.id));
    const paperIdsSet = new Set(papers.map(p => p.id));
    let pqCount = 0;
    let pqSkipped = 0;

    for (const pq of paperQuestions) {
      if (!qIdsSet.has(pq.question_id) || !paperIdsSet.has(pq.paper_id)) {
        pqSkipped++;
        continue;
      }
      await conn.query(
        `INSERT INTO \`paper_questions\` (\`id\`, \`paper_id\`, \`question_id\`, \`section_id\`, \`sort_order\`, \`custom_marks\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`paper_id\` = VALUES(\`paper_id\`),
           \`question_id\` = VALUES(\`question_id\`),
           \`section_id\` = VALUES(\`section_id\`),
           \`sort_order\` = VALUES(\`sort_order\`),
           \`custom_marks\` = VALUES(\`custom_marks\`)`,
        [pq.id, pq.paper_id, pq.question_id, pq.section_id, pq.sort_order, pq.custom_marks]
      );
      pqCount++;
    }
    console.log(`Migrated ${pqCount} paper question links (skipped ${pqSkipped} orphan links).`);

    // Verification queries
    console.log('\n=== Final Database Record Verification ===');
    const tables = ['subjects', 'chapters', 'assets', 'questions', 'question_options', 'papers', 'paper_questions', 'user_profiles'];
    for (const t of tables) {
      const [rows] = await conn.query(`SELECT COUNT(*) as count FROM \`${t}\``);
      console.log(`  Table [${t}]: ${rows[0].count} records`);
    }

    console.log('\n=== Migration Completed Successfully! ===');
  } catch (err) {
    console.error('Migration failed with error:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
