import { VirtTable } from '@virt-table/vanilla';
import { getLicenseStatus, setLicenseKey, vtLicense } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { PRO_DEMO_LICENSE_KEY } from '../../../pro-kit/demo-license';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 许可校验 demo：角标出现 → 注入密钥 → 角标消失。
 *
 * 这里**必须**再装一个付费插件（挑了 vtViews）才看得到角标：`vtLicense` 自己
 * 刻意不校验、不挂角标（只装它而没装任何付费能力时它应当完全无痕），
 * 校验是各付费插件在 `setup` 里调 `guardProduct()` 做的。
 *
 * 密钥是**模块级单例**，跨 demo 会串味 —— 外壳每次挂载都复位（`license: 'reset'` 这一档
 * 把它清成未授权），所以进这个 demo 时总是未授权状态。
 */
export const licenseDemo: ProDemo = {
  id: 'license',
  // 一进来必须是**未授权**状态，否则「角标出现 → 注入密钥 → 角标消失」的第一步看不到
  license: 'reset',
  mount(host: DemoHost): DemoInstance {
    const table = new VirtTable<Row>(host.tableEl, {
      list: makeRows(200),
      columns: makeColumns(),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [vtLicense(), vtViews({ storageKey: 'vtp-demo-license' })],
    });

    const render = (): void => {
      const status = getLicenseStatus();
      host.setStatus(
        status.valid
          ? `已授权：${status.payload?.sub} · 到期 ${status.payload?.exp}`
          : `未授权（${status.message ?? status.reason ?? '没有密钥'}）`,
      );
    };

    host.button('注入测试密钥', () => {
      setLicenseKey(PRO_DEMO_LICENSE_KEY);
      table.refreshLicenseBadge?.();
      render();
    });

    host.button('清除密钥', () => {
      setLicenseKey(null);
      // 角标是按 rootEl 记的，清了密钥不会自己回来 —— 重新装载这张表才会再挂一次。
      // 这里直接告诉用户去切一下 demo，比偷偷重建表格更不容易误会。
      render();
      host.setStatus('已清除密钥 —— 角标要等下次装载才会回来（切走再切回来试试）');
    });

    host.button('校验一个坏密钥', () => {
      setLicenseKey('VTP1.bogus.bogus');
      const status = getLicenseStatus();
      host.setStatus(`坏密钥的校验结果：valid=${status.valid} · reason=${status.reason}`);
    });

    render();
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
