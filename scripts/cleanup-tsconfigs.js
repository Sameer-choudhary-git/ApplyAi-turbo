const fs = require('fs');
const path = require('path');

const root = process.cwd();

function isTsFile(name) {
  return ['.ts', '.tsx'].includes(path.extname(name));
}

function hasTsFiles(dir) {
  try {
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      const items = fs.readdirSync(cur, { withFileTypes: true });
      for (const it of items) {
        if (it.name === 'node_modules' || it.name === 'dist') continue;
        const full = path.join(cur, it.name);
        if (it.isDirectory()) stack.push(full);
        else if (isTsFile(it.name)) return true;
      }
    }
  } catch (e) {
    return false;
  }
  return false;
}

function walkDirs(startDir) {
  const results = [];
  if (!fs.existsSync(startDir)) return results;
  const items = fs.readdirSync(startDir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(startDir, it.name);
    if (it.isDirectory()) {
      const pkg = path.join(full, 'package.json');
      if (fs.existsSync(pkg)) results.push(full);
      else results.push(...walkDirs(full));
    }
  }
  return results;
}

const roots = ['apps', 'packages'];
const removed = [];
const packageJsonUpdated = [];

for (const r of roots) {
  const start = path.join(root, r);
  const dirs = walkDirs(start);
  for (const dir of dirs) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(tsconfigPath)) continue;
    const hasTs = hasTsFiles(dir);
    if (!hasTs) {
      try {
        fs.unlinkSync(tsconfigPath);
        removed.push(path.relative(root, tsconfigPath));
      } catch (e) {
        // ignore
      }
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.scripts && pkg.scripts.build === "tsc -p tsconfig.json") {
            delete pkg.scripts.build;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            packageJsonUpdated.push(path.relative(root, pkgPath));
          }
        } catch (e) {}
      }
    }
  }
}

console.log('Cleanup complete.');
console.log('tsconfig removed:', removed);
console.log('package.json updated (removed build):', packageJsonUpdated);