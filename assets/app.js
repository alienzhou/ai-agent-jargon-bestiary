/* eslint-env browser */
/* global TERMS, META, IMGS, SUBMIT */
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const IMG = (typeof IMGS !== 'undefined' && IMGS) || {};
/* 投词入口（build 注入）：飞书表单优先，退 GitHub 兜底；都空则页面无 CTA */
const SUB = (typeof SUBMIT !== 'undefined' && (SUBMIT.url || SUBMIT.github)) || '';

/* 分类 -> 怪物立绘 + 稀有度。素材缺失时降级为占位符，不阻塞。 */
const MON = {
  方法: 'mon-fangfa',
  架构: 'mon-jiagou',
  能力: 'mon-nengli',
  隐喻: 'mon-yinyu',
  营销: 'mon-yingxiao',
  失效: 'mon-shixiao',
};
const RARE = { 营销: '★★★★★', 隐喻: '★★★★', 架构: '★★★', 能力: '★★★', 方法: '★★', 失效: '★★' };

/* 立绘三级降级：词条专属 term-{slug} → 分类通用 mon-{分类} → Boss 兜底。
   专属图优先，同分类的词才不会共用同一张脸。 */
const monImg = (t) =>
  IMG[`term-${t.slug}`] || IMG[MON[t.category]] || IMG['boss-jargon'] || '';
