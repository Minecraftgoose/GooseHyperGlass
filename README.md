# GooseHyperGlassCDN 2.0

<p align="center">
  <a href="#中文">🇨🇳 中文</a> &nbsp;|&nbsp;
  <a href="#english">🇬🇧 English</a>
</p>

<p align="center">
  <a href="https://github.com/Minecraftgoose/GooseHyperGlass/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache License 2.0">
  <a href="https://glass.goose.cc.cd/liquid-glass.js"><img src="https://img.shields.io/badge/CDN-online-brightgreen.svg" alt="CDN"></a>
  <img src="https://img.shields.io/badge/tech-WebGL%201.0-orange.svg" alt="WebGL">
  <img src="https://img.shields.io/badge/zero-deps-9cf.svg" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/source-582KB%20TypeScript-yellow.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/7-components-ff69b4.svg" alt="Components">
  <img src="https://img.shields.io/github/stars/Minecraftgoose/GooseHyperGlass?style=social" alt="Stars">
  <img src="https://img.shields.io/github/last-commit/Minecraftgoose/GooseHyperGlass?label=updated" alt="Last Commit">
</p>

---

# 中文

纯 WebGL 渲染的液态玻璃 UI 组件库。一个 `<script>` 标签即用，零运行时依赖。

— Minecraft_goose 开发 —

## 基于

本项目是对以下两个上游项目的二开：

| 项目 | 仓库 | 技术栈 |
|------|------|--------|
| 原项目 | [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass) | Android, Kotlin |

GooseHyperGlassCDN2.0 基于 wong2 提供的 WebGL 渲染器封装，在其基础上做了：
- Web 端打包成零依赖的 IIFE bundle（esbuild）
- 抽出 React 依赖为空桩，纯 Custom Element 实现
- 提供 CDN 部署和静态文档站
- 加上全中文界面和试玩示例

## 线上地址

- CDN：`https://glass.goose.cc.cd/liquid-glass.js`
- 试玩：`https://glass.goose.cc.cd/`
- 文档：`https://glass.goose.cc.cd/doc/`

## 快速开始

```html
<script src="https://glass.goose.cc.cd/liquid-glass.js"></script>
<liquid-glass mode="single-toggle" style="width:380px;height:200px"></liquid-glass>
```

