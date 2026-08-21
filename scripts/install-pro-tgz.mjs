#!/usr/bin/env node
/**
 * 把付费包的**离线 tgz** 铺进三个 demo app 的 `node_modules`，让文档站构建吃到付费能力。
 *
 *   node scripts/install-pro-tgz.mjs                    # 默认从 ../virt-table-pro/release 取
 *   node scripts/install-pro-tgz.mjs <放 tgz 的目录>
 *
 * 也可以被 import（`scripts/pro-tgz.mjs` 就这么用）：
 *
 *   import { installProTgz } from './install-pro-tgz.mjs';
 *   const { installed } = installProTgz({ from: '/path/to/tgz' });
 *
 * tgz 由付费仓库的 `pnpm pack:release` 产出。跑完这一步再构建，`vite.config.ts` 会自动
 * 落到 `installed` 档（判据就是这个目录在不在），于是 `@virt-table-pro/*` 走**裸包名 +
 * 真实 exports 解析**，与付费客户装完 tgz 之后的解析路径完全一致。
 *
 * ## 为什么是「解压铺目录」而不是 `npm install`
 *
 * 本仓库是 pnpm workspace，`node_modules` 是符号链接结构。往里 `npm install` 有两个问题：
 *
 * 1. **写进 `package.json` 就完了** —— 公开仓库一旦声明 `@virt-table-pro/*` 依赖，
 *    外部贡献者的 `pnpm install` 立刻 404。`--no-save` 能躲开，但还剩第 2 条；
 * 2. 混用两个包管理器去动同一个 `node_modules`，出问题时极难查。
 *
 * 纯 `tar` 解压没有这两条：不碰任何 manifest、不碰 lockfile、不碰 pnpm 的链接结构，
 * 只是多出几个真实目录。peer 依赖也自然满足 —— `@virt-table/vanilla` 由 vite 的 alias
 * 指向本仓库源码，`@virt-table-pro/license` 就在同一个目录里。
 *
 * ⚠️ 这些目录不受 pnpm 管理：**跑过 `pnpm install` 之后要重新跑一次本脚本**。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCOPE = '@virt-table-pro/';

/**
 * 三端都要铺。
 *
 * 原来只铺 vanilla（那时只有它消费付费包）。现在三端都有付费插件 demo —— 付费插件本身
 * 与框架无关，但「能用」只有真的在那一端跑起来才算数，所以三端各要一份。
 * `installed` 档的判据是**逐 app** 的（每个 app 有自己的 node_modules），漏一个
 * 那一端就静默落回桩档。
 */
const APPS = ['vanilla', 'react', 'vue'];

/** 从 tarball 里直接读 manifest，不落地 —— 包名要由包自己说，不靠文件名猜 */
function manifestOf(tgz) {
  const json = execFileSync('tar', ['-xzOf', tgz, 'package/package.json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(json);
}

/**
 * 把 `from` 目录里的付费 tgz 铺进各 app 的 `node_modules/@virt-table-pro/`。
 *
 * 出错就抛（调用方决定是退回桩档还是让构建红）。返回铺了什么、跳过了什么。
 */
export function installProTgz({ from, apps = APPS } = {}) {
  if (!from) throw new Error('installProTgz 需要 from（放 tgz 的目录）');
  if (!existsSync(from)) throw new Error(`找不到目录：${from}`);

  const tgzs = readdirSync(from)
    .filter((f) => f.endsWith('.tgz'))
    .map((f) => resolve(from, f));
  if (tgzs.length === 0) throw new Error(`${from} 里没有 .tgz`);

  /*
   * 先把 manifest 全读出来再铺。这样「一个付费包都没有」这种情况在**动手之前**就发现，
   * 不会留下几个 app 铺了、几个没铺的半成品状态 —— 那种状态下各端档位会不一致，
   * 表现是「Vue 页有付费能力、React 页没有」，极难查。
   */
  const entries = [];
  const ignored = [];
  for (const tgz of tgzs) {
    const m = manifestOf(tgz);
    /*
     * 只铺付费包。交付用的 release 目录里还有 `@virt-table/vanilla` 的 tgz（客户要装），
     * 但本仓库的核心走**源码 alias**，把它铺进 node_modules 只会制造「到底解析到哪一份」
     * 的疑问 —— 而两份 VirtTable 实例正是 AGENTS.md 反复警告的那类事故。
     */
    if (!m.name.startsWith(SCOPE)) ignored.push(m.name);
    else entries.push({ tgz, name: m.name, version: m.version });
  }
  if (entries.length === 0) throw new Error(`${from} 里没有 ${SCOPE}* 的包`);

  const dests = [];
  for (const app of apps) {
    const dest = resolve(ROOT, `docs/apps/${app}/node_modules/@virt-table-pro`);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    for (const e of entries) {
      const dir = resolve(dest, e.name.slice(SCOPE.length));
      mkdirSync(dir, { recursive: true });
      // tarball 内的顶层目录固定是 `package/`，剥掉它
      execFileSync('tar', ['-xzf', e.tgz, '-C', dir, '--strip-components=1'], { stdio: 'inherit' });
    }
    dests.push(dest);
  }

  return {
    installed: entries.map((e) => `${e.name}@${e.version}`),
    ignored,
    dests,
    apps,
  };
}

export function reportInstall({ installed, ignored, apps }) {
  console.log(
    `\x1b[32m✓ 铺好 ${installed.length} 个付费包\x1b[0m × ${apps.length} 端（${apps.join(' / ')}）`,
  );
  for (const n of installed) console.log(`  ${n}`);
  if (ignored.length > 0) {
    console.log(`  \x1b[33m跳过（非付费 scope，本仓库走源码 alias）\x1b[0m：${ignored.join(', ')}`);
  }
  console.log('\n  接着构建即可，vite 会自动落到 `installed` 档（构建日志里会打印）。');
  console.log('  \x1b[33m注意\x1b[0m：pnpm install 会清掉这些目录，之后要重新跑一次。');
}

/* ---------- 直接跑（不是被 import）时的 CLI ---------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const fromArg = process.argv[2] ?? process.env.VT_PRO_TGZ_DIR;
  const from = fromArg
    ? resolve(process.cwd(), fromArg)
    : fileURLToPath(new URL('../../virt-table-pro/release', import.meta.url));
  try {
    reportInstall(installProTgz({ from }));
  } catch (err) {
    console.error(
      `[install-pro-tgz] ${err.message}\n` +
        '  付费仓库里跑 `pnpm pack:release` 产出 release/，或把目录作为第一个参数传进来。\n' +
        '  想让文档站构建自动完成这一步：pnpm build:docs（它会调 scripts/pro-tgz.mjs）。',
    );
    process.exit(1);
  }
}
