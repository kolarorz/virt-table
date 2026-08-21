/**
 * 文档站演示用的付费许可 —— **两个经典案例共用一把**。
 *
 * 为什么共用：许可密钥是**模块级单例**（`setLicenseKey` 设一次，全应用生效），
 * 而画廊里可以来回切案例。每个案例各设一把只覆盖自己那个产品的密钥，切过去的那一刻
 * 就会把上一把覆盖掉 —— 于是「先看甘特、再看电子表格」时前者的角标会凭空冒出来。
 * 一把覆盖全部演示用产品，这个顺序问题就不存在。
 *
 * ## 为什么这把密钥能公开写在这里
 *
 * 它是**域名绑定**的：只对 `keno-lee.github.io` / `kolarorz.github.io`（外加 `localhost`
 * 一类开发域名本就放行）有效。复制走贴到别处 → `domain-mismatch` → 右下角出现未授权角标 +
 * 一行 warn，但**功能一点都不降级**（付费插件的铁律：只 warn，绝不抛错、绝不禁用）。
 *
 * `products` 是 `'*'` 而不是列举四个产品名：文档站以后加新付费插件时不用重签。授权面变大
 * 不构成风险 —— 它绑死了域名，复制走的人拿不到任何东西。到期日签到 2099，这个站不该
 * 因为一把演示密钥过期而某天自己长出角标。
 *
 * ⚠️ 将来若把密钥算法升到 `VTP2`（Ed25519），**校验端必须继续认 `VTP1`**，否则这把
 * 长期密钥会连同所有已签发的客户密钥一起失效。
 *
 * 真实项目里这行应该是 `setLicenseKey(import.meta.env.VITE_VT_LICENSE)` —— 密钥随环境
 * 注入、不进源码。这里写死是因为公开文档站没有构建期密钥可注。
 */
/** 域名绑定的长期演示密钥（`keno-lee.github.io` / `kolarorz.github.io` + 开发域名） */
export const PRO_DEMO_LICENSE_KEY =
  'VTP1.eyJzdWIiOiJ2aXJ0LXRhYmxlIOaWh-aho-ermSDCtyDmvJTnpLrnlKgiLCJwcm9kdWN0cyI6IioiLCJleHAiOiIyMDk5LTEyLTMxIiwiaWF0IjoiMjAyNi0wOC0xOSIsImRvbWFpbnMiOlsia2Vuby1sZWUuZ2l0aHViLmlvIiwia29sYXJvcnouZ2l0aHViLmlvIl19.wzt1sj';

/**
 * 装载付费能力前调一次。幂等，可以在每个 demo 的 bootstrap 里放心调。
 *
 * ## 为什么 `setLicenseKey` 是**参数**而不是这里 import 进来的
 *
 * 本文件住在 `docs/apps/pro-kit/`（三端共用），而付费包是**逐 app** 装进
 * `docs/apps/<fw>/node_modules/` 的。node 的解析从**importer 所在目录**往上走，
 * 所以从这里 `import '@virt-table-pro/license'` 永远走不到某个 app 的 node_modules ——
 * `installed` 档（没有 alias、走裸包名）下就是一句
 * `Rollup failed to resolve import "@virt-table-pro/license"`。
 *
 * 把 setter 作为参数传进来，本文件就**一个付费包都不 import**，共享目录与逐 app 安装
 * 这两件事于此不再冲突。各端的 shell 里那一行 `applyProDemoLicense(setLicenseKey)`
 * 是在 app 自己的 src 下写的，解析正常。
 *
 * 桩模式下 `setLicenseKey` 也是桩，这行不做任何事 —— demo 照常打开，只是没有付费能力。
 *
 * ## 演示区域里**不放**任何付费说明
 *
 * 「本案例中涉及企业版功能」那一块在**案例文档页**上（`docs/demos/*.md`，紧跟在 demo 下面），
 * 不在 demo 里。demo 的职责是演示能力本身，掺进商业信息只会占掉本来就紧张的纵向空间，
 * 而且它嵌在文档页里、外面那一层已经把这件事说清了 —— 同一句话不该出现两遍。
 * 所以这个文件只剩「设密钥」这一件事。
 */
export function applyProDemoLicense(setLicenseKey: (key: string) => void): void {
  setLicenseKey(PRO_DEMO_LICENSE_KEY);
}
