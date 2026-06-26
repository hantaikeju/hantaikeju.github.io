---
title: "安装 Rust 编译环境 — VSCode 篇"
date: 2026-06-25T20:00:00+08:00
weight: 1
draft: false
tags: ["Rust", "VSCode", "开发环境", "rust-analyzer"]
categories: ["rust"]
description: "在 Windows 上安装 Rust 编译环境，配置 MSVC / GNU 工具链，搭配 VSCode + rust-analyzer 创建第一个 Rust 项目。"
---

## The Rust Programming Language

[官方在线文档链接](https://doc.rust-lang.org/stable/book/)

## Rust 版本

Edition -- 大版本如 2021、2024

Version -- 小版本编号，如 1.56.0 → 1.81.0

## Rust 优势

- 高性能
- 高度安全性，内存高限制
- 开发者友好
- 健壮的生态系统 —— Cargo 包管理器

Rust 可编写更快、更可靠的软件，兼具高层次的易用性和低层次的控制力。

## Rust 历史

- 2006：个人项目起源
- 2009：Mozilla 赞助
- 2015：第一个稳定版本
- 2021：Rust 基金会，Rust Edition 2021 发布
- 2022：用于 Linux Kernel 开发

---

## Rust 安装

### Windows

安装 Visual Studio C++。

[Rust 安装链接](https://rust-lang.org/tools/install/)，选择对应的 `rustup-init.exe` 进行安装。

Windows 下 Rust 有两套编译工具链：

- `x86_64-pc-windows-msvc`：微软 MSVC ABI（官方默认）
- `x86_64-pc-windows-gnu`：MinGW-w64 + GCC ABI

默认是 msvc 方式。

### 两种方式的区别

#### 工具链

`x86_64-pc-windows-msvc`（默认工具链）必须提前安装 Visual Studio Build Tools 并勾选 C++ 开发组件，提供微软原生 `link.exe` 链接器、UCRT 运行库。

`x86_64-pc-windows-gnu` 依赖 MinGW-w64 环境，无需安装 VS，使用 GNU `ld`/`lld` 链接器、MinGW 自有 C 运行库。

#### ABI 程序与 C 库之间二进制层的区别

MSVC：微软标准 ABI，仅能链接 VS 编译的 `.lib` 库；

GNU：GCC 标准 ABI，仅能链接 MinGW 编译的 `.a` 库；

二者二进制库不互通，不可混用。

#### 运行依赖与打包

MSVC：依赖 Windows 系统自带 UCRT，编译出的 exe 可直接在 Windows 服务器运行，无需附带额外动态库；

GNU：依赖 `libgcc_s_seh-1.dll` 等 GNU 运行库，不静态链接时分发程序必须配套打包对应 dll，否则无法启动。

#### 系统适配能力

MSVC：原生兼容 Windows API、COM、Windows 服务、IOCP、系统 dump 调试，云 Windows 服务器、桌面程序、对接商业 SDK 优先；

GNU：对 Windows 底层特性适配一般，适合纯跨平台命令行工具，重度依赖开源 FFmpeg 等 MinGW 预编译 C 库场景。

#### 调试体系

MSVC：生成 PDB 符号文件，完美支持 VS、WinDbg 线上崩溃堆栈排查；

GNU：生成 DWARF 调试信息，仅适配 GDB，Windows 原生调试工具解析效果差。

#### 异常机制

MSVC：Windows 原生 SEH 结构化异常；

GNU：GCC DWARF/SJLJ 异常，跨 FFI 边界抛异常易崩溃。

本地 Windows 日常开发使用默认 msvc 工具链；部署 Linux 云服务器需额外安装 `x86_64-unknown-linux-gnu` / `x86_64-unknown-linux-musl` 目标交叉编译。

本地 Windows 开发 + Windows 云服务器部署，全程统一用 `x86_64-pc-windows-msvc`。

同时满足全部条件才用 `windows-gnu`：

1. 纯轻量命令行工具，不注册 Windows 服务、不使用系统底层 API；
2. 重度依赖 FFmpeg、编译工具这类只有 MinGW 预编译 `.a` 的开源库；
3. 无第三方商业 SDK 依赖；
4. 并发低、几乎不会出现线上崩溃，不需要 dump 调试。

### 安装步骤

**msvc：**

1. 安装 Visual Studio C++ Build
2. 下载 `rustup-init.exe`

**gnu：**

1. 下载 MinGW-w64
2. 下载 `rustup-init.exe`

同样的步骤：下载 `rustup-init.exe`，设置编译工具 msvc / gnu 即可。

---

## Rust 更新和卸载

```powershell
rustup update
rustup self uninstall
```

---

## Rust-analyzer（VSCode）

VSCode 扩展中直接搜索 `rust-analyzer`，进行安装即可。

---

## 创建第一个 Rust 项目 —— VSCode（也可以使用命令行创建）

### VSCode

使用 VSCode：`Ctrl + Shift + P`，输入 `rust-analyzer: Create new project`。

选择项目类型：

- **Binary**：可执行程序（写 HelloWorld、后端工具选这个）
- **Library**：代码库（供其他项目调用，学习初期不用）

选择项目存放文件夹、输入项目名称，项目即创建完成。
