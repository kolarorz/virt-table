# pnpm 多包管理与发布流程

本项目使用 **pnpm workspace** 管理 3 个 npm 包。本文档说明日常开发、版本管理和发布的完整流程。

结构与流程沿用 [virt-list](https://github.com/kolarorz/virt-list) 的那一套，**但多了一步
`pnpm verify:pack`**，原因见「为什么必须校验产物」一节 —— 这是本仓库特有的、已经吃过两次亏的坑。

## 仓库结构

```text
virt-table/
├── packages/                    # 可发布的 npm 包
│   ├── vanilla/                 # @virt-table/vanilla — 表格本体，零框架依赖
│   ├── react/                   # @virt-table/react   — React 封装
│   └── vue/                     # @virt-table/vue     — Vue 3 封装
├── docs/                        # VitePress 文档站 + demo 微应用（不发布）
├── scripts/
│   ├── release.mjs              # 一键发布
│   ├── verify-pack.mjs          # 发布前产物校验（对着 tarball 验）
│   └── emit-dcts.mjs            # 由 .d.ts 生成配对的 .d.cts
├── package.json                 # 根 package.json（private: true）
├── pnpm-workspace.yaml
└── vitest.config.ts
```

## 包依赖关系

```text
@virt-table/vanilla    ← dependencies: @virt-list/core（类型需要，见下）
    ↑
@virt-table/react      ← dependencies: vanilla,  peerDep: react ≥18 / react-dom ≥18
@virt-table/vue        ← dependencies: vanilla,  peerDep: vue ≥3
```

构建顺序：**vanilla → react → vue**（`pnpm build` 已按此串行）。

顺序不能乱：两个封装包出类型声明时走的是**真实包解析**（读 vanilla 的 `dist/index.d.ts`
与它的 `exports` 映射），vanilla 没构建完这一步就会报 "Cannot find module"。副作用是好的
—— 封装包的构建顺带成了 vanilla `exports` 配置的一道校验。

### 关于 `@virt-list/core` 为什么在 `dependencies` 里

vanilla 的构建**刻意不 external** 任何依赖（`@virt-list/*` 与 `lodash-es` 都打进产物，
理由见 `packages/vanilla/vite.config.ts` 头注）。既然代码已内联，`lodash-es` 与
`@virt-list/vanilla` 就都放在 `devDependencies` —— 让使用方少下载一份。

但 `@virt-list/core` 必须留在 `dependencies`：它的类型是**公开 API 的一部分**
（`VirtTableOptions extends Omit<VirtListOptions, 'horizontal'>`、`VirtTableEvents extends
VirtListEvents`、`get core()`、`get state()`），挪走之后 TS 使用方会直接报找不到模块，
连 `list` / `itemKey` / `estimatedSize` 这些最基础的选项都会消失。

## 日常开发

```bash
pnpm install

pnpm dev              # 文档站 + 三端 demo 全起
pnpm dev:docs         # 仅 VitePress
pnpm dev:vanilla      # 原生 JS demo
pnpm dev:react        # React demo
pnpm dev:vue          # Vue demo

pnpm test             # 全部测试（一次性）
pnpm test:watch       # 监听模式
pnpm typecheck        # 3 个包 + 文档站 + 3 个 demo 应用
```

## 添加依赖

```bash
# 给某个包加依赖
pnpm --filter @virt-table/vanilla add <pkg>
pnpm --filter @virt-table/react add -D <pkg>

# 给根目录加开发依赖
pnpm add -Dw <pkg>
```

包间依赖用 `workspace:` 协议。本仓库用的是 **`workspace:^`** 而不是 `workspace:*`：

```json
{ "dependencies": { "@virt-table/vanilla": "workspace:^" } }
```

发布时 pnpm 会把它替换成 `^<当前版本号>`。用 `^` 而不是 `*` 是有意的 —— `*` 会被替换成
**精确版本**，使用方若自己也装了一份 vanilla（很常见，插件与内置组件都从那里引），
精确锁定就会出现两份副本，插件注册表与 locale 这类模块级状态会各有一份。

> ⚠️ **`^0.0.x` 的陷阱**：caret 在 `0.0.x` 上只匹配那一个补丁版，等于精确锁。所以首个
> 正式版建议直接从 **`0.1.0`** 起，让 `^0.1.0` 能正常覆盖后续补丁。

## 构建

```bash
pnpm build            # 三个包，按 vanilla → react → vue 顺序
pnpm build:vanilla    # 单个包
pnpm build:docs       # 文档站
```

每个包的 build 末尾都会跑 `node ../../scripts/emit-dcts.mjs dist`，把每个 `.d.ts` 复制一份
同名 `.d.cts`。这不是可选步骤：包是 `"type": "module"`，`exports` 的 `require` 条件若
指向 ESM 的 `.d.ts`，`moduleResolution: node16/nodenext` 且自身是 CJS 的使用者会撞上
`TS1479`（运行时的 `index.cjs` 明明是好的，纯粹是类型条件没分流）。
`infer-columns` / `ai-query` 两个入口本来就是给服务端用的，正好撞在这一档上。

## 为什么必须校验产物

**本仓库的测试与类型检查覆盖不到发布产物。** 三端 demo 的 vite alias 与根
`tsconfig.base.json` 的 `paths` 全都指向各包的 `src/`，所以 `pnpm test` 和 `pnpm typecheck`
全绿**不能证明** `dist/` 与 `exports` 映射是对的。已经因此漏出去过两次：

1. `exports` 声明了 `./components/*`，但 17 个组件只有 `.d.ts` 没有 `.js`（都被打进了
   barrel）→ **TS 编译通过、运行时 `ERR_MODULE_NOT_FOUND`**，最难查的那一类。
2. `src/plugins/` 里 tsc 误 emit 的 `.d.ts` 残留被当成构建入口，把 `search.css` 的产物名
   带成 `search.d.css` → `./plugins/*.css` 对 4 个插件全线 404，样式引不进来。

```bash
pnpm verify:pack
```

它把三个包按发布形态打成 tarball、解开，然后当成真实使用方去验六件事：

| | 检查项 | 钉住的问题 |
| --- | --- | --- |
| A | `exports` / `main` / `module` / `types` / `unpkg` 指向的文件真实存在（通配符按实际产物展开，每个实例的四个条件产物都要齐） | 第 1 类坑 |
| B | src 下每个 CSS 在 dist 里有对应产物（**同名**，两个已知别名在脚本里显式列出） | 第 2 类坑 |
| C | dist 里没有 `.d.js` / `.d.cjs` / `.d.css` 脏产物 | 第 2 类坑（另一侧） |
| D | 每个 `.d.ts` 都有配对的 `.d.cts` | 漏跑 emit-dcts |
| E | tarball 里没有源码 / 配置 / 测试泄漏，且带上了 README 与 LICENSE | `files` 字段配错 |
| F | vanilla 的每个 JS 子路径能被 Node 真实 `import()` + `require()`，每个 CSS 子路径能被 `require.resolve()` 解析 | 第 1 类坑（运行时侧） |

F 只对 vanilla 做：它的运行时依赖全部内联，解开就能跑；react/vue 要加载得先装
react-dom / vue，那等于把校验变成一次完整 npm install，不值得 —— 它们的 A~E 照样验，
类型解析则已由构建时的 `tsc` 那一步保证。

改动 `exports`、vite 入口、`files` 之后请务必跑一次。

## 版本管理与发布

### 一键发布（推荐）

```bash
pnpm release            # patch：0.1.0 → 0.1.1
pnpm release minor      # 0.1.0 → 0.2.0
pnpm release major      # 0.1.0 → 1.0.0
pnpm release 1.2.3      # 显式指定版本号
```

`scripts/release.mjs` 按顺序自动完成：

1. 检查 git 工作区是否干净（非 master 分支只告警）
2. 校验 3 个包版本号一致，计算目标版本
3. **向 registry 确认目标版本尚未发布** —— npm 不允许覆盖已有版本，这一步若留到最后
   才发现，前面的测试、构建、产物校验就全白跑了。本地版本号落后于线上时（本地 0.1.0
   而线上已有 0.1.1，patch 算出来正好撞上）会在这里直接拦下并告诉你该对齐到哪个版本
4. 检查 npm 登录状态
5. 把新版本号写入全部 `packages/*/package.json`
6. `pnpm test`
7. `pnpm typecheck`
8. `pnpm build`（vanilla → react → vue）
9. **`pnpm verify:pack`**（见上一节）
10. `pnpm publish -r --filter './packages/*'`（拓扑序由 pnpm 决定，`workspace:^` 自动替换）
11. `git commit -m "chore: release vX.Y.Z"` + `git tag vX.Y.Z`
12. `git push --follow-tags`

> **必须用 `pnpm publish`，不能用 `npm publish`。** 只有 pnpm 会把 `workspace:^` 替换成
> 真实版本区间；`npm pack` / `npm publish` 会把它原样写进 tarball，装的时候直接
> `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:"`。

**先演练再发布**：

```bash
pnpm release:dry        # 走完整流程但不发布、不打 tag，结束时回滚版本号改动
```

任一步失败（测试不过、构建报错、产物校验红、未登录）都会自动回滚 `package.json` 的版本号
改动，不留半截状态。只有「发布已部分成功」这一种情况会保留版本号，此时按提示重跑
`pnpm publish` 即可 —— pnpm 会自动跳过已发布的版本。

可选参数：

| 参数 | 作用 |
| --- | --- |
| `--dry-run` | 演练模式，等价于 `pnpm release:dry` |
| `--tag <t>` | 指定 npm dist-tag，默认 `latest` |
| `--skip-tests` | 跳过 `pnpm test` |
| `--skip-verify` | 跳过 `pnpm verify:pack`（**不建议**，理由见上一节） |
| `--allow-dirty` | 允许工作区有未提交改动 |
| `--no-push` | 发布并打 tag，但不 `git push` |

环境变量 `RELEASE_REGISTRY` 可覆盖发布目标 registry，默认 `https://registry.npmjs.org/`。

> **注意 registry**：本机 `npm config get registry` 若指向镜像（本仓库 lockfile 里是
> npmmirror），脚本仍会显式发往公共 npm，但 `npm login` 需要针对公共 registry 执行：
>
> ```bash
> npm login --registry https://registry.npmjs.org/ --scope=@virt-table
> ```

**约定**：3 个包始终共用同一个版本号。脚本会在版本号不一致时直接报错退出，要求先手动对齐。

### 前置条件

1. npm 已登录：`npm login --registry https://registry.npmjs.org/ --scope=@virt-table`
2. `@virt-table` 这个 organization 已创建，且当前账号有发布权限
3. 工作区干净：`git status` 无未提交改动
4. 测试通过、构建成功、产物校验通过

第 3~4 项 `pnpm release` 会自动检查；第 1~2 项只能人工确认（首发尤其注意第 2 项）。
三个包都已配 `publishConfig.access: public`，scoped 包首发不会被当成私有包拒掉。

### 首发的特殊注意

- **版本号从 `0.1.0` 起**，不要用 `0.0.1`。理由见前面 `workspace:^` 那一节的陷阱说明。
- 首发时 `@virt-table/vanilla` 还不在 registry 上，所以**本地**没法用
  `npm i <react-tarball>` 验证封装包（npm 会去拉 `@virt-table/vanilla@^x` 然后 404 回滚
  整批安装）。`pnpm verify:pack` 绕开了这个问题（它不做 npm install）。若确实想手工装
  tarball 验证，在临时工程的 package.json 里加 overrides 重定向：

  ```json
  { "overrides": { "@virt-table/vanilla": "file:../virt-table-vanilla-0.1.0.tgz" } }
  ```

  注意 overrides 不能与同名的直接依赖共存（会报 `EOVERRIDE`），把 vanilla 从
  `dependencies` 里去掉、只留 overrides 即可。

### 手动发布

```bash
# 1. 手动把 3 个包的 version 改成同一个值
# 2. 构建 + 校验
pnpm build && pnpm verify:pack
# 3. 发布（-r 自动按依赖拓扑序，无需手工排序）
pnpm publish -r --filter './packages/*' --access public \
  --registry https://registry.npmjs.org/ --no-git-checks
# 4. 打 tag
git tag v0.1.0 && git push --tags
```

### 版本号约定

遵循 [Semantic Versioning](https://semver.org/)：**patch** 修 bug、**minor** 加功能且向后兼容、
**major** 破坏性变更。三个包保持统一版本号，便于使用方理解兼容性。

### 预发布

```bash
pnpm release 0.2.0-beta.0 --tag beta
```

使用方需显式安装才会拿到：`npm install @virt-table/vanilla@beta`。
beta 验证通过后回到正式版：`pnpm release 0.2.0`。

### 发布前检查清单

用 `pnpm release` 时前 6 项由脚本保证，只需人工确认后 3 项；跑一次 `pnpm release:dry`
可以一次性验证到「发布前」的全部环节。

- [x] `pnpm test` 通过 —— 脚本自动执行
- [x] `pnpm typecheck` 通过 —— 脚本自动执行
- [x] `pnpm build` 成功 —— 脚本自动执行
- [x] `pnpm verify:pack` 通过（exports / CSS / .d.cts / 泄漏 / 真实加载）—— 脚本自动执行
- [x] `version` 已更新且三包一致 —— 脚本自动写入并校验
- [x] `workspace:^` 替换为真实版本区间 —— pnpm publish 自动处理
- [ ] `@virt-table` organization 权限就绪（首发）
- [ ] [CHANGELOG](./CHANGELOG.md) 的 `[未发布]` 段已整理成本次版本号
- [ ] `peerDependencies` 版本范围仍然合理（react ≥18 / react-dom ≥18 / vue ≥3）

## 发布后验证

```bash
# 确认 registry 上的版本
npm view @virt-table/vanilla version --registry https://registry.npmjs.org/

# 在新项目里真实安装
mkdir /tmp/test-virt-table && cd /tmp/test-virt-table
npm init -y && npm install @virt-table/vanilla
node -e "console.log(Object.keys(require('@virt-table/vanilla')).length)"
```

> `npm pack --dry-run` 只用来**看文件列表**。它不会把 `workspace:^` 换成真实版本号，
> 所以它产出的 tarball 不能拿去发布 —— 发布始终走 `pnpm publish`，理由见上文。

## CI/CD

当前 `.github/workflows/static.yml` 只做文档站部署（构建三端 demo → 构建 VitePress →
发到 GitHub Pages）。**测试、typecheck、产物校验目前都没有进 CI**，发布是本地手动触发的。

建议补一个 CI workflow 把 `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm verify:pack`
跑起来。若将来想改成推 tag 即自动发布：

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org/

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm verify:pack

      - name: Publish
        run: pnpm publish -r --filter './packages/*' --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

此时本地只负责改版本号和推 tag（`pnpm release --no-push` 之后手工推，或另写一个只 bump
不 publish 的流程）。

## 常见问题

### Q: `workspace:^` 发布后会变成什么？

`^<当前版本号>`。例如 vanilla 是 `0.1.0` 时，react 的 `"@virt-table/vanilla": "workspace:^"`
会变成 `"^0.1.0"`。

### Q: 如何只发布其中一个包？

`pnpm release` 不支持（三包版本号是绑定的）。确有需要时手动发：

```bash
pnpm --filter @virt-table/vanilla publish --access public \
  --registry https://registry.npmjs.org/
```

注意：若 vanilla 有版本变化，要先发 vanilla 再发两个封装包。

### Q: 发布中途失败了怎么办？

版本号改动会保留在工作区（不自动回滚，否则和已发出去的包对不上）。直接重跑发布命令，
pnpm 会跳过 registry 上已存在的版本：

```bash
pnpm publish -r --filter './packages/*' --access public \
  --registry https://registry.npmjs.org/ --no-git-checks
```

补发完成后再手动 `git commit` + `git tag`。

### Q: 封装包构建报 "Cannot find module '@virt-table/vanilla'"？

vanilla 没先构建。封装包出声明时读的是 vanilla 的 `dist`，走 `pnpm build`（已保证顺序）
或先跑 `pnpm build:vanilla`。

### Q: `verify:pack` 报「src/xxx.css 没有对应的 dist/xxx.css」？

CSS 产物名跟的是**所属入口的 chunk 名**（见 `vite.config.ts` 的 `cssPerEntry`）。
多数情况下与源文件同名；名字对不上的两个（`index.css → core.css`、
`components/components.css → components/index.css`）在 `verify-pack.mjs` 里显式列着。
新增了这类共享样式就往那个映射表里加一条 —— 刻意不做成宽松匹配，因为「同名」这个约束
正是钉住 CSS 被意外改名的那道防线。

### Q: 新增一个包的步骤？

1. `packages/` 下建目录与 `package.json`（`pnpm-workspace.yaml` 的 `packages/*` 已覆盖）
2. 加 `vite.config.ts`、`tsconfig.build.json`、`tsconfig.typecheck.json`
   （照 `packages/react` 抄，注意 **build 那份不能 extends 根 tsconfig** —— 根里的
   `paths` 会让声明产物引用到源码相对路径，发出去就是死链）
3. build 脚本末尾带上 `node ../../scripts/emit-dcts.mjs dist`
4. 复制 `LICENSE`，写 `README.md`（npm 页面只认各包目录下的那一份，不是根目录的）
5. 根 `package.json` 的 `build` / `typecheck` 里加上它
6. `scripts/verify-pack.mjs` 的 `PACKAGES` 数组里加上它
7. `pnpm install` 让 pnpm 识别新包
