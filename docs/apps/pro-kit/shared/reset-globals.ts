import { onCellEdit } from './edit-hook';
import { applyProDemoLicense } from '../demo-license';

/**
 * 切 demo 前复位**模块级单例**。三端的外壳在每次挂载时调它。
 *
 * 从付费仓库 playground 的 `shared/reset-globals.ts` 搬过来。不复位就串味，两样：
 *
 * 1. **许可密钥**。它是模块级单例，一个 demo 注入过之后所有 demo 都是已授权状态 ——
 *    于是「未授权只 warn 不降级」这条最重要的行为悄悄失去验证（`license` demo 全靠它）。
 * 2. **编辑桥接**（`edit-hook.ts`）。它只记一个监听者；`undo` demo 卸载时若没解绑，
 *    留下的闭包指向已销毁的表格，下一个 demo 里编辑金额会打在幽灵上。
 *
 * `setLicenseKey` 是**参数**而不是这里 import 的：本目录三端共用，而付费包是逐 app 装的
 * （完整理由见 `../demo-license.ts` 的注释）。
 */
export interface ResetOptions {
  /**
   * `'apply'`（默认）注入演示密钥；`'reset'` 清成未授权。
   *
   * `license` demo 用 `'reset'` —— 它演示的就是「角标出现 → 注入密钥 → 角标消失」，
   * 一进来就带着密钥的话第一步永远看不到。
   */
  license?: 'apply' | 'reset';
}

export function resetProDemoGlobals(
  setLicenseKey: (key: string | null) => void,
  options: ResetOptions = {},
): void {
  // 先解绑上一个 demo 的编辑监听者，再动别的
  onCellEdit(null);

  if (options.license === 'reset') setLicenseKey(null);
  else applyProDemoLicense(setLicenseKey as (key: string) => void);
}
