/**
 * 付费插件 demo 的注册表（Vanilla 端）。
 *
 * 加一个 demo 只改**这一处**（与 `src/demos/index.ts` 的 `demoRegistry` 同一种设计）：
 * 写好 `pro-demos/<name>.ts`，在下面数组里加一行。
 *
 * id 前缀 **`pro-`**，与「功能」示例的 `table-*` 和「经典案例」的 `demo-*` 都不撞。
 * 文档页那边 `<ProDemo example-id="pro-views" />` 用的就是这个 id，三端**同 id**。
 *
 * 顺序按「先对照组、再逐插件」：`basics` 一个付费插件都不装，是这组 demo 的**对照组** ——
 * 它跑得起来就说明外壳本身没问题，剩下的表现差异都归到那个插件身上。
 *
 * **甘特图刻意不在这里**：它与经典案例「项目管理 WBS」是**同一个 demo**
 * （`src/demos/project-wbs.ts`，id `demo-project-wbs`），企业版那 5 个甘特文档页嵌的
 * 就是它。原来两边各有一套（一套 829 行、一套 529 行）都在演示同一个插件，
 * 改一处漏一处 —— 尤其是列定义，配置面板的候选项是从**列 + 数据**推断的。
 */
import { proDemoBootstrap } from './shell';
import { basicsDemo } from './basics';
import { moneyDemo } from './money';
import { licenseDemo } from './license';
import { viewsDemo } from './views';
import { undoDemo } from './undo';
import { formulaDemo } from './formula';
import { sheetDemo } from './sheet';
import { floatingImageDemo } from './floating-image';
import type { ProDemo } from './types';

const demos: ProDemo[] = [
  basicsDemo,
  moneyDemo,
  licenseDemo,
  viewsDemo,
  undoDemo,
  formulaDemo,
  sheetDemo,
  floatingImageDemo,
];

export const proDemoRegistry: Record<string, (root: HTMLElement) => () => void> =
  Object.fromEntries(demos.map((d) => [`pro-${d.id}`, proDemoBootstrap(d)]));

export type { DemoHost, DemoInstance, ProDemo } from './types';