/* 文本里的词条本体（含译名、别名）高亮，单次交替匹配避免嵌套 */
function hl(text, t) {
  const words = [...new Set([t.term, t.zh, ...(t.aliases || [])].filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  if (!words.length) return esc(text);
  const re = new RegExp(
    '(' + words.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
    'gi'
  );
  return esc(text).replace(re, '<b class="hl">$1</b>');
}
/* 造句只高亮原词本体：句中出现变体（如「兜底」）不算锚点，构建时也会拦下 */
const hlTerm = (text, t) => hl(text, { term: t.term });
/* 图鉴编号：稳定派生自 slug */
function no(slug) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 999;
  return String(h).padStart(3, '0');
}

let kw = '';
let kwRaw = '';
let cat = '';
let kind = '';
let idx = 0;
const cats = [...new Set(TERMS.map((t) => t.category).filter(Boolean))];

/* 两排筛选：上排「该不该学」（kind），下排「描述什么」（category） */
$('#chips').innerHTML =
  `<div class="row">` +
  ['全部', '术语', '代称']
    .map((c) => {
      const v = c === '全部' ? '' : c;
      return `<button class="chip kchip${v === kind ? ' on' : ''}" data-k="${esc(v)}">${esc(c)}</button>`;
    })
    .join('') +
  `</div><div class="row">` +
  ['全部', ...cats]
    .map((c) => {
      const v = c === '全部' ? '' : c;
      return `<button class="chip${v === cat ? ' on' : ''}" data-c="${esc(v)}">${esc(c)}</button>`;
    })
    .join('') +
  `</div>`;

function match(t) {
  if (cat && t.category !== cat) return false;
  if (kind && (t.kind || '术语') !== kind) return false;
  if (!kw) return true;
  return [t.term, t.zh, t.category, t.kind, t.gloss, t.actually, ...(t.aliases || [])]
    .join(' ')
    .toLowerCase()
    .includes(kw);
}
const filtered = () => TERMS.filter(match);
function syncChips() {
  [...$('#chips').querySelectorAll('.chip')].forEach((x) => {
    if (x.dataset.k !== undefined) x.classList.toggle('on', x.dataset.k === kind);
    else x.classList.toggle('on', x.dataset.c === cat);
  });
}

/* ================= 图鉴：一屏一张卡 ================= */
/* 原话照录：全卡的钩子。先被原话击中，再看人话。不落来源——读者只认这句话本身 */
function quote(t) {
  const s0 = (t.sightings || [])[0];
  if (!s0 || !s0.quote) return '';
  return (
    `<div class="quote"><span class="tag">原话照录</span>` +
    `<div class="say">「${hl(s0.quote, t)}」</div>` +
    (s0.note ? `<div class="yi">${hl(s0.note, t)}</div>` : '') +
    `</div>`
  );
}

function card(t) {
  const art = monImg(t);
  const kind = t.kind || '术语';
  const hasQuote = !!((t.sightings || [])[0] || {}).quote;
  return (
    `<article class="card">` +
    `<div class="banner"><span class="no">NO.${no(t.slug)}</span>` +
    `<span>${esc(t.zh || 'JARGON BESTIARY')}</span>` +
    `<span class="rare">${RARE[t.category] || '★★'}</span></div>` +
    /* 立绘和词头并排：竖排会把正文全挤出首屏 */
    `<div class="head">` +
    `<div class="art">` +
    (art ? `<img src="${art}" alt="${esc(t.term)}">` : `<div class="none">?</div>`) +
    `</div>` +
    `<div class="name"><div class="hw">${esc(t.term)}</div>` +
    `<div class="sub">${esc(t.zh || (t.category ? t.category + '系黑话' : ''))}<span class="slug">/${esc(t.slug)}/</span></div>` +
    `<div class="badges">` +
    (t.category ? `<span class="cat">${esc(t.category)}系</span>` : '') +
    `<span class="${kind === '代称' ? 'k-alias' : 'k-term'}">${esc(kind)}</span>` +
    `</div></div>` +
    `</div>` +
    `<div class="body">` +
    quote(t) +
    /* 没有目击记录时，真身气泡兜底（它仍然是遭遇战结算的常驻内容） */
    (!hasQuote && t.actually
      ? `<div class="bubble truth"><span class="tag">真身</span>${hl(t.actually, t)}</div>`
      : '') +
    `<div class="bubble scratch"><span class="tag">人话</span>${esc(t.gloss)}</div>` +
    (t.aliases && t.aliases.length
      ? `<div class="tags">${t.aliases.map((a) => `<i>${esc(a)}</i>`).join('')}</div>`
      : '') +
    `</div>` +
    foot(t) +
    `</article>`
  );
}

/* 卡脚只留「出身」一条。批注/入册/多余目击都在数据里，页面不摆 */
function foot(t) {
  return t.origin ? `<div class="foot"><b>出身</b> ${esc(t.origin)}</div>` : '';
}

/* 投喂位：图鉴缺口处的收编入口。用户带着词来搜却没搜到，正是最强的投稿动机 */
function lure(title, desc) {
  return (
    `<div class="lure"><div class="lure-t">${esc(title)}</div>` +
    `<div class="lure-d">${esc(desc)}</div>` +
    `<a class="lure-btn" href="${esc(SUB)}" target="_blank" rel="noopener noreferrer">＋ 丢个词进来</a></div>`
  );
}

function renderDict() {
  const list = filtered();
  const total = list.length;
  if (!total) {
    $('#files').innerHTML =
      `<div class="void">这一片没有黑话出没</div>` +
      (SUB
        ? lure(
            kwRaw ? `「${kwRaw}」还没被登记` : '这里还空着',
            kwRaw ? '你是第一个撞见它的人——丢过来，它就有卡了' : '图鉴靠大家喂，丢一个词进来就热闹了'
          )
        : '');
    return;
  }
  idx = Math.min(Math.max(idx, 0), total - 1);
  const t = list[idx];
  /* 翻页条放在卡片之前并吸顶：卡片高度随词条内容浮动，按钮跟在卡尾会一直跳位，
     连点几只就得重新找按钮。钉在顶部后位置恒定，可以一直点。 */
  $('#files').innerHTML =
    `<div class="pager">` +
    `<button class="pg" id="pg-prev"${idx === 0 ? ' disabled' : ''}>← 上一只</button>` +
    `<span class="count">${idx + 1} / ${total}<small>${total !== TERMS.length ? '已筛选' : '已收录'}</small></span>` +
    `<button class="pg" id="pg-next"${idx === total - 1 ? ' disabled' : ''}>下一只 →</button>` +
    `</div>` +
    card(t) +
    /* 翻到最后一只：图鉴的边界就是投稿入口——你撞见的下一只，图鉴里还没有 */
    (idx === total - 1 && SUB
      ? lure('图鉴到这里就翻完了', `在册 ${TERMS.length} 只——剩下的靠大家喂。你手上那只，图鉴还没有`)
      : '');
  $('#pg-prev').onclick = () => nav(-1);
  $('#pg-next').onclick = () => nav(1);
  [...$('#files').querySelectorAll('.scratch:not(.open)')].forEach(initScratch);
}

function nav(d) {
  const list = filtered();
  const n = Math.min(Math.max(idx + d, 0), list.length - 1);
  if (n === idx || !list[n]) return;
  SFX.play('page', d); /* 音高区分前进/后退，连翻时耳朵能跟上位置 */
  idx = n;
  location.hash = `#/dict/${list[idx].slug}`;
}

function refilter() {
  idx = 0;
  syncFbtn();
  renderDict();
  const t = filtered()[0];
  history.replaceState(null, '', t ? `#/dict/${t.slug}` : '#/dict');
}

$('#chips').onclick = (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  SFX.play('tick');
  if (b.dataset.k !== undefined) kind = b.dataset.k;
  else cat = b.dataset.c;
  syncChips();
  refilter();
};
$('#q').oninput = (e) => {
  kwRaw = e.target.value.trim();
  kw = kwRaw.toLowerCase();
  refilter();
};

/* 搜/筛折叠：首屏高度全给卡片。按钮同时是状态显示器——
   收起时也能从按钮文案看出当前筛在哪一格。 */
function syncFbtn() {
  const on = [kind, cat].filter(Boolean);
  if (kw) on.push(`"${kw}"`);
  const b = $('#fbtn');
  b.classList.toggle('act', on.length > 0);
  b.firstChild.nodeValue = on.length ? on.join(' · ') : '搜/筛';
}
$('#fbtn').onclick = () => {
  const open = $('#ctl').classList.toggle('open');
  SFX.play('tick');
  $('#fbtn').classList.toggle('open', open);
  $('#fbtn').setAttribute('aria-expanded', String(open));
  if (open) $('#q').focus();
};

/* 刮刮卡：真涂层。canvas 盖在文字上，拖哪刮哪，刮掉一半自动全开。 */
function initScratch(el) {
  const cv = document.createElement('canvas');
  el.appendChild(cv);
  const dpr = window.devicePixelRatio || 1;
  const w = cv.offsetWidth;
  const h = cv.offsetHeight;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* 涂层：银色刮奖票质感 —— 斜纹银底 + 虚线刀模框 + 金币徽章 + 提示字 */
  const coin = IMG['scratch-coin'] ? new Image() : null;
  if (coin) coin.src = IMG['scratch-coin'];
  const rrect = (x, y, rw, rh, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  };
  const paint = () => {
    ctx.globalCompositeOperation = 'source-over'; /* 刮过之后 onload 重绘也不能变橡皮 */
    /* 银底：对角渐变，像真刮奖涂层的金属感 */
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d6d1c3');
    g.addColorStop(0.5, '#b8b2a0');
    g.addColorStop(1, '#cfc9b9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    /* 细斜纹 */
    ctx.strokeStyle = 'rgba(26,24,21,0.055)';
    ctx.lineWidth = 5;
    for (let x = -h; x < w + h; x += 13) {
      ctx.beginPath();
      ctx.moveTo(x, h + 8);
      ctx.lineTo(x + h + 8, -8);
      ctx.stroke();
    }
    /* 虚线刀模框：刮奖票沿这条线撕 */
    ctx.strokeStyle = 'rgba(26,24,21,0.5)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 6]);
    rrect(9, 9, w - 18, h - 18, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    /* 金币徽章：圆形裁切盖掉奶白底，像印在票上的钢印 */
    const hasCoin = coin && coin.complete && coin.naturalWidth;
    const ch = hasCoin ? Math.min(50, h - 40) : 0;
    if (hasCoin) {
      const cx = w / 2;
      const cy = h / 2 - 12;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, ch / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(coin, cx - ch / 2, cy - ch / 2, ch, ch);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, ch / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#1a1815';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    /* 提示字 */
    ctx.fillStyle = '#1a1815';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.letterSpacing = '5px';
    } catch (e) { /* 老内核没有 letterSpacing，不碍事 */ }
    ctx.fillText('刮我', w / 2 + 2, hasCoin ? h / 2 + 26 : h / 2);
  };
  if (coin) coin.onload = paint;
  paint();

  let down = false;
  let last = null;
  let moves = 0;

  function erase(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 19, 0, Math.PI * 2);
    ctx.fill();
  }
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function cleared() {
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 9) {
      total++;
      if (data[i] < 128) n++;
    }
    return n / total;
  }
  function reveal() {
    el.classList.add('open');
    cv.classList.add('gone');
    SFX.play('reveal');
    setTimeout(() => cv.remove(), 450);
  }
  /* 刮擦声按时间节流：pointermove 一秒几十次，逐次触发会叠成一片白噪音 */
  let lastSfx = 0;
  function scratchSfx() {
    const now = performance.now();
    if (now - lastSfx < 110) return;
    lastSfx = now;
    SFX.play('scratch');
  }

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    down = true;
    cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    last = p;
    erase(p.x, p.y);
    scratchSfx();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!down) return;
    const p = pos(e);
    if (last) {
      /* 两点之间补上圆点，快速划动不会断线 */
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const steps = Math.max(1, Math.hypot(dx, dy) / 6 | 0);
      for (let i = 1; i <= steps; i++) erase(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
    }
    last = p;
    scratchSfx();
    if (++moves % 7 === 0 && cleared() > 0.5) reveal();
  });
  cv.addEventListener('pointerup', () => {
    down = false;
    if (moves > 2 && cleared() > 0.5) reveal();
  });
  cv.addEventListener('pointercancel', () => { down = false; });
  cv.addEventListener('dblclick', reveal); /* 没耐心的直接双击 */
}

