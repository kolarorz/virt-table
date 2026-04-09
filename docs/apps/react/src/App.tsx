import BasicTable from './components/BasicTable';
import RenderDemo from './components/RenderDemo';

const demoMap: Record<string, React.FC> = {
  'react-basic': BasicTable,
  'react-render': RenderDemo,
};

export default function App({ exampleId = 'react-basic' }: { exampleId?: string }) {
  const Comp = demoMap[exampleId] ?? BasicTable;
  return <Comp />;
}
