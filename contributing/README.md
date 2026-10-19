# 开发文档

给**维护者与贡献者**的文档。面向使用者的内容全在
[文档站](https://kolarorz.github.io/virt-table/)（源码在 [`docs/`](../docs)）。

## 从哪开始

| 你要做的事 | 看这里 |
| --- | --- |
| 把仓库跑起来、知道目录里有什么 | [本地开发](./setup.md) |
| 理解内部架构、某个能力是怎么实现的 | [`AGENTS.md`](../AGENTS.md)（根目录，305 KB 长文） |
| 发一个 npm 版本 | [发布流程](./publishing.md) |
| 接付费插件 / 搞懂 open-core 那套 | [付费插件接入](./pro-plugins.md) |
| 看还差什么、某件事为什么不做 | [待办与已评估不做的事](./roadmap.md) |
| 翻还没落地的方案稿 | [`proposals/`](./proposals) |

## 各文件是什么

- **[setup.md](./setup.md)** —— 环境要求、常用命令、项目目录树、包依赖关系、付费插件对开发的影响、测试怎么写。
- **[publishing.md](./publishing.md)** —— pnpm workspace 多包管理、`workspace:^` 的取舍、产物校验（`verify:pack` 是本仓库特有的一步，吃过两次亏）、一键发布、发布后验证、常见问题。
- **[pro-plugins.md](./pro-plugins.md)** —— open-core 的落地方案：付费包的四个解析档位、构建期为什么根本不认源码档、`off` 档在界面上怎么被看见、CI 靠入库的混淆产物拿到付费能力。
- **[roadmap.md](./roadmap.md)** —— 当前缺口 / 曾经的缺口 / **评估后明确不做的事**（附理由，避免反复重开同一个话题）。
- **[proposals/](./proposals)** —— 方案稿。落地后要么并进上面某篇，要么删掉。

## 不在这里的开发文档

有几篇刻意留在它们解释的目录旁边，搬走就失去了「站在目录里就能读到」的作用：

| 文件 | 讲什么 |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | 架构与实现细节长文。留根目录：是 AI 工具约定的入口，且被 `packages/**` 里 76 处 `见 AGENTS.md §x.y` 引用 |
| [`docs/apps/pro-kit/README.md`](../docs/apps/pro-kit/README.md) | 那个目录里有什么（完整方案在 [pro-plugins.md](./pro-plugins.md)） |
| [`docs/.enterprise/README.md`](../docs/.enterprise/README.md) | 付费插件文档的共享正文片段为什么是这个形状 |
| [`docs/.pro-vendor/README.md`](../docs/.pro-vendor/README.md) | 入库的付费产物目录（自动生成，不要手改） |
| `scripts/*.mjs` 的文件头注 | 每个脚本的完整来由，尤其 `pro-vendor.mjs` |
| `build/pro-mode.ts` 的文件头注 | 付费包档位的判定顺序 |
