#!/usr/bin/env node
/**
 * 发布前产物校验：把三个包按发布形态打成 tarball、解开，然后当成**真实使用方**去验。
 *
 * 用法：`pnpm verify:pack`（已挂进 `pnpm release` 的流程）
 *
 * ## 为什么必须对着 tarball 验，而不是对着 dist
 *
 * 三端 demo 的 vite alias 与根 `tsconfig.base.json` 的 `paths` 全都指向各包的
 * `src/` 源码，所以 `pnpm test` 和 `pnpm typecheck` 全绿**完全不能证明**
 * `dist/` 与 package.json 的 `exports` 映射是对的 —— 这条路上没有任何真实消费者。
 * 已经因此漏出去过两个坑，两个都由下面的检查项钉住：
 *
 *   1. `exports` 声明了 `./components/*`，17 个组件却只有 `.d.ts` 没有 `.js`
 *      （都被打进了 barrel）→ TS 编译通过、运行时 ERR_MODULE_NOT_FOUND。
 *   2. `src/plugins` 里 tsc 误 emit 的 `.d.ts` 残留被当成构建入口，把
 *      `search.css` 的产物名带成 `search.d.css` → `./plugins/*.css` 全线 404。
 *
 * ## 检查项
 *
 *   A. `exports` / `main` / `module` / `types` / `unpkg` 指向的文件真实存在（通配符按
 *      实际产物展开，每个具体实例的四个条件产物都要齐）
 *   B. src 下的每个 CSS 在 dist 里有同名产物（钉住第 2 类坑：CSS 改名后这条会红）
 *   C. dist 里没有 `.d.js` / `.d.cjs` / `.d.css` 脏产物（同上，从另一侧钉）
 *   D. 每个 `.d.ts` 都有配对的 `.d.cts`（钉住漏跑 emit-dcts 的情况）
 *   E. tarball 里没有源码 / 配置 / 测试泄漏，且带上了 README 与 LICENSE
 *   F. vanilla 的每个 JS 子路径都能被 Node 真实 `import()` 与 `require()`，
 *      每个 CSS 子路径都能被 `require.resolve()` 解析
 *
 * F 只对 vanilla 做：它的运行时依赖全部内联，解开就能跑；react/vue 需要
 * react-dom / vue 才能加载，装它们等于把这个脚本变成一次完整的 npm install，
 * 不值得 —— 它们的 A~E 照样验，而它们的类型能否解析已由构建时的
 * `tsc -p tsconfig.build.json` 保证（那一步会真实走 vanilla 的 exports）。
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES = ['vanilla', 'react', 'vue'];

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const problems = [];
const bad = (pkg, msg) => problems.push(`${pkg}: ${msg}`);
const step = (m) => console.log(`\n${c.cyan('▶')} ${c.bold(m)}`);
const ok = (m) => console.log(`  ${c.green('✓')} ${m}`);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...opts,
  });
  if (res.status !== 0 && !opts.allowFail) {
    console.error(c.red(`命令失败：${cmd} ${args.join(' ')}`));
    if (res.stderr) console.error(c.dim(res.stderr));
    process.exit(1);
  }
  return { status: res.status, stdout: (res.stdout || '').trim(), stderr: (res.stderr || '').trim() };
}

/** 递归收集相对路径 */
function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/** 把 exports 里的条件对象摊平成一串目标路径 */
function targetsOf(value, acc = []) {
  if (typeof value === 'string') acc.push(value);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) targetsOf(v, acc);
  return acc;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-verify-'));
