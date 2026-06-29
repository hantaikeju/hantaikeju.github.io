---
title: "Rust：猜数字游戏"
date: 2026-06-29T15:54:00+08:00
weight: 4
draft: false
tags: ["Rust", "Crate", "标准库"]
categories: ["rust"]
description: "用 Rust 实现一个经典的猜数字游戏：程序随机生成 1~100 的数字，用户输入猜测，程序提示大了还是小了，直至猜对。涵盖 std::io、rand crate、match 模式匹配、loop 循环与错误处理。"
---

## 需求

程序随机在 1~100 产生一个数，用户通过输入与这个数进行比较，提示大了还是小了，直至猜对。

---

## 允许用户输入

```rust
use std::io;

fn main() {
    println!("Please enter one number");

    let mut input_num = String::new();
    io::stdin()
        .read_line(&mut input_num)
        .expect("Failed to read line");

    println!("You entered: {}", input_num.trim());
}
```

### 代码解析

| 语法 | 说明 |
|------|------|
| `println!` | 宏，用于打印输出 |
| `let mut input_num` | `let` 声明变量，`mut` 让变量可重复赋值（不加则只能赋值一次） |
| `String::new()` | 创建空字符串 |
| `io::stdin()` | 获取 `Stdin` 实例，处理终端输入 |
| `.read_line(&mut input_num)` | 传入一个可变字符串引用（`&` 为引用），返回 `Result` |
| `.expect("...")` | 处理 `Result` 的 `Err` 情况，失败时 panic 并输出错误信息；不处理编译器会警告 |
| `println!("{}", ...)` | `{}` 为占位符，有多少个变量就有多少个占位符 |

---

## 生成 1~100 的随机数

### 第三方库 rand（crate）

Rust 标准库不包含随机数生成，需要使用第三方 crate —— `rand`。

cargo 的库从 [crates.io](https://crates.io) 获取。

### 方式一：手动编辑 Cargo.toml

在 `Cargo.toml` 的 `[dependencies]` 下添加：

```toml
[dependencies]
rand = "0.8.5"
```

### 方式二：使用 cargo add 命令

```bash
cargo add rand@0.8.5
```

执行后会输出：

```
    Updating crates.io index
      Adding rand v0.8.5 to dependencies
             Features:
             + alloc
             + getrandom
             + libc
             + rand_chacha
             + std
             + std_rng
             ...
```

### cargo build

添加依赖后运行 `cargo build` 进行编译：

```
PS D:\GuessNumber> cargo build
    Blocking waiting for file lock on build directory
    Compiling zerocopy v0.8.52
    Compiling cfg-if v1.0.4
    Compiling getrandom v0.2.17
    Compiling rand_core v0.6.4
    Compiling ppv-lite86 v0.2.21
    Compiling rand_chacha v0.3.1
    Compiling rand v0.8.6
    Compiling GuessNumber v0.1.0 (D:\GuessNumber)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 9.58s
```

第一次执行 `cargo build` 之后会生成 `Cargo.lock` 文件，锁定依赖版本。

---

## 生成随机数代码

### 引入 Rng trait

```rust
use rand::Rng;
```

`trait` 在 Rust 中相当于 C# 的 `interface`。`Rng` 是一个 trait（`pub trait Rng`），定义了随机数生成器的行为。

### 生成 1~100 的随机数

```rust
let secret_number = rand::thread_rng().gen_range(1..=100);
```

- `rand::thread_rng()` —— 获取线程局部的随机数生成器
- `gen_range(1..=100)` —— 生成 1 到 100（含）之间的随机数

### 输入类型转换（Shadowing）

```rust
let input_num: u32 = input_num.trim().parse().expect("Please type a number!");
```

这里 `input_num` 变量名与之前的 `String` 类型同名，这在 Rust 中是允许的，该语法称为 **shadowing（遮蔽）**——新变量会"遮蔽"旧变量。

### 使用 match 进行比较

```rust
use std::cmp::Ordering;

match input_num.cmp(&secret_number) {
    Ordering::Less    => println!("Too small!"),
    Ordering::Greater => println!("Too big!"),
    Ordering::Equal   => println!("You win!"),
}
```

- `cmp` 返回 `Ordering` 枚举的三个值：`Less`、`Greater`、`Equal`
- `match` 类似 C# 的 `switch`，但更强大——必须穷举所有分支

---

## 使用 loop 循环

`loop` 相当于 `while (true) {}`，需注意条件退出：

```rust
use rand::Rng;
use std::{cmp::Ordering, io};

fn main() {
    let secret_number = rand::thread_rng().gen_range(1..=100);

    loop {
        println!("Please enter one number");

        let mut input_num = String::new();
        io::stdin()
            .read_line(&mut input_num)
            .expect("Failed to read line");

        println!("You entered: {}", input_num.trim());

        let input_num: u32 = input_num.trim().parse().expect("Please type a number!");

        match input_num.cmp(&secret_number) {
            Ordering::Less    => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal   => {
                println!("You win!");
                break;
            },
        }
    }
}
```

---

## 处理用户输入非数字

当用户输入的不是数字时，`.expect()` 会导致程序崩溃。更优雅的做法是用 `match` 处理 `parse` 的 `Result`：

```rust
use rand::Rng;
use std::{cmp::Ordering, io};

fn main() {
    let secret_number = rand::thread_rng().gen_range(1..=100);

    loop {
        println!("Please enter one number");

        let mut input_num = String::new();
        io::stdin()
            .read_line(&mut input_num)
            .expect("Failed to read line");

        println!("You entered: {}", input_num.trim());

        let input_num: u32 = match input_num.trim().parse() {
            Ok(num)  => num,
            Err(_)   => {
                println!("Please type a valid number!");
                continue;
            }
        };

        match input_num.cmp(&secret_number) {
            Ordering::Less    => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal   => {
                println!("You win!");
                break;
            },
        }
    }
}
```

这里用 `match` 替换了 `.expect()`：
- `Ok(num)` —— 解析成功，将数字绑定到 `num`
- `Err(_)` —— 解析失败（`_` 表示忽略错误详情），打印提示并用 `continue` 跳回循环开头

---

## 总结

这个猜数字游戏涵盖了 Rust 的多个核心概念：

| 概念 | 说明 |
|------|------|
| `let` / `mut` | 变量声明与可变性 |
| `String::new()` | 创建字符串实例 |
| `io::stdin()` | 标准输入处理 |
| `use` | 引入模块 / trait |
| Cargo 依赖管理 | `Cargo.toml`、`cargo add`、`cargo build` |
| `trait` | 类似接口，定义共享行为 |
| Shadowing | 同名变量遮蔽 |
| `match` | 模式匹配，穷举分支 |
| `loop` / `break` / `continue` | 循环控制 |
| `Result` / `Ok` / `Err` | 错误处理 |
| `cmp` / `Ordering` | 比较与排序枚举 |
