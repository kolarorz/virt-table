// @vitest-environment happy-dom
/**
 * 取图队列（`_image-loader.ts`）的行为测试。
 *
 * 这里守的是「加载图片不影响主线程渲染」的四条机制：出队顺序、并发上限、回收即弃、坏链不重试。
 * 它们全都**看不见**（正常路径下用户只觉得「图出来了」），所以只能在这一层钉住 ——
 * 顺序错了不会报错，只是图从最后一行往上冒；丢掉 `alive()` 检查也不会报错，只是快滚时白干一堆活。
 *
 * `imageIO.load` 被换成可控的假实现：happy-dom 没有网络、也没有
 * `HTMLImageElement.decode`，真实现在这里永远不会 settle。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { imageIO, requestImage, flushImageQueue, resetImageLoader } from './_image-loader';

const realLoad = imageIO.load;

afterEach(() => {
  imageIO.load = realLoad;
  resetImageLoader();
});

const anImg = (): HTMLImageElement => document.createElement('img');

/** 让出一帧 —— 队列按帧分批（同一帧进队的算一批），所以「换一批」就是等一帧 */
const nextFrame = (): Promise<void> =>
  new Promise((r) => requestAnimationFrame(() => r()));

/** 立即成败的假取图，返回被请求过的 URL 列表（顺序即出队顺序） */
function stubIO(fails: readonly string[] = []): string[] {
  const calls: string[] = [];
  imageIO.load = (url) => {
    calls.push(url);
    return fails.includes(url) ? Promise.reject(new Error('boom')) : Promise.resolve(anImg());
  };
  return calls;
}

/** 挂着不 settle 的假取图，`resolvers[i]()` 手动放行第 i 个 */
function deferredIO(): { calls: string[]; resolvers: Array<(img: HTMLImageElement) => void> } {
  const calls: string[] = [];
  const resolvers: Array<(img: HTMLImageElement) => void> = [];
  imageIO.load = (url) => {
    calls.push(url);
    return new Promise((resolve) => resolvers.push(resolve));
  };
  return { calls, resolvers };
}

const req = (url: string, over: Partial<Parameters<typeof requestImage>[0]> = {}) => ({
  url,
  alive: () => true,
  onOk: vi.fn(),
  onError: vi.fn(),
  ...over,
});

describe('_image-loader', () => {
  it('先进先出 —— 进队顺序就是行序，所以图从上往下出', async () => {
    const calls = stubIO();
    requestImage(req('row1'));
    requestImage(req('row2'));
    requestImage(req('row3'));

    await flushImageQueue();

    // 反过来（LIFO）就是「图从最后一行往上冒」的观感，走过这个弯路
    expect(calls).toEqual(['row1', 'row2', 'row3']);
  });

  it('跨重绘也只有一条顺序规则：先排队的先做（哪怕中间隔了一帧）', async () => {
    const calls = stubIO();
    requestImage(req('screen1-a'));
    requestImage(req('screen1-b'));
    await nextFrame();
    requestImage(req('screen2-a'));

    await flushImageQueue();

    /*
     * 「新的一屏优先」曾经按帧分批做过，结果初次挂载时前 6 行被排到最后（核心第一次重绘
     * 只画 6 行、第二次补到 21 行时前 6 行沿用原 DOM，任务留在旧批里）—— 出图变成
     * 「第 7 行往下走完再回头补前 6 行」。所以顺序只留这一条规则。
     */
    expect(calls).toEqual(['screen1-a', 'screen1-b', 'screen2-a']);
  });

  it('滚走的那一屏（已回收）在出队时被剔掉，不挡住后面的', async () => {
    const calls = stubIO();
    // 前三个模拟「已经滚走、格子被回收」
    for (const url of ['gone1', 'gone2', 'gone3']) requestImage(req(url, { alive: () => false }));
    requestImage(req('onscreen1'));
    requestImage(req('onscreen2'));

    await flushImageQueue();

    expect(calls).toEqual(['onscreen1', 'onscreen2']);
  });

  it('入队时就已作废的任务连请求都不发', async () => {
    const calls = stubIO();
    const dead = req('dead', { alive: () => false });
    requestImage(dead);
    requestImage(req('live'));

    await flushImageQueue();

    expect(calls).toEqual(['live']);
    expect(dead.onOk).not.toHaveBeenCalled();
    expect(dead.onError).not.toHaveBeenCalled();
  });

  it('取图期间那一格被回收 → 不再往上画（虚拟滚动的关键一条）', async () => {
    const { resolvers } = deferredIO();
    let live = true;
    const task = req('a', { alive: () => live });
    requestImage(task);

    // flushImageQueue 第一轮是同步 drain，所以这一刻请求已经发出、但还没 settle
    const flushing = flushImageQueue();
    live = false;
    resolvers[0]!(anImg());
    await flushing;

    expect(task.onOk).not.toHaveBeenCalled();
  });

  it('并发上限 4：第 5 个要等前面有一个完成', async () => {
    const { calls, resolvers } = deferredIO();
    for (const url of ['a', 'b', 'c', 'd', 'e']) requestImage(req(url));

    const flushing = flushImageQueue();
    expect(calls).toHaveLength(4);

    resolvers[0]!(anImg());
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toHaveLength(5);

    for (const resolve of resolvers) resolve(anImg());
    await flushing;
  });

  it('成功后回调拿到的是已解码的那个元素', async () => {
    stubIO();
    const task = req('a');
    requestImage(task);

    await flushImageQueue();

    expect(task.onOk).toHaveBeenCalledTimes(1);
    expect((task.onOk as any).mock.calls[0][0].tagName).toBe('IMG');
    expect(task.onError).not.toHaveBeenCalled();
  });

  it('坏链只请求一次：第二次直接同步 onError，不再发请求', async () => {
    const calls = stubIO(['bad']);
    const first = req('bad');
    requestImage(first);
    await flushImageQueue();
    expect(first.onError).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['bad']);

    const second = req('bad');
    requestImage(second);
    // 同步 —— 不用 flush：已知坏链不该先画一个占位盒再变断图（白闪一次）
    expect(second.onError).toHaveBeenCalledTimes(1);
    await flushImageQueue();
    expect(calls).toEqual(['bad']);
  });

  it('看过的好图仍然走队列（每个单元格都要自己的 <img>）', async () => {
    const calls = stubIO();
    requestImage(req('same'));
    await flushImageQueue();
    requestImage(req('same'));
    await flushImageQueue();

    expect(calls).toEqual(['same', 'same']);
  });
});
