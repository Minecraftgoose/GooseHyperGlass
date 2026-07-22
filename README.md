# GooseHyperGlassCDN2.0

纯 WebGL 渲染的液态玻璃 UI 组件库。一个 `<script>` 标签即用，零运行时依赖。

— Minecraft_goose 开发 —

## 基于

本项目是对以下两个上游项目的二开：

| 项目 | 仓库 | 技术栈 |
|------|------|--------|
| 原项目 | [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass) | Android, Kotlin |
| Web 移植 | [martin65536/liquid-glass-webgl](https://github.com/martin65536/liquid-glass-webgl) | Next.js + WebGL |

GooseHyperGlassCDN2.0 在移植版基础上做了：
- Web 端打包成零依赖的 IIFE bundle（esbuild）
- 抽出 React 依赖为空桩，纯 Custom Element 实现
- 提供 CDN 部署和静态文档站
- 加上全中文界面和试玩示例

> 遵循原项目 MIT 协议。

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
| 开关 | `single-toggle` / `toggle-card` / `toggle` | 透明版 / 白卡版 / 双份 |
| 滑块 | `single-slider` / `slider-card` / `slider` | 透明版 / 白卡版 / 双份 |
| 底部标签栏 | `single-bottom-tabs` / `bottom-tabs-2` / `bottom-tabs` | 3tab / 4tab / 双排 |
| 按钮组 | `buttons` | 按钮列表，自定义文字和样式 |
| 弹窗 | `dialog` | 标题 + 正文 + 取消/确定 |
| 滚动容器 | `scroll-container` | 玻璃卡片列表 |

## JS API

组件内容通过 JS API 设置（避免 attribute 解析的时序坑）：

```js
var el = document.querySelector('liquid-glass');

// 底部标签栏
el.setTabs([[
  { icon:'M10 20v-6h4v6...', label:'首页', viewport:24 },
  { icon:'M15.5 14h-.79...',  label:'发现', viewport:24 },
  { icon:'M12 21.35l-...',    label:'收藏', viewport:24 }
]]);

// 按钮组
el.setButtons([
  { id:'t', label:'透明', style:'transparent' },
  { id:'s', label:'表面', style:'surface' }
]);

// 弹窗
el.setDialog({
  title:'提示', body:'通知内容', cancelText:'取消', okayText:'确定'
});

// 滚动容器
el.setScroll([{ title:'标题', subtitle:'副标题' }]);
```

## 项目结构

```
├── build.mjs              # esbuild 构建脚本，输出到 ../liquid-glass-cdn-clean/
├── src-bundle/
│   ├── liquid-glass.ts    # Web Component 自定义元素
│   └── empty-react.ts     # React 别名为空桩
├── liquid-glass-webgl-main/src/components/liquid-glass/
│   ├── renderer/          # WebGL 渲染器
│   ├── catalog/           # 各组件 builder
│   ├── shaders/           # GLSL 着色器
│   ├── shapes/            # 玻璃形状
│   ├── context.tsx        # 手势交互系统
│   └── catalog.tsx        # 组件路由
└── README.md
```

> CDN 部署目录在 `../liquid-glass-cdn-clean/`，包含构建产物、试玩页和文档。

## 构建

```bash
npm install esbuild
node build.mjs
```

输出到 `../liquid-glass-cdn-clean/liquid-glass.js`（~345KB，gzip ~95KB）。

## 技术栈

- WebGL 1.0（Canvas 渲染器）
- Custom Elements v1（`<liquid-glass>` 标签）
- TypeScript → esbuild IIFE bundle
- 零 React（构建时 alias 为空桩）
- 无任何运行时依赖

## 浏览器支持

Chrome 80+ / Edge 80+ / Safari 14+ / Firefox 80+
（需要 WebGL 1.0 + Custom Elements v1 + ES2020）

## License

MIT
