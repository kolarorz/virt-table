import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

/**
 * 付费插件（`@virt-table-pro/*`）怎么被解析 —— **文档站与三个微应用共用这一份**。
 *
 * 付费插件住在另一个**私有**仓库 `virt-table-pro`，而本仓库是公开的。两个约束同时成立：
 *   1. 任何人 clone 下来都要能 `pnpm install && pnpm dev && pnpm typecheck`；
 *   2. **公开产物里不能出现付费源码**。
 *
 * ## 两个阶段，两套优先级 —— 这是本文件最重要的一条
 *
 * | 阶段 | 可用档位 | 优先级 |
 * | --- | --- | --- |
 * | `dev`（`vite serve`） | `src` / `installed` / `vendor` / `off` | **src** > installed > vendor > off |
 * | `build`（`vite build`） | `installed` / `vendor` / `off` | **installed** > vendor > off，**`src` 根本不参与** |
 *
 * ## 四档分别服务谁
 *
 * | 档 | 谁 | 付费产物从哪来 |
 * | --- | --- | --- |
 * | `src` | 维护者本机 `pnpm dev` | 同级目录的付费仓库源码，有 HMR |
 * | `installed` | 维护者本机 `pnpm build:docs` | 现打的 tgz，铺进各 app 的 node_modules |
 * | `vendor` | **CI** | `docs/.pro-vendor/`，**入库**的混淆产物 |
 * | `off` | 外部贡献者 / fork | 桩 |
 *
 * `vendor` 档是为 CI 存在的：runner 上既没有付费仓库、也不该有 registry 凭据，而文档站
 * 又必须带着付费能力发出去。于是维护者本地跑一次 `pnpm pro:vendor` 把混淆产物提交进来，
 * CI 直接吃它 —— 不需要任何 secret，fork 也照样能构建（落 `off`）。
 *
 * 排在 `installed` **之后**：维护者本机两样都在时应当走 `installed`，因为那一档顺带验证了
 * 「客户装到的那组包真能用」（裸包名 + 包自己的 `exports` 解析）。vendor 档没有 `exports`
 * 可验（它刻意不带 `package.json`），验证价值更低，所以只在 `installed` 缺席时兜底。
 *
 * 为什么 `build` 阶段把 `src` 整个排除掉，而不是把它排在最后：
 * 维护者机器上 pro 源码**一直都在**，如果构建期也认 `src`，那么任何一次忘了铺 tgz 的
 * 构建都会把**付费源码打进公开产物** —— 而这件事没有任何外部症状，全靠
 * `scripts/check-pro-leak.mjs` 事后扫出来。把它做成结构上不可能，比做成「靠一道检查兜住」结实。
 *
 * 于是 `pnpm dev` 与 `pnpm build:docs` 各自吃对的东西，**不需要谁去设 `VT_PRO`**：
 *   - dev 自动吃 `../virt-table-pro` 的**源码**（改一行 pro 立刻热更新）；
 *   - `build:docs` 先把 pro 打成 tgz 铺进各 app 的 `node_modules`（`scripts/pro-tgz.mjs`），
 *     构建期于是落到 `installed` —— 走**裸包名 + 包自己的 `exports`**，与付费客户装完
 *     tgz 之后的解析路径完全一致。也就是说每次发布都顺带验了一遍「客户装到的那组包真能用」。
 *
 * ## 失败一律不炸
 *
 * 缺 pro 仓库、tgz 没铺上、`VT_PRO` 指了个不满足的档位 —— 全都只 `warn` + 退回 `off`
 * （表格照常跑，付费能力缺席，页面上有明确提示，见 `docs/apps/pro-kit/stubs/stub-notice.ts`
 * 与 `docs/.vitepress/theme/components/ProDemo.vue`）。
 *
 * 唯一的例外是 `strict`（`VT_PRO_STRICT=1`，`pnpm build:docs:strict` 用它）：那时缺东西
 * 直接抛。正式发布走那个入口 —— 「本该带付费能力却发成桩档」的站点是这条链路上最贵的
 * 一类事故，而它没有任何外部症状。
 */
export type ProMode = 'src' | 'installed' | 'vendor' | 'off';

