/**
 * 词条格式校验：把 CONTRIBUTING.md 里的收录规范变成可执行断言。
 *
 * 这里是收词规范的**唯一事实源**——build.mjs 复用本文件的 error 级规则，
 * 不再各写一套。改规范先改这里，再去改 CONTRIBUTING.md 的说明文字。
 *
 * 两级严重度：
 *   error —— 会让页面出错或数据契约破裂，构建直接失败
 *   warn  —— 不影响运行但偏离规范（多半是内容质量问题），只提示
 *
 * 用法：
 *   npm run lint            校验 terms/ 全部词条
 *   npm run lint -- taizhang  只校验某几条
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const termsDir = join(root, 'terms');
const optDir = join(root, 'assets', 'img', 'opt');

/* 与 CONTRIBUTING.md 的分类表 / 词性表保持一致。
   加新分类要同步改三处：这里、app.js 的 MON+RARE 表、build.mjs 的 imgData() */
export const CATEGORIES = ['方法', '架构', '能力', '隐喻', '营销', '失效'];
export const KINDS = ['术语', '代称'];

const DECOY_COUNT = 3; // 页面按四选一出题，恰好 3 条干扰项
const MIN_WRONG = 3; // 遭遇战随机抽 3 条误用配 1 条正解，少于 3 条抽不满

/** 词条本体的全部形态：正名 + 译名 + 别名。高亮和造句锚点都认这些 */
const bodies = (m) => [m.term, m.zh, ...(m.aliases || [])].filter(Boolean).map(String);

const has = (text, words) => {
  const t = String(text).toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
};

/** 截断长文本，报错信息里只留够定位的一截 */
const clip = (s, n = 42) => {
  const t = String(s).replace(/\s+/g, ' ');
  return t.length > n ? t.slice(0, n) + '…' : t;
};

/**
 * 校验单条词条。
 * @returns {{slug:string, errors:string[], warnings:string[]}}
 */
