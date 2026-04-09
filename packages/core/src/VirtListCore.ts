/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ReactiveData,
  SlotSize,
  VirtListOptions,
  VirtListEvents,
  RequiredOptions,
} from './types';
import { DEFAULT_OPTIONS } from './types';

export class VirtListCore<T extends Record<string, any>> {
  readonly state: ReactiveData;
  readonly slotSize: SlotSize;
  readonly sizesMap: Map<string, number> = new Map();

  private _renderList: T[] = [];
  private _props: RequiredOptions<T>;
  private _events: VirtListEvents<T>;
  private _direction: 'forward' | 'backward' = 'backward';
  private _fixOffset = false;
  private _forceFixOffset = false;
  private _abortFixOffset = false;
  private _fixTaskFn: (() => void) | null = null;
  private _clientEl: HTMLElement | null = null;
  private _resizeObserver: ResizeObserver | undefined;
  private _boundOnScroll: (e: Event) => void;

  get renderList(): T[] {
    return this._renderList;
  }

  get resizeObserver(): ResizeObserver | undefined {
    return this._resizeObserver;
  }

  get props(): RequiredOptions<T> {
    return this._props;
  }

  constructor(
    options: VirtListOptions<T>,
    events: VirtListEvents<T> = {},
  ) {
    this._events = events;
    this._boundOnScroll = this._onScroll.bind(this);

    this._props = new Proxy(options as RequiredOptions<T>, {
      get(target, key) {
        return (
          Reflect.get(target, key) ?? Reflect.get(DEFAULT_OPTIONS, key)
        );
      },
    }) as RequiredOptions<T>;

    this.slotSize = {
      clientSize: 0,
      headerSize: 0,
      footerSize: 0,
      stickyHeaderSize: 0,
      stickyFooterSize: 0,
    };

    this.state = {
      views: 0,
      offset: 0,
      listTotalSize: 0,
      virtualSize: 0,
      inViewBegin: 0,
      inViewEnd: 0,
      renderBegin: 0,
      renderEnd: 0,
      bufferTop: 0,
      bufferBottom: 0,
    };

    this._initBuffer();
    this._initResizeObserver();
    this._onListChange();
  }

  // --------------- public API ---------------

  getOffset(): number {
    const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
    return this._clientEl ? this._clientEl[key] : 0;
  }

  getSlotSize(): number {
    return (
      this.slotSize.headerSize +
      this.slotSize.footerSize +
      this.slotSize.stickyHeaderSize +
      this.slotSize.stickyFooterSize
    );
  }

  getTotalSize(): number {
    return this.state.listTotalSize + this.getSlotSize();
  }

  getItemSize(itemKey: string): number {
    if (this._props.fixed) return this._props.minSize + this._props.itemGap;
    return (
      this.sizesMap.get(String(itemKey)) ??
      this._props.minSize + this._props.itemGap
    );
  }

  setItemSize(itemKey: string, size: number): void {
    this.sizesMap.set(String(itemKey), size);
  }

  deleteItemSize(itemKey: string): void {
    this.sizesMap.delete(String(itemKey));
  }

  getItemPosByIndex(index: number): {
    top: number;
    current: number;
    bottom: number;
  } {
    const { minSize, itemGap, fixed } = this._props;
    if (fixed) {
      const unitSize = minSize + itemGap;
      return {
        top: unitSize * index,
        current: unitSize,
        bottom: unitSize * (index + 1),
      };
    }

    const { itemKey, list } = this._props;
    let topReduce = this.slotSize.headerSize;
    for (let i = 0; i <= index - 1; i += 1) {
      topReduce += this.getItemSize(list[i]?.[itemKey]);
    }
    const current = this.getItemSize(list[index]?.[itemKey]);
    return { top: topReduce, current, bottom: topReduce + current };
  }

  scrollToOffset(offset: number): void {
    this._abortFixOffset = true;
    const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
    if (this._clientEl) this._clientEl[key] = offset;
  }

  scrollToIndex(index: number): void {
    if (index < 0) return;
    if (index >= this._props.list.length - 1) {
      this.scrollToBottom();
      return;
    }

    let { top: lastOffset } = this.getItemPosByIndex(index);
    this.scrollToOffset(lastOffset);

    const fixToIndex = () => {
      const { top: offset } = this.getItemPosByIndex(index);
      this.scrollToOffset(offset);
      if (lastOffset !== offset) {
        lastOffset = offset;
        this._fixTaskFn = fixToIndex;
        return;
      }
      this._fixTaskFn = null;
    };
    this._fixTaskFn = fixToIndex;
  }

