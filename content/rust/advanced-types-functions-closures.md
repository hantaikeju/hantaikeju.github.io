---
title: "Rust：高级类型、函数和闭包"
date: 2026-08-07T17:30:00+08:00
weight: 51
draft: false
tags: ["Rust", "类型系统", "函数式编程", "高级"]
categories: ["rust"]
description: "深入 Rust 高级特性：Newtype 模式、类型别名、永不返回类型(!)、动态大小类型与 Sized trait、函数指针(fn)以及返回闭包的多种方式。"
---

## 概述

在掌握基础类型和泛型之后，Rust 还提供了一系列**高级类型特性**和**函数/闭包的高级用法**。本文将深入介绍 Newtype 模式、类型别名、永不返回类型、动态大小类型（DST）、函数指针以及返回闭包的技巧。

---

## 高级类型

### 使用 Newtype 模式实现类型安全和抽象

**Newtype 模式** 是将一个类型包装在元组结构体中，从而创建一个全新的类型。它解决了"原始类型执念"问题，提供了更强的类型安全性。

```rust
struct Millimeters(u32);
struct Meters(u32);
```

使用 `Millimeters` 作为函数参数时，编译器会**阻止**你误传 `Meters` 或裸 `u32` 类型：

```rust
fn add_length(a: Millimeters, b: Millimeters) -> Millimeters {
    Millimeters(a.0 + b.0)
}

let dist1 = Millimeters(100);
let dist2 = Millimeters(200);
let result = add_length(dist1, dist2);  // ✅ 正确

let dist3 = Meters(5);
// add_length(dist1, dist3);             // ❌ 编译错误：类型不匹配
```

**Newtype 的两大优势：**

| 优势 | 说明 |
|------|------|
| **类型安全** | 不同类型不能混用，即使底层类型相同 |
| **抽象** | 隐藏内部实现细节，只暴露有意义的 API |

此外，Newtype 还可以为外部类型实现外部 Trait（绕过孤儿规则）：

```rust
struct Wrapper(Vec<String>);

impl std::fmt::Display for Wrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}
```

---

### 使用类型别名创建类型同义词

Rust 提供 `type` 关键字来声明**类型别名**（Type Alias），给已有类型一个新名字：

```rust
type Kilometers = i32;

let x: i32 = 5;
let y: Kilometers = 5;

println!("x + y = {}", x + y);  // 它们是同一类型，可以相互运算
```

> **注意**：`Kilometers` 和 `i32` 实际上是**完全相同的类型**，无法获得 Newtype 模式提供的类型安全性。

**类型别名的主要用途是减少重复**，尤其在复杂类型场景中：

```rust
// 冗长的类型签名
let f: Box<dyn Fn() + Send + 'static> = Box::new(|| println!("hi"));

// 使用类型别名简化
type Thunk = Box<dyn Fn() + Send + 'static>;

let f: Thunk = Box::new(|| println!("hi"));
```

另一个常见场景是简化 `Result` 类型：

```rust
type Result<T> = std::result::Result<T, std::io::Error>;

// 使用时只需写
fn read_file() -> Result<String> {
    // 内部展开为 std::result::Result<String, std::io::Error>
    std::fs::read_to_string("hello.txt")
}
```

---

### 永不返回的类型（Never Type）

Rust 有一个特殊的类型 `!`，在类型理论中被称为**空类型（Empty Type）**，表示"**永不返回**"的值：

```rust
fn bar() -> ! {
    // 这个函数永远不会正常返回
    panic!();
    // 或 loop { ... } 、 std::process::exit() 等
}
```

**`!` 的关键特性**：它可以被**强制转换为任意类型**。这就是以下代码能通过编译的原因：

```rust
let guess: u32 = match guess.trim().parse() {
    Ok(num) => num,
    Err(_) => continue,  // continue 的类型是 !，被强制转为 u32
};
```

`continue`、`panic!`、`loop {}` 等都是 `!` 类型，它们可以出现在任何需要特定类型的地方。

---

### 动态大小类型和 Sized Trait

**动态大小类型（Dynamically Sized Types, DST）** 是指大小在编译时无法确定的类型。

最典型的例子是 `str`（注意不是 `&str`）：

```rust
// ❌ 编译错误：str 的大小在编译时未知
let s1: str = "Hello there!";
let s2: str = "How's it going?";
```

