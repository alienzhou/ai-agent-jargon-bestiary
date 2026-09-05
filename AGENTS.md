# AGENTS.md

给 AI 编码助手的项目须知。人也能看，但主要目的是让不同的 agent 每次都按同一套路干活。

> 本文件用通用的 `AGENTS.md` 约定，不绑定任何特定助手产品。
> 同样，项目的出图环节走环境变量 `JARGON_IMAGE_CMD` 接入，也不绑定任何文生图服务。

## 这是什么项目

AI Agent 黑话图鉴：一词一卡，说明这词的人话翻译是什么、它其实是什么、在哪撞见的。
`terms/*.md`（纯 YAML frontmatter）是唯一数据源，构建出 `dist/lexicon.json`（对外数据契约）
和 `dist/index.html`（单文件页面，素材 base64 内联，零外部请求）。

**两条立场，做任何改动前先认下来：**

1. **词条靠捡不靠查。** 不是检索术语表，是在真实对话里撞见了才收。所以**没有原话（`sightings`）就不建条**。
2. **不做定性评判。** 不给分、不判「这词是不是黑话」。只做三件事：翻译成人话、指出它其实是什么、记下在哪撞见的。判断留给读的人。

## 常用命令

```bash
npm install
npm run build          # 构建
npm run dev            # 开发服务器，改词条自动重编译 + 刷新
npm run lint           # 校验全部词条格式
npm run lint -- <slug> # 只校验某几条
npm run new -- <slug> --term "词" --quote "原话"   # 新建词条骨架
```

## 三份事实源，别另起一套

| 事情 | 唯一事实源 | 说明 |
|---|---|---|
| 词条**格式**规范 | `scripts/lint-terms.mjs` | 可执行断言。`build.mjs` 复用它的 error 级规则——lint 过不了构建也过不了。改规范先改这里 |
| 词条**内容**怎么写 | [.agent/COLLECT.md](.agent/COLLECT.md) | 收词流程 + 四个判断题（kind / gloss / actually / usage 怎么定） |
| **素材**风格与管线 | [ART.md](ART.md) | 统一 prompt、四色调色板、命名约定、验收清单 |

`CONTRIBUTING.md` 是给人读的完整版说明；上面三份是干活时按图索骥的。
**规则只应存在于一处**——发现两处描述同一件事就是 bug，去掉一处或让它引用另一处。

## 收词（最高频任务）

完整流程见 [.agent/COLLECT.md](.agent/COLLECT.md)。要点：

- 用 `npm run new` 起骨架，别手抄别的词条文件——模板会把 `term` 预填进造句位，避免写出同义变体。
- 填完跑 `npm run lint -- <slug>`。**不要靠背规则，靠跑校验。**
- **这词已经收过了** → 不要新建文件，在原词条的 `sightings` 里追加一条。同词多次出没是活跃度证据，不是重复数据。
- 配图可选，缺图会自动降级成分类通用怪，不影响构建。

## 改代码时注意

- **加新分类**要同步三处：`scripts/lint-terms.mjs` 的 `CATEGORIES`、`assets/app.js` 的 `MON` + `RARE` 表、
  `build.mjs` 的 `imgData()` 里那份 `MON`。漏了不报错，页面静默降级——所以必须目检页面。
- **`build.mjs` 的 `imgData()` 只内联当前词条用得到的图**，口径与 `app.js` 的 `monImg()` 三级降级
  （`term-{slug}` → `mon-{分类}` → `boss-jargon`）严格对齐。改一边必须改另一边，否则单文件白涨几百 KB 或图裂。
- **改了 `build.mjs` 模板 dev server 不生效**：`dev.mjs` 用 ESM import 缓存了模块，必须重启进程。
- **改了页面逻辑**：把 `scripts/verify-page.js` 整段贴进浏览器 DevTools Console 跑一次，返回 JSON 结论。
  不依赖特定自动化工具——任何能「在页面里执行 JS 并取回返回值」的方式都行。

## 不要引入的东西

这个仓库要能被任何人 clone 下来直接跑通，所以：

- **不要写死任何私有工具、内网地址、个人路径。** 需要外部能力就留环境变量接口（照 `JARGON_IMAGE_CMD` 的样子），
  并提供不设该变量时的降级路径。
- **不要新增运行时依赖。** 构建期只有 `js-yaml`；页面零依赖零外部请求，这是它能双击就玩的前提。
- **生成用的 PNG 原图不入库**（见 `.gitignore`），仓库只提交 `assets/img/opt/` 下的压缩产物。
