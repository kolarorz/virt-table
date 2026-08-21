/**
 * `@virt-table-pro/floating-image` 的**桩**（同级目录没有 pro 仓库时由 vite alias 顶上）。
 * 背景与取舍见本目录 README。
 *
 * 桩要做到两件事：
 *   1. **表格照常跑**：返回一个合法插件，`setup` 里只调一次 `stubNotice()`（一行 warn +
 *      视口左下角一条可见提示），**不往表格子树里插任何 DOM**；
 *   2. **类型形状对得上**：本仓库的 `tsconfig` 里 `@virt-table-pro/*` 的 paths **始终**指向桩
 *      （公开仓库的 typecheck 不该要求私有仓库存在），所以 demo 用到的选项与实例方法
 *      都得在这里声明。方法声明成**可选**，逼调用方写 `table.updateFloatingImage?.(…)`
 *      —— 桩生效时它们在运行时确实不存在。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/** 与真包同形（只列 demo 用到的字段） */
export interface FloatingImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  rotate?: number;
  alt?: string;
  opacity?: number;
  locked?: boolean;
}

export type FloatingImageAction = 'move' | 'resize' | 'rotate';

export interface FloatingImageChange {
  action: FloatingImageAction;
  done: boolean;
}

export interface FloatingImageOptions {
  images?: FloatingImage[];
  draggable?: boolean;
  resizable?: boolean;
  rotatable?: boolean;
  viewer?: boolean;
  downloadable?: boolean;
  zIndex?: number;
  edgeZone?: number;
  scrollSpeed?: number;
  onChange?: (image: FloatingImage, change: FloatingImageChange) => void;
}

export function vtFloatingImage<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: FloatingImageOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtFloatingImage',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtFloatingImage');
    },
  };
}

/**
 * 真包用 `declare module` 把实例方法注入 `VirtTablePluginApi`，这里照做一份 —— 否则
 * demo 里 `table.updateFloatingImage?.()` 连类型都没有。**全部可选**：桩生效时它们不存在。
 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    addFloatingImage?(image: FloatingImage): void;
    updateFloatingImage?(id: string, patch: Partial<Omit<FloatingImage, 'id'>>): boolean;
    removeFloatingImage?(id: string): boolean;
    setFloatingImages?(images: FloatingImage[]): void;
    getFloatingImages?(): FloatingImage[];
    openFloatingImageViewer?(id?: string): void;
  }
}
