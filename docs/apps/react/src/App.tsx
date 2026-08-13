import BasicTable from './components/basic/Basic';
import BorderTable from './components/basic/Border';
import StripeTable from './components/basic/Stripe';
import EmptyTable from './components/basic/Empty';
import NoHeaderTable from './components/basic/NoHeader';
import HighlightTable from './components/basic/Highlight';
import IndexColTable from './components/basic/IndexCol';
import CheckboxTable from './components/basic/Checkbox';
import ResizeTable from './components/basic/Resize';
import FixedTable from './components/basic/Fixed';
import OverflowTable from './components/basic/Overflow';
import WrapTable from './components/basic/Wrap';
import AlignTable from './components/basic/Align';
import ForceUpdateTable from './components/basic/ForceUpdate';
import ThemeTable from './components/basic/Theme';

import ExpandTable from './components/advanced/Expand';
import TreeTable from './components/advanced/Tree';
import SortTable from './components/advanced/Sort';
import GroupTable from './components/advanced/Group';
import GroupTreeTable from './components/advanced/GroupTree';
import CellSelectionTable from './components/plugins/CellSelection';
import SearchTable from './components/plugins/Search';
import FilterTable from './components/plugins/Filter';
import FilterBuilderTable from './components/advanced/FilterBuilder';
import CellsRenderTable from './components/plugins/CellsRender';
import CellTypeRenderTable from './components/advanced/CellTypeRender';

import BodyMergeTable from './components/merge/BodyMerge';
import AutoMergeTable from './components/merge/AutoMerge';
import HeaderMergeTable from './components/merge/HeaderMerge';
import HeaderGroupTable from './components/basic/HeaderGroup';
import FooterMergeTable from './components/merge/FooterMerge';
import HeadFootMergeTable from './components/merge/HeadFootMerge';

import InfiniteTable from './components/feature/Infinite';
import LoadingTable from './components/feature/Loading';
import SummaryTable from './components/feature/Summary';
import PinnedTable from './components/feature/Pinned';
import RadioTable from './components/feature/Radio';
import ValidateTable from './components/feature/Validate';
import I18nTable from './components/feature/I18n';
import PaginationClientTable from './components/feature/PaginationClient';
import PaginationTable from './components/feature/Pagination';
import ServerDataTable from './components/feature/ServerData';
import LazyTreeTable from './components/feature/LazyTree';
import AriaTable from './components/feature/Aria';
import ContextMenuTable from './components/plugins/ContextMenu';
import ClipboardTable from './components/plugins/Clipboard';
import ColumnDragTable from './components/plugins/ColumnDrag';
import RowDragTable from './components/plugins/RowDrag';
import ColumnVisibilityTable from './components/plugins/ColumnVisibility';
import KeyboardTable from './components/plugins/Keyboard';
import ExportTable from './components/plugins/Export';
import PrintTable from './components/plugins/Print';
import RichFilterTable from './components/plugins/RichFilter';
import AIQueryTable from './components/plugins/AIQuery';
import AIColumnTable from './components/plugins/AIColumn';
import AIStreamTable from './components/plugins/AIStream';

import SpreadsheetTable from './components/experimental/Spreadsheet';

import VtInputTable from './components/column/VtInput';
import VtNumberInputTable from './components/column/VtNumberInput';
import VtTextareaTable from './components/column/VtTextarea';
import VtSelectTable from './components/column/VtSelect';
import VtMultiSelectTable from './components/column/VtMultiSelect';
import VtPersonTable from './components/column/VtPerson';
import VtCascaderTable from './components/column/VtCascader';
import VtAutocompleteTable from './components/column/VtAutocomplete';
import VtDatePickerTable from './components/column/VtDatePicker';
import VtDateRangePickerTable from './components/column/VtDateRangePicker';
import VtTimePickerTable from './components/column/VtTimePicker';
import VtCheckboxTable from './components/column/VtCheckbox';
import VtSwitchTable from './components/column/VtSwitch';
import VtRateTable from './components/column/VtRate';
import VtActionsTable from './components/column/VtActions';
import VtProgressTable from './components/column/VtProgress';
import VtLinkTable from './components/column/VtLink';

