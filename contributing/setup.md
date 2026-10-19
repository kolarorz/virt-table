# 本地开发

```bash
pnpm i
pnpm dev          # 文档站 + 三端 demo 全起（docs:5173 / react / vue / vanilla）
pnpm test         # 1339 个测试
pnpm typecheck    # 3 个包 + 文档站 + 3 个 demo
pnpm build        # 构建三个包（vanilla → react → vue）
pnpm build:docs   # 构建文档站（含付费产物铺设 + 泄漏自检）
```

Node ≥ 18，包管理器固定 `pnpm@9.15.2`（`package.json` 的 `packageManager` 字段）。

## 常用命令一览

| 命令 | 做什么 |
| --- | --- |
| `pnpm dev:docs` / `dev:vanilla` / `dev:react` / `dev:vue` | 只起其中一个 |
| `pnpm test:watch` | 测试 watch 模式 |
| `pnpm verify:pack` | **对着打包后的 tarball** 校验产物（发布前必跑，见 [发布流程](./publishing.md)） |
| `pnpm preview` | 预览已构建的文档站（**先重建**，否则服的是旧 `dist`） |
| `pnpm verify:enterprise` | 付费插件文档的三端一致性自检 |

## 项目目录

```text
.
├─ packages/            # npm 发布包
│  ├─ vanilla/          # @virt-table/vanilla — 表格本体，零框架依赖
│  ├─ react/            # @virt-table/react   — React 封装
│  └─ vue/              # @virt-table/vue     — Vue 3 封装
├─ docs/                # VitePress 文档站 + playground 宿主（不发布）
│  ├─ apps/             # 文档内微应用（vanilla/react/vue），以 qiankun 嵌入
│  ├─ apps/pro-kit/     # 三端共用的付费插件桩与演示密钥
│  ├─ .enterprise/      # 付费插件文档的共享正文片段（被 include，不是页面）
│  ├─ .pro-vendor/      # 入库的付费混淆产物（给 CI 用，自动生成）
│  ├─ vanilla/          # Vanilla 文档
│  ├─ react/            # React 文档
│  └─ vue/              # Vue 文档
├─ contributing/        # 开发者文档（就是你现在在读的这一栈）
├─ build/pro-mode.ts    # 付费包解析档位判定（文档站与三个微应用共用）
├─ scripts/
│  ├─ release.mjs           # 一键发布
│  ├─ verify-pack.mjs       # 发布前产物校验（对着 tarball 验）
│  ├─ emit-dcts.mjs         # 由 .d.ts 生成配对的 .d.cts
│  ├─ pro-tgz.mjs           # 去付费仓库 build + npm pack + 铺进 node_modules
│  ├─ pro-vendor.mjs        # 打一份入库用的付费混淆产物
│  ├─ check-pro-leak.mjs    # 公开产物里有无付费源码痕迹
│  ├─ check-pro-vendor.mjs  # 入库产物的清单哈希 / 混淆特征 / 密钥有效期
│  └─ check-enterprise-docs.mjs # 付费文档三端一致性
├─ AGENTS.md            # 架构与实现细节（给维护者/AI 的长文，305 KB）
├─ CHANGELOG.md
└─ pnpm-workspace.yaml
```

## 包依赖关系

```text
@virt-table/vanilla    ← dependencies: @virt-list/core（类型需要）
    ↑
@virt-table/react      ← dependencies: vanilla,  peerDep: react ≥18 / react-dom ≥18
@virt-table/vue        ← dependencies: vanilla,  peerDep: vue ≥3
```

表格能力全在 `vanilla` 里，两个封装包只做框架侧桥接（受控 props、`ref` 命令式 API、
用框架组件渲染单元格）。插件与内置组件**与框架无关**，三端都直接从 vanilla 引。

虚拟滚动内核复用 [virt-list](https://github.com/kolarorz/virt-list) 的 `@virt-list/core`，
不在这里另造一份 —— 滚动与几何相关的问题先去看 core 有没有现成能力。

依赖为什么这样摆（尤其 `@virt-list/core` 为什么在 `dependencies` 而不是 `peerDependencies`），
见 [发布流程](./publishing.md#包依赖关系)。

## 付费插件（可选，不影响本仓库的开发）

两个经典案例用到四个付费插件（`@virt-table-pro/*`，另一个私有仓库）：
「电子表格」的**浮动图片 / 单元格公式 / 撤销重做**、「项目管理 WBS」的**甘特时间轴**。

**没有那个仓库照样能完整开发**：付费能力会自动退回桩，表格照常跑、案例照常打开
（电子表格少一张浮动图、偏差列回落成算好的纯值、公式栏与撤销按钮点了没反应；
项目管理 WBS 少右边那层甘特条，左边那张任务表照旧）。

```bash
pnpm pro:tgz         # 有 pro 仓库时：去那边 build + pack + 铺进三个 app 的 node_modules
pnpm pro:vendor      # 打一份入库用的混淆产物（CI 靠它拿到付费能力）
pnpm verify:pro-leak # 公开产物里有没有付费源码痕迹（build:docs 末尾会自动跑）
VT_PRO=off pnpm build:docs   # 强制构建一个完全不含付费能力的站点
```

本仓库**只消费付费包的 `dist`**（与客户拿到的字节一致），从不吃它的源码 ——
完整方案、四个档位的判定与边界见 [付费插件接入](./pro-plugins.md)。

## 测试

```bash
pnpm test         # 全量
pnpm test:watch
```

纯逻辑测试是主力；DOM 层测试按文件用 `// @vitest-environment happy-dom` 开启，
用 `renderControl` 钉住渲染窗口而不是 stub 几何 —— 写法与那批约定见 `AGENTS.md` §5.1。

手势、主题切换、tooltip 悬停这类目前仍靠 playground + CDP 手测，见 `AGENTS.md` §7.7。
