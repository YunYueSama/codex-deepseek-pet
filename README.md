# Codex Pet

一只会在桌面陪你工作的DeepSeek拟人宠物。她能读取系统级鼠标位置，在鼠标位于其他应用窗口时依然持续注视，并根据方向平滑转动眼神和身体。

![Codex Pet 运行预览](docs/preview.png)

## 功能

- 全方向鼠标注视：中心、上、右上、右、右下、下、左下、左、左上九个稳定区域。
- 丰富动作：呼吸、眨眼、歪头、害羞、开心、蹦跳、午睡、拖拽挣扎和随机对白。
- 自动散步：在当前显示器工作区左右行走，自动切换左右跑步姿势。
- 桌面交互：单击回应、双击庆祝、拖拽移动、右键打开菜单。
- 系统托盘：自动散步、始终置顶、鼠标穿透、开机启动、尺寸和位置控制。
- 多显示器：支持负坐标显示器，并在显示器插拔或分辨率变化后保留可见区域。
- 本地运行：无联网请求、无遥测；鼠标坐标只用于本机动画，不会保存或上传。

## 直接运行

需要 Node.js 20 或更高版本。

```powershell
npm ci
npm start
```

如果 Electron 官方下载源较慢，可临时使用镜像安装二进制：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
node .\node_modules\electron\install.js
npm start
```

## 操作

| 操作 | 效果 |
| --- | --- |
| 移动鼠标 | 眼睛和身体平滑看向鼠标所在方向 |
| 单击宠物 | 随机回应和表情动作 |
| 双击宠物 | 触发庆祝动作 |
| 按住拖动 | 移动到任意屏幕位置 |
| 右键宠物 | 打开完整控制菜单 |
| `Ctrl+Alt+P` | 开关鼠标穿透；穿透时仍可从托盘恢复 |
| 单击托盘图标 | 显示或隐藏宠物 |

设置会保存在 Electron 的用户数据目录中，重新启动后仍然有效。

## 构建 Windows 安装包

```powershell
npm ci
npm run dist
```

安装包输出到 `artifacts/`。当前构建目标为 Windows x64 NSIS 安装程序，支持选择安装目录并创建桌面快捷方式。

项目未附带商业代码签名证书，因此自行构建的安装包会显示为“未签名”，首次运行时 Windows SmartScreen 可能要求手动确认。发布正式版本时应使用受信任的 Windows 代码签名证书。

如 GitHub 下载较慢，可在打包前设置镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run dist
```

## 开发检查

```powershell
npm run check
npm test
```

方向计算、中心死区、窗口边界和设置校验均有自动化测试。运行时采用 Electron 安全隔离：渲染层不启用 Node.js，只通过受限的 preload API 与主进程通信。

## 项目结构

```text
assets/pet/          透明动作素材
build/               Windows 应用图标
src/main/            窗口、托盘、全局鼠标和散步逻辑
src/renderer/        桌宠画面、眼神与动作状态机
src/preload.cjs      安全 IPC 桥接
tests/               Node.js 自动化测试
```

## 许可

程序代码使用 [MIT License](LICENSE)。角色图片不包含在 MIT 授权范围内，详见 [ASSET_LICENSE.md](ASSET_LICENSE.md)。
