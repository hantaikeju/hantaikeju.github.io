---
title: "Rust：RefCell<T> 和内部可变性模式"
date: 2026-07-26T16:40:00+08:00
weight: 36
draft: false
tags: ["Rust", "智能指针", "RefCell", "内部可变性", "运行时借用检查", "单线程"]
categories: ["rust"]
description: "掌握 Rust 的 RefCell<T> 和内部可变性（Interior Mutability）模式：在不可变引用下修改数据、运行时借用检查（borrow / borrow_mut）、与 Box<T> 的编译时检查对比、结合 Rc<T> 实现多重所有权的可变数据共享。"
---

## 概述

### 内部可变性 —— Interior Mutability

**内部可变性**是 Rust 的一种设计模式：允许在持有**不可变引用**时也能修改数据。

它的原理是：数据结构内部使用 `unsafe` 代码来绕过 Rust 通常的借用规则。`unsafe` 代码意味着开发者需要**手动检查规则**，而不是依赖编译器。

> 只有当能保证在**运行时**借用规则被遵守时，才可以使用内部可变性模式的类型。

---

## RefCell\<T\>

`RefCell<T>` 表示对其所持有数据的**单一所有权**，但它允许在运行时修改内部数据，即使 `RefCell<T>` 本身是不可变的。

### Box\<T\> vs RefCell\<T\> 对比

| 特性 | `Box<T>` | `RefCell<T>` |
|------|----------|-------------|
| **借用规则检查时机** | **编译时**强制检查 | **运行时**强制检查 |
| **违反借用规则** | 编译报错 | 程序 **panic**（崩溃） |
| **所有权** | 单一所有权 | 单一所有权 |
| **可变性** | 编译时决定 | 运行时决定 |

> 关键区别：`Box<T>` 在编译阶段就拒绝违反借用规则的代码；`RefCell<T>` 允许编译通过，但在运行时检测到违规时直接 panic。

### 何时使用 RefCell\<T\>

- 代码逻辑上遵守了借用规则，但**编译器无法理解或无法保证**时
- Rust 编译器是**保守**的——有时即使代码是安全的，编译器也会拒绝
- **仅适用于单线程**场景（多线程使用会在编译时报错）

---

## Box\<T\> / Rc\<T\> / RefCell\<T\> 选择指南

| 需求 | 选择 |
|------|------|
| 单一所有者 + 编译时可变性 | `Box<T>` |
| 多重所有者 + 不可变共享 | `Rc<T>` |
| 单一所有者 + 运行时可变性 | `RefCell<T>` |
| 多重所有者 + 运行时可变性 | `Rc<RefCell<T>>` |

---

## RefCell\<T\> 使用

### 基础示例

在 Rust 中，你无法对不可变绑定的值获取可变引用：

```rust
fn main() {
    let x = 5;
    let y = &mut x;  // ❌ 编译错误！x 是不可变的
}
```

但使用 `RefCell<T>`，可以在运行时"绕过"这个限制：

```rust
use std::cell::RefCell;

fn main() {
    let x = RefCell::new(5);
    *x.borrow_mut() += 1;  // ✅ 即使 x 不可变，也能修改内部值
    println!("x = {}", x.borrow());  // x = 6
}
```

---

## 在运行时使用 RefCell\<T\> 跟踪借用

`RefCell<T>` 在**运行时**跟踪借用情况，提供两个方法：

| 方法 | 返回类型 | 说明 |
|------|---------|------|
| `borrow()` | `Ref<T>` | 不可变借用，类似 `&T` |
| `borrow_mut()` | `RefMut<T>` | 可变借用，类似 `&mut T` |

### 运行时借用规则

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(42);

    let a = data.borrow();       // ✅ 不可变借用
    let b = data.borrow();       // ✅ 多个不可变借用 OK
    println!("a: {}, b: {}", a, b);

    // let c = data.borrow_mut(); // ❌ 运行时 panic！已有不可变借用
}
```

> 与编译时规则一致：同一时刻可以有**多个**不可变借用，或**一个**可变借用，但两者**不能共存**。区别只是检查时机从编译时推迟到了运行时。

### 违反规则导致 panic

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(42);

    let mut a = data.borrow_mut();  // 可变借用
    let mut b = data.borrow_mut();  // ❌ 运行时 panic！同一时刻只能有一个可变借用
}
```

---

## 结合 Rc\<T\> 和 RefCell\<T\>

`Rc<T>` 提供多重所有权但**不可变**，`RefCell<T>` 提供可变性但**单一所有权**。将两者结合——`Rc<RefCell<T>>`——就能得到一个**可修改的、多个持有者共享**的值：

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let value = Rc::new(RefCell::new(5));

    let a = Rc::clone(&value);
    let b = Rc::clone(&value);

    *a.borrow_mut() += 10;   // 通过 a 修改
    *b.borrow_mut() += 20;   // 通过 b 修改

    println!("value = {}", value.borrow());  // value = 35
}
```

> 这是一个非常常见的组合模式：`Rc<T>` 负责**共享所有权**，`RefCell<T>` 负责**运行时可变性**。两者配合，实现了单线程下的共享可变数据。

---

## 总结

| 要点 | 说明 |
|------|------|
| **核心概念** | 内部可变性 —— 不可变引用下也能修改数据 |
| **实现方式** | 内部使用 `unsafe` 代码，运行时手动检查规则 |
| **检查时机** | 编译时（`Box<T>`）→ 运行时（`RefCell<T>`） |
| **违反后果** | 编译错误（`Box<T>`）→ 运行时 panic（`RefCell<T>`） |
| **借用方法** | `borrow()` → `Ref<T>`，`borrow_mut()` → `RefMut<T>` |
| **限制** | 仅限单线程 |
| **经典组合** | `Rc<RefCell<T>>`：多重所有权 + 运行时可变性 |

至此，我们已经学习了 Rust 的三大智能指针基础组件：`Box<T>`（堆分配）、`Rc<T>`（引用计数）、`RefCell<T>`（内部可变性）。它们各有侧重，也可以组合使用来应对更复杂的场景。
