# Demos · 经典案例

一个案例就是一个**能直接对着抄的完整应用**。示例是一个能力一页，回答「这个 API 怎么用」；案例是一个业务场景一页，回答「这十几项能力凑在一起该怎么组织」——数据量按真实业务给，交互也做全。

案例全部是**框架无关的原生实现**（只依赖 `@virt-table/vanilla`），所以路径里没有 `/vue/`、`/react/` 这一段。Vue / React 里 import 同一份 bootstrap、把 DOM 传进去就能跑。

<DemosGallery />

## 案例源码在哪

每个案例页底部都有可展开的完整源码。文件都在 `docs/apps/vanilla/src/demos/` 下，新增案例需要改两处：同目录的 `index.ts` 注册表（文件 → demo id）与 `docs/.vitepress/demoCases.ts`（清单，侧边栏和上面的卡片都吃它）。

卡片上的截图由 `node scripts/shoot-demos.mjs` 生成到 `docs/public/demos/<slug>.png`，改了案例外观记得重跑。

`docs/apps/{vue,react}/src/components/experimental/` 下还留着两份早期的 Vue / React 电子表格实现（吃飞书导出结构的那一版，已不在文档里出现），可以拿来对照适配层的写法。
