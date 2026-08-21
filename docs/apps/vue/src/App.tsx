import { defineComponent, type PropType } from 'vue';

import BasicTable from './components/basic/Basic.vue';
import BorderTable from './components/basic/Border.vue';
import StripeTable from './components/basic/Stripe.vue';
import EmptyTable from './components/basic/Empty.vue';
import NoHeaderTable from './components/basic/NoHeader.vue';
import HighlightTable from './components/basic/Highlight.vue';
import ResizeTable from './components/basic/Resize.vue';
import FixedTable from './components/basic/Fixed.vue';
import OverflowTable from './components/basic/Overflow.vue';
import WrapTable from './components/basic/Wrap.vue';
import AlignTable from './components/basic/Align.vue';
import ForceUpdateTable from './components/basic/ForceUpdate.vue';
import ReactiveTable from './components/basic/Reactive.vue';
import ThemeTable from './components/basic/Theme.vue';

import ExpandTable from './components/advanced/Expand.vue';
import TreeTable from './components/advanced/Tree.vue';
import SortTable from './components/advanced/Sort.vue';
import GroupTable from './components/advanced/Group.vue';
import GroupTreeTable from './components/advanced/GroupTree.vue';
import CellSelectionTable from './components/plugins/CellSelection.vue';
import SearchTable from './components/plugins/Search.vue';
import FilterTable from './components/plugins/Filter.vue';
import FilterBuilderTable from './components/advanced/FilterBuilder.vue';
import CellsRenderTable from './components/plugins/CellsRender.vue';
import CellTypeRenderTable from './components/cell/CellTypeRender.vue';
import CellRenderLevelsTable from './components/cell/RenderLevels.vue';
import FeatureColumnsTable from './components/feature-columns/FeatureColumns.vue';

import BodyMergeTable from './components/merge/BodyMerge.vue';
import AutoMergeTable from './components/merge/AutoMerge.vue';
import HeaderMergeTable from './components/merge/HeaderMerge.vue';
import HeaderGroupTable from './components/basic/HeaderGroup.vue';
import FooterMergeTable from './components/merge/FooterMerge.vue';
import HeadFootMergeTable from './components/merge/HeadFootMerge.vue';

import InfiniteTable from './components/advanced/Infinite.vue';
import LoadingTable from './components/advanced/Loading.vue';
import SummaryTable from './components/advanced/Summary.vue';
import PinnedTable from './components/advanced/Pinned.vue';
import ValidateTable from './components/advanced/Validate.vue';
import I18nTable from './components/advanced/I18n.vue';
import PaginationClientTable from './components/advanced/PaginationClient.vue';
import PaginationTable from './components/advanced/Pagination.vue';
import ServerDataTable from './components/advanced/ServerData.vue';
import LazyTreeTable from './components/advanced/LazyTree.vue';
import AriaTable from './components/advanced/Aria.vue';
import ContextMenuTable from './components/plugins/ContextMenu.vue';
import ClipboardTable from './components/plugins/Clipboard.vue';
import ColumnDragTable from './components/plugins/ColumnDrag.vue';
import RowDragTable from './components/plugins/RowDrag.vue';
import ColumnVisibilityTable from './components/plugins/ColumnVisibility.vue';
import ToolbarTable from './components/plugins/Toolbar.vue';
import KeyboardTable from './components/plugins/Keyboard.vue';
import ExportTable from './components/plugins/Export.vue';
import PrintTable from './components/plugins/Print.vue';
import RichFilterTable from './components/plugins/RichFilter.vue';
import AIQueryTable from './components/ai/AIQuery.vue';
import AIColumnTable from './components/ai/AIColumn.vue';
import AIStreamTable from './components/ai/AIStream.vue';

import SpreadsheetTable from './components/experimental/Spreadsheet.vue';

import VtInputTable from './components/cell/VtInput.vue';
import VtNumberInputTable from './components/cell/VtNumberInput.vue';
import VtTextareaTable from './components/cell/VtTextarea.vue';
import VtSelectTable from './components/cell/VtSelect.vue';
import VtMultiSelectTable from './components/cell/VtMultiSelect.vue';
import VtPersonTable from './components/cell/VtPerson.vue';
import VtImageTable from './components/cell/VtImage.vue';
import VtCascaderTable from './components/cell/VtCascader.vue';
import VtAutocompleteTable from './components/cell/VtAutocomplete.vue';
import VtDatePickerTable from './components/cell/VtDatePicker.vue';
import VtDateRangePickerTable from './components/cell/VtDateRangePicker.vue';
import VtTimePickerTable from './components/cell/VtTimePicker.vue';
import VtCheckboxTable from './components/cell/VtCheckbox.vue';
import VtSwitchTable from './components/cell/VtSwitch.vue';
import VtRateTable from './components/cell/VtRate.vue';
import VtActionsTable from './components/cell/VtActions.vue';
import VtProgressTable from './components/cell/VtProgress.vue';
import VtTagTable from './components/cell/VtTag.vue';
import VtLinkTable from './components/cell/VtLink.vue';

