import fs from 'fs';
import path from 'path';

const FRONTEND_DIR = path.resolve('apps/frontend');
const APP_DIR = path.join(FRONTEND_DIR, 'app');
const COMPONENTS_DIR = path.join(FRONTEND_DIR, 'components');
const MODULES_DIR = path.join(COMPONENTS_DIR, 'modules');

// 1. Fix (auth) and (dashboard) folders
const brokenAuth = path.join(APP_DIR, '(auth');
const brokenDashboard = path.join(APP_DIR, '(dashboard');
const fixedAuth = path.join(APP_DIR, '(auth)');
const fixedDashboard = path.join(APP_DIR, '(dashboard)');

function fixBrokenGroup(broken, fixed) {
  if (fs.existsSync(broken)) {
    // If fixed already exists (unlikely), we'd merge, but let's assume it doesn't
    if (!fs.existsSync(fixed)) {
      fs.renameSync(broken, fixed);
      console.log(`Renamed ${broken} to ${fixed}`);
    }
    // Delete the rogue ')' folder inside the fixed folder
    const rogueParen = path.join(fixed, ')');
    if (fs.existsSync(rogueParen)) {
      fs.rmSync(rogueParen, { recursive: true, force: true });
      console.log(`Deleted rogue ')' folder inside ${fixed}`);
    }
  }
}

fixBrokenGroup(brokenAuth, fixedAuth);
fixBrokenGroup(brokenDashboard, fixedDashboard);

// Create (auth) and (dashboard) if they don't exist
if (!fs.existsSync(fixedAuth)) fs.mkdirSync(fixedAuth);
if (!fs.existsSync(fixedDashboard)) fs.mkdirSync(fixedDashboard);

// 2. Move root routes into (dashboard) and (auth)
const authRoutes = ['login', 'password-reset'];
const dashboardRoutes = [
  'admin', 'bakim', 'documents', 'field-reports', 'finance', 
  'inventory', 'is-emirleri', 'is-emri', 'onay-surecleri', 
  'platform', 'procurement', 'projects', 'settings', 
  'tadilat', 'workflow', 'yeni-yapim'
];

authRoutes.forEach(route => {
  const oldPath = path.join(APP_DIR, route);
  const newPath = path.join(fixedAuth, route);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${route} to (auth)`);
  }
});

dashboardRoutes.forEach(route => {
  const oldPath = path.join(APP_DIR, route);
  const newPath = path.join(fixedDashboard, route);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${route} to (dashboard)`);
  }
});

// 3. Move components into modules/
if (!fs.existsSync(MODULES_DIR)) fs.mkdirSync(MODULES_DIR, { recursive: true });

const componentsToMove = ['dashboard', 'inventory', 'notifications', 'workflow'];

componentsToMove.forEach(comp => {
  const oldPath = path.join(COMPONENTS_DIR, comp);
  const newPath = path.join(MODULES_DIR, comp);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved component folder ${comp} to modules/${comp}`);
  }
});

// 4. Update imports across the codebase
const dirsToScan = [APP_DIR, COMPONENTS_DIR, path.join(FRONTEND_DIR, 'hooks'), path.join(FRONTEND_DIR, 'lib')];

function scanAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanAndReplace(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Update @/components/xxx to @/components/modules/xxx for the moved components
      componentsToMove.forEach(comp => {
        const regex = new RegExp(`@/components/${comp}(/|['"])`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `@/components/modules/${comp}$1`);
          changed = true;
        }
      });

      // Update relative imports if any exist (e.g. ../../components/dashboard)
      componentsToMove.forEach(comp => {
        const regexRelative = new RegExp(`components/${comp}(/|['"])`, 'g');
        if (regexRelative.test(content)) {
          // Careful not to replace inside components/modules/ already
          const ignoreRegex = new RegExp(`components/modules/${comp}`);
          if (!ignoreRegex.test(content)) {
             content = content.replace(regexRelative, `components/modules/${comp}$1`);
             changed = true;
          }
        }
      });


      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

dirsToScan.forEach(scanAndReplace);

console.log('Refactoring complete!');
