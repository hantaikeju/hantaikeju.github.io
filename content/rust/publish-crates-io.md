---
title: "Rust：发布到 Crates.io"
date: 2026-07-21T17:11:00+08:00
weight: 30
draft: false
tags: ["Rust", "Cargo", "Crates.io", "发布"]
categories: ["rust"]
description: "掌握如何将 Rust 包发布到 Crates.io：文档注释（/// 和 //!）、文档测试、pub use 重新导出 API、注册 Crates.io 账户、配置元数据、cargo publish 和 cargo yank。"
---

## 概述

将 Rust 包（Crate）发布到 [Crates.io](https://crates.io) 是 Rust 生态中的关键环节。在正式发布前，需要做好两方面准备：**文档注释**让使用者能快速了解 API，**API 设计**（pub use 重新导出）让调用更简洁，最后通过 `cargo publish` 完成发布和版本管理。

---

## 文档注释

Rust 提供专用于生成 HTML 文档的**文档注释**（doc comments），供开发者了解如何使用对应的 Crate。

文档注释使用三个斜杠 `///`，支持 Markdown 格式，放在被注释的项之前：

```rust
/// Adds one to the number given.
///
/// # Examples
///
/// ```
/// let arg = 5;
/// let answer = mycrate::add_one(arg);
///
/// assert_eq!(6, answer);
/// ```
pub fn add_one(x: i32) -> i32 {
    x + 1
}
```

### 常用文档章节

除了 `# Examples`，还支持以下标准章节：

| 章节 | 用途 |
|------|------|
| `# Examples` | 展示函数或类型的用法示例 |
| `# Panics` | 说明函数在什么情况下会 panic |
| `# Errors` | 描述可能返回的 `Err` 种类 |
| `# Safety` | 解释为什么该函数是 `unsafe` 的，以及调用者需要遵守的约束 |

### 生成和查看文档

```bash
cargo doc              # 生成 HTML 文档
cargo doc --open       # 生成文档并在浏览器中打开
```

生成的文档会自动发布到 `target/doc/` 目录下。

---

## 文档注释作为测试

运行 `cargo test` 时，文档注释中的 `# Examples` 代码块会作为**文档测试（doc-tests）**自动运行：

```text
PS D:\SelfTool\mycrate> cargo test
   Compiling mycrate v0.1.0
    Finished `test` profile [unoptimized + debuginfo]
     Running unittests src\lib.rs

running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured

   Doc-tests mycrate
running 1 test
test src\lib.rs - add_one (line 5) ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured
```

> 文档测试确保示例代码始终是最新的——代码变更后如果示例不再匹配，测试会直接失败。

---

## 为包含的项添加注释

`//!` 用于为**包含它的项**（Crate 或模块）添加整体说明，而 `///` 仅作用于其后的单个项。

### 用于 Crate 级别的文档

通常写在 `src/lib.rs` 的开头，描述整个 Crate：

```rust
//! # My Crate
//!
//! `mycrate` is a collection of utilities to make performing certain
//! calculations more convenient.

/// Adds one to the number given.
///
/// # Examples
///
/// ```
/// let arg = 5;
/// let answer = mycrate::add_one(arg);
///
/// assert_eq!(6, answer);
/// ```
pub fn add_one(x: i32) -> i32 {
    x + 1
}
```

### 用于模块级别的文档

```rust
//! 本模块处理用户认证相关的所有逻辑。

mod auth {
    //! 内部认证实现细节。
}
```

运行 `cargo doc --open` 可以查看 `//!` 生成的 HTML 文档，通常出现在 Crate 文档的首页或模块页面的顶部。

> 适当使用 `//!` 说明 Crate 和模块的整体用途，可以显著提升文档的清晰度和可读性。

---

## 使用 pub use 导出方便的公共 API

`pub use` 允许开发者**重新导出（re-export）**公共条目，使 Crate 的公共 API 结构更简洁易用，而无需更改内部模块层次结构。

### 问题场景

假设 Crate 内部模块层次较深：

```
mycrate
├── art
│   ├── kinds
│   │   └── PrimaryColor
│   └── utils
│       └── mix
```

使用者必须这样调用：

```rust
use mycrate::art::kinds::PrimaryColor;
use mycrate::art::utils::mix;
```

### 用 pub use 优化

在 `src/lib.rs` 或父模块中重新导出：

```rust
// 在 art 模块中
pub use self::kinds::PrimaryColor;
pub use self::utils::mix;
```

使用者就可以直接：

```rust
use mycrate::art::PrimaryColor;
use mycrate::art::mix;
```

> 这种方式不会影响原本的内部结构，只是在顶层提供了一条更便捷的访问路径。Crate 作者可以自由组织内部模块，同时对外提供一个扁平、直观的公共 API。

---

## 发布到 Crates.io

### 1. 创建 Crates.io 账户

访问 [https://crates.io](https://crates.io)，使用 GitHub 账户登录并创建 API Token。

登录后在 [Account Settings](https://crates.io/settings/tokens) 中生成 API Token，然后在本机执行：

```bash
cargo login <your-api-token>
```

Token 会被存储在 `~/.cargo/credentials.toml` 中。

### 2. 添加元数据到 Crate

在 `Cargo.toml` 中添加必需的元数据（这些字段是 `cargo publish` 的前提条件）：

```toml
[package]
name = "mycrate"                 # Crate 名称（必须唯一）
version = "0.1.0"               # 语义化版本号
edition = "2021"                # Rust edition
description = "A brief description of what this crate does"
license = "MIT OR Apache-2.0"   # 许可证
```

> 以下字段也是**必须的**：`description`、`license`（或 `license-file`）。如果缺少其中任何一个，`cargo publish` 会报错。

### 3. 发布

```bash
cargo publish
```

**重要限制**：
- 已发布的版本**无法覆盖**、**无法重写**、**无法删除**
- 发布前务必确认代码质量和文档完善
- Crate 名称全局唯一，先到先得

### 4. 发布新版本

修改 `Cargo.toml` 中的 `version` 字段（遵循[语义化版本](https://semver.org/lang/zh-CN/)），然后再次执行 `cargo publish`。

### 5. 废弃版本 — cargo yank

虽然无法删除已发布的版本，但可以使用 `cargo yank` 将某个版本标记为"不推荐使用"，阻止它出现在新项目的依赖中：

```bash
# 废弃 0.1.0 版本
cargo yank --vers 0.1.0

# 撤销废弃
cargo yank --vers 0.1.0 --undo
```

> 已依赖该版本的项目**不会**受到影响——yank 只是阻止**新**项目引用该版本，存量项目仍然可以正常下载和构建。

---

## 发布前检查清单

| 检查项 | 说明 |
|--------|------|
| `Cargo.toml` 元数据完整 | `description`、`license`、`version`、`edition` 等必需字段 |
| 文档注释完整 | `///` 覆盖所有公共 API，包含 `# Examples` |
| Crate 级文档 | 在 `lib.rs` 中使用 `//!` 描述整体用途 |
| API 设计合理 | 使用 `pub use` 提供扁平化的公共 API |
| 测试通过 | `cargo test` 包括单元测试和文档测试 |
| 版本号正确 | 遵循语义化版本规范 |
| API Token | 已通过 `cargo login` 配置 |