/** 本仓库根 */
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** 付费仓库根。默认与本仓库同级；放别处用 `VT_PRO_DIR` 指过去（相对路径按 cwd 解析） */
export const PRO_DIR = process.env.VT_PRO_DIR
  ? resolve(process.cwd(), process.env.VT_PRO_DIR)
  : resolve(REPO_ROOT, '../virt-table-pro');

/** pro 包目录 */
const PRO_PKG_DIR = resolve(PRO_DIR, 'packages');

/**
 * 付费仓库的**源码**在不在。判据取 `license`：它是所有付费包的 peer，
 * 它在就代表整组都在（与 `installed` 那条判据同源）。
 */
export const proSrcPresent = (): boolean =>
  existsSync(resolve(PRO_PKG_DIR, 'license/src/index.ts'));

/** 某个 app 的 `node_modules` 里铺好离线包了没有 */
export const proInstalledIn = (appDir: string): boolean =>
  existsSync(resolve(appDir, 'node_modules/@virt-table-pro/license/package.json'));

// ─────────────────────────────────────────────────────────────────────────────
// vendor 档：入库的混淆产物
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 入库的付费产物目录。**这个目录是要提交进公开仓库的**，`.gitignore` 里有一段专门说明。
 *
 * 刻意放在 `docs/` 下且以点开头：
 *   - 不在 `docs/public/` 下 —— 那里的东西会被 VitePress **原样拷进站点**，
 *     等于把付费产物挂成可直接下载的静态文件；
 *   - 点开头 ⇒ VitePress 收集页面用的 fast-glob 默认不匹配点目录，不会把里面的
 *     `README.md` 收成一个文档页。
 */
const VENDOR_DIR = resolve(REPO_ROOT, 'docs/.pro-vendor');

interface VendorFile {
  path: string;
  bytes: number;
  sha256: string;
}
interface VendorManifest {
  packages: Array<{ name: string; version: string; files: VendorFile[] }>;
}
/** 密钥与 bundle **分两个文件**存，见 `scripts/pro-vendor.mjs` 头注（为了 git 体积） */
interface VendorLicense {
  key: string;
  exp: string;
  domains?: string[];
  sub?: string;
  generated?: string;
}

/** vite 会多次读配置，manifest 只解析一次 */
let vendorManifestCache: VendorManifest | null | undefined;

function readVendorManifest(): VendorManifest | null {
  if (vendorManifestCache !== undefined) return vendorManifestCache;
  const file = resolve(VENDOR_DIR, 'manifest.json');
  if (!existsSync(file)) return (vendorManifestCache = null);
  try {
    vendorManifestCache = JSON.parse(readFileSync(file, 'utf8')) as VendorManifest;
  } catch (err) {
    /*
     * manifest 坏了要**抛**而不是退回 off：这个目录是入库的，坏掉说明提交出了问题，
     * 静默落桩档会让 CI 发出一个没有付费能力的站，而那件事没有任何外部症状。
     */
    throw new Error(
      `${file} 解析失败：${(err as Error).message}\n` +
        '  它由 pnpm pro:vendor 生成并入库。删掉整个 docs/.pro-vendor/ 可退回 off 档。',
    );
  }
  return vendorManifestCache;
}

/** 入库的混淆产物在不在（判据取 manifest，与 `installed` 那条判据同源：取一个必然存在的文件） */
export const proVendorPresent = (): boolean => readVendorManifest() !== null;

/**
 * vendor 档随产物一起入库的**测试密钥**。
 *
 * 缺省只签 7 天 —— 它的用途就是让「密钥到期会怎样」这件事**在线上被真的看见**：
 * 过期之后站上会出现未授权角标而功能一点不降级，这正是要验证的行为。
 * 到期了重新签：`pnpm pro:vendor --key-only`。
 *
 * 拿不到就返回 null，调用方回落到 `pro-kit/demo-license.ts` 里那把 2099 长期演示密钥。
 */
export function proVendorLicense(): VendorLicense | null {
  const file = resolve(VENDOR_DIR, 'license.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as VendorLicense;
  } catch {
    // 密钥文件坏了不该拦住构建：回落到长期演示密钥，站照常发
    console.warn(`⚠️  ${file} 解析失败 —— 回落到文档站的长期演示密钥。`);
    return null;
  }
}

