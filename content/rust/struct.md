---
title: "Rust 核心：结构体（Struct）"
date: 2026-07-03T17:37:00+08:00
weight: 14
draft: false
tags: ["Rust", "编程基础", "类型系统"]
categories: ["rust"]
description: "深入理解 Rust 结构体：定义与实例化、字段初始化简写、结构体更新语法、元组结构体、Unit-Like 结构体、派生 Trait、impl 方法以及方法调用的所有权。"
---

## 概述

**结构体（Struct）** 是 Rust 中的自定义数据类型，可以将多个不同类型的字段组合在一起，并为每个字段命名。

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
```

---

## 定义与实例化

### 基本定义

定义结构体使用 `struct` 关键字，后面跟结构体名和花括号包裹的字段列表：

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}

fn main() {
    let user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("1111"),
        sign_in_count: 1,
    };
}
```

### 可变性

使用 `mut` 关键字可以让整个实例可变，然后可以修改任意字段：

```rust
fn main() {
    let mut user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("1111"),
        sign_in_count: 1,
    };

    user1.email = String::from("2222");   // ✅ 允许修改
}
```

> ⚠️ **注意**：Rust 不支持仅标记某个字段为 `mut`，必须是整个实例可变。

### 字段初始化简写（Field Init Shorthand）

当函数参数名与结构体字段名**相同时**，可以省略冒号：

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}

fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username,        // 等同于 username: username
        email,           // 等同于 email: email
        sign_in_count: 1,
    }
}
```

### 结构体更新语法（Struct Update Syntax）

从一个已有实例创建新实例时，`..` 语法可以复用其余字段：

```rust
let user2 = User {
    email: String::from("222222"),
    ..user1      // 其余字段从 user1 获取
};
```

等价于：

```rust
let user2 = User {
    active: user1.active,
    username: user1.username,
    email: String::from("222222"),
    sign_in_count: user1.sign_in_count,
};
```

> ⚠️ `..user1` 会**移动（move）**非 Copy 字段的所有权（如 `username: String`），之后 `user1` 可能无法再使用。

---

## 元组结构体（Tuple Struct）

元组结构体的**字段没有名字**，只有类型。适用于想给元组起一个有意义的名字，但字段不需要命名的场景：

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
}
```

> `black` 和 `origin` 是**不同类型**，即使内部三个 `i32` 完全相同。`Color` 和 `Point` 是不同的结构体。

访问元组结构体的字段使用 `.0`、`.1` 等点索引：

```rust
let red = Color(255, 0, 0);
println!("R: {}, G: {}, B: {}", red.0, red.1, red.2);
```

---

## 无字段的结构体（Unit-Like Struct）

没有任何字段的结构体，类似于**单元类型 `()`**，用于需要在类型上实现 Trait 但不存储数据时：

```rust
struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;
}
```

典型用途：作为标记类型或实现特定的 Trait 行为。

---

## 借用结构体的字段

可以**部分借用**结构体的不同字段，不影响其他字段的使用：

```rust
struct Point { x: i32, y: i32 }

fn print_point(p: &Point) {
    println!("Point({}, {})", p.x, p.y);
}

fn main() {
    let mut p = Point { x: 10, y: 20 };

    let x = &mut p.x;       // 可变借用 x
    p.y = 30;               // ✅ 允许：y 没有被借用
    // print_point(&p);     // ❌ Error: p.x 已被 &mut 借用
    *x += 1;                // 通过可变引用修改 x
}
```

> 🔑 **关键理解**：借用检查器跟踪的是**字段级别**的借用，而非整个结构体。借用 `p.x` 不影响 `p.y` 的读写。

---

## 派生 Trait（Derived Trait）

结构体默认不实现 `Display`、`Debug` 等 Trait，直接打印会报错：

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle { width: 30, height: 50 };
    println!("rect1 is {}", rect1);   // ❌ Error: 没有实现 Display
}
```

### 使用 `#[derive(Debug)]`

