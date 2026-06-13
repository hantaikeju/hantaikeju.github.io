---
title: "VSCode 配置 Copilot + OAI + DeepSeek"
date: 2026-06-13T18:23:00+08:00
draft: false
tags: ["VSCode", "Copilot", "DeepSeek", "AI", "开发环境"]
categories: ["dev-env"]
description: "在 VSCode 中配置 GitHub Copilot 搭配 OAI 扩展，接入 DeepSeek 模型作为自定义 AI 供应商。"
---

## 概述

通过 **OAI (Open AI Compatible)** 扩展，可以在 VSCode 中将 DeepSeek 等第三方模型接入 Copilot，享受更灵活的 AI 辅助编程体验。

---

## 第一步：安装扩展

### 安装 Copilot

在 VSCode 扩展市场搜索 **Copilot**，安装并完成 GitHub 登录授权。

### 安装 OAI

在 VSCode 扩展市场搜索 **OAI**，直接安装。如果提示 VSCode 版本不符合，先更新 VSCode 到最新版本即可。

---

## 第二步：配置 Provider Management

1. 打开 OAI 配置面板（`Ctrl+Shift+P` → 搜索 `OAI Configuration`）
2. 点击 **Add Provider**，填写以下信息：

| 参数 | 值 |
|------|-----|
| Provider ID | 自行命名（如 `deepseek`） |
| URL | `https://api.deepseek.com` |
| API Key | 在 [DeepSeek 官网](https://platform.deepseek.com) → API Keys 中创建 |

3. 填写完成后点击 **Save**。

---

## 第三步：配置 Model Management

在 Provider 创建完成后，添加模型配置：

| 参数 | 值 |
|------|-----|
| Provider | 选择上一步创建的 Provider |
| Model ID | `deepseek-v4-pro` |
| Config ID | `thinking` |
| Context Length | `1000000`（1M） |
| Max Tokens | `10000`（或 Max Completion Tokens 二选一填入） |

点击 **Save Model** 保存。

---

## 第四步：使用

1. 打开 Copilot Chat 面板
2. 在模型选择器中找到 **OAI Compatible**
3. 如果没有看到，点击 Other Models 旁的设置图标，勾选显示即可

配置完成，现在可以在 VSCode 中使用 DeepSeek 模型进行 AI 辅助编程了。

---

## 参考

- [DeepSeek API 文档](https://api-docs.deepseek.com/)
- OAI 扩展：VSCode 扩展市场搜索 "OAI"
