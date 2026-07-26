---
title: "Rust：Box<T> 智能指针"
date: 2026-07-22T10:11:00+08:00
weight: 32
draft: false
tags: ["Rust", "智能指针", "Box", "堆分配", "递归类型"]
categories: ["rust"]
description: "掌握 Rust 中最简单的智能指针 Box<T>：在堆上分配数据、实现递归数据类型（Cons List）、在编译时大小未知的上下文中使用、所有权转移时避免数据复制、以及存储 Trait 对象。"
---

## Smart Pointers（智能指针）

**指针**是内存中存储数据地址的变量，该地址指向其他数据。最常见的指针是**引用（`&T` / `&mut T`）**——它们除了引用数据外，无其他特殊功能，无额外开销。

**智能指针**是一类类似指针的数据结构，具有**额外的元数据和功能**。关键区别在于：

| 类型 | 所有权 | 额外功能 |
|------|--------|---------|
| 引用 `&T` | 仅**借用**数据 | 无 |
| 智能指针 | 通常**拥有**数据 | 丰富的元数据和自动清理等 |

常用的智能指针包括：`Box<T>`、`Rc<T>`、`Ref<T>`/`RefMut<T>`、`RefCell<T>`。

> 本章聚焦于 `Box<T>`，后续依次学习 `Rc<T>` 和 `RefCell<T>`。

---

## Box\<T\> 概述

`Box<T>` 是 Rust 中**最简单**的智能指针：

- 允许数据存储在 **Heap（堆）** 上，而非 Stack（栈）上
- Stack 上只保存指向 Heap 数据的**指针**
- 除了将数据放在堆上，**几乎没有性能开销**，也没有太多额外功能

### 使用场景

| 场景 | 说明 |
|------|------|
| 递归类型 | 在需要知道确切大小的上下文中，处理编译时大小未知的类型（如递归 enum） |
| 大数据转移 | 有大量数据需要转移所有权，转移时数据不会被复制 |
| Trait 对象 | 想要拥有某个 Trait 的值，而非具体类型 |

---

## Box 的语法

```rust
fn main() {
    let b = Box::new(5);
    println!("b={b}");
}
```

- `Box::new(5)` 在 Heap 上分配一个 `i32` 值 `5`
- `b` 本身存在 Stack 上，是一个指向 Heap 数据的指针
- 当 `b` 离开作用域时，Box 会自动释放 Heap 上的内存

---

## 使用 Box 实现可递归类型

### 问题：递归类型的大小无法确定

在 Rust 中，编译器必须在**编译期**确定每种类型的大小。直接包含自身的递归类型会导致无限递归的大小计算：

```rust
enum List {
    Cons(i32, List),  // ❌ 这里直接包含了 List 自身
    Nil,
}
```

大小推导过程：

```
Cons(i32, List) 的大小 = i32 的大小 + List 的大小
List 的大小又取决于 Cons 的大小
→ 无限循环，编译器无法确定大小
```

### 用 Box 修复

`Box<T>` 的大小是固定的（一个指针的大小），可以用 `Box<List>` 替代直接包含 `List`：

```rust
enum List {
    Cons(i32, Box<List>),
    Nil,
}
```

修正后的大小计算：

```
Box<List> 的大小 = 一个指针的大小（固定，如 8 字节）
Cons(i32, Box<List>) 的大小 = i32 的大小 + 指针的大小 ✅
List 的大小 = max(Cons 的大小, Nil 的大小) ✅
```

### 完整示例

```rust
use List::{Cons, Nil};

fn main() {
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
    // 形成链表: (1, (2, (3, Nil)))
}

enum List {
    Cons(i32, Box<List>),
    Nil,
}
```

> `Box<T>` 在这里的关键作用是：将 "运行时可变大小" 的数据包装成 "编译时固定大小" 的指针，从而让递归类型在编译期能够确定大小。

---

## Box 的 Drop 行为

当一个 `Box<T>` 离开作用域时，`Drop` trait 的实现会自动释放 Box 在 Heap 上分配的内存。这与普通引用不同——引用没有所有权，离开作用域时不涉及任何内存释放。

```rust
{
    let b = Box::new(String::from("hello"));
    // b 拥有这个 String，String 在 Heap 上
} // ← b 离开作用域，自动释放 Heap 内存，包括内部的 String
```

---

## Box 与性能

| 操作 | 开销 |
|------|------|
| `Box::new(value)` | 一次堆分配（类似 C++ 的 `new`）|
| 解引用 `*box` / `.` 访问 | 一次指针间接访问，几乎可忽略 |
| `Drop` 释放 | 释放堆内存，无额外计算 |
| 传递 `Box<T>` | 只复制指针（栈上的 8 字节），不复制数据 |

> 与 C++ 的 `std::unique_ptr<T>` 类似：独占所有权、自动释放、零额外开销（zero-cost abstraction）。
