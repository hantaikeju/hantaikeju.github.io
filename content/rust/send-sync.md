---
title: "Rust 并发：Send 与 Sync Trait"
date: 2026-08-04T10:58:00+08:00
weight: 41
draft: false
tags: ["Rust", "并发", "多线程", "标准库"]
categories: ["rust"]
description: "理解 Rust 并发安全的核心 trait：Send（所有权线程间转移）与 Sync（引用线程间共享），以及常见类型的 Send/Sync 分类。"
---

## 概述

Rust 语言本身的并发**特性非常少**——大多数并发功能都是标准库的一部分，而不是语言本身。你可以编写自己的并发功能或使用第三方库。

位于 `std::marker` 的两个核心 trait —— **`Send`** 和 **`Sync`** —— 是 Rust 并发安全体系的基石。

---

## Send Trait

**`Send`** 是一个 marker trait（标记 trait），表示：**所有权可以在线程之间转移**。

### 特点

- 几乎所有 Rust 类型都是 `Send` 的
- 完全由 `Send` 类型组成的任何类型也**自动标记为 `Send`**
- 几乎所有原始类型都是 `Send`（**原始指针除外**）
- Rust 的类型系统和 trait 约束确保不会意外地将非 `Send` 类型跨线程发送

### 例外：Rc\<T\> 不是 Send

`Rc<T>` 仅用于单线程情况，其引用计数操作不是原子性的，因此**不能在线程间安全传递**：

```rust
use std::rc::Rc;
use std::thread;

fn main() {
    let rc = Rc::new(42);

    thread::spawn(move || {       // ❌ 编译错误
        println!("{}", rc);       // Rc<i32> 没有实现 Send
    });
}
```

编译错误会明确指出：`Rc<i32>` cannot be sent between threads safely。

---

## Sync Trait

**`Sync`** 是一个 marker trait（标记 trait），表示：**可以安全地从多个线程引用该类型**。

换句话说，如果 `&T` 是 `Send`，则类型 `T` 是 `Sync`——即该引用可以安全地发送到另一个线程。

### 特点

- 原始类型是 `Sync`
- 完全由 `Sync` 类型组成的类型也是 `Sync`

### 示例

```rust
let x: i32 = 42;
```

多个线程都能安全地引用到 `x`——因为 `&i32` 可以安全地发送到另一个线程，所以 `i32` 是 `Sync`。

---

## 常见类型的 Send / Sync 分类

`Send` 和 `Sync` 是独立的——一个类型可能是其中之一、两者都是、或两者都不是：

| 类型 | Send | Sync | 说明 |
|------|:----:|:----:|------|
| **基本类型**（`i32`, `bool`, `&str` 等） | ✅ | ✅ | 完全线程安全 |
| **`Rc<T>`** | ❌ | ❌ | 仅单线程，引用计数非原子 |
| **`RefCell<T>`** | ✅（若 T: Send） | ❌ | 可转移所有权，但不能多线程共享引用 |
| **`Mutex<T>`** | ✅ | ✅ | 可用于多线程共享访问 |
| **`MutexGuard<'a, T>`** | ❌ | ✅（若 T: Sync） | lock 守卫不能 send，但可 sync |
| **原始指针**（`*const T`, `*mut T`） | ❌ | ❌ | 无任何安全保证 |

> `Sync` 是 Rust 中最接近"**线程安全**"的概念——表示特定数据可以被多个并发线程安全使用。

### 为什么 Send 和 Sync 要分开？

因为有些类型**可以转移所有权，但不可以共享引用**：

- `RefCell<T>`：可以 `Send`（把所有权给另一个线程），但不能 `Sync`（多个线程不能同时持有 `&RefCell<T>`，因为内部借用检查不是线程安全的）
- `MutexGuard<'a, T>`：可以 `Sync`（多个线程可持有引用），但不能 `Send`（锁守卫不应离开当前线程）

---

## 手动实现 Send 和 Sync

通常**不需要手动实现**这些 trait：

- 由 `Send` 和 `Sync` 类型组成的类型**自动也是 `Send` 和 `Sync`**
- 作为 marker trait，它们甚至**没有任何方法**需要实现
- 手动实现涉及 **unsafe Rust** 代码，需要仔细思考安全性保证

> 构建不是由 `Send` 和 `Sync` 部分组成的新并发类型时，建议参考 [The Rustonomicon](https://doc.rust-lang.org/nomicon/) 了解更多细节。

---

## 小结

| 概念 | 说明 |
|------|------|
| `Send` | 所有权可以在线程间**转移** |
| `Sync` | 引用可以在线程间**共享**（`&T` 是 `Send`） |
| 自动派生 | 由 Send/Sync 类型组成的新类型自动获得 |
| `Rc<T>` | 既非 Send 也非 Sync |
| `RefCell<T>` | Send 但非 Sync |
| `Mutex<T>` | Send + Sync |
| 手动实现 | 涉及 unsafe，通常不需要 |

`Send` 和 `Sync` 是 Rust"无畏并发"底层的安全基石——它们与所有权系统一起，在编译时就阻止了数据竞争的发生。
