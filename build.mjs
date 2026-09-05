#!/usr/bin/env node
/**
 * terms/*.md -> dist/lexicon.json (结构化数据) + dist/index.html (参考渲染)
 *
 * 数据契约见 dist/lexicon.json 的 schema 字段。词条为纯字段结构，
 * 不含 HTML，便于外部自行解析渲染。
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { lintTerm } from './scripts/lint-terms.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const termsDir = join(root, 'terms');
const distDir = join(root, 'dist');
const assetsDir = join(root, 'assets');

/* 投稿入口：链接是数据不是代码，放 submit.config.json（见 README「投稿入口」）。
   url = 主通道（飞书多维表格表单，国内访问稳定）；没填则退到 github（Issue 表单）；
   都为空则页面不渲染入口，构建时警告。 */
function loadSubmit() {
  try {
    return JSON.parse(readFileSync(join(root, 'submit.config.json'), 'utf8'));
  } catch {
    return {};
  }
}

// --- parse ---
// YAML 会把无引号的 2026-08-30 解析成 Date，统一收敛回 YYYY-MM-DD
function isoDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function parseTerm(file) {
  const raw = readFileSync(join(termsDir, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`frontmatter missing: ${file}`);
  const meta = yaml.load(m[1]) || {};
  const slug = basename(file, '.md');

  /* 格式规则统一在 scripts/lint-terms.mjs，这里只负责把它的结论转成构建行为：
     error 拦下构建，warn 打出来。别在这儿另写一套判断，两边会漂。
     跳过立绘检查——那是素材管线的事，缺图只是降级不该拦构建。 */
  const { errors, warnings } = lintTerm(file, { checkArt: false });
  if (errors.length) {
    throw new Error(`${file}:\n  ${errors.join('\n  ')}\n（详见 npm run lint）`);
  }
  for (const w of warnings) console.warn(`⚠ ${file}: ${w}`);

  return {
    slug,
    term: meta.term,
    zh: meta.zh || '',
    aliases: meta.aliases || [],
    category: meta.category || '',
    kind: meta.kind || '术语',
    added: isoDate(meta.added),
    gloss: meta.gloss,
    actually: meta.actually,
    origin: meta.origin || '',
    note: meta.note || '',
    decoys: meta.decoys || [],
    usage: meta.usage
      ? {
          right: {
            text: meta.usage.right?.text || '',
            why: meta.usage.right?.why || '',
          },
          wrong: (meta.usage.wrong || []).map((w) => ({ text: w.text || '', why: w.why || '' })),
        }
      : null,
    sightings: (meta.sightings || []).map((s) => ({
      date: isoDate(s.date),
      source: s.source || '',
      quote: s.quote || '',
      note: s.note || '',
    })),
  };
}

// --- build ---
export function build({ dev = false } = {}) {
  const terms = readdirSync(termsDir)
    .filter((f) => f.endsWith('.md'))
    .map(parseTerm)
    .sort((a, b) => a.term.localeCompare(b.term, 'zh'));

  const data = {
    schema: {
      version: 3,
      fields: {
        slug: '文件名派生的唯一标识',
        term: '词条主名（原文形态）',
        zh: '中文译名，可为空',
        aliases: '别名 / 变体数组，用于搜索',
        category: '分类：方法 | 架构 | 能力 | 隐喻 | 营销 | 失效',
        kind: '词性：术语（有真概念，值得学）| 代称（AI 拿它指代别的东西，学了也没用）',
        added: '收录日期 YYYY-MM-DD',
        gloss: '人话翻译（一句话），也是测验的正确答案',
        actually: '它其实是什么（旧名字 / 老概念 / 真新东西）',
        origin: '血统：谁先说的、从哪来的',
        note: '备注 / 吐槽',
        decoys: '测验干扰项数组（错误释义）',
        usage: '用法辨析：{ right: {text,why}, wrong: [{text,why}] }，供「谁用对了」测验',
        sightings: '出没记录数组：{ date, source, quote, note }',
      },
    },
    generatedAt: new Date().toISOString(),
    count: terms.length,
    categories: [...new Set(terms.map((t) => t.category).filter(Boolean))],
    terms,
  };

  const submit = loadSubmit();
  if (!submit.url && !submit.github) {
    console.warn('⚠ submit.config.json 未配置 url / github，页面不渲染「投词」入口');
  }

  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, 'lexicon.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
  writeFileSync(join(distDir, 'index.html'), html(terms, dev, submit), 'utf8');
  return { count: terms.length, terms };
}

// 直接运行时才构建；被 import 时由调用方决定时机
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count } = build();
  console.log(`AI Agent 的黑话图鉴：${count} 条 -> dist/lexicon.json + dist/index.html`);
}

