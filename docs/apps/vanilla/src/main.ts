import './style.css';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import {
  bootstrapTableBasic,
  bootstrapTableMerge,
  bootstrapTableAutoMerge,
  bootstrapTableFixed,
  bootstrapTableBorder,
  bootstrapTableStripe,
  bootstrapTableEmpty,
  bootstrapTableNoHeader,
  bootstrapTableHighlight,
  bootstrapTableIndex,
  bootstrapTableCheckbox,
  bootstrapTableResize,
  bootstrapTableOverflow,
  bootstrapTableWrap,
  bootstrapTableAlign,
  bootstrapTableExpand,
  bootstrapTableTree,
  bootstrapTableGroup,
  bootstrapTableGroupTree,
  bootstrapTableHeaderMerge,
  bootstrapTableHeaderGroup,
  bootstrapTableFooterMerge,
  bootstrapTableHeadFootMerge,
  bootstrapTableCellSelection,
  bootstrapTableSearch,
  bootstrapTableAIQuery,
  bootstrapTableAIStream,
  bootstrapTableAiColumn,
  bootstrapTableSpreadsheet,
  bootstrapTableCellsRender,
  bootstrapTableFilter,
  bootstrapTableFilterBuilder,
  bootstrapTableSort,
  bootstrapTableLoading,
  bootstrapTableKeyboard,
  bootstrapTableColumnDrag,
  bootstrapTableRowDrag,
  bootstrapTableSummary,
  bootstrapTableExport,
  bootstrapTableAria,
  bootstrapTableRadio,
  bootstrapTableValidate,
  bootstrapTableColumnVisibility,
  bootstrapTableRichFilter,
  bootstrapTablePinned,
  bootstrapTablePrint,
  bootstrapTableI18n,
  bootstrapTablePagination,
  bootstrapTablePaginationClient,
  bootstrapTableInfinite,
  bootstrapTableServerData,
  bootstrapTableLazyTree,
  bootstrapTableContextMenu,
  bootstrapTableClipboard,
  bootstrapTableForceUpdate,
  bootstrapTableTheme,
  bootstrapTableCellTypeRender,
  bootstrapTableVtInput,
  bootstrapTableVtNumberInput,
  bootstrapTableVtSelect,
  bootstrapTableVtMultiSelect,
  bootstrapTableVtDatePicker,
  bootstrapTableVtDateRangePicker,
  bootstrapTableVtTimePicker,
  bootstrapTableVtTextarea,
  bootstrapTableVtCheckbox,
  bootstrapTableVtSwitch,
  bootstrapTableVtActions,
  bootstrapTableVtProgress,
  bootstrapTableVtRate,
  bootstrapTableVtLink,
  bootstrapTableVtPerson,
  bootstrapTableVtAutocomplete,
  bootstrapTableVtCascader,
  bootstrapTable,
} from './components/index';

type BootstrapFn = (root: HTMLElement) => (() => void) | void;

