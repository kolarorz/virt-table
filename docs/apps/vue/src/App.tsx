import { defineComponent, type PropType } from 'vue';
import BasicTable from './components/BasicTable.vue';
import RenderDemo from './components/RenderDemo.vue';

const demoMap: Record<string, any> = {
  'vue-basic': BasicTable,
  'vue-render': RenderDemo,
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