/* ================= 模式 + 路由 ================= */
function setMode(m) {
  [...$('#tabs').children].forEach((x) => x.classList.toggle('on', x.dataset.m === m));
  const q = m === 'quiz';
  $('#ctl').hidden = q;
  $('#fbtn').hidden = q; /* 遭遇战里没有筛选可言 */
  $('#files').hidden = q;
  $('#quiz').hidden = !q;
  if (q) startQuiz();
  else renderDict();
}

$('#tabs').onclick = (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  SFX.play('swap');
  const t = filtered()[idx];
  location.hash = b.dataset.m === 'quiz' ? '#/quiz' : t ? `#/dict/${t.slug}` : '#/dict';
};

function route() {
  const h = location.hash || '';
  if (h.startsWith('#/quiz')) return setMode('quiz');
  const m = h.match(/^#\/dict\/(.+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    let i = filtered().findIndex((t) => t.slug === slug);
    if (i < 0) {
      kw = '';
      cat = '';
      kind = '';
      $('#q').value = '';
      syncChips();
      i = filtered().findIndex((t) => t.slug === slug);
    }
    if (i >= 0) idx = i;
  }
  syncFbtn();
  setMode('dict');
}
window.addEventListener('hashchange', route);

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if ($('#boot')) return;
  if (!$('#quiz').hidden) {
    if ((e.key === 'ArrowRight' || e.key === 'Enter') && $('.go')) $('.go').click();
    return;
  }
  if (e.key === 'ArrowLeft') nav(-1);
  if (e.key === 'ArrowRight') nav(1);
});

