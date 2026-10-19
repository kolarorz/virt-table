# docs/apps/vanilla —— Vanilla 示例微应用

文档站里那些能跑的例子，由这个应用提供。以 qiankun 微应用的形式嵌进 VitePress 页面
（`<Demo example-id="...">`），也可以单独起来调试。

```bash
pnpm -C docs/apps/vanilla dev
pnpm -C docs/apps/vanilla build
```

```
src/components/   按分组的示例（basic / advanced / cell / merge / plugins …）
src/demos/        综合案例（电子表格、项目管理 WBS…）
src/pro-demos/    付费插件示例（没有付费仓库时走桩，见 contributing/pro-plugins.md）
src/main.ts       微应用入口 + 示例注册表
```

新增一个示例要动的注册点、以及「讲解进文档页、代码进示例页」这条约定，见
[开发文档](../../../contributing)。
