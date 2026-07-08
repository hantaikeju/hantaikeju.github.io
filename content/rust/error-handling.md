---
title: "Rust：错误处理"
date: 2026-07-08T16:08:00+08:00
weight: 20
draft: false
tags: ["Rust", "编程基础"]
categories: ["rust"]
description: "掌握 Rust 错误处理机制：不可恢复的 panic!、可恢复的 Result 枚举、unwrap/expect 快捷方式、? 运算符传播错误，以及何时使用 panic 还是 Result。"
---

## 错误归类

Rust 将错误分为两大类，没有"异常"机制：

| 类别 | 说明 | 处理方式 |
|------|------|----------|
| **不可恢复** | 程序 bug（如索引越界） | `panic!` 终止程序 |
| **可恢复** | 预期可能发生的错误（如文件未找到） | `Result<T, E>` 交由调用者处理 |

---

## 不可恢复的错误：panic!

### 两种触发方式

- **某些行为**：如数组越界访问
- **显式调用**：`panic!()` 宏

发生 panic 后，程序会打印失败信息、展开（unwind）并清理 Stack，然后退出。

### panic! 示例

```rust
fn main() {
    panic!("Error");
}
```

输出：

```
thread 'main' panicked at src\main.rs:2:5:
Error
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
error: process didn't exit successfully: target\debug\TestRust.exe (exit code: 101)
```

### Panic 后的响应方式

| 方式 | 行为 | 配置 |
|------|------|------|
| **Unwind**（默认） | 展开 Stack 并清理数据 | — |
| **Abort** | 立即终止，不做内存清理，包体更小 | `Cargo.toml` 中设置 |

```toml
[profile.release]
panic = "abort"
```

### Backtrace

Backtrace 是到达 panic 点之前调用的**所有函数的列表**。需要设置环境变量：

```powershell
# PowerShell
$env:RUST_BACKTRACE=1

# CMD
SET RUST_BACKTRACE=1
```

必须是 **Debug 模式**才能获取完整信息。

```rust
fn main() {
    let v = vec![1, 2, 3];
    v[99];  // 索引越界 → panic
}
```

Backtrace 从底层到调用方逐层显示：

```
自己调用的代码
   ↑ 自己的代码
   ↑ 调用自己代码的代码
```

---

## 可恢复的错误：Result 枚举

### Result 定义

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### 基本使用

```rust
use std::fs::File;

fn main() {
    let greeting_file_result = File::open("hello.txt");
    // 成功 → Ok(File)
    // 失败 → Err(io::Error)

    println!("{greeting_file_result:?}");
}
```

- 文件不存在：`Err(Os { code: 2, kind: NotFound, message: "系统找不到指定的文件。" })`
- 文件存在：`Ok(File { handle: 0x32c, path: "..." })`

### 使用 match 处理

```rust
let greeting_file = match greeting_file_result {
    Ok(file) => file,
    Err(error) => panic!("No File: {error:?}"),
};
```

### 匹配不同错误类型

当文件不存在时自动创建，其他错误则 panic：

```rust
let greeting_file = match greeting_file_result {
    Ok(file) => file,
    Err(error) => match error.kind() {
        ErrorKind::NotFound => match File::create("hello.txt") {
            Ok(fc) => fc,
            Err(e) => panic!("Problem creating the file {e:?}"),
        },
        other_error => panic!("Problem opening the file: {other_error:?}"),
    },
};
```

---

## unwrap 和 expect

两者都是 Result / Option 的快捷解包方式，错误时直接 panic。

| 方法 | 说明 | 适用场景 |
|------|------|----------|
| `unwrap()` | panics 时无自定义消息 | 快速原型 |
| `expect(msg)` | panics 时附带自定义消息 | **推荐**，便于调试 |

```rust
let greeting_file = File::open("hello1.txt").unwrap();
// panic: called `Result::unwrap()` on an `Err` value: ...

let greeting_file = File::open("hello1.txt").expect("file not found---");
// panic: file not found---: ...
```

---

## 传播错误（Propagating Errors）

### ? 运算符

`?` 是传播错误的简洁方式：

- 成功 → 解包 `Ok` 继续执行
- 失败 → 从当前函数返回 `Err`，错误传播给调用者

避免大量 `match` 或 `if let` 语句，使代码更简洁。

### 类型转换

`?` 遇到错误时会自动调用 `From` trait 进行错误类型转换，从而匹配统一的错误类型。

### 链式调用

可以在一行中链式使用 `?`：

```rust
use std::fs;
use std::io;

fn read_username_from_file() -> Result<String, io::Error> {
    let username = fs::read_to_string("hello.txt")?;
    Ok(username)
}
```

> 标准库已提供 `fs::read_to_string`，直接返回 `Result<String, io::Error>`，相当于上述逻辑的内置版本。

---

## 何时用 panic!？何时用 Result？

| 场景 | 使用 |
|------|------|
| **可预期的失败**（如用户输入错误、文件不存在） | `Result` |
| **不可恢复的 bug**（如内部逻辑错误、违反契约） | `panic!` |
| **测试代码** | `unwrap` / `expect` 很方便 |
| **比调用者更了解上下文**（确定不会出错） | `unwrap` / `expect` |
| **原型阶段** | `unwrap` / `expect` 快速推进 |

---

## 总结

| 要点 | 说明 |
|------|------|
| **错误分类** | 可恢复（Result） vs 不可恢复（panic!） |
| **panic!** | 展开 Stack 并清理，可切换为 abort 减小包体 |
| **Backtrace** | `RUST_BACKTRACE=1` 查看调用链，Debug 模式 |
| **Result** | `Ok(T)` / `Err(E)`，用 `match` 穷尽处理 |
| **unwrap / expect** | 快捷解包，`expect` 带自定义消息（推荐） |
| **`?` 运算符** | 成功解包继续，失败 `return Err` 传播 |
| **错误转换** | `?` 自动调用 `From` trait 统一错误类型 |
