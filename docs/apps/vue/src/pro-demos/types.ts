import type { VirtTablePluginApi } from '@virt-table/vanilla';
import type { VirtTableVueInstance } from '../virt-table-ref';

/**
 * Vue 端表格实例的类型（含付费插件注入的命令式 API）—— **要自己交叉一层**，这不是懒。
 *
 * React 的 `VirtTableRef extends VirtTablePluginApi`，付费插件的
 * `declare module '@virt-table/vanilla'` 扩展会自动透到 ref 上。
 * Vue 的 `VirtTableVue` 用 `expose(withPluginApi(...))`：**运行时** Proxy 确实把插件 API
 * 透出来了（所以那些方法真的能调），但包里**没有导出**对应的 ref 类型，
 * 于是插件的声明合并到不了它 —— `virt-table-ref.ts` 那份是手写的核心方法清单，
 * 它与 `VirtTablePluginApi` 无关。
 *
 * 核心侧的正确修法（待提）：把 Vue 的 expose 类型收敛成
 * `VirtTableVueInstance extends VirtTablePluginApi` 并从 `@virt-table/vue` 导出，
 * 与 React 端对齐。那之后这个别名就能删掉。
 *
 * 付费插件的方法在 `VirtTablePluginApi` 里是**可选**的（桩档下运行时确实不存在），
 * 所以调用处一律 `?.` —— 这一点三端一致。
 */
export type ProTableInstance = VirtTableVueInstance & VirtTablePluginApi;
