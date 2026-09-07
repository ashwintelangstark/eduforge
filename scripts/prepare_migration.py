import os
import csv
import json
import re
import sys
import shutil
import base64
import uuid

csv.field_size_limit(sys.maxsize)

WORKSPACE = '/Users/ashwintelangstark/Desktop/dot.files/PROJECTS.HAEGL.IN/EduForge/eduforge-main'
DATACSV = os.path.join(WORKSPACE, 'datacsv')
OUTPUT_DIR = os.path.join(WORKSPACE, 'scratch', 'migration_data')

UPLOAD_DIRS = [
    os.path.join(WORKSPACE, 'public', 'uploads'),
    os.path.join(WORKSPACE, 'apps', 'server', 'public', 'uploads')
]

for d in UPLOAD_DIRS:
    os.makedirs(d, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=== Step 1: Copying Physical Image Files to /public/uploads ===")
physical_files_copied = 0
for folder in ['biology', 'general', 'physics']:
    folder_path = os.path.join(DATACSV, folder)
    if not os.path.exists(folder_path):
        continue
    for fname in os.listdir(folder_path):
        if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg')):
            src = os.path.join(folder_path, fname)
            for target_dir in UPLOAD_DIRS:
                dst = os.path.join(target_dir, fname)
                shutil.copy2(src, dst)
            physical_files_copied += 1

print(f"Copied {physical_files_copied} physical image files to uploads directories.")

import hashlib

def rewrite_image_urls(text, prefix="img"):
    if not text:
        return text

    # 1. Decode embedded Base64 image URIs to physical files
    if 'data:image/' in text:
        def b64_replacer(match):
            mime = match.group(1)
            raw_b64 = match.group(2).strip()
            clean_b64 = re.sub(r'\s+', '', raw_b64)
            ext = '.jpg' if 'jpeg' in mime or 'jpg' in mime else ('.webp' if 'webp' in mime else '.png')
            h = hashlib.md5(clean_b64.encode('utf-8')[:500]).hexdigest()[:12]
            fname = f"embedded_{h}{ext}"
            try:
                bdata = base64.b64decode(clean_b64)
                for d in UPLOAD_DIRS:
                    fpath = os.path.join(d, fname)
                    if not os.path.exists(fpath):
                        with open(fpath, 'wb') as out_f:
                            out_f.write(bdata)
                return f"/uploads/{fname}"
            except Exception as e:
                print(f"Error decoding base64: {e}")
                return match.group(0)

        text = re.sub(r'data:image/([a-zA-Z0-9+\-]+);base64,([A-Za-z0-9+/=\r\n]+)', b64_replacer, text)

    # 2. Supabase CDN URLs
    text = re.sub(
        r'https?://[a-zA-Z0-9.\-_]+/storage/v1/object/public/question-assets/(?:general/|biology/|physics/|uploads/)?([a-zA-Z0-9_.\-]+)',
        r'/uploads/\1',
        text
    )
    # 3. Relative folder URLs inside quotes or JSON
    text = re.sub(
        r'(["\'])(?:general|biology|physics|uploads)/([a-zA-Z0-9_.\-]+\.(?:png|jpg|jpeg|webp|svg))\1',
        r'\1/uploads/\2\1',
        text
    )
    # 4. Plain relative URLs in src=
    text = re.sub(
        r'(src=["\'])(?:general|biology|physics|uploads)/([a-zA-Z0-9_.\-]+\.(?:png|jpg|jpeg|webp|svg))(["\'])',
        r'\1/uploads/\2\3',
        text
    )
    return text

print("\n=== Step 2: Processing assets_rows.csv & Decoding Base64 Images ===")
assets_list = []
with open(os.path.join(DATACSV, 'assets_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        aid = row.get('id') or str(uuid.uuid4())
        sp = row.get('storage_path') or ''
        url = row.get('public_url') or ''
        fn = row.get('filename') or os.path.basename(sp) or f'{aid}.png'
        mime = row.get('mime_type') or 'image/png'
        sz = row.get('size_bytes')
        created_at = row.get('created_at')

        # If base64, extract to file
        if url.startswith('data:image/'):
            matches = re.match(r'^data:([A-Za-z-+\/]+);base64,(.+)$', url)
            if matches:
                mime = matches.group(1)
                ext = '.jpg' if 'jpeg' in mime or 'jpg' in mime else ('.webp' if 'webp' in mime else '.png')
                bdata = base64.b64decode(matches.group(2))
                base_name = os.path.basename(sp) if sp else f'asset_{aid}{ext}'
                if not any(base_name.lower().endswith(e) for e in ['.png', '.jpg', '.jpeg', '.webp']):
                    base_name += ext
                for d in UPLOAD_DIRS:
                    with open(os.path.join(d, base_name), 'wb') as out_f:
                        out_f.write(bdata)
                url = f'/uploads/{base_name}'
                sp = f'uploads/{base_name}'
                fn = base_name
                sz = len(bdata)
        elif url.startswith('http'):
            # Convert Supabase URL to local /uploads/
            url_fn = os.path.basename(sp) if sp else os.path.basename(url)
            url = f'/uploads/{url_fn}'
            sp = f'uploads/{url_fn}'

        assets_list.append({
            'id': aid,
            'storage_path': sp,
            'public_url': url,
            'filename': fn,
            'mime_type': mime,
            'size_bytes': int(sz) if sz and str(sz).isdigit() else 0,
            'created_at': created_at
        })

with open(os.path.join(OUTPUT_DIR, 'assets.json'), 'w', encoding='utf-8') as f:
    json.dump(assets_list, f, ensure_ascii=False)
print(f"Processed {len(assets_list)} assets.")

print("\n=== Step 3: Processing subjects_rows.csv ===")
subjects_list = []
with open(os.path.join(DATACSV, 'subjects_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        subjects_list.append({
            'id': row['id'],
            'name': row['name'],
            'code': row['code'],
            'color': row['color'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
with open(os.path.join(OUTPUT_DIR, 'subjects.json'), 'w', encoding='utf-8') as f:
    json.dump(subjects_list, f, ensure_ascii=False)
print(f"Processed {len(subjects_list)} subjects.")

print("\n=== Step 4: Processing chapters_rows.csv ===")
chapters_list = []
with open(os.path.join(DATACSV, 'chapters_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        chapters_list.append({
            'id': row['id'],
            'subject_id': row['subject_id'],
            'chapter_code': row['chapter_code'],
            'title': row['title'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
with open(os.path.join(OUTPUT_DIR, 'chapters.json'), 'w', encoding='utf-8') as f:
    json.dump(chapters_list, f, ensure_ascii=False)
print(f"Processed {len(chapters_list)} chapters.")

print("\n=== Step 5: Processing questions_rows.csv ===")
questions_list = []
with open(os.path.join(DATACSV, 'questions_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        content = rewrite_image_urls(row.get('content') or '')
        explanation = rewrite_image_urls(row.get('explanation') or '')
        raw_text = rewrite_image_urls(row.get('raw_text') or '')
        
        marks = float(row.get('marks') or 4.0)
        negative_marks = float(row.get('negative_marks') or 1.0)
        year = int(row.get('year')) if row.get('year') and str(row.get('year')).isdigit() else 2024

        questions_list.append({
            'id': row['id'],
            'question_code': row.get('question_code'),
            'subject_id': row.get('subject_id'),
            'chapter_id': row.get('chapter_id'),
            'question_type': row.get('question_type') or 'MCQ_SINGLE',
            'content': content,
            'explanation': explanation,
            'difficulty': row.get('difficulty') or 'Medium',
            'marks': marks,
            'negative_marks': negative_marks,
            'correct_option': row.get('correct_option') or 'a',
            'option_layout': row.get('option_layout') or 'grid_2x2',
            'year': year,
            'source': row.get('source') or 'NEET / JEE Bank',
            'raw_text': raw_text,
            'created_at': row.get('created_at'),
            'updated_at': row.get('updated_at')
        })
with open(os.path.join(OUTPUT_DIR, 'questions.json'), 'w', encoding='utf-8') as f:
    json.dump(questions_list, f, ensure_ascii=False)
print(f"Processed {len(questions_list)} questions.")

print("\n=== Step 6: Processing question_options_rows.csv ===")
options_list = []
with open(os.path.join(DATACSV, 'question_options_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        content = rewrite_image_urls(row.get('content') or '')
        raw_text = rewrite_image_urls(row.get('raw_text') or '')
        sort_order = int(row.get('sort_order') or 1)

        options_list.append({
            'id': row['id'],
            'question_id': row['question_id'],
            'option_key': row['option_key'],
            'content': content,
            'raw_text': raw_text,
            'sort_order': sort_order,
            'created_at': row.get('created_at'),
            'updated_at': row.get('updated_at')
        })
with open(os.path.join(OUTPUT_DIR, 'options.json'), 'w', encoding='utf-8') as f:
    json.dump(options_list, f, ensure_ascii=False)
print(f"Processed {len(options_list)} options.")

print("\n=== Step 7: Processing papers_rows.csv ===")
papers_list = []
paper_questions_list = []
with open(os.path.join(DATACSV, 'papers_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        metadata = rewrite_image_urls(row.get('metadata') or '')
        settings = row.get('settings') or ''
        sections = rewrite_image_urls(row.get('sections') or '')
        pid = row['id']

        papers_list.append({
            'id': pid,
            'title': row.get('title') or 'Untitled Paper',
            'template_id': row.get('template_id') or None,
            'metadata': metadata,
            'settings': settings,
            'sections': sections,
            'created_at': row.get('created_at'),
            'updated_at': row.get('updated_at')
        })

        # Extract paper questions from sections JSON if available
        try:
            sec_data = json.loads(sections)
            if isinstance(sec_data, list):
                order = 1
                for sec in sec_data:
                    sec_id = sec.get('id')
                    for blk in sec.get('blocks', []):
                        if blk.get('type') == 'question':
                            qid = blk.get('questionId') or (blk.get('question', {}).get('id'))
                            if qid:
                                pq_id = str(uuid.uuid4())
                                paper_questions_list.append({
                                    'id': pq_id,
                                    'paper_id': pid,
                                    'question_id': qid,
                                    'section_id': sec_id,
                                    'sort_order': order,
                                    'custom_marks': blk.get('question', {}).get('marks') or 4.0
                                })
                                order += 1
        except Exception as e:
            pass

with open(os.path.join(OUTPUT_DIR, 'papers.json'), 'w', encoding='utf-8') as f:
    json.dump(papers_list, f, ensure_ascii=False)
with open(os.path.join(OUTPUT_DIR, 'paper_questions.json'), 'w', encoding='utf-8') as f:
    json.dump(paper_questions_list, f, ensure_ascii=False)
print(f"Processed {len(papers_list)} papers and extracted {len(paper_questions_list)} paper question links.")

print("\n=== Step 8: Processing app_settings and user_profiles ===")
settings_list = []
with open(os.path.join(DATACSV, 'app_settings_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        settings_list.append({
            'key_name': 'app_general_settings',
            'value': row.get('settings') or '{}',
            'updated_at': row.get('updated_at')
        })
with open(os.path.join(OUTPUT_DIR, 'app_settings.json'), 'w', encoding='utf-8') as f:
    json.dump(settings_list, f, ensure_ascii=False)

user_profiles_list = []
with open(os.path.join(DATACSV, 'user_profiles_rows.csv'), encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        user_profiles_list.append({
            'id': row['id'],
            'email': row['email'],
            'name': row.get('name') or 'User',
            'role': row.get('role') or 'faculty',
            'assigned_subject': row.get('assigned_subject') or 'All',
            'created_at': row.get('created_at'),
            'updated_at': row.get('updated_at')
        })
with open(os.path.join(OUTPUT_DIR, 'user_profiles.json'), 'w', encoding='utf-8') as f:
    json.dump(user_profiles_list, f, ensure_ascii=False)

print("\nAll data parsed, transformed, and ready for database execution.")
