# 素材生成规范 / Art Bible

这本词典的图不是画的，是生成的。生成是随机的，所以**规范的全部目的只有一个：让下一张图和上一张看起来是同一个人画的**。

照着这份文档走，半年后加的新怪物也能和今天这批放在一起而不打架。

---

## 一、风格底座（不要改）

所有素材共用同一段风格前缀，唯一事实源是 [`scripts/style.txt`](scripts/style.txt)，两个生成脚本都从那里读：

```
Retro arcade trading-card monster illustration.
Bold thick black outlines, flat limited palette ONLY:
cream paper #f2e8d5 background, vermilion red #b4342c, deep ink black #1a1815, gold #c9a227.
Vintage risograph print texture with halftone dots.
Single centered character, full body, facing viewer, comedic and absurd,
NOT cute-kawaii, NOT 3d render, NOT photorealistic.
Plain flat cream background, no scene, no text, no letters, no words.
```

拆开看，每一条都在挡一种翻车：

| 约束 | 挡的是什么 |
|---|---|
| `flat limited palette ONLY: #f2e8d5 / #b4342c / #1a1815 / #c9a227` | 模型自作主张上全彩，一张图就把整页配色带歪 |
| `Plain flat cream background` | 出透明底或白底。**奶油底和页面底色一致，贴上去就是贴纸**，不用抠图也不用溶图 |
| `no text, no letters, no words` | 生成图里的假英文单词。图上一旦有字，中文页面立刻显得像盗版 |
| `Single centered character, full body, facing viewer` | 半身、侧脸、多个主体、构图偏心——卡面槽位是固定的，偏一点就歪 |
| `Bold thick black outlines` | 缩到 124px 后细线全糊，粗描边是小尺寸下还能看清的唯一保证 |
| `NOT cute-kawaii` | 萌系大眼睛。这本词典的语气是损，不是可爱 |
| `NOT 3d render, NOT photorealistic` | C4D 塑料感 / 真实照片，和丝网印底纹完全不兼容 |

**改这段 = 全站风格漂移。** 真要改，就得把所有素材全部重生成，不能只改一张。好消息是只有 `scripts/style.txt` 一处需要改，两个脚本都读它。

## 二、调色板

| 变量 | Hex | 用途 |
|---|---|---|
| `--paper` | `#f2e8d5` | 页面底 = 素材底，两者必须同色 |
| `--red` | `#b4342c` | 主强调色，怪物身上的主色块 |
| `--ink` | `#1a1815` | 描边、深色块 |
| `--gold` | `#c9a227` | 点缀（稀有度星、小面积高光） |

和 `assets/app.css` 的 `:root` 是同一组值。改配色要两边同时改，否则素材会从页面上"浮"起来。

## 三、命名与用途

| 命名 | 用途 | 谁在用 |
|---|---|---|
| `term-{slug}` | **词条专属立绘，一词一图** | `app.js` 的 `monImg()` 第一级 |
| `mon-{分类拼音}` | 分类通用怪，词条缺专属图时顶上 | `monImg()` 第二级 / `MON` 表 |
| `boss-jargon` | 最后兜底，分类也没怪时用它 | `monImg()` 第三级 |
| `mascot-guide` | 开场投币页 + 战绩结算页的向导 | `boot()` / `renderResult()` |
| `scratch-coin` | 星纹金币，刮刮层中央徽章 | `initScratch()` |

`monImg()` 是三级降级：`term-{slug}` → `mon-{分类}` → `boss-jargon`。
所以**给词条补一张 `term-{slug}` 就自动生效**，不需要登记任何表。

当前在册的分类怪 / 功能素材：

| 文件 | 角色 | 主体设定 |
|---|---|---|
| `mon-fangfa` | 方法系 | 流程图官僚：身体由堆叠的流程框和箭头组成，抱着写字板，手多到每只都指着不同步骤 |
| `mon-nengli` | 能力系 | 秀肌肉的大脑 |
| `mon-yinyu` | 隐喻系 | 半猫半茶壶半云朵，零件对不上，戴顶小诗人帽 |
| `mon-yingxiao` | 营销系 | 油腻推销员：超大西装、墨镜、扩音器、闪光光环、油腻笑容 |
| `mascot-guide` | 向导 | 猫头鹰侦探：戴超大放大镜单片眼镜和小风衣，竖大拇指 |
| `boss-jargon` | Boss | 多嘴九头蛇：每个头都是一张正在说话的嘴，脖子缠成一团，挂着工牌 |
| `scratch-coin` | 功能素材 | 星纹金币：印在刮刮涂层中央的徽章（`initScratch` 圆形裁切后画进 canvas） |

词条专属图（`term-*`）共 13 张，与 `terms/*.md` 一一对应，不在此逐条罗列——
主体设定就写在生成时的那句英文里，重生成时照着词条含义重新拟即可。

