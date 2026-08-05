---
title: "Rust 并发：Stream 流处理"
date: 2026-08-05T16:31:00+08:00
weight: 45
draft: false
tags: ["Rust", "并发", "异步", "标准库"]
categories: ["rust"]
description: "掌握 Rust Stream 流处理：异步迭代器概念、StreamExt 高阶 API、从迭代器创建流、ReceiverStream 组合、以及 merge 合并流。"
---

## 概述

在消息传递中，异步的 `recv` 方法会**随着时间产生一系列项目**——这称为 **Stream（流）**。

| | 异步通道接收器 | 迭代器 Iterator |
|------|------|------|
| **同步/异步** | 异步 | 同步 |
| **API** | `recv()` → `trpl::Receiver` | `next()` |
| **类比** | Stream 是异步版的 Iterator | Iterator 是同步版的 Stream |

> Stream 就像**异步版本的 Iterator**。可以从任何 Iterator 创建 Stream，也可以用通道接收端自然构造 Stream。

---

## StreamExt

`Ext` 是 Rust 社区中用来**扩展某个 trait** 的常见命名模式。

| 层级 | 说明 |
|------|------|
| **`Stream` trait** | 定义低级接口，有效结合了 `Iterator` 和 `Future` traits |
| **`StreamExt`** | 在 `Stream` 之上提供一组**更高级的 API**，包括 `next` 方法及其他类似 `Iterator` 的工具方法 |

> `Stream` 和 `StreamExt` 尚未成为 Rust 标准库的一部分，但大多数生态 crate 使用相同的定义。

### 基本用法：从 Iterator 创建 Stream

```rust
use trpl::StreamExt;

fn main() {
    trpl::run(async {
        let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let iter = values.iter().map(|n| n * 2);

        let mut stream = trpl::stream_from_iter(iter);

        while let Some(value) = stream.next().await {
            println!("Value: {}", value);
        }
    })
}
```

关键点：

- `trpl::stream_from_iter` 将同步 Iterator 转为异步 Stream
- `stream.next().await` 异步获取下一个元素，类似于 `iter.next()` 但非阻塞
- `while let Some(value)` 循环消费整个流，流结束时返回 `None`

---

## Composing Streams（组合流）

许多概念天然适合用 Stream 表示：

| 场景 | 说明 |
|------|------|
| 队列 | 逐渐可用的项目 |
| 大文件读取 | 逐步拉取的数据块 |
| 网络数据 | 随时间到达的数据包 |
| 实时通信 | WebSocket 消息流 |

> Stream 其实就是 Future，可以与任意类型的 Future 组合使用。

---

## ReceiverStream：通道变流

`trpl::ReceiverStream` 将异步通道的接收端包装为 Stream，使其可以使用 `StreamExt` 的所有方法：

```rust
use trpl::{ReceiverStream, StreamExt};

fn main() {
    trpl::run(async {
        let mut messages = get_messages();

        while let Some(message) = messages.next().await {
            println!("{}", message);
        }
    })
}

fn get_messages() -> impl Stream<Item = String> {
    let (tx, rx) = trpl::channel();

    let messages = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    for message in messages {
        tx.send(format!("Message: {}", message)).unwrap();
    }

    ReceiverStream::new(rx)
}
```

要点：

- 函数返回 `impl Stream<Item = String>`——不暴露内部实现
- `ReceiverStream::new(rx)` 将接收端转为 Stream
- 发送端 `tx` 在函数结束时 drop，通道关闭，Stream 自然终止
- 调用方统一使用 `stream.next().await` 消费

---

## StreamExt 常用方法

`StreamExt` 提供了类似 `Iterator` 的丰富组合子：

| 方法 | 说明 | 类比 Iterator |
|------|------|---------------|
| `next()` | 获取下一个元素（异步） | `next()` |
| `map()` | 转换每个元素 | `map()` |
| `filter()` | 过滤元素 | `filter()` |
| `fold()` | 累积计算 | `fold()` |
| `merge()` | 合并两个流 | — |

### merge：合并两个流

`merge` 方法将两个 Stream 合并为一个，来自两个流的元素**交替**输出：

```rust
let stream1 = trpl::stream_from_iter(iter1);
let stream2 = trpl::stream_from_iter(iter2);

let merged = stream1.merge(stream2);

while let Some(value) = merged.next().await {
    println!("{}", value);
}
```

---

## 小结

| 概念 | 说明 |
|------|------|
| `Stream` | 异步版 `Iterator`，元素随时间异步产出 |
| `StreamExt` | 在 `Stream` 之上提供 `map`/`filter`/`fold`/`merge` 等高阶 API |
| `trpl::stream_from_iter` | 从同步 Iterator 创建 Stream |
| `ReceiverStream` | 将通道接收端包装为 Stream |
| `stream.next().await` | 异步获取下一个元素 |
| `merge` | 合并两个流 |

从 Iterator 到 Stream 的演变：

| 同步 | 异步 |
|------|------|
| `Iterator` trait | `Stream` trait |
| `iter.next()` | `stream.next().await` |
| `for item in iter` | `while let Some(item) = stream.next().await` |
| 组合子（map/filter/fold） | `StreamExt` 同名组合子 |
