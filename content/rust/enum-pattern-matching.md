---
title: "Rust 核心：Enum 与模式匹配"
date: 2026-07-06T16:01:00+08:00
weight: 15
draft: false
tags: ["Rust", "编程基础", "类型系统"]
categories: ["rust"]
description: "深入理解 Rust 枚举：定义与变体、持有数据、Option 替代 Null、match 穷尽匹配、if let 简洁语法以及模式匹配的所有权处理。"
---

## 概述

**枚举（Enum）** 是 Rust 中一种定义一组可能取值的自定义类型。与结构体不同，枚举的变体（variants）不仅可以是纯标签，还可以携带不同类型和数量的数据。配合强大的 `match` 模式匹配，Rust 确保了所有分支都被处理，使代码更加安全和可靠。

---

## 定义枚举

### 基本定义

定义枚举使用 `enum` 关键字，后面跟枚举名和变体列表。所有变体属于同一个类型，类型一致。

```rust
enum IpAddrKind {
    V4,  // Variants
    V6,
}

fn main() {
    let four = IpAddrKind::V4;
    let six = IpAddrKind::V6;

    route(four);
    route(six);
}

fn route(ip_type: IpAddrKind) {
    // ...
}
```

变体的类型是统一的——`four` 和 `six` 都是 `IpAddrKind` 类型，因此可以作为同类型参数传入 `route` 函数。

---

## Enum 可持有数据

Rust 枚举的强大之处在于，**每个变体可以持有不同类型、不同数量的数据**，无需借助额外的结构体。

### 传统方式：用 struct 包装

在别的语言中，通常需要定义一个结构体来组合枚举标签和附带数据：

```rust
enum IpAddrKind {
    V4,
    V6,
}

struct IpAddr {
    kind: IpAddrKind,
    address: String,
}

fn main() {
    let home = IpAddr {
        kind: IpAddrKind::V4,
        address: String::from("127.0.0.1"),
    };

    let loopback = IpAddr {
        kind: IpAddrKind::V6,
        address: String::from("::1"),
    };
}
```

### Rust 方式：变体直接持有数据

Rust 的枚举允许将数据直接附加到变体上，代码更简洁：

```rust
enum IpAddr {
    V4(String),
    V6(String),
}

fn main() {
    let home = IpAddr::V4(String::from("127.0.0.1"));
    let loopback = IpAddr::V6(String::from("::1"));
}
```

### 不同变体可以持有不同数据

每个变体可以持有完全不同的数据类型和数量：

```rust
enum IpAddr {
    V4(u8, u8, u8, u8),   // 4 个 u8
    V6(String),             // 1 个 String
}

fn main() {
    let home = IpAddr::V4(127, 0, 0, 1);
    let loopback = IpAddr::V6(String::from("::1"));
}
```

这种灵活性是结构体难以比拟的 —— 每个变体更像一个独立的结构体定义，却又共享同一个类型。

---

## 为枚举添加方法

和结构体一样，枚举也可以通过 `impl` 块来定义方法：

```rust
enum Message {
    Quit,                            // 无数据
    Move { x: i32, y: i32 },        // 匿名结构体
    Write(String),                   // String
    ChangeColor(i32, i32, i32),     // 3 个 i32
}

impl Message {
    fn call(&self) {
        // 方法体...
    }
}

fn main() {
    let m = Message::Write(String::from("hello"));
    m.call();
}
```

`Message` 枚举展示了四种变体形式，每一种代表了不同的消息类型，非常自然地描述了一个消息系统。

---

## Option Enum —— 替代 Null

### Null 的问题

在许多语言中，`null` 值带来了大量运行时错误（Tony Hoare 称之为"十亿美元的错误"）。Rust 没有 `null`，而是通过 `Option<T>` 枚举来**显式表示某个值可能存在或不存在**。

```rust
enum Option<T> {
    Some(T),
    None,
}
```

`Option<T>` 是标准库中定义的泛型枚举，使用 `Some(T)` 包装有效值，用 `None` 表示缺失。

### Option 比 Null 的优势

1. **类型安全**：`Option<T>` 和 `T` 是**完全不同的类型**，编译器强制你处理缺失的情况。

