/**
 * 给 Demos（经典案例）拍卡片截图 → `docs/public/demos/<slug>.png`
 *
 *   pnpm dev:vanilla            # 另一个终端，微应用 dev 服务（7901）
 *   node scripts/shoot-demos.mjs
 *
 * 为什么对着 dev 服务拍而不是构建产物：`docs/apps/*` 的 vite `base` 只在设了
 * `DEPLOY_BASE` 时才指向 `micro-apps/<fw>/`，本地构建出来的 index.html 里写的是绝对
 * 路径 `/assets/...`，用 `vitepress preview` 服在根路径下那些请求全 404，demo 根本起
 * 不来。dev 模式没这个问题，`main.ts` 还支持 `?example=<id>` 独立渲染（不经 qiankun）。
 *
 * 所有案例都按同一个固定裁剪框（`VIEWPORT.width × shotHeight`）出图 —— 尺寸一致，
 * 画廊里排在一起才不会高低不齐，CSS 那个 `aspect-ratio` 也才能保证 `cover` 不裁东西。
 *
 * 只拍亮色：独立跑微应用时 `--dm-*` 回落到内置亮色值，暗色需要文档站的主题类，
 * 那得走 qiankun 挂载后再切主题，为一张缩略图不值得。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ORIGIN = process.env.DEMO_ORIGIN ?? 'http://localhost:7901';
const CDP_PORT = Number(process.env.CDP_PORT ?? 9412);
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * 截图视口。
 *
 * `scale: 1` 是权衡后的结果：卡片最宽约 600 CSS px，这个宽度的源图在 2 倍屏上刚好够用；
 * 拍 2x 出来是 634 KB/张，为一张缩略图不值得（两张就 1.2 MB 进仓库）。
 * 宽度 1560 是为了让 HR 案例的十来列都进画面 —— 窄到 1240 时右侧固定的「操作」列会紧贴着
 * 被裁断的金额列，缩略图上看着像错版。
 *
 * **1560 × 740 这个比例是和 CSS 对齐的**：`DemosGallery.vue` 里大图与卡片图都写
 * `aspect-ratio: 1560 / 740`，两边一致 `object-fit: cover` 才不会裁掉任何东西。
 * 改这里的数字请同时改那两处，否则缩略图会被裁掉右侧或底部。
 */
const VIEWPORT = { width: 1560, height: 900, scale: 1, shotHeight: 740 };

/** 等 demo 造完数据、渲染完第一帧。造 5000 行 + 头像 data URI 需要一点时间 */
const SETTLE_MS = 2600;

const OUT_DIR = fileURLToPath(new URL('../docs/public/demos/', import.meta.url));

/**
 * 拍哪些案例。与 `docs/.vitepress/demoCases.ts` 的 slug 对齐（那份清单是 TS，
 * 这里不引它 —— 免得为一个脚本给仓库加 ts 运行时依赖）。规划中的案例没有 demo，不在这。
 */
const SHOTS = [
  // 电子表格先往下滚一屏：表格顶部是飞书样例那 12 行，缩略图里更该出现的是 10 万行明细
  // 那一段（胶囊 / 数据条 / 勾选框 / 模块合并都在那儿）
  { slug: 'spreadsheet', exampleId: 'demo-spreadsheet', scrollY: 1400 },
  { slug: 'hr-payroll', exampleId: 'demo-hr-payroll' },
  // 甘特：不滚动 —— 首屏就是「左表格 + 右时间轴」，那正是这个案例要一眼说清的东西
  { slug: 'project-wbs', exampleId: 'demo-project-wbs' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(path, method = 'GET') {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}${path}`, { method });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

/** 一条 WebSocket 上的 CDP 会话（够用就好，不引 puppeteer） */
function session(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let seq = 0;
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    const resolve = pending.get(msg.id);
    if (!resolve) return;
    pending.delete(msg.id);
    resolve(msg.error ? Promise.reject(new Error(msg.error.message)) : msg.result);
  });
  return {
    ready: new Promise((r) => ws.addEventListener('open', r)),
    send: (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      }),
    close: () => ws.close(),
  };
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'vt-shoot-'))}`,
    '--no-first-run',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  // 等 devtools 端口起来
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try {
      await cdp('/json/version');
      up = true;
    } catch {
      await sleep(250);
    }
  }
  if (!up) throw new Error('Chrome 的 devtools 端口没起来');

  mkdirSync(OUT_DIR, { recursive: true });

  for (const shot of SHOTS) {
    const url = `${ORIGIN}/?example=${shot.exampleId}`;
    // `/json/new` 只认 PUT（新版 Chrome 拒绝 GET）
    const target = await cdp(`/json/new?${encodeURIComponent(url)}`, 'PUT');
    const s = session(target.webSocketDebuggerUrl);
    await s.ready;

    await s.send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: VIEWPORT.scale,
      mobile: false,
    });
    await s.send('Page.enable');
    await s.send('Runtime.enable');
    await sleep(SETTLE_MS);

    if (shot.scrollY) {
      // 走合成器手势而不是改 scrollTop：纵向位置归 JS，直接写 scrollTop 是无效的
      await s.send('Input.synthesizeScrollGesture', {
        x: Math.round(VIEWPORT.width / 2),
        y: 420,
        xDistance: 0,
        yDistance: -shot.scrollY,
        speed: 20000,
        gestureSourceType: 'mouse',
      });
      await sleep(700);
    }

    /*
     * 只用来确认 demo 真的起来了（渲染出行了），**不用它算裁剪框**：
     * 裁剪框固定成整个视口，两张图才会是完全一样的尺寸，CSS 里那个 aspect-ratio 才对得上。
     */
    const probe = await s.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('#vanilla-root .vt-tr').length`,
      returnByValue: true,
    });
    if (!probe.result?.value) {
      throw new Error(`${shot.slug}: #vanilla-root 里没有渲染出任何行，demo 没起来？`);
    }
    const clip = { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.shotHeight };

    /*
     * **不要开 `captureBeyondViewport`。**
     *
     * 裁剪框本来就比视口矮（740 < 900），所以它不是必需的；而开着的时候 headless 会为这次
     * 截图重新光栅一遍，**冻结列所在的那一层不参与那次重绘** —— 甘特案例拍出来左半张任务表
     * 整片空白（只有零星一两行有字），页面上却一切正常（真实缩窗、普通截图都好）。
     * 那是截图管道的伪影，不是渲染 bug，不值得为它去改案例。
     */
    const { data } = await s.send('Page.captureScreenshot', {
      format: 'png',
      clip: { ...clip, scale: VIEWPORT.scale },
    });

    const file = join(OUT_DIR, `${shot.slug}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(
      `✓ ${shot.slug}.png  ${clip.width}×${clip.height} @${VIEWPORT.scale}x  ` +
        `${(Buffer.from(data, 'base64').byteLength / 1024).toFixed(0)} KB`,
    );

    s.close();
    // 这个端点回的是 plain text（"Target is closing"），不能当 JSON 解
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);
  }
} finally {
  chrome.kill();
}
