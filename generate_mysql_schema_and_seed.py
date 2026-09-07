import os
import csv
import json
import re

def escape_mysql_string(val):
    if val is None:
        return 'NULL'
    val_str = str(val)
    # Escape backslashes first, then single quotes
    val_str = val_str.replace('\\', '\\\\').replace("'", "\\'")
    return f"'{val_str}'"

SCHEMA_HEADER = """-- =============================================================================
-- EduForge Complete MySQL Database Schema & Seed Script (XAMPP / MariaDB / MySQL)
-- =============================================================================
-- Instructions for XAMPP:
-- 1. Open XAMPP Control Panel and Start 'Apache' and 'MySQL'.
-- 2. Open your browser to http://localhost/phpmyadmin
-- 3. Select database 'eduforge' -> Click 'Import' tab -> Choose this file -> Go.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `eduforge` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `eduforge`;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables in reverse dependency order (child tables first)
DROP TABLE IF EXISTS `paper_questions`;
DROP TABLE IF EXISTS `test_attempts`;
DROP TABLE IF EXISTS `papers`;
DROP TABLE IF EXISTS `question_tags`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `question_options`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `question_banks`;
DROP TABLE IF EXISTS `chapters`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `assets`;
DROP TABLE IF EXISTS `templates`;
DROP TABLE IF EXISTS `symbols`;
DROP TABLE IF EXISTS `science_libraries`;
DROP TABLE IF EXISTS `app_settings`;
DROP TABLE IF EXISTS `user_profiles`;

-- 1. Subjects Table
CREATE TABLE `subjects` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `color` VARCHAR(255) DEFAULT 'bg-sky-50 text-sky-700 border-sky-200',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Chapters Table
CREATE TABLE `chapters` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `subject_id` VARCHAR(36) NULL,
    `chapter_code` VARCHAR(100) NULL,
    `title` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_chapters_subject_id` (`subject_id`),
    CONSTRAINT `fk_chapters_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Questions Table
CREATE TABLE `questions` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `question_code` VARCHAR(100) UNIQUE NULL,
    `subject_id` VARCHAR(36) NULL,
    `chapter_id` VARCHAR(36) NULL,
    `question_type` VARCHAR(50) DEFAULT 'MCQ',
    `content` LONGTEXT NOT NULL,
    `explanation` LONGTEXT NULL,
    `difficulty` VARCHAR(50) DEFAULT 'Medium',
    `marks` DECIMAL(5,2) DEFAULT 4.00,
    `negative_marks` DECIMAL(5,2) DEFAULT 1.00,
    `correct_option` VARCHAR(10) DEFAULT 'a',
    `option_layout` VARCHAR(50) DEFAULT 'grid_2x2',
    `year` INT DEFAULT 2024,
    `source` VARCHAR(255) DEFAULT 'NEET / JEE Bank',
    `raw_text` LONGTEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_questions_subject_id` (`subject_id`),
    INDEX `idx_questions_chapter_id` (`chapter_id`),
    INDEX `idx_questions_difficulty` (`difficulty`),
    CONSTRAINT `fk_questions_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_questions_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Question Options Table
CREATE TABLE `question_options` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `question_id` VARCHAR(36) NOT NULL,
    `option_key` VARCHAR(10) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `raw_text` LONGTEXT NULL,
    `sort_order` INT DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_question_options_qid` (`question_id`),
    CONSTRAINT `fk_options_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tags and Question Tags
CREATE TABLE `tags` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `question_tags` (
    `question_id` VARCHAR(36) NOT NULL,
    `tag_id` VARCHAR(36) NOT NULL,
    PRIMARY KEY (`question_id`, `tag_id`),
    CONSTRAINT `fk_qtags_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_qtags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Question Banks Table
CREATE TABLE `question_banks` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `subject_id` VARCHAR(36) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_qbanks_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Assets Table
CREATE TABLE `assets` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `storage_path` VARCHAR(500) NOT NULL,
    `public_url` TEXT NOT NULL,
    `filename` VARCHAR(255) NULL,
    `mime_type` VARCHAR(100) NULL,
    `size_bytes` BIGINT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Templates Table
CREATE TABLE `templates` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `settings` LONGTEXT NOT NULL,
    `default_metadata` LONGTEXT NOT NULL,
    `default_sections` LONGTEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Symbols Table
CREATE TABLE `symbols` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `category` VARCHAR(100) NOT NULL,
    `symbol_character` VARCHAR(50) NOT NULL,
    `latex_code` VARCHAR(255) NOT NULL,
    `unicode_hex` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Science Libraries Table
CREATE TABLE `science_libraries` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `category` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `symbol` VARCHAR(100) NULL,
    `value` VARCHAR(255) NULL,
    `metadata` LONGTEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Papers Table
CREATE TABLE `papers` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `template_id` VARCHAR(36) NULL,
    `settings` LONGTEXT NULL,
    `metadata` LONGTEXT NULL,
    `sections` LONGTEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_papers_template` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Paper Questions Table
CREATE TABLE `paper_questions` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `paper_id` VARCHAR(36) NOT NULL,
    `question_id` VARCHAR(36) NOT NULL,
    `section_id` VARCHAR(100) NULL,
    `sort_order` INT DEFAULT 1,
    `custom_marks` DECIMAL(5,2) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pquestions_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pquestions_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Test Attempts Table
CREATE TABLE `test_attempts` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `paper_id` VARCHAR(36) NOT NULL,
    `student_name` VARCHAR(255) NOT NULL,
    `student_id` VARCHAR(100) NULL,
    `answers` LONGTEXT NOT NULL,
    `score` DECIMAL(7,2) DEFAULT 0.00,
    `total_marks` DECIMAL(7,2) DEFAULT 0.00,
    `time_spent_seconds` INT DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'completed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attempts_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. App Settings Table
CREATE TABLE `app_settings` (
    `key_name` VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. User Profiles Table
CREATE TABLE `user_profiles` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `user_id` VARCHAR(36) NULL,
    `email` VARCHAR(190) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'faculty',
    `assigned_subject` VARCHAR(100) NOT NULL DEFAULT 'All',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Master Seed Data (Subjects, Chapters, Templates, Science, User Profiles)
-- =============================================================================

INSERT INTO `subjects` (`id`, `name`, `code`, `color`) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Physics', 'PHY', 'bg-sky-50 text-sky-700 border-sky-200'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Chemistry', 'CHE', 'bg-indigo-50 text-indigo-700 border-indigo-200'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Biology', 'BIO', 'bg-emerald-50 text-emerald-700 border-emerald-200'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Mathematics', 'MAT', 'bg-amber-50 text-amber-700 border-amber-200')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `color` = VALUES(`color`);

INSERT INTO `chapters` (`id`, `subject_id`, `chapter_code`, `title`) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PHY-01', 'Units and Measurements'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PHY-02', 'Kinematics & Motion in a Straight Line'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'CHE-01', 'Some Basic Concepts of Chemistry'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'CHE-02', 'Structure of Atom'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'BIO-01', 'The Living World'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'BIO-02', 'Biological Classification'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'MAT-01', 'Sets, Relations and Functions'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'MAT-02', 'Complex Numbers and Quadratic Equations')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `chapter_code` = VALUES(`chapter_code`), `subject_id` = VALUES(`subject_id`);

INSERT INTO `user_profiles` (`id`, `email`, `name`, `role`, `assigned_subject`) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 'admin@eduforge.com', 'System Admin', 'admin', 'All'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e12', 'physics@eduforge.com', 'Physics Faculty', 'faculty', 'Physics'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e13', 'chemistry@eduforge.com', 'Chemistry Faculty', 'faculty', 'Chemistry'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e14', 'biology@eduforge.com', 'Biology Faculty', 'faculty', 'Biology'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e15', 'maths@eduforge.com', 'Mathematics Faculty', 'faculty', 'Mathematics')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `assigned_subject` = VALUES(`assigned_subject`);
"""

