# 贡献

词条靠「捡」长出来：撞见一个不好懂的词，把原话连同上下文丢过来——[飞书表单](https://my.feishu.cn/share/base/shrcn6SFjWEfb8FtclBBHIbYnpf)（GitHub 走 [Issue](https://github.com/alienzhou/ai-agent-jargon-bestiary/issues/new?template=submit-term.yml)）。

表单只有四个空、一个必填——「AI 黑话词汇」。不用判断它是不是黑话、值不值得收，那是收录人的事；贡献越多，图鉴越厚。

想自己建词条、改页面？往下看。

## 本地跑

```bash
npm install
npm run dev     # 改 terms/ 自动重编译 + 浏览器刷新
npm run build   # 产出 dist/
npm run lint    # 校验全部词条格式（加 -- <slug> 只校验某几条）
```

## 加一个词

```bash
npm run new -- menjin --term "门禁" --quote "这个接口得加个门禁" --category 隐喻 --kind 代称
# 填掉文件里的 TODO，然后
npm run lint -- menjin && npm run build
```

`npm run new` 起一个字段齐全、待填处标着 TODO 的骨架——比复制别的词条稳，
模板会把 `term` 预填进造句位，不会写出同义变体被构建拦下。

`npm run lint` 是**词条格式规范的唯一事实源**（`scripts/lint-terms.mjs`）。
分两级：`error` 让构建失败（`build.mjs` 直接复用这批规则，不另写一套），`warn` 只提示。
**所以下面的字段规则不用背，写完跑一次校验就知道。**

terms/ 一词一文件，全部内容在 frontmatter 里，没有 Markdown 正文：

```markdown
---
term: 最小闭环                     # 词条主名，照录原文形态
zh: ""                            # 中文译名，没有留空 ""
aliases: [MVP, 跑通流程]           # 别名/变体，用于搜索
category: 方法                     # 六选一：方法 / 架构 / 能力 / 隐喻 / 营销 / 失效
kind: 术语                        # 二选一：术语 / 代称（缺省「术语」）
added: 2026-09-04                # 收录日期
gloss: 用最少的功能把一件事从开始做到结尾，确认整条流程真的能跑通。   # 人话翻译，一句话
actually: 最小闭环是 MVP 在流程上的说法…  # 它其实是什么，必须出现词条本体（页面高亮锚点）
origin: 「闭环」原指控制系统的反馈回路…    # 血统：谁先说的、从哪来，可空
note: …                          # 吐槽/观察，可空
usage:                           # 遭遇战的题：谁用对了
  right:
    text: MVP 先只做 issue 指派、CLI 执行和结果回传，三步能走通就是最小闭环。
    why: 保留的也都是验证流程所必需的部分。
  wrong:                         # 至少 3 句离谱误用，页面随机抽 3
    - text: 我买了个最小闭环，套在手指上刚刚好。
      why: 一枚戒指。
    - text: 今天的最小闭环只要八块钱，配豆浆正好。
      why: 一份早餐。
    - text: 医生说我的最小闭环有点发炎，开了三天药。
      why: 一个人体部位。
decoys:                          # 恰好 3 条貌似成立的错误释义
  - 将模型输出自动写回提示词以进行多轮自我修正的推理框架
  - 在分布式系统中用确认消息保证事件最终送达的通信协议
  - 通过用户行为数据持续训练推荐模型的在线学习机制
sightings:                       # 出没记录：在哪撞见的
  - date: 2026-09-04
    source: 架构调研
    quote: 已有 session send / wait / messages，正好是「派任务 → 等结果 → 取过程」的最小闭环。
    note: 把三件小事描述成首尾接上的流程环
---
```

字段含 `:` `#` `[` 等 YAML 特殊字符时用双引号包裹。写作要点：

- **kind** —— `术语`：背后有真概念，搞懂有用；`代称`：AI 给旧东西起的新名字（「赋能」=「用」），认出来就行。判断法：把词换成它指代的东西，句意没损失就是 `代称`
- **usage** —— 讽刺向，不是真教学：正确答案是一句朴素人话，朴素到让人愣一下（「就这？」）；误用越离谱越好，但语气要一本正经（把词当食物、当动物、当器官）；每句配一句收得干净的 why
- **decoys** —— 让懂行的人犹豫两秒：挪用邻近真技术 / 望文生义的合理推测 / 像模像样的生造；别写一眼假的

**这词已经收过了** → 不要新建文件，在原词条的 `sightings` 里追加一条。
同一个词多次出没是它的活跃度证据，不是重复数据。

## 数据与部署

- `dist/lexicon.json` —— 对外数据契约：纯字段零 HTML、字段恒定、日期统一、自带 schema，直接拿去做自己的页面
- `dist/index.html` —— 单文件零依赖，扔到任何静态托管即可
- `submit.config.json` —— 投喂入口的链接配置：链接是数据不是代码，换渠道不用改代码

## 素材

怪物立绘、词条配图的生成管线与风格底座 → [ART.md](ART.md)（素材侧唯一事实源）

## 用 AI 助手改这个项目

[AGENTS.md](AGENTS.md) 是给 AI 编码助手的项目须知（通用 `AGENTS.md` 约定，不绑定特定产品），
[.agent/COLLECT.md](.agent/COLLECT.md) 是收词流程手册。让助手先读这两份，产出会稳很多。
