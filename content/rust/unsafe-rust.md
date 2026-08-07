---
title: "Rust 进阶：Unsafe Rust"
date: 2026-08-07T16:01:00+08:00
weight: 51
draft: false
tags: ["Rust", "进阶", "系统编程"]
categories: ["rust"]
description: "理解 Unsafe Rust 的五个超能力：解引用原始指针、调用 unsafe 函数、FFI 外部调用、可变静态变量、unsafe trait 与 union，以及如何用安全 API 封装 unsafe 代码。"
---

## 概述

### 为什么需要 Unsafe Rust

| 原因 | 说明 |
|------|------|
| **编译器保守** | 宁可错杀一千，不可放过一个——有些安全代码编译器不理解 |
| **硬件不安全** | 硬件本身是不安全的，系统编程需要直接操作 |
| **性能/交互** | 与 C 语言交互、追求极致性能 |

> Unsafe Rust 不是"关闭所有检查"，而是让你承担编译器无法验证的那部分责任。

---

## Unsafe Rust 的五个超能力

1. **解引用原始指针**（raw pointer）
2. **调用不安全的函数或方法**
3. **访问或修改可变静态变量**
4. **实现不安全的 trait**
5. **访问 union 字段**

---

## Unsafe ≠ 不安全

- **borrow checker 仍然工作**——安全检查并未完全关闭
- 只是某些特定检查不再进行
- 代码是否安全**由程序员来保证**
- 建议将 `unsafe` 块**限制得尽可能小**

### 封装原则

```
┌──────────────────────┐
│   Safe API (公开)     │  ← 用户只接触这一层
│  ┌────────────────┐  │
│  │  unsafe 块      │  │  ← 内部处理，不泄漏
│  └────────────────┘  │
└──────────────────────┘
```

> 用 safe API 包裹 unsafe 代码，标准库就是这样做的。

---

## 1. 解引用原始指针

Rust 的普通引用（`&T`、`&mut T`）总是有效——这是编译器保证的。但在 Unsafe Rust 中，有两种新的指针类型：

| 类型 | 说明 |
|------|------|
| `*const T` | 不可变原始指针——解引用后不能直接赋值 |
| `*mut T` | 可变原始指针 |

> `*` 是类型的一部分，不是解引用操作符。

### 原始指针 vs 普通引用/智能指针

| 特性 | 普通引用 | 原始指针 |
|------|----------|----------|
| 借用规则 | 编译器强制 | **可忽略**（同时存在多个可变/不可变指针） |
| 有效性保证 | 保证指向有效内存 | **不保证** |
| 可为 Null | 不可以 | **可以** |
| 自动清理 | 有 Drop | **不会自动清理** |

> 使用原始指针是**放弃安全性换取性能**，或为了与 C 语言、底层硬件交互。

### 创建与使用

```rust
fn main() {
    let mut num = 5;
    let r1 = &raw const num;
    let r2 = &raw mut num;

    unsafe {
        println!("r1 is: {}", *r1);
        println!("r2 is: {}", *r2);
    }
}
```

> 创建原始指针**没有问题**——访问值（解引用）时才需要 `unsafe` 块。

---

## 2. 调用不安全的函数/方法

```rust
fn main() {
    unsafe {
        dangerous();
    }
}

unsafe fn dangerous() {}
```

- `unsafe fn` 表明函数有特定要求，Rust 无法自动保证
- 调用者意味着**已阅读其文档并承担责任**

---

## 3. 创建 unsafe 代码的安全抽象

包含 `unsafe` 代码的函数**不一定要标记为 `unsafe`**。用安全函数封装 unsafe 代码是常见模式。

### 示例：split_at_mut

标准库的 `split_at_mut` 无法用 safe 代码实现——Rust 的借用检查器无法理解"借用的是不同部分"：

```rust
// ❌ safe 代码报错：不能同时可变借用两次
fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = values.len();
    assert!(mid <= len);
    (&mut values[..mid], &mut values[mid..])  // 编译错误！
}
```

