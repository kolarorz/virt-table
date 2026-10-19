#!/usr/bin/env node
/**
 * 自检**入库的付费产物**（`docs/.pro-vendor/`）。
 *
 *   pnpm verify:pro-vendor        # 单独跑
 *   pnpm build:docs              # 构建链里自动跑（在 docs build 之前）
 *
 * ## 一个付费仓库的文件都不引 —— 这条是硬约束
 *
 * 它要在 **CI 的 runner 上**跑，而那里没有私有仓库 `virt-table-pro`。所以判据只能来自
 * `docs/.pro-vendor/` 目录自己：manifest 里的哈希、文件内容的特征。
 *
 * 这也意味着「混淆特征串」是**按字面值**写在下面的，而它的定义在付费仓库的
 * `scripts/lib/obfuscate.mjs`（`OBFUSCATED_MARKER`）。两边必须一致 ——
 * 好在改坏了会在**签发端**当场抛（那个文件里有一道自检），不会拖到这里才发现。
 *
 * ## 查什么
 *
 * 1. **清单完整性**：manifest 列的文件都在、逐文件 sha256 对得上、目录里没有多余的产物
 *    （多余的往往是上一版包被删掉之后留下的残留，而 alias 仍然指得到它 ——
 *    症状是"明明删了的付费包还在生效"）。
 * 2. **真的混淆过**：带混淆特征、单行、无源码注释痕迹。防的不是攻击者，是**我自己**
 *    某天让混淆静默跳过、把可读的付费产物提交进公开仓库。
 * 3. **没有 sourcemap**：`.map` 文件或 `sourceMappingURL` —— 有 map 等于把源码原样附上。
 * 4. **密钥有效期**：缺省只签 7 天，到期后线上会长出未授权角标。这里提前提醒。
 *
 * ## 目录不在 = 直接放过
 *
 * fork、外部贡献者、以及还没打过产物的机器都没有这个目录，那是**正常状态**（落 `off` 档）。
 * 这个脚本串在 `build:docs` 里，所以它绝不能因为"没有付费产物"而判红 ——
 * 那会把所有外部贡献者的构建弄红。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VENDOR_DIR = resolve(ROOT, 'docs/.pro-vendor');

/**
 * 混淆产物必然含有的特征串（字符串数组的轮转 IIFE）。
 * 定义在付费仓库 `scripts/lib/obfuscate.mjs` 的 `OBFUSCATED_MARKER`，这里按字面值复制 ——
 * 见文件头「一个付费仓库的文件都不引」。
 */
const OBFUSCATED_MARKER = 'while(!![])';

/**
 * 只在付费**源码**里出现的片段。与 `scripts/check-pro-leak.mjs` 共用同一组判据
 * （那边扫构建产物，这边扫入库的 vendor 产物）。
 *
 * 命中即说明这批字节不是「构建 + 混淆」出来的，而是从源码抄过来的。
 */
const SOURCE_ONLY_MARKERS = [
  '中间那层 `.vt-floating-layer` 不是装饰',
  '把手常驻，不做「hover 才显形」',
  '记「抓取偏移」而不是「起点 + 位移」',
  '这是核心 `internal/drag.ts` 的一份拷贝',
  '校验失败只 warn + 右下角角标',
];

/** 产物是 `compact: true` 出来的，正常是 1 行。给点余量，但远小于"没压过"的量级 */
const MAX_LINES = 3;

const problems = [];
const warnings = [];

// ---------- 目录不在：正常，放过 ----------

if (!existsSync(resolve(VENDOR_DIR, 'manifest.json'))) {
  console.log(
    '⚪️ 没有入库的付费产物（docs/.pro-vendor/）—— 付费插件会落到桩档，这在 fork / 外部贡献者\n' +
      '   的 checkout 上是正常状态。维护者想给 CI 备一份：pnpm pro:vendor',
  );
  process.exit(0);
}

// ---------- 1. 清单完整性 ----------

let manifest;
try {
  manifest = JSON.parse(readFileSync(resolve(VENDOR_DIR, 'manifest.json'), 'utf8'));
} catch (err) {
  console.error(`✗ manifest.json 解析失败：${err.message}\n  重新生成：pnpm pro:vendor`);
  process.exit(1);
}

const listed = new Map();
for (const pkg of manifest.packages ?? []) {
  for (const f of pkg.files ?? []) listed.set(f.path, { ...f, pkg: pkg.name });
}
if (listed.size === 0) {
  console.error('✗ manifest 里一个文件都没有 —— 产物是空的。重新生成：pnpm pro:vendor');
  process.exit(1);
}

for (const [rel, meta] of listed) {
  const file = resolve(VENDOR_DIR, rel);
  if (!existsSync(file)) {
    problems.push(`${rel} —— manifest 里有，磁盘上没有（拷贝不完整或被误删）`);
    continue;
  }
  const buf = readFileSync(file);
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== meta.sha256) {
    problems.push(
      `${rel} —— sha256 与 manifest 不符（被手工改过？产物目录不能手改）\n` +
        `      manifest ${meta.sha256.slice(0, 16)}…  实际 ${sha.slice(0, 16)}…`,
    );
  }
}

/*
 * 反向查一遍：磁盘上有、manifest 里没有的产物文件。
 *
 * 这类残留来自「某个付费包被删掉/改名之后重新打包」—— `buildVendorBundles` 会整体清空
 * 目录，所以正常流程下不该出现；真出现了说明有人手工往里放过东西，而 alias 是按 manifest
 * 生成的，那个文件于是成了一份不受任何检查覆盖的付费字节躺在公开仓库里。
 */