/* ================= 遭遇战：谁没在瞎说 ================= */
const LTR = ['A', 'B', 'C', 'D'];
const ASK = [
  '四个人都用了这个词。谁没在瞎说？',
  '三份口供在装懂。指认那个说人话的。',
  '只有一句用对了。剩下三句纯属瞎编。',
  '四选一。选错了它就长大一圈。',
];
const BUST = ['查无此意', '装懂', '瞎说', '硬凑'];
const POP = ['MISS!', 'OOPS!', 'BONK!', '???'];

let qs = [];
let qi = 0;
let hits = 0;
let misses = [];

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startQuiz() {
  const pool = TERMS.filter((t) => t.usage && t.usage.right?.text && (t.usage.wrong || []).length);
  qs = shuffle(pool).slice(0, Math.min(10, pool.length));
  qi = 0;
  hits = 0;
  misses = [];
  if (!qs.length) {
    $('#quiz').innerHTML = '<div class="void">没有可打的怪<br>词条需要 usage 字段</div>';
    return;
  }
  renderQ();
}

function renderQ() {
  const t = qs[qi];
  const u = t.usage;
  const opts = shuffle([
    { txt: u.right.text, why: u.right.why, ok: 1 },
    ...shuffle(u.wrong)
      .slice(0, 3)
      .map((w) => ({ txt: w.text, why: w.why, ok: 0 })),
  ]);
  qs[qi]._opts = opts;
  const art = monImg(t);
  $('#quiz').innerHTML =
    `<div class="field" id="field">` +
    `<div class="hud"><span>第 ${qi + 1}/${qs.length} 关</span>` +
    `<span class="hp"><i style="width:${100 - (qi / qs.length) * 100}%"></i></span>` +
    `<span>识破 ${hits}</span></div>` +
    `<div class="foe" id="foe">` +
    (art ? `<img src="${art}" alt="">` : '') +
    `<div class="plate">${esc(t.term)}</div></div>` +
    `<div class="ask">${ASK[qi % ASK.length]}<small>本环节不教学，只嘲讽</small></div>` +
    `<div id="opts">${opts
      .map(
        (o, i) =>
          `<button class="opt" data-ok="${o.ok}" data-i="${i}">` +
          `<span class="ltr">${LTR[i]}</span>「${hlTerm(o.txt, t)}」</button>`
      )
      .join('')}</div>` +
    `<div id="verdict"></div></div>`;
  $('#opts').onclick = (e) => {
    const b = e.target.closest('.opt');
    if (b && !b.disabled) answer(b, t);
  };
}

