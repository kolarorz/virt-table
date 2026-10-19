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
 * 1. **源码专有注释**：pro 的源码里有大段中文注释。付费仓库的 `build/lib-config.ts` 有一道
 *    `fullMinify()` 把它们从 dist 里全剥掉，本仓库构建微应用时 vite 又压一遍 ——
 *    所以公开产物里出现这些片段，只能是吃了 `src`。
 *
 *    ⚠️ 这条判据曾经**不成立**：在 `fullMinify()` 之前，vite 7 的 lib 档只 mangle 标识符、
 *    注释与换行原样留着（实测 `gantt/dist/index.js` 1867 行、12 行注释）。也就是说
 *    dist 与 src 都带着这些片段，这条查不出"吃了哪一份"。现在上游干净了，它才真的是
 *    "src 专有"。改动付费仓库的压缩配置时要想到这里。
 * 2. **sourcemap**：`sourceMappingURL` 或随行的 `.map` —— 有 map 等于把源码原样附上。
 * 3. **源码路径**：`virt-table-pro/packages/<x>/src/...` 这类绝对/相对路径字符串，
 *    是 dev 链路或 map 残留的指纹。
 *
 * 顺带报一句「这次构建有没有把付费插件打进去」——
 * 而且在**本该有却没有**时直接判红，见下面 `expectPro`。那是另一个方向的事故：
 * 站发出去了、看起来一切正常，只是每个付费 demo 位都是说明卡。
 *
 * ## 入库的 vendor 产物不在这里查
 *
 * `docs/.pro-vendor/`（`vendor` 档那批**入库**的混淆产物）由
 * `scripts/check-pro-vendor.mjs` 负责 —— 那边查得更细（清单哈希、混淆特征、密钥有效期），
 * 且**不引任何付费仓库的文件**，因为它要在 CI 上跑。这里不重复一遍：同一条判据两份实现，
 * 改了一处就会漂移。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
 *
 * ⚠️ **新增/改写这些短语时，先确认它不会撞上企业版文档的正文。**
 *
 * 那些文档页（`docs/<fw>/enterprise/` 下的 md）会用**很接近的措辞**解释同一个设计决定，而它们
 * 编译出来的 JS 是合法的公开产物、就在扫描范围里。已经有一处擦肩而过：
 *
 *   源码注释（本清单）  `把手常驻，不做「hover 才显形」`
 *   文档正文（合法产物）`把手常驻，不是 hover 才出。`
 *
 * 只差几个字。真撞上的话症状是「构建判红，但产物其实没问题」，而排查方向会一路指向
 * alias 配置 —— 因为报错信息说的是"含付费源码注释片段"。
 * 所以短语要挑**只有源码里才会那样写**的，比如带反引号的标识符、带具体数值的解释。
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

/**
 * 这次构建**本该**带上付费能力吗？
 *
 * 判据与 `build/pro-mode.ts` 的构建期档位同源，但这里只用文件系统信号（本脚本不引 TS）：
 *   - 任一 app 的 `node_modules/@virt-table-pro/license` 在 → `installed` 档够条件；
 *   - `docs/.pro-vendor/manifest.json` 在 → `vendor` 档够条件。
 *
 * `VT_PRO=off` 是显式表态（「就是要发一个不含付费能力的站」），那时不判。
 * 刻意**不看**付费仓库源码在不在：构建期根本不认 `src` 档，把它算进"本该有"会让
 * 「有 pro 仓库但没打产物」的构建判红，而那是个合法状态（结果就是 off 档）。
 */
const APPS = ['vanilla', 'react', 'vue'];
const proInstalled = APPS.some((app) =>
  existsSync(join(ROOT, `docs/apps/${app}/node_modules/@virt-table-pro/license/package.json`)),
);
const proVendored = existsSync(join(ROOT, 'docs/.pro-vendor/manifest.json'));
const expectPro = (proInstalled || proVendored) && process.env.VT_PRO !== 'off';

/**
 * 「本该有付费能力却没打进去」记在**另一个**数组里。
 *
 * 与源码泄漏是方向相反的两类事故，混在一起报会把人带到错误的方向：泄漏的处置是
 * 「把 alias 指回 dist」，而这一类的处置是「重跑一次构建」。第一版就是混着报的，
 * 结果标题写着"发现付费源码痕迹"、建议写着"检查 alias"，而真正的问题是产物太旧。
 */
const missing = [];
if (expectPro) {
  const source = proInstalled ? '各 app 的 node_modules（installed 档）' : 'docs/.pro-vendor（vendor 档）';
  for (const [dir, present] of presentIn) {
    if (present) continue;
    missing.push(dir);
  }
  if (missing.length > 0) {
    console.error(
      `\n✗ 本该带付费能力，产物里却没有（${missing.length} 处）：\n`,
    );
    for (const dir of missing) console.error(`  · ${dir}`);
    console.error(
      `\n付费产物是可用的（${source}），所以这不是"没有付费包"，而是**这次的产物是旧的**` +
        '\n—— 多半是上一次 off 档构建留下来的。重跑一遍：\n' +
        '  pnpm build:docs\n' +
        '\n确实想发一个不含付费能力的站：VT_PRO=off pnpm build:docs（那时这条检查不判红）\n',
    );
  }
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

// 只有"缺付费能力"这一类：上面已经把详情打出来了，这里只负责判红
if (missing.length > 0) process.exit(1);

const lines = [...presentIn]
  .map(([dir, present]) => `  ${dir}：${present ? '含付费插件（与客户拿到的字节一致）' : '不含付费插件（桩档）'}`)
  .join('\n');
console.log(`✓ 公开产物无付费源码痕迹（扫了 ${scanned} 个文件）\n${lines}`);
