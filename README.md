# TLM → Codex Pet

把 Touhou Little Maid 的 Bedrock 女仆模型直接渲染为 Codex v2 桌宠。

这个仓库不是“照着角色重新画一套精灵图”，而是读取原始模型 JSON、原始
贴图 PNG 和骨骼结构，在 Three.js 中逐帧摆姿势，直接导出透明的
`1536×2288` Codex 图集。仓库附带八云紫的动作映射作为可修改示例。

## 适合谁

- 想把自己有权使用的 TLM 模型变成 Codex 桌宠；
- 希望尽量保留原模型比例、贴图和方块风格；
- 不熟悉 Bedrock/Three.js，但可以把仓库交给 Codex 执行；
- 愿意逐个检查方向、动作语义和素材许可证。

## 最快用法：把仓库交给 Codex

Clone 后，在 Codex 中打开仓库并发送：

> 使用内置 hatch-pet skill，读取本仓库 README.md 和 AGENTS.md。我的
> Touhou Little Maid 项目/资源包位于 `/绝对路径`。如果我没有提供本地副本，
> 请从官方仓库 `TartaricAcid/TouhouLittleMaid` 下载到被 Git 忽略的
> `upstream/`，记录仓库 URL、分支和 commit SHA，并先阅读上游
> `LICENSE-MIT` 与 `LICENSE-CC`。请列出官方资源中的普通 Bedrock 女仆
> 模型让我选择，再用本仓库的原生 3D 渲染流程制作并安装 Codex v2 桌宠。
> 不要使用图片生成，也不要自行下载或发布来源不明的第三方模型包；如模型
> 无法表达某个必需状态，先说明缺口并征求我确认。完成所有方向盲测、动作
> QA 和 v2 验证后再安装。

这段提示只授权下载 **Touhou Little Maid 官方仓库**。Codex 应先让你选择
角色；第三方模型包仍需要你提供来源或单独授权。

## 工作原理

```text
TLM model.json + texture.png
          │
          ▼
Bedrock parser → Three.js bone hierarchy
          │
          ▼
11 rows / 88 used cells rendered directly to RGBA canvas
          │
          ▼
hatch-pet validation + direction QA + WebP packaging
          │
          ▼
$CODEX_HOME/pets/<pet-id>/
```

单元格固定为 `192×208`，图集为 8 列 × 11 行：

| Row | Codex 状态 | 帧数 |
| --- | --- | ---: |
| 0 | Idle | 6 + neutral |
| 1 | Running right（拖动向右） | 8 |
| 2 | Running left（拖动向左） | 8 |
| 3 | Waving | 4 |
| 4 | Jumping | 5 |
| 5 | Failed / blocked | 8 |
| 6 | Waiting / needs input | 6 |
| 7 | Running / active task work | 6 |
| 8 | Review | 6 |
| 9 | Look 000 → 157.5 | 8 |
| 10 | Look 180 → 337.5 | 8 |

Look 使用屏幕坐标、顺时针排列：`000=上`、`090=右`、`180=下`、
`270=左`。

## 本仓库与 hatch-pet 的分工

本仓库负责 TLM 特有部分：

- 解析 Bedrock 模型、UV 和层级；
- 还原原始 PNG 贴图；
- 对原生骨骼设置动作；
- 处理 Minecraft/TLM 与 Three.js 的空间朝向；
- 从 WebGL canvas 直接导出透明 PNG。

Codex 内置的 `hatch-pet` skill 负责 Codex 合约：

- v2 尺寸、行列、帧数和透明闲置格；
- 16 个 Look 方向及四个 cardinal 硬门槛；
- 无标签盲测、带标签语义检查、相邻连续性；
- 最终 WebP、`pet.json` 和安装目录。

### 为什么默认不使用图片生成

这里已经有完整 3D 模型与贴图。图片生成会改变脸、配色、道具、像素密度
和不同帧的身份一致性。对于本仓库，Three.js 渲染就是视觉生成层；
`hatch-pet` 应作为验证与打包层使用。

只有当模型缺少必要骨骼、原生模型无法表达必需状态，而且用户明确同意时，
才考虑让 `hatch-pet` 的图片生成流程补图。不要静默混合两种来源。

## 手动流程

### 1. 准备环境

```bash
npm install
```

需要一个可用 WebGL 的真实浏览器。Codex 可以启动本地 Vite 服务并使用
内置浏览器完成渲染。

### 2. 放入模型

如果没有本地上游副本，可先下载官方仓库：

```bash
gh repo clone TartaricAcid/TouhouLittleMaid upstream/TouhouLittleMaid -- --depth 1
# 没有 gh 时也可以：
git clone --depth 1 https://github.com/TartaricAcid/TouhouLittleMaid.git \
  upstream/TouhouLittleMaid
git -C upstream/TouhouLittleMaid rev-parse HEAD
```

`upstream/` 默认被 Git 忽略。请记录实际 commit SHA；不要只写“最新版”，
否则之后难以复现。官方仓库内置模型入口通常可从
`src/main/resources/assets/touhou_little_maid/maid_model.json` 及相邻资源
目录开始查找。仓库结构可能变化，应以所固定提交为准。

将你有权使用的文件放到：

```text
public/input/model.json
public/input/texture.png
```

这两个路径默认被 Git 忽略。

普通 Bedrock 模型通常来自：

