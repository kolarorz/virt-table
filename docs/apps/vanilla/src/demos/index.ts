import { bootstrapDemoSpreadsheet } from './spreadsheet';
import { bootstrapDemoHrPayroll } from './hr-payroll';
import { bootstrapDemoProjectWbs } from './project-wbs';

export type DemoBootstrap = (root: HTMLElement) => (() => void) | void;

/**
 * Demos（经典案例）的注册表 —— **新增案例只改这一处**。
 *
 * 与 `components/` 那批示例刻意不同：示例要改三处（`components/index.ts` 再导出、
 * `main.ts` 导入、`main.ts` 的 `demoBootstrapMap` 挂条目），78 条之后那张表已经是纯抄写。
 * 案例只会越写越大，所以从第一天就把「文件 → id」收在这一个文件里，`main.ts` 只 spread。
 *
 * id 一律 `demo-*` 前缀，与示例的 `table-*` 分开：`PlaygroundHost` 靠 `example-id`
 * 找 bootstrap，前缀不撞就不会出现「案例页悄悄打开了某个示例」。
 */
export const demoRegistry: Record<string, DemoBootstrap> = {
  'demo-spreadsheet': bootstrapDemoSpreadsheet,
  'demo-hr-payroll': bootstrapDemoHrPayroll,
  'demo-project-wbs': bootstrapDemoProjectWbs,
};
