import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  type AIStreamState,
  vtAIStream,
} from '@virt-table/react';

/**
 * vtAIStream：一边收数据一边渲染，列自己长出来。
 *
 * 这个 demo 模拟的是「agent 跑完一段任务，把结果一行一行吐回来」——
 * 表格初始**没有任何列配置**（`columns: []`），首批数据到达时由
 * `inferColumns()` 推断出列（类型、标题、宽度、对齐都是算出来的）。
 *
 * 换成真实数据源只需替换这个生成器（吃任何 `AsyncIterable`，SSE /
 * `ReadableStream` / 异步生成器都行），再交给 `consumeAIStream()`。
 */
const FIRST_NAMES = ['林', '陈', '王', '李', '张', '刘', '黄', '周', '吴', '徐'];
const GIVEN = ['明', '静', '磊', '娜', '强', '敏', '杰', '芳', '涛', '燕'];
const CITIES = ['上海', '北京', '深圳', '杭州', '成都', '广州', '武汉', '西安'];
const CHANNELS = ['官网', '小程序', '门店', '电话', '第三方平台'];
const STATUS = ['已完成', '处理中', '待审核', '已取消'];

/** 一条「agent 抓回来的」记录。注意 key 是 camelCase，标题由 humanizeKey 推出来 */
function makeRow(i: number) {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  return {
    id: i,
    orderNo: `SO${String(202600000 + i)}`, // 纯数字串：不该被当成数字右对齐
    customerName: FIRST_NAMES[rnd(FIRST_NAMES.length)]! + GIVEN[rnd(GIVEN.length)]!,
    city: CITIES[rnd(CITIES.length)]!,
    channel: CHANNELS[rnd(CHANNELS.length)]!,
    amount: rnd(980000) + 2000, // 数字：应当右对齐 + 千分位
    settled: Math.random() > 0.4, // 布尔：应当居中
    createdAt: new Date(Date.now() - rnd(86400000 * 90)).toISOString().slice(0, 10), // 日期
    status: STATUS[rnd(STATUS.length)]!,
  };
}

// 故意留空 —— 列由 vtAIStream 推断
const columns: ReactTableColumn[] = [];

export default function StreamTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [stat, setStat] = React.useState('');
  const seqRef = React.useRef(0);
  const stoppedRef = React.useRef(true);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const plugins = React.useMemo(
    () => [
      vtAIStream({
        inferOptions: { minWidth: 96 },
        onStateChange(state: AIStreamState) {
          setStat(
            state.status === 'idle'
              ? ''
              : `${state.status} · 已落地 ${state.received.toLocaleString()} 行` +
                  (state.buffered > 0 ? ` · 缓冲 ${state.buffered}` : '') +
                  (state.following ? '' : ' · 已脱离跟随'),
          );
        },
      }),
    ],
    [],
  );

  const stop = React.useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    tableRef.current?.endAIStream();
  }, []);

  /** 模拟「模型逐条吐结果」：每 30~90ms 来 1~6 行，节奏不均匀 */
  const start = (): void => {
    if (!stoppedRef.current && timerRef.current) return;
    stoppedRef.current = false;
    tableRef.current?.startAIStream();
    const step = (): void => {
      if (stoppedRef.current) return;
      const n = 1 + Math.floor(Math.random() * 6);
      tableRef.current?.pushAIStreamRows(Array.from({ length: n }, () => makeRow(seqRef.current++)));
      timerRef.current = setTimeout(step, 30 + Math.random() * 60);
    };
    step();
  };

  React.useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 流式表格</h3>
      <div className="virt-table-controls">
        <button type="button" className="virt-table-btn virt-table-btn-primary" onClick={start}>
          开始接收
        </button>
        <button type="button" className="virt-table-btn" onClick={stop}>
          停止
        </button>
        <button
          type="button"
          className="virt-table-btn"
          // 一次灌很多：验证批量落地不会把一帧撑爆（maxRowsPerFlush 会分批）
          onClick={() =>
            tableRef.current?.pushAIStreamRows(
              Array.from({ length: 20000 }, () => makeRow(seqRef.current++)),
            )
          }
        >
          灌 2 万行
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            stop();
            seqRef.current = 0;
            tableRef.current?.setList([]);
            tableRef.current?.setColumns([]);
            tableRef.current?.startAIStream();
            setStat('');
          }}
        >
          清空重来
        </button>
        <span className="demo-note" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {stat}
        </span>
      </div>
      <div className="demo-hint">
        表格初始<strong>没有列配置</strong>，列是首批数据到达时推断出来的（金额右对齐 +
        千分位、结清居中、订单号虽是数字串但不右对齐）。接收中往上滚会脱离底部跟随，滚回底部自动恢复。
      </div>
      <div style={{ width: '100%', height: 520 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: [],
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            emptyText: '等待数据…点上方「开始接收」',
            plugins,
          }}
        />
      </div>
    </div>
  );
}