import AntDesign from './components/third-party/AntDesign';

import RenderDemo from './components/RenderDemo';

const demoMap: Record<string, React.FC> = {
  'react-basic': BasicTable,
  'react-render': RenderDemo,
  'react-border': BorderTable,
  'react-stripe': StripeTable,
  'react-empty': EmptyTable,
  'react-no-header': NoHeaderTable,
  'react-highlight': HighlightTable,
  'react-index': IndexColTable,
  'react-checkbox': CheckboxTable,
  'react-resize': ResizeTable,
  'react-fixed': FixedTable,
  'react-overflow': OverflowTable,
  'react-wrap': WrapTable,
  'react-align': AlignTable,
  'react-force-update': ForceUpdateTable,
  'react-theme': ThemeTable,
  'react-expand': ExpandTable,
  'react-tree': TreeTable,
  'react-sort': SortTable,
  'react-group': GroupTable,
  'react-group-tree': GroupTreeTable,
  'react-cell-selection': CellSelectionTable,
  'react-search': SearchTable,
  'react-filter': FilterTable,
  'react-filter-builder': FilterBuilderTable,
  'react-cells-render': CellsRenderTable,
  'react-cell-type-render': CellTypeRenderTable,
  'react-body-merge': BodyMergeTable,
  'react-auto-merge': AutoMergeTable,
  'react-header-merge': HeaderMergeTable,
  'react-header-group': HeaderGroupTable,
  'react-footer-merge': FooterMergeTable,
  'react-head-foot-merge': HeadFootMergeTable,
  'react-infinite': InfiniteTable,
  'react-loading': LoadingTable,
  'react-summary': SummaryTable,
  'react-pinned': PinnedTable,
  'react-radio': RadioTable,
  'react-validate': ValidateTable,
  'react-i18n': I18nTable,
  'react-pagination-client': PaginationClientTable,
  'react-pagination': PaginationTable,
  'react-server-data': ServerDataTable,
  'react-lazy-tree': LazyTreeTable,
  'react-aria': AriaTable,
  'react-context-menu': ContextMenuTable,
  'react-clipboard': ClipboardTable,
  'react-column-drag': ColumnDragTable,
  'react-row-drag': RowDragTable,
  'react-column-visibility': ColumnVisibilityTable,
  'react-keyboard': KeyboardTable,
  'react-export': ExportTable,
  'react-print': PrintTable,
  'react-rich-filter': RichFilterTable,
  'react-ai-query': AIQueryTable,
  'react-ai-column': AIColumnTable,
  'react-ai-stream': AIStreamTable,
  'react-spreadsheet': SpreadsheetTable,
  'react-cell-edit': AntDesign,
  'react-vt-input': VtInputTable,
  'react-vt-number-input': VtNumberInputTable,
  'react-vt-textarea': VtTextareaTable,
  'react-vt-select': VtSelectTable,
  'react-vt-multi-select': VtMultiSelectTable,
  'react-vt-person': VtPersonTable,
  'react-vt-cascader': VtCascaderTable,
  'react-vt-autocomplete': VtAutocompleteTable,
  'react-vt-date-picker': VtDatePickerTable,
  'react-vt-date-range-picker': VtDateRangePickerTable,
  'react-vt-time-picker': VtTimePickerTable,
  'react-vt-checkbox': VtCheckboxTable,
  'react-vt-switch': VtSwitchTable,
  'react-vt-rate': VtRateTable,
  'react-vt-actions': VtActionsTable,
  'react-vt-progress': VtProgressTable,
  'react-vt-link': VtLinkTable,
};

export default function App({ exampleId = 'react-basic' }: { exampleId?: string }) {
  const Comp = demoMap[exampleId] ?? BasicTable;
  return <Comp />;
}