const META_FILES = new Set(['manifest.json', 'license.json', 'README.md']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
for (const file of walk(VENDOR_DIR)) {
  const rel = file.slice(VENDOR_DIR.length + 1);
  if (META_FILES.has(rel)) continue;
  if (/\.map$/.test(file)) {
    problems.push(`${rel} —— 入库产物里不该有 sourcemap（等于把源码一起提交进公开仓库）`);
    continue;
  }
  if (!listed.has(rel)) {
    problems.push(`${rel} —— 磁盘上有但 manifest 里没有（残留文件）。重新生成：pnpm pro:vendor`);
  }
}

// ---------- 2 & 3. 真的混淆过 / 无 sourcemap ----------

for (const [rel] of listed) {
  if (!rel.endsWith('.js')) continue;
  const file = resolve(VENDOR_DIR, rel);
  if (!existsSync(file)) continue; // 上面已经报过
  const text = readFileSync(file, 'utf8');

  if (!text.includes(OBFUSCATED_MARKER)) {
    problems.push(
      `${rel} —— 找不到混淆特征串「${OBFUSCATED_MARKER}」，这份产物很可能**没混淆过**。\n` +
        '      公开仓库里不该出现可读的付费产物。重新生成：pnpm pro:vendor',
    );
  }
  const lines = text.split('\n').length;
  if (lines > MAX_LINES) {
    problems.push(`${rel} —— ${lines} 行（混淆产物应为 1 行）。看起来没经过压缩/混淆`);
  }
  for (const marker of SOURCE_ONLY_MARKERS) {
    if (text.includes(marker)) {
      problems.push(`${rel} —— 含付费**源码**注释片段「${marker.slice(0, 18)}…」`);
      break;
    }
  }
  if (/sourceMappingURL=/.test(text)) {
    problems.push(`${rel} —— 含 sourceMappingURL`);
  }
  if (/virt-table-pro[\\/]packages[\\/][^"'\s]+[\\/]src[\\/]/.test(text)) {
    problems.push(`${rel} —— 含 pro 源码路径（说明这不是构建产物）`);
  }
}

// ---------- 4. 密钥有效期 ----------

const licFile = resolve(VENDOR_DIR, 'license.json');
let lic = null;
if (!existsSync(licFile)) {
  warnings.push(
    'license.json 不在 —— 文档站会回落到 pro-kit/demo-license.ts 里那把长期演示密钥。\n' +
      '   想用短期测试密钥：pnpm pro:vendor --key-only',
  );
} else {
  try {
    lic = JSON.parse(readFileSync(licFile, 'utf8'));
  } catch (err) {
    problems.push(`license.json 解析失败：${err.message}`);
  }
}

if (lic) {
  /*
   * 只比日期，**不解密钥串**。解析密钥需要与付费仓库同一份实现，而这个脚本一个 pro 文件
   * 都不引（见文件头）。`exp` 是签发时明文记进来的，与密钥 payload 里那个同源。
   */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lic.exp ?? '')) {
    problems.push(`license.json 的 exp 不是 YYYY-MM-DD："${lic.exp}"`);
  } else {
    // 与校验端一致：到期日当天 23:59:59.999 之前有效
    const end = new Date(`${lic.exp}T23:59:59.999Z`).getTime();
    const now = Date.now();
    /*
     * 「过期了没有」必须**直接比时间戳**，不能拿取整后的天数去判。
     *
     * 先前写的是 `Math.ceil((end - now) / 一天) < 0`：密钥昨天到期、现在只过了几个小时时，
     * 商是 -0.33，`Math.ceil` 得到 **-0**，而 `-0 < 0` 为 **false** —— 于是一把已经过期的
     * 密钥被报成「0 天后到期」，走的还是"即将到期"那条分支。实测踩到过。
     */
    if (now > end) {
      /*
       * **过期不判红。** 那把密钥缺省只签 7 天，而「过期之后会怎样」正是要在线上被看见的
       * 行为（未授权角标出现、功能一点不降级）。判红会让这条验证路径没法走完，
       * 也会让某天忘了重签的 CI 直接失败 —— 而那时站本身是好的。
       */
      const ago = Math.floor((now - end) / 86400_000);
      warnings.push(
        `演示密钥已于 ${lic.exp} 过期（${ago === 0 ? '就在今天' : `${ago} 天前`}）。\n` +
          '   线上表现：付费 demo 右下角出现未授权角标 + 一行 warn，**功能不降级**。\n' +
          '   这是预期中的验证信号；要恢复：pnpm pro:vendor --key-only',
      );
    } else {
      const left = Math.floor((end - now) / 86400_000);
      if (left <= 2) {
        warnings.push(
          `演示密钥还有 ${left} 天到期（${lic.exp}），之后线上会出现未授权角标。` +
            '续签：pnpm pro:vendor --key-only',
        );
      }
    }
  }
}

// ---------- 报告 ----------

if (problems.length > 0) {
  console.error(`\n✗ 入库的付费产物有问题（${problems.length} 处）：\n`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error(
    '\n这个目录是**自动生成**的，不要手工改。重新生成并提交：\n' +
      '  pnpm pro:vendor && git add docs/.pro-vendor\n' +
      '想构建一个不含付费能力的站：删掉 docs/.pro-vendor/，或 VT_PRO=off pnpm build:docs\n',
  );
  process.exit(1);
}

const pkgCount = (manifest.packages ?? []).length;
const bytes = [...listed.values()].reduce((n, f) => n + f.bytes, 0);
console.log(
  `✓ 入库的付费产物无异常：${pkgCount} 个包 / ${listed.size} 个文件 / ${(bytes / 1024).toFixed(0)} kB，` +
    `均已混淆且哈希一致${lic?.exp ? `，演示密钥到期 ${lic.exp}` : ''}`,
);
for (const w of warnings) console.warn(`\n⚠️  ${w}`);
