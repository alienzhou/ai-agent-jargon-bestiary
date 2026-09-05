/* eslint-env browser */
/* ============ SFX：8-bit 街机音效（纯合成，零素材） ============
   不引任何音频文件：页面要保持单文件 + 零外部请求，塞 mp3 会让 index.html
   直接涨几百 KB。全部用 Web Audio 现场合成方波/三角波/噪声——代价是这段代码，
   收益是 0 字节素材、任意音高时长随便调。

   两条硬约束：
   1. AudioContext 必须在用户手势里创建/恢复，否则被自动播放策略挂起。
      入口就是投币那一下 —— 开场页天然承担了「第一次用户手势」的角色。
   2. 任何一步失败都必须静默降级：没有 Web Audio 的环境，页面照常能玩。 */
const SFX = (() => {
  let ac = null;
  let master = null;
  let on = true;
  try {
    on = localStorage.getItem('jb-sfx') !== 'off';
  } catch (e) { /* 隐私模式禁 localStorage，当作开 */ }

  /* 懒创建：脚本加载时就 new AudioContext 会被浏览器挂起并在控制台报警告 */
  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.28; /* 街机味要够，但不能吓到人 */
      master.connect(ac.destination);
    } catch (e) {
      ac = null;
    }
    return ac;
  }

  /* 噪声源：金属撞击、刮擦都靠它。1 秒缓冲循环取用，够所有音效切片 */
  let noiseBuf = null;
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /* 单音：type 波形 + 线性/指数包络。freq 可给 [起, 落] 做滑音（街机的灵魂） */
  function tone(freq, dur, opt = {}) {
    const c = ctx();
    if (!c || !on) return;
    const t = c.currentTime + (opt.at || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opt.type || 'square';
    if (Array.isArray(freq)) {
      o.frequency.setValueAtTime(freq[0], t);
      o.frequency[opt.glide === 'exp' ? 'exponentialRampToValueAtTime' : 'linearRampToValueAtTime'](
        Math.max(freq[1], 1),
        t + dur
      );
    } else {
      o.frequency.setValueAtTime(freq, t);
    }
    const v = opt.vol == null ? 0.5 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006); /* 极短 attack = 芯片音的脆 */
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /* 噪声切片：hiss（沙）/ metal（金属，带 bandpass 出音高感） */
  function hiss(dur, opt = {}) {
    const c = ctx();
    if (!c || !on) return;
    const t = c.currentTime + (opt.at || 0);
    const s = c.createBufferSource();
    s.buffer = noise(c);
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = opt.filter || 'highpass';
    f.frequency.value = opt.cut || 1200;
    if (opt.q) f.Q.value = opt.q;
    const g = c.createGain();
    const v = opt.vol == null ? 0.25 : opt.vol;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  /* 音序：[频率, 起始秒, 时长] 列表，谱曲用 */
  const seq = (notes, opt = {}) =>
    notes.forEach(([f, at, d]) => tone(f, d, { ...opt, at }));

  /* ---- 音色表：改这里就是改整个页面的听感 ---- */
  const BANK = {
    /* 投币：金属落进钱箱（两声高频噪声撞击）+ 经典上行双音 */
    coin() {
      hiss(0.05, { filter: 'bandpass', cut: 3800, q: 3, vol: 0.3 });
      hiss(0.07, { filter: 'bandpass', cut: 2600, q: 4, vol: 0.22, at: 0.07 });
      tone(988, 0.09, { vol: 0.4 });
      tone(1319, 0.42, { at: 0.09, vol: 0.4 });
    },
    /* 开机：上行大三和弦琶音，机器醒了 */
    boot() {
      seq(
        [
          [523, 0, 0.1],
          [659, 0.09, 0.1],
          [784, 0.18, 0.1],
          [1047, 0.27, 0.34],
        ],
        { vol: 0.34 }
      );
      hiss(0.5, { cut: 5200, vol: 0.05 }); /* CRT 通电的底噪 */
    },
    /* 翻页：一声短 blip，方向决定音高（听感上能分清前进/后退） */
    page(dir) {
      tone(dir < 0 ? [740, 560] : [560, 880], 0.07, { vol: 0.26, type: 'square' });
    },
    /* UI 点击：极短三角波 tick，高频次交互不能吵 */
    tick() {
      tone(1200, 0.03, { vol: 0.16, type: 'triangle' });
    },
    /* 切页签：扫频 whoosh */
    swap() {
      tone([300, 1000], 0.13, { vol: 0.2, type: 'triangle' });
      hiss(0.13, { cut: 2000, vol: 0.06 });
    },
    /* 刮开涂层：沙沙声。刮的过程连续触发，音量必须很低 */
    scratch() {
      hiss(0.09, { filter: 'bandpass', cut: 1800, q: 0.8, vol: 0.09 });
    },
    /* 刮完：叮——奖品出现 */
    reveal() {
      seq(
        [
          [784, 0, 0.08],
          [1047, 0.07, 0.08],
          [1568, 0.14, 0.3],
        ],
        { vol: 0.3, type: 'triangle' }
      );
    },
    /* 答对：命中，上行三连 + 一记打击 */
    hit() {
      hiss(0.05, { filter: 'bandpass', cut: 3000, q: 2, vol: 0.2 });
      seq(
        [
          [659, 0, 0.07],
          [880, 0.06, 0.07],
          [1319, 0.12, 0.26],
        ],
        { vol: 0.36 }
      );
    },
    /* 答错：下行滑音 + 低频闷响，经典 game over 的短版 */
    miss() {
      tone([392, 98], 0.42, { vol: 0.3, type: 'sawtooth', glide: 'exp' });
      tone(73, 0.3, { vol: 0.25, type: 'square', at: 0.04 });
    },
    /* 通关高分：胜利小旋律 */
    win() {
      seq(
        [
          [523, 0, 0.1],
          [659, 0.1, 0.1],
          [784, 0.2, 0.1],
          [1047, 0.3, 0.12],
          [784, 0.44, 0.1],
          [1047, 0.54, 0.5],
        ],
        { vol: 0.34 }
      );
    },
    /* 低分：泄气的下行 */
    lose() {
      seq(
        [
          [523, 0, 0.14],
          [494, 0.14, 0.14],
          [440, 0.28, 0.14],
          [415, 0.42, 0.5],
        ],
        { vol: 0.3, type: 'sawtooth' }
      );
    },
  };

  /* 唯一出口。未知音效名静默忽略，调用点写错不炸页面 */
  function play(name, arg) {
    if (!on) return;
    try {
      const c = ctx();
      if (c && c.state === 'suspended') c.resume(); /* 切后台回来会被挂起 */
      BANK[name]?.(arg);
    } catch (e) { /* 音效永远不该阻断主流程 */ }
  }

  return {
    play,
    get on() {
      return on;
    },
    /* 静音开关：写盘持久化，下次进来还记得 */
    toggle() {
      on = !on;
      try {
        localStorage.setItem('jb-sfx', on ? 'on' : 'off');
      } catch (e) { /* 存不了就只在本次会话生效 */ }
      if (on) play('tick');
      return on;
    },
  };
})();
