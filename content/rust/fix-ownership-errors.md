---
title: "Rust 实战：修复所有权常见错误"
date: 2026-07-02T11:27:00+08:00
weight: 12
draft: false
tags: ["Rust", "编程基础", "内存", "故障排查"]
categories: ["rust"]
description: "逐个击破 Rust 所有权系统中的常见编译错误：悬垂引用、权限不足、别名与可变性冲突、集合元素借用规则等，附多种修复方案对比。"
---

## 错误 1：返回指向 Stack 内存的引用

最常见的新手错误——返回局部变量的引用：

```rust
fn main() {
    let value = return_a_string();
    println!("{}", value);
}

fn return_a_string() -> &String {
    let s = String::from("Hello world");
    &s   // ❌ s 在函数结束时被释放，&s 变成悬垂指针
}
```

**根因**：引用活得比数据长，数据释放后引用指向无效内存。

### 修复方案

#### 方案 A：转移所有权（最直接）

不返回引用，直接返回 `String` 本身：

```rust
fn return_a_string() -> String {
    let s = String::from("Hello world");
    s     // ✅ 所有权移出，调用方接管
}
```

#### 方案 B：延长数据生命周期

如果数据是编译时确定的字符串字面量，可以用 `'static` 生命周期：

```rust
fn return_a_string() -> &'static str {
    "Hello world"   // ✅ 字符串字面量在程序整个生命周期内有效
}
```

#### 方案 C：`Rc` 引用计数

当需要多处共享同一数据时，用 `Rc<T>` 引用计数指针：

```rust
use std::rc::Rc;

fn return_a_string() -> Rc<String> {
    let s = Rc::new(String::from("Hello, world!"));
    Rc::clone(&s)   // ✅ 增加引用计数，共享所有权
}
```

#### 方案 D：直接修改原数据

不返回新值，通过 `&mut` 在调用方数据上原地修改：

```rust
fn main() {
    let mut s = String::from("hello");
    return_a_string(&mut s);
    println!("{}", s);  // "hello world"
}

fn return_a_string(output: &mut String) {
    output.replace_range(.., "hello world");
}
```

### 方案对比

| 方案 | 适用场景 | 开销 |
|------|----------|------|
| 转移所有权 | 单一所有者 | 无额外开销 |
| `'static` | 编译时已知字符串 | 无开销 |
| `Rc<T>` | 多处共享 | 引用计数开销 |
| `&mut` 原地修改 | 调用方已有数据 | 无额外分配 |

---

## 错误 2：没有足够的权限

不可变引用不能用来修改数据：

```rust
fn main() {
    let name = vec![String::from("Ferris")];
    let first = &name[0];
    stringify_name_with_title(&name);  // ❌ name 不可变，无法修改
    println!("{first}");
}

fn stringify_name_with_title(name: &Vec<String>) -> String {
    name.push(String::from("Esq."));   // ❌ &Vec<String> 不可变
    let full = name.join(" ");
    full
}
```

### 修复方案

#### 方案 A：加 `mut` 添加修改权限

```rust
fn main() {
    let mut name = vec![String::from("Ferris")];
    stringify_name_with_title(&mut name);  // ✅ 可变引用
    let first = &name[0];
    println!("{first}");
}

fn stringify_name_with_title(name: &mut Vec<String>) -> String {
    name.push(String::from("Esq."));
    let full = name.join(" ");
    full
}
```

#### 方案 B：`clone` 复制一份数据

不需要修改原数据，在副本上操作：

```rust
fn main() {
    let name = vec![String::from("Ferris")];
    let first = &name[0];
    let full = stringify_name_with_title(&name);  // ✅ 不可变引用即可
    println!("{first}");
    println!("{full}");
}

fn stringify_name_with_title(name: &Vec<String>) -> String {
    let mut name_clone = name.clone();    // 复制
    name_clone.push(String::from("Esq."));
    let full = name_clone.join(" ");
    full
}
```

#### 方案 C：`join` 先产生新 String，再操作

```rust
fn stringify_name_with_title(name: &Vec<String>) -> String {
    let mut full = name.join(" ");    // join 返回新 String
    full.push_str(" Esq.");           // 在新 String 上修改
    full
}
```

---

## 错误 3：同时启用别名和可变性

当对同一个数据同时存在不可变引用和可变操作时：

```rust
fn add_big_strings(dst: &mut Vec<String>, src: &[String]) {
    let largest = dst.iter().max_by_key(|s| s.len()).unwrap();
    //          ^^^ largest 是 dst 的不可变引用
    for s in src {
        if s.len() > largest.len() {
            dst.push(s.clone());  // ❌ dst 已有不可变引用，不能再可变操作
        }
    }
}
```

### 修复方案

#### 方案 A：`clone` largest 的值

```rust
fn add_big_strings(dst: &mut Vec<String>, src: &[String]) {
    let largest = dst.iter().max_by_key(|s| s.len()).unwrap().clone();
    //                                                                 ^^^^^^ 把值 clone 出来，不再是引用
    for s in src {
        if s.len() > largest.len() {
            dst.push(s.clone());  // ✅ largest 不是引用，不冲突
        }
    }
}
```

#### 方案 B：创建新集合，最后合并