`mon-jiagou`（架构系）/ `mon-shixiao`（失效系）随分类一起下线，已挪进 `assets/img/_retired/`。
`app.js` 的 `MON` / `RARE` 表里仍保留这两行，将来分类回归可直接复用。

写主体描述的三条经验：

1. **一句英文说完，别写小作文。** 越长模型越容易自由发挥，风格前缀反而被稀释。
2. **描述"是什么做的"，不是"象征什么"。** ✅「身体由堆叠的流程框和箭头组成」 ❌「代表官僚主义的抽象存在」——后者会生成一坨看不懂的东西。
3. **给一个具体的滑稽道具。** 工牌、扩音器、诗人帽、写字板。荒诞感是从道具来的，不是从表情来的。

## 四、管线

```
scripts/gen-term-art.sh <slug> "<主体描述>"   # 词条专属图（薄壳，转交 gen-art.sh）
  → assets/img/term-<slug>.png
scripts/gen-art.sh <name> "<主体描述>"        # 分类怪 / 功能素材
  → assets/img/<name>.png                    # master，本地生成，不进 git

scripts/opt-art.sh <name>                    # 实为 scripts/opt-art.py 的兼容入口
  → 长边缩到 440px                            # 卡面横排头图实际显示 88–124px，留足倍率
  → webp(q75)                                 # 实测 q75 vs q82 在 440px 下目检无差，省 22%
  → assets/img/opt/<name>.webp

node build.mjs
  → imgData() base64 内联
  → dist/index.html                          # 仍是单文件，零外部请求
```

四个注意点：

- **本仓库不绑定任何文生图服务。** `gen-art.sh` 只负责把 `scripts/style.txt` 和你的主体描述
  拼成完整 prompt，出图交给谁由环境变量 `JARGON_IMAGE_CMD` 决定（见下一节）。
  不设这个变量就走手动模式：脚本把 prompt 打出来，你贴进任意文生图产品，按提示的路径存盘即可。
- **只产出 webp 一种格式。** Chrome 23+ / Safari 14+ / Firefox 65+ 全支持，
  这本图鉴要发给别人双击就玩，没有需要兜底的现代浏览器。曾经同时产 avif、构建时挑体积小的那个，
  省下的百来 KB 不值得每张图两份文件、仓库素材翻倍、外加一套挑选逻辑。
- **压缩不依赖外部工具。** `scripts/opt-art.py` 用 PEP 723 内联依赖声明自带 pillow，靠 `uv run` 拉起，
  不污染系统环境。`opt-art.sh` 是薄壳，旧命令照跑。
- **`imgData()` 只内联「当前词条用得到」的图。** 每张 base64 后 25–50KB，
  把弃用分类怪和历史素材一起塞进去会让 `index.html` 白涨几百 KB。
  它的取用口径与 `app.js` 的 `monImg()` 三级降级严格对齐——改一边必须改另一边。

`assets/img/_retired/` 仅作为本地弃用素材留档，不参与构建，也不进仓库。

## 五、加图

前置一次：`opt-art.py` 走 `uv run`，确保 `uv` 在 PATH 里（装法见「已知坑」）。

生成环节接哪个文生图工具由你自己决定，通过 `JARGON_IMAGE_CMD` 注入。命令里可以用两个变量：
`$PROMPT`（脚本拼好的完整提示词）和 `$OUT`（目标 png 绝对路径）。唯一要求是跑完后 `$OUT` 是一张落盘的 png：

```bash
# 举例：任何能接收 prompt、把图写到指定路径的 CLI 都行
export JARGON_IMAGE_CMD='my-image-cli --prompt "$PROMPT" --size 2048x2048 --out "$OUT"'

# 不设它 = 手动模式：脚本打印 prompt，你贴进任意文生图产品，把图存到它提示的路径
```

### 给新词条配专属图（最常见）

```bash
# 1. 生成（设了 JARGON_IMAGE_CMD 会内置 3 次重试；否则打印 prompt 走手动）
scripts/gen-term-art.sh taizhang "a bureaucrat monster buried under towering stacks of ledgers, ..."

# 2. 目检（下一节的验收清单）
open assets/img/term-taizhang.png

# 3. 压缩 + 构建
scripts/opt-art.sh term-taizhang && node build.mjs
```

不需要改任何代码：`monImg()` 按 `term-{slug}` 自动认领。
slug 就是 `terms/` 下的文件名（去掉 `.md`），拼错了不会报错，只会静默降级成分类怪。

### 加一个新分类的通用怪

```bash
scripts/gen-art.sh mon-xinfenlei "a creature made of ... , holding a ..."
scripts/opt-art.sh mon-xinfenlei
# 登记三处：app.js 的 MON 表、app.js 的 RARE 表（给个星级）、build.mjs 的 imgData() 里那份 MON
node build.mjs
```

