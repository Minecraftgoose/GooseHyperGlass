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

## 基于

本项目是对以下上游项目的二开：

| 项目 | 仓库 | 技术栈 |
|------|------|--------|
| 原项目 | [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass) | Android, Kotlin |
| WebGL 移植版 | [martin65536/liquid-glass-webgl](https://github.com/martin65536/liquid-glass-webgl) | Next.js, WebGL |
| AI 辅助开发 | WorkBuddy · DeepSeekv4-pro · DeepSeekv4-flash · Hunyuan3 | 代码生成、文档、调试 |

GooseHyperGlassCDN2.0 在其基础上做了：
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
├── liquid-glass/src/components/liquid-glass/
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

## 关于某"耻辱柱"的回应

martin65536 在其 README 中设置了"耻辱柱"章节，列出了以下指控。由于本项目的渲染引擎代码源自 martin65536/liquid-glass-webgl，这些指控的逻辑值得玩味。

### "系统性抹除署名"

他在 Issue 里说我"在宣传文案中把上游作者抹除"。

看看我们现在的官网底部——**martin65536/liquid-glass-webgl** 几个大字 28px 加粗橙色爆闪彩虹动画，比他自己的 README 标题还大。文档页底部也有。GitHub README 表格专门一行写 WebGL 移植版，链接直达他仓库。

他说我"抹除"他——除非他瞎了，否则怎么可能看不见？

### "强制降分辨率且不可调"

我们的代码来自你的仓库。你说我有这个问题——那你的原版也有这个问题。我们加了 dpr 属性让用户可调，你的版本让用户去设置页手动调。同一件事，两套说法。

### "滥用 blur 滤镜"

Blur 参数直接对应 Kyant 原版 Android 项目的玻璃模糊参数。如果你认为这是"滥用"，那你从 Kyant 移植的时候就已经"滥用"了。

### "未处理浏览器默认点击行为"

这个我承认早期版本确实没处理，后来已经修复（加了几行 CSS tap-highlight）。martin65536 的仓库初期连 README 和 LICENSE 都没有——半斤八两。

### "对话框布局异常"

早期版本的 bug，已修复。你的版本早期 bug 也不少——你的 README 自己写了"如果感觉画面卡顿，可到主页底部设置入口，适当降低 DPR"。

### "渲染锯齿严重"

WebGL 标准由 GPU 驱动控制 MSAA。这不是"缺失"，这是标准行为。

### "连 G2 连续曲率圆角都未能正确实现"

G2 continuous curvature 是公开数学方案，不是 martin65536 的独占技术。而且——你的代码里 G2 曲率实现是从 Kyant 的 Kotlin 源码移植的，我的代码是从你的仓库拉的。如果你能写对，我自然也能写对。如果我写错了，那说明你的原版也有问题——因为你代码里那一套就是从我拉的版本里来的。你总不能一边说"你的代码和我高度一致"，一边又说"你这里写错了但我那里是对的"吧？

### "开源了又不让用"

你的仓库用的是 **Apache-2.0 许可证**。Apache-2.0 明确允许"复制、修改、分发"——这是开源许可证的基本功能。你选了 Apache-2.0，就意味着你同意了别人可以用你的代码。

现在我用了，你跑来骂我"抄袭"。那我问你：**你开源干屁的？**

如果你不想让别人用你的代码，可以选择 All Rights Reserved，或者加 Commons Clause。你选了 Apache-2.0 又指责别人"抄袭"，这叫既当又立。整个开源社区没有这么玩的。

### 总结

martin65536 列出的所有技术问题，要么是无关紧要的细节（已修复），要么是他的原版同样存在的问题。他用 AI 生成的项目嘲笑别人代码质量，自己在 README 设专栏攻击另一个开源项目——这才是真正该被钉在耻辱柱上的行为。

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

## Based On

This project is built on the following upstream:

| Project | Repository | Tech Stack |
|---------|------------|------------|
| Original | [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass) | Android, Kotlin |
| WebGL Port | [martin65536/liquid-glass-webgl](https://github.com/martin65536/liquid-glass-webgl) | Next.js, WebGL |
| AI Assistance | WorkBuddy · DeepSeekv4-pro · DeepSeekv4-flash · Hunyuan3 | Code gen, docs, debugging |

GooseHyperGlassCDN2.0 wraps it with:
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
├── liquid-glass/src/components/liquid-glass/
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
