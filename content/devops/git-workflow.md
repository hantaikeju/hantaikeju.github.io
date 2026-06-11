---
title: "Git 工作流最佳实践"
date: 2026-06-10T21:30:00+08:00
draft: false
tags: ["Git", "版本控制", "DevOps"]
categories: ["DevOps"]
---

## 常用的 Git 工作流

### 集中式工作流

适合小团队，所有成员在同一个分支上工作。

### Feature Branch 工作流

每个功能在独立的分支上开发，完成后合并到主分支。

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 开发完成后合并
git checkout main
git merge feature/new-feature
```

### Git Flow 工作流

适用于大型项目，包含多个长期分支：

- `main`：生产分支
- `develop`：开发分支
- `feature/*`：功能分支
- `release/*`：发布分支
- `hotfix/*`：热修复分支

## 提交信息规范

推荐使用 Conventional Commits 规范：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
refactor: 重构代码
```
