---
title: "Rust 面向对象编程特性"
date: 2026-08-06T15:46:00+08:00
weight: 48
draft: false
tags: ["Rust", "编程基础", "设计模式"]
categories: ["rust"]
description: "理解 Rust 如何实现面向对象三大特性：pub 封装、Trait Object 多态、泛型与 trait object 的静态/动态派发对比，以及为什么 Rust 不使用传统继承。"
---

## 概述

在编程社区中，对于一种语言需要具备哪些特性才能被视为"面向对象"，并没有达成共识。Rust 受到多种编程范式的影响。

《Design Patterns》的定义：

> 面向对象程序由**对象**组成。一个对象既包含**数据**，也包含操作该数据的**程序（方法）**。

从这个角度看，Rust 的 `struct` + `impl` 天然就是对象。但 OOP 的另外三大特性呢？

---

## 封装：隐藏实现细节

封装意味着：对象的实现细节**不能被使用该对象的代码访问**。

Rust 通过 `pub` 关键字实现：

- `pub` 决定哪些模块、类型、函数和方法是**公共的**
- 默认情况下，**其他所有内容都是私有的**

```rust
pub struct AveragedCollection {
    list: Vec<i32>,          // 私有字段
    average: f64,            // 私有字段
}

impl AveragedCollection {
    pub fn add(&mut self, value: i32) {
        self.list.push(value);
        self.update_average();
    }

    pub fn remove(&mut self) -> Option<i32> {
        let result = self.list.pop();
        match result {
            Some(value) => {
                self.update_average();
                Some(value)
            }
            None => None,
        }
    }

    pub fn average(&self) -> f64 {
        self.average
    }

    fn update_average(&mut self) {  // 私有方法
        let total: i32 = self.list.iter().sum();
        self.average = total as f64 / self.list.len() as f64;
    }
}
```

- 外部代码只能通过 `add`、`remove`、`average` 与结构体交互
- `list`、`average` 字段和 `update_average` 方法对外不可见
- 修改内部实现不影响外部调用者

---

## 继承：Rust 不提供传统继承

继承是一种机制：一个对象可以继承另一个对象定义中的元素，获得父对象的**数据**和**行为**，而无需再次定义。

> Rust **没有**传统意义上的结构体继承。在不使用宏的情况下，无法定义一个"继承父结构体字段和方法实现"的结构体。

### Rust 的替代方案

| 传统 OOP 继承的目的 | Rust 的替代 |
|-----|------|
| **代码复用** | `Default` trait 实现、组合（composition） |
| **类型多态** | Trait + Trait Object |
| **接口规范** | Trait 定义共享行为 |

> 组合优于继承——Rust 鼓励将功能拆分为小的 trait，通过组合实现复杂行为。

---

## 多态：Trait Object

多态意味着代码可以处理**多种类型**的数据。Rust 有两种方式实现：

### 方式一：泛型 + Trait Bound（静态派发）

```rust
fn draw_all<T: Draw>(items: &[T]) {
    for item in items {
        item.draw();
    }
}
```

- 编译时**单态化**——为每种具体类型生成独立代码
- 性能高，但集合中只能存放**同一种类型**

### 方式二：Trait Object（动态派发）

```rust
fn draw_all(items: &[Box<dyn Draw>]) {
    for item in items {
        item.draw();
    }
}
```

- 运行时通过 vtable 查找方法
- 略低性能，但集合中可以存放**不同类型**（只要实现了同一个 trait）

---

## Trait Object 实战

### 定义 trait

```rust
pub trait Draw {
    fn draw(&self);
}

pub struct Screen {
    pub components: Vec<Box<dyn Draw>>,
}

impl Screen {
    pub fn run(&self) {
        for component in self.components.iter() {
            component.draw();
        }
    }
}
```

### 库中实现具体类型

```rust
pub struct Button {
    pub width: u32,
    pub height: u32,
    pub label: String,
}

impl Draw for Button {
    fn draw(&self) {
        println!("Drawing a button: {} ({}x{})", self.label, self.width, self.height);
    }
}
```

### 使用者自定义新类型

```rust
use gui::{Button, Draw, Screen};

struct SelectBox {
    width: u32,
    height: u32,
    options: Vec<String>,
}

impl Draw for SelectBox {
    fn draw(&self) {
        println!("Drawing a select box: ({}x{})", self.width, self.height);
    }
}

fn main() {
    let screen = Screen {
        components: vec![
            Box::new(SelectBox {
                width: 100,
                height: 50,
                options: vec!["Option 1".to_string(), "Option 2".to_string()],
            }),
            Box::new(Button {
                width: 100,
                height: 50,
                label: "Click me!".to_string(),
            }),
        ],
    };
    screen.run();
}
```

输出：

```
Drawing a select box: (100x50)
Drawing a button: Click me! (100x50)
```

> 库作者不知道 `SelectBox` 的存在，但通过 `dyn Draw` trait object，`Screen` 可以统一调用任何实现了 `Draw` 的类型。

### 语法要点

通过引用或智能指针 + `dyn` 关键字 + trait 名称创建 trait object：

```rust
&dyn Draw          // 引用
Box<dyn Draw>      // 智能指针
Arc<dyn Draw>      // 原子引用计数
```

> 不能向 trait object 中添加**数据字段**——trait object 的用途较为特殊，主要用于在通用行为上实现抽象。

---

## Trait Object vs 泛型

| 特性 | 泛型（`<T: Trait>`） | Trait Object（`dyn Trait`） |
|------|------|------|
| **派发方式** | 静态派发（编译期单态化） | 动态派发（运行时 vtable） |
| **性能** | 更高（零开销） | 略低（有间接调用开销） |
| **集合中类型** | 只能一种类型 | 可以是多种不同类型 |
| **代码膨胀** | 每种类型生成一份代码 | 只生成一份代码 |
| **适用场景** | 同构集合、性能敏感 | 异构集合、需要灵活性 |

> 需要在**灵活性和性能**之间做出权衡。泛型的单态化——编译时就知道类型；动态派发——只有运行时才知道。

---

## 小结

| OOP 特性 | Rust 实现方式 |
|------|------|
| **对象** | `struct` + `impl` |
| **封装** | `pub` 关键字（默认私有） |
| **继承（数据）** | 不直接支持，用组合替代 |
| **继承（行为）** | Trait + 默认实现 |
| **多态** | 泛型（静态派发）或 Trait Object（动态派发） |

Rust 的面向对象不是照搬传统模式，而是用 trait 体系、所有权和组合提供了**更安全、更灵活**的替代方案。