function answer(btn, t) {
  const opts = t._opts;
  const ok = btn.dataset.ok === '1';
  ok ? hits++ : misses.push(t);

  [...$('#opts').children].forEach((b, i) => {
    b.disabled = true;
    const o = opts[i];
    b.classList.add(o.ok ? 'yes' : 'no');
    if (!o.ok && b !== btn) b.classList.add('out');
    b.insertAdjacentHTML(
      'beforeend',
      `<span class="why">${o.ok ? '✓ 就他没瞎说' : '✗ ' + BUST[i % BUST.length]}：${esc(o.why)}</span>`
    );
  });

  const f = $('#field');
  if (ok) {
    SFX.play('hit');
    $('#foe').classList.add('dmg');
    f.insertAdjacentHTML('beforeend', `<div class="pop">HIT!</div>`);
  } else {
    SFX.play('miss');
    f.classList.add('hit');
    f.insertAdjacentHTML('beforeend', `<div class="pop">${POP[qi % POP.length]}</div>`);
  }
  setTimeout(() => f.querySelector('.pop')?.remove(), 950);

  const r = [];
  if (t.actually) r.push(`<p><span class="k">真身</span>${hl(t.actually, t)}</p>`);
  if (t.gloss) r.push(`<p><span class="k">人话</span>${esc(t.gloss)}</p>`);
  $('#verdict').innerHTML =
    `<div class="verdict">${r.join('')}</div>` +
    `<button class="go">${qi < qs.length - 1 ? '下一只 →' : '看战绩 →'}</button>`;
  $('.go').onclick = () => {
    SFX.play('page', 1);
    qi++;
    qi < qs.length ? renderQ() : renderResult();
  };
}

function rank(n, total) {
  const r = total ? n / total : 0;
  if (r === 1) return '黑话免疫体 · 建议去当翻译';
  if (r >= 0.7) return '识破率良好 · 会上能救人';
  if (r >= 0.4) return '半信半疑 · 危险区间';
  if (r > 0) return '基本靠猜 · 建议少点头';
  return '全线沦陷 · 你就是黑话本身';
}

function renderResult() {
  /* 结算音跟着评级走：及格线以上放胜利旋律，以下放泄气下行 */
  SFX.play(qs.length && hits / qs.length >= 0.7 ? 'win' : 'lose');
  $('#quiz').innerHTML =
    `<div class="field"><div class="result">` +
    (IMG['mascot-guide'] ? `<img class="guide" src="${IMG['mascot-guide']}" alt="">` : '') +
    `<div class="n">${hits}<small>/${qs.length}</small></div>` +
    `<div class="cap">${rank(hits, qs.length)}</div>` +
    (misses.length
      ? `<div class="leaks"><h4>被糊住的词</h4>${misses
          .map((m) => `<div><b>${esc(m.term)}</b> — ${esc(m.gloss)}</div>`)
          .join('')}</div>`
      : '') +
    `<button class="go" id="again">再来一局</button>` +
    (SUB ? `<a class="lure-btn" href="${esc(SUB)}" target="_blank" rel="noopener noreferrer">＋ 丢个词进来，一起攒这本图鉴</a>` : '') +
    `</div></div>`;
  $('#again').onclick = () => {
    SFX.play('coin'); /* 再来一局＝再投一枚币 */
    startQuiz();
  };
}