export interface ResolveOptions {
  /** 该 app 的目录（`installed` 是**逐 app** 的：每个 app 有自己的 node_modules） */
  appDir: string;
  /** `vite serve` → 'dev'；`vite build` → 'build'。见文件头那张表 */
  phase: 'dev' | 'build';
  /** 缺东西时抛而不是退回 `off`。默认读 `VT_PRO_STRICT` */
  strict?: boolean;
  /** 打日志时用的名字，如 `vanilla demo` / `docs` */
  label?: string;
}

/** 记一下已经报过的组合，免得 vite 多次读配置时刷屏 */
const warned = new Set<string>();

function complain(msg: string, strict: boolean, key: string): void {
  if (strict) throw new Error(msg);
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`⚠️  ${msg}`);
}

export function resolveProMode(opts: ResolveOptions): ProMode {
  const { appDir, phase, label = 'app' } = opts;
  const strict = opts.strict ?? process.env.VT_PRO_STRICT === '1';
  const forced = process.env.VT_PRO;
  const hasSrc = proSrcPresent();
  const hasInstalled = proInstalledIn(appDir);
  const hasVendor = proVendorPresent();

  if (forced) {
    if (forced !== 'src' && forced !== 'installed' && forced !== 'vendor' && forced !== 'off') {
      complain(
        `VT_PRO 只接受 src / installed / vendor / off，收到 "${forced}" —— 按 off 处理。`,
        strict,
        `bad:${forced}`,
      );
      return 'off';
    }
    if (forced === 'off') return 'off';
    if (forced === 'src' && phase === 'build') {
      // 见文件头：构建期吃源码 = 把付费源码发出去
      complain(
        `VT_PRO=src 在构建期不被接受（公开产物不允许含付费源码）—— 退回 off。\n` +
          '  想让产物带上付费能力：pnpm build:docs（它会自动把 pro 打成 tgz 铺进 node_modules）。',
        strict,
        `src-in-build:${label}`,
      );
      return 'off';
    }
    if (forced === 'src' && !hasSrc) {
      complain(
        `VT_PRO=src 但找不到付费仓库源码：${resolve(PRO_PKG_DIR, 'license/src/index.ts')}\n` +
          '  把 virt-table-pro clone 到同级目录，或用 VT_PRO_DIR 指过去 —— 退回 off。',
        strict,
        `no-src:${label}`,
      );
      return 'off';
    }
    if (forced === 'installed' && !hasInstalled) {
      complain(
        `VT_PRO=installed 但 ${appDir}/node_modules/@virt-table-pro 里没有包 —— 退回 off。\n` +
          '  先跑 node scripts/pro-tgz.mjs（或直接 pnpm build:docs）。',
        strict,
        `no-installed:${label}`,
      );
      return 'off';
    }
    if (forced === 'vendor' && !hasVendor) {
      complain(
        'VT_PRO=vendor 但 docs/.pro-vendor/manifest.json 不在 —— 退回 off。\n' +
          '  那批产物由 pnpm pro:vendor 生成并**入库**；外部贡献者的 checkout 里本就没有。',
        strict,
        `no-vendor:${label}`,
      );
      return 'off';
    }
    return forced;
  }

  if (phase === 'dev') {
    if (hasSrc) return 'src';
    if (hasInstalled) return 'installed';
    if (hasVendor) return 'vendor';
    return 'off';
  }

  // build 阶段：src 不参与
  if (hasInstalled) return 'installed';
  if (hasVendor) return 'vendor';
  if (hasSrc) {
    complain(
      `构建期发现付费仓库源码，但 ${appDir} 没有铺离线包、也没有入库的 vendor 产物 —— ` +
        '退回 off（公开产物不吃源码）。\n' +
        '  想让这次产物带上付费能力：pnpm build:docs（本机打 tgz），' +
        '或 pnpm pro:vendor（打一份入库产物给 CI 用）。',
      strict,
      `build-no-tgz:${label}`,
    );
  }
  return 'off';
}

