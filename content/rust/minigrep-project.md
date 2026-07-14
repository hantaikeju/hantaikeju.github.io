---
title: "Rust：实战项目 MiniGrep"
date: 2026-07-14T16:00:00+08:00
weight: 26
draft: false
tags: ["Rust", "编程基础", "实战项目", "测试"]
categories: ["rust"]
description: "通过构建命令行搜索工具 MiniGrep，实践 Rust 核心概念：命令行参数解析、文件读取、模块化重构、Result 错误处理、TDD 测试驱动开发、环境变量以及 stderr 输出。"
---

## 概述

通过构建一个命令行工具来实践 Rust 的相关概念。该工具类似于经典的 `grep`：能够在指定文件中搜索指定字符串，并输出匹配的行。

```bash
cargo run -- the poem.txt
# 在 poem.txt 中搜索包含 "the" 的行
```

---

## 创建 Minigrep

### 接受命令行参数

使用 `std::env::args()` 获取命令行参数，返回一个迭代器，通过 `.collect()` 转为 `Vec<String>`：

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    dbg!(args);
}
```

运行：

```bash
cargo run
# [src\main.rs:5:5] args = [
#     "target\\debug\\minigrep.exe",
# ]
```

> `args()` 的第一个元素总是程序的路径，真正的参数从 `args[1]` 开始。

### 取出所需参数

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    let query = &args[1];       // 搜索的字符串
    let file_path = &args[2];   // 目标文件路径

    println!("Searching for {query}");
    println!("In file {file_path}");
}
```

```bash
cargo run -- test sample.txt
# Searching for test
# In file sample.txt
```

> 注意 `cargo run --` 中 `--` 的作用：`--` 之前的参数传给 cargo，之后的传给程序本身。

### 读取文件

使用 `std::fs::read_to_string` 读取文件内容：

```rust
use std::env;
use std::fs;

fn main() {
    let args: Vec<String> = env::args().collect();
    let query = &args[1];
    let file_path = &args[2];

    println!("Searching for {query}");
    println!("In file {file_path}");

    let contents = fs::read_to_string(file_path)
        .expect("Something went wrong reading the file");

    println!("With text:\n{contents}");
}
```

```bash
cargo run -- the poem.txt
# Searching for the
# In file poem.txt
# With text:
# I'm nobody! Who are you?
# Are you nobody, too?
# ...
```

---

## 重构：模块化、改进错误处理

### 处理 Result —— unwrap_or_else

将容易 panic 的 `expect` 替换为优雅的错误处理。`unwrap_or_else` 在 `Ok` 时提取结果，`Err` 时执行闭包中的错误处理代码：

```rust
use std::env;
use std::error::Error;
use std::fs;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments:{}", err);
        process::exit(1);
    });

    println!("Searching for {}", config.query);
    println!("In file {}", config.file_path);

    if let Err(e) = run(config) {
        eprintln!("Application error:{}", e);
        process::exit(1);
    }
}

struct Config {
    query: String,
    file_path: String,
}

impl Config {
    fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("Not enough arguments");
        }
        let query = args[1].clone();
        let file_path = args[2].clone();
        Ok(Config { query, file_path })
    }
}

fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;
    println!("With text:\n{contents}");
    Ok(())
}
```

> `run` 返回 `Result<(), Box<dyn Error>>`，在 `main` 中用 `if let Err(e)` 处理，避免对 `Ok` 返回值做无意义的匹配。

### 分割为 lib.rs 和 main.rs

将核心逻辑移到 `src/lib.rs`，`main.rs` 只负责组装和调用：

**lib.rs**：

```rust
use std::error::Error;
use std::fs;

pub struct Config {
    pub query: String,
    pub file_path: String,
}

impl Config {
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("Not enough arguments");
        }
        let query = args[1].clone();
        let file_path = args[2].clone();
        Ok(Config { query, file_path })
    }
}

pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;
    println!("With text:\n{contents}");
    Ok(())
}
```

**main.rs**：

