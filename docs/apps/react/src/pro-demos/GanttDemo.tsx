import { useCallback, useEffect, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtGantt, type GanttZoom } from '@virt-table-pro/gantt';
import '@virt-table-pro/gantt/index.css';
import { makeGanttMarkers } from '../../../pro-kit/shared/gantt-data';
import {
  GANTT_INTRO,
  countBuckets,
  ganttInfoText,
  ganttTableConfig,
  importCnHolidays,
  restoreDemoHolidays,
  type GanttShape,
} from '../../../pro-kit/shared/gantt-demo';
import type { ProDemoProps } from './shell';

/**
 * 甘特图 demo（React 端）。
 *
 * **与 Vanilla 端是同一份配置**（`pro-kit/shared/gantt-demo.ts`）与同一套参数：
 * 固定三层树、3035 行。Vanilla 那一端直接用经典案例「项目管理 WBS」那个示例
 * （`demo-project-wbs`），所以三个框架页签看到的是同一张表 —— 切页签只换实现语言。
 *
 * 形态切换（扁平 / 分组 / 树形）**刻意去掉了**：三端要一致，而经典案例是「一份可以对着
 * 需求抄的完整应用」，不是形态矩阵。共享层仍然支持那三档（`ganttData(shape)`），
 * 只是当前没有 demo 在用。
 */
/** 固定三层树 —— 与经典案例一致 */
const WBS_SHAPE: GanttShape = { group: false, tree: true };

export function GanttDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [markers] = useState(() => makeGanttMarkers());
  const [zoom, setZoom] = useState<GanttZoom>('day');
  /** 有没有导入真实的 2026 年安排（按钮在导入 / 恢复之间轮换） */
  const [cnImported, setCnImported] = useState(false);
  const [info, setInfo] = useState('时间轴未就绪');

  /** 固定三层树（见文件头）。zoom 不进依赖：插件自带的切换器改的是它自己的状态 */
  const [config] = useState(() => makeConfig(WBS_SHAPE, 'day'));

  function makeConfig(nextShape: GanttShape, nextZoom: GanttZoom) {
    return ganttTableConfig({
      // 由这一端注入 —— pro-kit 里不能引付费包的运行时值
      vtGantt,
      shape: nextShape,
      // 与经典案例「项目管理 WBS」同一套参数：3035 行、固定三层树
      scale: { leavesPerPhase: 600, tasksPerModule: 100 },
      zoom: nextZoom,
      markers: makeGanttMarkers(),
      refresh: () => tableRef.current?.refreshGantt?.(),
      setStatus,
      onZoom: (next) => setZoom(next),
      onInfo: () => renderInfo(nextShape, nextZoom),
    });
  }

  const renderInfo = useCallback(
    (currentShape: GanttShape, currentZoom: GanttZoom) => {
      const api = tableRef.current;
      if (!api) return;
      setInfo(
        ganttInfoText({
          shape: currentShape,
          zoom: currentZoom,
          data: config.list,
          range: api.getGanttRange?.() ?? null,
          markerCount: api.getGanttMarkers?.().length ?? 0,
          bucketCount: countBuckets(),
          /*
           * `canReorderRows()` 是核心的**实例方法**，但框架封装的 ref 只转发了一份白名单，
           * 而那份白名单里没有它（React 的 Proxy 只回落到**插件** API，不回落核心方法）。
           * 所以这里降级：拿不到就按形态推 —— 核心的规则是分组 / 树形 / 排序 / 筛选下一律不许换序。
           * 核心把 ref 的转发收敛成「核心实例方法全量透出」之后这段就能删掉
           * （已记进 AGENTS.md 与文档站的「核心侧的已知缺口」）。
           */
          canReorder:
            (api as unknown as { canReorderRows?: () => boolean }).canReorderRows?.() ??
            (!currentShape.group && !currentShape.tree),
        }),
      );
    },
    [config.list],
  );

  useEffect(() => {
    setStatus(GANTT_INTRO);
    renderInfo(WBS_SHAPE, zoom);
    // 首帧读一次；之后由插件的 onRangeChange / onMarkersChange 驱动
  }, [config]);

  return (
    <>
      <div className="pg-toolbar">
        {/*
          * 假期表是**使用方传进来的**（插件不内置任何国家的调休安排 —— 每年由政府发布、
          * 每年不同）。这颗按钮就是「使用方该怎么接」：国办发明电〔2025〕7 号的 2026 年
          * 安排，连补班日一起。
          */}
        <button
          className="pg-btn"
          onClick={() => {
            const api = tableRef.current;
            if (!api) return;
            const next = !cnImported;
            setCnImported(next);
            setStatus(next ? importCnHolidays(api) : restoreDemoHolidays(api));
            renderInfo(WBS_SHAPE, zoom);
          }}
        >
          {cnImported ? '恢复示例假期' : '导入 2026 年中国法定节假日'}
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const api = tableRef.current;
            if (!api) return;
            const on = (api.getGanttMarkers?.().length ?? 0) > 0;
            api.setGanttMarkers?.(on ? [] : markers);
            setStatus(
              on ? '已隐藏里程碑竖线' : `已显示 ${markers.length} 条里程碑竖线（hover 看名字）`,
            );
            renderInfo(WBS_SHAPE, zoom);
          }}
        >
          里程碑竖线开关
        </button>
      </div>

      <div className="pg-table">
        <VirtTableReact
          ref={tableRef}
          columns={config.columns}
          options={{
            list: config.list,
            itemKey: 'id',
            estimatedSize: 40,
            fixedSize: config.fixedSize,
            groupConfig: config.groupConfig,
            border: true,
            stripe: false,
            defaultExpandAll: true,
            plugins: config.plugins,
          }}
        />
      </div>

      <div className="pg-aside">
        {/* 信息行有两行（形态 + 能否换序），默认 white-space 会把 \n 吃掉 */}
        <div className="pg-aside-box" style={{ whiteSpace: 'pre-line' }}>
          {info}
        </div>
      </div>
    </>
  );
}