const demoBootstrapMap: Record<string, BootstrapFn> = {
  table: bootstrapTable,
  'table-basic': bootstrapTableBasic,
  'table-merge': bootstrapTableMerge,
  'table-auto-merge': bootstrapTableAutoMerge,
  'table-fixed': bootstrapTableFixed,
  'table-border': bootstrapTableBorder,
  'table-stripe': bootstrapTableStripe,
  'table-empty': bootstrapTableEmpty,
  'table-no-header': bootstrapTableNoHeader,
  'table-highlight': bootstrapTableHighlight,
  'table-index': bootstrapTableIndex,
  'table-checkbox': bootstrapTableCheckbox,
  'table-resize': bootstrapTableResize,
  'table-overflow': bootstrapTableOverflow,
  'table-wrap': bootstrapTableWrap,
  'table-align': bootstrapTableAlign,
  'table-expand': bootstrapTableExpand,
  'table-tree': bootstrapTableTree,
  'table-group': bootstrapTableGroup,
  'table-group-tree': bootstrapTableGroupTree,
  'table-header-merge': bootstrapTableHeaderMerge,
  'table-header-group': bootstrapTableHeaderGroup,
  'table-footer-merge': bootstrapTableFooterMerge,
  'table-head-foot-merge': bootstrapTableHeadFootMerge,
  'table-cell-selection': bootstrapTableCellSelection,
  'table-search': bootstrapTableSearch,
  'table-ai-query': bootstrapTableAIQuery,
  'table-ai-stream': bootstrapTableAIStream,
  'table-ai-column': bootstrapTableAiColumn,
  'table-spreadsheet': bootstrapTableSpreadsheet,
  'table-cells-render': bootstrapTableCellsRender,
  'table-filter': bootstrapTableFilter,
  'table-filter-builder': bootstrapTableFilterBuilder,
  'table-sort': bootstrapTableSort,
  'table-loading': bootstrapTableLoading,
  'table-keyboard': bootstrapTableKeyboard,
  'table-column-drag': bootstrapTableColumnDrag,
  'table-row-drag': bootstrapTableRowDrag,
  'table-summary': bootstrapTableSummary,
  'table-export': bootstrapTableExport,
  'table-aria': bootstrapTableAria,
  'table-radio': bootstrapTableRadio,
  'table-validate': bootstrapTableValidate,
  'table-column-visibility': bootstrapTableColumnVisibility,
  'table-rich-filter': bootstrapTableRichFilter,
  'table-pinned': bootstrapTablePinned,
  'table-print': bootstrapTablePrint,
  'table-i18n': bootstrapTableI18n,
  'table-pagination': bootstrapTablePagination,
  'table-pagination-client': bootstrapTablePaginationClient,
  'table-infinite': bootstrapTableInfinite,
  'table-server-data': bootstrapTableServerData,
  'table-lazy-tree': bootstrapTableLazyTree,
  'table-context-menu': bootstrapTableContextMenu,
  'table-clipboard': bootstrapTableClipboard,
  'table-force-update': bootstrapTableForceUpdate,
  'table-theme': bootstrapTableTheme,
  'table-cell-type-render': bootstrapTableCellTypeRender,
  'table-vt-input': bootstrapTableVtInput,
  'table-vt-number-input': bootstrapTableVtNumberInput,
  'table-vt-select': bootstrapTableVtSelect,
  'table-vt-multi-select': bootstrapTableVtMultiSelect,
  'table-vt-date-picker': bootstrapTableVtDatePicker,
  'table-vt-date-range-picker': bootstrapTableVtDateRangePicker,
  'table-vt-time-picker': bootstrapTableVtTimePicker,
  'table-vt-textarea': bootstrapTableVtTextarea,
  'table-vt-checkbox': bootstrapTableVtCheckbox,
  'table-vt-switch': bootstrapTableVtSwitch,
  'table-vt-actions': bootstrapTableVtActions,
  'table-vt-progress': bootstrapTableVtProgress,
  'table-vt-rate': bootstrapTableVtRate,
  'table-vt-link': bootstrapTableVtLink,
  'table-vt-person': bootstrapTableVtPerson,
  'table-vt-autocomplete': bootstrapTableVtAutocomplete,
  'table-vt-cascader': bootstrapTableVtCascader,
};

const cleanupMap = new Map<HTMLElement, (() => void) | void>();

interface QiankunProps {
  container?: HTMLElement;
  exampleId?: string;
}

function render(props?: QiankunProps) {
  const container = props?.container;
  const root =
    container?.querySelector('#vanilla-root') ??
    document.getElementById('vanilla-root');
  if (!root) return;
  const exampleId = props?.exampleId ?? 'table-basic';
  const bootstrap =
    demoBootstrapMap[exampleId] ?? demoBootstrapMap['table-basic'];
  const prevCleanup = container ? cleanupMap.get(container) : null;
  if (typeof prevCleanup === 'function') prevCleanup();
  const cleanup = bootstrap(root as HTMLElement);
  if (container) cleanupMap.set(container, cleanup);
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props: QiankunProps) {
    render(props);
    return Promise.resolve();
  },
  unmount(props: QiankunProps) {
    const container = props?.container;
    if (container) {
      const cleanup = cleanupMap.get(container);
      if (typeof cleanup === 'function') cleanup();
      cleanupMap.delete(container);
    }
    return Promise.resolve();
  },
  update(props: QiankunProps) {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（非 qiankun 挂载）时支持 ?example=table-xxx 直接打开某个示例，便于本地调试
  const exampleId = new URLSearchParams(location.search).get('example') ?? undefined;
  render(exampleId ? { exampleId } : undefined);
}
