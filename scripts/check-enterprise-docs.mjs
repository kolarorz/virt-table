#!/usr/bin/env node
/**
 * 企业版文档的门禁。
 *
 *   pnpm verify:enterprise        # 单独跑
 *   pnpm build:docs               # 构建前自动跑
 *
 * ## 为什么需要它
 *
 * 这批页面踩在两个「坏了也不报错」的机制上：
 *
 * 1. **`@include` 路径写错是静默的。** VitePress 的 `processIncludes()` 命中不到文件时
 *    **原样返回那行注释**，只在 `DEBUG=*` 下往 stderr 写一句。付费插件页 80% 的正文是
 *    include 进来的，所以拼错一个路径的表现是「页面少了后半篇」，而构建全绿。
 *    （迁移时真踩过一次：`names` 数组与 `segs` 错位，三端页面各少一个 include。）
 *
 * 2. **本站的死链检查是关着的**（`ignoreDeadLinks: true`）。企业版这批页面之间交叉引用
 *    几十条，且 `<ProLink to="...">` 是运行期按当前框架拼路径的 —— VitePress 压根看不见
 *    它，就算把死链检查打开也查不到。
 *
 * 所以这里把三件事查了：include 目标存在、`ProLink` 目标存在、正文里没有付费仓库的痕迹。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');
const FRAMEWORKS = ['vanilla', 'vue', 'react'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

/**
 * 一条站内路径查两件事：页面在不在，以及 `#锚点` 指得到不到。
 * 返回问题描述，没问题返回 null。
 */
function checkTarget(urlPath) {
  const md = resolvePage(urlPath);
  if (!md) return `指向不存在的页面：${urlPath}`;
  const hash = urlPath.split('#')[1];
  if (!hash) return null;
  const want = decodeURIComponent(hash);
  return anchorsOf(md).has(want) ? null : `锚点不存在：${urlPath}`;
}

