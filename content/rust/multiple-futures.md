---
title: "Rust 并发：处理多个 Future"
date: 2026-08-05T15:10:00+08:00
weight: 44
draft: false
tags: ["Rust", "并发", "异步", "标准库"]
categories: ["rust"]
description: "掌握处理多个 Future 的技巧：join_all 动态数量处理、Pin 与 Box 包装、race 竞争、yield_now 交出控制权、自定义 timeout 超时处理。"
---

## 概述

前面的 `trpl::join!()` 适合**已知 Future 数量**的场景。但更多时候，Future 的数量是动态的——需要把它们压入列表统一处理，或者需要竞争、超时等更复杂的控制。

---

## 固定数量：join! 与 futures::join!

`trpl::join!` 要求所有 Future **类型相同**。如果要合并**不同类型**的 Future，使用 `futures::join!`：

```rust
use futures::join;

fn main() {
    trpl::run(async {
        let a = async { 1u32 };
        let b = async { "Hello" };
        let c = async { true };

        let (a_result, b_result, c_result) = join!(a, b, c);

        println!("Results: {:?}, {:?}, {:?}", a_result, b_result, c_result);
    });
}
```

> `futures::join!` 允许每个 Future 返回**不同的类型**——通过模式匹配解构获取各自的结果。

---

## 动态数量：join_all

当 Future 数量不确定时，将它们放入 `Vec` 并用 `trpl::join_all` 处理。前提是：**必须具有相同的类型**。

### 问题：每个 async block 是独立的类型

```rust
// ❌ 不同类型，无法放入同一个 Vec
let fut1 = async { 1 };
let fut2 = async { 2 };
```

Rust 会为每个 `async` block 标记为**单独的类型**，即使代码完全相同。因此需要转为 **trait object** 并 **Pin** 住。

### 解决方案：Box::pin

```rust
let futures: Vec<Pin<Box<dyn Future<Output = ()>>>> = vec![
    Box::pin(future_1),
    Box::pin(future_2),
    Box::pin(future_3),
];
```

- `Box::pin` 将 Future 放在**堆上**，并使用动态调度
- `Pin` 确保 Future 的内存位置**不会改变**（因为异步代码块可能自引用）

### 两种包装方式

| 方式 | 存储位置 | 说明 |
|------|----------|------|
| `Pin<Box<dyn Future<Output = T>>>` | 堆上 | 需要堆分配 + 动态调度 |
| `Pin<&mut dyn Future<Output = T>>` | 栈上 | 不需要堆分配，但需要 pinned 引用 |

使用 `Pin<&mut dyn Future<Output = T>>` 的条件：
- Future 是 `Unpin` 的（允许安全移动），或
- 使用 `pin!` 宏显式固定，确保内存位置不变

### 使用 pin! 宏

```rust
let fut = pin!(async move {
    // ...
});
```

> `pin!` 在栈上固定一个 Future，无需堆分配。

---

## 竞争的 Future：trpl::race

`trpl::race` 同时运行两个 Future，**第一个完成的胜出**，另一个被立即停止：

```rust
use std::time::Duration;

fn main() {
    trpl::run(async {
        let slow = async {
            println!("'slow' started.");
            trpl::sleep(Duration::from_millis(100)).await;
            println!("'slow' finished.");
        };

        let fast = async {
            println!("'fast' started.");
            trpl::sleep(Duration::from_millis(50)).await;
            println!("'fast' finished.");
        };

        trpl::race(slow, fast).await;
    });
}
```

输出：

```
'slow' started.
'fast' started.
'fast' finished.
```

> `trpl::race` 按参数顺序轮询，某个 Future 完成时，**停止所有 Future 的运行**。慢的那个永远不会输出 "finished"。

---

## 长时间运行时交出控制权

async 代码中，遇到 `.await` 才交出控制权。如果某个 Future 长时间运行且从不 `.await`，会**饿死**其他 Future。

### yield_now

主动让出执行权：

```rust
trpl::yield_now().await;
```

放在耗时循环中，让其他 Future 有机会获得执行。

---

## 自定义 timeout 超时

结合 `trpl::race` 和 `trpl::sleep`，可以构建超时机制：

```rust
use std::time::Duration;
use trpl::Either;

fn main() {
    trpl::run(async {
        let slow = async {
            trpl::sleep(Duration::from_secs(5)).await;
            "I finished!"
        };

        match timeout(slow, Duration::from_secs(2)).await {
            Ok(msg) => println!("{}", msg),
            Err(duration) => println!(
                "I timed out! Elapsed time: {} seconds",
                duration.as_secs()
            ),
        }
    });
}

async fn timeout<F: Future>(
    future_to_try: F,
    max_time: Duration,
) -> Result<F::Output, Duration> {
    match trpl::race(future_to_try, trpl::sleep(max_time)).await {
        Either::Left(result) => Ok(result),
        Either::Right(_) => Err(max_time),
    }
}
```

输出：

```
I timed out! Elapsed time: 2 seconds
```

原理：

| 参与方 | 说明 |
|--------|------|
| `future_to_try` | 要执行的实际任务 |
| `trpl::sleep(max_time)` | 定时器 Future，超时后完成 |
| `trpl::race` | 谁先完成谁赢 |

> ⚠️ 注意：此 `timeout` 只在 Future **有过 `.await` 点时**才能工作。如果 future 是纯阻塞计算（从不 `.await`），timeout 无法介入。

---

## 小结

| 概念 | 说明 |
|------|------|
| `futures::join!` | 合并**不同类型**的 Future |
| `trpl::join_all` | 处理**动态数量**的同类型 Future |
| `Box::pin` / `pin!` | 固定 Future 内存位置，支持 trait object |
| `trpl::race` | 竞争两个 Future，取先完成者，停止另一个 |
| `trpl::yield_now` | 主动让出控制权 |
| `timeout` 模式 | `race(slow, sleep)` 实现超时中断 |

处理多个 Future 的精髓在于：根据数量（固定/动态）、类型（相同/不同）、语义（全等/竞争/超时）选择合适的组合器。
