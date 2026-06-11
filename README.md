# hantaikeju 的技术博客

基于 Hugo + PaperMod 构建的个人技术博客。

## 本地开发

```bash
# 启动开发服务器（带热重载）
hugo server

# 或指定端口
hugo server -p 1313
```

## 构建

```bash
# 构建静态文件（输出到 public/ 目录）
hugo --gc --minify
```

## 文章管理

### 创建新文章

```bash
# 创建分类下的文章（按实际分类目录创建）
hugo new content/unity/graphics/my-shader-post.md
hugo new content/csharp/my-csharp-post.md
```

### 创建新分类

在 `content/` 下创建目录，并在目录中创建 `_index.md` 文件：

```markdown
---
title: "分类名称"
description: "分类描述"
---
```

### 文章 Front Matter 示例

```markdown
---
title: "文章标题"
description: "文章描述"
date: 2026-01-01T00:00:00+08:00
tags: ["标签1", "标签2"]
categories: ["分类名"]
draft: false    # true=草稿(不发布), false=正式发布
---
```

## 图片使用

### 方式一：放在 static/images/ 目录（推荐）

将图片放入 `static/images/` 目录，文章中引用：

```markdown
![图片描述](/images/my-image.png)
```

### 方式二：放在文章同目录

在文章所在目录创建 `images` 子文件夹，文章中引用：

```markdown
![图片描述](images/my-image.png)
```

## 自定义配置

- `hugo.toml` — 站点配置
- `layouts/` — 自定义模板
- `assets/css/extended/` — 自定义样式
- `static/` — 静态资源

## 部署

推送到 GitHub 仓库后，GitHub Pages 会自动部署。