  scrollIntoView(index: number): void {
    const { top: targetMin, bottom: targetMax } = this.getItemPosByIndex(index);
    const offsetMin = this.getOffset();
    const offsetMax = this.getOffset() + this.slotSize.clientSize;
    const currentSize = this.getItemSize(
      this._props.list[index]?.[this._props.itemKey],
    );

    if (
      targetMin < offsetMin &&
      offsetMin < targetMax &&
      currentSize < this.slotSize.clientSize
    ) {
      this.scrollToOffset(targetMin);
      return;
    }
    if (
      targetMin + this.slotSize.stickyHeaderSize < offsetMax &&
      offsetMax < targetMax + this.slotSize.stickyHeaderSize &&
      currentSize < this.slotSize.clientSize
    ) {
      this.scrollToOffset(
        targetMax - this.slotSize.clientSize + this.slotSize.stickyHeaderSize,
      );
      return;
    }
    if (targetMin + this.slotSize.stickyHeaderSize >= offsetMax) {
      this.scrollToIndex(index);
      return;
    }
    if (targetMax <= offsetMin) {
      this.scrollToIndex(index);
      return;
    }
  }

  scrollToTop(): void {
    let count = 0;
    const loop = () => {
      count += 1;
      this.scrollToOffset(0);
      setTimeout(() => {
        if (count > 10) return;
        const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
        if (this._clientEl && this._clientEl[key] !== 0) {
          loop();
        }
      }, 3);
    };
    loop();
  }

  scrollToBottom(): void {
    let count = 0;
    const loop = () => {
      count += 1;
      this.scrollToOffset(this.getTotalSize());
      setTimeout(() => {
        if (count > 10) return;
        if (
          Math.abs(
            Math.round(this.state.offset + this.slotSize.clientSize) -
              Math.round(this.getTotalSize()),
          ) > 2
        ) {
          loop();
        }
      }, 3);
    };
    loop();
  }

  manualRender(newRenderBegin: number, newRenderEnd: number): void {
    const oldRenderBegin = this.state.renderBegin;
    this.state.renderBegin = newRenderBegin;
    this.state.renderEnd = newRenderEnd;

    if (newRenderBegin > oldRenderBegin) {
      this.state.virtualSize += this._getRangeSize(newRenderBegin, oldRenderBegin);
    } else {
      this.state.virtualSize -= this._getRangeSize(newRenderBegin, oldRenderBegin);
    }

    this._renderList = this._props.list.slice(
      this.state.renderBegin,
      this.state.renderEnd + 1,
    );
    this._updateTotalVirtualSize();
    this._notify();
  }

  reset(): void {
    this.state.offset = 0;
    this.state.listTotalSize = 0;
    this.state.virtualSize = 0;
    this.state.inViewBegin = 0;
    this.state.inViewEnd = 0;
    this.state.renderBegin = 0;
    this.state.renderEnd = 0;
    this.sizesMap.clear();
    this._updateRenderRange();
  }

  deletedList2Top(deletedList: T[]): void {
    this._calcListTotalSize();
    let deletedListSize = 0;
    for (const item of deletedList) {
      deletedListSize += this.getItemSize(item[this._props.itemKey]);
    }
    this._updateTotalVirtualSize();
    this.scrollToOffset(this.state.offset - deletedListSize);
    this._calcRange();
  }

  addedList2Top(addedList: T[]): void {
    this._calcListTotalSize();
    let addedListSize = 0;
    for (const item of addedList) {
      addedListSize += this.getItemSize(item[this._props.itemKey]);
    }
    this._updateTotalVirtualSize();
    this.scrollToOffset(this.state.offset + addedListSize);
    this._forceFixOffset = true;
    this._abortFixOffset = false;
    this._calcRange();
  }

  forceUpdate(): void {
    this._updateRenderRange();
  }

  getReactiveData(): ReactiveData {
    return this.state;
  }

  updateOptions(partial: Partial<VirtListOptions<T>>): void {
    const underlying = this._getUnderlying();
    Object.assign(underlying, partial);

    if ('list' in partial) {
      this._onListChange();
    }

    if ('bufferTop' in partial || 'bufferBottom' in partial || 'buffer' in partial) {
      this._initBuffer();
    }
  }

