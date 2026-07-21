---
title: "Rust：自定义项目构建"
date: 2026-07-15T14:58:00+08:00
weight: 29
draft: false
tags: ["Rust", "编程基础", "Cargo", "构建"]
categories: ["rust"]
description: "掌握 Cargo 发布配置文件（Release Profiles）：dev 和 release 的区别、在 Cargo.toml 中自定义 profile 选项、控制优化级别和调试信息。"
---

## 概述

**发布配置文件（Release Profiles）** 是 Cargo 预定义的、可自定义的配置，用于控制代码编译时的各种选项。每个配置文件都是独立的，针对不同场景使用不同的优化策略。

Cargo 提供两个主要的配置文件：

| 配置文件 | 触发命令 | 用途 | 默认策略 |
|----------|---------|------|---------|
| `dev` | `cargo build` | 开发阶段 | 优化**调试体验**（快速编译、完整调试信息） |
| `release` | `cargo build --release` | 发布部署 | 优化**运行性能**（深度优化、牺牲编译速度） |

---

## dev 和 release 的默认差异

创建项目后，如果不显式设置，`Cargo.toml` 中不会出现 `[profile.*]` 部分，Cargo 使用内部默认值。两者的关键区别：

| 选项 | `dev` 默认值 | `release` 默认值 | 效果 |
|------|-------------|-----------------|------|
| `opt-level` | `0` | `3` | 优化级别（0=不优化，3=最大优化） |
| `debug` | `true` | `false` | 是否生成调试符号 |
| `debug-assertions` | `true` | `false` | 是否启用 `debug_assert!` |
| `overflow-checks` | `true` | `false` | 是否检查整数溢出 |
| `lto` | `false` | `false` | 链接时优化（Link Time Optimization） |
| `panic` | `unwind` | `unwind` | panic 时回滚栈还是直接终止 |
| `incremental` | `true` | `false` | 增量编译（加快重复编译速度） |
| `codegen-units` | `256` | `16` | 代码生成单元数（越多编译越快、越少运行越快） |

> `codegen-units` 越小，LLVM 优化越充分，但编译时间越长。release 默认 16 是编译速度与性能的平衡点。

---

## 自定义 Profile

如果需要对某个 profile 进行自定义，可以在 `Cargo.toml` 中添加 `[profile.*]` 部分，覆盖默认选项。

### 基本语法

```toml
# Cargo.toml

[profile.dev]
opt-level = 0       # 开发时不优化（默认值，可省略）

[profile.release]
opt-level = 3       # 发布时最大优化
lto = true          # 启用链接时优化
codegen-units = 1   # 单个代码生成单元，最佳性能
panic = 'abort'     # panic 时直接终止，减小二进制体积
```

### opt-level 优化级别详解

`opt-level` 控制编译器对代码的优化程度：

| 值 | 说明 |
|----|------|
| `0` | 不优化，编译最快 |
| `1` | 基本优化，平衡编译速度 |
| `2` | 较深优化（release 默认实际行为接近此级别） |
| `3` | 最大优化，包括循环展开、自动向量化等 |
| `"s"` | 优化二进制**体积**（size） |
| `"z"` | 进一步优化体积，关闭循环向量化 |

### 为开发环境加速编译的实用配置

```toml
[profile.dev]
opt-level = 0           # 编译快
incremental = true      # 增量编译
debug = true            # 完整调试信息
```

### 为发布环境追求极致性能

```toml
[profile.release]
opt-level = 3           # 最高优化级别
lto = "fat"             # 跨 crate 链接时优化
codegen-units = 1       # 单个编译单元，最大化优化
panic = 'abort'         # 减小 panic 处理代码体积
strip = true            # 去除符号表，减小二进制
```

### 为发布环境追求小体积

```toml
[profile.release]
opt-level = "z"         # 优化体积
lto = true              # 链接时优化可大幅减小体积
codegen-units = 1       # 单编译单元
panic = 'abort'         # 去掉 unwind 代码
strip = true            # 去除符号
```

---

## 创建自定义 Profile

除了内置的 `dev` 和 `release`，还可以创建**自定义 profile**：

```toml
# Cargo.toml

[profile.bench]
opt-level = 3
debug = false
inherits = "release"    # 继承 release 的所有默认设置
```

使用自定义 profile：

```bash
cargo build --profile bench
```

> `inherits` 指定从哪个内置 profile 继承默认值，只需覆盖你关心的选项。

### 常见自定义 profile 场景

| Profile | 用途 |
|---------|------|
| `bench` | 基准测试专用，继承 release，确保性能可对比 |
| `ci` | CI/CD 流水线专用，平衡编译速度与检查完整性 |
| `release-debug` | 发布但仍保留调试信息，方便线上排查 |

```toml
# 为线上排查保留调试符号
[profile.release-debug]
inherits = "release"
debug = true
```

---

## 覆盖依赖的优化级别

通过 `[profile.dev.package.*]` 可以为特定依赖单独设置优化级别：

```toml
# 开发模式下，对大依赖启用优化，加快整体编译
[profile.dev]
opt-level = 0

[profile.dev.package."*"]
opt-level = 0

# 对特定重量级依赖开启优化
[profile.dev.package.serde]
opt-level = 2
```

> `"*"` 匹配所有依赖，降低全体依赖的优化级别可以加快编译。让编译慢但使用频繁的少数依赖保持优化。

---

## 常见编译策略

### 开发时：快速迭代

```toml
[profile.dev]
opt-level = 0
incremental = true
debug = 2               # 限制调试信息量（"line tables only"）
debug-assertions = true
overflow-checks = true
```

### CI / 测试：平衡

```toml
[profile.test]
inherits = "dev"
opt-level = 1            # 轻度优化，测试跑得更快
debug = 2
debug-assertions = true
```

### 发布：最大性能

```toml
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = 'abort'
strip = true
```

---

## 实际效果对比

以一个简单的斐波那契计算为例：

```rust
fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn main() {
    println!("{}", fibonacci(42));
}
```

| Profile | 编译时间 | 运行时间 | 二进制大小 |
|---------|---------|---------|-----------|
| `dev` (opt-level=0) | ~0.3s | ~4.5s | ~4.8 MB |
| `release` (opt-level=3) | ~2.1s | ~0.19s | ~4.0 MB |
| `release` + lto + codegen-units=1 | ~8.5s | ~0.18s | ~3.2 MB |

> 数据为示例量级，实际表现取决于项目和硬件。注意 `release` 编译慢很多但运行快 20+ 倍。

---

## 总结

| 要点 | 说明 |
|------|------|
| **两个默认 profile** | `dev`（快速编译）和 `release`（深度优化） |
| **opt-level** | `0`=不优化，`3`=最大优化，`"s"`/`"z"`=优化体积 |
| **lto** | 链接时优化，`true`/`"thin"`/`"fat"`，对性能提升显著 |
| **codegen-units** | 越小性能越好但编译越慢，`1` 表示最大化优化 |
| **自定义 profile** | `[profile.xxx]` + `inherits` 创建专属配置 |
| **依赖级别覆盖** | `[profile.dev.package.xxx]` 单独控制依赖优化 |
| **panic 策略** | `unwind`=安全回滚，`abort`=减小二进制体积 |
| **使用方式** | `cargo build --profile <name>` 指定自定义 profile |
