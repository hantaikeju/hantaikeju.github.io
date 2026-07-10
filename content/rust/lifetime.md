---
title: "Rust：生命周期"
date: 2026-07-10T17:47:00+08:00
weight: 23
draft: false
tags: ["Rust", "编程基础"]
categories: ["rust"]
description: "掌握 Rust 生命周期：悬垂引用、借用检查器、函数和结构体中的生命周期标注、生命周期省略规则、静态生命周期 'static。"
---

## 概述

**生命周期（Lifetime）** 是引用有效的范围（作用域）。每个引用都有生命周期，大多数时候隐式且可被推断。当引用的生命周期可能以不同方式相关联时，必须显式标注。生命周期的主要目的是**防止悬垂引用**。

---

## 悬垂引用（Dangling References）

悬垂引用指向已被释放的内存，Rust 编译器会阻止这种情况：

```rust
fn main() {
    let r;

    {
        let x = 5;
        r = &x;         // ❌ 编译错误！x 的寿命不够长
    }                   // x 在此处被释放

    println!("r:{}", r); // r 指向已释放的内存
}
```

`x` 的生命周期不够长，但被 `r` 引用——当 `x` 离开作用域后，`r` 就成了悬垂引用。

---

## 借用检查器（Borrow Checker）

借用检查器比较作用域，确保**数据存活的时间长于其引用**（Outlive）。

```rust
// ❌ 编译失败
fn main() {
    let r;                // ---------+-- 'a
                          //          |
    {                     //          |
        let x = 5;        // -+-- 'b  |
        r = &x;           //  |       |
    }                     // -+       |
                          //          |
    println!("r: {}", r); //          |
}                         // ---------+
```

修正方式——确保 `x` 比 `r` 活得更久：

```rust
// ✅ 编译通过
fn main() {
    let x = 5;            // ---------+-- 'b
    let r = &x;           // --+-- 'a |
                          //   |      |
    println!("r: {}", r); //   |      |
}                         // --+------+
```

---

## 函数中的泛型生命周期

当一个函数接受两个引用作为参数并返回一个引用时，编译器无法确定返回值到底引用谁：

```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len { x } else { y }
}
// ❌ 编译错误：缺少生命周期标注
```

### 生命周期注解语法

生命周期参数以 `'` 开头，通常小写且很短（如 `'a`），紧跟在 `&` 后与类型之间。

生命周期注解**不会改变引用存活的时间**，只描述多个引用之间的生命周期关系。

```rust
// 表示：返回值的生命周期与 x 和 y 中较短的保持一致
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

含义：`x` 和 `y` 至少活得和 `'a` 一样久，返回值也至少活 `'a` 那么久。

### 使用示例

```rust
fn main() {
    let string1 = String::from("long string is long");

    {
        let string2 = String::from("xyz");
        let result = longest(string1.as_str(), string2.as_str());
        println!("The longest is {}", result);  // ✅ string2 仍存活
    }
}
```

```rust
fn main() {
    let string1 = String::from("long string is long");
    let result;

    {
        let string2 = String::from("xyz");
        result = longest(string1.as_str(), string2.as_str());
    }   // string2 被释放
    // ❌ result 引用了 string2，但 string2 已失效
    println!("The longest is {}", result);
}
```

---

## Struct 中的生命周期注解

如果结构体持有引用，必须标注生命周期：

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,  // part 至少和结构体活得一样久
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().expect("Could not find a '.'");
    let i = ImportantExcerpt {
        part: first_sentence,
    };
    // i 不能比 novel 活得更久
}
```

---

## 生命周期省略规则（Elision Rules）

编译器在三种情况下可以自动推断生命周期，无需手动标注。这些规则适用于函数和方法：

| 规则 | 适用对象 | 说明 |
|------|----------|------|
| **规则1** | 每个引用参数 | 自动分配独立的生命周期 `'a`、`'b`、... |
| **规则2** | 仅有一个输入生命周期参数 | 输出生命周期等于输入生命周期 |
| **规则3** | 方法，`&self` 或 `&mut self` | 输出生命周期等于 `self` 的生命周期 |

```rust
// 满足规则1 + 规则2，无需标注
fn first_word(s: &str) -> &str { ... }

// 满足规则1 + 规则3，无需标注
impl<'a> ImportantExcerpt<'a> {
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }
}
```

---

## 静态生命周期 `'static`

`'static` 生命周期存活于**整个程序运行期间**。字符串字面量拥有 `'static` 生命周期：

```rust
let s: &'static str = "I have a static lifetime.";
```

> 谨慎使用 `'static`——不要为了解决生命周期错误随意添加。大多数情况应通过设计解决，而非滥用静态生命周期。

---

## 总结

| 要点 | 说明 |
|------|------|
| **生命周期目的** | 防止悬垂引用，确保引用始终有效 |
| **悬垂引用** | 引用指向已被释放的内存，编译器阻止 |
| **借用检查器** | 比较作用域，确保 Outlive |
| **标注语法** | `&'a T`，描述引用间的关系 |
| **函数标注** | `fn f<'a>(x: &'a str, y: &'a str) -> &'a str` |
| **Struct 标注** | `struct S<'a> { field: &'a str }` |
| **省略规则** | 三个规则覆盖常见场景，减少标注负担 |
| **`'static`** | 整个程序存活，慎用 |
