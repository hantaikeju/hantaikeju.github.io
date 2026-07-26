---
title: "Rust：Drop Trait"
date: 2026-07-26T14:40:00+08:00
weight: 34
draft: false
tags: ["Rust", "智能指针", "Drop", "资源清理", "析构"]
categories: ["rust"]
description: "掌握 Rust 的 Drop Trait：自定义值离开作用域时的清理行为、实现智能指针的资源释放、Rust 自动插入 drop 代码避免资源泄露、释放顺序规则、使用 std::mem::drop 提前释放值。"
---

## 概述

通过 **Drop Trait** 可以自定义一个值即将超出作用域时的清理行为。实现智能指针时几乎总是会用到 `Drop` trait 的功能——比如 `Box<T>` 在离开作用域时释放堆内存、文件句柄自动关闭等。

Rust 编译器会**自动插入** `Drop` 实现中的代码，确保资源不会泄露。

> `Drop` trait 在 prelude 中，无需手动引入。它只要求实现一个 `drop` 方法，参数是对 `self` 的可变引用（`&mut self`）。

---

## 实现 Drop Trait

下面定义一个 `CustomSmartPointer` 结构体并为其实现 `Drop` trait：

```rust
struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("Dropping CustomSmartPointer with data `{}`!", self.data);
    }
}

fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };
    println!("CustomSmartPointers created.");
}
```

**输出：**

```
CustomSmartPointers created.
Dropping CustomSmartPointer with data `other stuff`!
Dropping CustomSmartPointer with data `my stuff`!
```

---

## 释放顺序：后创建先释放

Rust 按照变量创建的**逆序**来调用 `drop`，即**后创建的先释放**（类似栈的后进先出）。

在上面的例子中：
- `c` 先创建 → `d` 后创建
- 离开作用域时 → `d` 先被 drop → `c` 后被 drop

```rust
fn main() {
    let a = CustomSmartPointer { data: String::from("first") };
    let b = CustomSmartPointer { data: String::from("second") };
    let c = CustomSmartPointer { data: String::from("third") };
    println!("All created.");
}
// 输出：
// All created.
// Dropping CustomSmartPointer with data `third`!
// Dropping CustomSmartPointer with data `second`!
// Dropping CustomSmartPointer with data `first`!
```

---

## 不能手动调用 drop

Rust **不允许手动调用** `Drop` trait 的 `drop` 方法，否则会在离开作用域时造成**双重释放（double free）**：

```rust
fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    c.drop();  // ❌ 编译错误！explicit use of destructor method
}
```

错误信息类似：

```
error[E0040]: explicit use of destructor method
  --> src/main.rs:xx:7
   |
xx |     c.drop();
   |       ^^^^ explicit destructor calls not allowed
```

---

## 使用 std::mem::drop 提前释放

如果确实需要在值离开作用域**之前**释放它，可以使用标准库提供的 **`std::mem::drop`** 函数。

`std::mem::drop` 的工作原理：
1. **接管值的所有权**（参数是 owned 类型，不是引用）
2. 在函数内部调用 `Drop::drop` 进行清理
3. 函数结束，值被销毁

这样做不会干扰 Rust 的自动清理机制，也避免了双重释放问题：

```rust
fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };

    drop(c);  // ✅ c 被提前释放
    println!("CustomSmartPointers created.");
}
```

**输出：**

```
Dropping CustomSmartPointer with data `my stuff`!
CustomSmartPointers created.
Dropping CustomSmartPointer with data `other stuff`!
```

> 注意：`c` 在 `println!` 之前就被释放了，而 `d` 仍然在作用域结束时正常释放。

### std::mem::drop 的源码

`std::mem::drop` 的实现非常简单——它就是一个"什么都不做"的空函数，但通过获取所有权，在函数结束时触发 `Drop`：

```rust
pub fn drop<T>(_x: T) {
    // _x 在这里获取了所有权，函数结束时 _x 离开作用域，自动调用 T::drop
}
```

---

## Drop 与所有权

只有**拥有所有权**的值才能被释放——这是 Rust 所有权系统的自然推论。引用（`&T`）和可变引用（`&mut T`）**不拥有**数据，因此传入 `std::mem::drop` 只会 drop 引用本身（无意义），不会影响被引用的数据：

```rust
fn main() {
    let s = String::from("hello");
    let r = &s;
    drop(r);      // 只 drop 了引用 r，s 不受影响
    println!("{}", s);  // ✅ s 仍然有效
}
```

---

## 总结

| 要点 | 说明 |
|------|------|
| **trait 位置** | `Drop` 在 prelude 中，无需 `use` |
| **必须实现** | `fn drop(&mut self)` |
| **调用时机** | 值离开作用域时自动调用 |
| **释放顺序** | 后创建先释放（栈逆序） |
| **手动调用** | 不允许直接调用 `.drop()` |
| **提前释放** | 使用 `std::mem::drop(value)` 接管所有权 |
| **双重释放** | Rust 的编译器会防止双重释放问题 |

`Drop` trait 与之前学习的 `Deref` trait 是智能指针的两大支柱：`Deref` 让智能指针**像普通引用一样使用**，`Drop` 让智能指针在不需要时**自动清理资源**。两者结合，使 Rust 的智能指针既强大又安全。
