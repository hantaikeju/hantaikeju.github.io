---
title: "Rust：控制测试执行与组织测试"
date: 2026-07-14T10:00:00+08:00
weight: 25
draft: false
tags: ["Rust", "编程基础", "测试"]
categories: ["rust"]
description: "掌握 cargo test 的进阶用法：控制测试执行（串行/并行、显示输出、按名称过滤）、忽略测试（#[ignore]），以及单元测试与集成测试的组织方式与区别。"
---

## 概述

`cargo test` 提供了丰富的命令行参数来控制测试的执行方式，同时 Rust 将测试分为单元测试和集成测试两大类，各有不同的组织方式和适用场景。本文涵盖以下内容：控制测试执行（并行/串行、输出捕获、名称过滤）、忽略测试（`#[ignore]`），以及单元测试与集成测试的组织方式与区别。

---

## 控制测试执行

`cargo test` 在测试模式下编译运行代码，默认行为是**并行运行所有测试**。可以通过命令行参数来控制测试的执行方式。

### 命令行参数格式

`cargo test` 的参数分为两类：

```bash
cargo test [OPTIONS] [TESTNAME] [-- <TEST-OPTIONS>]
```

- `cargo test` 后面的参数（`OPTIONS` / `TESTNAME`）传给 cargo 本身
- `--` 后面的参数（`TEST-OPTIONS`）传给测试二进制文件

> 记忆技巧：`cargo test -- --xxx` 中，`--` 之前是给 cargo 的，之后是给测试程序的。

### 串行运行（单线程）

测试默认并行执行，但某些测试依赖共享状态（如读写同一文件）时可能相互干扰。使用 `--test-threads=1` 改为单线程：

```bash
cargo test -- --test-threads=1
```

> 单线程运行通常更慢，但能保证测试之间不会相互影响。一般只在调试测试冲突时使用。

### 显示打印输出

默认情况下，测试通过时 Rust 会**捕获（吞掉）**`println!` 等标准输出。只有当测试**失败**时才显示打印内容。

想看到所有输出（包括通过测试的打印），使用 `--show-output`：

```bash
cargo test -- --show-output
```

### 按名称过滤测试

**运行单个测试** —— 指定完整测试函数名：

```bash
cargo test it_works
```

**运行多个匹配的测试** —— 指定部分名称，所有**包含该字符串**的测试都会运行：

```bash
cargo test add
# 会运行 add_two、add_three 等所有名称中含 "add" 的测试
```

> 测试名称是模块路径的一部分，因此也可以用模块名过滤：
>
> ```bash
> cargo test tests::   # 只运行 tests 模块中的测试
> ```

---

## 忽略测试

### `#[ignore]` 属性

某些测试非常耗时（如网络请求、大量数据计算），日常开发中不需要频繁运行。用 `#[ignore]` 标记：

```rust
#[test]
#[ignore]
fn expensive_test() {
    // 需要一小时的测试...
}
```

被标记的测试在 `cargo test` 时会被**跳过**，并在输出中单独列出被忽略的数量。

### 只运行被忽略的测试

当你需要专门跑那些耗时测试时：

```bash
cargo test -- --ignored
```

这会**只**运行被 `#[ignore]` 标记的测试，跳过其他测试。

### 运行全部测试（含忽略）

如果需要一次性运行**所有**测试（忽略 + 未忽略）：

```bash
cargo test -- --include-ignored
```

---

## 测试分类：单元测试与集成测试

Rust 的测试分为两大类，两者目的不同，编写位置也不同。

### 单元测试（Unit Tests）

- **目的**：单独测试每个模块或函数，验证内部逻辑
- **位置**：与被测代码放在**同一个文件中**，置于 `#[cfg(test)] mod tests { }` 模块内
- **惯例**：每个源文件底部创建 `tests` 模块，使用 `use super::*` 引入父模块内容

```rust
// src/lib.rs（或任意 .rs 文件）
pub fn add_two(a: i32) -> i32 {
    a + 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_adds_two() {
        assert_eq!(4, add_two(2));
    }
}
```

- `#[cfg(test)]` 确保测试代码只在 `cargo test` 时编译，不进入最终发行版
- 单元测试可以访问**私有**函数（因为 `tests` 模块是子模块，可访问 `super` 的私有项）

### 集成测试（Integration Tests）

- **目的**：测试多个模块组合在一起的行为，验证库对外暴露的公共 API
- **位置**：在项目根目录创建 `tests/` 目录，与 `src/` 平级
- **特点**：每个文件被编译为**独立的 crate**，只能使用库的公共 API
- **适用场景**：端到端流程、回归测试、对外 API 验证

```
my_project/
├── Cargo.toml
├── src/
│   └── lib.rs
└── tests/
    ├── integration_test.rs
    └── another_test.rs
```

```rust
// tests/integration_test.rs
use my_project;  // 像外部使用者一样引入 crate

#[test]
fn test_add_two() {
    assert_eq!(4, my_project::add_two(2));
}
```

运行集成测试：

```bash
cargo test              # 运行所有测试（单元 + 集成）
cargo test --test integration_test  # 只运行指定集成测试文件
```

### 集成测试中的辅助模块

如果需要在 `tests/` 目录下放公共辅助函数，不要让它们被当作测试文件编译。需要将它们放在**子模块**中：

```
tests/
├── common/
│   └── mod.rs      # 辅助函数，不会被当作测试
├── integration_test.rs
└── another_test.rs
```

```rust
// tests/common/mod.rs
pub fn setup() {
    // 初始化测试环境的公共代码
}
```

```rust
// tests/integration_test.rs
use my_project;
mod common;   // 引入辅助模块

#[test]
fn test_with_setup() {
    common::setup();
    assert_eq!(4, my_project::add_two(2));
}
```

> Rust 只将 `tests/` 目录下的**顶层 `.rs` 文件**识别为集成测试 crate。子目录中的 `.rs` 文件不会被自动编译为测试，这正是放置辅助模块的关键机制。

### 单元测试 vs 集成测试 对比

| 维度 | 单元测试 | 集成测试 |
|------|---------|---------|
| **位置** | `src/` 中，`#[cfg(test)] mod tests` | 项目根 `tests/` 目录 |
| **测试范围** | 单个模块/函数的内部逻辑 | 多个模块组合，公共 API |
| **能否访问私有项** | ✅ 可以 | ❌ 不行（只访问公共 API） |
| **编译方式** | 与被测代码一起编译 | 独立 crate，每次单独编译 |
| **运行命令** | `cargo test` | `cargo test` 或 `cargo test --test <文件名>` |
| **适用场景** | 快速反馈、TDD、细粒度验证 | 端到端流程、回归测试、API 验证 |

---

## 总结

| 要点 | 说明 |
|------|------|
| **并行运行** | `cargo test` 默认并行；`-- --test-threads=1` 串行 |
| **显示输出** | `cargo test -- --show-output` 显示通过测试的打印 |
| **过滤测试** | `cargo test <关键字>` 运行名称匹配的测试 |
| **`#[ignore]`** | 跳过耗时测试；`-- --ignored` 单独运行 |
| **运行全部** | `cargo test -- --include-ignored` 包含被忽略的测试 |
| **单元测试** | `src/` 中 `#[cfg(test)] mod tests`，可访问私有项 |
| **集成测试** | 项目根 `tests/` 目录，独立 crate，只访问公共 API |
| **辅助模块** | `tests/common/mod.rs`，子目录中的文件不会被自动编译为测试 |
| **运行集成测试** | `cargo test --test <文件名>` 只跑某个集成测试文件 |