用 unsafe 实现：

```rust
fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = values.len();
    assert!(mid <= len);
    let ptr = values.as_mut_ptr();
    unsafe {
        (
            std::slice::from_raw_parts_mut(ptr, mid),
            std::slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}

fn main() {
    let mut v = vec![1, 2, 3, 4, 5, 6];
    let r = &mut v[..];
    let (a, b) = r.split_at_mut(3);
    assert_eq!(a, &mut [1, 2, 3]);
    assert_eq!(b, &mut [4, 5, 6]);
}
```

> 函数签名是安全的——调用者不知道内部用了 unsafe。

---

## 4. 使用 extern 调用外部代码（FFI）

**外部函数接口（FFI）** 让 Rust 代码与其他语言（主要是 C）交互。

```rust
unsafe extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        println!("Absolute value of -3 according to C: {}", abs(-3));
    }
}
```

### 使用 `safe` 声明

如果确认外部函数安全，可以在声明中添加 `safe`：

```rust
unsafe extern "C" {
    safe fn abs(input: i32) -> i32;
}

fn main() {
    println!("Absolute value of -3 according to C: {}", abs(-3));  // 无需 unsafe
}
```

| 关键字 | 说明 |
|------|------|
| `extern "C"` | 指定 ABI（Application Binary Interface），`"C"` 是最常用的 |
| `unsafe extern` | 整个外部块默认不安全 |
| `safe fn` | 在 unsafe 块中标记某个外部函数为安全的 |

---

## 5. 访问或修改可变静态变量

Rust 支持全局变量，称为**静态（static）变量**：

```rust
static HELLO_WORLD: &str = "Hello, world!";

fn main() {
    println!("{}", HELLO_WORLD);
}
```

### Static vs Const

| | `const` | `static` |
|------|------|------|
| **内存地址** | 使用时可能复制 | 固定地址，始终访问相同数据 |
| **可变性** | 不可变 | **可以是可变的**（`static mut`） |
| **生命周期** | — | 必须具有 `'static` 生命周期 |

### 可变静态变量（需 unsafe）

```rust
static mut COUNTER: u32 = 0;

fn main() {
    unsafe {
        COUNTER += 1;
        println!("COUNTER: {}", *(&raw const COUNTER));
    }
}
```

> 两个线程访问同一个可变全局变量可能导致**数据竞争**——这是 Rust 要求 `unsafe` 的原因。

---

## 6. 实现 unsafe trait

当 trait 中至少有一个方法具有**编译器无法验证的不变量**时，该 trait 就是不安全的：

```rust
unsafe trait Foo {}

unsafe impl Foo for i32 {}
```

> 例如 `Send` 和 `Sync` 就是 unsafe trait——编译器不验证，由实现者保证安全。

---

## 7. 访问 union 字段

`union` 类似于 `struct`，但在特定实例中**同一时间只能使用一个声明的字段**：

```rust
union MyUnion {
    f1: u32,
    f2: f32,
}

fn main() {
    let u = MyUnion { f1: 1 };
    unsafe {
        println!("f1: {}", u.f1);  // 访问 union 字段需要 unsafe
    }
}
```

---

## 小结

| 超能力 | 用途 | 示例 |
|------|------|------|
| 解引用原始指针 | 底层操作、C 交互 | `*const T`、`*mut T` |
| 调用 unsafe 函数 | 手动保证安全契约 | `unsafe fn` / `unsafe { }` |
| 安全抽象封装 | 暴露 safe API | `split_at_mut` |
| FFI | 调用 C 代码 | `extern "C"` |
| 可变静态变量 | 全局可变状态 | `static mut` |
| unsafe trait | 编译器无法验证的约束 | `Send`、`Sync` |
| union | C 风格联合体 | `union MyUnion { }` |

> Unsafe Rust 的精髓：**尽量少写 unsafe 代码，用安全抽象包裹它，让用户永远不需要碰 unsafe。**
