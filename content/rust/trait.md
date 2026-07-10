---
title: "Rust：Trait（特征）"
date: 2026-07-10T16:51:00+08:00
weight: 22
draft: false
tags: ["Rust", "编程基础", "类型系统"]
categories: ["rust"]
description: "掌握 Rust Trait：定义共享行为、为类型实现 Trait、默认实现、Trait 作为参数、Trait Bound 约束、where 子句以及孤儿规则。"
---

## 概述

Trait 定义了特定类型所具有的**共享行为**。它以一种抽象的方式规定类型必须提供的方法签名。结合 Trait Bound，可以约束泛型参数只接受实现了某些特定行为的类型。

---

## 定义 Trait

Trait 将一组方法签名组合在一起，定义一套共享行为：

```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```

### 为类型实现 Trait

```rust
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

pub struct Tweet {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub retweet: bool,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

### 使用

```rust
use aggregator::{Summary, Tweet};

fn main() {
    let tweet = Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know"),
        reply: false,
        retweet: false,
    };

    print!("1 new tweet: {}", tweet.summarize());
}
```

---

## Trait 的实现规则（孤儿规则）

只要 **Trait** 或 **类型** 其中之一属于当前 crate，就可以实现该 Trait。

| | 合法 ✅ | 非法 ❌ |
|------|----------|----------|
| 示例 | 在本地 `Tweet` 上实现标准库的 `Display` | 在 `Vec<T>` 上实现 `Display`（两者都来自标准库） |
| 示例 | 在标准库 `Vec<T>` 上实现本地的 `Summary` | — |

**孤儿规则（Orphan Rule）**：Trait 或类型必须至少有一个来自当前 crate。这样做是为了：
- 防止多个 crate 为同一类型实现相同 Trait 导致歧义
- 保证代码的一致性和稳定性

---

## Trait 的默认实现

可以为 Trait 方法提供默认实现，实现者可以保留或覆盖：

```rust
pub trait Summary {
    fn summarize(&self) -> String {
        format!("Read more from {}", self.summarize_author())
    }

    fn summarize_author(&self) -> String;  // 无默认实现，必须手动实现
}
```

```rust
impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }

    fn summarize_author(&self) -> String {
        format!("@{}", self.author)
    }
}

impl Summary for Tweet {
    fn summarize_author(&self) -> String {
        format!("@{}", self.username)
    }
    // summarize 使用默认实现
}
```

默认实现中可以调用同一个 Trait 中尚未实现的方法（如上例 `summarize` 调用 `summarize_author`）。

---

## Trait 作为参数

### &impl Trait 语法

```rust
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}
```

函数 `notify` 接受任何实现了 `Summary` Trait 的类型的引用。

---

## Trait Bound

`impl Trait` 本质是 Trait Bound 的语法糖，完整形式为：

```rust
pub fn notify<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}
```

### 多个 Trait Bound

当需要多个约束时：

```rust
pub fn notify(item: &(impl Summary + Display)) { /* ... */ }

// 等价于
pub fn notify<T: Summary + Display>(item: &T) { /* ... */ }
```

### where 子句

当 Trait Bound 过多时，函数签名会变得冗长。使用 `where` 子句可以提升可读性：

```rust
// 不使用 where（难以阅读）
fn some_function<T: Display + Clone, U: Clone + Debug>(t: &T, u: &U) -> i32 { /* ... */ }

// 使用 where（清晰易读）
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
    /* ... */
}
```

### 返回 impl Trait

```rust
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know"),
        reply: false,
        retweet: false,
    }
}
```

> 注意：返回 `impl Trait` 时，函数只能返回**单一具体类型**，不能在不同分支返回不同类型。

### 针对特定条件实现方法

可以只在泛型参数满足特定 Trait 约束时才实现某个方法：

```rust
struct Pair<T> {
    x: T,
    y: T,
}

impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest is x = {}", self.x);
        } else {
            println!("The largest is y = {}", self.y);
        }
    }
}
```

---

## 总结

| 要点 | 说明 |
|------|------|
| **定义** | `pub trait Summary { fn summarize(&self) -> String; }` |
| **实现** | `impl Summary for Tweet { ... }` |
| **孤儿规则** | Trait 或类型至少有一个属于当前 crate |
| **默认实现** | 方法体写在 trait 中即可，实现者可覆盖 |
| **参数** | `fn notify(item: &impl Summary)` |
| **Trait Bound** | `fn notify<T: Summary>(item: &T)` |
| **多个约束** | `T: Summary + Display` |
| **where** | 将约束移到函数签名后，提升可读性 |
| **返回** | `fn f() -> impl Summary`，只能返回单一类型 |
| **条件实现** | `impl<T: Display + PartialOrd> Pair<T>` |
