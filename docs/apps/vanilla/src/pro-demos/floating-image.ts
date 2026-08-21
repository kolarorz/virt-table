import { VirtTable } from '@virt-table/vanilla';
import { vtCellEditor, vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtFloatingImage, type FloatingImage } from '@virt-table-pro/floating-image';
import '@virt-table-pro/floating-image/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 浮动图片 demo。
 *
 * 顺带装了核心的 `vtCellSelection` + `vtCellEditor`（本插件不 `requires` 任何插件）：
 * 图默认压在**冻结列之上、编辑浮层之下**，把图拖到一个可编辑格上再双击那格，
 * 编辑框会浮在图上面 —— 这个层级只有装了编辑器才看得出来。
 */

/** 图用 data URI 生成，免得 playground 依赖外网（真实项目直接给 URL） */
const pic = (label: string, sub: string, color: string, w: number, h: number): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0f172a"/>` +
      `</linearGradient>` +
      `<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">` +
      `<path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.2"/></pattern></defs>` +
      `<rect width="${w}" height="${h}" rx="10" fill="url(#g)"/>` +
      `<rect width="${w}" height="${h}" rx="10" fill="url(#grid)"/>` +
      `<text x="28" y="52" font-size="26" font-family="sans-serif" fill="#ffffff">${label}</text>` +
      `<text x="28" y="${h - 26}" font-size="18" font-family="sans-serif" fill="#ffffff" ` +
      `opacity="0.8">${sub}</text></svg>`,
  )}`;

/** 可交互的那张：起始位置落在第一屏里 */
const PLAN = { id: 'plan', x: 360, y: 120, width: 280 };
/** 锁定的那张（水印）：`locked` + `opacity`，指针事件穿透，底下照常框选与编辑 */
const WATERMARK: FloatingImage = {
  id: 'watermark',
  src: pic('DRAFT · 内部资料', 'locked: true —— 指针事件穿透', '#0f766e', 420, 200),
  x: 520,
  y: 320,
  width: 240,
  opacity: 0.55,
  locked: true,
  alt: '水印：内部资料',
};

export const floatingImageDemo: ProDemo = {
  id: 'floating-image',
  mount(host: DemoHost): DemoInstance {
    const infoBox = document.createElement('div');
    infoBox.className = 'pg-aside-box';
    host.asideEl.appendChild(infoBox);

    /** 手势 → 这块文字。反向（按钮 → 图）走 `updateFloatingImage()`，两条路改同一份状态 */
    const render = (img: FloatingImage, what = '当前'): void => {
      infoBox.textContent =
        `${what}：x=${Math.round(img.x)} / y=${Math.round(img.y)} · ` +
        `宽 ${Math.round(img.width)}${img.height ? ` × 高 ${Math.round(img.height)}` : ''} · ` +
        `${Math.round(img.rotate ?? 0)}°${img.locked ? ' · 已锁定' : ''}`;
    };

    const table = new VirtTable<Row>(host.tableEl, {
      list: makeRows(),
      columns: makeColumns({ editable: true }),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      border: true,
      plugins: [
        vtCellSelection(),
        vtCellEditor({ trigger: 'dblclick' }),
        vtFloatingImage<Row>({
          images: [
            {
              ...PLAN,
              src: pic('现场平面图 · 拖我移动', 'x / y 是全表内容坐标', '#1d4ed8', 520, 300),
              alt: '现场平面图（可拖动）',
            },
            WATERMARK,
          ],
          resizable: true,
          rotatable: true,
          viewer: true,
          downloadable: true,
          onChange: (img, { action, done }) => {
            if (img.id !== PLAN.id) return;
            const what = action === 'move' ? '移动' : action === 'resize' ? '缩放' : '旋转';
            render(img, done ? `${what}结束` : `${what}中`);
            if (done) {
              host.setStatus(
                `${what}结束 —— onChange 的 done:true 就是「该落库了」那一刻：` +
                  `x=${Math.round(img.x)} / y=${Math.round(img.y)} / ${Math.round(img.rotate ?? 0)}°`,
              );
            }
          },
        }),
      ],
    });

    const current = (): FloatingImage =>
      table.getFloatingImages?.().find((i) => i.id === PLAN.id)!;

    host.button('回到起始位置', () => {
      // height: undefined —— 拖过把手后配置里留着算出来的高度，不清掉只改宽会把图拉变形
      table.updateFloatingImage?.(PLAN.id, { ...PLAN, rotate: 0, height: undefined, locked: false });
      render(current(), '已复位');
      host.setStatus('复位：坐标 / 尺寸 / 角度 / 锁定态一起回到初始值');
    });
    host.button('转 15°', () => {
      table.updateFloatingImage?.(PLAN.id, { rotate: (current().rotate ?? 0) + 15 });
      render(current(), '程序化旋转');
    });
    const lockBtn = host.button('锁定 / 解锁', () => {
      const locked = !current().locked;
      table.updateFloatingImage?.(PLAN.id, { locked });
      lockBtn.textContent = locked ? '解锁平面图' : '锁定平面图';
      render(current(), locked ? '已锁定' : '已解锁');
      host.setStatus(
        locked
          ? '锁定：一切交互关掉 + 指针事件穿透，底下的格子照常框选与双击编辑'
          : '解锁：可拖 / 可缩放 / 可旋转 / 可点开看图，代价是它盖住的格子点不到',
      );
    });
    host.button('看大图', () => table.openFloatingImageViewer?.(PLAN.id));
    let extra = 0;
    host.button('再加一张', () => {
      extra += 1;
      // 数组顺序 = 叠放顺序，所以后加的这张盖在前面的图上
      table.addFloatingImage?.({
        id: `extra-${extra}`,
        src: pic(`便签 ${extra}`, '数组顺序 = 叠放顺序', '#b45309', 320, 180),
        x: 200 + extra * 60,
        y: 360 + extra * 40,
        width: 200,
        alt: `便签 ${extra}`,
      });
      host.setStatus(`现在有 ${table.getFloatingImages?.().length} 张浮动图（含锁定的水印）`);
    });

    render(current());
    host.setStatus(
      '按住平面图拖动（拖到容器边缘会自动滚动）· 四角把手缩放（Shift 等比）· ' +
        '顶部圆钮旋转（Shift 吸附 15°）· 点一下看大图',
    );
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