def generate_full_mysql_file():
    print("Generating full MySQL import script with safe reverse drop order...")
    
    # Collect all questions and options from CSV pairs
    csv_pairs = [
        ('physics_questions.csv', 'physics_question_options.csv', 'Physics - Units & Measurements'),
        ('physics_motion_in_a_plane_questions.csv', 'physics_motion_in_a_plane_question_options.csv', 'Physics - Motion in a Plane'),
        ('chemistry_questions.csv', 'chemistry_question_options.csv', 'Chemistry - Basic Concepts'),
        ('chemistry_thermodynamics_questions.csv', 'chemistry_thermodynamics_question_options.csv', 'Chemistry - Thermodynamics'),
        ('bio_questions.csv', 'bio_question_options.csv', 'Biology - The Living World'),
        ('bio_animal_kingdom_questions.csv', 'bio_animal_kingdom_question_options.csv', 'Biology - Animal Kingdom')
    ]
    
    all_questions = []
    all_options = []
    seen_q_codes = set()
    seen_opt_ids = set()

    for q_file, opt_file, label in csv_pairs:
        if not os.path.exists(q_file) or not os.path.exists(opt_file):
            print(f"Skipping {label} (file not found)")
            continue
        with open(q_file, 'r', encoding='utf-8') as f:
            qs = list(csv.DictReader(f))
            for q in qs:
                if q['question_code'] not in seen_q_codes:
                    seen_q_codes.add(q['question_code'])
                    all_questions.append(q)
        with open(opt_file, 'r', encoding='utf-8') as f:
            opts = list(csv.DictReader(f))
            for opt in opts:
                if opt['id'] not in seen_opt_ids:
                    seen_opt_ids.add(opt['id'])
                    all_options.append(opt)

    # 1. Write the base schema and seed
    with open('mysql_schema_and_seed.sql', 'w', encoding='utf-8') as f:
        f.write(SCHEMA_HEADER)
        f.write("\nSET FOREIGN_KEY_CHECKS = 1;\n")
    print(f"  [OK] Saved base schema: mysql_schema_and_seed.sql")

    # 2. Write full import with all questions and options
    with open('mysql_full_data_import.sql', 'w', encoding='utf-8') as f:
        f.write(SCHEMA_HEADER)
        f.write("\n-- =============================================================================\n")
        f.write(f"-- Complete Questions Data Ingestion ({len(all_questions)} Questions, {len(all_options)} Options)\n")
        f.write("-- =============================================================================\n\n")

        # Questions in batches of 50
        f.write("-- Inserting Questions...\n")
        batch_size = 50
        for i in range(0, len(all_questions), batch_size):
            chunk = all_questions[i:i+batch_size]
            val_rows = []
            for q in chunk:
                q_id = escape_mysql_string(q['id'])
                q_code = escape_mysql_string(q['question_code'])
                s_id = escape_mysql_string(q['subject_id'])
                c_id = escape_mysql_string(q['chapter_id'])
                q_type = escape_mysql_string(q.get('question_type', 'MCQ'))
                content = escape_mysql_string(q['content'])
                explanation = escape_mysql_string(q['explanation'])
                diff = escape_mysql_string(q.get('difficulty', 'Medium'))
                marks = q.get('marks', 4) or 4
                neg_marks = q.get('negative_marks', 1) or 1
                c_opt = escape_mysql_string(q.get('correct_option', 'a'))
                layout = escape_mysql_string(q.get('option_layout', 'grid_2x2'))
                year = q.get('year', 2024) or 2024
                src = escape_mysql_string(q.get('source', 'NEET / JEE Bank'))
                raw = escape_mysql_string(q.get('raw_text', ''))
                
                val_rows.append(f"({q_id}, {q_code}, {s_id}, {c_id}, {q_type}, {content}, {explanation}, {diff}, {marks}, {neg_marks}, {c_opt}, {layout}, {year}, {src}, {raw})")
            
            f.write(f"INSERT INTO `questions` (`id`, `question_code`, `subject_id`, `chapter_id`, `question_type`, `content`, `explanation`, `difficulty`, `marks`, `negative_marks`, `correct_option`, `option_layout`, `year`, `source`, `raw_text`) VALUES \n" + ",\n".join(val_rows) + "\nON DUPLICATE KEY UPDATE `raw_text`=VALUES(`raw_text`), `content`=VALUES(`content`), `explanation`=VALUES(`explanation`);\n\n")

        # Options in batches of 100
        f.write("-- Inserting Options...\n")
        opt_batch_size = 100
        for i in range(0, len(all_options), opt_batch_size):
            chunk = all_options[i:i+opt_batch_size]
            val_rows = []
            for o in chunk:
                o_id = escape_mysql_string(o['id'])
                q_id = escape_mysql_string(o['question_id'])
                k = escape_mysql_string(o['option_key'])
                c = escape_mysql_string(o['content'])
                r = escape_mysql_string(o.get('raw_text', ''))
                so = o.get('sort_order', 1) or 1
                val_rows.append(f"({o_id}, {q_id}, {k}, {c}, {r}, {so})")

            f.write(f"INSERT INTO `question_options` (`id`, `question_id`, `option_key`, `content`, `raw_text`, `sort_order`) VALUES \n" + ",\n".join(val_rows) + "\nON DUPLICATE KEY UPDATE `content`=VALUES(`content`), `raw_text`=VALUES(`raw_text`);\n\n")

        f.write("\nSET FOREIGN_KEY_CHECKS = 1;\n")
        f.write("\n-- Import Complete!\n")

    print(f"  [OK] Saved full database import with all {len(all_questions)} questions: mysql_full_data_import.sql")

if __name__ == '__main__':
    generate_full_mysql_file()
