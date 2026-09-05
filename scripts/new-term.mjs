#!/usr/bin/env node
/**
 * 新建词条骨架：把「撞见一句黑话」变成一个字段齐全、能过 lint 的 terms/{slug}.md。
 *
 * 词条靠捡不靠查，所以原话（--quote）是必填的——没有出没记录的词不该收。
 * 脚本只搭骨架并把待填处标成 TODO，判断留给人：
 * gloss 怎么翻、actually 是什么、误用怎么编，这些是策展，不是模板能生成的。
 *
 * 用法：
 *   npm run new -- <slug> --term "台账" --quote "我先更新一下台账" [选项]
 *
 * 选项：
 *   --term      词条主名（原文形态），必填
 *   --quote     撞见的原话，必填
 *   --zh        中文译名
 *   --aliases   别名，逗号分隔
 *   --category  方法|架构|能力|隐喻|营销|失效
 *   --kind      术语|代称
 *   --source    在哪撞见的
 *   --force     覆盖已存在的词条文件
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, KINDS } from './lint-terms.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const termsDir = join(root, 'terms');

// ── 参数 ──────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
};
const bool = (name) => argv.includes(`--${name}`);

const die = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

if (!slug) {
  die('需要 slug：npm run new -- taizhang --term "台账" --quote "原话…"');
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  die(`slug 要用小写英文 + 短横线（当前「${slug}」），它会进 URL 和图片名`);
}

const term = flag('term');
const quote = flag('quote');
if (!term) die('需要 --term "词条主名"');
/* 原话是这个项目的立场：词条靠捡不靠查，没有现场就不该建条 */
if (!quote) die('需要 --quote "撞见的原话"。词条要有出处，不是从术语表抄来的');

const category = flag('category');
if (category && !CATEGORIES.includes(category)) {
  die(`--category 要是：${CATEGORIES.join(' / ')}`);
}
const kind = flag('kind');
if (kind && !KINDS.includes(kind)) die(`--kind 要是：${KINDS.join(' / ')}`);

const dest = join(termsDir, `${slug}.md`);
if (existsSync(dest) && !bool('force')) {
  die(`terms/${slug}.md 已存在。要追加一条新的出没记录就直接编辑它；确认覆盖加 --force`);
}

// ── 生成 ──────────────────────────────────────────────────────
/* YAML 里含 : # [ 等字符会解析歧义，一律双引号包裹并转义 */
const q = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const today = new Date().toISOString().slice(0, 10);
const aliases = flag('aliases')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/* 造句必须一字不差含原词，所以模板直接把 term 填进去，
   避免照抄模板的人写出同义变体、构建时才被拦下 */
const md = `---
term: ${q(term)}
zh: ${q(flag('zh'))}
aliases: [${aliases.map(q).join(', ')}]
category: ${category || `"" # TODO 必填一个：${CATEGORIES.join(' / ')}`}
kind: ${kind || `"" # TODO 术语（真概念，值得学）/ 代称（换个说法而已，认出就行）`}
added: ${today}

# TODO 人话翻译，一句话说完，不要再出现「${term}」本身
gloss: ""

# TODO 它其实是什么（旧名字 / 老概念 / 真新东西）。必须出现「${term}」，页面靠它做高亮
actually: ""

# 血统：谁先说的、从哪来的。可留空
origin: ""

# 备注 / 吐槽。可留空，页面不展示
note: ""

# 遭遇战题目：4 句话只有 1 句用对。每句都必须一字不差包含「${term}」
usage:
  right:
    # TODO 一句朴素、正常人会说的话。全场唯一的人话，平淡才是笑点的底
    text: ""
    why: ""
  wrong:
    # TODO 至少 3 条。风马牛不相及，越离谱越好：把它当成食物 / 动物 / 器官 / 心情
    # why 是真正的笑点位置：先认真指认，再补一刀
    - text: ""
      why: ""
    - text: ""
      why: ""
    - text: ""
      why: ""

# TODO 恰好 3 条干扰项，看起来完全可能是对的，句式长度与 gloss 接近
decoys:
  - ""
  - ""
  - ""

# 出没记录：在哪撞见的。原话照录，别润色
sightings:
  - date: ${today}
    source: ${q(flag('source'))}
    quote: ${q(quote)}
    note: ""
---
`;

mkdirSync(termsDir, { recursive: true });
writeFileSync(dest, md, 'utf8');

console.log(`✓ terms/${slug}.md

接下来：
  1. 填掉文件里的 TODO（gloss / actually / usage / decoys）
  2. npm run lint -- ${slug}        # 校验格式
  3. scripts/gen-term-art.sh ${slug} "<主体描述，英文一句话>"   # 配专属立绘，见 ART.md
     scripts/opt-art.sh term-${slug}
  4. npm run build`);
