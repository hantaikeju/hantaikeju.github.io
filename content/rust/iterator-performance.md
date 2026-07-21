---
title: "Rust：循环和迭代器性能比较"
date: 2026-07-15T14:32:00+08:00
weight: 28
draft: false
tags: ["Rust", "编程基础", "迭代器", "性能"]
categories: ["rust"]
description: "对比 Rust 中 for 循环与迭代器（Iterator）的性能：零成本抽象、汇编代码对比、编译器优化以及为什么迭代器通常不比手写循环慢。"
---

## 概述

Rust 迭代器（Iterator）是**零成本抽象（Zero-Cost Abstraction）**的典范。使用迭代器的高级抽象不会带来运行时性能损失——编译器会将迭代器链编译为与手写 `for` 循环相同（甚至更优）的机器码。

> C++ 也有类似理念："What you don't use, you don't pay for. And further: What you do use, you couldn't hand code any better."（你不用的，不为它付出代价；你用的，手写也不会更好。）

---

## 循环 vs 迭代器：以 MiniGrep 的 search 为例

### 手写 for 循环版本

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();
    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }
    results
}
```

### 迭代器版本

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}
```

### 直觉上的担忧

很多程序员看到迭代器版本会担心性能：

- `lines()` 返回迭代器
- `filter()` 创建一个新的迭代器适配器
- `collect()` 收集到 `Vec`

看上去似乎多了很多函数调用和中间结构——但实际上，编译器会将它们**全部内联展开**。

---

## 零成本抽象的运作原理

### 编译器的优化流程

1. **内联展开** — `lines()`、`filter()`、`collect()` 等所有方法调用被内联
2. **死代码消除** — 去掉未使用的分支和中间结构
3. **循环展开** — 将迭代器链展开为等价的手写循环
4. **向量化** — 在适用的场景下使用 SIMD 指令

最终生成的汇编代码与手写的 `for` 循环**几乎完全一致**。

### 汇编层面验证

两个版本的 `search` 函数编译后产生的汇编指令基本上都是：

```asm
; 伪汇编示意
loop:
    cmp  byte ptr [line], query_char
    jne  skip
    call vec_push
skip:
    add  line_ptr, line_len
    cmp  line_ptr, end
    jl   loop
```

迭代器版本不需要任何额外的函数调用开销、虚表查找或堆分配。

---

## 为什么迭代器可能更快

在某些场景下，迭代器版本**比手写循环更快**。

### 原因 1：编译器更了解意图

迭代器是**声明式**的——你告诉编译器"做什么"，而不是"怎么做"。这使得编译器有更大的优化空间：

```rust
// 声明式：告诉编译器你要什么结果
let sum: i32 = (0..1000)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .sum();

// 命令式：指定每一步怎么做
let mut sum = 0;
for x in 0..1000 {
    if x % 2 == 0 {
        sum += x * x;
    }
}
```

在声明式版本中，编译器可以自由地重排、融合或矢量化这些操作。

### 原因 2：边界检查优化

Rust 迭代器在设计上就保证了安全性，编译器可以证明不会有越界访问，因此可以进一步消除冗余的边界检查。

```rust
// 迭代器保证每次 next() 要么返回 Some，要么返回 None
// 编译器可以消除内部的边界检查
let v = vec![1, 2, 3, 4, 5];
let doubled: Vec<_> = v.iter().map(|x| x * 2).collect();
```

### 原因 3：loop fusion（循环融合）

多个迭代器适配器可以被编译器**融合成一个循环**：

```rust
// 这三个操作在编译后只产生一个循环，而不是三个
let result: Vec<_> = (0..1000)
    .filter(|x| x % 2 == 0)    // 没有中间 Vec
    .map(|x| x * x)             // 没有中间 Vec
    .take(10)                   // 提前终止
    .collect();                 // 只在最后分配一次
```

编译器自动将其转化为等价的：

```rust
let mut result = Vec::with_capacity(10);
for x in 0..1000 {
    if x % 2 == 0 {
        result.push(x * x);
        if result.len() == 10 {
            break;
        }
    }
}
```

---

## 实际基准测试

以下是一个简单的基准测试示例（使用 `std::time::Instant` 进行粗略对比）：

```rust
use std::time::Instant;

fn main() {
    let data: Vec<i32> = (0..10_000_000).collect();
    
    // for 循环
    let start = Instant::now();
    let mut sum1: i64 = 0;
    for &x in &data {
        if x % 2 == 0 {
            sum1 += (x * x) as i64;
        }
    }
    let loop_time = start.elapsed();

    // 迭代器
    let start = Instant::now();
    let sum2: i64 = data
        .iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| (x * x) as i64)
        .sum();
    let iter_time = start.elapsed();

    assert_eq!(sum1, sum2);
    println!("for 循环:  {:?}", loop_time);
    println!("迭代器:    {:?}", iter_time);
}
```

在 release 模式下（`--release`），两者的运行时间基本相同，偏差一般不超过 ±5%。

> **务必注意**：性能测试一定要在 `--release` 模式下进行。Debug 模式下不会启用内联和优化，迭代器的抽象开销会显著高于手写循环。

---

## 何时应该用循环？

虽然迭代器在性能上不输循环，但在以下场景中手写 `for` 循环可能更合适：

| 场景 | 原因 |
|------|------|
| **复杂的控制流** | 需要 `break`/`continue` 多层嵌套时，`for` 循环更直观 |
| **多个可变状态** | 同时修改多个外部变量时，闭包捕获规则可能带来麻烦 |
| **错误处理** | 需要在迭代中 `return Err(...)` 时，`for` + `?` 更自然 |
| **可读性** | 如果迭代器链非常长（>5 个适配器），拆成循环可能更清晰 |
| **调试** | Debug 模式下迭代器有额外的函数调用开销，调试体验略差 |

### 示例：带错误处理的循环

```rust
// for 循环 + ? 更自然
fn process_items(items: &[String]) -> Result<Vec<i32>, ParseIntError> {
    let mut results = Vec::new();
    for item in items {
        let num = item.parse::<i32>()?;
        results.push(num);
    }
    Ok(results)
}

// 迭代器版本可以同样简洁——collect 自动处理 Result
fn process_items(items: &[String]) -> Result<Vec<i32>, ParseIntError> {
    items.iter().map(|s| s.parse::<i32>()).collect()
}
```

> 迭代器版本中 `collect()` 会自动将 `Vec<Result<i32, E>>` 转换为 `Result<Vec<i32>, E>`，遇到第一个错误就短路。

---

## 总结

| 要点 | 说明 |
|------|------|
| **零成本抽象** | 迭代器编译后与手写循环生成相同的机器码 |
| **内联优化** | 所有迭代器适配器方法被内联展开，无函数调用开销 |
| **循环融合** | 多个迭代器适配器被合并为一个循环，无中间分配 |
| **声明式优势** | 迭代器告诉编译器"做什么"，编译器有更大优化空间 |
| **测试要求** | 性能对比必须用 `--release`，Debug 模式迭代器开销显著 |
| **权衡取舍** | 复杂控制流、多重可变状态时循环可能更可读 |
| **推荐** | 优先用迭代器，只在可读性明显下降时才用循环 |
