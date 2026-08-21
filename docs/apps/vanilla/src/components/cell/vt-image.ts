import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtImage } from '@virt-table/vanilla/components';

interface Row {
  id: number;
  name: string;
  cover: string;
  coverReadonly: string;
  gallery: Array<{ url: string; alt: string }>;
  galleryFull: Array<{ url: string; alt: string }>;
  blueprint: { url: string; alt: string };
  broken: string;
}

/**
 * `VtImage`：缩略图 + 点开查看器。
 *
 * 演示三件事：
 *   1. **取图不在渲染路径上** —— 快滚一屏时图不会边滚边冒出来，停下才逐张出现。那是
 *      刻意的：加载排在空闲期，滚过去的格子被回收后任务直接丢弃（一次请求都不浪费）。
 *   2. **缩略图的尺寸只跟行高走**（组件刻意没有 size 选项，见状态栏那句）。顶部按钮切
 *      `--vt-density-line-height` + `estimatedSize`，缩略图就跟着变大。
 *   3. 单图 / 多图折叠 `+N` / `contain` / 下载 / 坏链兜底 / 纯展示不可点。
 */
export function bootstrapTableVtImage(root: HTMLElement): () => void {
  const rowCount = 5000;

  // 图片用 data URI 生成，免得 demo 依赖外网（真实项目直接给 URL）
  const pic = (color: string, label: string, w: number, h: number): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0f172a"/>` +
        `</linearGradient></defs>` +
        `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
        `<text x="${w / 2}" y="${h / 2 + 18}" font-size="52" font-family="sans-serif" ` +
        `text-anchor="middle" fill="#ffffff">${label}</text>` +
        `<text x="${w / 2}" y="${h - 28}" font-size="24" font-family="sans-serif" ` +
        `text-anchor="middle" fill="#ffffff" opacity="0.75">${w} × ${h}</text></svg>`,
    )}`;

  /** 六张不同比例的图：比例不同才看得出 cover（裁切）与 contain（留白）的区别 */
  const GALLERY = [
    { url: pic('#2563eb', '01', 640, 480), alt: '外观 · 正面' },
    { url: pic('#10b981', '02', 480, 640), alt: '外观 · 侧面' },
    { url: pic('#f59e0b', '03', 800, 450), alt: '细节 · 接口' },
    { url: pic('#ef4444', '04', 600, 600), alt: '细节 · 铭牌' },
    { url: pic('#a855f7', '05', 900, 400), alt: '包装 · 全景' },
  ];

  const list: Row[] = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `商品 ${i}`,
    // 单图：字符串就够（与核心 cellType: 'image' 认的形状一致）
    cover: GALLERY[i % GALLERY.length]!.url,
    // 多图：给对象数组，alt 会进 title、也会显示在查看器底部
    gallery: GALLERY.slice(0, (i % 5) + 1),
    // 同一份图再挂一个键：**列键必须唯一**（逐格渲染、选区、列宽都按 key 认列），
    // 所以「同一批图换个 fit 再演示一次」不能复用 key
    galleryFull: GALLERY.slice(0, (i % 5) + 1),
    coverReadonly: GALLERY[i % GALLERY.length]!.url,
    // 缩略图与原图分开：列表里加载小图，查看器里看大图（这里用同一张演示形状）
    blueprint: { url: GALLERY[(i + 2) % GALLERY.length]!.url, alt: `图纸 ${i}` },
    broken: i % 3 === 0 ? 'https://example.invalid/missing.png' : GALLERY[1]!.url,
  }));

  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 70, align: 'center', fixed: 'left' },
    { key: 'name', title: '名称', width: 120, fixed: 'left' },
    VtImage({ key: 'cover', title: '封面（单图）', width: 110 }),
    VtImage({ key: 'gallery', title: '相册（超 3 张折叠 +N）', width: 190, maxCount: 3 }),
    VtImage({
      key: 'galleryFull',
      title: 'contain · 不折叠',
      width: 240,
      fit: 'contain',
      maxCount: 0,
    }),
    VtImage({ key: 'blueprint', title: '带下载按钮', width: 130, downloadable: true }),
    VtImage({ key: 'broken', title: '坏链兜底', width: 110 }),
    VtImage({ key: 'coverReadonly', title: '纯展示（不可点）', width: 140, viewer: false }),
  ];

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="rowh" type="button">切到高行（缩略图变大）</button>
    <span id="rowhLabel" class="demo-note"></span>
  </div>
  <div id="status" class="status-text"></div>
  <div style="width:900px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  const rowhBtn = root.querySelector('#rowh') as HTMLButtonElement;
  const rowhLabel = root.querySelector('#rowhLabel') as HTMLElement;

  /** 当前档：默认 40px 行（内容高 21）/ 高行 67px（内容高 48） */
  let tall = false;
  let table: VirtTable<Row> | null = null;

  function build(): void {
    table?.destroy();
    /**
     * 改行高要走 `--vt-density-line-height`（而不是 `--vt-line-height`）：`.vt-root` 自己
     * 声明了 `--vt-line-height: var(--vt-density-line-height, 21px)`，直接在外层容器上设
     * `--vt-line-height` 会被 root 自己那条压过去（index.css 密度那段有说明）。
     *
     * 而且**必须同时改 `estimatedSize`**：行高 = 内容高 + 上下内边距 9×2 + 1px 下边框，
     * 48 + 18 + 1 = 67。两者对不上，十万行量级下会滚不到底（AGENTS.md §7.11）。
     */
    container.style.setProperty('--vt-density-line-height', tall ? '48px' : '21px');
    table = new VirtTable<Row>(container, {
      list,
      columns,
      itemKey: 'id',
      estimatedSize: tall ? 67 : 40,
      buffer: 4,
      border: true,
    });
    rowhBtn.textContent = tall ? '↕️ 切回默认行高' : '↕️ 切到高行（缩略图变大）';
    rowhLabel.textContent = tall
      ? '当前：内容高 48px · 行高 67px · estimatedSize 67'
      : '当前：内容高 21px · 行高 40px · estimatedSize 40';
    refresh();
  }

  function refresh(): void {
    statusEl.innerHTML =
      `<b>取图不在渲染路径上</b>：<code>render</code> 只产出灰色占位方框，加载排到空闲期做 —— ` +
      `快滚时几乎不出图（只在空闲间隙加载），停下后从上往下逐行补齐，滚过去的格子被回收就直接丢弃任务。` +
      `解码走 <code>img.decode()</code>，所以插进来的那一帧也不会卡。<br>` +
      `<b>点缩略图弹查看器</b>：滚轮 / <code>+</code> <code>-</code> 缩放 · 拖拽平移 · 双击放大 · ` +
      `旋转 · <code>←</code> <code>→</code> 换图 · <code>Esc</code> / ✕ / 点图外的幕布关闭。` +
      `<code>+N</code> 从被折叠的第一张开始看；<b>多图还有一条底部列表条</b>（一排小图，点一下直达）。<br>` +
      `<b>缩略图没有 size 选项</b>：尺寸恒等于行内容高（当前 ${tall ? '48' : '21'}px），` +
      `写死像素会把行高顶破、与 <code>estimatedSize</code> 对不上。要大图就配高行 —— ` +
      `这颗按钮同时改 <code>--vt-density-line-height</code> 与 <code>estimatedSize</code>（${tall ? '48 / 67' : '21 / 40'}）。`;
  }

  rowhBtn.addEventListener('click', () => {
    tall = !tall;
    build();
  });

  build();

  return () => {
    table?.destroy();
    root.innerHTML = '';
  };
}
