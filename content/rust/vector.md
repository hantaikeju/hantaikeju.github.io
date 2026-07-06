---
title: "Rust 集合：Vector"
date: 2026-07-06T17:50:00+08:00
weight: 17
draft: false
tags: ["Rust", "编程基础", "标准库"]
categories: ["rust"]
description: "掌握 Rust Vector 集合：创建与初始化、元素增删、索引与 get 读取、所有权规则、不可变与可变遍历。"
---

## 概述

`Vec<T>` 是 Rust 标准库提供的动态数组，用于在单一数据结构中存储多个同类型的值，元素在内存中连续（相邻）存放。

---

## 创建 Vector

### 使用 Vec::new()

```rust
fn main() {
    let v: Vec<i32> = Vec::new();  // 需要标注类型
}
```

如果后续没有 push 操作，编译器无法推断类型，需要显式标注泛型参数。

### 使用 vec! 宏

```rust
fn main() {
    let v = vec![1, 2, 3];  // 类型自动推断为 Vec<i32>
}
```

---

## 更新元素

使用 `push` 方法添加元素，vector 必须声明为 `mut`：

```rust
fn main() {
    let mut v = Vec::new();
    v.push(1);
    v.push(2);
    v.push(3);
}
```

---

## 读取元素

两种读取方式：

```rust
fn main() {
    let mut v = Vec::new();
    v.push(1);
    v.push(2);
    v.push(3);

    // 方式1：索引语法 → 返回 &i32，越界则 panic
    let third = &v[2];
    println!("The third element is {}", third);

    // 方式2：get 方法 → 返回 Option<&i32>，越界返回 None
    let third: Option<&i32> = v.get(2);
    match third {
        Some(third) => println!("The third element is {}", third),
        None => println!("There is no third element."),
    }
}
```

| 读取方式 | 返回类型 | 越界行为 |
|----------|----------|----------|
| `&v[index]` | `&T` | panic（程序崩溃） |
| `v.get(index)` | `Option<&T>` | 返回 `None`（安全） |

---

## Vector 的所有权

在同一作用域内，不能同时持有不可变引用并修改 vector：

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];
    let first = &v[0];     // 不可变借用
    v.push(6);             // ❌ 编译错误！可变借用
    println!("The first element is: {}", first);
}
```

原因：`push` 可能导致 vector 扩容并重新分配内存，原有引用将指向失效的内存地址。Rust 的借用检查器在编译期阻止了这种潜在问题。

---

## 遍历 Vector

### 不可变遍历

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];
    for n_ref in &v {
        let n_plus_one = *n_ref + 1;  // 解引用获取值
        println!("{} plus one is {}", n_ref, n_plus_one);
    }
}
```

### 可变遍历（修改元素）

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];
    for n_ref in &mut v {
        *n_ref += 200;  // 通过解引用修改原值
    }
}
```

---

## 安全遍历

遍历时如需要在循环体内修改 vector（如新增/删除元素），应避免直接持有引用，而是使用索引或分步操作。

常见的策略：
- 先收集要修改的信息，遍历完成后再执行修改
- 使用 `v.len()` 配合索引循环
- 使用 `v.iter().enumerate()` 获取索引和引用

---

## 总结

| 要点 | 说明 |
|------|------|
| **创建** | `Vec::new()` 或 `vec![]` 宏 |
| **添加** | `v.push(value)`，vector 需可变 |
| **读取** | 索引 `&v[i]`（可能 panic） vs `v.get(i)`（返回 `Option`） |
| **所有权** | push 扩容时不可持有已有元素的引用 |
| **不可变遍历** | `for n in &v` |
| **可变遍历** | `for n in &mut v`，用 `*n` 解引用修改 |
