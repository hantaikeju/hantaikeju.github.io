---
title: "Unity 脚本编程基础"
date: 2026-06-10T21:05:00+08:00
draft: false
tags: ["Unity", "C#", "脚本"]
categories: ["unity"]
---

## MonoBehaviour 生命周期

Unity 脚本继承自 MonoBehaviour，拥有完整的生命周期方法：

```csharp
public class Example : MonoBehaviour
{
    void Awake() { }    // 场景加载时调用
    void Start() { }    // 第一帧之前调用
    void Update() { }   // 每帧调用
    void FixedUpdate() { } // 固定时间间隔调用
    void LateUpdate() { }  // Update 之后调用
}
```

## 常用组件操作

```csharp
// 获取组件
var rigidbody = GetComponent<Rigidbody>();
var renderer = GetComponentInChildren<Renderer>();

// 添加组件
gameObject.AddComponent<Rigidbody>();
```
