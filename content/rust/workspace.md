---
title: "Rust：Workspace（工作空间）"
date: 2026-07-21T17:52:00+08:00
weight: 31
draft: false
tags: ["Rust", "Cargo", "Workspace", "项目管理"]
categories: ["rust"]
description: "掌握 Cargo Workspace：管理多包项目、共享 Cargo.lock 与输出目录、依赖外部包、工作空间内测试、发布子包到 Crates.io、cargo install 安装二进制工具及自定义 Cargo 扩展命令。"
---

## 概述

**Workspace（工作空间）** 是一组共享同一个 `Cargo.lock` 文件和输出目录的包（packages）。当一个项目拆分为多个 Crate 时，Workspace 能统一管理这些 Crate 的依赖和构建产物。

典型场景：一个项目包含一个**二进制 Crate**和一个或多个**库 Crate**，例如之前 minigrep 项目拆分为 `minigrep`（二进制）+ `minigrep-lib`（库）时就可以使用 Workspace 来组织。

### Workspace 目录结构

```
my-workspace/
├── Cargo.toml          # 工作空间根配置
├── Cargo.lock          # 全局唯一的依赖锁文件
├── target/             # 统一的编译输出目录
├── crate-a/            # 子 Crate
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── crate-b/
    ├── Cargo.toml
    └── src/
        └── main.rs
```

---

## 创建 Workspace

### 1. 根 Cargo.toml 配置

在根目录创建 `Cargo.toml`，使用 `[workspace]` 部分声明成员：

```toml
[workspace]
members = [
    "crate-a",
    "crate-b",
]
```

> 如果某个目录不是 Workspace 成员，Cargo 默认不会编译它。也可以使用 `[workspace]` 的 `exclude` 排除不需要的目录。

### 2. 子 Crate 的 Cargo.toml

每个子 Crate 维护自己的 `Cargo.toml`，如 `crate-a/Cargo.toml`：

```toml
[package]
name = "crate-a"
version = "0.1.0"
edition = "2021"
```

### 3. 子 Crate 之间的依赖

如果 `crate-b` 需要依赖 `crate-a`，在 `crate-b/Cargo.toml` 中以**路径依赖**的方式声明：

```toml
[dependencies]
crate-a = { path = "../crate-a" }
```

---

## 依赖外部的包

整个 Workspace **只有一个** `Cargo.lock` 文件，位于根目录。这意味着：

- 所有子 Crate 共享同一份依赖版本
- 同一个外部依赖在所有 Crate 中**只会使用同一个版本**
- 如果两个子 Crate 声明了互不兼容的版本，Cargo 会尝试解析——如果无法找到同时满足所有约束的版本，编译就会失败

### 依赖添加方式

```bash
# 在 Workspace 根目录为某个子 Crate 添加依赖
cargo add rand -p crate-a

# 或者直接编辑 crate-a/Cargo.toml
```

示例——`crate-a/Cargo.toml`：

```toml
[dependencies]
rand = "0.8"
```

> 统一的 `Cargo.lock` 确保了 Workspace 内所有 Crate 使用完全相同的外部依赖版本，避免了版本冲突和不一致问题。

---

## 在 Workspace 中构建和运行

### 构建

```bash
# 在根目录构建所有成员
cargo build

# 构建指定成员
cargo build -p crate-a
```

### 运行二进制 Crate

```bash
cargo run -p crate-b
```

---

## 测试

使用 `-p` 指定要测试的子 Crate：

```bash
# 测试指定子 Crate
cargo test -p crate-a

# 一次性测试所有成员
cargo test --all
```

> 每个子 Crate 的测试相互独立，`-p` 可以精确地只运行某个包的测试，加快反馈速度。

---

## 发布到 Crates.io

Workspace 中的每个子 Crate 可以**独立发布**到 Crates.io：

```bash
# 发布指定子 Crate
cargo publish -p crate-a
```

**注意事项**：

| 事项 | 说明 |
|------|------|
| 路径依赖 | 发布前，路径依赖会被 Cargo 自动转换为 Crates.io 上的版本依赖 |
| 单独发布 | 可以只发布某个库 Crate，不必须发布所有成员 |
| 版本独立 | 每个子 Crate 维护自己的版本号 |
| 发布顺序 | 如果 B 依赖 A，需先发布 A，再发布 B |

---

## 最佳实践建议

1. **拆分的时机**：当项目的不同部分逻辑边界清晰，或者多个二进制 Crate 共享公共库代码时，考虑创建 Workspace
2. **一个包一个职责**：每个子 Crate 只负责一个明确的功能领域
3. **共享公共依赖**：将通用工具函数放在一个库 Crate 中，其他 Crate 通过路径依赖引入
4. **独立可测试**：每个子 Crate 的单元测试互不干扰，`cargo test -p` 可以单独运行
5. **按需发布**：不需要将所有成员发布到 Crates.io，只发布对他人有用的库 Crate

---

## cargo install 安装二进制工具

`cargo install` 用来从 Crates.io **安装二进制 Crate**（带有可执行文件的包），类似于其他语言的全局工具/CLI 安装：

```bash
# 安装 ripgrep（一个快速的 grep 替代品）
cargo install ripgrep

# 安装特定版本
cargo install ripgrep --version 13.0.0
```

安装后的二进制文件存储在 `~/.cargo/bin/`，需确保该路径在 `PATH` 环境变量中。

> 只安装有 `[[bin]]` target 的 Crate；纯库 Crate 不能通过 `cargo install` 安装。

---

## 使用自定义命令扩展 Cargo

如果系统中存在名为 `cargo-<something>` 的可执行文件在 `PATH` 中，就可以像 `cargo <something>` 一样运行它。

例如安装 `cargo-outdated` 后：

```bash
# 安装扩展
cargo install cargo-outdated

# 使用扩展命令
cargo outdated    # 检查过期的依赖
```

### 常见的 Cargo 扩展

| 扩展 | 用途 |
|------|------|
| `cargo-outdated` | 检查依赖版本是否过时 |
| `cargo-edit` | 提供 `cargo add`、`cargo rm` 等命令（新版本已内置） |
| `cargo-audit` | 检查依赖中的已知安全漏洞 |
| `cargo-bloat` | 分析二进制文件中各函数的大小 |
| `cargo-expand` | 展开宏以查看生成的代码 |
| `cargo-watch` | 监视文件变更并自动运行命令 |
