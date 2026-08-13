/**
 * 给 `emitDeclarationOnly` 产出的每个 `*.d.ts` 复制一份同名 `*.d.cts`。
 *
 * 用法（各包 build 的最后一步）：`node ../../scripts/emit-dcts.mjs dist`
 *
 * ## 为什么需要
 *
 * 包是 `"type": "module"`，所以 `.d.ts` 一律被 TS 当 ESM 声明看。`exports` 里
 * `require` 条件如果也指向它，`moduleResolution: node16/nodenext` 且**自身是 CJS**
 * 的使用者就会撞上 TS1479（「不能用 require 引 ESM 模块」）—— 运行时 `index.cjs`
 * 明明是好的，纯粹是类型条件没分流。给 `require` 条件配一份 `.d.cts` 即可解决。
 *
 * 受影响的是「Node 后端 + TS + CJS + nodenext」这一档，而 `infer-columns` /
 * `ai-query` 两个入口本来就是给服务端用的，正好撞上。TS 6 已经移除
 * `moduleResolution: node`，往后使用者只能在 bundler 与 node16/nodenext 之间选，
 * 这一档只会变多。
 *
 * ## 为什么「原样复制」就够
 *
 * `.d.cts` 走 CJS 解析，相对引用允许省略扩展名，所以复制出来的同名兄弟文件正好被认到
 * （`./components/index` → `components/index.d.cts`），不需要逐文件改写 specifier。
 * 已用真实 tarball 验证：CJS 上下文下 `VirtTableOptions` 从 `@virt-list/core` 继承来的
 * `list` / `itemKey` / `estimatedSize` 全部保真（少填必填字段、给错类型都照样报错），
 * 没有退化成 any。
 *
 * 代价只有类型文件的体积翻倍（vanilla 约 +100 kB tarball），**运行时零变化** ——
 * 声明文件不进使用方的 bundle。
 */
import { readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const target = resolve(process.cwd(), process.argv[2] ?? 'dist');

let count = 0;
/** @param {string} dir */
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (name.endsWith('.d.ts')) {
      copyFileSync(full, full.replace(/\.d\.ts$/, '.d.cts'));
      count += 1;
    }
  }
}

walk(target);
console.log(`emit-dcts: 由 ${count} 个 .d.ts 生成了同名 .d.cts`);
