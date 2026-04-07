# 3D象棋游戏

一个基于Web的3D中国象棋游戏，使用Three.js构建，提供沉浸式的3D对战体验。

## 特性

- 🎮 完整的中国象棋规则实现
- 🎨 中等复杂度3D视觉效果
- 🖱️ 鼠标拖拽旋转视角
- 🔄 实时在线对战（计划中）
- 🎯 3D融合UI设计
- 📱 移动设备支持（触屏操作）

## 技术栈

- **3D引擎**: Three.js
- **构建工具**: Webpack
- **开发语言**: JavaScript (ES6+)
- **网络通信**: Socket.IO (计划中)
- **状态管理**: 自定义状态机

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看游戏

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

## 项目结构

```
src/
├── index.js              # 入口文件
├── scenes/               # 3D场景
│   └── GameScene.js     # 游戏场景
├── chess/               # 象棋相关
│   ├── ChessBoard.js    # 棋盘
│   └── ChessPieces.js   # 棋子
├── utils/               # 工具类
│   └── CameraController.js # 相机控制
└── ui/                  # UI界面
    └── GameUI.js        # 游戏UI

public/
├── index.html           # HTML模板
├── css/                 # 样式文件
└── js/                  # 静态JS
```

## 开发计划

### 第一阶段：核心基础 ✅

- 项目初始化
- 3D渲染基础
- 棋盘和棋子
- 象棋规则引擎
- 本地对战
- 基础UI

### 第二阶段：在线系统

- 用户系统
- 在线匹配
- 实时对战
- 主题系统
- 回放系统

### 第三阶段：优化完善

- 性能优化
- 兼容性测试
- 用户体验优化
- 安全与稳定性

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License