解决方法是将 DST 放在某种**指针或引用**后面：

```rust
let s1: &str = "Hello there!";   // &str 的大小是固定的（两个 usize：指针+长度）
let s2: Box<str> = "hello".into(); // Box<str> 类似，大小固定
```

**Sized Trait** 是 Rust 用来标记"大小在编译时已知"的类型：

```rust
// 泛型函数默认要求 T 是 Sized 的
fn generic<T>(t: T) {}          // 等价于 fn generic<T: Sized>(t: T) {}

// 使用 ?Sized 放宽限制，允许 DST
fn generic<T: ?Sized>(t: &T) {} // T 可以是 Sized 或动态大小类型
```

| 语法 | 含义 |
|------|------|
| `T: Sized` | T 必须是编译时大小已知的类型（**默认行为**） |
| `T: ?Sized` | T 可以是 Sized，也可以不是（即可以是 DST） |

---

## 高级函数和闭包

### 函数指针（Function Pointer）

函数指针的类型是 `fn`（**小写 f**），区别于闭包 Trait `Fn`：

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn do_twice(f: fn(i32) -> i32, arg: i32) -> i32 {
    f(arg) + f(arg)
}

fn main() {
    let answer = do_twice(add_one, 5);
    println!("The answer is: {}", answer);  // 输出：12
}
```

**函数指针 vs 闭包 Trait：**

| 特性 | `fn`（函数指针） | `Fn` / `FnMut` / `FnOnce`（闭包 Trait） |
|------|-------------------|------------------------------------------|
| 能否捕获环境 | ❌ 不能 | ✅ 可以 |
| 类型 | 具体类型，大小已知 | Trait，大小不固定 |
| 互操作性 | 函数指针实现了所有三种闭包 Trait | 闭包不能隐式转为函数指针（除非不捕获环境） |

> **关键点**：函数指针实现了 `Fn`、`FnMut`、`FnOnce`，所以**可以在需要闭包的地方使用函数指针**。

**枚举的变体也可以作为函数指针**（实际上是构造器函数）：

```rust
enum Status {
    Value(u32),
    Stop,
}

let list_of_statuses: Vec<Status> = (0u32..20)
    .map(Status::Value)  // 直接传入枚举变体作为构造器
    .collect();
```

---

### 返回闭包

闭包由 Trait 表示（`Fn`、`FnMut`、`FnOnce`），这意味着**不能直接返回闭包**——每个闭包都有自己唯一的匿名类型，大小在编译时不确定。

#### 方案 1：使用 `impl Trait`

```rust
fn returns_closure() -> impl Fn(i32) -> i32 {
    |x| x + 1
}
```

> 但 `impl Trait` 的限制是：一个函数只能返回**同一种具体类型**。以下代码无法通过编译：

```rust
// ❌ 编译错误：两个闭包是不同的类型
fn returns_closure(flag: bool) -> impl Fn(i32) -> i32 {
    if flag {
        |x| x + 1    // 闭包类型 A
    } else {
        |x| x * 2    // 闭包类型 B，与 A 不同
    }
}
```

#### 方案 2：使用 Trait Object

当需要**在运行时动态选择**返回的闭包时，使用 Trait Object：

```rust
fn returns_closure(flag: bool) -> Box<dyn Fn(i32) -> i32> {
    if flag {
        Box::new(|x| x + 1)
    } else {
        Box::new(|x| x * 2)
    }
}
```

| 方案 | 适用场景 | 性能 |
|------|----------|------|
| `impl Trait` | 编译时确定返回单一类型 | 零开销，静态分发 |
| `Box<dyn Trait>` | 运行时可返回不同类型 | 堆分配 + 动态分发 |

---

## 总结

| 概念 | 核心要点 |
|------|----------|
| **Newtype 模式** | 用元组结构体包装类型，获得类型安全和抽象 |
| **类型别名** | `type` 关键字简化复杂类型，不提供类型安全 |
| **永不返回类型 `!`** | 可强制转为任意类型，`continue`/`panic!` 都是 `!` |
| **动态大小类型** | `str` 等 DST 必须放在指针后使用，`?Sized` 放宽限制 |
| **函数指针 `fn`** | 不捕获环境，但实现了闭包 Trait |
| **返回闭包** | `impl Trait`（静态）或 `Box<dyn Trait>`（动态） |
