---
title: "Rust 集合：HashMap"
date: 2026-07-07T18:01:00+08:00
weight: 19
draft: false
tags: ["Rust", "编程基础", "标准库"]
categories: ["rust"]
description: "掌握 Rust HashMap 集合：创建与初始化、get 读取与遍历、所有权转移、entry 与 or_insert 更新策略、Hashing 函数。"
---

## 概述

`HashMap<K, V>` 存储**键值对（key-value）映射**。通过 Hashing 函数将 key 映射到对应的 value，数据存储在 Heap 上。K 和 V 必须是同类型（与 Vector 一样）。

---

## 创建

### 直接创建

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Yellow"), 50);
```

### 从迭代器创建

```rust
let vec = vec![("key1", "value1"), ("key2", "value2")];
let map: HashMap<_, _> = vec.into_iter().collect();
```

---

## 访问

### get 读取单个值

```rust
let team_name = String::from("Blue");
let score = scores.get(&team_name).copied().unwrap_or(0);
```

调用链路：

| 步骤 | 方法 | 说明 |
|------|------|------|
| ① | `get(&key)` | 返回 `Option<&V>`，值的引用 |
| ② | `copied()` | `Option<&T>` → `Option<T>`（用于 `Copy` 类型如 `i32`） |
| ③ | `unwrap_or(0)` | 有值则返回，无值返回默认值 `0` |

### 遍历

```rust
for (key, value) in &scores {
    println!("{key}:{value}");
}
```

---

## HashMap 与所有权

- 实现了 `Copy` trait 的类型（如 `i32`）——值被**复制**到 map 中
- 拥有所有权的类型（如 `String`）——所有权被**移动**到 map 中

```rust
fn main() {
    let field_name = String::from("Favorite color");
    let field_value = String::from("Blue");

    let mut map = HashMap::new();
    map.insert(field_name, field_value);

    // println!("{field_name}-{field_value}"); // ❌ 编译错误！所有权已转移
}
```

---

## HashMap 更新

### key 存在则替换

直接 `insert` 相同 key 会覆盖旧值：

```rust
let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Blue"), 25);
println!("{scores:?}"); // {"Blue": 25}
```

### key 不存在才插入（保留旧值）

`entry(key).or_insert(value)` 只在 key 不存在时插入：

```rust
scores.entry(String::from("Yellow")).or_insert(50); // Yellow 不存在 → 插入 50
scores.entry(String::from("Blue")).or_insert(50);   // Blue 已存在 → 忽略，保留 25
println!("{scores:?}");
```

- `entry(key)` → 返回 `Entry` 枚举：`Occupied`（已存在）或 `Vacant`（空缺）
- `or_insert(value)` → 在 `Vacant` 时插入，返回值的**可变引用** `&mut V`

### 基于旧值更新

利用 `or_insert` 返回 `&mut V` 的特性，可以直接修改已有值：

```rust
let text = "hello world wonderful world";

let mut map = HashMap::new();

for word in text.split_whitespace() {
    let count = map.entry(word).or_insert(0);
    *count += 1;  // 解引用后修改
}

println!("{map:#?}");
```

输出：

```
{
    "hello": 1,
    "world": 2,
    "wonderful": 1,
}
```

---

## Hashing 函数

默认使用 **SipHash**，安全性较好但不是最快。可通过指定实现了 `BuildHasher` trait 的 hasher 来切换 Hashing 函数。

---

## 总结

| 要点 | 说明 |
|------|------|
| **创建** | `HashMap::new()` 或迭代器 `collect()` |
| **插入** | `insert(key, value)`，相同 key 会覆盖 |
| **读取** | `get(&key)` → `Option<&V>`，配合 `copied()` / `unwrap_or()` |
| **遍历** | `for (k, v) in &map` |
| **所有权** | `Copy` 类型复制，`String` 等所有权类型移动 |
| **条件插入** | `entry(key).or_insert(value)`，存在则忽略，不存在则插入 |
| **基于旧值更新** | `or_insert` 返回 `&mut V`，解引用修改 |