```rust
fn main() {
    let x: i8 = 5;
    let y: Option<i8> = Some(5);

    let sum = x + y;  // ❌ 编译错误！y 是 Option<i8>，不能直接和 i8 相加
}
```

你不能直接将 `Option<i8>` 当作 `i8` 使用，必须在取值前判断是否存在，从而杜绝空指针异常。

---

## Match 表达式

### 基本语法

`match` 是 Rust 中功能强大的控制流运算符，它允许将一个值与一系列模式进行比较，并执行第一个匹配到的分支代码。

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u32 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

`match` 是一个**表达式**，可以直接返回值。每个分支 (`=>`) 后面的代码可以是一个值（如 `1`），也可以是一个 `{}` 代码块。

### 穷尽性（Exhaustive Check）

**`match` 表达式必须穷尽所有可能的分支**。如果漏掉某个变体，编译器会报错。这是 Rust 安全保障的重要体现。

### 通配模式

当分支较多，你只需要重点处理几种情况时，可以用一个**变量名**来匹配剩余所有情况。变量名可以任意取，比如 `other`、`ot`、`rest` 等，它会绑定匹配到的值：

```rust
fn main() {
    let dice_roll = 9;
    match dice_roll {
        3 => add_fancy_hat(),
        7 => remove_fancy_hat(),
        other => move_player(other),  // 任意变量名都可以，绑定值
    }
}

fn add_fancy_hat() {
    println!("You got a fancy hat!");
}

fn remove_fancy_hat() {
    println!("You lost your fancy hat!");
}

fn move_player(num_spaces: u8) {
    println!("You move {} spaces!", num_spaces);
}
```

> 变量名是任意的 —— `other`、`ot`、`x` 都行，Rust 没有 `default` 关键字。

如果不需要使用匹配到的值，用 `_` 代替，它匹配任意值但**不绑定**：

```rust
match some_value {
    1 => handle_one(),
    _ => do_default(),  // 不绑定值
}
```

如果默认分支什么也不做，可以用空元组 `()`：

```rust
match some_value {
    3 => do_something(),
    _ => (),
}
```

### match 的所有权

`match` 表达式会**获取绑定值的所有权**。如果你不希望所有权转移，改用引用：

```rust
match &value {
    Some(v) => println!("{}", v),  // v 是 &T 类型
    None => println!("empty"),
}
// value 仍可使用
```

使用 `&` 匹配时，分支内绑定的是**引用类型**，不会转移所有权。

---

## if let —— 只匹配一种情况的简洁语法

当你只关心**某一种模式**，并对其他情况使用默认行为时，`if let` 比 `match` 更简洁：

```rust
fn main() {
    let config_max = Some(3u8);

    match config_max {
        Some(max) => println!("The maximum is configured to be {}", max),
        _ => (),
    }
}
```

等价于：

```rust
fn main() {
    let config_max = Some(3u8);

    if let Some(max) = config_max {
        println!("The maximum is configured to be {}", max);
    }
}
```

### 配合 else 使用

`if let` 也可以搭配 `else` 处理不匹配的情况：

```rust
fn main() {
    let config_max = Some(3u8);

    if let Some(max) = config_max {
        println!("The maximum is configured to be {}", max);
    } else {
        println!("The maximum is not configured.");
    }
}
```

这相当于只处理两种情况的 `match`，但更加紧凑。

---

## 总结

| 特性 | 说明 |
|------|------|
| **Enum 定义** | 用 `enum` 定义一组可能取值，变体类型统一 |
| **变体持有数据** | 每个变体可以携带不同类型、不同数量的数据 |
| **impl 方法** | 枚举可以通过 `impl` 定义方法 |
| **`Option<T>`** | 标准库枚举，替代 `null`，`Some(T)` / `None` |
| **类型安全** | `Option<T>` 与 `T` 是不同类型，强制处理缺失 |
| **`match` 穷尽** | 所有分支必须覆盖，编译器保证不遗漏 |
| **`_` 通配符** | 不需要绑定值时用 `_`；需要绑定值用 `other` |
| **match 所有权** | 使用 `&` 做引用匹配避免所有权转移 |
| **`if let`** | 只匹配一种模式的简洁写法，可搭配 `else` |
