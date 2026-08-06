---
title: "Rust 并发：异步核心 Trait（Future / Pin / Stream）"
date: 2026-08-06T11:30:00+08:00
weight: 46
draft: false
tags: ["Rust", "并发", "异步", "标准库"]
categories: ["rust"]
description: "深入理解 Rust 异步的核心 trait：Future 与 Poll 机制、Pin 与 Unpin 的自引用问题、Stream trait 的设计原理，以及它们如何支撑整个异步生态。"
---

## 概述

Rust 异步编程建立在几个核心 trait 之上。理解它们的底层机制，才能明白为什么需要 `Pin`、为什么 `join_all` 需要 `Unpin`、以及 Stream 如何融合 Iterator 与 Future。

---

## Future Trait

`Future` 是 Rust 异步的核心抽象——一个可能现在还未就绪、但将来会就绪的值。

```rust
use std::pin::Pin;
use std::task::{Context, Poll};

pub trait Future {
    type Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}
```

```rust
enum Poll<T> {
    Ready(T),
    Pending,
}
```

### 关键点

| 要素 | 说明 |
|------|------|
| `self: Pin<&mut Self>` | 固定内存位置的自身可变引用 |
| `cx: &mut Context<'_>` | 上下文，用于与异步运行时交互（如唤醒 waker） |
| `Poll<T>` | `Ready(T)` 表示已完成，`Pending` 表示尚未就绪 |

> ⚠️ `Ready` 之后**不应该再调用 `poll`**，否则会 panic（除特殊说明的 Future 外）。`poll` 由异步运行时负责轮询调用。

---

## Pin & Unpin

### 问题：为什么需要 Pin？

`async` 代码块中的一系列 `.await` 点会被编译器编译成一个**状态机**：

- Rust 查看一个 `.await` 点和下一个 `.await` 点（或 async 块结束）之间需要哪些数据
- 然后在状态机中创建相应的**变体（variant）**
- 每个变体获得访问所需数据的权限

当把 Future 放入 `Vec` 后交给 `join_all` 时：

```rust
trpl::join_all(futures).await;  // ❌ the trait `Unpin` is not implemented for ...
```

**问题所在**：移动 Future 意味着移动编译器生成的状态机。这个状态机可能包含**自引用**——某变体的字段持有指向同一结构体其他字段的引用。

```
┌─────────────────────┐
│  Future 状态机       │
│  ┌─────────┐        │
│  │ 字段 A   │        │
│  │ 字段 B ──┼──┐     │  ← 字段 B 持有指向字段 A 的引用
│  │ 字段 C   │  │     │
│  └─────────┘  │     │
└───────────────┼─────┘
                └── 自引用
```

**移动后**：

```
┌─────────────────────┐         ┌─────────────────────┐
│  旧位置 (无效)       │         │  新位置              │
│  ┌─────────┐        │         │  ┌─────────┐        │
│  │ 字段 A  ←── 悬垂 ─┼─────────┼──│ 字段 B  │        │  ← 引用仍指向旧位置！
│  │         │        │         │  │         │        │
│  └─────────┘        │         │  └─────────┘        │
└─────────────────────┘         └─────────────────────┘
```

> 默认情况下，任何具有自引用的对象移动起来都不安全。移动后内部引用指向旧位置（可能已被重用），导致读取完全不相关的数据——**未定义行为**。

### Pin 的解决方案

**Pin** 是针对指针类型（`&`、`&mut`、`Box`、`Rc` 等）的**包装器**：

| 特性 | 说明 |
|------|------|
| **本质** | 不是指针本身，而是编译器用来约束指针的工具 |
| **作用对象** | 实现 `Deref` 或 `DerefMut` 的类型（即指针） |
| **核心保证** | 通过 `Pin` 固定后，**不能移动**被指向的值 |

```rust
// Pin<Box<SomeType>> —— 固定的是 SomeType，不是 Box 指针
// Box 指针仍然可以自由移动，但指向的数据保持在原位
```

> 关系的是确保最终被引用的数据保持在原位。指针四处移动没问题——只要指向的数据在同一位置即可。

---

## Unpin & !Unpin

### Unpin

大多数类型即使在 `Pin` 指针后，也**完全可安全地移动**——因为它们没有内部引用：

- 原始值（`i32`、`bool` 等）是 `Unpin`
- Rust 中通常使用的大多数类型也没有内部引用

`Unpin` 是一种告诉编译器"这个类型移动是安全的"的方式——它是**正常情况**。

### !Unpin

特殊情况：某些类型**没有实现 `Unpin`**，表示为 `impl !Unpin for SomeType`。

当一个指向 `!Unpin` 类型的指针被包裹在 `Pin` 中时，该类型**必须维持固定**才能保证内存安全。

| 概念 | 说明 |
|------|------|
| `Unpin` | 正常情况——Pin 包裹后仍可安全移动 |
| `!Unpin` | 特殊情况——Pin 包裹后不能移动 |
| 关键 | 只有使用 `Pin<&mut SomeType>` 时才重要 |

### 实际使用

日常编程中，**只有构建底层库和异步运行时才会直接使用 `Pin` 和 `Unpin`**。普通开发者遇到时只需：

- `pin!(async { ... })` — 在栈上固定
- `Box::pin(async { ... })` — 在堆上固定

---

## Stream Trait

`Stream` 是异步版的 `Iterator`，目前在 `std` 中尚未定义，但 `futures` crate 中有广泛使用的定义。

### 设计来源

| 来源 | 概念 | 方法 |
|------|------|------|
| **Iterator** | 序列 | `next()` → `Option<Self::Item>` |
| **Future** | 随时间就绪 | `poll()` → `Poll<Self::Output>` |
| **Stream** | 随时间就绪的**项目序列** | `poll_next()` → `Poll<Option<Self::Item>>` |

### 定义

```rust
use std::pin::Pin;
use std::task::{Context, Poll};

trait Stream {
    type Item;

    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>>;
}
```

| 要素 | 说明 |
|------|------|
| `type Item` | 流产生的项目类型 |
| `poll_next` | 像 `Future::poll` 一样轮询，像 `Iterator::next` 一样产生序列 |
| `Poll<Option<Self::Item>>` | `Ready(Some(item))` — 有元素；`Ready(None)` — 流结束；`Pending` — 暂无元素 |

### 三者的层级关系

| Trait | 核心方法 | 返回 | 语义 |
|-------|----------|------|------|
| `Iterator` | `next()` | `Option<Item>` | 同步序列 |
| `Future` | `poll()` | `Poll<Output>` | 异步单值 |
| `Stream` | `poll_next()` | `Poll<Option<Item>>` | 异步序列 |

---

## 小结

| 概念 | 说明 |
|------|------|
| `Future` | `poll(Pin<&mut Self>)` → `Poll<Output>`，异步值抽象 |
| `Pin` | 固定指针指向的值，防止移动（解决自引用问题） |
| `Unpin` | 标记类型可安全移动（大多数类型） |
| `!Unpin` | 标记类型不能移动（有自引用的 async 状态机） |
| `Stream` | `poll_next(Pin<&mut Self>)` → `Poll<Option<Item>>`，异步序列 |
| 状态机 | 编译器将 async 块编译成的内部结构，可能自引用 |

> 日常开发很少直接接触这些 trait，但理解它们能让你明白为什么 `pin!`、`Box::pin`、`join_all` 的 Unpin 约束等问题存在——以及 Rust 如何在不牺牲安全性的前提下实现高效异步。
