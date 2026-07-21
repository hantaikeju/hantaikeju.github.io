---
title: "Rust：闭包（Closures）"
date: 2026-07-15T11:09:00+08:00
weight: 27
draft: false
tags: ["Rust", "编程基础", "函数式编程"]
categories: ["rust"]
description: "掌握 Rust 闭包：匿名函数、环境捕获（不可变借用/可变借用/移动所有权）、类型推断、Fn Trait（FnOnce/FnMut/Fn）以及生命周期标注。"
---

## 概述

**闭包（Closure）** 是可以存储在变量中或作为参数传递给其他函数的**匿名函数**。它是 Rust 函数式编程特性的核心组成部分。

与普通函数 `fn` 不同，闭包能够**捕获其所在作用域中的变量**（即"环境"），这使得闭包非常灵活和强大。

---

## 使用闭包捕获环境

### 场景：T 恤赠送

以下示例展示了一个 T 恤库存系统：如果用户有偏好颜色就给对应颜色，否则给出库存最多的颜色。

```rust
#[derive(Debug, PartialEq, Copy, Clone)]
enum ShirtColor {
    Red,
    Blue,
}

struct Inventory {
    shirts: Vec<ShirtColor>,
}

impl Inventory {
    fn giveaway(&self, user_preference: Option<ShirtColor>) -> ShirtColor {
        user_preference.unwrap_or_else(|| self.most_stocked())
    }

    fn most_stocked(&self) -> ShirtColor {
        let mut num_red = 0;
        let mut num_blue = 0;

        for color in &self.shirts {
            match color {
                ShirtColor::Red => num_red += 1,
                ShirtColor::Blue => num_blue += 1,
            }
        }

        if num_red > num_blue {
            ShirtColor::Red
        } else {
            ShirtColor::Blue
        }
    }
}

fn main() {
    let store = Inventory {
        shirts: vec![ShirtColor::Blue, ShirtColor::Red, ShirtColor::Blue],
    };

    let user_pref1 = Some(ShirtColor::Red);
    let giveaway1 = store.giveaway(user_pref1);
    println!(
        "The user with preference {:?} gets {:?}",
        user_pref1, giveaway1
    );

    let user_pref2 = None;
    let giveaway2 = store.giveaway(user_pref2);
    println!(
        "The user with preference {:?} gets {:?}",
        user_pref2, giveaway2
    );
}
```

输出：

```
The user with preference Some(Red) gets Red
The user with preference None gets Blue
```

### 关键分析

`unwrap_or_else` 的参数是一个闭包 `|| self.most_stocked()`：

- `||` 表示闭包没有参数
- 闭包体调用 `self.most_stocked()`
- 闭包**捕获了 `self`**（即 `Inventory` 实例的不可变引用）

`unwrap_or_else` 的签名大致为：

```rust
impl<T> Option<T> {
    pub fn unwrap_or_else<F>(self, f: F) -> T
    where
        F: FnOnce() -> T
    {
        match self {
            Some(x) => x,
            None => f(),
        }
    }
}
```

当 `Option` 是 `Some` 时直接返回内部值，是 `None` 时才调用闭包——这就是**惰性求值（lazy evaluation）**。

---

## 闭包的类型推断和注释

### 类型推断

闭包通常**不需要**像 `fn` 函数那样标注参数或返回值的类型：

- 闭包不会暴露在对外接口中使用
- 闭包通常很短，在有限的上下文中使用
- 编译器可以推断出参数和返回值的类型

```rust
// 无需类型注释
let add_one = |x| x + 1;

// 也可以显式添加类型注释（与 fn 函数风格不同）
let add_one_v2 = |x: i32| -> i32 { x + 1 };

// 调用
let result = add_one(5);  // 6
```

### 类型锁定

对于同一个闭包定义，编译器将为每个参数及其返回值**推断出一个具体类型**，之后不能使用不同类型调用：

```rust
let example_closure = |x| x;

let s = example_closure(String::from("hello"));  // 推断为 String -> String
let n = example_closure(5);  // ❌ 编译错误！类型已被锁定为 String
```

---

## 捕获引用或移动所有权

闭包可以通过三种方式捕获环境中的值，对应三种借用/所有权模式：

### 1. 不可变借用（Immutable Borrow）

```rust
fn main() {
    let list = vec![1, 2, 3];
    println!("Before defining closure: {:?}", list);

    let only_borrows = || println!("From closure: {:?}", list);

    println!("Before calling closure: {:?}", list);
    only_borrows();
    println!("After calling closure: {:?}", list);
}
```

闭包捕获了 `list` 的**不可变引用**，因此可以同时存在多个不可变引用，不影响后续使用。

### 2. 可变借用（Mutable Borrow）

```rust
fn main() {
    let mut list = vec![1, 2, 3];
    println!("Before defining closure: {:?}", list);

    let mut borrows_mutably = || list.push(7);

    // println!("Before calling closure: {:?}", list);  // ❌ 不可再借用！
    borrows_mutably();
    println!("After calling closure: {:?}", list);      // [1, 2, 3, 7]
}
```

闭包定义时就获取了 `list` 的**可变引用**。在可变引用存在期间，不允许其他任何借用。

### 3. 取得所有权 — `move` 关键字

使用 `move` 关键字强制闭包**获取所用变量的所有权**：

```rust
use std::thread;

fn main() {
    let list = vec![1, 2, 3];
    println!("Before defining closure: {:?}", list);

    thread::spawn(move || println!("From thread: {:?}", list))
        .join()
        .unwrap();
}
```

