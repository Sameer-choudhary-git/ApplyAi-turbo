const fs = require('fs');
const path = require('path');

const root = process.cwd();

function toPosix(p) { return p.split(path.sep).join('/'); }

function hasTsFiles(dir) {
  const exts = ['.ts', '.tsx'];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const items = fs.readdirSync(cur, { withFileTypes: true });
    for (const it of items) {
      if (it.name === 'node_modules' || it.name === 'dist') continue;
      const full = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(full);
      else {
        if (exts.includes(path.extname(it.name))) return true;
      }
    }
  }
  return false;
}

function ensureTsconfig(dir) {
  const tsconfigPath = path.join(dir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) return false;
  const basePath = path.join(root, 'packages', 'typescript-config', 'base.json');
  let rel = path.relative(dir, basePath);
  rel = toPosix(rel);
  if (!rel.startsWith('.')) rel = './' + rel;
  const content = {
    $schema: "https://json.schemastore.org/tsconfig",
    extends: rel,
    compilerOptions: {
      outDir: "dist"
    },
    include: ["src/**/*", "**/*.ts", "**/*.tsx", "types"]
  };
  fs.writeFileSync(tsconfigPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  return true;
}

function removeAddedBuildScript(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.scripts && pkg.scripts.build === "tsc -p tsconfig.json") {
    delete pkg.scripts.build;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    return true;
  }
  return false;
}

function ensureBuildScript(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};
  if (pkg.scripts.build) return false;
  pkg.scripts.build = "tsc -p tsconfig.json";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  return true;
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
const modified = { tsconfigCreated: [], packageJsonUpdated: [], packageJsonReverted: [] };

for (const r of roots) {
  const start = path.join(root, r);
  const dirs = walkDirs(start);
  for (const dir of dirs) {
    // skip the central typescript-config package itself
    if (dir.endsWith(path.join('packages', 'typescript-config'))) continue;
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const hasTs = hasTsFiles(dir);
    if (hasTs) {
      if (ensureTsconfig(dir)) modified.tsconfigCreated.push(path.relative(root, path.join(dir, 'tsconfig.json')));
      if (ensureBuildScript(pkgPath)) modified.packageJsonUpdated.push(path.relative(root, pkgPath));
    } else {
      if (removeAddedBuildScript(pkgPath)) modified.packageJsonReverted.push(path.relative(root, pkgPath));
    }
  }
}

console.log('Done. Summary:');
console.log('tsconfig created:', modified.tsconfigCreated);
console.log('package.json updated (added build):', modified.packageJsonUpdated);
console.log('package.json reverted (removed added build):', modified.packageJsonReverted);