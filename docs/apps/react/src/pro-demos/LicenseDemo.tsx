import { useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { getLicenseStatus, setLicenseKey, vtLicense } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { PRO_DEMO_LICENSE_KEY } from '../../../pro-kit/demo-license';
import { makeColumns, makeRows } from '../../../pro-kit/shared/data';
import type { ProDemoProps } from './shell';

/**
 * 许可校验 demo（React 端）：角标出现 → 注入密钥 → 角标消失。
 *
 * 这里**必须**再装一个付费插件（挑了 vtViews）才看得到角标：`vtLicense` 自己刻意不校验、
 * 不挂角标（只装它而没装任何付费能力时应当完全无痕），校验是各付费插件在 `setup` 里调
 * `guardProduct()` 做的。
 *
 * 密钥是**模块级单例**，壳在每次切 demo 前调 `resetGlobals()` 复位，所以进这个 demo 时
 * 总是未授权状态 —— 与 vanilla 端同一套机制（`shared/reset-globals.ts`）。
 */
export function LicenseDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  // 列定义每个 demo 一份新的：表格会就地改 col.width，共用常量会把上一个 demo 的列宽带过来
  const [{ rows, columns }] = useState(() => ({ rows: makeRows(200), columns: makeColumns() }));

  const render = (): void => {
    const status = getLicenseStatus();
    setStatus(
      status.valid
        ? `已授权：${status.payload?.sub} · 到期 ${status.payload?.exp}`
        : `未授权（${status.message ?? status.reason ?? '没有密钥'}）`,
    );
  };

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          onClick={() => {
            setLicenseKey(PRO_DEMO_LICENSE_KEY);
            // 角标不会自己走：它按 rootEl 记着「这张表上哪些产品未授权」
            tableRef.current?.refreshLicenseBadge?.();
            render();
          }}
        >
          注入测试密钥
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            setLicenseKey(null);
            render();
            setStatus('已清除密钥 —— 角标要等下次装载才会回来（切走再切回来试试）');
          }}
        >
          清除密钥
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            setLicenseKey('VTP1.bogus.bogus');
            const status = getLicenseStatus();
            setStatus(`坏密钥的校验结果：valid=${status.valid} · reason=${status.reason}`);
          }}
        >
          校验一个坏密钥
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
            plugins: [vtLicense(), vtViews({ storageKey: 'vtp-react-license' })],
          }}
        />
      </div>
    </>
  );
}