import ElementPlus from './components/cell/ElementPlus.vue';

import RenderDemo from './components/cell/RenderDemo.vue';

// 付费插件 demo（`pro-*`）自带注册表 —— 加一个只改 pro-demos/index.ts
import { proDemoRegistry } from './pro-demos/index';

const demoMap: Record<string, any> = {
  ...proDemoRegistry,
  'vue-basic': BasicTable,
  'vue-render': RenderDemo,
  'vue-border': BorderTable,
  'vue-stripe': StripeTable,
  'vue-empty': EmptyTable,
  'vue-no-header': NoHeaderTable,
  'vue-highlight': HighlightTable,
  'vue-resize': ResizeTable,
  'vue-fixed': FixedTable,
  'vue-overflow': OverflowTable,
  'vue-wrap': WrapTable,
  'vue-align': AlignTable,
  'vue-force-update': ForceUpdateTable,
  'vue-reactive': ReactiveTable,
  'vue-theme': ThemeTable,
  'vue-expand': ExpandTable,
  'vue-tree': TreeTable,
  'vue-sort': SortTable,
  'vue-group': GroupTable,
  'vue-group-tree': GroupTreeTable,
  'vue-cell-selection': CellSelectionTable,
  'vue-search': SearchTable,
  'vue-filter': FilterTable,
  'vue-filter-builder': FilterBuilderTable,
  'vue-cells-render': CellsRenderTable,
  'vue-cell-type-render': CellTypeRenderTable,
  'vue-cell-render-levels': CellRenderLevelsTable,
  'vue-feature-columns': FeatureColumnsTable,
  'vue-body-merge': BodyMergeTable,
  'vue-auto-merge': AutoMergeTable,
  'vue-header-merge': HeaderMergeTable,
  'vue-header-group': HeaderGroupTable,
  'vue-footer-merge': FooterMergeTable,
  'vue-head-foot-merge': HeadFootMergeTable,
  'vue-infinite': InfiniteTable,
  'vue-loading': LoadingTable,
  'vue-summary': SummaryTable,
  'vue-pinned': PinnedTable,
  'vue-validate': ValidateTable,
  'vue-i18n': I18nTable,
  'vue-pagination-client': PaginationClientTable,
  'vue-pagination': PaginationTable,
  'vue-server-data': ServerDataTable,
  'vue-lazy-tree': LazyTreeTable,
  'vue-aria': AriaTable,
  'vue-context-menu': ContextMenuTable,
  'vue-clipboard': ClipboardTable,
  'vue-column-drag': ColumnDragTable,
  'vue-row-drag': RowDragTable,
  'vue-column-visibility': ColumnVisibilityTable,
  'vue-toolbar': ToolbarTable,
  'vue-keyboard': KeyboardTable,
  'vue-export': ExportTable,
  'vue-print': PrintTable,
  'vue-rich-filter': RichFilterTable,
  'vue-ai-query': AIQueryTable,
  'vue-ai-column': AIColumnTable,
  'vue-ai-stream': AIStreamTable,
  'vue-spreadsheet': SpreadsheetTable,
  'vue-cell-edit': ElementPlus,
  'vue-vt-input': VtInputTable,
  'vue-vt-number-input': VtNumberInputTable,
  'vue-vt-textarea': VtTextareaTable,
  'vue-vt-select': VtSelectTable,
  'vue-vt-multi-select': VtMultiSelectTable,
  'vue-vt-person': VtPersonTable,
  'vue-vt-image': VtImageTable,
  'vue-vt-cascader': VtCascaderTable,
  'vue-vt-autocomplete': VtAutocompleteTable,
  'vue-vt-date-picker': VtDatePickerTable,
  'vue-vt-date-range-picker': VtDateRangePickerTable,
  'vue-vt-time-picker': VtTimePickerTable,
  'vue-vt-checkbox': VtCheckboxTable,
  'vue-vt-switch': VtSwitchTable,
  'vue-vt-rate': VtRateTable,
  'vue-vt-actions': VtActionsTable,
  'vue-vt-progress': VtProgressTable,
  'vue-vt-tag': VtTagTable,
  'vue-vt-link': VtLinkTable,
};

export default defineComponent({
  name: 'App',
  props: {
    exampleId: { type: String as PropType<string>, default: 'vue-basic' },
  },
  setup(props) {
    return () => {
      const Comp = demoMap[props.exampleId] ?? BasicTable;
      return <Comp />;
    };
  },
});
