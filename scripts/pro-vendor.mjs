#!/usr/bin/env node
/**
 * 打一份**入库**的付费产物（`docs/.pro-vendor/`），给 **CI** 用。
 *
 *   pnpm pro:vendor                  # 重打 bundle + 重签 7 天测试密钥
 *   pnpm pro:vendor --key-only       # 只重签密钥，bundle 一个字节都不动
 *   pnpm pro:vendor --days 30 --domains example.com,foo.io
 *
 * 跑完记得 **git add docs/.pro-vendor**（不入库等于没做）。
 *
 * ## 为什么要有这一档
 *
 * CI 的 runner 上没有私有仓库 `virt-table-pro`，也不该有 registry 凭据。在这一档出现之前，
 * `.github/workflows/static.yml` 发出来的站必然是**桩档**：每个付费插件的 demo 位都是一张
 * 说明卡。那个 workflow 的头注把这件事写成了「已知且接受，每次 push 后手动重发一次」——
 * 而「手动重发」是那种一定会忘的事。
 *
 * 现在维护者本地跑一次本脚本、把产物提交进来，CI 直接吃它。**不需要任何 secret**，
 * fork 与外部贡献者的 checkout 里没有这个目录，照旧落 `off` 档，构建仍然全绿。
 *
 * ## 产物形态：刻意不是一个能用的 npm 包
 *
 * 这批字节要提交进**公开**仓库，所以只给「能被 vite 打进浏览器 bundle」所需的最少东西：
 * 混淆后的 ESM + CSS，**没有** `package.json` / `.d.ts` / `.cjs`。
 * 完整理由见付费仓库 `scripts/lib/vendor.mjs` 的头注。
 *
 * ⚠️ 混淆是**门槛不是边界**。字节进了公开 git 历史就是永久可取的，决心足够的人能还原出
 * 可用逻辑。真正的边界是 EULA，加上下面那把 7 天就过期的测试密钥。
 *
 * ## 密钥为什么单独一个文件、且只签 7 天
 *
 * 7 天是刻意的：短期内要靠它**在线上真的看见**「密钥到期会怎样」——
 * 过期后站上出现未授权角标而功能一点不降级，这正是要验证的行为。
 *
 * 于此密钥大约每周要重签一次，而混淆产物是高熵字节（不可压缩、无法 delta）。
 * 两者放同一个文件的话，每次重签都往公开仓库的 git 历史里塞一整份新 blob，跑一年几十 MB。
 * 拆成 `license.json` 之后 `--key-only` 只动几百字节。
 *
 * 与之配套的另一半在混淆器里：seed 取输入内容的哈希，pro 代码没变则输出**逐字节相同**，
 * 于是重复跑本脚本不产生任何 diff。改那边之前先读 `scripts/lib/obfuscate.mjs` 的头注。
 *
 * **密钥刻意不记 `licenses.jsonl`**：台账的用处是照着它催续费，混进一把从没发给任何人的
 * 7 天测试密钥就等于污染它 —— 与 `issue-license.mjs` 的 `--dry-run` 不记账同一条理由。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VENDOR_DIR = resolve(ROOT, 'docs/.pro-vendor');

/**
 * 付费仓库根。与 `build/pro-mode.ts` 的 `PRO_DIR`、`scripts/pro-tgz.mjs` 的同名常量
 * **必须一致** —— 读同一个环境变量、同一个默认值。
 */
const PRO_DIR = process.env.VT_PRO_DIR
  ? resolve(process.cwd(), process.env.VT_PRO_DIR)
  : resolve(ROOT, '../virt-table-pro');

/**
 * 演示密钥绑定的域名。与 `docs/apps/pro-kit/demo-license.ts` 里那把长期密钥同一组
 * （`localhost` 一类开发域名由校验端本身放行，不用写进来）。
 */
const DEFAULT_DOMAINS = 'keno-lee.github.io,kolarorz.github.io';
/** 见文件头：短是刻意的 */
const DEFAULT_DAYS = 7;

/*
 * 自己解析参数而不用付费仓库的 `parseArgs`：那个是 `--k v` **成对**（stride 2）解析的，
 * 留一个孤立的布尔开关（`--key-only`）在里面，它后面那个参数会被静默当成它的值吃掉。
 */
