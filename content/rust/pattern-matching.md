---
title: "Rust 核心：模式匹配（Pattern Matching）"
date: 2026-08-07T11:24:00+08:00
weight: 50
draft: false
tags: ["Rust", "编程基础", "语法"]
categories: ["rust"]
description: "深入掌握 Rust 模式匹配的全部语法：match / if let / while let / for / let / 函数参数的匹配、可反驳性、解构 struct/enum/tuple、忽略值与匹配守卫。"
---

## 概述

**模式（Pattern）** 是 Rust 中的特殊语法，用于匹配简单或复杂类型的结构。与 `match` 表达式和其他构造结合，极大增强了程序的控制流程。

---

## 模式的组成

| 组成要素 | 说明 | 示例 |
|----------|------|------|
| **字面值** | 直接匹配具体值 | `1`、`"hello"` |
| **解构数据结构** | 拆解数组、枚举、结构体、元组 | `Point { x, y }`、`(a, b)` |
| **变量** | 绑定匹配到的值 | `x`、`name` |
| **通配符** | 匹配任意值但不绑定 | `_` |
| **占位符** | `..` 忽略剩余字段 | `Point { x, .. }` |

---

## 模式的使用位置

### match 分支

```rust
match VALUE {
    PATTERN => EXPRESSION,
    ...
}

match x {
    None => None,
    Some(i) => Some(i + 1),
}
```

### if let 表达式

```rust
if let Some(value) = rx.recv().await {
    // ...
}
```

### while let 条件循环

```rust
while let Some(value) = rx.recv().await {
    println!("Got: {}", value);
}
```

### for 循环

```rust
for (index, value) in v.iter().enumerate() {
    // index 和 value 绑定
}
```

### let 语句

```rust
let x = 5;                     // 不可反驳模式
let (x, y, z) = (1, 2, 3);    // 解构元组
```

### 函数参数

```rust
fn foo(x: i32) {}                              // 参数本身也是模式
fn print_coordinates(&(x, y): &(i32, u32)) {}  // 直接解构参数
```

---

## 可反驳性（Refutability）

**可反驳性** 指一个模式是否可能匹配失败：

| 类型 | 说明 | 示例 |
|------|------|------|
| **不可反驳模式** | 适用于所有可能的值 | `let x = 5` 中的 `x` |
| **可反驳模式** | 可能不匹配某些值 | `if let Some(x) = a_value` 中的 `Some(x)` |

### 限制规则

| 只能使用不可反驳模式 | 可接受可反驳模式 |
|-----|-----|
| 函数参数 | `if let` |
| `let` 语句 | `while let` |
| `for` 循环 | `let_else` 语句 |

为什么？——如果模式不能保证匹配成功，程序将无法继续执行。

### match 中的特例

```rust
match x {
    Some(1) => ...,   // 可反驳
    Some(2) => ...,   // 可反驳
    _ => ...,         // 不可反驳（兜底），确保覆盖所有情况
}
```

> 除最后一个分支外，match 通常使用**可反驳模式**来分别处理不同情况。最后一个分支用 `_` 兜底。

---

## 模式匹配语法

### 匹配字面值

```rust
let x = 1;

match x {
    1 => println!("one"),
    2 => println!("two"),
    3 => println!("three"),
    _ => println!("anything"),
}
```

### 匹配命名变量

```rust
let x = Some(5);
let y = 10;

match x {
    Some(50) => println!("Got 50"),
    Some(y) => println!("Matched, y = {y}"),  // 变量遮蔽！这里的 y 是新的绑定
    _ => println!("Default case, x = {x:?}"),
}

println!("at the end: x = {x:?}, y = {y}");  // y 仍然是 10
```

> ⚠️ `match` 分支中的命名变量会产生**变量遮蔽（shadowing）**——不要与外层变量混淆。

### 多模式匹配（`|` 或）

```rust
let x = 1;

match x {
    1 | 2 => println!("one or two"),
    3 => println!("three"),
    _ => println!("anything"),
}
```

### 匹配范围 `..=`

```rust
let x = 5;

match x {
    1..=5 => println!("one through five"),
    _ => println!("something else"),
}

// 也支持字符范围
let x = 'c';

match x {
    'a'..='j' => println!("early ASCII letter"),
    'k'..='z' => println!("late ASCII letter"),
    _ => println!("something else"),
}
```

---

## 解构数据类型

