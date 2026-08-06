---
title: "Rust 设计模式：状态模式（State Pattern）"
date: 2026-08-06T17:19:00+08:00
weight: 49
draft: false
tags: ["Rust", "编程基础", "设计模式"]
categories: ["rust"]
description: "用 Rust 实现经典的状态模式：以博客文章审批流程为例，通过 Trait Object 和状态对象优雅地管理 Draft → PendingReview → Published 的状态转换。"
---

## 概述

**状态模式（State Pattern）** 是一种面向对象的设计模式：

- 定义一个值内部可能具有的**一组状态**
- 这些状态由一组**状态对象**表示
- 值的行为会**基于其状态而变化**

> 使用状态模式的优势：当业务需求变更时，无需修改持有状态的值或使用该值的代码。只需更新其中一个状态对象内部的代码，或者添加更多状态对象。

---

## 场景：博客文章审批流程

一篇博客文章经历三种状态：

```
Draft ──request_review()──→ PendingReview ──approve()──→ Published
```

- **Draft（草稿）**：可以编辑，但 `content()` 返回空
- **PendingReview（待审核）**：不能编辑，`content()` 仍返回空
- **Published（已发布）**：不能编辑，`content()` 返回正文

---

## 实现

### Post 结构体

```rust
pub struct Post {
    state: Option<Box<dyn State>>,
    content: String,
}

impl Post {
    pub fn new() -> Post {
        Post {
            state: Some(Box::new(Draft {})),
            content: String::new(),
        }
    }

    pub fn add_text(&mut self, text: &str) {
        self.content.push_str(text);
    }

    pub fn content(&self) -> &str {
        // as_ref: Option<&Box<dyn State>> → Option<&dyn State>
        self.state.as_ref().unwrap().content(self)
    }
}
```

### 状态转换方法

```rust
impl Post {
    pub fn request_review(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.request_review());
        }
    }

    pub fn approve(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.approve());
        }
    }
}
```

关键技巧：`self.state.take()` 取出 `Option` 中的值（留下 `None`），将旧状态对象的所有权转移给转换方法，新状态对象再放回去。

### State Trait

```rust
trait State {
    fn request_review(self: Box<Self>) -> Box<dyn State>;
    fn approve(self: Box<Self>) -> Box<dyn State>;

    fn content<'a>(&self, post: &'a Post) -> &'a str {
        ""  // 默认返回空
    }
}
```

> `self: Box<Self>` 而非 `&self`——拿走所有权，旧状态被销毁，新状态取而代之。

### 各状态实现

```rust
struct Draft {}

impl State for Draft {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        Box::new(PendingReview {})
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        self  // Draft 不能直接发布，保持原状态
    }
}
```

```rust
struct PendingReview {}

impl State for PendingReview {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        self  // 已在审核中，不变
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        Box::new(Published {})
    }
}
```

```rust
struct Published {}

impl State for Published {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        self  // 已发布，不变
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        self  // 已发布，不变
    }

    fn content<'a>(&self, post: &'a Post) -> &'a str {
        &post.content  // 只有 Published 返回真实内容
    }
}
```

---

## 使用示例

```rust
use blog::Post;

fn main() {
    let mut post = Post::new();

    post.add_text("I ate a salad for lunch today");
    assert_eq!("", post.content());  // Draft 阶段为 ""

    post.request_review();
    assert_eq!("", post.content());  // PendingReview 阶段仍为 ""

    post.approve();
    assert_eq!("I ate a salad for lunch today", post.content());  // Published!
}
```

---

## Rust 的改进：将状态编码为类型

除了传统的 trait object 方式，Rust 还可以**将状态编码为不同的类型**，在编译期保证状态安全：

```rust
pub struct Post { content: String }
pub struct DraftPost { content: String }
pub struct PendingReviewPost { content: String }

impl Post {
    pub fn new() -> DraftPost { ... }
    pub fn content(&self) -> &str { &self.content }
}

impl DraftPost {
    pub fn add_text(&mut self, text: &str) { ... }
    pub fn request_review(self) -> PendingReviewPost { ... }
    // 没有 content() 方法！编译期阻止误用
}

impl PendingReviewPost {
    pub fn approve(self) -> Post { ... }
    // 也没有 content()！
}
```

使用方式（链式调用，类似建造者模式）：

```rust
let post = Post::new()
    .add_text("I ate a salad")
    .request_review()
    .approve();
```

| 方式 | 优点 | 缺点 |
|------|------|------|
| **Trait Object** | 运行时灵活，状态可动态切换 | 运行时开销，状态错误需 `panic` |
| **类型编码** | 编译期检查，零运行时开销 | 类型繁多，状态转换需消费 `self` |

---

## 小结

| 概念 | 说明 |
|------|------|
| 状态模式 | 用状态对象封装行为，随状态变化而变化 |
| `Box<dyn State>` | trait object 实现不同状态 |
| `self.state.take()` | 取出旧状态所有权，交给转换方法 |
| `self: Box<Self>` | 方法消费自身，返回新状态 |
| 类型编码 | Rust 特有改进——编译期保证状态正确 |
