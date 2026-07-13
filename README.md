# [**codex-deepseek-pet**](https://github.com/YunYueSama/codex-deepseek-pet)

一只会在桌面陪你工作的蓝发鲸鱼女仆宠物。她能读取系统级鼠标位置，在鼠标位于其他应用窗口时依然持续注视，并根据方向平滑移动眼神。

![codex-deepseek-pet 核心灵感来源](assets/你这吃白饭的蓝色大肥鱼.png)

这张“我不是大肥鱼……”插画是项目的核心灵感来源；桌宠的角色形象、对白语气和鲸鱼主题均由此延伸。

## 运行效果

![codex-deepseek-pet 运行预览](docs/preview.png)

### 全方向鼠标注视

宠物使用系统级鼠标坐标，即使鼠标位于其他应用窗口，也会继续平滑看向对应方向。

| 看向左上 | 看向右下 |
| :---: | :---: |
| <img src="docs/gaze-north-west.png" alt="宠物看向左上" width="300"> | <img src="docs/gaze-south-east.png" alt="宠物看向右下" width="300"> |

### 动作与表情设计

全部运行时姿势都使用透明背景，并保持蓝色渐变长发、鲸鱼尾巴、深蓝白色女仆装、金色裙摆装饰和围裙鲸鱼图案一致。

| 待机 | 思考 | 开心 | 害羞 |
| :---: | :---: | :---: | :---: |
| <img src="assets/pet/idle.png" alt="待机动作" width="150"> | <img src="assets/pet/curious.png" alt="思考动作" width="150"> | <img src="assets/pet/happy.png" alt="开心动作" width="150"> | <img src="assets/pet/shy.png" alt="害羞动作" width="150"> |
| **兴奋** | **挥手** | **惊讶** | **审阅** |
| <img src="assets/pet/excited.png" alt="兴奋动作" width="150"> | <img src="assets/pet/wave.png" alt="挥手动作" width="150"> | <img src="assets/pet/surprised.png" alt="惊讶动作" width="150"> | <img src="assets/pet/review.png" alt="审阅动作" width="150"> |
| **跳跃** | **睡眠** | **向左跑** | **向右跑** |
| <img src="assets/pet/jump.png" alt="跳跃动作" width="150"> | <img src="assets/pet/sleepy.png" alt="睡眠动作" width="150"> | <img src="assets/pet/run-left.png" alt="向左跑动作" width="150"> | <img src="assets/pet/run-right.png" alt="向右跑动作" width="150"> |

## 功能

- 全方向鼠标注视：中心、上、右上、右、右下、下、左下、左、左上九个稳定区域。
- 丰富动作：呼吸、眨眼、歪头、害羞、开心、兴奋、挥手、惊讶、审阅、蹦跳、午睡、拖拽挣扎和随机对白。
- 自动散步：在当前显示器工作区左右行走，自动切换左右跑步姿势。
- 桌面交互：单击回应、双击庆祝、拖拽移动、右键打开菜单。
- 系统托盘：自动散步、始终置顶、鼠标穿透、开机启动、尺寸和位置控制。
- 多显示器：支持负坐标显示器，并在显示器插拔或分辨率变化后保留可见区域。
- 统一高清动作素材：12 个动作入口均达到当前窗口的原生显示尺寸；开心与兴奋使用同批清晰笑脸姿势并由不同动画区分，害羞和审阅取自同一套高清动作源。
- 本地运行：无联网请求、无遥测；鼠标坐标只用于本机动画，不会保存或上传。

## 直接运行

本项目是完全本地运行的 Electron 桌宠，不调用 OpenAI API；运行、测试和安装均不需要 `OPENAI_API_KEY`。`.env` 已被 Git 忽略，不要把任何密钥提交到仓库。

需要 Node.js 20 或更高版本。

```powershell
npm ci
npm start
```

> 直接用普通浏览器打开 `src/renderer/index.html` 时只会进入静态预览模式：动态瞳孔层会自动隐藏，系统级鼠标注视、桌面拖拽、托盘和窗口控制不会启用。请使用 `npm start` 体验完整桌宠功能。