// --- template ---
function asset(name) {
  return readFileSync(join(assetsDir, name), 'utf8');
}

/* AI 生成素材：assets/img/opt/*.{webp,avif} -> base64 内联，保持 dist 单文件自包含。
   同名多格式时取体积最小者。缺图不阻塞构建，模板/脚本各自兜底。

   只内联「当前词条真的会用到」的那些：每张图 20–46KB 且是 base64，
   把弃用分类怪和历史素材一起塞进去会让 index.html 白涨几百 KB。
   用到的口径与 app.js 的 monImg() 三级降级保持一致。 */
function imgData(terms = []) {
  const dir = join(assetsDir, 'img', 'opt');
  const out = {};
  if (!existsSync(dir)) return out;

  const MON = { 方法: 'mon-fangfa', 架构: 'mon-jiagou', 能力: 'mon-nengli', 隐喻: 'mon-yinyu', 营销: 'mon-yingxiao', 失效: 'mon-shixiao' };
  const used = new Set(['mascot-guide', 'boss-jargon', 'scratch-coin']);
  for (const t of terms) {
    used.add(`term-${t.slug}`); /* 词条专属立绘 */
    if (MON[t.category]) used.add(MON[t.category]); /* 该分类的兜底怪 */
  }

  for (const f of readdirSync(dir)) {
    const m = f.match(/^([a-z0-9-]+)\.(webp|avif)$/);
    if (!m || !used.has(m[1])) continue;
    const p = join(dir, f);
    if (out[m[1]] && out[m[1]].size <= statSync(p).size) continue;
    out[m[1]] = {
      size: statSync(p).size,
      uri: `data:image/${m[2]};base64,${readFileSync(p).toString('base64')}`,
    };
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.uri]));
}

/* 属性值转义：链接来自 submit.config.json，进模板前过一道 */
function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function html(terms, dev, sub = {}) {
  const meta = { count: terms.length, generatedAt: new Date().toISOString() };
  const imgs = imgData(terms);
  /* 投词入口：主通道优先，兜底 GitHub；都空不渲染。新标签打开，不抢单页路由 */
  const target = sub.url || sub.github || '';
  const coin = target
    ? ` <a class="fbtn coinbtn" href="${attr(target)}" target="_blank" rel="noopener noreferrer"` +
      ` title="${attr(sub.hint || '撞见没登记的词？投喂它')}">${sub.label || '投喂'}</a>`
    : '';
  const ghLink = sub.github
    ? ` · <a href="${attr(sub.github)}" target="_blank" rel="noopener noreferrer">GitHub 递词</a>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Agent 的黑话图鉴</title>
<style>
${asset('app.css')}
</style>
</head>
<body>
<div class="wrap">

<header class="top">
  <div class="brand">AI Agent 的黑话图鉴<small><span id="n-total">${terms.length}</span> 只在册</small></div>
  <button class="fbtn" id="fbtn" aria-expanded="false" aria-controls="ctl">搜/筛<i>▾</i></button>
  <nav id="tabs" style="display:flex;gap:6px">
    <button class="tab on" data-m="dict">图鉴</button>
    <button class="tab" data-m="quiz">遭遇战</button>
  </nav>${coin}
</header>

<div class="ctl" id="ctl">
  <div class="panel">
    <input id="q" type="search" placeholder="搜词 / 别名 / 真身…" autocomplete="off">
    <div class="chips" id="chips"></div>
  </div>
</div>

<main id="files"></main>
<section id="quiz" hidden></section>

<footer>数据源 terms/*.md · 结构化 dist/lexicon.json${ghLink}</footer>

</div>
<script>
const TERMS = ${JSON.stringify(terms)};
const META = ${JSON.stringify(meta)};
const IMGS = ${JSON.stringify(imgs)};
const SUBMIT = ${JSON.stringify({ url: sub.url || '', github: sub.github || '' })};
${asset('app.js')}
</script>
${dev ? liveReload() : ''}
</body>
</html>`;
}

function liveReload() {
  return `<script>
new EventSource('/__reload').onmessage = () => location.reload();
</scr` + `ipt>`;
}
