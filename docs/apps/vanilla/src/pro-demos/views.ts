import { VirtTable } from '@virt-table/vanilla';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 命名视图 demo（Vanilla 端）：只装 `vtViews`，不装别的付费插件。
 *
 * 那一行 `import '@virt-table-pro/views/index.css'` 是**照客户真实用法写的** ——
 * 付费包的产物里 JS 与 CSS 分开产出，必须自己引。两种档位下它都解析得到
 * （`src` 档指到包的源码 CSS，`off` 档指到一个空文件），见 `build/pro-mode.ts`。
 *
 * 存储用**自己的 storageKey**，与三端其它 demo 都不共享 —— 默认 key 是固定的，
 * 同一个域下多张表用默认值会互相覆盖。
 */
export const viewsDemo: ProDemo = {
  id: 'views',
  mount(host: DemoHost): DemoInstance {
    const table = new VirtTable<Row>(host.tableEl, {
      list: makeRows(),
      columns: makeColumns(),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [
        vtViews({
          storageKey: 'vtp-demo-views',
          onViewChange: (name) => render(name),
        }),
      ],
    });

    const list = document.createElement('div');
    list.className = 'pg-aside-box';
    host.asideEl.appendChild(list);

    /*
     * 实例方法一律走 `?.` —— 桩档（没有付费包）下它们**在运行时确实不存在**，桩的类型
     * 声明也把它们标成可选，逼调用方在这里就把这件事处理掉。
     * 文档页在桩档下压根不会嵌这个 demo（`ProDemo` 会换成说明卡），
     * 但微应用可以被单独打开（`localhost:7901/?example=pro-views`），那条路要说得清。
     */
    function render(viewName?: string | null): void {
      if (!table.listViews) {
        host.setStatus('付费插件未装载：@virt-table-pro/views 不在（当前是桩档）');
        return;
      }
      const current = viewName ?? table.getCurrentView?.() ?? null;
      const views = table.listViews?.();
      host.setStatus(`当前视图：${current ?? '（未应用）'} · 已保存 ${views.length} 个`);
      list.textContent = views.length
        ? `已保存：${views.map((v) => v.name).join(' · ')}`
        : '还没有保存的视图';
    }

    const viewsBtn = host.button('视图面板', (btn) => table.toggleViewPanel?.(btn));
    host.button('保存视图', () => {
      const name = prompt('视图名称', table.getCurrentView?.() ?? '我的视图');
      if (name) {
        table.saveView?.(name);
        render();
      }
    });
    host.button('导出 JSON', () => {
      // 控制台看完整内容；状态栏只放个长度，免得把整串 JSON 糊在界面上
      const json = table.exportViews?.() ?? '';
      console.log('[views] exportViews():', json);
      host.setStatus(`已导出 ${json.length} 字符到 console`);
    });
    host.button('导入 JSON', () => {
      const json = prompt('粘贴视图 JSON（整体替换现有列表）');
      if (json) {
        host.setStatus(table.importViews?.(json) ? '导入成功' : '导入失败：不是合法的视图 JSON');
      }
      render();
    });

    render();
    Object.assign(window, { table, viewsBtn });

    return { destroy: () => table.destroy() };
  },
};
