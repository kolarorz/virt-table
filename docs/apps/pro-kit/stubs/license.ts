/**
 * `@virt-table-pro/license` 的**桩**（`off` 档下由 vite alias 顶上）。
 * 背景与取舍见上一级目录的 README。
 *
 * 真包做两件事：把授权范围如实解析出来，以及超范围时明确说出原因（一行 `console.warn`
 * + 右下角角标）。桩只需让类型对得上、让 demo 跑得起来。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/** 密钥 payload。桩里只列 demo 会读的字段 */
export interface LicensePayload {
  sub: string;
  products: string[] | '*';
  domains?: string[];
  exp: string;
  seats?: number;
  iat: string;
}

/** `verifyLicense` / `getLicenseStatus` 的返回。**从不抛异常**，失败靠 `reason` 说明 */
export interface LicenseResult {
  valid: boolean;
  payload?: LicensePayload;
  reason?:
    | 'missing'
    | 'malformed'
    | 'unsupported-version'
    | 'bad-checksum'
    | 'expired'
    | 'domain-mismatch';
  message?: string;
}

let lastKey = '';

/** 真包里这是把密钥存进模块级单例；桩没有插件要校验，只需记下来供排障 */
export function setLicenseKey(key: string | null | undefined): void {
  if (key) lastKey = key;
}

export function getLicenseKey(): string | null {
  return lastKey || null;
}

/**
 * 桩里永远返回「没有设置密钥」。
 *
 * 刻意**不**假装校验通过：demo 里那些「看角标在不在」的路径在桩档下本来就走不通，
 * 返回一个 `valid: true` 只会让读者以为看到了真实行为。
 */
export function getLicenseStatus(): LicenseResult {
  return { valid: false, reason: 'missing', message: '桩：付费包不在，未做任何校验' };
}

export interface LicenseOptions {
  /** 密钥。与模块级的 `setLicenseKey()` 等价，选一种即可 */
  key?: string;
}

/**
 * 可选插件：顺手在 `plugins` 里设密钥，并把许可状态透到实例上。
 * 它自己**既不校验也不挂角标** —— 那是各付费插件在 `setup` 里做的。
 */
export function vtLicense<T extends Record<string, unknown> = Record<string, unknown>>(
  options: LicenseOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtLicense',
    setup(_ctx: PluginContext<T>) {
      if (options.key) setLicenseKey(options.key);
      stubNotice('vtLicense');
    },
  };
}

/** @internal 桩自己的排障出口，真包没有这个导出 —— 只在桩里用 */
export function __stubLicenseKey(): string {
  return lastKey;
}

/** 真包用 `declare module` 注入这些方法 —— **全部可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 当前许可状态（装了 `vtLicense` 才有） */
    getLicenseStatus?(): LicenseResult;
    /** 换了新密钥之后移除未授权角标（角标不会自己走） */
    refreshLicenseBadge?(): void;
  }
}