### 解构 Struct

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 7 };

    // 创建新变量 a, b
    let Point { x: a, y: b } = p;

    // match 中带条件解构
    match p {
        Point { x, y: 0 } => println!("On the x axis at {x}"),
        Point { x: 0, y } => println!("On the y axis at {y}"),
        Point { x, y } => {
            println!("On neither axis: ({x}, {y})");
        }
    }
}
```

### 解构枚举

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

fn main() {
    let msg = Message::ChangeColor(0, 160, 255);

    match msg {
        Message::Quit => {
            println!("The Quit variant has no data to destructure");
        }
        Message::Move { x, y } => {
            println!("Move in the x direction {x} and in the y direction {y}");
        }
        Message::Write(text) => {
            println!("Text message: {text}");
        }
        Message::ChangeColor(r, g, b) => {
            println!("Change the color to red {r}, green {g}, and blue {b}");
        }
    }
}
```

### 嵌套解构

```rust
enum Color {
    Rgb(i32, i32, i32),
    Hsv(i32, i32, i32),
}

enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(Color),
}

fn main() {
    let msg = Message::ChangeColor(Color::Hsv(0, 160, 255));

    match msg {
        Message::ChangeColor(Color::Rgb(r, g, b)) => {
            println!("Change color to red {r}, green {g}, and blue {b}");
        }
        Message::ChangeColor(Color::Hsv(h, s, b)) => {
            println!("Change color to hue {h}, saturation {s}, value {b}");
        }
        _ => (),
    }
}
```

### 同时解构 Struct 和 Tuple

```rust
let ((feet, inches), Point { x, y }) = ((3, 10), Point { x: 3, y: -10 });
```

---

## 忽略模式中的值

### 用 `_` 忽略整个值

```rust
fn foo(_: i32, y: i32) {
    println!("This code only uses the y parameter: {y}");
}

fn main() {
    foo(3, 4);
}
```

### 嵌套 `_` 忽略部分值

```rust
let mut setting_value = Some(5);
let new_setting_value = Some(10);

match (setting_value, new_setting_value) {
    (Some(_), Some(_)) => {
        println!("Can't overwrite an existing customized value");
    }
    _ => {
        setting_value = new_setting_value;
    }
}

println!("setting is {setting_value:?}");
```

### 以 `_` 开头的名称（忽略未使用变量）

```rust
fn main() {
    let _x = 5;   // 不会触发"未使用变量"警告
    let y = 10;   // 如果未使用，会警告
}
```

### `_s` vs `_`：所有权差异

```rust
let s = Some(String::from("Hello!"));

if let Some(_s) = s {      // _s 绑定了值——s 的所有权被移动！
    println!("found a string");
}
// println!("{s:?}");      // ❌ 编译错误：s 的所有权已转移
```

```rust
let s = Some(String::from("Hello!"));

if let Some(_) = s {       // _ 不绑定值——s 的所有权保留
    println!("found a string");
}
println!("{s:?}");         // ✅ 正常
```

> `_s` 会绑定值并发生所有权转移；`_` 完全不绑定，所有权保留。

### `..` 忽略剩余部分

```rust
struct Point {
    x: i32,
    y: i32,
    z: i32,
}

let origin = Point { x: 0, y: 0, z: 0 };

match origin {
    Point { x, .. } => println!("x is {x}"),  // 只关心 x
}
```

---

## 匹配守卫（Match Guard）

在模式后添加 `if` 条件来进一步过滤：

```rust
let num = Some(4);

match num {
    Some(x) if x % 2 == 0 => println!("The number {x} is even"),
    Some(x) => println!("The number {x} is odd"),
    None => (),
}
```

### `|` 与匹配守卫

```rust
let x = 4;
let y = false;

match x {
    4 | 5 | 6 if y => println!("yes"),  // if y 适用于 4|5|6 全部
    _ => println!("no"),
}
```

---

## 小结

| 概念 | 说明 |
|------|------|
| 可反驳 vs 不可反驳 | 确定模式能用于哪些位置（`let` vs `if let`） |
| `match` | 穷尽匹配，`_` 兜底 |
| `if let` / `while let` | 只关心一种模式的简洁写法 |
| 解构 | 从 struct / enum / tuple / 嵌套类型中提取数据 |
| `_` 忽略 | 不绑定值，保留所有权 |
| `_s` vs `_` | 前者移动所有权，后者不绑定 |
| `..` | 忽略剩余字段 |
| 匹配守卫 | `if` 条件进一步过滤模式 |

模式匹配是 Rust 中最常用的核心语法之一——从简单的 `let` 绑定到复杂的嵌套解构，它贯穿了所有 Rust 代码。
