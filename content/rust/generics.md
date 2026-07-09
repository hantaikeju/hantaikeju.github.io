---
title: "Rust：泛型数据类型"
date: 2026-07-09T17:31:00+08:00
weight: 21
draft: false
tags: ["Rust", "编程基础", "类型系统"]
categories: ["rust"]
description: "掌握 Rust 泛型：函数、结构体、枚举和方法中的泛型定义，理解单态化（monomorphization）如何保证运行时零开销。"
---

## 概述

泛型是消除代码重复的工具之一，允许同一段代码代表多种不同的具体数据类型。泛型参数通常用单个字母命名（如 `T`），遵循 UpperCamelCase 规范。

---

## 函数定义中使用泛型

### 无泛型的重复代码

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn largest_char(list: &[char]) -> &char {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest_i32(&number_list);
    println!("The largest number is {result}");

    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest_char(&char_list);
    println!("The largest char is {result}");
}
```

两个函数逻辑完全相同，仅类型不同。

### 使用泛型消除重复

```rust
fn largest<T>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

> 注意：此代码暂时无法编译，因为 `>` 运算符需要 `T` 实现 `PartialOrd` trait，后面会讲到 trait 约束。

---

## Struct 中使用泛型

```rust
struct Point<T> {
    x: T,
    y: T,
}

let integer = Point { x: 5, y: 10 };
let float = Point { x: 1.0, y: 4.0 };
```

x 和 y 必须是**相同类型**。以下写法会报错：

```rust
let integer = Point { x: 5, y: 10.0 }; // ❌ 编译错误！
```

如果需要不同字段使用不同类型，声明多个泛型参数：

```rust
struct Point<T, U> {
    x: T,
    y: U,
}
```

> 泛型参数过多通常意味着需要重构代码。

---

## Enum 中使用泛型

标准库中的 `Option<T>` 和 `Result<T, E>` 就是典型例子：

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

---

## 方法的定义中使用泛型

### 为泛型 struct 实现方法

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}
```

注意 `impl<T>` 告诉编译器 `T` 是泛型参数，而不是具体类型。

### 为特定类型实现方法

```rust
impl Point<f32> {
    fn x(&self) -> f32 {
        self.x
    }
}
```

这意味着只有 `Point<f32>` 类型拥有这个方法。

### 同名方法冲突

泛型实现和具体类型实现的同名方法**不能同时存在**：

```rust
// ❌ 编译错误
// impl<T> Point<T> {
//     fn x(&self) -> &T {
//         &self.x
//     }
// }

impl Point<f32> {
    fn x(&self) -> f32 {
        self.x
    }
}
```

---

## 泛型的运行时性能

**Rust 中泛型不会比使用具体类型更慢。**

Rust 在编译时通过**单态化（monomorphization）**将泛型代码转换为具体类型的代码——编译器为实际使用的每个具体类型生成对应的代码副本。

这意味着泛型具有：
- **零运行时开销**（zero-cost abstraction）
- **编译时类型安全**

---

## 总结

| 要点 | 说明 |
|------|------|
| **函数泛型** | `fn largest<T>(list: &[T]) -> &T`，消除重复逻辑 |
| **Struct 泛型** | `struct Point<T>`，多个字段同类型；`<T, U>` 支持不同类型 |
| **Enum 泛型** | `Option<T>`、`Result<T, E>` |
| **方法泛型** | `impl<T> Point<T>` 泛型方法；`impl Point<f32>` 特定类型方法 |
| **单态化** | 编译时为每个具体类型生成代码，零运行时开销 |
| **命名规范** | 泛型参数用短单字母（如 `T`），遵循 UpperCamelCase |
