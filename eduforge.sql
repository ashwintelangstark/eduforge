-- phpMyAdmin SQL Dump
-- version 4.6.5.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 04, 2026 at 06:40 AM
-- Server version: 10.1.21-MariaDB
-- PHP Version: 7.1.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `eduforge`
--

-- --------------------------------------------------------

--
-- Table structure for table `app_settings`
--

CREATE TABLE `app_settings` (
  `key_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chapters`
--

CREATE TABLE `chapters` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chapter_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chapters`
--

INSERT INTO `chapters` (`id`, `subject_id`, `chapter_code`, `title`, `created_at`, `updated_at`) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PHY-01', 'Units and Measurements', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PHY-02', 'Kinematics & Motion in a Straight Line', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'CHE-01', 'Some Basic Concepts of Chemistry', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'CHE-02', 'Structure of Atom', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'BIO-01', 'The Living World', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'BIO-02', 'Biological Classification', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'MAT-01', 'Sets, Relations and Functions', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'MAT-02', 'Complex Numbers and Quadratic Equations', '2026-09-03 12:05:40', '2026-09-03 12:05:40');

-- --------------------------------------------------------

--
-- Table structure for table `papers`
--

CREATE TABLE `papers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settings` longtext COLLATE utf8mb4_unicode_ci,
  `metadata` longtext COLLATE utf8mb4_unicode_ci,
  `sections` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paper_questions`
--

CREATE TABLE `paper_questions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paper_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int(11) DEFAULT '1',
  `custom_marks` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chapter_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'MCQ',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `explanation` longtext COLLATE utf8mb4_unicode_ci,
  `difficulty` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Medium',
  `marks` decimal(5,2) DEFAULT '4.00',
  `negative_marks` decimal(5,2) DEFAULT '1.00',
  `correct_option` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'a',
  `option_layout` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'grid_2x2',
  `year` int(11) DEFAULT '2024',
  `source` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'NEET / JEE Bank',
  `raw_text` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question_banks`
--

CREATE TABLE `question_banks` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `subject_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question_options`
--

CREATE TABLE `question_options` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_key` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `raw_text` longtext COLLATE utf8mb4_unicode_ci,
  `sort_order` int(11) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question_tags`
--

CREATE TABLE `question_tags` (
  `question_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `science_libraries`
--

CREATE TABLE `science_libraries` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `symbol` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'bg-sky-50 text-sky-700 border-sky-200',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `code`, `color`, `created_at`, `updated_at`) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Physics', 'PHY', 'bg-sky-50 text-sky-700 border-sky-200', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Chemistry', 'CHE', 'bg-indigo-50 text-indigo-700 border-indigo-200', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Biology', 'BIO', 'bg-emerald-50 text-emerald-700 border-emerald-200', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Mathematics', 'MAT', 'bg-amber-50 text-amber-700 border-amber-200', '2026-09-03 12:05:40', '2026-09-03 12:05:40');

-- --------------------------------------------------------

--
-- Table structure for table `symbols`
--

CREATE TABLE `symbols` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `symbol_character` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latex_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unicode_hex` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `settings` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_metadata` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_sections` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `test_attempts`
--

CREATE TABLE `test_attempts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paper_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answers` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(7,2) DEFAULT '0.00',
  `total_marks` decimal(7,2) DEFAULT '0.00',
  `time_spent_seconds` int(11) DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_profiles`
--

CREATE TABLE `user_profiles` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'faculty',
  `assigned_subject` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'All',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_profiles`
--

INSERT INTO `user_profiles` (`id`, `user_id`, `email`, `password_hash`, `name`, `role`, `assigned_subject`, `created_at`, `updated_at`) VALUES
('d2902ae5-88d8-4086-8fec-4854af7dd335', NULL, 'teacher@eduforge.com', '$2b$10$DiV7XRXUTwCML5.BwhDT6OfTE85lPAz2mOdKj/lJf2fUg6r117Pv2', 'Teacher One', 'faculty', 'Physics', '2026-09-03 12:10:34', '2026-09-03 12:10:34'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', NULL, 'admin@eduforge.com', NULL, 'System Admin', 'admin', 'All', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e12', NULL, 'physics@eduforge.com', NULL, 'Physics Faculty', 'faculty', 'Physics', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e13', NULL, 'chemistry@eduforge.com', NULL, 'Chemistry Faculty', 'faculty', 'Chemistry', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e14', NULL, 'biology@eduforge.com', NULL, 'Biology Faculty', 'faculty', 'Biology', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e15', NULL, 'maths@eduforge.com', NULL, 'Mathematics Faculty', 'faculty', 'Mathematics', '2026-09-03 12:05:40', '2026-09-03 12:05:40'),
('ff8ac89d-a78f-11f1-abcc-08bfb8d01f73', NULL, 'admin@gmail.com', '$2b$10$T3Ty9O6jVHDPz/GRFoD21uIP7nYEe4WUXzMa900x/2oeia1l2DLru', 'Administrator', 'admin', 'All', '2026-09-03 12:07:13', '2026-09-03 12:16:36');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `app_settings`
--
ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`key_name`);

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chapters`
--
ALTER TABLE `chapters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chapters_subject_id` (`subject_id`);

--
-- Indexes for table `papers`
--
ALTER TABLE `papers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_papers_template` (`template_id`);

--
-- Indexes for table `paper_questions`
--
ALTER TABLE `paper_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pquestions_paper` (`paper_id`),
  ADD KEY `fk_pquestions_question` (`question_id`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `question_code` (`question_code`),
  ADD KEY `idx_questions_subject_id` (`subject_id`),
  ADD KEY `idx_questions_chapter_id` (`chapter_id`),
  ADD KEY `idx_questions_difficulty` (`difficulty`);

--
-- Indexes for table `question_banks`
--
ALTER TABLE `question_banks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_qbanks_subject` (`subject_id`);

--
-- Indexes for table `question_options`
--
ALTER TABLE `question_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_question_options_qid` (`question_id`);

--
-- Indexes for table `question_tags`
--
ALTER TABLE `question_tags`
  ADD PRIMARY KEY (`question_id`,`tag_id`),
  ADD KEY `fk_qtags_tag` (`tag_id`);

--
-- Indexes for table `science_libraries`
--
ALTER TABLE `science_libraries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `symbols`
--
ALTER TABLE `symbols`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `test_attempts`
--
ALTER TABLE `test_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_attempts_paper` (`paper_id`);

--
-- Indexes for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chapters`
--
ALTER TABLE `chapters`
  ADD CONSTRAINT `fk_chapters_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `papers`
--
ALTER TABLE `papers`
  ADD CONSTRAINT `fk_papers_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `paper_questions`
--
ALTER TABLE `paper_questions`
  ADD CONSTRAINT `fk_pquestions_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pquestions_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `fk_questions_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_questions_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `question_banks`
--
ALTER TABLE `question_banks`
  ADD CONSTRAINT `fk_qbanks_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `question_options`
--
ALTER TABLE `question_options`
  ADD CONSTRAINT `fk_options_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `question_tags`
--
ALTER TABLE `question_tags`
  ADD CONSTRAINT `fk_qtags_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_qtags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `test_attempts`
--
ALTER TABLE `test_attempts`
  ADD CONSTRAINT `fk_attempts_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`) ON DELETE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
