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
    renderControl?: (begin: number, end: number) => {
        begin: number;
        end: number;
    };
}
export type RequiredOptions<T extends Record<string, any>> = Required<VirtListOptions<T>>;
export interface VirtListEvents<T extends Record<string, any>> {
    scroll?: (e: Event) => void;
    toTop?: (item: T) => void;
    toBottom?: (item: T) => void;
    itemResize?: (id: string, newSize: number) => void;
    rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
    update?: (renderList: T[], state: ReactiveData) => void;
}
export interface VirtListDOMOptions<T extends Record<string, any>> extends VirtListOptions<T> {
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
export declare const DEFAULT_OPTIONS: {
    readonly itemGap: 0;
    readonly fixed: false;
    readonly buffer: 0;
    readonly bufferTop: 0;
    readonly bufferBottom: 0;
    readonly scrollDistance: 0;
    readonly horizontal: false;
    readonly start: 0;
    readonly offset: 0;
    readonly renderControl: undefined;
};
