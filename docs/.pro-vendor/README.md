# docs/.pro-vendor —— 入库的付费产物（给 CI 用）

**这个目录是自动生成的，不要手工改。** 由 `pnpm pro:vendor` 产出（脚本在
`scripts/pro-vendor.mjs`，那里的头注写了全部来由）。

## 这是什么

付费插件（`@virt-table-pro/*`）住在另一个**私有**仓库。CI 的 runner 上没有那个仓库，
所以文档站在 CI 里本来只能发成**桩档**（每个付费 demo 位是一张说明卡）。

这里放的是**混淆后的付费产物**：维护者本地生成、提交进来，CI 直接吃。
于是 push 出去的站带着完整付费能力，且**不需要任何 secret**。

fork 与外部贡献者的 checkout 里如果没有这个目录，构建照旧落 `off` 档、全绿。

## 里面是什么

| | |
| --- | --- |
| `<包名>/*.js` | 混淆后的 ESM 产物 |
| `<包名>/index.css` | 样式，原样拷贝（类名是契约，不混淆） |
| `manifest.json` | 包 / 版本 / 文件清单 / 逐文件 sha256 |
| `license.json` | 演示用测试密钥（**缺省只有 7 天**） |

**没有** `package.json` / `.d.ts` / `.cjs` —— 刻意的，见 `scripts/pro-vendor.mjs` 头注。
类型始终来自 `docs/apps/pro-kit/stubs/`，与档位无关。

## 密钥过期了怎么办

站上会出现未授权角标，**功能一点不降级**（这正是要验证的行为）。重签：

```bash
pnpm pro:vendor --key-only     # 只动 license.json，bundle 不变
git add docs/.pro-vendor
```

## pro 代码改了怎么办

```bash
pnpm pro:vendor                # 重打 bundle + 重签密钥
git add docs/.pro-vendor
```

pro 代码没变时重复跑**不会产生 diff**（混淆 seed 取内容哈希）。真出现了 diff，
说明 pro 那边的产物确实变了。

## 自检

```bash
pnpm verify:pro-vendor         # 清单完整性 + 混淆特征 + 密钥有效期
```