通过 `#[derive(Debug)]` 自动派生 `Debug` Trait，使用 `{:?}` 或 `{:#?}` 格式化打印：

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle { width: 30, height: 50 };

    println!("rect1 is {:?}", rect1);
    // 输出: rect1 is Rectangle { width: 30, height: 50 }

    println!("rect1 is {:#?}", rect1);
    // 输出:
    // rect1 is Rectangle {
    //     width: 30,
    //     height: 50,
    // }
}
```

### 使用 `dbg!` 宏

`dbg!` 宏会打印文件名、行号和值，并**返回所有权**：

```rust
let rect1 = Rectangle { width: 30, height: 50 };
let rect2 = dbg!(rect1);     // 打印后 rect2 获得所有权
```

常见的 `derive` 派生子项：

| 派生 | 作用 |
|------|------|
| `Debug` | 调试打印 `{:?}` |
| `Clone` | 显式深拷贝 `.clone()` |
| `Copy` | 隐式按位复制（字段必须都是 Copy） |
| `PartialEq` | 相等比较 `==` |

---

## 使用 `impl` 为结构体添加方法

### 定义方法

使用 `impl` 块为结构体定义方法，第一个参数必须是 `self` 的某种形式：

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {           // &self = self: &Self
        self.width * self.height
    }
}
```

| `self` 形式 | 含义 |
|-------------|------|
| `&self` | 不可变借用（只读） |
| `&mut self` | 可变借用（可修改） |
| `self` | 获取所有权（消耗实例） |

### 多参数方法

方法可以有多个参数：

```rust
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

fn main() {
    let rect1 = Rectangle { width: 30, height: 50 };
    let rect2 = Rectangle { width: 10, height: 40 };
    let rect3 = Rectangle { width: 60, height: 45 };

    println!("The area of rect1 is {} square pixels.", rect1.area());
    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
    println!("Can rect1 hold rect3? {}", rect1.can_hold(&rect3));
}
```

### 关联函数（Associated Function）

定义在 `impl` 块中但**不以 `self` 为第一个参数**的函数，通过 `StructName::function()` 调用：

```rust
impl Rectangle {
    fn square(size: u32) -> Self {       // Self = Rectangle
        Rectangle {
            width: size,
            height: size,
        }
    }
}

fn main() {
    let sq = Rectangle::square(20);      // :: 调用关联函数
}
```

### 方法调用的两种形式

Rust 会自动解引用匹配方法签名，两种调用方式等价：

```rust
rect1.can_hold(&rect2);                              // 方法调用语法
Rectangle::can_hold(&rect1, &rect2);                  // 关联函数语法
```

---

## 方法调用的所有权

方法调用时，Rust 会根据 `self` 签名自动决定是借用、可变借用还是移动：

```rust
impl Rectangle {
    fn area(&self) -> u32 {          // 自动 &rect
        self.width * self.height
    }

    fn double(&mut self) {           // 自动 &mut rect
        self.width *= 2;
        self.height *= 2;
    }

    fn destroy(self) {               // 自动移动所有权
        println!("Rectangle destroyed: {}x{}", self.width, self.height);
    }
}
```

> 🔑 `rect.area()` → Rust 自动转为 `(&rect).area()`（匹配 `&self`）
>
> 🔑 `rect.destroy()` → Rust 自动**移动** `rect` 所有权（匹配 `self`），此后 `rect` 不可用。

### 所有权与 Trait

当方法需要获取某个字段的所有权时，可以通过为类型实现 `Copy` 或 `Clone` Trait 来避免所有权转移问题：

```rust
#[derive(Debug, Clone, Copy)]    // Copy 要求字段都是 Copy 类型
struct Point {
    x: i32,
    y: i32,
}

fn print_point(p: Point) {       // 获取所有权
    println!("({}, {})", p.x, p.y);
}

fn main() {
    let p = Point { x: 10, y: 20 };
    print_point(p);               // ✅ p 被复制而非移动
    print_point(p);               // ✅ p 还可以使用
}
```

---

## 小结

| 概念 | 关键点 |
|------|--------|
| **结构体定义** | `struct Name { field: Type }` |
| **实例化** | `Name { field: value }` |
| **字段简写** | 同名时可省略 `field: field` → `field` |
| **更新语法** | `..other_instance` 复用剩余字段 |
| **元组结构体** | `struct Name(Type, Type)` — 无字段名 |
| **Unit-Like** | `struct Name;` — 无字段 |
| **派生 Trait** | `#[derive(Debug, Clone, Copy)]` |
| **方法** | `impl` 块中定义，`&self` / `&mut self` / `self` |
| **关联函数** | 不以 `self` 开头，`Struct::func()` 调用 |
| **字段级借用** | 不同字段可独立地被借用 |
