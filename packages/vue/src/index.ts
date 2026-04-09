import {
  defineComponent,
  h,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  render as vueRender,
  type PropType,
  type VNode,
} from 'vue';
import {
  VirtTable,
  type VirtTableColumn,
  type VirtTableOptions,
} from '@virt-table/js';

export type { VirtTableOptions, VirtTableColumn } from '@virt-table/js';

export interface VueTableColumn<T = any>
  extends Omit<VirtTableColumn<T>, 'render' | 'headerRender' | 'cellCoverRender' | 'expandRender'> {
  render?: (value: any, row: T, rowIndex: number) => VNode | string | HTMLElement;
  headerRender?: (column: VueTableColumn<T>) => VNode | string | HTMLElement;
  cellCoverRender?: (value: any, row: T, rowIndex: number, col: VueTableColumn<T>) => VNode | HTMLElement | null;
  expandRender?: (col: VueTableColumn<T>, row: T) => VNode | string | HTMLElement;
}

type CleanupFn = () => void;

function mountVNode(vnode: VNode): { el: HTMLElement; cleanup: CleanupFn } {
  const container = document.createElement('div');
  container.style.display = 'contents';
  vueRender(vnode, container);
  return {
    el: container,
    cleanup: () => vueRender(null, container),
  };
}

function wrapRenderResult(
  result: VNode | string | HTMLElement,
  cleanups: Map<HTMLElement, CleanupFn>,
): string | HTMLElement {
  if (typeof result === 'string') return result;
  if (result instanceof HTMLElement) return result;
  const { el, cleanup } = mountVNode(result);
  cleanups.set(el, cleanup);
  return el;
}

function convertColumns<T>(
  columns: VueTableColumn<T>[],
  cleanups: Map<HTMLElement, CleanupFn>,
): VirtTableColumn<T>[] {
  return columns.map((col) => {
    const jsCol: VirtTableColumn<T> = { ...col } as any;

    if (col.render) {
      const userRender = col.render;
      jsCol.render = (value, row, rowIndex) =>
        wrapRenderResult(userRender(value, row, rowIndex), cleanups);
    }

    if (col.headerRender) {
      const userHeaderRender = col.headerRender;
      jsCol.headerRender = (column) =>
        wrapRenderResult(userHeaderRender(column as any), cleanups);
    }

    if (col.cellCoverRender) {
      const userCoverRender = col.cellCoverRender;
      jsCol.cellCoverRender = (value, row, rowIndex, column) => {
        const result = userCoverRender(value, row, rowIndex, column as any);
        if (result == null) return null;
        if (result instanceof HTMLElement) return result;
        const { el, cleanup } = mountVNode(result);
        cleanups.set(el, cleanup);
        return el;
      };
    }

    if (col.expandRender) {
      const userExpandRender = col.expandRender;
      jsCol.expandRender = (column, row) =>
        wrapRenderResult(userExpandRender(column as any, row), cleanups);
    }

    return jsCol;
  });
}

function cleanupRow(tr: HTMLElement, cleanups: Map<HTMLElement, CleanupFn>): void {
  const walker = document.createTreeWalker(tr, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    const fn = cleanups.get(node as HTMLElement);
    if (fn) {
      fn();
      cleanups.delete(node as HTMLElement);
    }
    node = walker.nextNode();
  }
}

export const VirtTableVue = defineComponent({
  name: 'VirtTable',
  props: {
    columns: {
      type: Array as PropType<VueTableColumn<any>[]>,
      required: true,
    },
    options: {
      type: Object as PropType<Omit<VirtTableOptions<any>, 'columns'>>,
      required: true,
    },
  },
  setup(props, { expose }) {
    const containerRef = ref<HTMLElement | null>(null);
    let table: VirtTable<any> | null = null;
    const cleanups = new Map<HTMLElement, CleanupFn>();

    function buildOptions(): VirtTableOptions<any> {
      const jsColumns = convertColumns(props.columns, cleanups);
      return {
        ...props.options,
        columns: jsColumns,
        onRowRemoved: (tr) => {
          cleanupRow(tr, cleanups);
          props.options.onRowRemoved?.(tr);
        },
      };
    }

    onMounted(() => {
      if (!containerRef.value) return;
      table = new VirtTable(containerRef.value, buildOptions());
    });

    onBeforeUnmount(() => {
      if (table) {
        table.destroy();
        table = null;
      }
      cleanups.forEach((fn) => fn());
      cleanups.clear();
    });

    watch(
      () => props.options.list,
      (newList) => {
        if (table && newList) {
          table.setList(newList);
        }
      },
    );

    expose({
      getTable: () => table,
      scrollToIndex: (index: number) => table?.scrollToIndex(index),
      scrollToTop: () => table?.scrollToTop(),
      scrollToBottom: () => table?.scrollToBottom(),
      scrollToCell: (row: number, col: number) => table?.scrollToCell(row, col),
      getCheckedRows: () => table?.getCheckedRows(),
      clearCheckedRows: () => table?.clearCheckedRows(),
      setColumnFilter: (key: string, vals: any[]) => table?.setColumnFilter(key, vals),
      clearAllFilters: () => table?.clearAllFilters(),
    });

    return () =>
      h('div', {
        ref: containerRef,
        style: { width: '100%', height: '100%' },
      });
  },
});

export default VirtTableVue;