/** 把档位打进日志。缺了这一行，「这次到底有没有带上付费能力」只能等站点发出去靠肉眼发现 */
export function logProMode(label: string, mode: ProMode): void {
  let tail: string;
  if (mode === 'off') tail = '（解析到桩，没有付费能力）';
  else if (mode === 'src') tail = '（吃付费仓库源码，有 HMR）';
  else if (mode === 'installed') tail = '（吃离线包，与客户装到的字节一致）';
  else {
    /*
     * vendor 档把**密钥到期日**一起打出来。那把密钥缺省只有 7 天，过期之后站上会长出
     * 未授权角标 —— 「这次发出去的站带的密钥哪天过期」值得在构建日志里一眼看见，
     * 否则只能等角标出现在线上才发现。
     */
    const lic = proVendorLicense();
    tail = lic
      ? `（吃入库的混淆产物，密钥到期 ${lic.exp}）`
      : '（吃入库的混淆产物，未随带密钥 → 回落长期演示密钥）';
  }
  console.log(`[${label}] 付费插件档位：${mode}${tail}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// alias
// ─────────────────────────────────────────────────────────────────────────────

export interface Alias {
  find: RegExp;
  replacement: string;
}

/** 桩目录（三端共用，见 `docs/apps/pro-kit/`） */
const STUB_DIR = resolve(REPO_ROOT, 'docs/apps/pro-kit/stubs');

/** pro 各包名（扫 `packages/` 而不是手写清单：新增包时少一处要改的地方） */
function proPackageNames(): string[] {
  if (!existsSync(PRO_PKG_DIR)) return [];
  return readdirSync(PRO_PKG_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(PRO_PKG_DIR, e.name, 'src/index.ts')))
    .map((e) => e.name);
}

/**
 * 某个包的源码 CSS 文件。
 *
 * **不能靠命名约定**：包导出的子路径一律是 `./index.css`（dist 里 vite 就叫这个名），
 * 而源码文件名各写各的 —— `views/src/views.css`、`gantt/src/gantt.css`，但 `formula`
 * 那份叫 **`cell.css`**。按 `<包名>.css` 猜会在 formula 上静默失败（CSS 引不到、
 * 公式格的样式全丢，而构建不报错）。所以扫目录。
 *
 * 恰好一个 → 用它；一个都没有（`undo` 就没有 CSS）→ 空字符串，由调用方指到空文件；
 * 多于一个 → 抛，要求显式登记（真出现了说明包的形态变了，猜哪个都不对）。
 */
function proSrcCss(pkgName: string): string {
  const dir = resolve(PRO_PKG_DIR, pkgName, 'src');
  const found = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.css'))
    : [];
  if (found.length === 0) return '';
  if (found.length > 1) {
    throw new Error(
      `[pro-mode] ${pkgName} 的 src/ 下有 ${found.length} 个 CSS（${found.join(', ')}），` +
        '无法判断 ./index.css 对应哪一个。请在 build/pro-mode.ts 里显式登记。',
    );
  }
  return resolve(dir, found[0]);
}

/**
 * `src` 档的 alias：`@virt-table-pro/*` → 付费仓库的**源码**。
 *
 * **必须用数组 + 正则**，不能用对象：对象形式是**前缀**匹配，
 * `@virt-table-pro/gantt/time` 会被拼成 `.../src/index.ts/time`。
 *
 * 顺序是「CSS → 其它子路径 → 裸包名」：vite 首个命中即用，保持「具体 → 通用」。
 */
export function proSrcAlias(): Alias[] {
  const empty = resolve(STUB_DIR, 'empty.css');
  return proPackageNames().flatMap((name) => {
    const pkgSrc = resolve(PRO_PKG_DIR, name, 'src');
    const css = proSrcCss(name);
    return [
      // `@virt-table-pro/views/index.css` → `packages/views/src/views.css`
      // demo 里那几行 CSS import 是**照客户真实用法写的**（dist 的 JS 不带 CSS），
      // 两种档位下都必须解析得到，所以 src 档也要有这一条。
      {
        find: new RegExp(`^@virt-table-pro/${name}/(.+\\.css)$`),
        replacement: css || empty,
      },
      // `@virt-table-pro/gantt/time` → `packages/gantt/src/time.ts`
      { find: new RegExp(`^@virt-table-pro/${name}/(.+)$`), replacement: `${pkgSrc}/$1.ts` },
      { find: new RegExp(`^@virt-table-pro/${name}$`), replacement: resolve(pkgSrc, 'index.ts') },
    ];
  });
}

/**
 * `vendor` 档的 alias：`@virt-table-pro/*` → `docs/.pro-vendor/` 里**入库的混淆产物**。
 *
 * 形状与 `proSrcAlias()` 一模一样（CSS → 其它子路径 → 裸包名，具体到通用），
 * 只是替换目标换成 vendor 目录。**同样必须用数组 + 正则**：对象形式是前缀匹配，
 * `@virt-table-pro/gantt/time` 会被拼成 `.../index.js/time`。
 *
 * ## 为什么这一档需要 alias，而 `installed` 档一条都不加
 *
 * vendor 产物**刻意不带 `package.json`**（见付费仓库 `scripts/lib/vendor.mjs` 头注：
 * 让这批入库到公开仓库的字节尽量不能被拿去当包用）。没有 manifest 就没有 `exports`
 * 映射，vite 的裸包名解析无从下手，所以必须由 alias 把每条子路径显式指到文件。
 *
 * 包清单取自 **manifest**（不是 `readdirSync`）：manifest 是 `pnpm pro:vendor` 写的
 * 唯一权威，少拷了一个包时这里就不会给它 alias，于是那个包解析失败 —— 是**响的**失败。
 * 靠扫目录的话，一个空目录会被当成"包在"，症状变成运行时 undefined。
 */
export function proVendorAlias(): Alias[] {
  const manifest = readVendorManifest();
  if (!manifest) return [];
  const empty = resolve(STUB_DIR, 'empty.css');

  return manifest.packages.flatMap((pkg) => {
    const short = pkg.name.replace('@virt-table-pro/', '');
    const dir = resolve(VENDOR_DIR, short);
    // CSS 未必有（`undo` 就没有）。没有就指到空文件 —— demo 里那几行 CSS import 是
    // 照客户真实用法写的，不能因为这个包没 CSS 就从源码里消失
    const hasCss = pkg.files.some((f) => f.path === `${short}/index.css`);
    return [
      {
        find: new RegExp(`^@virt-table-pro/${short}/(.+\\.css)$`),
        replacement: hasCss ? resolve(dir, 'index.css') : empty,
      },
      // `@virt-table-pro/floating-image/geometry` → `<vendor>/floating-image/geometry.js`
      { find: new RegExp(`^@virt-table-pro/${short}/(.+)$`), replacement: `${dir}/$1.js` },
      { find: new RegExp(`^@virt-table-pro/${short}$`), replacement: resolve(dir, 'index.js') },
    ];
  });
}

/**
 * `off` 档的 alias：全部指到桩。
 *
 * CSS 指到一个空文件而不是删掉那几行 import —— 那几行是照客户用法写的，
 * 不能因为本次构建没有 pro 就从 demo 源码里消失。
 */
export function proStubAlias(): Alias[] {
  return [
    { find: /^@virt-table-pro\/([^/]+)\/(.+\.css)$/, replacement: resolve(STUB_DIR, 'empty.css') },
    { find: /^@virt-table-pro\/([^/]+)$/, replacement: resolve(STUB_DIR, '$1.ts') },
  ];
}

/**
 * 按档位给出 `@virt-table-pro/*` 的 alias。
 *
 * `installed` 档**一条都不加**：那时候包就在 `node_modules` 里，让 vite 走正常的裸包名
 * 解析 —— 顺带把包自己的 `exports` 映射（含 `./index.css`、`./time` 这类子路径）一起验了。
 * alias 会把 `exports` 整个绕过去，而那正是这一档要覆盖的东西。
 */
export function proAliasFor(mode: ProMode): Alias[] {
  if (mode === 'installed') return [];
  if (mode === 'src') return proSrcAlias();
  if (mode === 'vendor') return proVendorAlias();
  return proStubAlias();
}

/**
 * `src` 档要放开的 dev server 读取范围。
 *
 * pro 仓库在 workspace 根之外，不放开就是一串 403。只放开 `packages/` 而不是整个仓库根：
 * dev server 能读到什么浏览器就能拉到什么，没理由让它够得着 pro 的 `release/` 与脚本。
 *
 * ⚠️ 调用方注意：`fs.allow` 传空数组**不等于**「用默认」，那会把允许列表整个清空，
 * 连本仓库的源码都读不到。所以只在 `src` 档写这个字段。
 */
export function proFsAllow(): string[] {
  return [REPO_ROOT, PRO_PKG_DIR];
}
