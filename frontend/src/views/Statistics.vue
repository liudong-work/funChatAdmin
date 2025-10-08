<template>
  <div class="statistics">
    <a-page-header title="数据统计" sub-title="查看系统数据统计" class="page-header" />
    <a-card :bordered="false">
      <a-empty description="功能开发中..." />
    </a-card>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.statistics {
  padding: 24px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.page-header {
  background: #fff;
  margin-bottom: 24px;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

