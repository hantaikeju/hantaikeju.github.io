---
title: "Rust 集合：String"
date: 2026-07-07T15:55:00+08:00
weight: 18
draft: false
tags: ["Rust", "编程基础", "标准库"]
categories: ["rust"]
description: "掌握 Rust String 类型：创建与初始化、push/push_str 更新、+ 和 format! 宏拼接、索引访问限制、chars/bytes 遍历、UTF-8 内部表示。"
---

## 概述

Rust 中字符串相关有两种核心类型：

| 类型 | 来源 | 特点 |
|------|------|------|
| `&str` | 核心语言 | 字符串切片，不可变引用 |
| `String` | 标准库 | 可变、可增长、拥有所有权、UTF-8 编码 |

`String` 本质是**字节的集合**外加一系列实用方法。

---

## 创建 String

```rust
fn main() {
    let mut s = String::new();                    // 空字符串

    let data = "Hello, World!";
    let s = data.to_string();                     // 字面量转 String，实现了 Display trait

    let s = String::from("Hello, World!");        // 与 to_string() 等价
}
```

---

## 更新 String

### push_str —— 附加字符串切片

```rust
fn main() {
    let mut s = String::from("foo");
    s.push_str("bar");     // 不获取参数所有权
    println!("{}", s);     // foobar
}
```

`push_str` 接收 `&str`，不会获取参数的所有权，因此传入的变量仍可继续使用：

```rust
fn main() {
    let mut s = String::from("foo");
    let s2 = "bar";
    s.push_str(s2);
    println!("{s2}");      // s2 依旧可用
}
```

### push —— 附加单个字符

```rust
let mut s = String::from("lo");
s.push('l');
println!("{}", s);         // lol
```

---

## 拼接 String

### 使用 `+` 运算符

```rust
fn main() {
    let s1 = String::from("Hello");
    let s2 = String::from("World");
    let s3 = s1 + &s2;     // s1 所有权转移，s2 不变
    println!("{}", s3);
}
```

`+` 底层调用 `add` 方法，签名是 `fn add(self, s: &str) -> String`。这意味着：
- `s1` 的所有权被移走，后续不可再用
- `s2` 以 `&String` 传入，会被自动解引用强制转换（deref coercion）为 `&str`

多个拼接时会层层传递：

```rust
fn main() {
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");

    let s = s1 + "-" + &s2 + "-" + &s3;
}
```

### 使用 `format!` 宏（推荐）

`format!` 不获取任何参数的所有权，写法更清晰：

```rust
fn main() {
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");

    let s = format!("{s1}-{s2}-{s3}");
    // s1、s2、s3 仍可使用
}
```

---

## String 的索引访问

**Rust 不允许通过索引访问 String 中的字符：**

```rust
fn main() {
    let s1 = String::from("hello");
    let h = s1[0]; // ❌ 编译错误！
}
```

**原因**：String 内部是 UTF-8 编码，不同字符占用的字节数不同（ASCII 占 1 字节，中文字符占 3 字节等），用索引直接取字节没有意义。

### 切片访问（按字节）

可以通过 `[]` 配合 `Range` 按字节切片，但如果切割点落在一个多字节字符中间，会 panic：

```rust
fn main() {
    let s1 = String::from("hello");
    let h = &s1[0..4];   // ✅ "hell"

    let s2 = String::from("你好");
    let slice = &s2[0..1]; // ❌ panic！"你"占3个字节，切[0..1]截断了字符
}
```

### chars() —— 获取 Unicode 标量值

```rust
fn main() {
    let s1 = String::from("hello");
    for c in s1.chars() {
        println!("chars -- {c}");
    }
}
```

输出：

```
chars -- h
chars -- e
chars -- l
chars -- l
chars -- o
```

### bytes() —— 获取原始字节

```rust
fn main() {
    let s1 = String::from("hello");
    for b in s1.bytes() {
        println!("bytes -- {b}");
    }
}
```

输出：

```
bytes -- 104
bytes -- 101
bytes -- 108
bytes -- 108
bytes -- 111
```

---

## 总结

| 要点 | 说明 |
|------|------|
| **创建** | `String::new()` / `String::from()` / `to_string()` |
| **追加** | `push_str(&str)` 追加字符串，`push(char)` 追加字符 |
| **拼接** | `+` 获取第一个所有权，`format!` 不获取所有权（推荐） |
| **不支持索引** | `s[0]` 编译错误，UTF-8 字节长度不固定 |
| **切片** | `&s[0..4]` 按字节切割，越字符边界会 panic |
| **遍历字符** | `for c in s.chars()` |
| **遍历字节** | `for b in s.bytes()` |
