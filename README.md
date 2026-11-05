# 无名之辈 · 霍格沃茨编年史

> 1991 年的平行魔法世界：预言没有兑现，"大难不死的男孩"从未存在，伏地魔从未倒下。
> 没有救世主的时代，一个一年级新生要怎么赢他？

一款 AI 驱动的中文文字冒险游戏（Web 应用），提供两种玩法：

- **经典时间线** — 离线可玩的分支剧情引擎：40+ 场景、四维属性（勇气/智慧/魔力/人缘）、黑暗值、6 张手绘风场景插画、5 种结局（真结局/惨胜/牺牲/逃亡/黑暗）
- **自由时间线** — AI 叙事引擎实时演算：自由输入任何行动，模型流式叙事并同步游戏状态，结局由 AI 根据整局行动判定

## 正式入口（推荐）

**https://nameless-hogwarts.app.workbuddy.host/?sharecode=GLGHE37SZX**

> AI 模型调用（免密钥）与按 IP 去重的访问统计都运行在官方托管域的云端，
> GitHub Pages 为纯静态托管，仅作跳转页（见 `docs/`）。

## 本地运行

```bash
npm start        # 或: node server.js
# 打开 http://localhost:3000
```

- `server.js` — 零依赖 Node 服务：静态托管 + `/api/visits` 访问统计
  （取 `X-Forwarded-For` 首跳 IP，SHA-256 加盐哈希后去重，**不存储原始 IP**）
- `index.html` — 全部游戏逻辑（经典引擎 + AI 模式），无构建步骤
- `assets/` — 场景插画（火车 / 分院 / 木箱 / 禁林 / 洞穴 / 决战）

## AI 模式说明

AI 模式通过 WorkBuddy 云服务的免密钥 LLM 通道调用大模型（`@tencent-ai/workbuddy-cloud-sdk`，CDN 引入）。
模型每回合按约定格式输出叙事正文 + `<<<STATE>>>` 状态块（属性/物品/场景/建议行动/是否结局），客户端解析后同步游戏状态。
该通道与应用域名绑定（Origin 精确校验），在自己的服务器上直接部署 AI 模式无法调用模型——经典模式不受影响。

## 仓库结构

```
hogwarts-game/
├── index.html      # 游戏本体（经典引擎 + AI 模式）
├── server.js       # Node 服务（静态托管 + IP 统计 API）
├── assets/         # 场景插画
└── docs/           # GitHub Pages 跳转页（指向正式入口）
```
