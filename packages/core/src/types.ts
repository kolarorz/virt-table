/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ReactiveData {
  views: number;
  offset: number;
  listTotalSize: number;
  virtualSize: number;
  inViewBegin: number;
  inViewEnd: number;
  renderBegin: number;
  renderEnd: number;
  bufferTop: number;
  bufferBottom: number;
}

export interface SlotSize {
  clientSize: number;
  headerSize: number;
  footerSize: number;
  stickyHeaderSize: number;
  stickyFooterSize: number;
}

export interface VirtListOptions<T extends Record<string, any>> {
  list: T[];
  itemKey: string;
  minSize: number;
  itemGap?: number;
  fixed?: boolean;
  buffer?: number;
  bufferTop?: number;
  bufferBottom?: number;
  horizontal?: boolean;
  scrollDistance?: number;
  start?: number;
  offset?: number;
  renderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };
}

export type RequiredOptions<T extends Record<string, any>> = Required<
  VirtListOptions<T>
>;

export interface VirtListEvents<T extends Record<string, any>> {
  scroll?: (e: Event) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
  update?: (renderList: T[], state: ReactiveData) => void;
}

export interface VirtListDOMOptions<T extends Record<string, any>>
  extends VirtListOptions<T> {
  renderItem: (item: T, index: number) => HTMLElement;
  renderHeader?: () => HTMLElement;
  renderFooter?: () => HTMLElement;
  renderStickyHeader?: () => HTMLElement;
  renderStickyFooter?: () => HTMLElement;
  renderEmpty?: () => HTMLElement;
  onItemMounted?: (el: HTMLElement) => void;
  onItemUnmounted?: (el: HTMLElement) => void;
  listStyle?: string;
  listClass?: string;
  itemStyle?: string | ((item: T, index: number) => string);
  itemClass?: string | ((item: T, index: number) => string);
  headerClass?: string;
  headerStyle?: string;
  footerClass?: string;
  footerStyle?: string;
  stickyHeaderClass?: string;
  stickyHeaderStyle?: string;
  stickyFooterClass?: string;
  stickyFooterStyle?: string;
}

export const DEFAULT_OPTIONS = {
  itemGap: 0,
  fixed: false,
  buffer: 0,
  bufferTop: 0,
  bufferBottom: 0,
  scrollDistance: 0,
  horizontal: false,
  start: 0,
  offset: 0,
  renderControl: undefined,
} as const;
