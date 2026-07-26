---
title: "Rust：Deref Trait"
date: 2026-07-22T14:40:00+08:00
weight: 33
draft: false
tags: ["Rust", "智能指针", "Deref", "解引用", "类型转换"]
categories: ["rust"]
description: "掌握 Rust 的 Deref Trait：自定义解引用运算符 * 的行为、实现自定义智能指针、Deref Coercion（隐式解引用转换）规则、Deref 与 DerefMut 的区别和三种转换场景。"
---

## 概述

通过 **Deref Trait** 可以自定义解引用运算符 `*` 的行为，让智能指针像普通引用一样使用。这意味着为普通引用编写的代码，也能直接用于智能指针。

---

## Deref Trait 处理

### 普通引用的解引用

```rust
fn main() {
    let x = 5;
    let y = &x;
    assert_eq!(5, x);
    assert_eq!(5, *y);  // ✅ *y 解引用得到值
}
```

> 直接比较引用和值会报错：`assert_eq!(5, y)` 不行，因为 `y` 是 `&i32` 类型，不是 `i32`。

### Box 自动支持解引用

将 `y` 换为 `Box`，同样支持 `*` 解引用：

```rust
fn main() {
    let x = 5;
    let y = Box::new(x);
    assert_eq!(5, x);
    assert_eq!(5, *y);  // ✅ Box<i32> 也支持 * 解引用
}
```

### 自定义 MyBox

如果直接定义自己的 `MyBox<T>`，它不支持 `*`：

```rust{hl_lines=[1]}
struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

fn main() {
    let x = 5;
    let y = MyBox::new(x);
    assert_eq!(5, *y);  // ❌ 编译错误！MyBox 没有实现 Deref
}
```

### 实现 Deref Trait

为 `MyBox<T>` 实现 `Deref` trait 后，`*y` 即可正常使用：

```rust
use std::ops::Deref;

struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

fn main() {
    let x = 5;
    let y = MyBox::new(x);
    assert_eq!(5, *y);  // ✅ 等价于 *(y.deref())
}
```

> `Deref` trait 要求实现 `deref` 方法，返回指向内部数据的引用。当编译器遇到 `*y` 时，实际展开为 `*(y.deref())`。

---

## Deref Coercion（隐式解引用转换）

**Deref Coercion** 是 Rust 的一种隐式转换机制：将实现了 `Deref` trait 的类型的引用，自动转换为另一个类型的引用。

### 核心规则

如果 `T: Deref<Target = U>`，那么 `&T` 可以自动转换为 `&U`。

这是一条**链式规则**：编译器会连续应用 Deref，直到找到匹配的目标类型。

### 实际例子

```rust
fn hello(name: &str) {
    println!("Hello, {}!", name);
}

fn main() {
    let m = MyBox::new(String::from("Rust"));
    hello(&m);  // ✅ Deref Coercion 自动转换
}
```

**转换过程**（编译器自动完成）：

```
&MyBox<String> → &String → &str
```

如果没有 Deref Coercion，需要手动写出：

```rust
hello(&(*m)[..]);  // 手动解引用再切片，很不方便
```

### Deref Coercion 的好处

| 效果 | 说明 |
|------|------|
| 减少 `&` 和 `*` | 函数调用时无需大量显式引用/解引用操作 |
| 统一编码风格 | 同一个函数可同时接受引用和智能指针 |
| 适用广泛 | `String` → `&str`、`Vec<T>` → `&[T]`、`Box<T>` → `&T` 等都受益 |

---

## Deref Coercion 与可变性

Rust 提供两个解引用 trait：

| Trait | 重载对象 | 用于 |
|-------|---------|------|
| `Deref` | 不可变引用 `&T` 的 `*` | 只读访问 |
| `DerefMut` | 可变引用 `&mut T` 的 `*` | 可变访问 |

### 三种解引用转换场景

Rust 在以下三种情况下自动应用 Deref Coercion：

| 场景 | 条件 | 示例 |
|------|------|------|
| `&T` → `&U` | `T: Deref<Target = U>` | `&String` → `&str` |
| `&mut T` → `&mut U` | `T: DerefMut<Target = U>` | `&mut String` → `&mut str` |
| `&mut T` → `&U` | `T: Deref<Target = U>` | `&mut String` → `&str` |

> **注意**：`&T` → `&mut U` 是**不允许**的。从不可变引用无法自动推导出可变引用，这违反了 Rust 的借用规则。

---

## Deref 的设计哲学

| 要点 | 说明 |
|------|------|
| `deref` 返回引用 | 不返回所有权，不转移内部数据 |
| 编译器自动展开 | 遇到 `*` 时自动调用 `deref()` |
| 零运行时开销 | Deref Coercion 在编译期完成，无运行时转换代价 |
| 不与多态混淆 | Deref 不用于实现继承/子类型——这在 Rust 中用 Trait 完成 |

> Deref Coercion 是 Rust **零成本抽象**（zero-cost abstraction）的典型体现：编译期完成的隐式转换，运行时毫无额外开销。
