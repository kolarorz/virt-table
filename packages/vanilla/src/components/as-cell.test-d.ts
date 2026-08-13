/**
 * `asCell` 的**类型级**断言。
 *
 * 这个文件不跑运行时（vitest 只收 `*.test.ts`），它靠 `tsc` 检查：
 * `pnpm -C packages/vanilla typecheck`，已挂进根 `pnpm typecheck`。
 *
 * 为什么需要它：`asCell` 的三件事里有两件**只存在于类型层**，运行时测不到 ——
 *   ① 列专属选项（`key` / `width` / `sortable` …）必须被**拒**；
 *   ② 组件自己的选项（`options` / `max` …）必须被**接受**。
 *
 * `@ts-expect-error` 是双向的守卫：期望的错误消失了，TS 会报「Unused
 * '@ts-expect-error' directive」——所以「该报错的不报」和「不该报的报了」都会红。
 * 这正是 `asCell` 泛型签名那条坑需要的守卫（写成 `<O extends BaseColumnOptions>`
 * 会静默落回约束，于是 ② 全部失效，见 shared.ts 里的注释）。
 */
import { asCell } from './shared';
import { VtSelect } from './vt-select';
import { VtProgress } from './vt-progress';
import { VtSwitch } from './vt-switch';
import { VtLink } from './vt-link';
import type { CellRenderConfig } from '../index';

interface Row extends Record<string, unknown> {
  id: number;
  status: string;
}

const STATUS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

/* ① 组件自己的选项必须被接受，且返回值就是一份 CellRenderConfig */
const selectCfg: CellRenderConfig<any> = asCell(VtSelect, { options: STATUS });
const progressCfg: CellRenderConfig<any> = asCell(VtProgress, { max: 100 });
const switchCfg: CellRenderConfig<any> = asCell(VtSwitch, { trueValue: 'Y', falseValue: 'N' });
void selectCfg;
void progressCfg;
void switchCfg;

/* ② 纯展示组件没有编辑态 —— 字段仍在类型上（可选），只是运行时为 undefined。
      注意 `VtLink<Row>`：不写实例化表达式的话 `href` 回调里的 row 是 `unknown`
      （这条是这份文件第一次跑就抓到的，不是假设） */
const linkCfg = asCell(VtLink<Row>, { href: (row) => `/u/${row.id}` });
void linkCfg.render;
void linkCfg.renderEditor;

/* ③ 行类型可用实例化表达式传入，`onChange` 的 row 因此有类型 */
void asCell(VtSelect<Row>, {
  options: STATUS,
  onChange: (value, row) => {
    const id: number = row.id;
    void value;
    void id;
  },
});

/* ④ 列专属选项在单元格级必须被拒 —— 它们本来就会被 setCellRender 丢掉，
      静默失效比编译报错糟得多。每一条都是「曾经能传进去」的形状。 */

// @ts-expect-error key 由 setCellRender 的 colKey 决定，不该在这里传
void asCell(VtSelect, { key: 'status', options: STATUS });
// @ts-expect-error title 是列表头的事
void asCell(VtSelect, { title: '状态', options: STATUS });
// @ts-expect-error width 是列宽
void asCell(VtSelect, { width: 120, options: STATUS });
// @ts-expect-error 排序是整列的能力
void asCell(VtSelect, { sortable: true, options: STATUS });
// @ts-expect-error 冻结是整列的能力
void asCell(VtSelect, { fixed: 'left', options: STATUS });
// @ts-expect-error 对齐是列/表级的容器能力
void asCell(VtSelect, { align: 'center', options: STATUS });
// @ts-expect-error 功能列是列的身份
void asCell(VtSelect, { type: 'checkbox', options: STATUS });

/* ⑤ validator 是唯一的例外：它挂在列类型上，但由组件自己读（markValidity），
      所以在单元格级照样生效，必须**能**传 */
void asCell(VtSelect, { options: STATUS, validator: (v) => (v ? true : '必填') });
