import './style.css';
import { createRoot, type Root } from 'react-dom/client';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';

const rootMap = new Map<Element, Root>();

function getContainer(props?: { container?: Element }) {
  return (
    props?.container?.querySelector('#react-root') ??
    document.getElementById('react-root') ??
    document.getElementById('root')
  );
}

function render(props?: { container?: Element; exampleId?: string }) {
  const container = getContainer(props);
  if (!container) return;
  const key = props?.container;
  if (key) {
    const prevRoot = rootMap.get(key);
    prevRoot?.unmount();
  }
  const root = createRoot(container);
  root.render(<App exampleId={props?.exampleId ?? 'react-basic'} />);
  if (key) rootMap.set(key, root);
}

renderWithQiankun({
  bootstrap: () => Promise.resolve(),
  mount: (props) => {
    render(props);
    return Promise.resolve();
  },
  unmount: (props) => {
    const key = props?.container;
    if (key) {
      const root = rootMap.get(key);
      root?.unmount();
      rootMap.delete(key);
    }
    return Promise.resolve();
  },
  update: (props) => {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（非 qiankun 挂载）时支持 ?example=xxx 直接打开某个示例，便于本地调试
  const exampleId = new URLSearchParams(location.search).get('example') ?? undefined;
  render(exampleId ? { exampleId } : undefined);
}