const argv = process.argv.slice(2);
const keyOnly = argv.includes('--key-only');
function arg(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) {
    console.error(`✗ --${name} 后面缺值`);
    process.exit(1);
  }
  return v;
}

const days = Number(arg('days', String(DEFAULT_DAYS)));
if (!Number.isInteger(days)) {
  console.error(`✗ --days 需为整数，收到 "${arg('days', '')}"`);
  process.exit(1);
}
const domains = arg('domains', DEFAULT_DOMAINS);

/**
 * 缺付费仓库时**直接报错退出**，不像 `scripts/pro-tgz.mjs` 那样 warn 后放过。
 *
 * 那个脚本跑在 `build:docs` 链条里，外部贡献者也会碰到，所以必须软失败。
 * 本脚本只有维护者会手动跑，且唯一目的就是产出付费产物 —— 悄悄产出个空目录毫无意义。
 */
function die(msg, hint) {
  console.error(`\x1b[31m✗ [pro-vendor] ${msg}\x1b[0m`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

if (!existsSync(resolve(PRO_DIR, 'package.json'))) {
  die(
    `没有找到付费仓库：${PRO_DIR}`,
    '把 virt-table-pro clone 到同级目录，或用 VT_PRO_DIR 指过去。外部贡献者不需要跑这个脚本。',
  );
}

/** 跨仓库 import 付费仓库的工具库（与 `scripts/pro-tgz.mjs` 复用 `lib/pack.mjs` 同一个套路） */
async function proLib(rel, what) {
  const file = resolve(PRO_DIR, rel);
  if (!existsSync(file)) die(`付费仓库里没有 ${file}`, `它是本脚本用来${what}的工具库；付费仓库版本过旧时会缺。`);
  return import(pathToFileURL(file).href);
}

const { buildPayload, signLicense } = await proLib('scripts/lib/license.mjs', '签密钥');

// ---------- 1. 密钥 ----------

/*
 * 先签密钥再打包。签发的参数校验（日期格式一类）很便宜，而打包要跑一整轮 pnpm build ——
 * 参数写错的话，让它在花几十秒之前就报出来。
 */
const exp = new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
let payload;
try {
  payload = buildPayload({
    sub: 'virt-table 文档站 · CI 测试密钥',
    // `'*'` 而不是列举：以后加新付费插件时不用重签。授权面变大不构成风险 —— 它绑死了域名
    products: '*',
    exp,
    domains,
  });
} catch (e) {
  die(e.message, '参数见本文件头注。');
}
const key = signLicense(payload);

// ---------- 2. bundle ----------

if (keyOnly) {
  if (!existsSync(resolve(VENDOR_DIR, 'manifest.json'))) {
    die(
      '--key-only 但 docs/.pro-vendor/manifest.json 不在',
      '还没打过 bundle。先跑一次不带 --key-only 的 pnpm pro:vendor。',
    );
  }
  console.log('\x1b[33m--key-only\x1b[0m：只重签密钥，bundle 保持原样（不产生 git diff）');
} else {
  const { buildVendorBundles } = await proLib('scripts/lib/vendor.mjs', '打混淆产物');

  let result;
  try {
    result = buildVendorBundles({ destDir: VENDOR_DIR, proRoot: PRO_DIR });
  } catch (err) {
    die(`打包失败：${err.message}`, '上面应该有 pnpm build / 混淆器的原始输出。');
  }

  const { packages, skipped } = result;
  const totalBytes = packages.reduce((n, p) => n + p.files.reduce((m, f) => m + f.bytes, 0), 0);

  writeFileSync(
    resolve(VENDOR_DIR, 'manifest.json'),
    /*
     * **刻意不写生成时间戳。** 写了的话，pro 代码明明没变、只是换了一天重跑一次，
     * manifest 就会产生 diff —— 而 seed 决定性存在的全部意义就是消掉这类噪音
     * （这个目录入库到公开仓库，每条无意义的 diff 都是永久的）。
     *
     * 「这份产物什么时候打的」git 记得比时间戳准：`git log -1 docs/.pro-vendor`。
     */
    `${JSON.stringify({ packages }, null, 2)}\n`,
  );
  writeFileSync(resolve(VENDOR_DIR, 'README.md'), readmeText());

  console.log(
    `\n\x1b[32m✓ 混淆产物就绪\x1b[0m ${packages.length} 个付费包，` +
      `${(totalBytes / 1024).toFixed(0)} kB → docs/.pro-vendor/`,
  );
  for (const p of packages) console.log(`  ${p.name}@${p.version}（${p.files.length} 个文件）`);
  if (skipped.length > 0) {
    console.log(`  \x1b[33m未包含（private，尚未实现）\x1b[0m：${skipped.join(', ')}`);
  }
}

// ---------- 3. 写密钥 ----------

mkdirSync(VENDOR_DIR, { recursive: true });
writeFileSync(
  resolve(VENDOR_DIR, 'license.json'),
  `${JSON.stringify({ key, exp: payload.exp, domains: payload.domains, sub: payload.sub, generated: payload.iat }, null, 2)}\n`,
);

console.log(`\n\x1b[32m✓ 测试密钥已签\x1b[0m 到期 ${payload.exp}（${days} 天）`);
console.log(`  域名：${payload.domains.join(' / ')}（localhost 一类开发域名由校验端放行）`);
console.log('  \x1b[33m未记入 licenses.jsonl\x1b[0m —— 它不是交付给任何人的密钥，见本文件头注');
console.log('\n  下一步：\x1b[36mgit add docs/.pro-vendor\x1b[0m —— 不入库 CI 就吃不到');
console.log('  本地验一遍：VT_PRO=vendor pnpm build:docs && pnpm preview');

/** vendor 目录里那份说明。跟着产物一起入库，让偶然点进去的人不用翻脚本就知道这是什么 */
function readmeText() {
  return `# docs/.pro-vendor —— 入库的付费产物（给 CI 用）

**这个目录是自动生成的，不要手工改。** 由 \`pnpm pro:vendor\` 产出（脚本在
\`scripts/pro-vendor.mjs\`，那里的头注写了全部来由）。

## 这是什么

付费插件（\`@virt-table-pro/*\`）住在另一个**私有**仓库。CI 的 runner 上没有那个仓库，
所以文档站在 CI 里本来只能发成**桩档**（每个付费 demo 位是一张说明卡）。

这里放的是**混淆后的付费产物**：维护者本地生成、提交进来，CI 直接吃。
于是 push 出去的站带着完整付费能力，且**不需要任何 secret**。

fork 与外部贡献者的 checkout 里如果没有这个目录，构建照旧落 \`off\` 档、全绿。

## 里面是什么

| | |
| --- | --- |
| \`<包名>/*.js\` | 混淆后的 ESM 产物 |
| \`<包名>/index.css\` | 样式，原样拷贝（类名是契约，不混淆） |
| \`manifest.json\` | 包 / 版本 / 文件清单 / 逐文件 sha256 |
| \`license.json\` | 演示用测试密钥（**缺省只有 7 天**） |

**没有** \`package.json\` / \`.d.ts\` / \`.cjs\` —— 刻意的，见 \`scripts/pro-vendor.mjs\` 头注。
类型始终来自 \`docs/apps/pro-kit/stubs/\`，与档位无关。

## 密钥过期了怎么办

站上会出现未授权角标，**功能一点不降级**（这正是要验证的行为）。重签：

\`\`\`bash
pnpm pro:vendor --key-only     # 只动 license.json，bundle 不变
git add docs/.pro-vendor
\`\`\`

## pro 代码改了怎么办

\`\`\`bash
pnpm pro:vendor                # 重打 bundle + 重签密钥
git add docs/.pro-vendor
\`\`\`

pro 代码没变时重复跑**不会产生 diff**（混淆 seed 取内容哈希）。真出现了 diff，
说明 pro 那边的产物确实变了。

## 自检

\`\`\`bash
pnpm verify:pro-vendor         # 清单完整性 + 混淆特征 + 密钥有效期
\`\`\`
`;
}
