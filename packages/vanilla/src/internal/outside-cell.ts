/**
 * 「这一下点在我的单元格之外吗」—— 核心的**激活态**与 `vtCellSelection` 的**选区**共用的判断。
 *
 * 两处都需要「点到别处就收起」，而两处都答错一次的代价很具体：
 * 正在编辑时点一下输入框，描边/选区就没了。所以判断只写一份。
 *
 * ## 什么算「界内」（返回 false，不该清）
 *
 * 1. **本表格的单元格**。点另一格是「换一格」不是「离开」，那条路自己会重设状态
 *    （`_onBodyClick` / 拖选起手）。**必须排除**：`document` 上的监听在冒泡链末端，
 *    不排除就成了「先设置、再清掉」。按 `tbodyEl.contains()` 判，于是同页多张表互不干扰 ——
 *    点表格 A 的格子，表格 B 那份状态确实该收起来。
 * 2. **编辑浮层**（`.vt-cell-cover`）。它挂在 `.vt-client` 上、在 tbody 之外，
 *    而描边标记的正是**正在被编辑的那一格** —— 点自己的输入框把它清掉是自相矛盾。
 * 3. **任何弹出浮层**（`[data-vt-popup]`：下拉、日历、筛选面板、工具栏面板…）。
 *    从单元格里开出来的那些属于「还在操作这一格」；工具栏那些则在点按钮时就已经收起过状态了。
 *
 * ## 只认主键
 *
 * 右键与中键不算「离开」：右键菜单要对着**当前那一格**弹出（`vtContextMenu` 读的就是它），
 * 中键是滚动/新标签页。只有主键按下才是「我现在要去别处」。
 */
export function isOutsidePointer(e: PointerEvent, tbodyEl: HTMLElement): boolean {
  if (!e.isPrimary || e.button !== 0) return false;
  const target = e.target as HTMLElement | null;
  if (!target || typeof target.closest !== 'function') return false;

  // 本表格的单元格 —— 换格不是离开
  const td = target.closest('td.vt-td');
  if (td && tbodyEl.contains(td)) return false;

  // 编辑浮层与各类弹层
  if (target.closest('.vt-cell-cover, [data-vt-popup]')) return false;

  return true;
}