漏登记不会报错，页面自动降级——所以**必须目检页面**，别只看构建成功。

## 六、封面 banner

### 投币开场的透明立绘

开场使用 `boot-boss.webp` / `boot-guide.webp`，是现有 Boss 和向导的独立透明版本，
不替换卡面原图。它们是上面奶油背景、440px 卡面尺寸规则的特例：红底开场需要真实 alpha，
以便角色与标题前后交叠；角色内部的奶油色（牙齿、眼睛、衣服）必须保持不透明。
Boss 长边 960px，向导长边 300px，WebP q80；生成的 PNG 仍不入库。
前爪层复用 Boss 数据，通过 CSS 裁切，不额外内联一份图片。
`build.mjs` 的 `imgData()` 显式收录这两张；缺图时开场仍显示标题和投币入口。

透明版的编辑提示词：

> Remove only the exterior cream paper background, including gaps between limbs, and output actual alpha transparency. Preserve the referenced full-body character, pose, props, thick black outlines, vintage print texture and cream / vermilion / ink / gold palette. Keep cream interior details opaque. No new objects, text, scene or painted checkerboard.

这次透明版由内置图像编辑工具制作；后续可用任意支持参考图与 alpha 的工具复现，
不改变 `JARGON_IMAGE_CMD` 的通用接口。验收还需检查标题可读、前爪与身体坐标一致、
手机竖屏和短横屏的投币入口与声音开关可见。

### 封面（README + 视频）

封面不是文生图，是 **HTML 排版截图**——版式手写在 `scripts/cover.html` 里，
图片直接引 `assets/img/opt/*.webp`。所以它天然跟站点同风格，改文案不用重新出图。

**视觉口径 = 投币开场页**（`app.css` 的 `#boot`）：红底 + 半调网点 + 金色爆炸星 +
巨大米色描边标题压过怪兽 + 前爪层反压标题 + 猫头鹰向导 + 底部黑条。
动开场页的版式，封面要跟着动，否则两边像两个项目。

一份源文件出两张图，由 `?v=<变体>` 切换：

| 变体 | 尺寸 | 产物 | 用途 |
|---|---|---|---|
| `wide` | 1280×640 | `assets/cover.png` | README 顶部 |
| `tall` | 1080×1440 | `assets/cover-vertical.png` | 竖屏视频封面（3:4） |

```bash
npm run cover     # 两张一起出；Chrome 路径可用 CHROME=<路径> 覆盖
```

舞台内所有尺寸用 `em`，换变体只改 `#cover` 的 `font-size` + 那几条 `.wide` / `.tall`
定位覆盖，不要在变体里重写整套样式。

排版校验别靠肉眼估：`#cover` 是固定尺寸的盒子，量各元素相对它的 `left/top/right/bottom`，
出现负值就是溢出。**底部黑条会吃掉一截高度**，舞台高度和卡牌 `bottom` 都要给它让位——
猫头鹰在舞台右下角，最容易被压掉头。

## 七、验收清单

生成完先看这 6 条，任何一条不过就重跑（重跑很便宜，将就着用会污染整套风格）：

- [ ] 底色是奶油色 `#f2e8d5`，不是白色、不是透明、不是渐变
- [ ] 图上没有任何文字 / 字母 / 数字
- [ ] 只有一个主体，居中，全身入画，没有被裁到
- [ ] 用色在四色盘内，没有跑出来的蓝绿紫
- [ ] 描边够粗——缩到 124px 宽（卡面横排头图实际尺寸）还能认出轮廓
- [ ] 荒诞但不萌，不是 3D 渲染质感

体积参考：单张压缩后 19–38KB（440px webp q75）。明显超标说明细节太碎（通常伴随描边不够粗），重生成比硬压有效。

## 八、已知坑

- **出图工具会随机断连**：多数文生图 CLI 都有这毛病。`gen-art.sh` 已内置 3 次重试并检查产物是否真的落盘（`-s` 判非空）。
- **`uv: command not found`**：`opt-art.py` 靠 `uv` 拉依赖。装法 `curl -fsSL https://astral.sh/uv/install.sh | sh`，落在 `~/.local/bin`，记得把它加进 `PATH`。
- **模型偶尔跑出四色盘**：见过生成绿色遮光帽檐的。这类不要手工修，直接删掉 PNG，把犯规的那个词从主体描述里拿掉再重跑。
- **改了 build.mjs 模板 dev server 不生效**：`dev.mjs` 用 ESM import 缓存了模块，必须重启进程。
- **浏览器里 `innerHeight` 可能是 0**（自动化标签页尤其常见）：校验吸顶行为别用视口绝对坐标，
  改判「翻页条相对 `#files` 顶部被推开多少」。现成脚本见 [`scripts/verify-page.js`](scripts/verify-page.js)：
  打开 `dist/index.html`，把它整段贴进 DevTools Console，返回一段 JSON 结论。
