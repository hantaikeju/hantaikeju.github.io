---
title: "C# 基础语法速览"
date: 2026-06-10T21:10:00+08:00
draft: false
tags: ["C#", "编程基础", ".NET"]
categories: ["csharp"]
---

## C# 简介

C# 是微软推出的一种现代、面向对象的编程语言，运行于 .NET 平台之上。

## 基本语法

### 变量与类型

```csharp
int number = 42;
string message = "Hello";
bool isActive = true;
var inferred = "自动推断类型";
```

### 面向对象

```csharp
public class Person
{
    public string Name { get; set; }
    public int Age { get; set; }
    
    public void SayHello()
    {
        Console.WriteLine($"你好，我是 {Name}");
    }
}
```

### 异步编程

```csharp
public async Task<string> FetchDataAsync()
{
    using var client = new HttpClient();
    return await client.GetStringAsync("https://api.example.com/data");
}
```

## 总结

C# 是一门功能强大且不断进化的语言，在游戏开发、企业应用等领域都有广泛应用。
