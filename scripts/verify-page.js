/* 校验怪兽图鉴页面：翻页条吸顶生效 + 每个词条都有专属立绘。
   一次性返回结论，避免逐屏截图。

   用法：在浏览器打开 dist/index.html（或 npm run dev 起的本地地址），
   把本文件整段贴进 DevTools Console 执行；返回一段 JSON 结论。
   任何浏览器自动化工具能「在页面里执行一段 JS 并取回返回值」的话，
   直接把本文件内容作为脚本传进去即可，不依赖特定工具。 */
(() => {
  const boot = document.getElementById('boot');
  if (boot) boot.remove();
  document.body.style.overflow = '';

  const out = { steps: [] };
  const pager = document.querySelector('.pager');
  const files = document.getElementById('files');
  const cs = pager && getComputedStyle(pager);

  out.pagerExists = !!pager;
  out.pagerPosition = cs && cs.position;
  out.pagerTop = cs && cs.top;
  out.topH = getComputedStyle(document.documentElement).getPropertyValue('--topH').trim();
  /* 翻页条必须排在卡片前面，才可能吸在顶部 */
  out.pagerIsFirstChild = !!files && files.firstElementChild === pager;

  /* 滚到底看翻页条有没有被"钉住"。
     注意：自动化 tab 的 innerHeight 可能是 0，绝对坐标不可信，
     所以判据用「翻页条相对 #files 顶部被推开了多少」——
     它是 #files 的首个子元素，静态布局下两者顶部应当重合，
     只有 sticky 生效才会被推开一大截。 */
  const de = document.documentElement;
  /* 页面不足一屏时根本滚不动，sticky 无从触发。
     这时不能判失败——那是窗口太高，不是样式坏了。 */
  out.pageScrollable = de.scrollHeight > de.clientHeight + 10;
  window.scrollTo(0, de.scrollHeight);
  const r = pager.getBoundingClientRect();
  const rf = files.getBoundingClientRect();
  out.pagerRectTopAfterScroll = Math.round(r.top);
  out.stuckOffsetFromFilesTop = Math.round(r.top - rf.top);
  /* 卡片高度远大于翻页条，被推开百来像素以上就说明确实吸住了 */
  out.stickyWorks = !out.pageScrollable
    ? 'n/a（页面不足一屏，滚不动，把窗口调矮再测）'
    : out.stuckOffsetFromFilesTop > 100;
  window.scrollTo(0, 0);

  /* 遍历全部词条，检查每张卡的立绘是不是该词专属图。
     TERMS / IMGS 是顶层 const，只在全局词法作用域，不挂在 window 上；
     局部变量必须换名，否则会遮蔽掉要读的全局量 */
  const imgMap = eval('IMGS');
  const termList = eval('TERMS');
  const seen = {};
  const bad = [];
  for (const t of termList) {
    const uri = imgMap['term-' + t.slug];
    if (!uri) { bad.push(t.slug + '(缺专属图)'); continue; }
    if (seen[uri]) bad.push(t.slug + '(与 ' + seen[uri] + ' 共用同一张图)');
    seen[uri] = t.slug;
  }
  out.termCount = termList.length;
  out.uniqueArtCount = Object.keys(seen).length;
  out.artProblems = bad;

  /* 抽查渲染出来的 img 是否真的指向专属图 */
  location.hash = '#/dict/' + termList[0].slug;
  const img = document.querySelector('.art img');
  out.firstCardSlug = termList[0].slug;
  out.firstCardUsesOwnArt = !!img && img.src === imgMap['term-' + termList[0].slug];

  return JSON.stringify(out, null, 2);
})();
