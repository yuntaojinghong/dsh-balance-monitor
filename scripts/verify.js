#!/usr/bin/env node
/**
 * dsh-balance-monitor 自检脚本
 *
 * 用法：npm run verify
 *
 * 检查项：
 *   1. lib/ 下所有 JS 的语法（node --check）
 *   2. package.json 的 main / exports / files 指向的文件必须真实存在
 *   3. cordis.patch.yml 中引用的包名必须与 package.json.name 一致
 *   4. package.json.version 必须与 CHANGELOG.md 的最新版本条目一致
 *   5. 源码中不得出现形如真实密钥的字面量（sk-…）
 *   6. 提示 legacy/ 归档状态
 *
 * 退出码：0 = 全部通过；1 = 存在失败项。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const warnings = [];
const passes = [];

const rel = (p) => p.replace(ROOT + '\\', '').replace(ROOT + '/', '');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* ---------- 1. 语法检查 ---------- */
function listJs(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.js')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

for (const file of listJs(join(ROOT, 'lib'))) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    passes.push(`语法 OK  ${rel(file)}`);
  } catch (err) {
    failures.push(`语法错误 ${rel(file)}\n${err.stderr?.toString().trim()}`);
  }
}

/* ---------- 2. package.json 路径有效性 ---------- */
const pkg = JSON.parse(read('package.json'));

const targets = new Map();
targets.set('main', pkg.main);
for (const [key, val] of Object.entries(pkg.exports ?? {})) {
  const v = typeof val === 'string' ? val : val?.default;
  if (typeof v === 'string') targets.set(`exports["${key}"]`, v);
}
for (const f of pkg.files ?? []) targets.set(`files`, f);

for (const [where, target] of targets) {
  if (!target) continue;
  const clean = target.replace(/^\.\//, '');
  if (!existsSync(join(ROOT, clean))) {
    failures.push(`${where} 指向的文件不存在：${target}`);
  }
}
if (!failures.some((f) => f.includes('指向的文件不存在'))) {
  passes.push(`包清单路径有效（main / exports / files 共 ${targets.size} 项）`);
}

/* ---------- 3. cordis.patch.yml 包名一致 ---------- */
const patch = read('cordis.patch.yml');
if (!patch.includes(`name: ${pkg.name}`)) {
  failures.push(`cordis.patch.yml 中未找到 "name: ${pkg.name}"，与 package.json.name 不一致`);
} else {
  passes.push(`cordis.patch.yml 包名一致（${pkg.name}）`);
}

/* ---------- 4. 版本号与 CHANGELOG 一致 ---------- */
const changelog = read('CHANGELOG.md');
const firstVersion = changelog.match(/^##\s*\[(\d+\.\d+\.\d+)\]/m);
if (!firstVersion) {
  warnings.push('CHANGELOG.md 未找到形如 "## [x.y.z]" 的版本条目');
} else if (firstVersion[1] !== pkg.version) {
  failures.push(
    `版本号不一致：package.json=${pkg.version}，CHANGELOG 最新=${firstVersion[1]}`,
  );
} else {
  passes.push(`版本号一致（${pkg.version}）`);
}

/* ---------- 5. 源码不含真实密钥字面量 ---------- */
const SECRET = /\bsk-[A-Za-z0-9_-]{16,}\b/g;
const scanned = [
  ...listJs(join(ROOT, 'lib')),
  ...(existsSync(join(ROOT, 'legacy')) ? listJs(join(ROOT, 'legacy')) : []),
  join(ROOT, 'cordis.patch.yml'),
  join(ROOT, 'dsh-balance-config.example.json'),
];
let secretHits = 0;
for (const file of scanned) {
  if (!existsSync(file)) continue;
  const hits = readFileSync(file, 'utf8').match(SECRET);
  if (hits) {
    secretHits += hits.length;
    failures.push(`疑似密钥字面量 ${rel(file)}：${hits.length} 处`);
  }
}
if (secretHits === 0) passes.push('未发现疑似密钥字面量（sk-…）');

/* ---------- 6. legacy 归档提示 ---------- */
if (existsSync(join(ROOT, 'legacy', 'dynamic-plugin'))) {
  warnings.push('legacy/dynamic-plugin/ 为不再维护的历史实现，新功能请只改 lib/');
}
if (existsSync(join(ROOT, 'host.js')) || existsSync(join(ROOT, 'client.js'))) {
  failures.push('仓库根目录出现 host.js / client.js —— 这两份源码应位于 legacy/dynamic-plugin/');
}

/* ---------- 输出 ---------- */
for (const p of passes) console.log(`PASS  ${p}`);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`\n${passes.length} 通过, ${failures.length} 失败, ${warnings.length} 提示`);

process.exit(failures.length === 0 ? 0 : 1);
