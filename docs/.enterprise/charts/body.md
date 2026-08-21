装上它只会 `console.warn` 一次，**不做任何事**。骨架（构建、类型、许可、测试、发布）都已就位。

---

## 现在装上会发生什么

```ts
import { vtCharts } from '@virt-table-pro/charts';

new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtCharts({ defaultType: 'bar' })] });
// → [vtCharts] 集成图表 尚未实现，本插件当前不做任何事。
```

- 表格照常工作，插件不改任何行为
- `guardProduct('charts')` 照常跑 —— 没设密钥时右下角**会出现未授权角标**
- `table.createChartFromSelection()` / `closeCharts()` **类型上有、运行时没有**，
  调用会抛 `is not a function`

---

## 计划中的 API（草案，实现时可能变）

```ts no-check
interface ChartsOptions<T> {
  /** 图表渲染器。**不内置图表库**，由使用方接入（echarts / chart.js 均可） */
  renderer?: (el: HTMLElement, data: unknown) => { update(data: unknown): void; destroy(): void };
  /** 默认图表类型 */
  defaultType?: 'line' | 'bar' | 'pie' | 'scatter';
  /** 数据变化时自动刷新图表 */
  liveUpdate?: boolean;
}
```

```ts no-check
// 预期用法
import * as echarts from 'echarts';

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtCharts({
      defaultType: 'bar',
      liveUpdate: true,
      renderer: (host, data) => {
        const chart = echarts.init(host);
        chart.setOption(toOption(data));
        return {
          update: (next) => chart.setOption(toOption(next)),
          destroy: () => chart.dispose(),
        };
      },
    }),
    vtCellSelection(),   // 选区是出图的入口
  ],
});

table.createChartFromSelection('line');
table.closeCharts();
```

**不内置图表库**是刻意的：使用方项目里几乎总已经有一个（echarts / chart.js / highcharts），
再塞一个进 bundle 是纯负担。本包负责的是「选区 → 数据集」「浮层定位与生命周期」「数据联动」。

---

## 动工前核心需要先补什么

**不阻塞。** 需要的面基本都在：

| 要做的事 | 用核心的什么 | 状态 |
| --- | --- | --- |
| 拿当前选区 | `ctx.inject<CellSelectionService>('cellSelection')` | ✅ 已公开 |
| 选区矩形几何 | `getSelectionRect()` / `cellFromPoint()` | ✅ |
| **按列取像素范围**（把图表浮层对齐到具体列） | `getColumnRange(c0, c1)` | ✅ `vtGantt` 一期顺手补上了 —— 纯列宽前缀和，**不依赖渲染窗口** |
| 按行摆浮层 | `getRenderedRowRects()` / `getRowRect(index)` | ✅ 同上 |
| 横向偏移读写 | `getScrollLeft()` / `scrollByX(dx)` | ✅ 同上 |

`getColumnRange` 原本正是本包的缺口，`vtGantt` 动工时一并补了，一次两个包受益
——
这类缺口一律先在核心补成公开 API，再由插件消费。

---

## 在那之前怎么办

选区数据核心已经能给了 —— `vtCellSelection` 声明了一个 `cellSelection` 服务，
`buildSelectionRows()` 直接把选区拍平成二维数组（复制与「导出选区」共用的就是它）。
图先画在表格旁边，不做浮层：

```ts
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import type { CellSelectionService, VirtTablePlugin } from '@virt-table/vanilla';

/** 三行小插件：把选区数据透到实例上。等 vtCharts 做出来就能删 */
const vtSelectionData = (): VirtTablePlugin<Row> => ({
  name: 'vtSelectionData',
  setup: (ctx) => ({
    api: {
      // inject 要现用现取：cellSelection 可能声明在本插件之后，setup 阶段问会问空
      getSelectionRows: () =>
        ctx.inject<CellSelectionService>('cellSelection')?.buildSelectionRows() ?? null,
    },
  }),
});

const table = new VirtTable<Row>(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtCellSelection(), vtSelectionData()],
});

document.querySelector('#chart-btn')!.addEventListener('click', () => {
  const picked = (table as any).getSelectionRows();   // { selection, columnIndexes, rows }
  if (!picked) return;
  const [header, ...body] = picked.rows;              // 第一行当类目，其余当系列
  chart.setOption({
    xAxis: { type: 'category', data: body.map((r: string[]) => r[0]) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: body.map((r: string[]) => Number(r[1])) }],
  });
});
```

本包要做的增量是：浮层跟着列/行的像素位置走（横向滚动不掉队）、数据变化自动 `update`、
多张图的生命周期管理、以及从右键菜单一键出图。

---

## 为什么它值得收费

AG Grid 客户升级 Enterprise 的头号理由。选区出图 + 数据联动，与表格深度耦合，独立图表库替代不了。

---

## 进展与排期

kolarorz@gmail.com

## 相关

- [企业版](/enterprise/) —— 授权模式、定价与常见问题
- 已实现的付费包：<ProLink to="views">命名视图</ProLink> · <ProLink to="undo">撤销 / 重做</ProLink> ·
  <ProLink to="formula/column">公式</ProLink> · <ProLink to="gantt/">甘特图</ProLink>
