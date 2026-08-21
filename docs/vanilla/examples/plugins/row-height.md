# vtRowHeightConfig 行高

低 / 中 / 高三档行高。**一档换两件事** —— 密度类（单元格内边距与字号）与虚拟化行高：

| 档 | 密度类 | 行高 |
| --- | --- | --- |
| 低 `compact` | `.vt-root--compact` | 30px（= 19 行高 + 5×2 内边距 + 1 边框） |
| 中 `default` | 无 | 40px（= 21 + 9×2 + 1） |
| 高 `loose` | `.vt-root--loose` | 50px（= 21 + 14×2 + 1） |

三个数是各档**行高等式的解**（由 `css-contract.test.ts` 钉住），不是魔数。只做一半的后果很具体：
只加类 → 行内容变矮但每行仍占旧高度，行之间露白；只改行高 → 内容撑不开或被裁。
这个插件的全部价值就是把两件事绑在一起。

## 只在固定行高下开放

`fixedSize: true` 时行高是**你说了算**的（核心按 `estimatedSize` 摆位，不测量）。不定高模式下
每行多高由内容决定，`estimatedSize` 只是未测量行的估算值 —— 那时给三档是句空话，所以面板会
直说原因，`setRowHeightLevel()` 也不生效。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-row-height" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/row-height.ts
:::

## 说明

```ts
new VirtTable(el, {
  list, columns, itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,          // 必须
  plugins: [
    vtRowHeightConfig({
      value: 'compact',                       // 初始档（给了就立刻应用）
      onChange: (level, px) => save(level),   // 存下来，下次当 value 传回来
    }),
  ],
});

table.toggleRowHeightConfig(btnEl);
table.setRowHeightLevel('loose');
```

| 选项 | 作用 |
| --- | --- |
| `value` | 初始档。**给了就立刻应用**（覆盖你写的 `estimatedSize`）；不给则从当前 `estimatedSize` 反推一档回显，什么都不改 |
| `sizes` | 每档的行高，默认 `{ compact: 30, default: 40, loose: 50 }`。自定义过 `--vt-density-*` 才需要动它 |
| `onChange` | 切档后触发，持久化用 |
| `toolbar` | 装了 `vtToolbar` 时要不要占那条按钮条的位置，默认 `true` |
| `texts` | 文案覆盖，不给则跟随 `setLocale()` |

::: tip 与工具栏的关系
`vtToolbar()` 一颗按钮都不自带 —— 装了本插件才多出那颗「行高」按钮，按排序位排在四个面板之后。
`vtToolbarPanels()` 那个预设里**不含**它（预设只是那四个面板的一行写法）。
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `setRowHeightLevel(level)` / `getRowHeightLevel()` | 读写档位 | [插件机制](/vanilla/api/plugins) |
| `toggleRowHeightConfig(anchor?)` | 开合面板 | [插件机制](/vanilla/api/plugins) |
| `setRowHeight(px)` / `getRowHeight()` | 底层入口：直接改行高（同时更新账本并重算总高） | [实例方法](/vanilla/api/instance) |
| `fixedSize` / `estimatedSize` | 固定行高与行高值 | [表格配置](/vanilla/api/table) |
| `.vt-compact` / `.vt-loose` | 三档密度类（也能自己加在容器上） | [插件机制 · 行高与密度](/vanilla/api/plugins#行高与密度) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
