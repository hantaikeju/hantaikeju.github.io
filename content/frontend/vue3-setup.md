---
title: "Vue 3 Composition API 入门"
date: 2026-06-10T21:20:00+08:00
draft: false
tags: ["Vue", "前端", "JavaScript"]
categories: ["前端开发"]
---

## Vue 3 的新特性

Vue 3 带来了 Composition API，让逻辑复用变得更加简单。

## 基础示例

```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <div>
    <p>计数: {{ count }}</p>
    <p>两倍: {{ doubleCount }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

## 为什么使用 Composition API？

- 更好的逻辑复用
- 更灵活的代码组织
- 更好的 TypeScript 支持
