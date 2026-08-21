import { useEffect, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { makeColumns, makeRows } from '../../../pro-kit/shared/data';
import type { ProDemoProps } from './shell';

/**
 * 命名视图 demo（React 端）。
 *
 * 那一行 `import '@virt-table-pro/views/index.css'` 是**照客户真实用法写的** ——
 * 付费包的产物里 JS 与 CSS 分开产出，必须自己引。
 *
 * 存储用**自己的 storageKey**：默认 key 是固定的，同一个域下多张表用默认值会互相覆盖
 * —— 三端各一个 key，切框架看 demo 时互不干扰。
 */
export function ViewsDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const panelBtn = useRef<HTMLButtonElement>(null);
  const [{ rows, columns }] = useState(() => ({ rows: makeRows(), columns: makeColumns() }));
  const [saved, setSaved] = useState<string[]>([]);

  /*
   * 实例方法一律走 `?.` —— 桩档（没有付费包）下它们**在运行时确实不存在**，桩的类型声明
   * 也把它们标成可选。文档页在桩档下不会嵌这个 demo（`ProDemo` 换成说明卡），
   * 但微应用能被单独打开（`localhost:7903/?example=pro-views`），那条路要说得清。
   */
  const refresh = (name?: string | null): void => {
    const api = tableRef.current;
    if (!api) return;
    if (!api.listViews) {
      setStatus('付费插件未装载：@virt-table-pro/views 不在（当前是桩档）');
      return;
    }
    const views = api.listViews?.();
    setSaved(views.map((v) => v.name));
    setStatus(
      `当前视图：${name ?? api.getCurrentView?.() ?? '（未应用）'} · 已保存 ${views.length} 个`,
    );
  };

  // 首帧 ref 还没落地，等挂载后读一次
  useEffect(() => refresh(), []);

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          ref={panelBtn}
          onClick={() => tableRef.current?.toggleViewPanel?.(panelBtn.current ?? undefined)}
        >
          视图面板
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const name = prompt('视图名称', tableRef.current?.getCurrentView?.() ?? '我的视图');
            if (!name) return;
            tableRef.current?.saveView?.(name);
            refresh(name);
          }}
        >
          保存视图
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            // 控制台看完整内容；状态栏只放个长度，免得把整串 JSON 糊在界面上
            const json = tableRef.current?.exportViews?.() ?? '';
            console.log('[views] exportViews():', json);
            setStatus(`已导出 ${json.length} 字符到 console`);
          }}
        >
          导出 JSON
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const json = prompt('粘贴视图 JSON（整体替换现有列表）');
            if (!json) return;
            setStatus(
              tableRef.current?.importViews?.(json)
                ? '导入成功'
                : '导入失败：不是合法的视图 JSON',
            );
            refresh();
          }}
        >
          导入 JSON
        </button>
      </div>

      <div className="pg-table">
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
              vtViews({
                storageKey: 'vtp-react-views',
                onViewChange: (name) => refresh(name),
              }),
            ],
          }}
        />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">
          {saved.length ? `已保存：${saved.join(' · ')}` : '还没有保存的视图'}
        </div>
      </div>
    </>
  );
}
