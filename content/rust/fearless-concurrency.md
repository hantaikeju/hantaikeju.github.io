---
title: "Rust 并发：无畏并发（Fearless Concurrency）"
date: 2026-07-28T11:20:00+08:00
weight: 38
draft: false
tags: ["Rust", "并发", "多线程"]
categories: ["rust"]
description: "掌握 Rust 无畏并发的核心理念：使用 thread::spawn 创建线程、JoinHandle 等待线程完成、move 闭包转移所有权，以及编译期防止数据竞争的安全机制。"
---

## 概述

**并发编程（Concurrent Programming）**：程序的不同部分可独立执行。
**并行编程（Parallel Programming）**：程序的不同部分可同时执行。

> 简单理解：日常用"并发"代表以上两种情况。

Rust 的**无畏并发（Fearless Concurrency）**特点：

- 利用**所有权和类型系统**在编译时防止并发错误
- 在**开发阶段**而非生产环境中发现错误
- 为不同并发模型提供多种工具

---

## 多线程导致的问题

多线程编程常见两类问题：

| 问题 | 说明 |
|------|------|
| **竞态条件（Race Condition）** | 线程以不一致的顺序访问数据或资源 |
| **死锁（Deadlock）** | 两个线程互相等待对方释放资源，导致都无法继续 |

这类错误往往**只在某些情况下发生**，难以可靠地重现和修复——这正是 Rust 试图在编译期解决的问题。

---

## Rust 标准库的线程模型

编程语言以几种不同的方式实现线程。许多操作系统提供了 API 供语言调用以创建新线程。

Rust 标准库使用 **1:1 的线程实现模型**，即程序中的一个语言线程对应一个操作系统线程。

> 还有一些 crate 实现了其他线程模型（如 M:N 模型），对 1:1 模型做出了不同的权衡。

在大多数操作系统中，被执行程序的代码是在一个**进程**中运行的，操作系统同时管理多个进程。在一个程序内部，也可以有独立的部分同时运行——运行这些独立部分的功能被称为**线程**。

---

## 使用 thread::spawn 创建新线程

```rust
use std::thread;
use std::time::Duration;

fn main() {
    thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread!");
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {i} from the main thread");
        thread::sleep(Duration::from_millis(1));
    }
}
```

运行结果（示例）：

```
hi number 1 from the main thread
hi number 1 from the spawned thread!
hi number 2 from the main thread
hi number 2 from the spawned thread!
hi number 3 from the main thread
hi number 3 from the spawned thread!
hi number 4 from the main thread
hi number 4 from the spawned thread!
hi number 5 from the spawned thread!
```

⚠️ 注意两点：

1. **主线程结束时，所有子线程无论处于什么状态都会立即停止**——因此子线程可能跑不完（这里子线程预期 1~9，但只跑到 5）
2. **线程执行顺序无法保证**——每次运行的输出顺序可能不同

---

## JoinHandle：等待线程完成

通过将 `thread::spawn` 的返回值保存到变量中，来解决子线程无法运行完或过早结束的问题。

`thread::spawn` 的返回类型是 **`JoinHandle`**——一个拥有所有权的值。调用它的 **`join`** 方法会**阻塞当前线程**，直到该 Handle 代表的线程终止。

> 阻塞一个线程意味着该线程被阻止执行工作或退出。

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread!");
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {i} from the main thread");
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();  // 等待子线程完成
}
```

把 `join` 放在主线程循环之后，主线程会等子线程全部跑完才退出。如果放在循环之前，主线程会先等待子线程完成，再执行自己的循环。

---

## 在线程中使用 move 闭包

在传递给 `thread::spawn` 的闭包中使用 **`move`** 关键字，闭包会**接管从环境中使用的值的所有权**，从而将所有权从一个线程转移到另一个线程。

### 错误示例

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(|| {
        println!("Here's a vector: {v:?}");  // ❌ 编译错误
    });

    handle.join().unwrap();
}
```

编译错误原因：Rust 无法确定 `v` 的生命周期——它可能在新线程还在使用时就被主线程 drop 了。

### 修正：使用 move

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("Here's a vector: {v:?}");  // ✅ 所有权转移到了线程中
    });

    // println!("{v:?}");  // ❌ v 的所有权已转移，主线程不能再使用

    handle.join().unwrap();
}
```

`move` 关键字强制闭包取得 `v` 的所有权，确保线程内安全使用。

---

## 小结

| 概念 | 说明 |
|------|------|
| `thread::spawn` | 创建新线程，返回 `JoinHandle` |
| `JoinHandle::join` | 阻塞等待线程完成 |
| `move` 闭包 | 将环境变量的所有权转移到线程中 |
| 主线程结束 | 所有子线程立即终止（需用 `join` 防止） |
| 1:1 模型 | 一个 Rust 线程 = 一个 OS 线程 |

无畏并发的核心在于：Rust 的所有权和类型系统让编译器能在编译时捕获数据竞争、悬垂引用等问题，让你**放心地编写并发代码**。
