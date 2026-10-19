import { useEffect, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { setLicenseKey, vtLicense } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
// import { vtViews } from '@virt-table-pro/views';
// import '@virt-table-pro/views/index.css';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';
import { PRO_DEMO_LICENSE_KEY } from '../../../pro-kit/demo-license';
import { columns, makeRows } from '../../../pro-kit/shared/data';
import { onCellEdit } from '../../../pro-kit/shared/edit-hook';
import type { ProDemoProps } from './shell';
import { REDO_PATHS, UNDO_PATHS } from '../../../pro-kit/shared/icons';
import { Icon } from './Icon';

const EMPTY: HistoryChangeInfo = { canUndo: false, canRedo: false, labels: { undo: [], redo: [] } };

/**
 * 类型注入链路的验证页（React 端）。
 *
 * 这一页的价值在 `pnpm typecheck` 而不是界面：`@virt-table-pro/*` 各包末尾的
 * `declare module '@virt-table/vanilla'` 扩展了 `VirtTablePluginApi`，而 React 的
 * `VirtTableRef extends VirtTablePluginApi`（核心 packages/react/src/index.ts）。
 * 所以下面这些 `tableRef.current!.undo?.()` / `.recordChange?.(...)` / `.refreshLicenseBadge?.()`
 * 能不能过 typecheck，就是这条链路通不通的判据 —— 不通的话这里会红。
 *
 * 与其它 demo 的分工：那些验证**单个插件的行为**（一张表只装一个），
 * 这一张刻意把多个付费插件装在一起，顺带验证它们互不干扰。
 *
 * 2026-08-31：原来还装着 `vtViews`（判据是 `saveView` / `listViews`），命名视图暂不出售后
 * 一并摘掉，恢复清单见 `docs/enterprise/index.md` 的同日注释。
 */
export function TypesDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  // const viewsBtn = useRef<HTMLButtonElement>(null);
  const [rows] = useState(() => makeRows());
  const [history, setHistory] = useState<HistoryChangeInfo>(EMPTY);

  useEffect(() => {
    onCellEdit(({ row, key, before, after, label }) => {
      tableRef.current?.recordChange?.({
        label,
        undo: () => {
          row[key] = before;
          tableRef.current?.forceUpdate();
        },
        redo: () => {
          row[key] = after;
          tableRef.current?.forceUpdate();
        },
      });
    });
    return () => onCellEdit(null);
  }, []);

  return (
    <>
      <div className="pg-toolbar">
        {/* 命名视图暂不出售，两个按钮一并摘掉（2026-08-31）
        <button
          className="pg-btn"
          ref={viewsBtn}
          onClick={() => tableRef.current?.toggleViewPanel?.(viewsBtn.current ?? undefined)}
        >
          视图面板
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const name = prompt('视图名称', tableRef.current?.getCurrentView?.() ?? '我的视图');
            if (!name) return;
            tableRef.current?.saveView?.(name);
            setStatus(`当前视图：${name} · 已保存 ${tableRef.current?.listViews?.().length ?? 0} 个`);
          }}
        >
          保存当前视图
        </button>
        */}
        <button
          className="pg-btn"
          disabled={!history.canUndo}
          title={history.canUndo ? `撤销：${history.labels.undo[0]}` : '没有可撤销的操作'}
          onClick={() => tableRef.current?.undo?.()}
        >
          <Icon paths={UNDO_PATHS} />
          撤销
        </button>
        <button
          className="pg-btn"
          disabled={!history.canRedo}
          onClick={() => tableRef.current?.redo?.()}
        >
          <Icon paths={REDO_PATHS} />
          重做
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            setLicenseKey(PRO_DEMO_LICENSE_KEY);
            tableRef.current?.refreshLicenseBadge?.();
            setStatus(
              `已应用测试许可（${tableRef.current?.getLicenseStatus?.().payload?.sub}），角标应当消失`,
            );
          }}
        >
          应用测试许可
        </button>
      </div>

      <div className="pg-table">
        {/* 三端的 props 形状一致：`columns` + `options`，表格配置都在 options 里 */}
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: rows,
            itemKey: 'id',
            estimatedSize: 40,
            fixedSize: true,
            stripe: true,
            border: true,
            plugins: [
              vtLicense(),
              // vtViews({ storageKey: 'vtp-react-types' }),
              vtUndo({ onChange: setHistory }),
              vtCellEditor(),
            ],
          }}
        />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">
          历史（近 → 远）：{history.labels.undo.join(' ← ') || '空'}
        </div>
      </div>
    </>
  );
}
