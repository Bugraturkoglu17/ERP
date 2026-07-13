import fs from 'fs';
import path from 'path';

const BACKEND_DIR = path.resolve('c:/Users/murat/golabs-web/apps/backend');
const APP_DIR = path.join(BACKEND_DIR, 'app');
const CORE_DIR = path.join(APP_DIR, 'core');

function removeIfExists(p) {
    if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
            fs.rmSync(p, { recursive: true, force: true });
            console.log(`Removed directory: ${p}`);
        } else {
            fs.rmSync(p, { force: true });
            console.log(`Removed file: ${p}`);
        }
    }
}

// 1. Remove empty/duplicate folders and dummy files
removeIfExists(path.join(CORE_DIR, 'config'));
removeIfExists(path.join(CORE_DIR, 'exceptions'));
removeIfExists(path.join(CORE_DIR, 'whatsapp_service.py'));

// 2. Re-create / move services
removeIfExists(path.join(APP_DIR, 'services'));

const coreServicesDir = path.join(CORE_DIR, 'services');
const appServicesDir = path.join(APP_DIR, 'services');
if (fs.existsSync(coreServicesDir)) {
    fs.renameSync(coreServicesDir, appServicesDir);
    console.log("Moved app/core/services to app/services");
} else {
    if (!fs.existsSync(appServicesDir)) fs.mkdirSync(appServicesDir);
}

// 3. Create app/services/email
const emailDir = path.join(appServicesDir, 'email');
if (!fs.existsSync(emailDir)) {
    fs.mkdirSync(emailDir, { recursive: true });
    fs.writeFileSync(path.join(emailDir, '__init__.py'), '');
}

// Move email files
['emailing.py', 'email_templates.py'].forEach(f => {
    const src = path.join(CORE_DIR, f);
    if (fs.existsSync(src)) {
        fs.renameSync(src, path.join(emailDir, f));
        console.log(`Moved ${f} to app/services/email/`);
    }
});

// Move other standalone services
['notification_service.py', 'storage.py', 'upload_validator.py'].forEach(f => {
    const src = path.join(CORE_DIR, f);
    if (fs.existsSync(src)) {
        fs.renameSync(src, path.join(appServicesDir, f));
        console.log(`Moved ${f} to app/services/`);
    }
});

// 4. Move app/core/workers to app/workers
const coreWorkersDir = path.join(CORE_DIR, 'workers');
const appWorkersDir = path.join(APP_DIR, 'workers');
if (fs.existsSync(coreWorkersDir)) {
    fs.renameSync(coreWorkersDir, appWorkersDir);
    console.log("Moved app/core/workers to app/workers");
}

// 5. Update Imports
const REPLACEMENTS = [
    { pattern: /\bapp\.core\.services\b/g, repl: 'app.services' },
    { pattern: /\bapp\.core\.notification_service\b/g, repl: 'app.services.notification_service' },
    { pattern: /\bapp\.core\.storage\b/g, repl: 'app.services.storage' },
    { pattern: /\bapp\.core\.upload_validator\b/g, repl: 'app.services.upload_validator' },
    { pattern: /\bapp\.core\.emailing\b/g, repl: 'app.services.email.emailing' },
    { pattern: /\bapp\.core\.email_templates\b/g, repl: 'app.services.email.email_templates' },
    { pattern: /\bapp\.core\.workers\b/g, repl: 'app.workers' },
];

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let originalContent = content;
    
    for (const { pattern, repl } of REPLACEMENTS) {
        content = content.replace(pattern, repl);
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated imports in: ${filepath}`);
    }
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('venv') || fullPath.includes('.pytest_cache') || fullPath.includes('__pycache__') || fullPath.includes('alembic')) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.py')) {
            processFile(fullPath);
        }
    }
}

scanDir(BACKEND_DIR);
console.log("Backend refactoring complete.");