/* ================= 启动 ================= */
/* 翻页条要吸在顶部条正下方，而顶部条高度随字号/换行变化，量出来写进 CSS 变量 */
function syncTopH() {
  const h = $('.top')?.offsetHeight;
  if (h) document.documentElement.style.setProperty('--topH', h + 'px');
}
syncTopH();
addEventListener('resize', syncTopH);

if (META && META.count != null) $('#n-total').textContent = META.count;

/* 静音开关：有声音就必须有关掉它的地方——办公室里打开这页不该被出卖。
   状态存 localStorage，下次进来仍然是静音。 */
(function sfxToggle() {
  const b = $('#sfx');
  if (!b) return;
  const sync = () => {
    b.textContent = SFX.on ? '🔊' : '🔇';
    b.classList.toggle('off', !SFX.on);
    b.setAttribute('aria-label', SFX.on ? '关闭音效' : '开启音效');
    b.setAttribute('aria-pressed', String(!SFX.on));
  };
  b.onclick = () => {
    SFX.toggle();
    sync();
  };
  sync();
})();
route();

/* ================= 投币开场 =================
   四拍：待机闪烁 → 金币落进币口（叮）→ CRT 通电（琶音 + 扫描线）→ 退场。
   这里同时是整站音频的点火点：AudioContext 必须诞生在用户手势里，
   而「点击投币」天然就是第一次手势——把它挪走音效会被浏览器静音策略掐掉。

   全程可跳过：动效跑着的时候再点一下直接落地，不许让开场挡路。 */
(function boot() {
  const el = document.createElement('div');
  el.id = 'boot';
  el.innerHTML =
    `<div class="boot-in">` +
    `<div class="logo">AI Agent 的<br>黑话图鉴</div>` +
    `<div class="sub">Jargon Bestiary</div>` +
    (IMG['mascot-guide'] ? `<img class="guide" src="${IMG['mascot-guide']}" alt="">` : '') +
    /* 币口是真的投币口：金币动画沿它落下，落点和这个槽对齐 */
    `<div class="slot"><i class="coin-fly"></i><span class="mouth"></span>` +
    `<em class="lit">INSERT COIN</em></div>` +
    `<div class="coin">▶ 点击投币开始 · 已收录 ${TERMS.length} 只</div>` +
    `<div class="ready">CREDIT 1 &nbsp;·&nbsp; PUSH START</div>` +
    `</div><div class="crt"></div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  let started = false;
  let timers = [];
  const done = () => {
    timers.forEach(clearTimeout);
    el.classList.add('gone');
    document.body.style.overflow = '';
    setTimeout(() => el.remove(), 500);
  };

  const start = () => {
    if (started) return done(); /* 二次点击 = 跳过剩余动效 */
    started = true;
    el.classList.add('inserting');
    SFX.play('coin'); /* 第一声：AudioContext 在这一刻被创建 */
    /* 减弱动效偏好下，全局 CSS 把动画压到 0.01ms，再等 1.5 秒就是干瞪眼。
       声音留着（那不是动效），画面直接进场。 */
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      SFX.play('boot');
      return timers.push(setTimeout(done, 120));
    }
    /* 金币落到底 → 机器通电 → 亮一下 → 走人。时序和 CSS 动画长度对齐 */
    timers.push(setTimeout(() => {
      el.classList.add('powered');
      SFX.play('boot');
    }, 620));
    timers.push(setTimeout(done, 1560));
  };

  ['click', 'pointerdown', 'touchstart'].forEach((ev) =>
    el.addEventListener(ev, start, { passive: true })
  );
  el.addEventListener('wheel', start, { passive: true });
  document.addEventListener('keydown', function k(e) {
    if (e.key === 'Tab') return; /* 留给键盘用户先看清界面 */
    start();
    document.removeEventListener('keydown', k);
  });
})();