在新线程中，闭包必须拥有 `list` 的所有权，因为主线程可能先于新线程结束。`move` 将 `list` 移动到闭包中。

> **注意**：`move` 并不意味着一定移动——如果变量实现了 `Copy`，`move` 实际上会进行复制。

```rust
let x = 42;          // i32 实现了 Copy
let closure = move || println!("{}", x);
println!("{}", x);   // ✅ 仍然可用，因为 x 被复制而非移动
```

---

## Fn Trait

闭包根据其对捕获值的操作方式，自动实现以下三个 trait 中的一个或多个：

| Trait | 对捕获值的操作 | 调用方式 |
|-------|---------------|---------|
| `FnOnce` | 可能移出捕获值（消耗） | 只能调用一次 |
| `FnMut` | 可能修改捕获值 | 可多次调用，需要 `&mut self` |
| `Fn` | 既不移动也不修改 | 可多次调用，只需 `&self` |

> 它们是层级关系：所有 `Fn` 都实现了 `FnMut`，所有 `FnMut` 都实现了 `FnOnce`。

### FnOnce — 只能调用一次

```rust
fn main() {
    let s = String::from("hello");
    
    // 闭包将 s 移出环境（所有权转移给 consumed）
    let consume = || {
        let consumed = s;   // 移出 s
        println!("{}", consumed);
    };
    
    consume();   // ✅ 第一次调用
    // consume(); // ❌ 第二次调用失败！s 已被移出
}
```

### FnMut — 可修改捕获值，调用多次

```rust
fn main() {
    let mut counter = 0;
    
    let mut increment = || {
        counter += 1;  // 修改了捕获的 counter
        counter
    };
    
    println!("{}", increment());  // 1
    println!("{}", increment());  // 2
    println!("{}", increment());  // 3
}
```

### Fn — 只读访问，调用多次

```rust
fn main() {
    let name = String::from("World");
    
    let greet = || println!("Hello, {}!", name);
    
    greet();
    greet();  // 可以多次调用
}
```

### 闭包自动实现 trait 的规则

编译器根据闭包体对捕获值的操作自动判断：

- 如果闭包**只读取**捕获的值 → 实现 `Fn`（同时实现 `FnMut` 和 `FnOnce`）
- 如果闭包**修改**捕获的值 → 实现 `FnMut`（同时实现 `FnOnce`）
- 如果闭包**移出**捕获的值 → 仅实现 `FnOnce`

### 作为函数参数

```rust
// 接受任何可调用一次、返回 T 的闭包
fn apply_once<F, T>(f: F) -> T
where
    F: FnOnce() -> T,
{
    f()
}

// 接受任何可多次调用、修改环境的闭包
fn apply_mut<F>(mut f: F)
where
    F: FnMut(),
{
    f();
    f();
}

// 接受任何可多次调用、只读的闭包
fn apply<F>(f: F)
where
    F: Fn(),
{
    f();
    f();
}
```

### 常见标准库示例

| 方法 | Trait 约束 | 说明 |
|------|-----------|------|
| `Option::unwrap_or_else` | `FnOnce() -> T` | 惰性提供默认值 |
| `Iterator::map` | `FnMut(Self::Item) -> B` | 转换每个元素 |
| `Iterator::filter` | `FnMut(&Self::Item) -> bool` | 过滤元素 |
| `Iterator::for_each` | `FnMut(Self::Item)` | 对每个元素执行操作 |
| `Vec::sort_by_key` | `FnMut(&T) -> K` | 按派生键排序 |

---

## 闭包必须命名捕获的生命周期

当闭包捕获了引用时，其生命周期必须被显式标注。

### 问题场景

```rust
// ❌ 编译错误
fn make_closure() -> impl Fn() {
    let s = String::from("hello");
    move || println!("{}", s)
}
```

`s` 在函数结束后被释放，但闭包仍然引用了它——悬垂引用。

### 解决方案

确保被捕获的变量生命周期足够长：

```rust
// ✅ 将所有权移入闭包（move）
fn make_closure() -> impl Fn() {
    let s = String::from("hello");
    move || println!("{}", s)  // s 的所有权移入闭包
}
```

### 返回包含引用的闭包

当闭包需要返回一个引用时，必须标注生命周期：

```rust
// ❌ 编译错误：生命周期不明确
fn return_closure<'a>(s: &'a str) -> impl Fn() -> &str {
    move || s
}

// ✅ 显式标注生命周期
fn return_closure<'a>(s: &'a str) -> impl Fn() -> &'a str {
    move || s
}
```

---

## 闭包与函数指针

除了闭包，还可以将**普通函数**作为参数传递。函数指针类型为 `fn`（小写），它们实现了所有三个闭包 trait（`Fn`、`FnMut`、`FnOnce`）：

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn do_twice(f: fn(i32) -> i32, arg: i32) -> i32 {
    f(arg) + f(arg)
}

fn main() {
    let result = do_twice(add_one, 5);
    println!("{}", result);  // 12
}
```

---

## 总结

| 特性 | 说明 |
|------|------|
| **定义** | `\|参数\| { 体 }` 或 `\|参数\| 表达式` |
| **类型推断** | 编译器自动推断参数和返回值类型 |
| **环境捕获** | 自动推断（不可变借用 > 可变借用 > 移动所有权） |
| **`move`** | 强制获取所有权（`Copy` 类型会复制） |
| **`Fn`** | 只读捕获，可多次调用 |
| **`FnMut`** | 可变捕获，可多次调用 |
| **`FnOnce`** | 消耗捕获，只能调用一次 |
| **生命周期** | 返回捕获引用的闭包需标注生命周期 |