如果 Electron 官方下载源较慢，可临时使用镜像安装二进制：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
node .\node_modules\electron\install.js
npm start
```

## 操作

| 操作 | 效果 |
| --- | --- |
| 移动鼠标 | 眼睛平滑看向鼠标所在方向 |
| 单击宠物 | 随机回应和表情动作 |
| 双击宠物 | 触发开心蹦跳 |
| 按住拖动 | 移动到任意屏幕位置 |
| 右键宠物 | 打开完整控制菜单 |
| `Ctrl+Alt+P` | 开关鼠标穿透；穿透时仍可从托盘恢复 |
| 单击托盘图标 | 显示或隐藏宠物 |

设置会保存在 Electron 的用户数据目录中，重新启动后仍然有效。

## 导入 ChatGPT / Codex 自定义宠物

> 以下步骤已按 Windows 版 Codex `26.707.8168.0` 的实际界面核对。部分版本仍会显示 ChatGPT 名称；升级后入口文字可能略有变化。

### 先理解两种格式

本项目根目录运行的是独立 Electron 桌宠。`assets/pet/*.png` 是它的动作图，**不能直接复制到自定义宠物目录**。Codex 自定义宠物使用 v2 精灵表，每只宠物至少需要：

```text
%USERPROFILE%\.codex\pets\codex-deepseek-pet\
├─ pet.json
└─ spritesheet.webp
```

其中 `spritesheet.webp` 必须是 `1536x2288` 的 8 列 11 行精灵表，单格为 `192x208`；前 9 行是标准动作，最后 2 行是 16 个顺时针注视方向。`pet.json` 必须声明 `spriteVersionNumber: 2`。

本仓库已经提供通过完整检查的可导入包：[codex-deepseek-pet](codex-deepseek-pet)。它包含全部 9 行标准动作和 16 个顺时针注视方向。

### 1. 直接导入仓库中的宠物包

在仓库根目录运行：

```powershell
$source = Join-Path $PWD "codex-deepseek-pet"
$target = Join-Path $env:USERPROFILE ".codex\pets\codex-deepseek-pet"

New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item (Join-Path $source "pet.json") $target -Force
Copy-Item (Join-Path $source "spritesheet.webp") $target -Force
```

### 2. 重新生成 v2 宠物包

在 Codex 中打开本仓库，然后发送下面这段任务。内置 `hatch-pet` 技能会以本项目角色图为参考，生成动作、执行透明边缘和方向检查，并把通过检查的文件安装到自定义宠物目录：

```text
使用 hatch-pet 技能，将本仓库 assets/pet 下的角色素材制作成名为“蓝色大肥鱼”的 Codex v2 自定义宠物。
保持蓝发、鲸鱼尾巴、深蓝白色女仆装和围裙鲸鱼图案一致；动作清晰、完整且不裁切。
必须包含全部 9 行标准动作和 16 个顺时针注视方向，完成视觉检查后安装到 ~/.codex/pets/codex-deepseek-pet。
```

生成完成后，目标目录中的清单应类似：

```json
{
  "id": "codex-deepseek-pet",
  "displayName": "蓝色大肥鱼",
  "description": "我不是吃白饭的大肥鱼！",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

### 3. 手动复制其他位置的宠物包

如果你已经拿到了通过检查的 `pet.json` 和 `spritesheet.webp`，可以用 PowerShell 复制：

```powershell
$source = "D:\path\to\codex-deepseek-pet-package"
$target = Join-Path $env:USERPROFILE ".codex\pets\codex-deepseek-pet"

New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item (Join-Path $source "pet.json") $target -Force
Copy-Item (Join-Path $source "spritesheet.webp") $target -Force
```

请把 `$source` 改成实际宠物包目录。不要把 `.env`、密钥或其他私人文件复制进去。

### 4. 在设置中选择

1. 打开 ChatGPT / Codex 桌面版设置。
2. 进入“个性化”或“宠物”页面。
3. 在“自定义宠物”区域点击“打开文件夹”，确认目录为 `%USERPROFILE%\.codex\pets`。
4. 返回设置页，点击刷新按钮。
5. 找到“蓝色大肥鱼”，点击“选择”；没有立即出现时，完全退出并重新启动桌面版。

### 常见问题

- 找不到宠物：确认目录层级是 `pets\codex-deepseek-pet\pet.json`，不要多套一层压缩包目录。
- 显示加载失败：检查 JSON 语法、`spritesheetPath` 文件名和 `spriteVersionNumber: 2`。
- 只有单张 PNG：这不是可导入包，需要先按第 1 步生成 v2 精灵表。
- 注视方向错误：v2 的 `000` 代表向上，不是正面；应重新运行方向检查，不能只改清单。
- 仍然没有刷新按钮：重启桌面版后再次进入宠物设置。

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
docs/                运行预览
src/main/            窗口、托盘、全局鼠标和散步逻辑
src/renderer/        桌宠画面、眼神与动作状态机
src/preload.cjs      安全 IPC 桥接
tests/               Node.js 自动化测试
task_plan.md         中文任务计划
findings.md          中文调研记录
progress.md          中文进度记录
```

## 许可

程序代码使用 [MIT License](LICENSE)。角色图片不包含在 MIT 授权范围内，详见 [图片素材说明](ASSET_LICENSE.md)。
