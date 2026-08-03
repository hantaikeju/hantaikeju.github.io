---
title: "Rust 并发：消息传递（Channel）"
date: 2026-08-03T10:30:00+08:00
weight: 39
draft: false
tags: ["Rust", "并发", "标准库"]
categories: ["rust"]
description: "掌握 Rust 并发编程中的消息传递模式：mpsc 通道的创建、发送与接收、多生产者、以及 recv 与 try_recv 的使用方式。"
---

## 概述

线程或 actors 通过**发送包含数据的消息**来相互通信，而不是直接共享内存。

> **Go 语言口号**："不要通过共享内存来通信；而是通过通信来共享内存。"

Rust 标准库提供了**通道（channel）** 的实现，让线程间消息传递变得安全且高效。

---

## 通道 Channel

通道是一种程序设计概念，用于在不同线程之间发送数据。它由两个核心部分组成：

| 部分 | 说明 |
|------|------|
| **发送端（Transmitter）** | 用于向通道发送数据 |
| **接收端（Receiver）** | 用于从通道接收数据 |

> 当通道的任一端（发送端或接收端）被丢弃时，通道即被关闭。

---

## 创建通道

使用 `std::sync::mpsc` 模块来创建通道。

**mpsc** 是 **multiple producer, single consumer** 的缩写，意味着：

- 可以有**多个发送者**
- 只能有**一个接收者**

使用 `mpsc::channel()` 创建通道，返回一个 tuple：

```rust
use std::sync::mpsc;

fn main() {
    let (tx, rx) = mpsc::channel();  // tx: 发送端, rx: 接收端
}
```

- `tx` — 发送端（transmitter）
- `rx` — 接收端（receiver）

---

## 发送数据

使用 `send` 方法发送数据：

```rust
tx.send(value)
```

`send` 接收一个参数——想要发送的值，返回 `Result<T, E>` 类型：

- 发送成功 → 返回 `Ok(())`
- 接收端已被丢弃 → 返回 `Err`（数据无法发送）

### 所有权转移

发送数据时，**所有权会转移**到通道中——发送后不能再使用该值：

```rust
use std::{sync::mpsc, thread};

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
        // println!("Sent: {}", val);  // ❌ 编译错误：val 所有权已转移
    });

    let received = rx.recv().unwrap();
    println!("Got: {}", received);
}
```

---

## 接收数据

接收端有两种主要方法接收消息：`recv` 和 `try_recv`。

### recv — 阻塞接收

`recv` 会**阻塞当前线程**，直到收到一个值：

- 有值到达 → 返回 `Ok(value)`
- 所有发送端关闭 → 返回 `Err`，标识不会有更多值到来

```rust
let received = rx.recv().unwrap();  // 阻塞等待
```

### try_recv — 非阻塞接收

`try_recv` **不会阻塞**，立即返回 `Result`：

- 有消息可用 → 返回 `Ok(value)`
- 没有消息 → 返回 `Err`

```rust
match rx.try_recv() {
    Ok(value) => println!("Got: {}", value),
    Err(_) => println!("No message yet"),
}
```

---

## 发送多条消息

发送端可以连续发送多条消息，接收端通过 `for` 循环迭代接收：

```rust
use std::{sync::mpsc, thread, time::Duration};

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];
        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    // rx 作为迭代器，会阻塞等待每条消息
    for received in rx {
        println!("Got: {}", received);
    }
}
```

> `rx` 可以直接用于 `for` 循环——当通道关闭时迭代自动结束。

---

## 多生产者（Multiple Producers）

通过克隆发送端 `tx`，可以创建多个生产者向同一个接收者发送消息：

```rust
use std::{sync::mpsc, thread, time::Duration};

fn main() {
    let (tx, rx) = mpsc::channel();

    let tx1 = tx.clone();  // 克隆出第二个发送端

    // 生产者 1
    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];
        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    // 生产者 2
    thread::spawn(move || {
        let vals = vec![
            String::from("more"),
            String::from("messages"),
            String::from("for"),
            String::from("you"),
        ];
        for val in vals {
            tx1.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    // 单个消费者接收所有消息
    for received in rx {
        println!("Got: {}", received);
    }
}
```

两个线程交替发送，接收端按到达顺序依次获取。当所有 `tx` 都被 drop 后，`for` 循环自动结束。

---

## 小结

| 概念 | 说明 |
|------|------|
| `mpsc::channel()` | 创建多生产者、单消费者通道 |
| `send()` | 发送数据，转移所有权，返回 `Result` |
| `recv()` | 阻塞等待消息 |
| `try_recv()` | 非阻塞尝试获取消息 |
| `clone()` | 克隆发送端，实现多生产者 |
| `for rx` | 将接收端作为迭代器使用 |

消息传递是 Rust 并发编程的核心模式之一。配合 `Arc<Mutex<T>>` 等工具，可以构建安全、高效的并发程序。
