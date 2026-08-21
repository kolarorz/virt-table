/**
 * 付费插件 demo 三端共用的数据与列定义。
 *
 * 从付费仓库的 `playground/shared/data.ts` 搬过来 —— 那边的 playground 正在退役，
 * demo 收敛到本仓库的 `docs/apps/{vanilla,react,vue}/src/pro-demos/`（见 ../README.md）。
 *
 * 刻意用**确定性**生成器而不是 faker：调试视图切换时要能一眼看出「列宽变了 / 排序变了」，
 * 每次刷新数据都不一样反而干扰判断。
 */
import type { VirtTableColumn } from '@virt-table/vanilla';
import { moneyCell } from './money-cell';
import { emitCellEdit } from './edit-hook';

/**
 * `extends Record<string, unknown>` 不是摆设：三端组件的 `options.list` 类型是
 * `Record<string, unknown>[]`，没有索引签名的 interface 赋不进去。
 */
export interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  city: string;
  amount: number;
  status: string;
  date: string;
}

const DEPTS = ['研发', '市场', '销售', '运营', '财务'];
const CITIES = ['上海', '北京', '深圳', '成都', '杭州'];
const STATUS = ['进行中', '已完成', '待审核', '已取消'];

/**
 * 按下标循环取一个。
 *
 * 不直接写 `DEPTS[i % DEPTS.length]`：Vue 那个 app 继承了 `@vue/tsconfig` 的
 * `noUncheckedIndexedAccess`，下标访问会得到 `string | undefined`，赋不进 `Row`。
 * 模运算已经保证不越界，所以这里断言掉 —— 比在三处写 `?? ''` 干净，也不会掩盖真的越界。
 */
const pick = <T,>(arr: readonly T[], i: number): T => arr[i % arr.length] as T;

/**
 * 金额占比条的分母。写成常量而不是扫一遍 `makeRows()` 取最大值，理由有两个：
 * 列定义是模块级常量、拿不到 list；而且分母跟着当前数据浮动的话，筛选/分页后
 * 同一个金额的条长会变，反而看不出大小关系（见 money-cell.ts 的 `max` 注释）。
 *
 * 与下面生成器的上界对齐：`((i * 7919) % 90000) + 1000` 的最大值是 90999。
 */
export const AMOUNT_MAX = 91000;

export function makeRows(count = 2000): Row[] {
  return Array.from({ length: count }, (_, i) => {
    // 有规律但不单调，方便看排序效果
    const amount = ((i * 7919) % 90000) + 1000;
    return {
      id: i + 1,
      name: `项目 ${String(i + 1).padStart(4, '0')}`,
      dept: pick(DEPTS, i),
      city: pick(CITIES, i * 3),
      // 每 9 行掺一个负数：金额单元格的负号与红色分支要有东西可看，
      // 顺带让排序演示能跨过 0
      amount: i % 9 === 0 ? -amount : amount,
      status: pick(STATUS, i * 5),
      date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    };
  });
}

export interface ColumnsOptions {
  /**
   * 给金额列挂 `renderEditor`（需要使用方装核心的 `vtCellEditor`），并在写回后
   * 通过 `emitCellEdit` 喊一声。默认 false。
   *
   * 做成开关而不是常开：vanilla 端的 demo 壳要求**每个功能独立**，
   * 只想看金额单元格长什么样的那个 demo 不该顺带把编辑器和撤销桥接也拖进来。
   */
  editable?: boolean;
}

/**
 * 列定义工厂。
 *
 * 每列都开 `resizable` 与 `sortable`：vtViews 要演示的正是「列宽 / 列序 / 排序被存进视图」，
 * 拖不动列宽就没东西可存。注意 `resizable` 是**列级**属性，不在表级 options 上。
 *
 * 返回**新数组新对象**而不是共享一份常量：表格会就地改列对象（`col.width` 在拖列宽时
 * 直接被写），几个 demo 共用一份的话切过去会带着上一个 demo 拖出来的列宽 ——
 * 那正是「功能独立」要排除的串味。
 */
export function makeColumns(options: ColumnsOptions = {}): VirtTableColumn<Row>[] {
  const amount: VirtTableColumn<Row> = {
    key: 'amount',
    title: '金额',
    // 140 而不是 120：`-¥90,999.00` 是 11 个字符，120 下负数会被挤掉
    width: 140,
    align: 'right',
    sortable: true,
    resizable: true,
    // 金额单元格：千分位 + 货币符号 + 负数变色 + 占比条（见 money-cell.ts）
    render: moneyCell<Row>({ max: AMOUNT_MAX }),
  };

  if (options.editable) {
    /**
     * 可编辑（需要装核心的 `vtCellEditor`）。这一格同时是 `vtUndo` **手动层**的演示：
     * 写回之后喊一声，使用方把它翻译成 `recordChange`（见 edit-hook.ts 的注释）。
     *
     * 输入框里按 Cmd+Z 撤的是刚敲的字符（浏览器原生行为，vtUndo 会让路）；
     * 关掉编辑器之后按 Cmd+Z 撤的才是这次编辑。
     */
    amount.renderEditor = ({ row, value }) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'pg-money-input';
      input.value = String(value ?? '');
      // 用 change 而不是 input：后者每敲一个字符都会写回，历史里会堆一串半成品
      input.addEventListener('change', () => {
        const before = row.amount;
        const after = Number(input.value);
        if (!Number.isFinite(after) || after === before) return;
        row.amount = after;
        emitCellEdit({ row, key: 'amount', before, after, label: `编辑 ${row.name} 的金额` });
      });
      return input;
    };
  }

  return [
    { key: 'id', title: 'ID', width: 80, fixed: 'left', sortable: true, resizable: true },
    { key: 'name', title: '项目名称', width: 180, sortable: true, resizable: true },
    { key: 'dept', title: '部门', width: 100, sortable: true, resizable: true },
    { key: 'city', title: '城市', width: 100, sortable: true, resizable: true },
    amount,
    { key: 'status', title: '状态', width: 110, resizable: true },
    { key: 'date', title: '日期', width: 120, sortable: true, resizable: true },
  ];
}

/** 全功能列定义（含可编辑金额列），需要装核心的 `vtCellEditor` 才有编辑器 */
export const columns: VirtTableColumn<Row>[] = makeColumns({ editable: true });

/*
 * 演示密钥不在这里 —— 文档站用的是**域名绑定**的那把，见 `../demo-license.ts`。
 * 那份的 `products` 是 `'*'`，新增付费插件时不用重签。
 */
