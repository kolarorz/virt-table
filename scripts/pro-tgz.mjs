#!/usr/bin/env node
/**
 * 把付费插件打成 **tgz** 并铺进三个 demo app —— 文档站发布链路的第一步。
 *
 *   node scripts/pro-tgz.mjs            # pnpm build:docs 会自动调它
 *   node scripts/pro-tgz.mjs --strict   # 缺东西就让构建红（正式发布用）
 *
 * ## 为什么发布要走 tgz，而不是像 dev 那样吃源码
 *
 * 两件事一次做到：
 *
 * 1. **公开产物里不能出现付费源码。** 走 tgz 之后产物里只有 `dist`（已压缩、注释已剥、
 *    无 sourcemap），与付费客户装到的字节完全一致 —— 这不是靠约定，是构造上如此。
 *    `build/pro-mode.ts` 在构建期**根本不认 `src` 档**，同一条边界的另一半。
 * 2. **顺带验了客户的真实安装路径。** 铺进 `node_modules` 之后 vite 走**裸包名 + 包自己的
 *    `exports` 映射**（含 `./index.css` / `./time` 这类子路径），与客户 `npm i` 完全同路。
 *    也就是说每次发布都在回答「客户装到的那组包真能用吗」。
 *
 * ## 为什么不调付费仓库的 `pnpm pack:release`
 *
 * 那个脚本是**客户交付**用的：输出目录硬编码 `release/`、每次先 `rmSync` 清空，还会生成
 * `INSTALL.md` 与密钥文件。文档站构建去调它等于每次都清掉客户交付目录。
 * 所以这里直接复用它底下那层纯工具库 `scripts/lib/pack.mjs`（`destDir` 是参数），
 * 两条链路吃的仍是**同一份打包逻辑**，不存在第二份。
 *
 * ## 失败一律不炸
 *
 * 没有付费仓库、build 失败、pack 失败 —— 都只打印说明并 `exit 0`，各 app 于是落到 `off`
 * 档（表格照常跑、页面上明说「付费能力未加载」）。`--strict` 时才非零退出：
 * 「本该带付费能力却发成桩档」的站点没有任何外部症状，正式发布要走那个入口。
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { installProTgz, reportInstall } from './install-pro-tgz.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * 付费仓库根。与 `build/pro-mode.ts` 的 `PRO_DIR` **必须一致** ——
 * 那边是 vite/vitepress（TS）在用，这里是 node 脚本，读同一个环境变量、同一个默认值。
 */
const PRO_DIR = process.env.VT_PRO_DIR
  ? resolve(process.cwd(), process.env.VT_PRO_DIR)
  : resolve(ROOT, '../virt-table-pro');

/** tgz 落这儿。gitignore，且刻意**不叫** release/（那是付费仓库给客户交付用的名字） */
const TGZ_DIR = resolve(ROOT, '.pro-tgz');

const strict = process.argv.includes('--strict') || process.env.VT_PRO_STRICT === '1';

/** 退场：strict 时红，否则说清楚然后放过 */
function bail(msg, hint) {
  const full = `${msg}${hint ? `\n  ${hint}` : ''}`;
  if (strict) {
    console.error(`\x1b[31m✗ [pro-tgz] ${full}\x1b[0m`);
    process.exit(1);
  }
  console.warn(`\x1b[33m⚠️  [pro-tgz] ${full}\x1b[0m`);
  console.warn('  本次构建将不含付费能力（各 app 落到 off 档，页面上会明说）。');
  process.exit(0);
}

if (!existsSync(resolve(PRO_DIR, 'package.json'))) {
  bail(
    `没有找到付费仓库：${PRO_DIR}`,
    '把 virt-table-pro clone 到同级目录，或用 VT_PRO_DIR 指过去。外部贡献者不需要它。',
  );
}

const PACK_LIB = resolve(PRO_DIR, 'scripts/lib/pack.mjs');
if (!existsSync(PACK_LIB)) {
  bail(
    `付费仓库里没有 ${PACK_LIB}`,
    '它是本脚本复用的打包工具库；付费仓库版本过旧时会缺。',
  );
}

let result;
try {
  const { listPackages, packDir, run, step } = await import(pathToFileURL(PACK_LIB).href);

  const pkgs = listPackages(resolve(PRO_DIR, 'packages')).filter((p) => !p.private);
  if (pkgs.length === 0) bail('付费仓库里没有可发布的包（全是 private 占位包）');

  rmSync(TGZ_DIR, { recursive: true, force: true });
  mkdirSync(TGZ_DIR, { recursive: true });

  step(`构建并打包 ${pkgs.length} 个付费包 → ${TGZ_DIR}`);
  for (const p of pkgs) {
    /*
     * 先 build 再 pack：`packDir` 只做 `npm pack`，不构建。
     * 各包的 build 里会先跑 `ensure-core-dist.mjs`（付费仓库的脚本）确保核心 dist 在 ——
     * 它们的 `tsconfig.build.json` 要引核心 dist 的 d.ts。
     */
    run('pnpm', ['-C', p.dir, 'build']);
    packDir(p.dir, TGZ_DIR);
    console.log(`  ✓ ${p.name}@${p.version}`);
  }

  result = installProTgz({ from: TGZ_DIR });
} catch (err) {
  bail(`打包或铺包失败：${err.message}`, '上面应该有 pnpm / npm pack 的原始输出。');
}

reportInstall(result);