```text
assets/<domain>/models/entity/<name>.json
assets/<domain>/textures/entity/<name>.png
```

从 `maid_model.json` 同时记录角色名称、模型 ID、动画列表、作者与许可证。
GeckoLib 模型不是当前转换器的目标格式。

### 3. 调整角色动作

编辑 [src/capture.ts](src/capture.ts)。八云紫示例使用常见女仆骨骼：

```text
head, armLeft, armRight, legLeft, legRight
```

不同模型可能使用不同名称。先检查 JSON 中的 bone names，再修改姿势。

几个容易踩坑的规则：

- row 1/2 的左右表示最终屏幕移动方向，不能只看旋转正负号；
- Look 与移动行必须分别验证；
- 对称武器不能作为 Look 左右判断依据，应看脸、眼睛和后发；
- row 7 的 Running 表示任务正在执行，不是原地跑步；
- 所有动作必须在正常桌宠尺寸可见，数值变化不等于视觉变化；
- 宽道具优先保证不裁切，再决定最大缩放。

### 4. 构建并渲染

```bash
npm run build
npm run dev
```

打开：

```text
http://127.0.0.1:1420/capture.html
```

页面加载完成后会直接写出：

```text
output/spritesheet.png
```

不要用浏览器截图代替这个输出。截图会受 device pixel ratio、页面背景和
颜色管理影响，曾导致八云紫只有预期一半大小并出现青色杂边。

### 5. 让 hatch-pet 验证

让 Codex 读取 `hatch-pet/SKILL.md` 并对 `output/spritesheet.png`
执行：

1. v2 atlas 验证；
2. 透明度与边缘检查；
3. 完整动作 contact sheet；
4. neutral + 16 Look direction sheet；
5. 三个隔离 reviewer 的盲测；
6. cardinal 与连续性硬门槛；
7. 独立最终视觉 QA；
8. 输出 `output/spritesheet.webp`。

不要用系统裸 Python 猜依赖；Codex 应先加载 workspace dependencies，
使用返回的 Python 和 `hatch-pet/scripts`。

### 6. 安装

```bash
npm run install-pet -- \
  --id=my-tlm-pet \
  --name='我的角色' \
  --description='由 TLM 原生模型渲染的 Codex 桌宠' \
  --spritesheet=output/spritesheet.webp
```

安装结构是：

```text
~/.codex/pets/my-tlm-pet/
  pet.json
  spritesheet.webp
```

然后在 ChatGPT/Codex 桌面应用中打开 **Settings > Pets**，点击
**Refresh** 并选择新桌宠。官方的自定义桌宠入口与刷新流程见
[OpenAI Pets 文档](https://learn.chatgpt.com/docs/pets#create-a-custom-pet)。

## Look 为什么不跟随普通鼠标

当前桌面应用的 v2 Look 帧由 Computer Use 光标事件触发，不是 macOS
普通全局鼠标移动。普通使用时不转头不代表 Look 图集坏了。Computer Use
光标进入桌宠周围时，应用才会按相对方向选择 16 个 Look 帧；中心死区回退
到 idle。拖动桌宠或系统开启“减少动态效果”时也可能不播放 Look。

## 八云紫示例

- 动作实现：[src/capture.ts](src/capture.ts)
- 宠物清单：[examples/yukari-yakumo/pet.json](examples/yukari-yakumo/pet.json)
- 当前工作区 QA 示例：
  [contact sheet](yukari-yakumo-run/qa/contact-sheet-extended.png)、
  [Look directions](yukari-yakumo-run/qa/look-directions.png)

生成图集和上游角色素材是否适合随仓库分发，取决于许可证。建议代码仓库
默认不提交 `public/input`，在 release 页面单独提供经过许可核对的宠物包。

## 许可证与发布

- 本仓库转换代码：MIT，见 [LICENSE](LICENSE)。
- [Touhou Little Maid 官方仓库](https://github.com/TartaricAcid/TouhouLittleMaid)
  的代码采用 [MIT](https://github.com/TartaricAcid/TouhouLittleMaid/blob/1.20/LICENSE-MIT)。
- 其官方资产采用
  [CC BY-NC-SA 4.0](https://github.com/TartaricAcid/TouhouLittleMaid/blob/1.20/LICENSE-CC)：
  再分发模型、贴图或衍生精灵图时需要署名、仅限非商业用途，并以相同许可
  分享衍生作品。
- 第三方模型包：以各自作者声明为准。
- 东方 Project 角色：还需遵守相应同人创作/发布规则。

详情见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。如果无法确认素材
是否可再分发，只发布转换代码，让用户自行提供本地模型和贴图。

下载公开仓库不等于获得任意再分发权。本仓库的 MIT 许可只覆盖转换器代码，
不会把上游资产或生成出的角色图集重新许可为 MIT。发布宠物包时应附上来源
仓库、固定 commit、角色/模型作者与适用的资产许可；若使用第三方资源包，
还要单独核对其许可。

## 已知边界

- 目前支持普通 Bedrock entity geometry；不支持 GeckoLib。
- TLM JavaScript 动画并不总是随资源包分发。本示例包含常见动作兼容层，
  角色专属动作需要逐个映射。
- 骨骼名、模型正面、道具对称性和左右手约定可能因资源包不同而变化。
- `hatch-pet` 的盲测与最终 QA 不能省略，尤其是左右移动与 Look cardinal。