```rust
use std::env;
use std::process;
use minigrep::Config;

fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments:{}", err);
        process::exit(1);
    });

    println!("Searching for {}", config.query);
    println!("In file {}", config.file_path);

    if let Err(e) = minigrep::run(config) {
        eprintln!("Application error:{}", e);
        process::exit(1);
    }
}
```

> 分离的好处：核心逻辑可独立测试；`main.rs` 保持简洁只做编排。

---

## 用测试驱动开发（TDD）来开发功能

### 实现搜索逻辑

先写测试，再写实现。在 `lib.rs` 中添加：

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();
    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_result() {
        let query = "duct";
        let content = "\
Rust:
safe, fast, productive.
Pick three.";
        assert_eq!(vec!["safe, fast, productive."], search(query, content));
    }
}
```

更新 `run` 函数调用 `search`：

```rust
pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;
    for line in search(&config.query, &contents) {
        println!("{line}");
    }
    Ok(())
}
```

### 加入大小写区分开关

通过环境变量 `IGNORE_CASE` 控制是否忽略大小写：

```rust
use std::fs;
use std::{env, error::Error};

pub struct Config {
    pub query: String,
    pub file_path: String,
    pub ignore_case: bool,
}

impl Config {
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("Not enough arguments");
        }
        let query = args[1].clone();
        let file_path = args[2].clone();
        let ignore_case = env::var("IGNORE_CASE").is_ok();
        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}

pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    let result = if !config.ignore_case {
        search(&config.query, &contents)
    } else {
        search_case_insensitive(&config.query, &contents)
    };

    for line in result {
        println!("{line}");
    }
    Ok(())
}

pub fn search_case_insensitive<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let query = query.to_lowercase();
    let mut results = Vec::new();
    for line in contents.lines() {
        if line.to_lowercase().contains(&query) {
            results.push(line);
        }
    }
    results
}

pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();
    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let content = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";
        assert_eq!(vec!["safe, fast, productive."], search(query, content));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let content = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";
        assert_eq!(
            vec!["Rust:", "Trust me."],
            search_case_insensitive(query, content)
        );
    }
}
```

运行方式：

```bash
# 区分大小写（默认）
cargo run -- the poem.txt

# 忽略大小写（Windows PowerShell）
$env:IGNORE_CASE=1; cargo run -- the poem.txt

# 忽略大小写（Linux / macOS）
IGNORE_CASE=1 cargo run -- the poem.txt
```

### 将错误信息输出到 stderr

- `println!` → 输出到 **stdout**（可被 `>` 重定向到文件）
- `eprintln!` → 输出到 **stderr**（不可被 `>` 重定向，始终显示在终端）

```bash
cargo run > output.txt
# 只有 println! 的内容进入 output.txt
# eprintln! 的错误信息仍然显示在终端
```

这样用户可以将搜索结果重定向到文件，同时错误信息不会被混入：

```bash
cargo run -- the poem.txt > results.txt
# results.txt 只包含匹配的行
# 错误信息仍然在终端显示
```

---

## 总结

| 要点 | 说明 |
|------|------|
| **命令行参数** | `std::env::args()` 获取参数，`cargo run --` 传递参数给程序 |
| **读取文件** | `std::fs::read_to_string` 读取整个文件内容 |
| **Config 结构体** | 封装配置（query、file_path、ignore_case），用 `build` 方法构造 |
| **错误处理** | `unwrap_or_else` 处理 Result，避免 `expect` 直接 panic |
| **模块化** | 核心逻辑放 `lib.rs`，入口放 `main.rs` |
| **TDD** | 先写测试，再写实现函数 |
| **生命周期标注** | `search<'a>` 返回值借用 `contents`，需要显式标注生命周期 |
| **环境变量** | `env::var("IGNORE_CASE")` 控制大小写敏感 |
| **stderr** | `eprintln!` 输出错误信息，不被 `>` 重定向 |
| **`?` 运算符** | `run` 中 `read_to_string(...)?` 传播错误 |
