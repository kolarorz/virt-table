import { VirtTable } from '@virt-table/vanilla';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 基线 demo：**一个付费插件都不装**。
 *
 * 它的作用是当对照组 —— 别的 demo 出问题时，先来这里看同样的操作是否正常，
 * 一眼分清「核心的问题」还是「付费插件的问题」。右下角不该有未授权角标，
 * 因为角标是各付费插件 `guardProduct()` 挂的。
 */
export const basicsDemo: ProDemo = {
  id: 'basics',
  mount(host: DemoHost): DemoInstance {
    const table = new VirtTable<Row>(host.tableEl, {
      list: makeRows(),
      columns: makeColumns(),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
    });

    host.setStatus(`${table.getState().columns?.length ?? 0} 列 · 2000 行`);
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