/** 企业版正文里不该出现的东西：付费仓库的源码/演示路径 */
const FORBIDDEN = [
  { re: /packages\/(license|views|undo|formula|gantt|floating-image|pivot|xlsx|charts|collab)\/src/, why: '付费仓库的源码路径' },
  { re: /playground\//, why: '付费仓库的 playground 路径' },
  { re: /^<<< /m, why: '指向付费仓库文件的 snippet include' },
  { re: /<(FwTabs|FwDemo|PkgStatus)\b/, why: '付费仓库文档站专有组件（本站用 ProDemo / ProPkgStatus）' },
];

/**
 * 复刻 VitePress 生成标题锚点的规则。
 *
 * 为什么不 import `@mdit-vue/shared` 的 `slugify`：它是 vitepress 的**传递**依赖，
 * 不在本仓库的 package.json 里 —— require 它等于赌 pnpm 的提升布局，换个包管理器就断。
 * 规则本身很稳（VitePress 1.x 一直是这一份），照抄二十行更结实。
 *
 * 两处容易忘的细节，都由下面 `assertSlugifyMatchesReality()` 的基准用例守着：
 *   - 锚点取的是标题的**文本内容**，行内 HTML 不算 —— 所以
 *     `## 单元格公式 <Badge text="付费插件" />` 的锚点是 `单元格公式`，不含 Badge 那一堆；
 *   - 空格与 `/` 之类一律并成一个 `-`，首尾的 `-` 去掉 —— `## 撤销 / 重做` → `撤销-重做`。
 */
const R_CONTROL = /[\u0000-\u001f]/g;
const R_SPECIAL = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g;
const R_COMBINING = /[\u0300-\u036F]/g;

function slugify(str) {
  return str
    .normalize('NFKD')
    .replace(R_COMBINING, '')
    .replace(R_CONTROL, '')
    .replace(R_SPECIAL, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase();
}

/** 标题行 → 锚点。先剥行内 HTML（Badge 之类）与 markdown 的强调/代码标记 */
function headingAnchor(line) {
  const text = line
    .replace(/^#{1,6}\s+/, '')
    .replace(/\{#([^}]+)\}\s*$/, '') // 显式锚点 `{#gantt}` 单独处理
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '');
  const explicit = /\{#([^}]+)\}\s*$/.exec(line);
  return explicit ? explicit[1] : slugify(text);
}

/** 一个 md 文件里所有可用锚点（含 include 进来的片段） */
const anchorCache = new Map();
function anchorsOf(mdPath) {
  if (anchorCache.has(mdPath)) return anchorCache.get(mdPath);
  const set = new Set();
  anchorCache.set(mdPath, set); // 先放进去，防 include 成环时无限递归
  let text;
  try {
    text = readFileSync(mdPath, 'utf8');
  } catch {
    return set;
  }
  // 围栏内的 `#` 不是标题
  const outside = text.replace(/^```[\s\S]*?^```/gm, '');
  for (const m of outside.matchAll(/^#{1,6}\s+.*$/gm)) set.add(headingAnchor(m[0]));
  // include 进来的片段里的标题同样能被锚
  for (const m of text.matchAll(/<!--\s*@include:\s*(.*?)\s*-->/g)) {
    const spec = m[1].replace(/\{\d*,\d*\}$/, '').replace(/#[\w-]+$/, '');
    const target = spec.startsWith('@')
      ? join(DOCS, spec.slice(spec[1] === '/' ? 2 : 1))
      : join(dirname(mdPath), spec);
    for (const a of anchorsOf(target)) set.add(a);
  }
  return set;
}

/** 把一条站内路径解析成 md 文件路径（找不到返回 null） */
function resolvePage(urlPath) {
  const clean = urlPath.split('#')[0].replace(/^\//, '');
  if (!clean) return null;
  const candidates = clean.endsWith('/')
    ? [`${clean}index.md`]
    : [`${clean}.md`, `${clean}/index.md`];
  for (const c of candidates) {
    const p = join(DOCS, c);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * 用**已知为真**的几条校准 slugify —— 这些锚点是从构建产物的 `<h2 id=...>` 里抄下来的。
 * 哪天 VitePress 换了 slug 规则，这里会先红，而不是让几十条锚点静默失效。
 */
function assertSlugifyMatchesReality() {
  const cases = [
    ['## 单元格公式 <Badge type="warning" text="付费插件" />', '单元格公式'],
    ['## 撤销 / 重做 <Badge type="warning" text="付费插件" />', '撤销-重做'],
    ['## 浮动图片 <Badge type="warning" text="付费插件" />', '浮动图片'],
    ['## 为什么有「计划 / 实际」两对日期', '为什么有「计划-实际」两对日期'],
    ['### 甘特图 {#gantt}', 'gantt'],
  ];
  const bad = cases.filter(([line, want]) => headingAnchor(line) !== want);
  if (bad.length) {
    console.error('\n✗ slugify 与 VitePress 的实际行为不一致，锚点校验不可信：');
    for (const [line, want] of bad) {
      console.error(`  · ${line}\n    期望 #${want}，得到 #${headingAnchor(line)}`);
    }
    process.exit(1);
  }
}

const files = [
  ...walk(join(DOCS, '.enterprise')),
  ...FRAMEWORKS.flatMap((fw) => walk(join(DOCS, fw, 'enterprise'))),
  // 无框架维度的授权与定价页 —— 它也用 ProLink 通往三端文档，同样要查
  ...walk(join(DOCS, 'enterprise')),
];

assertSlugifyMatchesReality();

const problems = [];
let includes = 0;
let links = 0;

for (const file of files) {
  const short = file.slice(DOCS.length + 1);
  const text = readFileSync(file, 'utf8');
  const at = (idx) => text.slice(0, idx).split('\n').length;

  // 1) include 目标
  for (const m of text.matchAll(/<!--\s*@include:\s*(.*?)\s*-->/g)) {
    includes += 1;
    const spec = m[1].replace(/\{\d*,\d*\}$/, '').replace(/#[\w-]+$/, '');
    const target = spec.startsWith('@')
      ? join(DOCS, spec.slice(spec[1] === '/' ? 2 : 1))
      : join(dirname(file), spec);
    if (!existsSync(target)) {
      problems.push(`${short}:${at(m.index)} —— @include 目标不存在：${spec}`);
    }
  }

  // 2) ProLink 目标（to = 企业版 slug，core = 核心文档路径）
  for (const m of text.matchAll(/<ProLink\s+([^>]*?)>/g)) {
    const attrs = m[1];
    const to = /\bto="([^"]*)"/.exec(attrs)?.[1];
    const core = /\bcore="([^"]*)"/.exec(attrs)?.[1];
    const href = /\bhref="([^"]*)"/.exec(attrs)?.[1];
    // 三端都得存在（正文共用一份，只要有一端缺页就是死链）
    for (const [kind, val] of [['to', to], ['core', core]]) {
      if (!val) continue;
      links += 1;
      for (const fw of FRAMEWORKS) {
        const path = kind === 'to' ? `/${fw}/enterprise/${val}` : `/${fw}/${val}`;
        const bad = checkTarget(path);
        if (bad) problems.push(`${short}:${at(m.index)} —— ProLink ${kind}="${val}" 在 ${fw} 端${bad}`);
      }
    }
    if (href) {
      links += 1;
      const bad = checkTarget(href);
      if (bad) problems.push(`${short}:${at(m.index)} —— ProLink href="${href}" ${bad}`);
    }
  }

  // 3) 普通 markdown 站内链接
  for (const m of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    links += 1;
    const bad = checkTarget(m[1]);
    if (bad) problems.push(`${short}:${at(m.index)} —— ${bad}`);
  }

  // 4) 不该出现的痕迹
  for (const { re, why } of FORBIDDEN) {
    const hit = re.exec(text);
    if (hit) problems.push(`${short}:${at(hit.index)} —— 含${why}：${hit[0].slice(0, 40)}`);
  }
}

if (files.length === 0) {
  console.error('✗ 没有找到企业版文档（docs/.enterprise 与 docs/*/enterprise 都是空的）');
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`\n✗ 企业版文档有 ${problems.length} 处问题：\n`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error('\n机制说明见 docs/.enterprise/README.md\n');
  process.exit(1);
}

console.log(
  `✓ 企业版文档检查通过：${files.length} 个文件、${includes} 条 include、${links} 条站内链接`,
);
