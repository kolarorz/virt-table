import {
  defineComponent,
  h,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
} from 'vue';
import {
  type FilterModel,
  type VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  VtFilterBuilder,
  type VtFilterBuilderTexts,
} from '@virt-table/vanilla/components';
import type { VueTableColumn } from './index';

/**
 * 筛选管理器（高级筛选条件构建器）的 Vue 封装。
 *
 * 渲染在表格之外，产出 AND/OR 条件树并作用到表格；与表头快捷筛选是 AND 关系。
 * 支持 `v-model:model` 双向绑定；传 `table`（VirtTableVue ref 上 getTable() 的结果）
 * 即可自动取列并应用筛选。
 */
export const VirtFilterBuilderVue = defineComponent({
  name: 'VirtFilterBuilder',
  props: {
    /** vanilla 表格实例（通常来自 tableRef.getTable()） */
    table: {
      type: Object as PropType<VirtTable<Record<string, unknown>> | null>,
      default: null,
    },
    /** 手动指定可筛选列（不关联表格时使用） */
    columns: {
      type: Array as PropType<VueTableColumn<any>[]>,
      default: undefined,
    },
    /** v-model:model —— 条件树 */
    model: {
      type: Object as PropType<FilterModel>,
      default: undefined,
    },
    /** 每次改动即时应用（默认 false，需点「应用筛选」） */
    autoApply: { type: Boolean, default: false },
    /** 是否显示底部操作栏（默认 true） */
    showFooter: { type: Boolean, default: true },
    theme: { type: String as PropType<'light' | 'dark'>, default: undefined },
    texts: {
      type: Object as PropType<Partial<VtFilterBuilderTexts>>,
      default: undefined,
    },
  },
  emits: ['update:model', 'change', 'apply'],
  setup(props, { emit, expose }) {
    const elRef = ref<HTMLElement | null>(null);
    let builder: VtFilterBuilder | null = null;

    function create(): void {
      if (!elRef.value) return;
      builder = new VtFilterBuilder({
        el: elRef.value,
        table: props.table ?? undefined,
        columns: props.columns as VirtTableColumn<Record<string, unknown>>[] | undefined,
        model: props.model ?? null,
        autoApply: props.autoApply,
        showFooter: props.showFooter,
        theme: props.theme,
        texts: props.texts,
        onChange: (model) => {
          emit('update:model', model);
          emit('change', model);
        },
        onApply: (model) => emit('apply', model),
      });
    }

    function destroy(): void {
      builder?.destroy();
      builder = null;
    }

    onMounted(create);
    onBeforeUnmount(destroy);

    // 表格实例/开关类配置变化需要重建实例
    watch(
      () => [props.table, props.autoApply, props.showFooter, props.theme],
      () => {
        destroy();
        create();
      },
    );

    // 受控模型同步：仅在与内部状态不一致时写入，避免打断编辑
    watch(
      () => props.model,
      (model) => {
        if (!builder || model === undefined) return;
        if (JSON.stringify(builder.getModel()) === JSON.stringify(model)) return;
        builder.setModel(model);
      },
      { deep: true },
    );

    watch(
      () => props.columns,
      (columns) => {
        if (!builder || !columns) return;
        builder.setColumns(columns as VirtTableColumn<Record<string, unknown>>[]);
      },
    );

    expose({
      getBuilder: () => builder,
      getModel: () => builder?.getModel() ?? null,
      setModel: (model: FilterModel) => builder?.setModel(model),
      setColumns: (columns: VueTableColumn[]) =>
        builder?.setColumns(columns as VirtTableColumn<Record<string, unknown>>[]),
      refresh: () => builder?.refresh(),
      apply: () => builder?.apply(),
      clear: () => builder?.clear(),
    });

    return () => h('div', { ref: elRef });
  },
});

export default VirtFilterBuilderVue;
