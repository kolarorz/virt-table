# 付费插件接入（open-core）

`virt-table` 走 open-core：核心（`@virt-table/*`，MIT）在**本仓库**，付费插件在**另一个私有
仓库** `virt-table-pro`（`@virt-table-pro/*`，商业 EULA）。

两个约束同时成立：

1. 本仓库是公开的 —— 任何人 clone 下来都要能 `pnpm install && pnpm dev && pnpm typecheck`；
2. **公开产物里不能出现付费源码** —— 那个仓库的源码不该跟着 GitHub Pages 一起发出去。

## 两个阶段，两套解析 —— 只要记住这一条

| 命令 | 付费包解析到 | 为什么 |
| --- | --- | --- |
| `pnpm dev` | `../virt-table-pro/packages/*/src` | 改一行 pro 立刻热更新，插件开发就在这里做 |
| `pnpm build:docs`（本机） | 各 app 的 `node_modules/@virt-table-pro/*`（离线包） | 产物里只有 dist，且与客户装到的字节一致 |
| `pnpm build:docs`（**CI**） | `docs/.pro-vendor/*`（**入库**的混淆产物） | runner 上没有付费仓库，靠提交进来的产物 |

**不需要谁去设环境变量**：`build/pro-mode.ts` 按 vite 的 `command`（`serve` / `build`）
自动判定，`docs/.vitepress/config.ts` 与三个微应用共用同一份。

`pnpm build:docs` 的第一步是 `scripts/pro-tgz.mjs`：去付费仓库 build + `npm pack`，
把 tgz 铺进三个 app 的 `node_modules`。于是发布这件事顺带回答了**「客户装到的那组包真能用吗」**
—— 铺完之后 vite 走**裸包名 + 包自己的 `exports` 映射**（含 `./index.css` / `./time`
这类子路径），与客户 `npm i` 完全同路。

### 构建期**根本不认**源码档

这是本方案的安全边界，写成了结构而不是纪律：`resolveProMode({ phase: 'build' })` 的可用
档位只有 `installed` 与 `off`，`src` 压根不参与。

理由：维护者机器上 pro 源码**一直都在**。如果构建期也认 `src`，那么任何一次忘了铺 tgz 的
构建都会把付费源码打进公开产物 —— 而这件事没有任何外部症状。`scripts/check-pro-leak.mjs`
仍然在 `build:docs` 末尾扫一遍（源码专有注释 / `.map` / 指向 pro 源码目录的路径），
但那是第二道，不是第一道。

## 三档与它们的判定

| 档 | `@virt-table-pro/*` 解析到 | 谁会落到这一档 |
| --- | --- | --- |
| `src` | 付费仓库的**源码**（有 HMR） | `pnpm dev`，且同级目录有 `virt-table-pro` |
| `installed` | `docs/apps/<fw>/node_modules/@virt-table-pro/*`，**不 alias** | `pnpm build:docs`（自动铺）；或手动跑过 `pnpm pro:tgz` |
| `vendor` | `docs/.pro-vendor/<包>/index.js`（入库的混淆产物） | **CI**，以及本机没铺离线包时 |
| `off` | `docs/apps/pro-kit/stubs/` 下的桩 | 外部贡献者、fork，以及上面三条都不满足时 |

`vendor` 排在 `installed` **之后**是刻意的：维护者本机两样都在时该走 `installed`，
因为那一档顺带验了「客户装到的那组包真能用」（裸包名 + 包自己的 `exports` 解析）。
vendor 档刻意不带 `package.json`，没有 `exports` 可验，所以只在 `installed` 缺席时兜底。

判定顺序见 `build/pro-mode.ts` 的文件头。`VT_PRO=src|installed|off` 可强制指定，
`VT_PRO_DIR` 可改付费仓库路径。

**失败一律不炸**：缺仓库、tgz 没铺上、强制的档位不满足 —— 全都只 warn + 退回 `off`。
唯一的例外是 `pnpm build:docs:strict`（`VT_PRO_STRICT=1`），正式发布走那个入口 ——
「本该带付费能力却发成桩档」的站点是这条链路上最贵的一类事故。

## `off` 档在界面上是**看得见**的

两处信号，缺一处这个档位就会被误读成「站坏了」：

1. **桩自己**（`stubs/stub-notice.ts`）：一行 `console.warn` + 视口左下角一条固定提示，
   多个桩合并成一条。挂 `document.body` 而不是表格根元素 —— 后者是核心自管的子树，
   往里插东西要考虑会不会被当成一行、会不会吃掉指针事件。
2. **文档页的 demo 位**（`docs/.vitepress/theme/components/ProDemo.vue`）：`off` 档下**不嵌
   demo**，换成一张「本次构建不含付费能力」的说明卡。否则读者看到的是一张没有付费功能的
   普通表格，分不清是「这个插件就这样」还是「站坏了」。

