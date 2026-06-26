---
title: "分析第一个Rust项目"
date: 2026-06-26T10:00:00+08:00
weight: 2
draft: false
tags: ["Rust","标准库"]
categories: ["rust"]
description: "分析 Rust 中的 mut 可修改修饰符，解析第一个 Rust 项目的代码结构、crate 类型与标准库使用。"
---

## 代码结构

```rust
fn main() {
    println!("Hello, world!");
}
```

## Crate

- **library crate** —— 只可以有一个
- **binary crate** —— 任意多个

---

## 修改代码

```rust
use std::io::stdin;

fn main() {
    let mut msg: String = String::new();
    println!("Enter a message: ");
    stdin().read_line(&mut msg).unwrap();
    println!("You entered: {}", msg.trim());
}
```

### 逐行解析

**`use std::io::stdin;`**

`std::io::stdin` 是标准库中的模块。如果是 prelude 部分（预编译在代码中），可以直接使用，无需 `use` 引入。

**`::`**

用于访问模块中公开使用的 API。

**`;`**

结束任何语句的符号。

**`let mut msg: String = String::new();`**

- `let` —— 声明变量
- `mut` —— 可修改修饰符，表示变量可变。Rust 中变量默认不可变，加 `mut` 后才允许修改
- `msg: String` —— 变量名 `msg`，类型为 `String`
- `String::new()` —— 创建一个空字符串

**`stdin().read_line(&mut msg).unwrap();`**

- `stdin()` —— 获取标准输入句柄
- `read_line(&mut msg)` —— 读取一行输入，追加到 `msg` 中。`&mut msg` 表示传入可变引用
- `unwrap()` —— 处理可能出现的错误，出错时程序直接 panic

**`println!("You entered: {}", msg.trim());`**

- `{}` —— 占位符，用 `msg.trim()` 的值替换
- `trim()` —— 去掉字符串首尾的空白字符（包括换行符）
