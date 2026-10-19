---
outline: [2, 3]
---

# 企业版 · virt-table Pro

`virt-table` 走 **open-core**：核心（`@virt-table/*`，MIT）**永久免费**，包含行列双向虚拟化、合并单元格、多级表头、树形/分组、编辑器、14 个插件与 19 个内置单元格组件。

少数**进阶场景能力**做成零侵入的外部插件单独授权（`@virt-table-pro/*`）。它们只吃核心公开的插件契约，所以：装上就用、独立发版、不改核心一行代码；不装的话核心照常完整可用。

::: tip 使用文档
每个插件的完整使用文档（配置项、实例 API、注意事项，代码按 Vanilla / Vue / React 分）在
<ProLink to="index">开始使用付费插件</ProLink>，也可以从下面各节的「完整文档」直接进。
:::

::: tip 定价正在整理
下面各档的价格暂时留空，确定后会在这一页更新。现在需要报价、试用密钥或私有部署方案，直接联系：**kolarorz@gmail.com**
:::

## 授权模式

<div class="pro-plans">
  <div class="pro-plan">
    <h3>单插件</h3>
    <p class="pro-plan-desc">只买你要的那一个能力，按插件计价。</p>
    <p class="pro-price">价格待定</p>
    <ul>
      <li>一个 <code>@virt-table-pro/*</code> 插件</li>
      <li>不限项目数、不限开发者数（同一法人主体内）</li>
      <li>授权期内的所有版本更新</li>
      <li>邮件支持</li>
    </ul>
  </div>
  <div class="pro-plan pro-plan--featured">
    <h3>全家桶</h3>
    <p class="pro-plan-desc">一次拿到全部付费插件，含后续新增的插件。</p>
    <p class="pro-price">价格待定</p>
    <ul>
      <li>下面<b>所有</b>已发布插件 + 授权期内新增的插件</li>
      <li>不限项目数、不限开发者数（同一法人主体内）</li>
      <li>授权期内的所有版本更新</li>
      <li>优先响应的邮件支持</li>
    </ul>
  </div>
  <div class="pro-plan">
    <h3>私有部署 / OEM</h3>
    <p class="pro-plan-desc">内网私有 registry、源码托管、二次分发。</p>
    <p class="pro-price">价格待定</p>
    <ul>
      <li>全家桶的全部内容</li>
      <li>不限域名（离线/内网部署）</li>
      <li>源码级授权与二次分发条款可谈</li>
      <li>可签保密协议与定制开发</li>
    </ul>
  </div>
</div>

### 授权是怎么生效的

```ts
import { setLicenseKey } from '@virt-table-pro/license';
setLicenseKey(import.meta.env.VITE_VT_LICENSE); // 整个应用设一次
```

| | |
| --- | --- |
| **不联网** | 密钥自带授权范围（产品、域名、有效期），校验在本地完成 —— 内网、离线、CI 构建都不受影响 |
| **未授权不降级** | 密钥缺失或超范围时**只**输出一行 `console.warn` + 右下角一个角标。**绝不抛错、绝不禁用功能** —— 许可问题不该炸掉你的生产环境 |
| **按域名绑定** | 密钥可绑定域名（支持 `*.example.com`），`localhost` 一类开发域名一律放行 |
| **一把密钥覆盖多个产品** | 买了几个插件就是一把密钥里的几个产品名，应用里只设一次 |

本站的两个经典案例就是这么跑起来的 —— 它们用的是一把**只覆盖演示产品、绑定本站域名**的密钥。

密钥格式、排障对照表与「未授权时到底发生什么」见 <ProLink to="license">许可与角标</ProLink>；
模型与理由见 <ProLink to="license-model">许可与授权</ProLink>。

## 付费插件

### 甘特图 {#gantt}

<div class="pro-item">
  <p><span class="pro-status pro-status--partial">一期已发布</span> <code>@virt-table-pro/gantt</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="gantt/">甘特图</ProLink>

左边是任务表、右边是时间轴，行在两边始终对齐；中间的分界可以拖着调宽度，任务面板也能整块收起。时间轴按**时间桶**虚拟化，所以时间跨度再长、任务再多，DOM 里也只有一屏。

- 条 / 进度段 / 汇总条 / 里程碑竖线 / 今天线 / 非工作日底纹
- 拖条改期、拖两端改工期、拖进度、空白处点一下排期、拖拽换序
- 顶部配置面板：开始 / 结束读哪一列、条上显示哪一列、按哪一列上色、进度读哪一列
- 工作日历：只计工作日、跳过法定节假日（假期表与补班判定由使用方传入）
- 日 / 周 / 月 / 季四档粒度切换，收起任务面板
- 面板宽度可拖（`panelWidth` / `panelResizable`）、任务面板可整块收起
- 二期规划：依赖箭头参与计算、工作日历、约束与关键路径

👉 在线体验：[经典案例 · 项目管理 WBS](/demos/project-wbs)

### 浮动图片 {#floating-image}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/floating-image</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="floating-image">浮动图片</ProLink>

电子表格里「插入一张图，贴在纸上、可以随手挪」的那个东西。图摆在**全表内容坐标系**里，不锚在某一格 —— 改列宽、排序、筛选都不会把它挪走。

- 拖动移动，**拖到容器边缘自动滚动**
- 四角把手缩放（Shift 等比）、顶部圆钮旋转（Shift 吸附 15°）
- 点一下打开图片查看器（缩放 / 旋转 / 平移 / 前后切换 / 下载）
- `locked` 一档：指针事件穿透，底下的单元格照常框选与编辑（水印用法）

👉 在线体验：[经典案例 · 电子表格](/demos/spreadsheet#浮动图片)

### 公式与计算列 {#formula}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/formula</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="formula/column">公式与计算列</ProLink>

两档：**计算列**（一列的值由同行其它列算出）与**单元格公式**（A1 记法、区域引用、依赖图、增量重算、循环检测、公式填充）。求值器是纯逻辑层，可脱离表格单独引（也能跑在服务端）。

👉 在线体验：[经典案例 · 电子表格](/demos/spreadsheet#单元格公式) —— 10 万行表里 9.75 万条公式，改一格只增量重算受影响的那几格。

<!--
命名视图：暂不作为付费能力出售，整节从定价页摘掉（2026-08-31）。包本身还在
（`@virt-table-pro/views`，源码与消费方测试都原样保留），只是不再对外标价。
恢复出售要一并取消注释的另外几处：
  · docs/.vitepress/config.ts        侧边栏的 e('views', …)
  · docs/.enterprise/index/after.md  「下一步」表格里那一行
  · docs/.enterprise/license/s1.md   会触发角标的付费插件清单
  · docs/.enterprise/undo/s2.md      与命名视图同装的两段
  · docs/.enterprise/{pivot,xlsx,status-bar,charts}/s0.md + s1.md  「已实现的付费包」清单
  · docs/.enterprise/collab/body.md                          仍是占位包的那一个
  · docs/apps/{vanilla,vue,react}/src/pro-demos/index.ts  demo 注册
  · docs/apps/{vue,react}/src/pro-demos/TypesDemo.{vue,tsx}  类型透传演示已改用 vtUndo

### 命名视图 {#views}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/views</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="views">命名视图</ProLink>

把列宽 / 列序 / 显隐 / 排序 / 两套筛选 / 分页存成命名视图：保存、切换、设为默认、导入导出 JSON（可存到你的后端做团队共享）。
-->

### 撤销 / 重做 {#undo}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/undo</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="undo">撤销 / 重做</ProLink>

查询状态（列宽/列序/显隐/排序/筛选/分页）**自动入栈**，数据变更由使用方一行 `recordChange()` 显式录制，带键盘快捷键。撤销栈是纯逻辑层，可单独使用。

👉 在线体验：[经典案例 · 电子表格](/demos/spreadsheet#撤销-重做) —— 编辑 / 公式 / 清空 / 合并 / 粘贴五类动作都能 Ctrl/Cmd+Z 退回。

### 真 xlsx 与 PDF 导出 {#xlsx}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/xlsx</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="xlsx">真 xlsx 与 PDF 导出</ProLink>

核心自带的 `exportExcel()` 是 **HTML 伪装的 `.xls`**（Excel 会先弹一句「格式与扩展名不一致」）。这个包出的是真 zip + OOXML：多级分组表头、合并单元格、列宽对齐、数字与日期的真类型、冻结窗格、多 sheet、合计行还能写成活 `SUBTOTAL` 公式。

**不引 SheetJS / exceljs** —— zip 写入器自带一份，DEFLATE 走浏览器原生的 `CompressionStream`，整包 gzip 后约 11 kB（jszip 单独一个就 95 kB，而它会进你的 bundle）。

PDF 这一档卖的是**排版**（分页、每页重复表头、页码、横向、缩放到一页宽），文件由浏览器的「另存为 PDF」出 —— 自己写 PDF 字节要内嵌 4~9 MB 的中文字体，那个代价不该让每个客户都付。要服务端出字节就用 `exportPdf({ htmlOnly: true })` 把排好的 HTML 交出去。

### 透视表 {#pivot}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/pivot</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="pivot">透视表</ProLink>

行列维度分组聚合 + 交叉分析：多层行维度（带小计）、多层列维度（多级分组表头）、多值字段、总计行与总计列，`setPivotConfig()` 运行期换维度。

设计上它就是**一棵树 + 一套分组表头** —— 折叠展开、缩进、折叠箭头、跨列表头格、固定列阴影全部白拿核心，所以这个包本体只有 6 kB（gzip 约 3 kB）。聚合层与建列层都能脱离表格单独引，服务端算透视走同一份代码。

小计是**对整桶明细重算**而不是把子行加起来 —— 对 `avg` / `min` / `max` / 去重计数，后者是错的，而那是报表里最常见的一类错。

### 状态栏（选区聚合） {#status-bar}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">已发布</span> <code>@virt-table-pro/status-bar</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="status-bar">状态栏（选区聚合）</ProLink>

表格底部一条实时汇总：框选一片给出计数 / 求和 / 平均 / 极值 / 去重，左边是总行数、筛后行数、勾选行数。点任意一项复制它的值。它替代的是「导出到 Excel 里按一下自动求和」。

成本全在**算得对**：空串不能当 0（`Number('')` 是 0，会污染均值的分母）、布尔不能当 1（会把一列勾选悄悄求和成「有几个真」）、`'0x10'` 不能当 16、全是 `0` 的一列 `sum` 必须是 `0` 而不是 `null`。一千行两位小数走 Kahan 补偿求和，不会飘出 `1234.5600000000002`。

**算不出来的项整项不显示** —— 一片文字上的「求和 0」会被读成「这一列加起来是零」。

### 单元格迷你图 {#charts}

<div class="pro-item">
  <p><span class="pro-status pro-status--ready">一期已发布</span> <code>@virt-table-pro/charts</code></p>
  <p class="pro-price">价格待定</p>
</div>

📖 完整文档：<ProLink to="charts">单元格迷你图</ProLink>

一格里一条趋势线，四种图型（折线 / 面积 / 柱状 / 盈亏），带极值标记与悬停读数。

**不引图表库**：生成的是静态 SVG 字符串，没有实例也没有生命周期。除了体积（echarts 最小打包是本包全部代码的几十倍），真正的问题是每格一个实例 —— 一屏 40 行就是 40 个实例带 40 个 `ResizeObserver`，而虚拟滚动会让它们每滚一屏全部创建销毁一遍。

难点全在虚拟滚动的渲染热路径上：画布尺寸从列宽与行高现算、**绝不读 `td.offsetWidth`**（同步回流，一屏 40 次，滚动肉眼掉帧）；整列极值的缓存按列表引用定 key 而不靠钩子清（`onDataChanged` 在单元格重画之后才触发）；悬停提示是一个委托监听而不是每格一个。

同包的**选区出图**（`vtCharts`）仍在规划中，装上只 warn 一次。

### 规划中 {#planned}

`@virt-table-pro/collab`（多人光标、单元格评论、修订历史）是**占位包**：骨架（构建、类型、许可、测试、发布）已就位，装上只 warn 一次、不做任何事。README 写了计划中的 API、动工前核心要补什么，以及**在那之前用公开 API 怎么自己顶一下**。

| 插件 | 做什么 | |
| --- | --- | --- |
| `@virt-table-pro/collab` | 多人光标、单元格评论、修订历史 | <ProLink to="collab">文档</ProLink> |

想优先做哪一个、或者需要定制，告诉我们排期会跟着走。

## 常见问题

**没有密钥能用吗？** 能。功能完全不降级，只是控制台一行 warn + 右下角一个角标。我们靠合规约束而不是技术手段 —— 这样也不会有「许可服务挂了导致客户生产环境崩」这种事。

**内网 / 离线环境呢？** 校验完全在本地，不发任何网络请求。私有部署档可以签不限域名的密钥。

**怎么装？** 付费包发在私有 registry 上，购买后给你 `.npmrc` 的访问凭证；核心仍从公共 npm 装。

**支持哪几端？** 与核心一致：Vanilla / Vue 3 / React。插件本身与框架无关，命令式 API 会自动透出到三端的 `ref` 上。

**有试用吗？** 有，联系我们拿一把限期密钥（绑你的开发域名）。

**升级与续期怎么算？** 定价方案一起确定，会在这一页写清。

---

需要报价、试用或私有部署：**kolarorz@gmail.com**

<style scoped>
.pro-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
  gap: 16px;
  margin: 24px 0;
}

.pro-plan {
  padding: 18px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

/* 中间那档是推荐档：只用主色描边区分，不做「最受欢迎」那种角标（还没有定价，谈不上受欢迎） */
.pro-plan--featured {
  border-color: var(--vp-c-brand-1);
}

.pro-plan h3 {
  margin: 0 0 6px;
  border: none;
  font-size: 17px;
  letter-spacing: normal;
}

.pro-plan-desc {
  margin: 0 0 10px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

/* 价格占位：字号给足，定价填进来之后不用再调版式 */
.pro-price {
  margin: 0 0 12px;
  color: var(--vp-c-text-3);
  font-size: 20px;
  font-weight: 600;
  font-feature-settings: 'tnum';
}

.pro-plan ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--vp-c-text-2);
}

/* 每个插件卡片的头一行：状态徽标 + 包名 + 价格占位 */
.pro-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 12px 0 14px;
  padding: 10px 14px;
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 0 8px 8px 0;
  background: var(--vp-c-bg-soft);
}

.pro-item p {
  margin: 0;
}

.pro-item .pro-price {
  margin: 0;
  font-size: 16px;
}

.pro-status {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 18px;
  color: #fff;
}

.pro-status--ready {
  background: var(--vp-c-green-1, #10b981);
}

.pro-status--partial {
  background: var(--vp-c-yellow-1, #f59e0b);
}
</style>
