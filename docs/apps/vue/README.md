# docs/apps/vue —— Vue 3 示例微应用

文档站里那些能跑的 Vue 例子，由这个应用提供。以 qiankun 微应用的形式嵌进 VitePress
页面（`<Demo example-id="...">`），也可以单独起来调试。

```bash
pnpm -C docs/apps/vue dev
pnpm -C docs/apps/vue build
```

```
src/components/         按分组的示例
src/pro-demos/          付费插件示例（没有付费仓库时走桩，见 contributing/pro-plugins.md）
src/App.tsx             示例注册表
src/virt-table-ref.ts   ref 类型辅助
```

Vite + Vue 3 + TypeScript，配置见 `vite.config.ts`。示例怎么组织见
[开发文档](../../../contributing)。
