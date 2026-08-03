---
title: "Rust 并发：共享状态的并发（Mutex & Arc）"
date: 2026-08-03T11:37:00+08:00
weight: 40
draft: false
tags: ["Rust", "并发", "多线程", "标准库"]
categories: ["rust"]
description: "掌握 Rust 共享状态并发编程：Mutex 互斥锁的使用规则、Arc 原子引用计数实现多线程共享所有权，以及与 RefCell/Rc 的对比。"
---

## 概述

除了消息传递（Channel），另一种并发方式是让多个线程访问**相同的共享数据**。

> 消息传递类似于**单一所有权**——值从一个线程转移到另一个。
>
> 共享内存并发就像**多重所有权**——多个线程可以同时访问相同的内存位置。

---

## Mutex 互斥锁

**Mutex**：Mutual Exclusion（互斥）。

互斥锁在**任何给定时间只允许一个线程访问某些数据**。

工作方式：

1. 线程要访问数据，必须先**获取（lock）**互斥锁
2. **锁（lock）**是一种数据结构，用于跟踪谁当前拥有对数据的独占访问权
3. 使用完数据后，必须**解锁**，以便其他线程可以获取锁

> 互斥锁被描述为通过"锁定系统"来**保护**它所持有的数据。

---

## Mutex 两条规则

1. 在使用数据之前，**必须尝试获取锁**
2. 使用互斥锁保护的数据后，**必须解锁数据**，以便其他线程可以获取锁

### 基本用法

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap();
        *num = 6;
        // 走出作用域时，自动释放锁
    }

    println!("m = {:?}", m);  // m = Mutex { data: 6, .. }
}
```

- `m.lock()` 返回一个 `MutexGuard<T>`（智能指针），它实现了 `Deref` 和 `DerefMut`
- 当 `MutexGuard` 离开作用域时，**自动释放锁**（无需手动 unlock）
- 如果另一个线程持有锁并 panic，`lock()` 会返回 `Err`，这里用 `unwrap()` 让当前线程也 panic

---

## 所有权问题：多线程共享 Mutex

如果直接用 `Mutex<T>` 在多个线程间共享：

```rust
use std::sync::Mutex;
use std::thread;

fn main() {
    let counter = Mutex::new(0);

    let mut handles = vec![];

    for _ in 0..10 {
        let handle = thread::spawn(move || {  // ❌ 编译错误
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

编译错误：第一个线程通过 `move` 取得了 `counter` 的所有权，后续线程无法再使用。

---

## 尝试用 Rc 修复（失败）

```rust
use std::sync::Mutex;
use std::thread;
use std::rc::Rc;

fn main() {
    let counter = Rc::new(Mutex::new(0));

    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Rc::clone(&counter);
        let handle = thread::spawn(move || {  // ❌ 编译错误
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }
    // ...
}
```

编译错误：**`Rc<T>` 无法在线程间安全传递**——它的引用计数操作不是原子性的，跨线程使用可能导致数据竞争。

---

## Arc\<T\> 进行原子引用计数

**`Arc<T>`** 是一种类似于 `Rc<T>` 的类型，可以安全地在并发环境中使用。

- **A** 代表 **Atomic**（原子性）——使用 `std::sync::atomic` 进行原子引用计数
- 线程安全会带来**性能损失**，所以只在需要时使用，不必在所有操作都保证原子性

### 正确方式：Arc + Mutex

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));

    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());  // Result: 10
}
```

执行流程：

1. `Arc::new(Mutex::new(0))` 创建原子引用计数的互斥锁
2. 每次循环用 `Arc::clone` 克隆一份引用（增加引用计数）
3. 每个线程拿到自己的 `Arc` 引用，通过 `lock()` 获取互斥访问权
4. 所有线程结束后，结果正确为 10

---

## RefCell/Rc 与 Mutex/Arc 的对比

| 特性 | `RefCell<T>` + `Rc<T>` | `Mutex<T>` + `Arc<T>` |
|------|------------------------|------------------------|
| **使用场景** | 单线程内部可变性 | 多线程内部可变性 |
| **引用计数** | 非原子（`Rc`） | 原子（`Arc`） |
| **运行时检查** | `borrow()` / `borrow_mut()` | `lock()` |
| **死锁风险** | `borrow_mut` 重复调用会 panic | 多个锁交叉等待可导致死锁 |

> `Mutex<T>` 提供了**内部可变性**，就像 `Cell` 家族一样——正如 `RefCell<T>` 允许我们修改 `Rc<T>` 内部的内容，`Mutex<T>` 允许我们修改 `Arc<T>` 内部的内容。

---

## 注意事项

使用 `Mutex<T>` 时，Rust **不能保护所有类型的逻辑错误**：

- `Mutex<T>` 也有创建**死锁**的风险——比如两个线程各自持有一个锁并等待对方的锁
- 这是 Rust 无法在编译时防止的运行时问题，需要开发者自己注意锁的获取顺序

---

## 小结

| 概念 | 说明 |
|------|------|
| `Mutex<T>` | 互斥锁，同一时刻只允许一个线程访问数据 |
| `lock()` | 获取锁，返回 `MutexGuard`，离开作用域自动释放 |
| `Arc<T>` | 原子引用计数，多线程版 `Rc<T>` |
| `Arc::clone` | 克隆引用，增加原子引用计数 |
| 死锁 | 运行时风险，需开发者注意锁顺序 |

消息传递（Channel）和共享状态（Mutex + Arc）是 Rust 并发编程的两大支柱，根据场景选择合适的工具即可。
