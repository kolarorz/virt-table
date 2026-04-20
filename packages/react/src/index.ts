import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  VirtTable,
  type VirtTableColumn,
  type VirtTableOptions,
} from '@virt-table/vanilla';

export type { VirtTableOptions, VirtTableColumn } from '@virt-table/vanilla';

export interface ReactTableColumn<T = any>
  extends Omit<VirtTableColumn<T>, 'render' | 'headerRender' | 'cellCoverRender' | 'expandRender'> {
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode | string | HTMLElement;
  headerRender?: (column: ReactTableColumn<T>) => React.ReactNode | string | HTMLElement;
  cellCoverRender?: (value: any, row: T, rowIndex: number, col: ReactTableColumn<T>) => React.ReactNode | HTMLElement | null;
  expandRender?: (col: ReactTableColumn<T>, row: T) => React.ReactNode | string | HTMLElement;
}

type CleanupFn = () => void;

function mountReactNode(node: React.ReactNode): { el: HTMLElement; cleanup: CleanupFn } {
  const container = document.createElement('div');
  container.style.display = 'contents';
  const root = createRoot(container);
  root.render(node);
  return {
    el: container,
    cleanup: () => root.unmount(),
  };
}

function wrapRenderResult(
  result: React.ReactNode | string | HTMLElement,
  cleanups: Map<HTMLElement, CleanupFn>,
): string | HTMLElement {
  if (typeof result === 'string') return result;
  if (result instanceof HTMLElement) return result;
  const { el, cleanup } = mountReactNode(result);
  cleanups.set(el, cleanup);
  return el;
}

function convertColumns<T>(
  columns: ReactTableColumn<T>[],
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
        const { el, cleanup } = mountReactNode(result);
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

export interface VirtTableRef {
  getTable: () => VirtTable<any> | null;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToCell: (row: number, col: number) => void;
  getCheckedRows: () => any[] | undefined;
  clearCheckedRows: () => void;
  setColumnFilter: (key: string, vals: any[]) => void;
  clearAllFilters: () => void;
}

export interface VirtTableProps {
  columns: ReactTableColumn<any>[];
  options: Omit<VirtTableOptions<any>, 'columns'>;
  style?: React.CSSProperties;
  className?: string;
}

export const VirtTableReact = React.forwardRef<VirtTableRef, VirtTableProps>(
  function VirtTableReact(props, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const tableRef = React.useRef<VirtTable<any> | null>(null);
    const cleanupsRef = React.useRef(new Map<HTMLElement, CleanupFn>());

    React.useImperativeHandle(ref, () => ({
      getTable: () => tableRef.current,
      scrollToIndex: (index) => tableRef.current?.scrollToIndex(index),
      scrollToTop: () => tableRef.current?.scrollToTop(),
      scrollToBottom: () => tableRef.current?.scrollToBottom(),
      scrollToCell: (row, col) => tableRef.current?.scrollToCell(row, col),
      getCheckedRows: () => tableRef.current?.getCheckedRows(),
      clearCheckedRows: () => tableRef.current?.clearCheckedRows(),
      setColumnFilter: (key, vals) => tableRef.current?.setColumnFilter(key, vals),
      clearAllFilters: () => tableRef.current?.clearAllFilters(),
    }));

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const cleanups = cleanupsRef.current;
      const jsColumns = convertColumns(props.columns, cleanups);

      const table = new VirtTable(container, {
        ...props.options,
        columns: jsColumns,
        onRowRemoved: (tr) => {
          cleanupRow(tr, cleanups);
          props.options.onRowRemoved?.(tr);
        },
      });

      tableRef.current = table;

      return () => {
        table.destroy();
        tableRef.current = null;
        cleanups.forEach((fn) => fn());
        cleanups.clear();
      };
    }, []);

    React.useEffect(() => {
      if (tableRef.current && props.options.list) {
        tableRef.current.setList(props.options.list);
      }
    }, [props.options.list]);

    return React.createElement('div', {
      ref: containerRef,
      style: { width: '100%', height: '100%', ...props.style },
      className: props.className,
    });
  },
);

export default VirtTableReact;
