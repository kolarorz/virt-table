/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtListCore } from '@virt-list/core';
import type {
  ReactiveData,
  VirtListDOMOptions,
  VirtListEvents,
} from '@virt-list/core';
import { mergeStyles, applyStyle } from './utils';

export class VirtListDOM<T extends Record<string, any>> {
  private _core: VirtListCore<T>;
  private _options: VirtListDOMOptions<T>;

  private _containerEl: HTMLElement;
  private _clientEl!: HTMLElement;
  private _listEl!: HTMLElement;
  private _virtualEl!: HTMLElement;
  private _stickyHeaderEl: HTMLElement | null = null;
  private _stickyFooterEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _footerEl: HTMLElement | null = null;
  private _emptyEl: HTMLElement | null = null;

  private _itemPool: Map<string, HTMLElement> = new Map();
  private _renderedKeys: string[] = [];
  private _domReady = false;

  get core(): VirtListCore<T> {
    return this._core;
  }

  get state(): ReactiveData {
    return this._core.state;
  }

  constructor(
    container: HTMLElement,
    options: VirtListDOMOptions<T>,
    externalEvents?: VirtListEvents<T>,
  ) {
    this._containerEl = container;
    this._options = options;

    const events: VirtListEvents<T> = {
      scroll: (e) => externalEvents?.scroll?.(e),
      toTop: (item) => externalEvents?.toTop?.(item),
      toBottom: (item) => externalEvents?.toBottom?.(item),
      itemResize: (id, size) => externalEvents?.itemResize?.(id, size),
      rangeUpdate: (begin, end) => externalEvents?.rangeUpdate?.(begin, end),
      update: (renderList, state) => {
        if (this._domReady) {
          this._patch(renderList, state);
        }
        externalEvents?.update?.(renderList, state);
      },
    };

    this._core = new VirtListCore<T>(options, events);
    this._buildDOM();
    this._domReady = true;
    this._patch(this._core.renderList, this._core.state);
    this._core.bindDOM(this._clientEl);

    if (options.renderStickyHeader && this._stickyHeaderEl) {
      this._core.observeSlotEl(this._stickyHeaderEl);
    }
    if (options.renderStickyFooter && this._stickyFooterEl) {
      this._core.observeSlotEl(this._stickyFooterEl);
    }
    if (options.renderHeader && this._headerEl) {
      this._core.observeSlotEl(this._headerEl);
    }
    if (options.renderFooter && this._footerEl) {
      this._core.observeSlotEl(this._footerEl);
    }
  }

  // --------------- public proxy API ---------------

  scrollToIndex(index: number): void {
    this._core.scrollToIndex(index);
  }

  scrollIntoView(index: number): void {
    this._core.scrollIntoView(index);
  }

  scrollToTop(): void {
    this._core.scrollToTop();
  }

  scrollToBottom(): void {
    this._core.scrollToBottom();
  }

  scrollToOffset(offset: number): void {
    this._core.scrollToOffset(offset);
  }

  reset(): void {
    this._core.reset();
  }

  setList(list: T[]): void {
    this._core.updateOptions({ list });
  }

  updateOptions(partial: Partial<VirtListDOMOptions<T>>): void {
    Object.assign(this._options, partial);
    this._core.updateOptions(partial);
  }

  forceUpdate(): void {
    this._core.forceUpdate();
  }

  deletedList2Top(deletedList: T[]): void {
    this._core.deletedList2Top(deletedList);
  }

  addedList2Top(addedList: T[]): void {
    this._core.addedList2Top(addedList);
  }

  destroy(): void {
    if (this._stickyHeaderEl) this._core.unobserveSlotEl(this._stickyHeaderEl);
    if (this._stickyFooterEl) this._core.unobserveSlotEl(this._stickyFooterEl);
    if (this._headerEl) this._core.unobserveSlotEl(this._headerEl);
    if (this._footerEl) this._core.unobserveSlotEl(this._footerEl);

    this._itemPool.forEach((el) => {
      this._core.resizeObserver?.unobserve(el);
      this._options.onItemUnmounted?.(el);
    });
    this._itemPool.clear();

    this._core.destroy();
    this._containerEl.innerHTML = '';
  }

  // --------------- DOM build ---------------