  bindDOM(clientEl: HTMLElement): void {
    this._clientEl = clientEl;
    clientEl.addEventListener('scroll', this._boundOnScroll);
    this._resizeObserver?.observe(clientEl);

    if (this._props.start) {
      this.scrollToIndex(this._props.start);
    } else if (this._props.offset) {
      this.scrollToOffset(this._props.offset);
    }
  }

  observeSlotEl(el: HTMLElement): void {
    this._resizeObserver?.observe(el);
  }

  unobserveSlotEl(el: HTMLElement): void {
    this._resizeObserver?.unobserve(el);
  }

  resume(): void {
    this.scrollToOffset(this.state.offset);
  }

  destroy(): void {
    if (this._clientEl) {
      this._clientEl.removeEventListener('scroll', this._boundOnScroll);
      this._resizeObserver?.unobserve(this._clientEl);
      this.slotSize.clientSize = 0;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._clientEl = null;
  }

  // --------------- private ---------------

  private _getUnderlying(): Record<string, any> {
    return this._props as unknown as Record<string, any>;
  }

  private _initBuffer(): void {
    this.state.bufferTop = this._props.bufferTop || this._props.buffer;
    this.state.bufferBottom = this._props.bufferBottom || this._props.buffer;
  }

  private _initResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver((entries) => {
      let diff = 0;
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.id;
        if (!id) continue;

        const oldSize = this.getItemSize(id);
        let newSize = 0;

        if (entry.borderBoxSize) {
          const boxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;
          newSize = this._props.horizontal
            ? boxSize.inlineSize
            : boxSize.blockSize;
        } else {
          newSize = this._props.horizontal
            ? entry.contentRect.width
            : entry.contentRect.height;
        }

        if (id === 'client') {
          this.slotSize.clientSize = newSize;
          this._onClientResize();
        } else if (id === 'header') {
          this.slotSize.headerSize = newSize;
        } else if (id === 'footer') {
          this.slotSize.footerSize = newSize;
        } else if (id === 'stickyHeader') {
          this.slotSize.stickyHeaderSize = newSize;
        } else if (id === 'stickyFooter') {
          this.slotSize.stickyFooterSize = newSize;
        } else if (oldSize !== newSize) {
          this.setItemSize(id, newSize);
          diff += newSize - oldSize;
          this._events.itemResize?.(id, newSize);
        }
      }

      this.state.listTotalSize += diff;

      if (this._fixTaskFn) {
        this._fixTaskFn();
      }

      if (
        (this._fixOffset || this._forceFixOffset) &&
        diff !== 0 &&
        !this._abortFixOffset
      ) {
        this._fixOffset = false;
        this._forceFixOffset = false;
        this.scrollToOffset(this.state.offset + diff);
      }
      this._abortFixOffset = false;
    });
  }

  private _onScroll(evt: Event): void {
    this._events.scroll?.(evt);

    const offset = this.getOffset();
    if (offset === this.state.offset) return;

    this._direction = offset < this.state.offset ? 'forward' : 'backward';
    this.state.offset = offset;

    this._calcRange();
    this._judgePosition();
  }

  private _calcViews(): void {
    this.state.views =
      Math.ceil(
        this.slotSize.clientSize / (this._props.minSize + this._props.itemGap),
      ) + 1;
  }

  private _onClientResize(): void {
    this._calcViews();
    this._updateRange(this.state.inViewBegin);
  }

  private _calcListTotalSize(): void {
    if (this._props.fixed) {
      this.state.listTotalSize =
        (this._props.minSize + this._props.itemGap) * this._props.list.length;
      return;
    }
    const { itemKey, list } = this._props;
    let total = 0;
    for (let i = 0; i < list.length; i += 1) {
      total += this.getItemSize(list[i]?.[itemKey]);
    }
    this.state.listTotalSize = total;
  }

  private _updateRange(start: number): void {
    if (start < this.state.inViewBegin) {
      this._fixOffset = true;
    }

    this.state.inViewBegin = start;
    this.state.inViewEnd = Math.min(
      start + this.state.views,
      this._props.list.length - 1,
    );

    this._events.rangeUpdate?.(this.state.inViewBegin, this.state.inViewEnd);
    this._updateRenderRange();
  }

  private _calcRange(): void {
    const { offset, inViewBegin } = this.state;
    const { itemKey, list } = this._props;

    const offsetWithNoHeader = offset - this.slotSize.headerSize;
    let start = inViewBegin;
    let offsetReduce = this._getVirtualSize2beginInView();

    if (offsetWithNoHeader < 0) {
      this._updateRange(0);
      return;
    }

    if (this._direction === 'forward') {
      if (offsetWithNoHeader >= offsetReduce) return;
      for (let i = start - 1; i >= 0; i -= 1) {
        const currentSize = this.getItemSize(list[i]?.[itemKey]);
        offsetReduce -= currentSize;
        if (
          offsetReduce <= offsetWithNoHeader &&
          offsetWithNoHeader < offsetReduce + currentSize
        ) {
          start = i;
          break;
        }
      }
    }

    if (this._direction === 'backward') {
      if (offsetWithNoHeader <= offsetReduce) return;
      for (let i = start; i <= list.length - 1; i += 1) {
        const currentSize = this.getItemSize(list[i]?.[itemKey]);
        if (
          offsetReduce <= offsetWithNoHeader &&
          offsetWithNoHeader < offsetReduce + currentSize
        ) {
          start = i;
          break;
        }
        offsetReduce += currentSize;
      }
      this._fixOffset = false;
    }

    if (start !== this.state.inViewBegin) {
      this._updateRange(start);
    }
  }

  private _judgePosition(): void {
    const threshold = Math.max(this._props.scrollDistance, 2);

    if (this._direction === 'forward') {
      if (this.state.offset - threshold <= 0) {
        this._events.toTop?.(this._props.list[0] as T);
      }
    } else if (this._direction === 'backward') {
      const scrollSize = Math.round(
        this.state.offset + this.slotSize.clientSize,
      );
      const distanceToBottom = Math.round(this.getTotalSize() - scrollSize);
      if (distanceToBottom <= threshold) {
        this._events.toBottom?.(this._props.list[this._props.list.length - 1] as T);
      }
    }
  }

  private _getVirtualSize2beginInView(): number {
    return (
      this.state.virtualSize +
      this._getRangeSize(this.state.renderBegin, this.state.inViewBegin)
    );
  }

  private _getRangeSize(range1: number, range2: number): number {
    const start = Math.min(range1, range2);
    const end = Math.max(range1, range2);
    let total = 0;
    for (let i = start; i < end; i += 1) {
      total += this.getItemSize(this._props.list[i]?.[this._props.itemKey]);
    }
    return total;
  }

  private _updateTotalVirtualSize(): void {
    let offset = 0;
    const first = this.state.renderBegin;
    for (let i = 0; i < first; i++) {
      offset += this.getItemSize(this._props.list[i]?.[this._props.itemKey]);
    }
    this.state.virtualSize = offset;
  }

  private _updateRenderRange(): void {
    const oldRenderBegin = this.state.renderBegin;
    let newRenderBegin = this.state.inViewBegin;
    let newRenderEnd = this.state.inViewEnd;

    newRenderBegin = Math.max(0, newRenderBegin - this.state.bufferTop);
    newRenderEnd = Math.min(
      newRenderEnd + this.state.bufferBottom,
      this._props.list.length - 1 > 0 ? this._props.list.length - 1 : 0,
    );

    if (this._props.renderControl) {
      const ctrl = this._props.renderControl(
        this.state.inViewBegin,
        this.state.inViewEnd,
      );
      newRenderBegin = ctrl.begin;
      newRenderEnd = ctrl.end;
    }

    this.state.renderBegin = newRenderBegin;
    this.state.renderEnd = newRenderEnd;

    if (newRenderBegin > oldRenderBegin) {
      this.state.virtualSize += this._getRangeSize(
        newRenderBegin,
        oldRenderBegin,
      );
    } else {
      this.state.virtualSize -= this._getRangeSize(
        newRenderBegin,
        oldRenderBegin,
      );
    }

    this._renderList = this._props.list.slice(
      this.state.renderBegin,
      this.state.renderEnd + 1,
    );
    this._notify();
  }

  private _onListChange(): void {
    const newLen = this._props.list.length;
    if (newLen <= 0) {
      this.reset();
      return;
    }
    this._calcListTotalSize();
    this._updateRange(this.state.inViewBegin);
    this._updateTotalVirtualSize();
    this._updateRenderRange();
  }

  private _notify(): void {
    this._events.update?.(this._renderList, this.state);
  }
}
