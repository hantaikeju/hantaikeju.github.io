---
title: "Unity 入门指南"
date: 2026-06-10T21:00:00+08:00
draft: false
tags: ["Unity", "游戏开发", "入门"]
categories: ["unity"]
---

## 什么是 Unity？

Unity 是一款跨平台的游戏引擎，广泛应用于游戏开发、VR/AR、影视动画等领域。

## 安装与配置

1. 下载 Unity Hub
2. 安装 Unity Editor
3. 创建第一个项目

## 基础概念

- **场景 (Scene)**：游戏世界的容器
- **游戏对象 (GameObject)**：场景中的每个实体
- **组件 (Component)**：附加在游戏对象上的功能模块
- **脚本 (Script)**：控制游戏逻辑的代码

## 第一个脚本

```csharp
using UnityEngine;

public class HelloWorld : MonoBehaviour
{
    void Start()
    {
        Debug.Log("Hello, Unity!");
    }
}
```

## 总结

Unity 的学习曲线相对平缓，适合初学者入门游戏开发。
