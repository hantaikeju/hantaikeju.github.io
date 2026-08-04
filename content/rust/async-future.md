---
title: "Rust 并发：异步编程与 Future"
date: 2026-08-04T15:25:00+08:00
weight: 42
draft: false
tags: ["Rust", "并发", "异步", "标准库"]
categories: ["rust"]
description: "掌握 Rust 异步编程核心：Future trait、async/await 语法、并行与并发的区别、阻塞与非阻塞操作，以及 trpl 库的使用方式。"
---

## 概述

> **Asynchronous Programming**：让程序在等待某些操作完成时，能够执行其他任务。

几个核心概念：

| 概念 | 说明 |
|------|------|
| **并行性（Parallelism）** | 同时执行多个操作 |
| **并发性（Concurrency）** | 在操作间进行切换 |
| **阻塞操作（Blocking）** | 阻止程序继续执行，直到操作完成 |
| **非阻塞操作（Non-blocking）** | 允许程序在等待时执行其他任务 |

---

## 操作类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **CPU 密集型** | 受处理器能力限制 | 视频导出、科学计算 |
| **IO 密集型** | 受输入/输出速度限制 | 文件下载、网络请求 |

异步编程对 IO 密集型任务效果最明显——CPU 大部分时间在等 IO，切换去干别的事正好。

---

## 并行与并发

### 并发（Concurrency）

一个执行单元处理多个任务，通过**任务切换**实现。

> 类比：一个人在多个项目间切换工作。

```
Task A: ████░░░░████░░░░
Task B: ░░░░████░░░░████
```

### 并行（Parallelism）

多个执行单元**同时**处理不同任务。

> 类比：多人同时各自负责一个任务。

```
Task A: ████████████████
Task B: ████████████████
```

### 串行（Serial Work）

任务必须按特定顺序**一个接一个**地完成。

> 类比：任务之间存在依赖关系，必须等待前一个完成。

| 处理器 | 能力 |
|--------|------|
| **单核** | 只能实现并发（时间片轮转） |
| **多核** | 可同时实现并发和并行 |

> 线程、进程与异步：实现并发的不同机制。Rust 的异步编程**主要处理并发性**，底层可能利用并行性（取决于硬件、OS 和异步运行时）。

**异步运行时**负责协调和管理并发任务。

---

## Futures 与 async/await 语法

### 核心三元素

| 元素 | 说明 |
|------|------|
| **`Future`** | 一个可能现在还未就绪、但将来会就绪的值（其他语言中也叫 task 或 promise） |
| **`async`** | 用于代码块或函数，标识可被中断和恢复，将其转换为返回 `Future` 的形式 |
| **`await`** | 等待 `Future` 就绪，提供暂停和恢复执行的点 |

在 Rust 中，`Future` 是实现了 `Future` trait 的类型。

### 轮询（Polling）

**轮询**是检查 `Future` 值是否可用的过程——异步运行时会不断轮询各个 `Future`，一旦就绪就继续执行。

### 编译转换

Rust 编译器将 `async`/`await` 代码转换为使用 `Future` trait 的等效代码——类似于 `for` 循环被转换为使用 `Iterator` trait。开发者也可以为自定义数据类型实现 `Future` trait，提供统一接口但允许不同的异步操作实现。

---

## trpl 库

`trpl`（The Rust Programming Language）整合了 futures 和 tokio 两个核心异步库的功能，专注于异步编程学习，避免生态系统干扰。

| 库 | 角色 |
|----|------|
| **futures** | 异步实现的官方家园，定义了 `Future` trait |
| **tokio** | 最流行的异步运行时，广泛用于 Web 开发 |

`trpl` 重导出类型、函数和 trait，隐藏复杂细节，专注于异步核心概念。

---

## 基本用法

### Future 是惰性的

`Future` 是**惰性的**——只有被 `.await` 时才会开始执行。

```rust
async fn page_title(url: &str) -> Option<String> {
    let response = trpl::get(url).await;
    let response_text = response.text().await;

    Html::parse(&response_text)
        .select_first("title")
        .map(|title_element| title_element.inner_html())
}
```

### 运行异步代码

```rust
use trpl::Html;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let url = &args[1];

    trpl::run(async {
        match page_title(url).await {
            Some(title) => println!("Page title: {}", title),
            None => println!("Could not find a title for the page."),
        }
    })
}

async fn page_title(url: &str) -> Option<String> {
    let response = trpl::get(url).await;
    let response_text = response.text().await;

    Html::parse(&response_text)
        .select_first("title")
        .map(|title_element| title_element.inner_html())
}
```

---

## 竞速：trpl::race

同时发起两个异步操作，**谁先完成就使用谁**，另一个被停止：

```rust
use trpl::{Either, Html};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    trpl::run(async {
        let title_fut_1 = page_title(&args[1]);
        let title_fut_2 = page_title(&args[2]);

        let (url, maybe_title) = match trpl::race(title_fut_1, title_fut_2).await {
            Either::Left(left) => left,
            Either::Right(right) => right,
        };

        println!("URL: {} return first", url);

        match maybe_title {
            Some(title) => println!("Title: {}", title),
            None => println!("No title found"),
        }
    })
}

async fn page_title(url: &str) -> (&str, Option<String>) {
    let response = trpl::get(url).await;
    let response_text = response.text().await;

    let title = Html::parse(&response_text)
        .select_first("title")
        .map(|title_element| title_element.inner_html());

    (url, title)
}
```

`trpl::race` 返回 `Either` 枚举：

```rust
enum Either<A, B> {
    Left(A),
    Right(B),
}
```

- `Left` — 第一个 `Future` 先完成
- `Right` — 第二个 `Future` 先完成

---

## 小结

| 概念 | 说明 |
|------|------|
| 并发 vs 并行 | 并发是任务切换，并行是同时执行 |
| 阻塞 vs 非阻塞 | 阻塞等待，非阻塞可切换 |
| `Future` trait | 异步值的抽象，惰性执行 |
| `async` | 将函数/代码块转为返回 `Future` |
| `.await` | 等待 `Future` 就绪，暂停点 |
| 异步运行时 | 协调和管理并发任务（如 tokio） |
| `trpl::race` | 竞速多个 `Future`，取先完成者 |
