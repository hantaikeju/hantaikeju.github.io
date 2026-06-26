---
title: "安装 Rust 编译环境 — VSCode 篇"
date: 2026-06-26T12:00:00+08:00
weight: 1
draft: false
tags: ["Rust", "VSCode", "开发环境", "rust-analyzer"]
categories: ["rust"]
description: "在 Windows 上安装 Rust 编译环境，配置 MSVC / GNU 工具链，搭配 VSCode + rust-analyzer 创建第一个 Rust 项目。"
---

## Rust 简介

**The Rust Programming Language** 是一门系统级编程语言，官方提供了完善的在线文档：[Rust Book](https://doc.rust-lang.org/stable/book/)。

### Rust 版本

- **Edition**：大版本，如 2021、2024
- **Version**：小版本编号，如 1.56.0 → 1.81.0

### Rust 优势

| 优势 | 说明 |
|------|------|
| 高性能 | 零成本抽象，媲美 C/C++ 的运行速度 |
| 内存安全 | 所有权系统在编译期消除悬垂指针、数据竞争 |
| 开发者友好 | 清晰的错误提示 + `rustfmt` / `clippy` 等工具 |
| 健壮的生态 | Cargo 包管理器，`crates.io` 丰富的社区库 |

> Rust 可编写更快、更可靠的软件，兼具高层次的易用性和低层次的控制力。

### Rust 简史

| 时间 | 事件 |
|------|------|
| 2006 | 个人项目起源 |
| 2009 | Mozilla 赞助 |
| 2015 | 第一个稳定版 1.0 |
| 2021 | Rust 基金会成立，Rust Edition 2021 发布 |
| 2022 | 用于 Linux 内核开发 |

---

## Windows 下 Rust 安装

Windows 下 Rust 有两套编译工具链：

| 工具链 | 说明 |
|--------|------|
| `x86_64-pc-windows-msvc` | 微软 MSVC ABI（**官方默认**） |
| `x86_64-pc-windows-gnu` | MinGW-w64 + GCC ABI |

### 两种工具链的区别

#### 1. 工具链

- **MSVC**：必须提前安装 **Visual Studio Build Tools** 并勾选 C++ 开发组件，提供微软原生 `link.exe` 链接器、UCRT 运行库。
- **GNU**：依赖 MinGW-w64 环境，无需安装 VS，使用 GNU `ld`/`lld` 链接器、MinGW 自有 C 运行库。

#### 2. ABI（程序与 C 库之间的二进制接口）

- **MSVC**：微软标准 ABI，仅能链接 VS 编译的 `.lib` 库；
- **GNU**：GCC 标准 ABI，仅能链接 MinGW 编译的 `.a` 库。
- ⚠️ 二者二进制库**不互通，不可混用**。

#### 3. 运行依赖与打包

- **MSVC**：依赖 Windows 系统自带 UCRT，编译出的 `.exe` 可直接在 Windows 服务器运行，无需附带额外动态库。
- **GNU**：依赖 `libgcc_s_seh-1.dll` 等 GNU 运行库，不静态链接时分发程序必须配套打包对应 `.dll`，否则无法启动。

#### 4. 系统适配能力

- **MSVC**：原生兼容 Windows API、COM、Windows 服务、IOCP、系统 dump 调试。云 Windows 服务器、桌面程序、对接商业 SDK **优先选择**。
- **GNU**：对 Windows 底层特性适配一般，适合纯跨平台命令行工具，重度依赖开源 FFmpeg 等 MinGW 预编译 C 库场景。

#### 5. 调试体系

- **MSVC**：生成 PDB 符号文件，完美支持 VS、WinDbg 线上崩溃堆栈排查。
- **GNU**：生成 DWARF 调试信息，仅适配 GDB，Windows 原生调试工具解析效果差。

#### 6. 异常机制

- **MSVC**：Windows 原生 SEH 结构化异常。
- **GNU**：GCC DWARF/SJLJ 异常，跨 FFI 边界抛异常易崩溃。

#### 选型总结

| 场景 | 推荐工具链 |
|------|------------|
| 本地 Windows 日常开发 | `msvc`（默认） |
| 本地 Windows 开发 + Windows 云服务器部署 | `msvc` |
| 部署 Linux 云服务器 | 额外安装 `x86_64-unknown-linux-gnu` / `x86_64-unknown-linux-musl` 目标交叉编译 |

> **仅在同时满足以下全部条件时用 `windows-gnu`：**
> 1. 纯轻量命令行工具，不注册 Windows 服务、不使用系统底层 API
> 2. 重度依赖 FFmpeg、编译工具这类只有 MinGW 预编译 `.a` 的开源库
> 3. 无第三方商业 SDK 依赖
> 4. 并发低、几乎不会出现线上崩溃，不需要 dump 调试

---

## 安装步骤（以 MSVC 为例）

### 第一步：安装 Visual Studio C++ Build Tools

1. 前往 [Visual Studio 下载页面](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. 下载 **Build Tools for Visual Studio**
3. 运行安装程序，勾选 **「使用 C++ 的桌面开发」** 工作负载
4. 完成安装

> 如果选择 **GNU 工具链**，则下载安装 [MinGW-w64](https://www.mingw-w64.org/)。

### 第二步：安装 Rust

1. 前往 [Rust 官方安装页](https://rust-lang.org/tools/install/)
2. 下载 `rustup-init.exe`
3. 运行安装程序，按提示操作
4. 默认会安装 **MSVC 工具链**，直接回车即可

安装完成后验证：

```powershell
rustc --version
cargo --version
```

---

## Rust 更新与卸载

```powershell
# 更新 Rust
rustup update

# 卸载 Rust
rustup self uninstall
```

---

## VSCode 配置

### 安装 rust-analyzer

在 VSCode 扩展市场直接搜索 **rust-analyzer**，安装即可。

`rust-analyzer` 提供：
- 代码补全（自动完成、代码片段）
- 实时语法检查（内联错误提示）
- 跳转定义 / 查找引用
- 悬停类型提示
- 自动格式化（`rustfmt`）
- `cargo check` 集成

---

## 创建第一个 Rust 项目

### 方式一：VSCode 图形化创建

1. `Ctrl + Shift + P` 打开命令面板
2. 输入 **`rust-analyzer: Create new project`**
3. 选择项目类型：
   - **Binary**：可执行程序（写 HelloWorld、后端工具选这个）
   - **Library**：代码库（供其他项目调用，学习初期不用）
4. 选择项目存放文件夹
5. 输入项目名称 → 项目自动创建

### 方式二：命令行创建

```powershell
# 创建项目
cargo new hello_rust

# 进入项目目录
cd hello_rust

# 运行项目
cargo run
```

项目结构：

```
hello_rust/
├── Cargo.toml    # 项目元数据和依赖配置
├── .gitignore    # Git 忽略规则
└── src/
    └── main.rs   # 程序入口
```

### Hello World

打开 `src/main.rs`：

```rust
fn main() {
    println!("Hello, world!");
}
```

在终端运行：

```powershell
cargo run
```

终端输出 `Hello, world!` 即表示环境配置成功 🎉

---

## 小结

| 步骤 | 内容 |
|------|------|
| 安装编译工具 | Visual Studio Build Tools（MSVC）或 MinGW-w64（GNU） |
| 安装 Rust | `rustup-init.exe` 一键安装 |
| VSCode 扩展 | 安装 `rust-analyzer` |
| 创建项目 | `cargo new` 或 VSCode 命令面板 |
| 运行 | `cargo run` |

Rust 之旅就此开启，接下来可以深入探索所有权系统、模式匹配、Trait 等核心特性。
