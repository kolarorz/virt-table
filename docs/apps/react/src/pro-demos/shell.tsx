import { useRef, useState, type ComponentType, type FC } from 'react';
import { setLicenseKey } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
import { resetProDemoGlobals, type ResetOptions } from '../../../pro-kit/shared/reset-globals';
import '../../../pro-kit/shared/pro-demo.css';

/**
 * 把付费插件 demo 接到微应用的示例契约上（React 端）。
 *
 * 微应用这边的契约是**无 props 的组件**（`src/App.tsx` 的 `demoMap`），而付费 demo 要一个
 * `setStatus` 往状态行写字。这个文件就是那层适配，顺带做两件每个付费 demo 都要做的事：
 * 设授权密钥、引入外壳样式。
 *
 * **它是后续搬迁的杠杆**：付费仓库 playground 里还有 6 个 React demo 要搬过来，有了这层
 * 之后每个都是「拷过来、改一行 import、注册一条」。
 *
 * 状态行放在 demo 之后渲染，靠 CSS 的 `order` 排到工具栏下面
 * （见 `pro-kit/shared/pro-demo.css`）—— demo 自己渲染工具栏/表格/补充信息，
 * 让它把状态行插在中间就得给它多一个 props，不值得。
 */
export interface ProDemoProps {
  setStatus: (text: string) => void;
}

export function withProDemoShell(
  Demo: ComponentType<ProDemoProps>,
  options: ResetOptions = {},
): FC {
  return function ProDemoShell() {
    const [status, setStatus] = useState('');
    const didReset = useRef(false);

    /*
     * 复位模块级单例（许可密钥、编辑桥接）。
     *
     * 放在**渲染阶段**而不是 effect 里：demo 的表格是在它自己的 effect / 渲染里建起来的，
     * 而 effect 排在渲染之后 —— 在 effect 里复位就太晚了，密钥还是上一个 demo 留下的，
     * 未授权角标不会出现，而那正是 license demo 要验的东西。
     */
    if (!didReset.current) {
      didReset.current = true;
      resetProDemoGlobals(setLicenseKey, options);
    }

    return (
      <div className="pro-demo-shell">
        <Demo setStatus={setStatus} />
        <div className="pg-status">{status}</div>
      </div>
    );
  };
}
