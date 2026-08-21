/**
 * 付费插件 demo 的注册表（React 端）。加一个 demo 只改这一处。
 *
 * id 前缀 **`pro-`**，与「功能」示例的 `react-*` 不撞。三端**同 id**：
 * 文档页写 `<ProDemo example-id="pro-views" />`，框架端由页面所在的 URL 段决定。
 *
 * 比 vanilla 端少两个（`basics` / `money`）：那两个不装任何付费插件，是 vanilla 端
 * 功能矩阵的对照组，框架端重复一遍没有信息量。多一个 `types` —— 它验的是
 * 「付费插件的 `declare module` 有没有透到框架 ref 上」，只有框架端才有这回事。
 */
import type { FC } from 'react';
import { withProDemoShell } from './shell';
import { LicenseDemo } from './LicenseDemo';
import { ViewsDemo } from './ViewsDemo';
import { UndoDemo } from './UndoDemo';
import { FormulaColumnDemo } from './FormulaColumnDemo';
import { SheetDemo } from './SheetDemo';
import { GanttDemo } from './GanttDemo';
import { TypesDemo } from './TypesDemo';

export const proDemoRegistry: Record<string, FC> = {
  // 一进来必须是未授权状态，否则「角标出现 → 注入 → 消失」的第一步看不到
  'pro-license': withProDemoShell(LicenseDemo, { license: 'reset' }),
  'pro-views': withProDemoShell(ViewsDemo),
  'pro-undo': withProDemoShell(UndoDemo),
  'pro-formula': withProDemoShell(FormulaColumnDemo),
  'pro-sheet': withProDemoShell(SheetDemo),
  'pro-gantt': withProDemoShell(GanttDemo),
  'pro-types': withProDemoShell(TypesDemo),
};

export type { ProDemoProps } from './shell';
