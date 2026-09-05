# AGENTS.md

给 AI 编码助手的项目须知。人也能看，但主要目的是让不同的 agent 每次都按同一套路干活。

> 本文件用通用的 `AGENTS.md` 约定，不绑定任何特定助手产品。
> 同样，项目的出图环节走环境变量 `JARGON_IMAGE_CMD` 接入，也不绑定任何文生图服务。

## 这是什么项目

AI 黑话的怪兽图鉴：一词一卡，说明这词的人话翻译是什么、它其实是什么、在哪撞见的。
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
| 词条**内容**怎么写 | [.agents/skills/collect-term/SKILL.md](.agents/skills/collect-term/SKILL.md) | 收词流程 + 四个判断题（kind / gloss / actually / usage 怎么定） |
| **素材**风格与管线 | [ART.md](ART.md) | 统一 prompt、四色调色板、命名约定、验收清单 |

`CONTRIBUTING.md` 是给人读的完整版说明；上面三份是干活时按图索骥的。
**规则只应存在于一处**——发现两处描述同一件事就是 bug，去掉一处或让它引用另一处。

## 收词（最高频任务）

完整流程见 [.agents/skills/collect-term/SKILL.md](.agents/skills/collect-term/SKILL.md)——它同时是一份
可被支持 `.agents/skills/` 约定的助手直接触发的 skill（说「收录这个词」即可唤起）。要点：

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
- **音效在 `assets/sfx.js`，全部 Web Audio 现场合成，不许引音频文件**——页面零外部请求 + 单文件是硬约束，
  一个 mp3 就能让 `index.html` 涨几百 KB。加新音效只在 `BANK` 里加一条，调用点写 `SFX.play('名字')`。
  音效永远不能阻断主流程：`play()` 整个包在 try/catch 里，没有 Web Audio 的环境照常能玩。
- **BGM 同样是合成的**（`sfx.js` 底部）：Am-F-C-G 四小节循环，`setTimeout` 提前一小节排期。
  **默认开**——这是台街机，插币就该有背景乐。它敢默认开是因为三条前提同时成立，
  少一条就得退回默认关：① 第一声只可能发生在投币那一下手势里，不存在「一进页面就被吵」；
  ② 走独立的 `musicBus`，音效响起时 `duck()` 把它压到三成再缓升，「叮」才不会被糊掉；
  ③ 页面切后台必停（`visibilitychange`），否则 timer 被节流后音符会堆积成一坨。
  关过一次就记住关（`localStorage` 的 `jb-bgm`），不再每次重问。
  开场页左下角那行小字是「随手能关」的位置，不是征求同意的弹窗——别再把它做大做居中。
  改编曲改 `PROG` / `scheduleBar()`；音量是 `MUSIC_VOL`（当前 0.055，约为音效的 1/5）。
- **`AudioContext` 只能诞生在投币那一下**：浏览器自动播放策略要求音频上下文创建于用户手势内。
  开场页是全站第一次手势，把点火点挪走会导致整站静音。
- **投币开场的时序写死在两处**：`app.css` 的 `#boot` 动画时长 和 `app.js` 里 `boot()` 的
  `setTimeout`（620ms 通电 / 1560ms 退场）。改一处必须改另一处，否则音画对不上。
  另外 reduced-motion 下 CSS 动画被全局压到 0.01ms，`boot()` 里有专门的短路分支——声音留着，画面直接进场。
- **开场页的「再点一下跳过」必须走时间窗，不能写成「第二次调用就跳过」**：一次触屏轻点会依次
  派发 `pointerdown → touchstart → pointerup → touchend → click`，其中三个都在监听列表里。
  按字面实现的话 `touchstart` 会在开场动画启动 1ms 后就把它掀掉——手机上永远看不到投币动效，
  桌面鼠标反而正常（只有 `pointerdown` + `click` 两发）。现用 360ms 窗口把同一次点击的级联归并。
- **刮刮卡的 canvas 位图必须随 CSS 尺寸重建**（`initScratch()` 里的 `ResizeObserver` + `relayout()`）。
  手机转屏 / 折叠屏展开会改容器宽度，位图不跟着走就会被拉伸，而 `pos()` 用的是 CSS 坐标，
  刮的位置和擦掉的位置会整体错开——转个屏就刮不准了。判据是 `canvas.width / offsetWidth` 恒等于 dpr。
- **触屏没有 hover，但浏览器会把 `:hover` 粘在点过的元素上**：凡是 `:hover` 改了 `transform` /
  背景色的规则，都要在 `@media (hover: none)` 里中和掉，漏一个就留一个「看起来按坏了」的按钮。
  同一个 media 块里还兜着触摸目标尺寸（44px）——顶部条那几颗原本只有 34~39px。
- **声音开关只有一颗**（顶部条 `#snd`，三态循环：音效+音乐 → 只有音效 → 全静）。曾经拆成两颗
  （🔊 和 ♪）并排，视觉上像重复图标——要加能力就往这颗的循环里加，别再摆第二颗。
  图标是内联 SVG 不是 emoji：emoji 跨系统渲染差异太大，压不住粗描边风格。
- **验证 CSS 效果时别信 `getComputedStyle` 的第一帧**：自动化浏览器里 transition 常常不推进，
  读到的是过渡起始值（表现为「规则明明匹配却没生效」）。先 `el.style.transition='none'` 再取值。
- **改了页面逻辑**：把 `scripts/verify-page.js` 整段贴进浏览器 DevTools Console 跑一次，返回 JSON 结论。
  不依赖特定自动化工具——任何能「在页面里执行 JS 并取回返回值」的方式都行。

## 不要引入的东西

这个仓库要能被任何人 clone 下来直接跑通，所以：

- **不要写死任何私有工具、内网地址、个人路径。** 需要外部能力就留环境变量接口（照 `JARGON_IMAGE_CMD` 的样子），
  并提供不设该变量时的降级路径。
- **不要新增运行时依赖。** 构建期只有 `js-yaml`；页面零依赖零外部请求，这是它能双击就玩的前提。
- **生成用的 PNG 原图不入库**（见 `.gitignore`），仓库只提交 `assets/img/opt/` 下的压缩产物。