完整接入文档见 [线上文档页](https://glass.goose.cc.cd/doc/)。

## 组件

| 组件 | mode | 说明 |
|------|------|------|
| 开关 Toggle | `single-toggle` / `toggle-card` / `toggle` | 透明版 / 白卡版 / 双份 |
| 滑块 Slider | `single-slider` / `slider-card` / `slider` | 透明版 / 白卡版 / 双份 |
| 底部标签栏 Bottom Tabs | `single-bottom-tabs` / `bottom-tabs-2` / `bottom-tabs` | 3tab / 4tab / 双排 |
| 按钮组 Buttons | `buttons` | 按钮列表，自定义文字和样式 |
| 弹窗 Dialog | `dialog` | 标题 + 正文 + 取消/确定 |
| 滚动容器 Scroll | `scroll-container` | 玻璃卡片列表 |

## JS API

组件内容通过 JS API 设置（避免 attribute 解析的时序坑）：

```js
var el = document.querySelector('liquid-glass');

// 底部标签栏 Bottom tabs
el.setTabs([[
  { icon:'M10 20v-6h4v6...', label:'首页 Home', viewport:24 },
  { icon:'M15.5 14h-.79...',  label:'发现 Discover', viewport:24 },
  { icon:'M12 21.35l-...',    label:'收藏 Favorite', viewport:24 }
]]);

// 按钮组 Buttons
el.setButtons([
  { id:'t', label:'透明 Transparent', style:'transparent' },
  { id:'s', label:'表面 Surface', style:'surface' }
]);

// 弹窗 Dialog
el.setDialog({
  title:'提示 Notice', body:'通知内容', cancelText:'取消 Cancel', okayText:'确定 OK'
});

// 滚动容器 Scroll container
el.setScroll([{ title:'标题 Title', subtitle:'副标题 Subtitle' }]);
```

## 项目结构

```
├── build.mjs              # esbuild 构建脚本 / esbuild build script
├── src-bundle/
│   ├── liquid-glass.ts    # Web Component 自定义元素 / Custom Element
│   └── empty-react.ts     # React 别名为空桩 / React alias stub
├── liquid-glass-webgl-main/src/components/liquid-glass/
│   ├── renderer/          # WebGL 渲染器 / WebGL renderer
│   ├── catalog/           # 各组件 builder / Component builders
│   ├── shaders/           # GLSL 着色器 / GLSL shaders
│   ├── shapes/            # 玻璃形状 / Glass shapes
│   ├── context.tsx        # 手势交互系统 / Gesture interaction system
│   └── catalog.tsx        # 组件路由 / Component router
└── README.md
```

> CDN 部署在 [glass.goose.cc.cd](https://glass.goose.cc.cd)，包含构建产物、试玩页和文档。

## 构建

```bash
npm install esbuild
node build.mjs
```

输出 `liquid-glass.js`（~345KB，gzip ~95KB）。部署到 CDN 时将产物放入对应目录即可。

## 技术栈

- WebGL 1.0（Canvas 渲染器 / Canvas renderer）
- Custom Elements v1（`<liquid-glass>` 标签 / `<liquid-glass>` tag）
- TypeScript → esbuild IIFE bundle
- 零 React（构建时 alias 为空桩 / React aliased to empty stub at build time）
- 无任何运行时依赖 / Zero runtime dependencies

## 浏览器支持

Chrome 80+ / Edge 80+ / Safari 14+ / Firefox 80+
（需要 WebGL 1.0 + Custom Elements v1 + ES2020）
(Requires WebGL 1.0 + Custom Elements v1 + ES2020)

## License

Apache License 2.0

---

<p align="center">
  <a href="https://github.com/Minecraftgoose/GooseHyperGlass/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache License 2.0">
  <a href="https://glass.goose.cc.cd/liquid-glass.js"><img src="https://img.shields.io/badge/CDN-online-brightgreen.svg" alt="CDN"></a>
  <img src="https://img.shields.io/badge/tech-WebGL%201.0-orange.svg" alt="WebGL">
  <img src="https://img.shields.io/badge/zero-deps-9cf.svg" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/source-582KB%20TypeScript-yellow.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/7-components-ff69b4.svg" alt="Components">
  <img src="https://img.shields.io/github/stars/Minecraftgoose/GooseHyperGlass?style=social" alt="Stars">
  <img src="https://img.shields.io/github/last-commit/Minecraftgoose/GooseHyperGlass?label=updated" alt="Last Commit">
</p>

# English

A pure WebGL liquid glass UI component library. Drop in one `<script>` tag, zero runtime dependencies.

— Developed by Minecraft_goose —

## Based On

This project is a fork/extension of two upstream projects:

| Project | Repository | Tech Stack |
|---------|------------|------------|
| Original | [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass) | Android, Kotlin |

GooseHyperGlassCDN2.0 wraps the wong2 WebGL renderer with:
- Zero-dependency IIFE bundle for the web (esbuild)
- React extracted as an empty stub — pure Custom Element implementation
- CDN deployment with a static documentation site
- Full Chinese UI and interactive demos

## Live URLs

- CDN: `https://glass.goose.cc.cd/liquid-glass.js`
- Playground: `https://glass.goose.cc.cd/`
- Docs: `https://glass.goose.cc.cd/doc/`

## Quick Start

```html
<script src="https://glass.goose.cc.cd/liquid-glass.js"></script>
<liquid-glass mode="single-toggle" style="width:380px;height:200px"></liquid-glass>
```

Full integration docs: [online documentation](https://glass.goose.cc.cd/doc/).

## Components

| Component | mode | Description |
|-----------|------|-------------|
| Toggle | `single-toggle` / `toggle-card` / `toggle` | transparent / white-card / dual |
| Slider | `single-slider` / `slider-card` / `slider` | transparent / white-card / dual |
| Bottom Tabs | `single-bottom-tabs` / `bottom-tabs-2` / `bottom-tabs` | 3-tab / 4-tab / stacked |
| Buttons | `buttons` | button list with custom text & styles |
| Dialog | `dialog` | title + body + cancel/confirm |
| Scroll Container | `scroll-container` | glass card list |

## JS API

Component content is set via the JS API (avoids attribute-parsing timing issues):

```js
var el = document.querySelector('liquid-glass');

// Bottom tabs
el.setTabs([[
  { icon:'M10 20v-6h4v6...', label:'Home', viewport:24 },
  { icon:'M15.5 14h-.79...',  label:'Discover', viewport:24 },
  { icon:'M12 21.35l-...',    label:'Favorite', viewport:24 }
]]);

// Buttons
el.setButtons([
  { id:'t', label:'Transparent', style:'transparent' },
  { id:'s', label:'Surface', style:'surface' }
]);

// Dialog
el.setDialog({
  title:'Notice', body:'Notification content', cancelText:'Cancel', okayText:'OK'
});

// Scroll container
el.setScroll([{ title:'Title', subtitle:'Subtitle' }]);
```

## Project Structure

```
├── build.mjs              # esbuild build script
├── src-bundle/
│   ├── liquid-glass.ts    # Web Component custom element
│   └── empty-react.ts     # React alias stub
├── liquid-glass-webgl-main/src/components/liquid-glass/
│   ├── renderer/          # WebGL renderer
│   ├── catalog/           # Component builders
│   ├── shaders/           # GLSL shaders
│   ├── shapes/            # Glass shapes
│   ├── context.tsx        # Gesture interaction system
│   └── catalog.tsx        # Component router
└── README.md
```

> CDN hosted at [glass.goose.cc.cd](https://glass.goose.cc.cd) with build artifacts, playground, and docs.

## Build

```bash
npm install esbuild
node build.mjs
```

Outputs `liquid-glass.js` (~345KB, ~95KB gzipped). Drop the artifact into your CDN directory.

## Tech Stack

- WebGL 1.0 (Canvas renderer)
- Custom Elements v1 (`<liquid-glass>` tag)
- TypeScript → esbuild IIFE bundle
- Zero React (aliased to empty stub at build time)
- Zero runtime dependencies

## Browser Support

Chrome 80+ / Edge 80+ / Safari 14+ / Firefox 80+
(Requires WebGL 1.0 + Custom Elements v1 + ES2020)

## License

Apache License 2.0