try {
  step('打包三个包');
  const dirs = {};
  for (const p of PACKAGES) {
    const cwd = path.join(ROOT, 'packages', p);
    const res = run('npm', ['pack', '--pack-destination', tmp], { cwd, capture: true });
    const tgz = res.stdout.split('\n').pop().trim();
    const dest = path.join(tmp, p);
    fs.mkdirSync(dest, { recursive: true });
    run('tar', ['xzf', path.join(tmp, tgz), '-C', dest, '--strip-components=1'], { capture: true });
    dirs[p] = dest;
    const size = (fs.statSync(path.join(tmp, tgz)).size / 1024).toFixed(1);
    ok(`@virt-table/${p} → ${size} kB`);
  }

  step('A. exports / main / types 指向的产物是否存在');
  for (const p of PACKAGES) {
    const dir = dirs[p];
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const files = walk(path.join(dir, 'dist'), dir);
    let checked = 0;

    for (const field of ['main', 'module', 'types', 'unpkg', 'jsdelivr']) {
      const v = pkg[field];
      if (!v) continue;
      checked += 1;
      if (!fs.existsSync(path.join(dir, v))) bad(p, `${field} 指向的 ${v} 不存在`);
    }

    for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
      if (subpath === './package.json') continue;
      const targets = targetsOf(value);

      for (const target of targets.filter((t) => !t.includes('*'))) {
        checked += 1;
        if (!fs.existsSync(path.join(dir, target))) {
          bad(p, `exports["${subpath}"] 指向的 ${target} 不存在`);
        }
      }

      /*
       * 通配条目：先按 dist 里真实存在的文件反推出 `*` 的取值集合（任一条件产物命中
       * 即算一个实例），再要求每个实例的**全部**条件产物都齐 —— 只有 `.js` 没有
       * `.d.cts` 这种半截状态正是要抓的。
       */
      const wildcards = targets.filter((t) => t.includes('*'));
      if (wildcards.length === 0) continue;
      const stars = new Set();
      for (const target of wildcards) {
        const [prefix, suffix] = target.split('*');
        for (const f of files.map((x) => `./${x}`)) {
          if (!f.startsWith(prefix) || !f.endsWith(suffix)) continue;
          const star = f.slice(prefix.length, f.length - suffix.length);
          // `*` 不跨目录
          if (star && !star.includes('/')) stars.add(star);
        }
      }
      for (const star of stars) {
        for (const target of wildcards) {
          checked += 1;
          const concrete = target.replace('*', star);
          if (!fs.existsSync(path.join(dir, concrete))) {
            bad(p, `exports["${subpath}"]（*=${star}）缺少 ${concrete}`);
          }
        }
      }
    }
    ok(`${p}：${checked} 个目标已核对`);
  }

  /*
   * CSS 产物名跟的是**所属入口的 chunk 名**（见 vite.config.ts 的 cssPerEntry），
   * 多数情况下与源文件同名（`plugins/search.css` 属于入口 `plugins/search`），
   * 下面两个是名字对不上的：源文件不是入口本体，而是被入口引进来的共享样式。
   *
   * 刻意用显式映射而不是"存在于 dist 任意位置即可"这种宽松判断：正是"同名"这个约束
   * 才钉得住 `search.css` 被改名成 `search.d.css` 那类事故。哪天真的改了产物名，
   * 这里会红一次 —— 那就是应该被看见的。
   */
  const CSS_ALIAS = {
    'index.css': 'core.css',
    'components/components.css': 'components/index.css',
  };

  step('B. src 里的每个 CSS 在 dist 里有对应产物');
  for (const p of PACKAGES) {
    const srcDir = path.join(ROOT, 'packages', p, 'src');
    const cssFiles = walk(srcDir).filter((f) => f.endsWith('.css'));
    let n = 0;
    for (const f of cssFiles) {
      // 下划线开头的是被 @import 内联的片段，不单独出产物
      if (path.basename(f).startsWith('_')) continue;
      const expect = CSS_ALIAS[f] ?? f;
      n += 1;
      if (!fs.existsSync(path.join(dirs[p], 'dist', expect))) {
        bad(p, `src/${f} 没有对应的 dist/${expect}（CSS 产物改名了？）`);
      }
    }
    ok(`${p}：${n} 个 CSS 已核对`);
  }

  step('C. dist 里没有 .d.js / .d.cjs / .d.css 脏产物');
  for (const p of PACKAGES) {
    const dirty = walk(path.join(dirs[p], 'dist')).filter((f) => /\.d\.(js|cjs|css)$/.test(f));
    if (dirty.length) bad(p, `发现脏产物（源码目录里有 .d.ts 残留？）：${dirty.join(', ')}`);
    else ok(`${p}：干净`);
  }

  step('D. 每个 .d.ts 都有配对的 .d.cts');
  for (const p of PACKAGES) {
    const all = walk(path.join(dirs[p], 'dist'));
    const dts = all.filter((f) => f.endsWith('.d.ts'));
    const missing = dts.filter((f) => !all.includes(f.replace(/\.d\.ts$/, '.d.cts')));
    if (missing.length) bad(p, `缺少 .d.cts（漏跑 emit-dcts？）：${missing.slice(0, 5).join(', ')}`);
    else ok(`${p}：${dts.length} 对齐全`);
  }

  step('E. tarball 内容没有泄漏，README / LICENSE 齐全');
  for (const p of PACKAGES) {
    const all = walk(dirs[p]);
    const leaked = all.filter(
      (f) => f.startsWith('src/') || f.includes('.test.') || /tsconfig|vite\.config/.test(f),
    );
    if (leaked.length) bad(p, `不该进包的文件：${leaked.slice(0, 5).join(', ')}`);
    for (const need of ['README.md', 'LICENSE']) {
      if (!all.includes(need)) bad(p, `缺少 ${need}`);
    }
    if (!leaked.length) ok(`${p}：${all.length} 个文件，无泄漏`);
  }

  step('F. vanilla 的每个子路径能被 Node 真实加载');
  {
    const home = path.join(tmp, 'consumer');
    const nm = path.join(home, 'node_modules', '@virt-table');
    fs.mkdirSync(nm, { recursive: true });
    fs.cpSync(dirs.vanilla, path.join(nm, 'vanilla'), { recursive: true });
    fs.writeFileSync(
      path.join(home, 'package.json'),
      JSON.stringify({ name: 'vt-verify-consumer', private: true }, null, 2),
    );

    const pkg = JSON.parse(fs.readFileSync(path.join(dirs.vanilla, 'package.json'), 'utf8'));
    const jsSubpaths = [];
    const cssSubpaths = [];
    for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
      if (subpath === './package.json') continue;
      const spec = `@virt-table/vanilla${subpath.slice(1)}`;
      if (subpath.endsWith('.css')) {
        if (!subpath.includes('*')) cssSubpaths.push(spec);
        continue;
      }
      if (subpath.includes('*')) {
        // 通配子路径按真实产物展开（plugins/* → plugins/search 等）
        const [prefix, suffix] = subpath.split('*');
        const dirRel = prefix.replace(/^\.\//, '');
        const base = path.join(dirs.vanilla, 'dist', dirRel);
        if (!fs.existsSync(base)) continue;
        for (const f of fs.readdirSync(base)) {
          if (!f.endsWith('.js')) continue;
          jsSubpaths.push(`@virt-table/vanilla/${dirRel}${f.replace(/\.js$/, '')}${suffix}`);
        }
        continue;
      }
      jsSubpaths.push(spec);
    }

    const esm = jsSubpaths.map((s) => `await import(${JSON.stringify(s)});`).join('\n');
    const cjsAll = [...jsSubpaths, ...cssSubpaths];
    const script = `
${esm}
const { createRequire } = await import('node:module');
const require_ = createRequire(${JSON.stringify(path.join(home, 'index.cjs'))});
for (const s of ${JSON.stringify(cjsAll)}) require_.resolve(s);
for (const s of ${JSON.stringify(jsSubpaths)}) require_(s);
console.log('LOADED', ${jsSubpaths.length}, ${cssSubpaths.length});
`;
    const res = run('node', ['--input-type=module', '-e', script], {
      cwd: home,
      capture: true,
      allowFail: true,
    });
    if (res.status !== 0) {
      bad('vanilla', `子路径加载失败：\n${c.dim(res.stderr.split('\n').slice(0, 6).join('\n'))}`);
    } else {
      const [, js, css] = res.stdout.split('LOADED')[1].trim().match(/(\d+)\s+(\d+)/) ?? [];
      ok(`${js} 个 JS 子路径 import + require 通过，${css} 个 CSS 子路径可解析`);
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (problems.length) {
  console.error(`\n${c.red('✗')} ${c.bold(`产物校验未通过（${problems.length} 项）`)}`);
  for (const p of problems) console.error(`  ${c.red('•')} ${p}`);
  process.exit(1);
}
console.log(`\n${c.green('✓')} ${c.bold('产物校验通过')}\n`);
