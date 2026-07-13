import os
import shutil
import re

BACKEND_DIR = os.path.abspath('c:/Users/murat/golabs-web/apps/backend')
APP_DIR = os.path.join(BACKEND_DIR, 'app')
CORE_DIR = os.path.join(APP_DIR, 'core')

def remove_if_exists(path):
    if os.path.isdir(path):
        shutil.rmtree(path)
        print(f"Removed directory: {path}")
    elif os.path.isfile(path):
        os.remove(path)
        print(f"Removed file: {path}")

# 1. Remove empty/duplicate folders and dummy files
remove_if_exists(os.path.join(CORE_DIR, 'config'))
remove_if_exists(os.path.join(CORE_DIR, 'exceptions'))
remove_if_exists(os.path.join(CORE_DIR, 'whatsapp_service.py'))

# 2. Re-create / move services
# First, remove the dummy app/services folder
remove_if_exists(os.path.join(APP_DIR, 'services'))

# Move app/core/services to app/services
core_services_dir = os.path.join(CORE_DIR, 'services')
app_services_dir = os.path.join(APP_DIR, 'services')
if os.path.exists(core_services_dir):
    shutil.move(core_services_dir, app_services_dir)
    print("Moved app/core/services to app/services")

# 3. Create app/services/email
email_dir = os.path.join(app_services_dir, 'email')
os.makedirs(email_dir, exist_ok=True)
with open(os.path.join(email_dir, '__init__.py'), 'w') as f:
    pass

# Move email files
for f in ['emailing.py', 'email_templates.py']:
    src = os.path.join(CORE_DIR, f)
    if os.path.exists(src):
        shutil.move(src, os.path.join(email_dir, f))
        print(f"Moved {f} to app/services/email/")

# Move other standalone services
for f in ['notification_service.py', 'storage.py', 'upload_validator.py']:
    src = os.path.join(CORE_DIR, f)
    if os.path.exists(src):
        shutil.move(src, os.path.join(app_services_dir, f))
        print(f"Moved {f} to app/services/")

# 4. Move app/core/workers to app/workers
core_workers_dir = os.path.join(CORE_DIR, 'workers')
app_workers_dir = os.path.join(APP_DIR, 'workers')
if os.path.exists(core_workers_dir):
    shutil.move(core_workers_dir, app_workers_dir)
    print("Moved app/core/workers to app/workers")

# 5. Update Imports
REPLACEMENTS = [
    (r'\bapp\.core\.services\b', 'app.services'),
    (r'\bapp\.core\.notification_service\b', 'app.services.notification_service'),
    (r'\bapp\.core\.storage\b', 'app.services.storage'),
    (r'\bapp\.core\.upload_validator\b', 'app.services.upload_validator'),
    (r'\bapp\.core\.emailing\b', 'app.services.email.emailing'),
    (r'\bapp\.core\.email_templates\b', 'app.services.email.email_templates'),
    (r'\bapp\.core\.workers\b', 'app.workers'),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for pattern, repl in REPLACEMENTS:
        content = re.sub(pattern, repl, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated imports in: {filepath}")

for root, _, files in os.walk(BACKEND_DIR):
    # skip venv, .pytest_cache, __pycache__, alembic
    if 'venv' in root or '.pytest_cache' in root or '__pycache__' in root or 'alembic' in root:
        continue
    for file in files:
        if file.endswith('.py'):
            process_file(os.path.join(root, file))

print("Backend refactoring complete.")