```rust
fn add_big_strings(dst: &mut Vec<String>, src: &[String]) {
    let largest = dst.iter().max_by_key(|s| s.len()).unwrap();
    let to_add: Vec<String> = src
        .iter()
        .filter(|s| s.len() > largest.len())
        .cloned()
        .collect();
    dst.extend(to_add);   // ✅ 延迟修改，先收集再扩展
}
```

#### 方案 C：只存长度而非引用

```rust
fn add_big_strings(dst: &mut Vec<String>, src: &[String]) {
    let largest_len = dst.iter().max_by_key(|s| s.len()).unwrap().len();
    //               ^^^^^^^^^^^ 存长度值（usize），不是引用
    for s in src {
        if s.len() > largest_len {
            dst.push(s.clone());  // ✅ 无引用冲突
        }
    }
}
```

### 方案对比

| 方案 | 策略 | 内存开销 |
|------|------|:---:|
| `clone` 值 | 复制数据解耦引用 | 有 |
| 创建新集合 | 延迟修改 | 临时分配 |
| 只存长度 | 存 Copy 类型值 | 无 |

---

## 错误 4：从一个集合中移除元素的所有权

不能通过解引用从集合中"拿出"元素：

```rust
let v: Vec<i32> = vec![0, 1, 2];
let n_ref: &i32 = &v[0];
let n: i32 = *n_ref;     // ✅ i32 是 Copy 类型，*n_ref 是复制

let v: Vec<String> = vec![String::from("Hello world")];
let s_ref: &String = &v[0];
let s: String = *s_ref;  // ❌ String 不是 Copy 类型，解引用是移动！
```

| 类型 | 解引用行为 |
|------|-----------|
| `i32` / Copy 类型 | 复制值 |
| `String` / 非 Copy 类型 | 移动所有权（不允许从引用后面移走） |

### 修复：`clone`

```rust
let v: Vec<String> = vec![String::from("Hello world")];
let s_ref: &String = &v[0];
let s = v[0].clone();   // ✅ 显式复制，原数据不变
```

---

## 错误 5：元组中的元素借用规则

元组作为整体时，借用一个字段会**冻结整个元组**：

#### ✅ 可以：当前作用域明确知道哪个字段被借用

```rust
fn main() {
    let mut name = (
        String::from("Ferris"),
        String::from("Rustacean")
    );

    let first = &name.0;          // 只借用 .0
    name.1.push_str(", Esq.");    // ✅ 编译器知道只借了 .0，.1 仍可修改
    print!("{first} {}", name.1);
}
```

#### ❌ 不可以：通过函数借用，编译器不知道具体字段

```rust
fn main() {
    let mut name = (
        String::from("Ferris"),
        String::from("Rustacean")
    );

    let first = get_first_name(&name);  // 借用整个 name
    name.1.push_str(", Esq.");          // ❌ 编译器认为整个 name 被借用
    print!("{first} {}", name.1);
}

fn get_first_name(name: &(String, String)) -> &String {
    &name.0     // 函数签名只承诺返回 &String，编译器无法推断只借了 .0
}
```

> ℹ️ Rust 的借用检查器在**当前函数作用域内**分析借用粒度；跨函数边界时，保守地认为是**整体借用**。

---

## 错误 6：修改数组中不同的元素

即使修改的是不同元素，数组作为整体来检查借用：

```rust
fn main() {
    let mut a = [0, 1, 2, 3];
    let x = &mut a[1];    // x 持有 a 的可变借用
    *x += 1;

    let y = &a[2];        // ❌ a 已被 x 可变借用，不能再借不可变引用
    *x += *y;             // （即使逻辑上 x 和 y 指向不同位置）
    print!("{a:?}");
}
```

**根因**：Rust 借用检查器以**整个变量**为粒度，`&mut a[1]` 借用了整个 `a` 的 W 权限，无法再从中借出 `&a[2]`。

### 修复：拆分借用

如果确实需要同时操作不同部分，可以在借用前进行拆分：

```rust
fn main() {
    let mut a = [0, 1, 2, 3];
    let (left, right) = a.split_at_mut(2);
    let x = &mut left[1];     // x 借用 left 部分
    *x += 1;

    let y = &right[0];        // ✅ y 借用 right 部分，互不冲突
    *x += *y;
    print!("{a:?}");
}
```

`split_at_mut` 将数组在编译时安全的拆分为两个互斥的可变切片，各自独立借用。

---

## 总结

| 错误类型 | 根因 | 首选修复 |
|----------|------|----------|
| 悬垂引用 | 返回局部变量的引用 | 转移所有权（返回 `String` 而非 `&String`） |
| 权限不足 | `&T` 不能修改数据 | 加 `mut` → `&mut T`，或在副本上操作 |
| 别名 + 可变 | `&T` 和 `&mut T` 同时存在 | 存 Copy 值而非引用、`clone` 解耦 |
| 拿走集合元素 | 解引用非 Copy 类型是移动 | `clone()` |
| 元组整体借用 | 跨函数边界时保守分析 | 尽量在调用方直接访问字段 |
| 数组不同元素 | 借用检查以整个变量为粒度 | `split_at_mut` 拆分借用 |