  private _buildDOM(): void {
    const { horizontal } = this._options;

    this._clientEl = document.createElement('div');
    this._clientEl.className = 'virt-list__client';
    applyStyle(this._clientEl, 'width:100%;height:100%;overflow:auto;');
    this._clientEl.dataset.id = 'client';

    if (this._options.renderStickyHeader) {
      this._stickyHeaderEl = document.createElement('div');
      this._stickyHeaderEl.dataset.id = 'stickyHeader';
      if (this._options.stickyHeaderClass) {
        this._stickyHeaderEl.className = this._options.stickyHeaderClass;
      }
      applyStyle(
        this._stickyHeaderEl,
        mergeStyles(
          'position:sticky;z-index:10;',
          horizontal ? 'left:0' : 'top:0',
          this._options.stickyHeaderStyle,
        ),
      );
      this._stickyHeaderEl.appendChild(this._options.renderStickyHeader());
      this._clientEl.appendChild(this._stickyHeaderEl);
    }

    if (this._options.renderHeader) {
      this._headerEl = document.createElement('div');
      this._headerEl.dataset.id = 'header';
      if (this._options.headerClass) {
        this._headerEl.className = this._options.headerClass;
      }
      if (this._options.headerStyle) {
        applyStyle(this._headerEl, this._options.headerStyle);
      }
      this._headerEl.appendChild(this._options.renderHeader());
      this._clientEl.appendChild(this._headerEl);
    }

    this._listEl = document.createElement('div');
    if (this._options.listClass) {
      this._listEl.className = this._options.listClass;
    }

    this._virtualEl = document.createElement('div');
    this._listEl.appendChild(this._virtualEl);

    this._clientEl.appendChild(this._listEl);

    if (this._options.renderFooter) {
      this._footerEl = document.createElement('div');
      this._footerEl.dataset.id = 'footer';
      if (this._options.footerClass) {
        this._footerEl.className = this._options.footerClass;
      }
      if (this._options.footerStyle) {
        applyStyle(this._footerEl, this._options.footerStyle);
      }
      this._footerEl.appendChild(this._options.renderFooter());
      this._clientEl.appendChild(this._footerEl);
    }

    if (this._options.renderStickyFooter) {
      this._stickyFooterEl = document.createElement('div');
      this._stickyFooterEl.dataset.id = 'stickyFooter';
      if (this._options.stickyFooterClass) {
        this._stickyFooterEl.className = this._options.stickyFooterClass;
      }
      applyStyle(
        this._stickyFooterEl,
        mergeStyles(
          'position:sticky;z-index:10;',
          horizontal ? 'right:0' : 'bottom:0',
          this._options.stickyFooterStyle,
        ),
      );
      this._stickyFooterEl.appendChild(this._options.renderStickyFooter());
      this._clientEl.appendChild(this._stickyFooterEl);
    }

    this._containerEl.appendChild(this._clientEl);
  }

  // --------------- incremental DOM patching ---------------

  private _patch(renderList: T[], reactiveData: ReactiveData): void {
    const { itemKey, horizontal, listStyle, itemGap } = this._options;
    const { listTotalSize, virtualSize, renderBegin } = reactiveData;

    const dynamicListStyle = horizontal
      ? `will-change:width;min-width:${listTotalSize}px;display:flex;${listStyle ?? ''}`
      : `will-change:height;min-height:${listTotalSize}px;${listStyle ?? ''}`;
    applyStyle(this._listEl, dynamicListStyle);

    const virtualStyle = horizontal
      ? `width:${virtualSize}px;will-change:width;`
      : `height:${virtualSize}px;will-change:height;`;
    applyStyle(this._virtualEl, virtualStyle);

    const newKeys: string[] = [];
    for (const item of renderList) {
      newKeys.push(String(item[itemKey]));
    }

    const newKeySet = new Set(newKeys);
    for (const key of this._renderedKeys) {
      if (!newKeySet.has(key)) {
        const el = this._itemPool.get(key);
        if (el) {
          this._core.resizeObserver?.unobserve(el);
          this._options.onItemUnmounted?.(el);
          el.remove();
          this._itemPool.delete(key);
        }
      }
    }

    if (renderList.length === 0) {
      if (this._options.renderEmpty && !this._emptyEl) {
        const height =
          this._core.slotSize.clientSize - this._core.getSlotSize();
        this._emptyEl = document.createElement('div');
        applyStyle(this._emptyEl, `height:${height}px`);
        this._emptyEl.appendChild(this._options.renderEmpty());
        this._listEl.appendChild(this._emptyEl);
      }
      this._renderedKeys = [];
      return;
    }

    if (this._emptyEl) {
      this._emptyEl.remove();
      this._emptyEl = null;
    }

    let prevNode: ChildNode = this._virtualEl;
    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i]!;
      const key = String(item[itemKey]);
      let el = this._itemPool.get(key);

      if (!el) {
        el = document.createElement('div');
        el.dataset.id = key;

        const gap = itemGap ?? 0;
        const baseStyle = gap > 0 ? `padding:${gap / 2}px 0;` : '';
        const customStyle =
          typeof this._options.itemStyle === 'function'
            ? this._options.itemStyle(item, renderBegin + i)
            : this._options.itemStyle ?? '';
        applyStyle(el, baseStyle + customStyle);

        const customClass =
          typeof this._options.itemClass === 'function'
            ? this._options.itemClass(item, renderBegin + i)
            : this._options.itemClass ?? '';
        if (customClass) el.className = customClass;

        el.appendChild(this._options.renderItem(item, renderBegin + i));
        this._core.resizeObserver?.observe(el);
        this._options.onItemMounted?.(el);
        this._itemPool.set(key, el);
      }

      const nextSibling = prevNode.nextSibling;
      if (nextSibling !== el) {
        this._listEl.insertBefore(el, nextSibling);
      }
      prevNode = el;
    }

    this._renderedKeys = newKeys;
  }
}
