import './style.css';
import { createRoot, type Root } from 'react-dom/client';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';

let root: Root | null = null;

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
  root?.unmount();
  root = createRoot(container);
  root.render(<App exampleId={props?.exampleId ?? 'react-basic'} />);
}

renderWithQiankun({
  bootstrap: () => Promise.resolve(),
  mount: (props) => {
    render(props);
    return Promise.resolve();
  },
  unmount: () => {
    root?.unmount();
    root = null;
    return Promise.resolve();
  },
  update: (props) => {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
