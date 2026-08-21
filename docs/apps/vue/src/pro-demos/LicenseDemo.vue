<script setup lang="ts">
/**
 * 许可校验 demo（Vue 端）：角标出现 → 注入密钥 → 角标消失。
 *
 * 这里**必须**再装一个付费插件（挑了 vtViews）才看得到角标：`vtLicense` 自己刻意不校验、
 * 不挂角标，校验是各付费插件在 `setup` 里调 `guardProduct()` 做的。
 */
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { getLicenseStatus, setLicenseKey, vtLicense } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { PRO_DEMO_LICENSE_KEY } from '../../../pro-kit/demo-license';
import { makeColumns, makeRows } from '../../../pro-kit/shared/data';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
// 列定义每个 demo 一份新的：表格会就地改 col.width，共用常量会把上一个 demo 的列宽带过来
const columns = makeColumns();
const options = {
  list: makeRows(200),
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [vtLicense(), vtViews({ storageKey: 'vtp-vue-license' })],
};

const render = (): void => {
  const status = getLicenseStatus();
  emit(
    'status',
    status.valid
      ? `已授权：${status.payload?.sub} · 到期 ${status.payload?.exp}`
      : `未授权（${status.message ?? status.reason ?? '没有密钥'}）`,
  );
};

const inject = (): void => {
  setLicenseKey(PRO_DEMO_LICENSE_KEY);
  // 角标不会自己走：它按 rootEl 记着「这张表上哪些产品未授权」
  tableRef.value?.refreshLicenseBadge?.();
  render();
};

const clear = (): void => {
  setLicenseKey(null);
  render();
  emit('status', '已清除密钥 —— 角标要等下次装载才会回来（切走再切回来试试）');
};

const bogus = (): void => {
  setLicenseKey('VTP1.bogus.bogus');
  const status = getLicenseStatus();
  emit('status', `坏密钥的校验结果：valid=${status.valid} · reason=${status.reason}`);
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" @click="inject">注入测试密钥</button>
    <button class="pg-btn" @click="clear">清除密钥</button>
    <button class="pg-btn" @click="bogus">校验一个坏密钥</button>
  </div>

  <div class="pg-table">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>
</template>
