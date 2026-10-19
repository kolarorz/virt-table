# docs/apps/pro-kit —— 三端共用的付费插件套件

```
demo-license.ts     域名绑定的演示密钥 + applyProDemoLicense(setLicenseKey)
stubs/              6 个付费包的桩 + stub-notice.ts + empty.css
shared/             三端 demo 共用的数据与样式（data / money-cell / edit-hook / pro-demo.css）
```

刻意没有 `package.json`：没有依赖也不构建，做成 workspace 包只会多一层注册。

**完整方案在 [`contributing/pro-plugins.md`](../../../contributing/pro-plugins.md)** ——
四个档位（`src` / `installed` / `vendor` / `off`）怎么判定、桩要写成什么样、
`demo-license.ts` 为什么把 `setLicenseKey` 当参数、怎么加一个付费插件 demo。
