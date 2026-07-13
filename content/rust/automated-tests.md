---
title: "Rust：编写自动化测试"
date: 2026-07-13T11:21:00+08:00
weight: 24
draft: false
tags: ["Rust", "编程基础", "标准库"]
categories: ["rust"]
description: "掌握 Rust 自动化测试：test 函数定义、assert!/assert_eq!/assert_ne! 宏、should_panic 测试、自定义断言信息、Result 返回值测试以及 cargo test 命令。"
---

## 概述

Rust 的类型系统能在编译期避免许多错误，但无法完整验证程序的逻辑正确性。自动化测试填补了这一空缺——通过编写测试函数来验证代码行为是否符合预期。

测试函数的典型流程：

1. **设置**所需的数据或状态
2. **运行**需要被测试的代码
3. **断言**其结果是正确的

---

## 测试函数

### 基本定义

测试函数使用 `#[test]` 属性标注，放置在 `tests` 模块中。运行 `cargo test` 即可执行所有测试。

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}
```

`#[cfg(test)]` 告诉编译器该模块仅在测试时编译，不会包含在发行版本中。

### cargo test 输出

```bash
cargo test
```

- 每个测试函数单独运行
- 通过：`ok`
- 失败：`FAILED`
- 最后汇总通过/失败数量

---

## assert! 宏

`assert!` 确保条件为 `true`，接收一个布尔值参数。`true` → 通过，`false` → panic 导致失败。

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn larger_can_hold_smaller() {
        let larger = Rectangle { width: 8, height: 7 };
        let smaller = Rectangle { width: 5, height: 1 };
        assert!(larger.can_hold(&smaller));
    }

    #[test]
    fn smaller_cannot_hold_larger() {
        let larger = Rectangle { width: 8, height: 7 };
        let smaller = Rectangle { width: 5, height: 1 };
        assert!(!smaller.can_hold(&larger));
    }
}
```

使用 `use super::*` 可以让模块内部调用外部代码（父模块的内容）。

---

## 测试相等性

### assert_eq! 和 assert_ne!

- `assert_eq!(left, right)` —— 断言两值相等
- `assert_ne!(left, right)` —— 断言两值不等

```rust
#[test]
fn it_adds_two() {
    assert_eq!(4, add_two(2));
    assert_ne!(5, add_two(2));
}
```

> 这两个宏要求参数实现 `PartialEq` 和 `Debug` trait，以便在失败时打印对比信息。

---

## 自定义断言信息

`assert!`、`assert_eq!`、`assert_ne!` 都支持附加自定义失败信息：

```rust
#[test]
fn greeting_contains_name() {
    let result = greeting("Carol");
    assert!(
        result.contains("Carol"),
        "Greeting did not contain name, value was `{}`",
        result
    );
}
```

失败时输出：

```
thread '...' panicked at 'Greeting did not contain name, value was `Hello!`'
```

---

## 断言代码是否 panic

使用 `#[should_panic]` 属性，只有当测试函数内部发生 panic 时才算通过：

```rust
#[test]
#[should_panic]
fn greater_than_100() {
    Guess::new(200);  // 预期 panic
}
```

### 精确匹配 panic 信息

通过 `expected` 参数指定 panic 信息必须包含的内容：

```rust
#[test]
#[should_panic(expected = "Guess value must be less than or equal to 100")]
fn greater_than_100() {
    Guess::new(200);
}
```

这样只有 panic 信息**包含**指定字符串时才通过，避免因其他原因 panic 而稀里糊涂通过。

---

## 在测试中使用 Result<T, E>

测试函数也可以返回 `Result<T, E>`，替代 assert 宏：

```rust
#[test]
fn it_works() -> Result<(), String> {
    if 2 + 2 == 4 {
        Ok(())
    } else {
        Err(String::from("two plus two does not equal four"))
    }
}
```

- 返回 `Ok(())` → 通过
- 返回 `Err` → 失败

> 注意：返回 `Result` 的测试不能使用 `#[should_panic]`，两者互斥。

---

## 总结

| 要点 | 说明 |
|------|------|
| **测试函数** | `#[test]` 标注，放 `#[cfg(test)] mod tests` 中 |
| **运行** | `cargo test` |
| **`assert!`** | 布尔条件，失败则 panic |
| **`assert_eq!` / `assert_ne!`** | 相等/不等断言，需 `PartialEq + Debug` |
| **自定义信息** | 宏的额外参数，失败时打印 |
| **`#[should_panic]`** | 预期 panic，`expected` 精确匹配信息 |
| **返回 `Result`** | `Ok(())` 通过，`Err` 失败，与 `#[should_panic]` 互斥 |
| **`use super::*`** | 测试模块引用外部代码 |
