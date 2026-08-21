#!/usr/bin/env node
/**
 * 公开产物里**不许出现付费源码**。这个脚本就是那条边界的执行者。
 *
 *   pnpm verify:pro-leak          # 单独跑
 *   pnpm build:docs               # 构建末尾自动跑
 *
 * ## 为什么需要它
 *
 * 付费插件（`@virt-table-pro/*`）在另一个私有仓库里，本仓库的 vanilla playground 通过
 * alias 消费它 —— 但**只吃 `dist`**（压缩过、注释已剥、无 sourcemap，与付费客户拿到的
 * 字节一致），绝不吃 `src`。这条约束只写在注释里的话，改一次 alias 就能悄悄破掉：
 * 本地一切正常，源码跟着 GitHub Pages 一起发出去，而没有任何测试会红。
 *
 * 所以这里用**产物本身**说话：扫一遍要发布的 JS/CSS，凡是带源码痕迹的就让构建失败。
 *
 * ## 查三类痕迹
 *
 * 1. **源码专有注释**：pro 的源码里有大段中文注释，`vite build` 的压缩会把它们全剥掉
 *    （已验证 dist 的 JS/CSS 里一条不剩）。所以产物里出现这些片段，只能是吃了 src。
 * 2. **sourcemap**：`sourceMappingURL` 或随行的 `.map` —— 有 map 等于把源码原样附上。
 * 3. **源码路径**：`virt-table-pro/packages/<x>/src/...` 这类绝对/相对路径字符串，
 *    是 dev 链路或 map 残留的指纹。
 *
 * 顺带报一句「这次构建有没有把付费插件打进去」，免得发布时才发现
 * 演示页是空的 —— 那是另一个方向的事故，同样值得一眼看见。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** 会被发布出去的目录（GitHub Pages 就是 `docs/.vitepress/dist`，micro-app 落在 public 里） */
const PUBLIC_DIRS = ['docs/public/micro-apps', 'docs/.vitepress/dist'];

/**
 * 只在 pro **源码**里出现、压缩后必然消失的片段。
 *
 * 挑的是注释里的长中文短语：它们不可能出现在压缩产物里，也不可能被我们自己的 demo
 * 代码偶然写出来（demo 里的说明文字是另一套措辞）。命中即说明吃了源码。
 */
const SOURCE_ONLY_MARKERS = [
  '中间那层 `.vt-floating-layer` 不是装饰',
  '把手常驻，不做「hover 才显形」',
  '记「抓取偏移」而不是「起点 + 位移」',
  '这是核心 `internal/drag.ts` 的一份拷贝',
  '校验失败只 warn + 右下角角标',
];

/** 产物里出现它，说明付费插件确实被打进来了（`dist` 或 `installed` 档）。只用来报信，不判失败 */
const PRO_PRESENT_MARKER = 'vt-floating-item';

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // 目录不存在（没构建过）不算错，交给调用方判断
  }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const problems = [];
let scanned = 0;
/**
 * 按目录分别记「付费插件在不在」。
 *
 * 合成一个布尔值会骗人：`docs/.vitepress/dist` 是上一次完整构建的产物，而
 * `docs/public/micro-apps` 可能刚被单独重建过 —— 两者不同步时，只报一个「已内联」
 * 会让人以为刚才那次 `VT_PRO=off` 没生效（实测踩过）。分开报，顺带就暴露了「有一边是旧的」。
 */
const presentIn = new Map();

for (const rel of PUBLIC_DIRS) {
  presentIn.set(rel, false);
  for (const file of walk(join(ROOT, rel))) {
    const short = file.slice(ROOT.length);
    if (/\.map$/.test(file)) {
      problems.push(`${short} —— 公开产物里不该有 sourcemap（等于附上源码）`);
      continue;
    }
    if (!/\.(js|mjs|cjs|css|html)$/.test(file)) continue;
    scanned += 1;
    const text = readFileSync(file, 'utf8');

    for (const marker of SOURCE_ONLY_MARKERS) {
      if (text.includes(marker)) {
        problems.push(`${short} —— 含付费**源码**注释片段「${marker.slice(0, 18)}…」`);
        break;
      }
    }
    if (/sourceMappingURL=/.test(text) && !/\.html$/.test(file)) {
      problems.push(`${short} —— 含 sourceMappingURL`);
    }
    if (/virt-table-pro[\\/]packages[\\/][^"'\s]+[\\/]src[\\/]/.test(text)) {
      problems.push(`${short} —— 含 pro 源码路径（dev 链路或 map 残留）`);
    }
    if (text.includes(PRO_PRESENT_MARKER)) presentIn.set(rel, true);
  }
}

if (scanned === 0) {
  console.log('⚠️  没有可扫的公开产物 —— 先跑 pnpm build:docs');
  process.exit(0);
}

if (problems.length > 0) {
  console.error(`\n✗ 公开产物里发现付费源码痕迹（${problems.length} 处）：\n`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error(
    '\n本仓库只允许消费 pro 的 **dist**（见 docs/apps/vanilla/vite.config.ts 头注）。' +
      '\n如果刚改过 alias，把它指回 `packages/<name>/dist/index.js`；' +
      '\n只想构建一个不含付费能力的站点：VT_PRO=off pnpm build:docs\n',
  );
  process.exit(1);
}

const lines = [...presentIn]
  .map(([dir, present]) => `  ${dir}：${present ? '含付费插件（与客户拿到的字节一致）' : '不含付费插件（桩档）'}`)
  .join('\n');
console.log(`✓ 公开产物无付费源码痕迹（扫了 ${scanned} 个文件）\n${lines}`);
