---
title: "Rust：项目代码组织"
date: 2026-07-06T17:07:00+08:00
weight: 16
draft: false
tags: ["Rust", "编程基础", "标准库"]
categories: ["rust"]
description: "理解 Rust 项目的代码组织体系：Crate、Package、Module 模块系统、路径调用、use 引用以及第三方 crate 的添加。"
---

## 概述

Rust 的代码组织体系分为三个层级：**Crate**（编译单元）、**Package**（发布单元）和 **Module**（代码组织单元）。理解这三者之间的关系，是构建中大型 Rust 项目的基础。

---

## Crate

Crate 是 Rust 编译的基本单元，分为两种类型：

| 类型 | 说明 | Crate Root |
|------|------|------------|
| **Binary Crate** | 可执行程序，必须有 `main` 函数 | `src/main.rs` |
| **Library Crate** | 库，无 `main` 函数，供其他 crate 使用 | `src/lib.rs` |

### 创建

```bash
cargo new crate_name          # binary crate（默认）
cargo new crate_name --lib    # library crate
```

---

## Package

Package 是 Cargo 的管理单元，由 **一个或多个 crate** 组成，包含 `Cargo.toml` 文件。

**规则：**
- 可以有**多个** binary crate（放在 `src/bin/` 下）
- 最多**一个** library crate
- 至少**一个** crate（binary 或 library）

---

## Module 模块

Module 使用 `mod` 关键字声明，用于将代码拆分为更小、更易管理的单元。模块支持嵌套（子模块），并且有 `public` / `private` 可见性控制。

### 内联模块

直接在同一个文件中定义模块及其内容：

```rust
mod models {
    // 模块内容写在这里
}
```

### 文件模块

声明模块并指向同名文件：

```rust
mod models;  // 编译器会查找 models.rs
```

### 目录模块

```
src/
├── main.rs
├── lib.rs
├── models.rs          ← models 模块（声明子模块）
└── models/
    ├── enums.rs       ← models::enums
    └── structs.rs     ← models::structs
```

对应的声明方式：

```rust
// lib.rs
pub mod models;

// models.rs
pub mod enums;
pub mod structs;
```

> **推荐**：使用 `models.rs` + `models/` 目录的方式组织带子模块的模块，而不是旧式的 `models/mod.rs`。

---

## 路径调用

### 绝对路径

从 crate 根开始，使用 `crate::` 前缀：

```rust
mod m1 {
    pub mod m2 {
        pub fn method1() {
            println!("method1");
        }
    }
}

fn main() {
    crate::m1::m2::method1();  // 绝对路径
}
```

### 相对路径

- `super::` —— 访问父模块
- `self::` —— 访问自身模块

```rust
mod x1 {
    mod x2 {
        fn method2() {
            super::super::m1::m2::method1();  // 跳到上级的上级
        }
    }

    fn method3() {
        self::x2::method2();  // 访问同级的 x2 模块
    }
}
```

---

## use 引用

`use` 关键字将路径引入当前作用域，避免重复写长路径。

### use 的规则

| 目标 | 规则 | 示例 |
|------|------|------|
| **函数** | 引用到父模块 | `use crate::models::helpers;` → `helpers::get_name()` |
| **struct / enum** | 引用完整路径 | `use crate::models::enums::YesNo;` → `YesNo::Yes` |

同名冲突时，使用 `as` 取别名：

```rust
use crate::models::enums::YesNo;
use crate::other::YesNo as OtherYesNo;
```

### pub use（重导出）

`pub use` 将引入的模块重新导出，使外部调用者也能直接使用：

```rust
pub use crate::models::hosting;
// 外部现在可以直接 use 这个 hosting 模块
```

### `crate::` 在不同文件中的指向

| 所在文件 | 所属 Crate | `crate::` 指向 |
|----------|-----------|---------------|
| `main.rs` | Binary Crate | `main.rs` 自身 |
| `lib.rs` | Library Crate | `lib.rs` 自身 |
| `models.rs` / `enums.rs` 等 | Library Crate | `lib.rs` |

### main.rs 引用库 crate

两种等价方式：

```rust
// 方式1：用 crate 名（Cargo.toml 中的 name）
use my_project::models::enums::YesNo;

// 方式2：直接用路径
let y = my_project::models::enums::YesNo::Yes;
```

---

## 添加第三方 Crate

在 `Cargo.toml` 的 `[dependencies]` 下添加：

```toml
[dependencies]
rand = "0.8"
serde = { version = "1.0", features = ["derive"] }
```

或使用命令行：

```bash
cargo add rand
cargo add serde --features derive
```

---

## 总结

| 要点 | 说明 |
|------|------|
| **模块必须声明** | 文件存在 ≠ 模块生效，必须在父模块中用 `mod` 声明 |
| **命名规则** | 文件名即模块名，蛇形命名 `snake_case` |
| **目录结构** | `models.rs` + `models/` 表示 models 拥有子模块 |
| **`pub` 可见性** | 不加 `pub` 的子模块对外不可见；`lib.rs` 中用 `pub mod` 暴露给 binary crate |
| **use 规则** | 函数引用到父模块，struct/enum 引用完整路径 |
| **`crate::` 指向** | 始终指向当前文件所在的 crate 根 |
