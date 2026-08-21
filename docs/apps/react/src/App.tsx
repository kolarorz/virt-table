import BasicTable from './components/basic/Basic';
import BorderTable from './components/basic/Border';
import StripeTable from './components/basic/Stripe';
import EmptyTable from './components/basic/Empty';
import NoHeaderTable from './components/basic/NoHeader';
import HighlightTable from './components/basic/Highlight';
import ResizeTable from './components/basic/Resize';
import FixedTable from './components/basic/Fixed';
import OverflowTable from './components/basic/Overflow';
import WrapTable from './components/basic/Wrap';
import AlignTable from './components/basic/Align';
import ForceUpdateTable from './components/basic/ForceUpdate';
import ReactiveTable from './components/basic/Reactive';
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
import CellTypeRenderTable from './components/cell/CellTypeRender';
import CellRenderLevelsTable from './components/cell/RenderLevels';
import FeatureColumnsTable from './components/feature-columns/FeatureColumns';

import BodyMergeTable from './components/merge/BodyMerge';
import AutoMergeTable from './components/merge/AutoMerge';
import HeaderMergeTable from './components/merge/HeaderMerge';
import HeaderGroupTable from './components/basic/HeaderGroup';
import FooterMergeTable from './components/merge/FooterMerge';
import HeadFootMergeTable from './components/merge/HeadFootMerge';

import InfiniteTable from './components/advanced/Infinite';
import LoadingTable from './components/advanced/Loading';
import SummaryTable from './components/advanced/Summary';
import PinnedTable from './components/advanced/Pinned';
import ValidateTable from './components/advanced/Validate';
import I18nTable from './components/advanced/I18n';
import PaginationClientTable from './components/advanced/PaginationClient';
import PaginationTable from './components/advanced/Pagination';
import ServerDataTable from './components/advanced/ServerData';
import LazyTreeTable from './components/advanced/LazyTree';
import AriaTable from './components/advanced/Aria';
import ContextMenuTable from './components/plugins/ContextMenu';
import ClipboardTable from './components/plugins/Clipboard';
import ColumnDragTable from './components/plugins/ColumnDrag';
import RowDragTable from './components/plugins/RowDrag';
import ColumnVisibilityTable from './components/plugins/ColumnVisibility';
import ToolbarTable from './components/plugins/Toolbar';
import KeyboardTable from './components/plugins/Keyboard';
import ExportTable from './components/plugins/Export';
import PrintTable from './components/plugins/Print';
import RichFilterTable from './components/plugins/RichFilter';
import AIQueryTable from './components/ai/AIQuery';
import AIColumnTable from './components/ai/AIColumn';
import AIStreamTable from './components/ai/AIStream';

import SpreadsheetTable from './components/experimental/Spreadsheet';

import VtInputTable from './components/cell/VtInput';
import VtNumberInputTable from './components/cell/VtNumberInput';
import VtTextareaTable from './components/cell/VtTextarea';
import VtSelectTable from './components/cell/VtSelect';
import VtMultiSelectTable from './components/cell/VtMultiSelect';
import VtPersonTable from './components/cell/VtPerson';
import VtImageTable from './components/cell/VtImage';
import VtCascaderTable from './components/cell/VtCascader';
import VtAutocompleteTable from './components/cell/VtAutocomplete';
import VtDatePickerTable from './components/cell/VtDatePicker';
import VtDateRangePickerTable from './components/cell/VtDateRangePicker';
import VtTimePickerTable from './components/cell/VtTimePicker';
import VtCheckboxTable from './components/cell/VtCheckbox';
import VtSwitchTable from './components/cell/VtSwitch';
import VtRateTable from './components/cell/VtRate';
import VtActionsTable from './components/cell/VtActions';
import VtProgressTable from './components/cell/VtProgress';
import VtTagTable from './components/cell/VtTag';
import VtLinkTable from './components/cell/VtLink';

import AntDesign from './components/cell/AntDesign';

import RenderDemo from './components/cell/RenderDemo';
// 付费插件 demo（`pro-*`）自带注册表 —— 加一个只改 pro-demos/index.ts
import { proDemoRegistry } from './pro-demos/index';

const demoMap: Record<string, React.FC> = {
  ...proDemoRegistry,
  'react-basic': BasicTable,
  'react-render': RenderDemo,
  'react-border': BorderTable,
  'react-stripe': StripeTable,
  'react-empty': EmptyTable,
  'react-no-header': NoHeaderTable,
  'react-highlight': HighlightTable,
  'react-resize': ResizeTable,
  'react-fixed': FixedTable,
  'react-overflow': OverflowTable,
  'react-wrap': WrapTable,
  'react-align': AlignTable,
  'react-force-update': ForceUpdateTable,
  'react-reactive': ReactiveTable,
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
  'react-cell-render-levels': CellRenderLevelsTable,
  'react-feature-columns': FeatureColumnsTable,
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
  'react-toolbar': ToolbarTable,
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
  'react-vt-image': VtImageTable,
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
  'react-vt-tag': VtTagTable,
  'react-vt-link': VtLinkTable,
};

export default function App({ exampleId = 'react-basic' }: { exampleId?: string }) {
  const Comp = demoMap[exampleId] ?? BasicTable;
  return <Comp />;
}
