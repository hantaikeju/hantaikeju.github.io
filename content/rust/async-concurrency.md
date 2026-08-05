---
title: "Rust 并发：使用 Async 实现并发"
date: 2026-08-05T11:39:00+08:00
weight: 43
draft: false
tags: ["Rust", "并发", "异步", "标准库"]
categories: ["rust"]
description: "掌握用 async 实现并发：spawn_task 创建异步任务、join! 并发等待多个 Future、异步 channel 消息传递、以及与线程并发的对比。"
---

## 概述

前面学习了 `Future`、`async`/`await` 的基本概念。本篇聚焦于**如何使用 async 实现并发**——创建并发任务、组合多个 Future、以及异步消息传递。

---

## trpl::spawn_task：创建异步任务

`trpl::spawn_task` 类似于 `thread::spawn`，但创建的是**异步任务**而非线程：

```rust
use std::time::Duration;

fn main() {
    trpl::run(async {
        let handle = trpl::spawn_task(async {
            for i in 1..10 {
                println!("hi number {i} from the first task");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        });

        for i in 1..5 {
            println!("hi number {i} from the second task");
            trpl::sleep(Duration::from_millis(500)).await;
        }

        handle.await.unwrap();
    });
}
```

### 与线程的区别

| | `thread::spawn` | `trpl::spawn_task` |
|------|------|------|
| **执行单元** | OS 线程 | 异步任务（轻量级） |
| **等待方式** | `handle.join()` 阻塞线程 | `handle.await` 非阻塞等待 |
| **语法** | 闭包 `\|\| { ... }` | `async { ... }` 代码块 |
| **开销** | 较高（OS 线程） | 较低（用户态任务） |

---

## trpl::join!：并发等待多个 Future

`trpl::join!` 宏用于**同时等待多个 Future 完成**，类似于线程中的"等待所有线程结束"。

```rust
use std::time::Duration;

fn main() {
    trpl::run(async {
        let fut1 = async {
            for i in 1..10 {
                println!("hi number {i} from the first task");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        let fut2 = async {
            for i in 1..5 {
                println!("hi number {i} from the second task");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        trpl::join!(fut1, fut2).await;
    });
}
```

> `join!` 会并发执行两个 `Future`——fut1 和 fut2 交替推进，输出会交错出现。

### spawn_task vs join! 的选择

| 方式 | 适用场景 |
|------|----------|
| `spawn_task` | 主任务和子任务有依赖、或子任务可能先于主任务完成 |
| `join!` | 多个任务地位平等，需全部完成才继续 |

---

## 异步消息传递：trpl::channel

异步环境中也有自己的 channel——用法和多线程的 `mpsc::channel` 类似，但 `send` 和 `recv` 都需要 `.await`。

### 基本用法

```rust
fn main() {
    trpl::run(async {
        let (tx, mut rx) = trpl::channel();

        let val = String::from("hello world");
        tx.send(val).await.unwrap();

        let received = rx.recv().await.unwrap();
        println!("Got: {}", received);
    });
}
```

### 处理多条消息

```rust
use std::time::Duration;

fn main() {
    trpl::run(async {
        let (tx, mut rx) = trpl::channel();

        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            trpl::sleep(Duration::from_millis(500)).await;
        }

        while let Some(value) = rx.recv().await {
            println!("Got: {}", value);
        }
    });
}
```

> `while let Some(value) = rx.recv().await` — 当通道关闭时（发送端 drop），`recv()` 返回 `None`，循环自动退出。

---

## 完整的异步双任务模式

将发送和接收分离为两个独立的异步任务，用 `join!` 并发运行：

```rust
use std::time::Duration;

fn main() {
    trpl::run(async {
        let (tx, mut rx) = trpl::channel();

        let tx_fut = async move {
            let vals = vec![
                String::from("hi"),
                String::from("from"),
                String::from("the"),
                String::from("thread"),
            ];

            for val in vals {
                tx.send(val).unwrap();
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        let rx_fut = async {
            while let Some(value) = rx.recv().await {
                println!("Got: {}", value);
            }
        };

        trpl::join!(tx_fut, rx_fut).await;
    });
}
```

要点：
- `tx_fut` 用 `async move` 获取 `tx` 的所有权
- `rx_fut` 循环接收直到通道关闭
- `join!` 同时驱动两个 `Future`，任一完成都不会终止另一个

> 也可以使用**多生产者模式**（克隆 `tx`），与多线程 `mpsc` 类似。

---

## 小结

| 概念 | 说明 |
|------|------|
| `trpl::spawn_task` | 创建异步任务，返回 handle，用 `.await` 等待 |
| `trpl::join!` | 并发等待多个 `Future` 全部完成 |
| `trpl::channel` | 异步消息通道，`send`/`recv` 都是异步的 |
| `async move` | 将所有权转移到异步代码块中 |
| `while let Some` + `recv().await` | 循环接收直到通道关闭 |

对比之前学过的三种并发方式：

| 方式 | 执行单元 | 等待 | 适用场景 |
|------|----------|------|----------|
| `thread::spawn` | OS 线程 | `join()` 阻塞 | CPU 密集型 |
| `trpl::spawn_task` | 异步任务 | `.await` 非阻塞 | IO 密集型 |
| `trpl::join!` | Future 组合 | `.await` 非阻塞 | 多任务并发 |
