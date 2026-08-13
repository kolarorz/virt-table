import React from 'react';
import {
  type FilterModel,
  type VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  VtFilterBuilder,
  type VtFilterBuilderTexts,
} from '@virt-table/vanilla/components';
import type { ReactTableColumn, VirtTableRef } from './index';

/**
 * 筛选管理器（高级筛选条件构建器）的 React 封装。
 *
 * 渲染在表格之外，产出 AND/OR 条件树并作用到表格；与表头快捷筛选是 AND 关系。
 * 传 `tableRef`（指向 <VirtTableReact> 的 ref）即可自动取列并应用筛选。
 */
export interface VirtFilterBuilderProps {
  /** 指向 VirtTableReact 的 ref（推荐）：自动取可见列 + 自动 setFilterModel */
  tableRef?: React.RefObject<VirtTableRef | null>;
  /** 直接传 vanilla 实例（与 tableRef 二选一） */
  table?: VirtTable<Record<string, unknown>> | null;
  /** 手动指定可筛选列（不关联表格时使用） */
  columns?: ReactTableColumn<any>[];
  /** 受控模型；变化时同步进构建器 */
  value?: FilterModel;
  /** 每次改动即时应用（默认 false，需点「应用筛选」） */
  autoApply?: boolean;
  /** 是否显示底部操作栏（默认 true） */
  showFooter?: boolean;
  theme?: 'light' | 'dark';
  texts?: Partial<VtFilterBuilderTexts>;
  className?: string;
  style?: React.CSSProperties;
  /** 条件变化（含编辑中的半成品） */
  onChange?: (model: FilterModel) => void;
  /** 已应用到表格 */
  onApply?: (model: FilterModel) => void;
}

/** ref 暴露的句柄（方法内部转发到 vanilla 实例，未挂载时安全空转） */
export interface VirtFilterBuilderHandle {
  getBuilder: () => VtFilterBuilder | null;
  getModel: () => FilterModel;
  setModel: (model: FilterModel) => void;
  setColumns: (columns: ReactTableColumn<any>[]) => void;
  refresh: () => void;
  apply: () => void;
  clear: () => void;
}

export const VirtFilterBuilderReact = React.forwardRef<VirtFilterBuilderHandle, VirtFilterBuilderProps>(
  function VirtFilterBuilderReact(props, ref) {
    const elRef = React.useRef<HTMLDivElement>(null);
    const builderRef = React.useRef<VtFilterBuilder | null>(null);
    // 回调用 ref 持有最新值，避免因函数身份变化重建实例
    const onChangeRef = React.useRef(props.onChange);
    const onApplyRef = React.useRef(props.onApply);
    onChangeRef.current = props.onChange;
    onApplyRef.current = props.onApply;

    React.useImperativeHandle(
      ref,
      () => ({
        getBuilder: () => builderRef.current,
        getModel: () => builderRef.current?.getModel() ?? null,
        setModel: (model: FilterModel) => builderRef.current?.setModel(model),
        setColumns: (columns: ReactTableColumn<any>[]) =>
          builderRef.current?.setColumns(columns as VirtTableColumn<Record<string, unknown>>[]),
        refresh: () => builderRef.current?.refresh(),
        apply: () => builderRef.current?.apply(),
        clear: () => builderRef.current?.clear(),
      }),
      [],
    );

    const { table, tableRef, autoApply, showFooter, theme, texts } = props;

    React.useEffect(() => {
      if (!elRef.current) return;
      const target = table ?? tableRef?.current?.getTable() ?? undefined;
      const builder = new VtFilterBuilder({
        el: elRef.current,
        table: target ?? undefined,
        columns: props.columns as VirtTableColumn<Record<string, unknown>>[] | undefined,
        model: props.value ?? null,
        autoApply,
        showFooter,
        theme,
        texts,
        onChange: (model) => onChangeRef.current?.(model),
        onApply: (model) => onApplyRef.current?.(model),
      });
      builderRef.current = builder;
      return () => {
        builder.destroy();
        builderRef.current = null;
      };
      // 仅这些配置变化才需要重建实例（value/columns 走下面的增量同步）
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, tableRef, autoApply, showFooter, theme]);

    // 受控模型同步：仅在与内部状态不一致时写入，避免打断编辑
    React.useEffect(() => {
      const builder = builderRef.current;
      if (!builder || props.value === undefined) return;
      if (JSON.stringify(builder.getModel()) === JSON.stringify(props.value)) return;
      builder.setModel(props.value);
    }, [props.value]);

    React.useEffect(() => {
      if (!builderRef.current || !props.columns) return;
      builderRef.current.setColumns(props.columns as VirtTableColumn<Record<string, unknown>>[]);
    }, [props.columns]);

    return React.createElement('div', {
      ref: elRef,
      className: props.className,
      style: props.style,
    });
  },
);

export default VirtFilterBuilderReact;