export function lintTerm(file, { checkArt = true } = {}) {
  const slug = basename(file, '.md');
  const errors = [];
  const warnings = [];
  const E = (m) => errors.push(m);
  const W = (m) => warnings.push(m);

  /* slug 直接进 URL（#/dict/{slug}）和图片文件名，必须是安全字符 */
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    E(`文件名要用小写英文 + 短横线（当前「${slug}」），它会进 URL 和图片名`);
  }

  const raw = readFileSync(join(termsDir, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { slug, errors: ['缺少 YAML frontmatter'], warnings };

  /* 词条是纯 frontmatter，正文区必须是空的——写了也不会被解析，是白写 */
  if (raw.slice(m[0].length).trim()) {
    W('frontmatter 之后还有正文，但词条是纯字段结构，这段内容不会被解析');
  }

  let meta;
  try {
    meta = yaml.load(m[1]) || {};
  } catch (err) {
    return { slug, errors: [`YAML 解析失败：${err.message}`], warnings };
  }

  // ── 必填字段 ────────────────────────────────────────────────
  for (const k of ['term', 'gloss', 'actually']) {
    if (!meta[k]) E(`缺少必填字段 ${k}`);
  }
  if (errors.length) return { slug, errors, warnings };

  const words = bodies(meta);

  // ── 枚举字段 ────────────────────────────────────────────────
  if (!meta.category) {
    W('没写 category，页面会缺分类徽章和稀有度');
  } else if (!CATEGORIES.includes(meta.category)) {
    E(`category「${meta.category}」不在分类表内：${CATEGORIES.join(' / ')}`);
  }
  if (meta.kind && !KINDS.includes(meta.kind)) {
    E(`kind「${meta.kind}」不在词性表内：${KINDS.join(' / ')}`);
  }
  if (!meta.kind) W('没写 kind，按缺省当「术语」处理；这词若是代称，读者会误以为值得学');

  // ── 日期 ────────────────────────────────────────────────────
  const addedStr = meta.added instanceof Date
    ? meta.added.toISOString().slice(0, 10)
    : String(meta.added ?? '');
  if (!meta.added) W('没写 added 收录日期');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(addedStr)) E(`added 要写成 YYYY-MM-DD（当前「${addedStr}」）`);

  // ── actually：真身高亮的锚点 ────────────────────────────────
  if (meta.actually && !has(meta.actually, words)) {
    E(`actually 里没出现词条本体（${words.join(' / ')}），页面的真身高亮会落空`);
  }

  // ── gloss：人话翻译，刮开涂层后的那句 ───────────────────────
  if (meta.gloss) {
    const g = String(meta.gloss);
    if (g.length > 60) W(`gloss 偏长（${g.length} 字），刮刮气泡放不下，一句话说完最好`);
    /* gloss 是「说人话」，用词条自己解释自己等于没翻译 */
    if (has(g, words)) W(`gloss 里又出现了词条本体，等于用它解释它自己：「${clip(g)}」`);
  }

  // ── sightings：这个项目的立场，词条靠「捡」不靠查 ───────────
  const sightings = meta.sightings || [];
  if (!sightings.length) {
    E('没有 sightings。词条要有出处——是在哪撞见的原话，不是从术语表抄的');
  }
  sightings.forEach((s, i) => {
    if (!s?.quote) E(`sightings[${i}] 缺 quote，原话是全卡的钩子`);
    else if (!has(s.quote, words)) {
      W(`sightings[${i}].quote 里没出现词条本体，原话要照录：「${clip(s.quote)}」`);
    }
    if (!s?.source) W(`sightings[${i}] 缺 source（在哪撞见的）`);
  });

  // ── usage：遭遇战题目 ───────────────────────────────────────
  if (!meta.usage) {
    W('没写 usage，这条词不会出现在遭遇战里');
  } else {
    const right = meta.usage.right;
    const wrong = meta.usage.wrong || [];
    if (!right?.text) E('usage.right.text 缺失，测验没有正确答案');
    if (!right?.why) W('usage.right.why 缺失，答对了没有那句收尾的吐槽');
    if (wrong.length < MIN_WRONG) {
      E(`usage.wrong 只有 ${wrong.length} 条，页面要随机抽 ${MIN_WRONG} 条，至少给 ${MIN_WRONG} 条`);
    }

    /* 造句必须一字不差含原词：测验靠它做唯一锚点，同义变体会让高亮落空。
       注意这里只认 meta.term 本体，不放宽到别名——选项里出现的必须是被考的那个词 */
    const all = [right?.text, ...wrong.map((w) => w?.text)].filter(Boolean);
    for (const s of all) {
      if (!String(s).toLowerCase().includes(String(meta.term).toLowerCase())) {
        E(`usage 造句必须一字不差包含「${meta.term}」（同义变体不算）：「${clip(s)}」`);
      }
    }
    wrong.forEach((w, i) => {
      if (!w?.why) W(`usage.wrong[${i}] 缺 why，笑点就在这句上`);
    });

    /* 正解要朴素到「就这？」。但误用是短促荒诞句（「路边有一只抬杠在汪汪叫」），
       正解是完整的工作句，天然长一截——实测 13 条现存词条的中位数就在 1.9 倍。
       所以只抓真正离群的（>2.8 倍），那种通常是正解里塞了从句和解释。 */
    if (right?.text && wrong.length) {
      const avgWrong = wrong.reduce((a, w) => a + String(w?.text || '').length, 0) / wrong.length;
      if (String(right.text).length > avgWrong * 2.8) {
        W(`usage.right.text 比误用平均长 ${(String(right.text).length / avgWrong).toFixed(1)} 倍；正解要朴素平淡，太长就露馅了`);
      }
    }
  }

  // ── decoys：留给外部消费者的备用题型 ────────────────────────
  const decoys = meta.decoys || [];
  if (decoys.length !== DECOY_COUNT) {
    E(`decoys 要恰好 ${DECOY_COUNT} 条（当前 ${decoys.length} 条），四选一题型靠它凑选项`);
  }
  if (meta.gloss && decoys.length) {
    /* 干扰项要和正解句式长度接近，长度差太多等于把答案标出来 */
    const gl = String(meta.gloss).length;
    decoys.forEach((d, i) => {
      const dl = String(d).length;
      if (dl < gl * 0.4 || dl > gl * 2.5) {
        W(`decoys[${i}] 与 gloss 长度差距过大（${dl} vs ${gl}），长度本身就成了提示`);
      }
      if (has(d, words)) W(`decoys[${i}] 里出现了词条本体，干扰项不该自报家门`);
    });
  }

  // ── 专属立绘 ────────────────────────────────────────────────
  if (checkArt) {
    const hasArt = ['webp', 'avif'].some((ext) => existsSync(join(optDir, `term-${slug}.${ext}`)));
    if (!hasArt) {
      W(`没有专属立绘 assets/img/opt/term-${slug}.{webp,avif}，页面会降级用分类通用怪`);
    }
  }

  return { slug, errors, warnings };
}

/** 批量校验。only 为空则校验全部 */
export function lintAll(only = [], opts = {}) {
  const files = readdirSync(termsDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .filter((f) => !only.length || only.includes(basename(f, '.md')));
  return files.map((f) => lintTerm(f, opts));
}

// ── CLI ───────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('lint-terms.mjs')) {
  const only = process.argv.slice(2).map((s) => s.replace(/\.md$/, ''));
  const results = lintAll(only);

  if (!results.length) {
    console.error(only.length ? `没找到词条：${only.join(', ')}` : 'terms/ 下没有词条');
    process.exit(1);
  }

  let nE = 0;
  let nW = 0;
  for (const { slug, errors, warnings } of results) {
    nE += errors.length;
    nW += warnings.length;
    if (!errors.length && !warnings.length) continue;
    console.log(`\n${slug}`);
    for (const m of errors) console.log(`  ✗ ${m}`);
    for (const m of warnings) console.log(`  ⚠ ${m}`);
  }

  const tail = `\n${results.length} 条词条：${nE} 个错误，${nW} 个提示`;
  if (nE) {
    console.log(`${tail} —— 错误会让构建失败，先修掉`);
    process.exit(1);
  }
  console.log(nW ? `${tail} —— 提示不阻塞构建，但值得看一眼` : `${tail}，全部通过 ✓`);
}
