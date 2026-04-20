import './style.css';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import {
  bootstrapTableBasic,
  bootstrapTableMerge,
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
  bootstrapTableFooterMerge,
  bootstrapTableHeadFootMerge,
  bootstrapTableCellSelection,
  bootstrapTableSearch,
  bootstrapTableSpreadsheet,
  bootstrapTableCells,
  bootstrapTableFilter,
  bootstrapTable,
} from './components/index.js';

const demoBootstrapMap = {
  table: bootstrapTable,
  'table-basic': bootstrapTableBasic,
  'table-merge': bootstrapTableMerge,
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
  'table-footer-merge': bootstrapTableFooterMerge,
  'table-head-foot-merge': bootstrapTableHeadFootMerge,
  'table-cell-selection': bootstrapTableCellSelection,
  'table-search': bootstrapTableSearch,
  'table-spreadsheet': bootstrapTableSpreadsheet,
  'table-cells': bootstrapTableCells,
  'table-filter': bootstrapTableFilter,
};

let cleanup = null;

function render(props) {
  const root =
    props?.container?.querySelector('#vanilla-root') ??
    document.getElementById('vanilla-root');
  if (!root) return;
  const exampleId = props?.exampleId ?? 'table-basic';
  const bootstrap =
    demoBootstrapMap[exampleId] ?? demoBootstrapMap['table-basic'];
  cleanup?.();
  cleanup = bootstrap(root);
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props) {
    render(props);
    return Promise.resolve();
  },
  unmount() {
    cleanup?.();
    cleanup = null;
    return Promise.resolve();
  },
  update(props) {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
