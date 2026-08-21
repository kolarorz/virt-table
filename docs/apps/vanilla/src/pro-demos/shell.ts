/**
 * 把付费插件 demo 接到微应用的示例契约上。
 *
 * 微应用这边的契约是 `(root: HTMLElement) => cleanup`（见 `src/main.ts` 的
 * `demoBootstrapMap`），而付费 demo 期望的是一个 `DemoHost`（表格容器 + 按钮栏 +
 * 补充信息区 + 状态行）。这个文件就是那层适配。
 *
 * **它是后续搬迁的杠杆**：付费仓库 playground 里还有 9 个 demo 要搬过来，有了这层之后
 * 每个 demo 都是「拷过来、改一行 import、注册一条」，不需要重写成核心示例的形状。
 *
 * 顺带做了两件每个付费 demo 都要做的事：
 *   1. **复位模块级单例**（`resetProDemoGlobals()`）—— 许可密钥与编辑桥接跨 demo 会串味，
 *      理由见那个文件；
 *   2. **引入外壳样式** —— demo 的 markup 用 `pg-*` 类名，样式收在
 *      `pro-kit/shared/pro-demo.css`（全部限定在 `.pro-demo-shell` 之下，不漏进文档站）。
 */
import { setLicenseKey } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
import { resetProDemoGlobals } from '../../../pro-kit/shared/reset-globals';
import '../../../pro-kit/shared/pro-demo.css';
import type { DemoHost, ProDemo } from './types';

interface Shell {
  host: DemoHost;
  /** 拆掉外壳自己建的 DOM。表格的销毁由 demo 的 `destroy()` 负责，顺序不能颠倒 */
  dispose(): void;
}

function buildShell(root: HTMLElement): Shell {
  const wrap = document.createElement('div');
  wrap.className = 'pro-demo-shell';

  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'pg-toolbar';
  const statusEl = document.createElement('div');
  statusEl.className = 'pg-status';
  const tableEl = document.createElement('div');
  tableEl.className = 'pg-table';
  const asideEl = document.createElement('div');
  asideEl.className = 'pg-aside';

  // 顺序即视觉顺序：按钮栏 → 状态行 → 表格 → 补充信息
  wrap.append(toolbarEl, statusEl, tableEl, asideEl);
  root.appendChild(wrap);

  return {
    host: {
      tableEl,
      toolbarEl,
      asideEl,
      setStatus: (text) => {
        statusEl.textContent = text;
      },
      button: (label, onClick) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pg-btn';
        btn.textContent = label;
        btn.addEventListener('click', () => onClick(btn));
        toolbarEl.appendChild(btn);
        return btn;
      },
      switch: (label, checked, onChange) => {
        const label_ = document.createElement('label');
        label_.className = 'pg-switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.addEventListener('change', () => onChange(input.checked));
        label_.append(input, document.createTextNode(label));
        toolbarEl.appendChild(label_);
        return input;
      },
    },
    dispose: () => {
      wrap.remove();
    },
  };
}

/** `ProDemo` → 微应用的 bootstrap 函数 */
export function proDemoBootstrap(demo: ProDemo): (root: HTMLElement) => () => void {
  return (root: HTMLElement) => {
    resetProDemoGlobals(setLicenseKey, { license: demo.license });

    const shell = buildShell(root);
    const instance = demo.mount(shell.host);

    return () => {
      // 先让 demo 销毁（它的 destroy 里可能还要读自己挂的节点），再拆外壳
      instance.destroy();
      shell.dispose();
    };
  };
}
