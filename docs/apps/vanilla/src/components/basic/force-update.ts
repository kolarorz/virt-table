import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

const COL_COUNT = 8;
const ROW_COUNT = 1000;

export function bootstrapTableForceUpdate(root: HTMLElement): () => void {
  const columns = Array.from({ length: COL_COUNT }, (_, i) => ({
    key: `col_${i}`,
    title: `列 ${i}`,
    width: 200,
  }));

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      row[`col_${c}`] = faker.lorem.words(6);
    }
    return row;
  });

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-success" id="btnStartAuto">开始自动更新</button>
      <button class="virt-table-btn virt-table-btn-danger" id="btnStopAuto">停止自动更新</button>
    </div>
    <div id="status" class="status-text" style="margin-bottom:8px;"></div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
  });

  let timer: ReturnType<typeof setInterval> | null = null;
  let tick = 0;

  function autoUpdate() {
    list.forEach((item) => {
      item.col_0 = `第${tick}次变更数据：${faker.lorem.words(3)}`;
      item.col_1 = `第${tick}次变更数据：${faker.lorem.words(3)}`;
      item.col_2 = `第${tick}次变更数据：${faker.lorem.words(3)}`;
      item.col_3 = `第${tick}次变更数据：${faker.lorem.words(3)}`;
    });
    table.forceUpdate();
    tick++;
    setStatus(`第 ${tick} 次更新：已调用 forceUpdate()`);
  }

  const btnStart = root.querySelector('#btnStartAuto') as HTMLElement;
  const btnStop = root.querySelector('#btnStopAuto') as HTMLElement;

  const onStart = () => {
    if (timer) return;
    tick = 0;
    autoUpdate();
    timer = setInterval(autoUpdate, 1000);
    setStatus('自动更新已启动（每秒一次）');
  };

  const onStop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    setStatus(`自动更新已停止，共更新 ${tick} 次`);
  };

  btnStart.addEventListener('click', onStart);
  btnStop.addEventListener('click', onStop);

  return () => {
    if (timer) clearInterval(timer);
    btnStart.removeEventListener('click', onStart);
    btnStop.removeEventListener('click', onStop);
    table.destroy();
    root.innerHTML = '';
  };
}