档位怎么传到文档站：`ProDemo` 读 `__VT_PRO_MODE__`，由 `docs/.vitepress/config.ts` 的
`vite.define` 注入（值来自与微应用同一个解析器）。档位是**微应用**的构建期变量，
文档站的运行时读不到，只能这样传。

## `docs/apps/pro-kit/` 里有什么

```
docs/apps/pro-kit/
  demo-license.ts     域名绑定的演示密钥 + applyProDemoLicense(setLicenseKey)
  stubs/              6 个付费包的桩 + stub-notice.ts + empty.css
  shared/             三端 demo 共用的数据与样式（data / money-cell / edit-hook / pro-demo.css）
```

这个目录是**三端共用**的，所以加一个付费插件只要加**一个**桩，不是三个。刻意没有 `package.json`：
没有依赖也不构建，做成 workspace 包只会多一层注册。

### `demo-license.ts` 为什么把 `setLicenseKey` 当参数

`pro-kit/` 三端共用，而付费包是**逐 app** 装进 `docs/apps/<fw>/node_modules/` 的。node 的解析
从 **importer 所在目录**往上走，所以从 `pro-kit/` 里 `import '@virt-table-pro/license'` 永远走不到
某个 app 的 `node_modules` —— `installed` 档（没有 alias、走裸包名）下就是一句
`Rollup failed to resolve import`。把 setter 作为参数传进来，`pro-kit/` 就一个付费包都不 import。

各端的 shell 里那一行 `applyProDemoLicense(setLicenseKey)` 写在 app 自己的 `src` 下，解析正常。

### 桩要写成什么样

看任意一个现成的（`pro-kit/stubs/views.ts` 最短）。两条：

1. **返回一个合法插件**：`setup` 里只调一次 `stubNotice('vtXxx')`，不往表格子树插 DOM；
2. **类型形状对得上**，且实例方法一律**可选**（`saveView?()`）—— 三个 app 的 tsconfig 把
   `@virt-table-pro/*` **始终**指向这里的桩，可选就逼调用方写 `table.saveView?.(…)`，
   而桩生效时那些方法在运行时确实不存在。

类型为什么不跟着运行时档位切（试过回退到 pro 真源码）：见三个 `tsconfig` 里那段注释。

## 加一个付费插件 demo

1. `docs/apps/pro-kit/stubs/<name>.ts` 加桩（如果这个包还没有）；
2. `docs/apps/vanilla/src/pro-demos/<name>.ts` + `react/src/pro-demos/<Name>Demo.tsx` +
   `vue/src/pro-demos/<Name>Demo.vue` —— 三端各一个，用各自的 `shell` 提供的宿主；
3. 三个 `pro-demos/index.ts` 各加一行（id 统一 `pro-<name>`，与 `table-*` / `demo-*` 不撞）；
4. 文档页 `docs/{vanilla,react,vue}/enterprise/<name>.md` 的 `<ProDemo>` 加
   `example-id="pro-<name>"`。

演示密钥的 `products` 是 `'*'`，**新增插件不用重签**（两把都是：`pro-kit/demo-license.ts` 里那把
2099 长期密钥，与 `vendor` 档随产物带的 7 天测试密钥）。

## 部署

线上站的 bundle 是**自包含**的：alias / node_modules 只在构建期起作用。所以问题从来不是
「线上跑不起来」，而是**构建那台机器上有没有付费产物** —— 没有就发出一个桩档的站。

```bash
pnpm build:docs                       # 本地：自动打 tgz + 铺 + 构建 + 查泄漏
DEPLOY_BASE=/virt-table/ pnpm build:docs:strict   # 正式发布：缺 pro 就红
```

### CI 怎么拿到付费能力

runner 上没有付费仓库，靠的是**入库的混淆产物**（`vendor` 档）：

```bash
pnpm pro:vendor                       # 本地打一份混淆产物 + 7 天测试密钥
git add docs/.pro-vendor              # 不入库 CI 就吃不到
pnpm pro:vendor --key-only            # 密钥到期了只重签密钥（bundle 不动，无 diff）
pnpm verify:pro-vendor                # 自检：清单哈希 / 混淆特征 / 密钥有效期
```

两条要记住：

- **pro 代码改了要重新跑一次**，否则线上是旧版付费能力。pro 没变时重复跑**不产生 diff**
  （混淆 seed 取内容哈希），可以放心跑。
- **演示密钥缺省只有 7 天。** 过期后线上付费 demo 右下角出现未授权角标而**功能不降级** ——
  这是刻意的，短期内靠它在线上真的看见密钥机制生效。

完整来由见 `scripts/pro-vendor.mjs` 与 `.github/workflows/static.yml` 的头注。

⚠️ 混淆是**门槛不是边界**：那批字节进了公开 git 历史就是永久可取的。真正的边界是 EULA
加上那把短命密钥。
