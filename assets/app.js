/* ============================================
   RAINMEOX · RHODES ISLAND TERMINAL v5
   全站架构重构（仿 ak.hypergryph.com 官网）
   顶栏中英双行导航 + 右侧竖栏 + 全屏舞台 + 情报式列表
   ============================================ */

// ---------- 数据层 ----------
const DEFAULT_PROFILE = {
  name: 'RainmeoX',
  role: 'PRTS TERMINAL ADMIN',
  bio: '大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发',
  avatar: 'assets/images/avatar.jpg',
  github: 'https://github.com/RainmeoX',
  csdn: 'https://blog.csdn.net/m0_67166125',
  blog: 'https://www.rainmeo.xyz',
  elecfans: 'https://bbs.elecfans.com/user/6963000/',
  mail: 'mailto:2692738315@qq.com',
  location: '中国 · 深圳',
  skills: ['Python', 'PyTorch', 'LoRA 微调', 'vLLM', 'ROCm', 'Transformers', 'ChromaDB', 'K230', 'MicroPython', 'JavaScript', 'HTML/CSS', 'Selenium', 'Flask'],
  interests: ['大模型微调', '推理部署', 'RAG 应用', '嵌入式 AI', '网络安全', '自动化工具']
};

function getProfile() {
  try {
    const custom = JSON.parse(localStorage.getItem('rainmeo_profile') || '{}');
    return { ...DEFAULT_PROFILE, ...custom };
  } catch (e) { return DEFAULT_PROFILE; }
}
let PROFILE = getProfile();

const PROJECTS = [
  { name: 'zzz-yixuan-assistant', desc: '基于 Qwen3-4B + LoRA 微调的角色风格化对话系统后端，vLLM 部署 + RAG 检索 + 防 OOC 校验', lang: 'Python', stars: 1 },
  { name: 'zzz-yixuan-webui', desc: '纯原生 HTML/CSS/JS 打造的对话助手前端，零依赖，支持桌面/平板/手机三档响应式布局', lang: 'CSS', stars: 1 },
  { name: 'arknights-qwen-assistant', desc: '基于 Qwen3-0.6B + LoRA 的垂直知识问答系统，133 个实体 8846 条问答，8 分钟训练完成', lang: 'Python', stars: 0 },
  { name: 'gemma4-emotion-lora-rocm', desc: 'Gemma4-E4B 情绪分类 LoRA 微调，AMD ROCm 单卡 17 分钟训练，准确率 0.625→0.915', lang: 'Python', stars: 0 },
  { name: 'K230-Vision-System', desc: '基于 K230 AI 芯片的多功能嵌入式视觉检测系统，三角形/圆形/矩形检测 + 二维码识别 + UART 通信', lang: 'C++', stars: 0 },
  { name: 'Web-Security-Learning', desc: '网络安全学习项目，Web 安全 7 主题 + 应急响应 4 主题，配套 Flask 靶场与攻击脚本', lang: 'Markdown', stars: 0 },
  { name: 'auto-publisher', desc: '自动化发布与数据采集工具集，CSDN 自动发布 + 飞书/雨课堂文档采集 + GitHub 仓库管理', lang: 'Python', stars: 0 },
  { name: 'anime-site', desc: '个人网站，纯原生 HTML/CSS/JS，罗德岛终端主题（archived 旧版）', lang: 'CSS', stars: 0 },
];

// 路由定义（仿官网导航结构）
const ROUTES = {
  '/':         { en: 'INDEX',       cn: '首页', page: 'HOMEPAGE',    code: '01' },
  '/blog':     { en: 'INFORMATION', cn: '情报', page: 'INFORMATION', code: '02' },
  '/projects': { en: 'OPERATOR',    cn: '项目', page: 'OPERATOR',    code: '03' },
  '/tags':     { en: 'WORLD',       cn: '标签', page: 'WORLD',       code: '04' },
  '/about':    { en: 'MEDIA',       cn: '关于', page: 'MEDIA',       code: '05' },
};

let POSTS = [];
let CURRENT_THEME = localStorage.getItem('theme') || 'dark';

// ---------- 工具 ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateSplit = d => {
  // 2026-09-19 → 2026 // 09 / 19
  const m = String(d || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]} // ${m[2]} / ${m[3]}` : (d || '');
};

// ---------- 加载文章 ----------
async function loadPosts() {
  try {
    const res = await fetch('posts/posts.json?v=5');
    if (res.ok) { POSTS = await res.json(); return; }
  } catch (e) {}
  try {
    const r2 = await fetch('posts/posts.json');
    if (r2.ok) POSTS = await r2.json();
  } catch (e) { POSTS = []; }
}

// ---------- 主题 ----------
function applyTheme() {
  document.documentElement.setAttribute('data-theme', CURRENT_THEME);
  localStorage.setItem('theme', CURRENT_THEME);
  const btn = $('themeBtn');
  if (btn) btn.textContent = CURRENT_THEME === 'dark' ? '☀' : '◐';
}

// ---------- 粒子 ----------
function startParticles() {
  const box = $('ri-particles');
  if (!box) return;
  const make = () => {
    const p = document.createElement('div');
    p.className = 'ri-particle';
    p.style.left = Math.random() * 100 + '%';
    const w = 1 + Math.random() * 2;
    p.style.width = w + 'px';
    p.style.height = w * (3 + Math.random() * 4) + 'px';
    p.style.animationDuration = (7 + Math.random() * 9) + 's';
    p.style.opacity = 0.2 + Math.random() * 0.4;
    box.appendChild(p);
    setTimeout(() => p.remove(), 17000);
  };
  setInterval(make, 420);
  for (let i = 0; i < 12; i++) setTimeout(make, i * 160);
}

// ---------- 竖栏 ----------
function renderRail() {
  const links = $('riRailLinks');
  if (links) {
    links.innerHTML = Object.entries(ROUTES).map(([path, r]) => `
      <a class="ri-rail-link" data-rail="${path}" href="#${path}">
        <span class="n">${r.code}</span><span>${r.cn}</span>
      </a>`).join('');
  }
  const pf = $('riRailProfile');
  if (pf) {
    pf.innerHTML = `
      <img class="ri-rail-avatar" src="${esc(PROFILE.avatar)}" alt="${esc(PROFILE.name)}"
           onerror="this.style.visibility='hidden'">
      <div class="ri-rail-name">${esc(PROFILE.name)}</div>
      <div class="ri-rail-role">${esc(PROFILE.role || 'DR.')}</div>
      <div class="ri-rail-bio">${esc(PROFILE.bio)}</div>
      <div class="ri-rail-socials">
        <a class="ri-rail-social" href="${esc(PROFILE.github)}" target="_blank" rel="noopener">GITHUB</a>
        <a class="ri-rail-social" href="${esc(PROFILE.csdn)}" target="_blank" rel="noopener">CSDN</a>
        <a class="ri-rail-social" href="${esc(PROFILE.elecfans)}" target="_blank" rel="noopener">ELECFANS</a>
        <a class="ri-rail-social" href="${esc(PROFILE.mail)}">MAIL</a>
      </div>`;
  }
  const loc = $('riFootLoc');
  if (loc) loc.textContent = PROFILE.location;
}

// ---------- 时钟 ----------
function startClock() {
  const tick = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const el = $('riClock');
    if (el) el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  tick(); setInterval(tick, 1000);
}

// ---------- 路由 ----------
function router() {
  const hash = (location.hash.slice(1) || '/');
  const main = $('mainContent');
  if (!main) return;
  const base = hash.startsWith('/post/') ? '/blog' : hash;

  // 更新顶栏激活态
  document.querySelectorAll('.ri-nav-item').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-route') === base);
  });
  // 更新竖栏激活态
  document.querySelectorAll('.ri-rail-link').forEach(a => {
    a.classList.toggle('active', a.dataset.rail === base);
  });
  // 更新页面名与水印
  const r = ROUTES[base] || ROUTES['/'];
  const pn = $('riPageName'); if (pn) pn.textContent = r.page;
  const wm = $('riWatermark'); if (wm) wm.textContent = r.en === 'INDEX' ? 'RAINMEOX' : r.en;

  main.innerHTML = '';
  if (hash === '/') renderHome(main);
  else if (hash === '/blog') renderBlog(main);
  else if (hash === '/projects') renderProjects(main);
  else if (hash === '/tags') renderTags(main);
  else if (hash === '/about') renderAbout(main);
  else if (hash.startsWith('/post/')) renderPost(main, decodeURIComponent(hash.slice(6)));
  else renderHome(main);
  window.scrollTo(0, 0);
}

// ---------- 页头 ----------
function pageHead(en, cn, desc, meta) {
  return `
    <div class="ri-page-head">
      <div class="ri-page-en">${esc(en)}</div>
      <h1 class="ri-page-title">${esc(en)}</h1>
      <div class="ri-page-cn">${esc(cn)}</div>
      ${desc ? `<p class="ri-page-desc">${desc}</p>` : ''}
      ${meta ? `<div class="ri-page-meta">${meta}</div>` : ''}
    </div>`;
}

// ---------- 情报条目 ----------
function itemHTML(p) {
  const tags = (p.tags || []).slice(0, 3).map(t => `<span class="ri-tag">${esc(t)}</span>`).join('');
  const file = p.file || p.slug || '';
  return `
    <a class="ri-item" href="#/post/${encodeURIComponent(file)}">
      <span class="ri-item-date">${esc(dateSplit(p.date))}</span>
      <span class="ri-item-main">
        <span class="ri-item-title">${esc(p.title || '(无标题)')}</span>
        ${p.excerpt ? `<span class="ri-item-excerpt">${esc(p.excerpt)}</span>` : ''}
      </span>
      <span class="ri-item-tags">${tags}</span>
    </a>`;
}

// ---------- 首页 ----------
function renderHome(el) {
  const recent = POSTS.slice(0, 6);
  el.innerHTML = `
    ${pageHead('INDEX', '罗德岛终端', `${esc(PROFILE.bio)}<br>用代码点亮喜欢的角色。这里存放我的情报、项目与实验记录。`,
      `<span>STATUS <b>ONLINE</b></span><span>LOCATION <b>${esc(PROFILE.location)}</b></span><span>POSTS <b>${POSTS.length}</b></span><span>PROJECTS <b>${PROJECTS.length}</b></span>`)}

    <div class="ri-sec-title">TERMINOLOGY // 关键词</div>
    <div class="ri-terms">
      ${PROFILE.interests.map((t, i) => `
        <div class="ri-term">
          <div class="ri-term-en">TERM-${String(i + 1).padStart(2, '0')}</div>
          <div class="ri-term-cn">${esc(t)}</div>
        </div>`).join('')}
    </div>

    <div class="ri-sec-title">LATEST INTELLIGENCE // 最新情报</div>
    <div class="ri-list">
      <div class="ri-list-head"><span>DATE</span><span>ARCHIVE</span></div>
      ${recent.length ? recent.map(itemHTML).join('') : '<div class="ri-empty">NO RECORDS // 暂无记录</div>'}
    </div>
    <div style="margin-top:18px"><a class="ri-more" href="#/blog">READ MORE // 查看全部 →</a></div>
  `;
}

// ---------- 情报页 ----------
function renderBlog(el) {
  el.innerHTML = `
    ${pageHead('INFORMATION', '情报档案', '所有已归档的作战记录与技术笔记。', `<span>ARCHIVES <b>${POSTS.length}</b></span>`)}
    <div class="ri-list">
      <div class="ri-list-head"><span>DATE</span><span>ARCHIVE</span></div>
      ${POSTS.length ? POSTS.map(itemHTML).join('') : '<div class="ri-empty">NO RECORDS // 暂无记录</div>'}
    </div>`;
}

// ---------- 项目页 ----------
function renderProjects(el) {
  el.innerHTML = `
    ${pageHead('OPERATOR', '干员档案', '我参与构建的工程与实验项目。', `<span>OPERATORS <b>${PROJECTS.length}</b></span>`)}
    <div class="ri-cards">
      ${PROJECTS.map((p, i) => `
        <div class="ri-card">
          <div class="ri-card-head">
            <div class="ri-card-name">${String(i + 1).padStart(2, '0')} · ${esc(p.name)}</div>
            <div class="ri-card-lang">${esc(p.lang)}</div>
          </div>
          <div class="ri-card-desc">${esc(p.desc)}</div>
          <div class="ri-card-foot">
            <span>★ ${p.stars || 0}</span>
            <a class="ri-more" href="https://github.com/RainmeoX/${esc(p.name)}" target="_blank" rel="noopener">REPO →</a>
          </div>
        </div>`).join('')}
    </div>`;
}

// ---------- 标签页 ----------
function renderTags(el) {
  const map = {};
  POSTS.forEach(p => (p.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
  const tags = Object.entries(map).sort((a, b) => b[1] - a[1]);
  el.innerHTML = `
    ${pageHead('WORLD', '世界构成', '按标签索引全部档案。', `<span>TAGS <b>${tags.length}</b></span>`)}
    <div class="ri-terms">
      ${tags.length ? tags.map(([t, n]) => `
        <div class="ri-term" onclick="location.hash='#/blog'">
          <div class="ri-term-en">${esc(t)}</div>
          <div class="ri-term-cn">${n} 篇档案</div>
        </div>`).join('') : '<div class="ri-empty">NO TAGS // 暂无标签</div>'}
    </div>
    <div class="ri-sec-title">SKILLS // 技能树</div>
    <div class="ri-terms">
      ${PROFILE.skills.map((s, i) => `
        <div class="ri-term">
          <div class="ri-term-en">SKILL-${String(i + 1).padStart(2, '0')}</div>
          <div class="ri-term-cn">${esc(s)}</div>
        </div>`).join('')}
    </div>`;
}

// ---------- 关于页 ----------
function renderAbout(el) {
  el.innerHTML = `
    ${pageHead('MEDIA', '关于本终端', '罗德岛制药 · 终端管理员档案。',
      `<span>NAME <b>${esc(PROFILE.name)}</b></span><span>ROLE <b>${esc(PROFILE.role || 'DR.')}</b></span><span>LOCATION <b>${esc(PROFILE.location)}</b></span>`)}
    <div class="ri-sec-title">PROFILE // 档案</div>
    <div class="ri-article" style="max-width:70ch">
      <p>我是 <b>${esc(PROFILE.name)}</b>，电子信息科学与技术专业在读（嵌入式方向）。目前主要在做大模型微调与推理部署，同时折腾嵌入式 AI（K230）、网络通信与自动化工具。</p>
      <p>这个终端用来归档我的技术笔记、项目记录与实验数据。界面视觉参考《明日方舟》官网的设计规范（字体、配色、动效均取自官方 CDN）。</p>
    </div>
    <div class="ri-sec-title">CONTACT // 联系方式</div>
    <div class="ri-terms">
      <a class="ri-term" href="${esc(PROFILE.github)}" target="_blank" rel="noopener"><div class="ri-term-en">GITHUB</div><div class="ri-term-cn">RainmeoX</div></a>
      <a class="ri-term" href="${esc(PROFILE.csdn)}" target="_blank" rel="noopener"><div class="ri-term-en">CSDN</div><div class="ri-term-cn">博客主页</div></a>
      <a class="ri-term" href="${esc(PROFILE.elecfans)}" target="_blank" rel="noopener"><div class="ri-term-en">ELECFANS</div><div class="ri-term-cn">电子发烧友</div></a>
      <a class="ri-term" href="${esc(PROFILE.mail)}"><div class="ri-term-en">MAIL</div><div class="ri-term-cn">2692738315@qq.com</div></a>
    </div>`;
}

// ---------- 文章页 ----------
async function renderPost(el, file) {
  el.innerHTML = `<div class="ri-empty">LOADING // 正在解密档案……</div>`;
  try {
    const res = await fetch('posts/' + file);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    const meta = POSTS.find(p => (p.file === file || p.slug === file)) || {};
    const html = (typeof marked !== 'undefined')
      ? marked.parse(md, { gfm: true, breaks: false })
      : '<pre>' + esc(md) + '</pre>';
    el.innerHTML = `
      <div class="ri-page-head">
        <div class="ri-page-en">${esc(dateSplit(meta.date || ''))}</div>
        <h1 class="ri-page-title">${esc(meta.title || file)}</h1>
        ${(meta.tags || []).length ? `<div class="ri-page-meta">${meta.tags.map(t => `<span class="ri-tag">${esc(t)}</span>`).join(' ')}</div>` : ''}
      </div>
      <div class="ri-article" id="riArticle">${html}</div>
      <div style="margin-top:28px"><a class="ri-more" href="#/blog">← BACK // 返回情报列表</a></div>`;
    if (typeof hljs !== 'undefined') {
      el.querySelectorAll('pre code').forEach(b => { try { hljs.highlightElement(b); } catch (e) {} });
    }
  } catch (e) {
    el.innerHTML = `<div class="ri-empty">ARCHIVE ERROR // 档案读取失败（${esc(e.message)}）</div>`;
  }
}

// ---------- 事件 ----------
function bindEvents() {
  const themeBtn = $('themeBtn');
  if (themeBtn) themeBtn.onclick = () => {
    CURRENT_THEME = CURRENT_THEME === 'dark' ? 'light' : 'dark';
    applyTheme();
  };

  const searchBtn = $('searchBtn');
  const modal = $('searchModal');
  const input = $('searchInput');
  const results = $('searchResults');
  if (searchBtn && modal) {
    searchBtn.onclick = () => {
      modal.classList.add('active');
      setTimeout(() => input && input.focus(), 60);
    };
  }
  const closeBtn = $('searchClose');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
  if (modal) modal.onclick = e => { if (e.target === modal) modal.classList.remove('active'); };

  const doSearch = () => {
    if (!input || !results) return;
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    const hit = POSTS.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
    results.innerHTML = hit.length
      ? hit.map(p => `
        <div class="ri-sr" onclick="location.hash='#/post/${encodeURIComponent(p.file || p.slug)}';document.getElementById('searchModal').classList.remove('active')">
          <div class="ri-sr-t">${esc(p.title)}</div>
          <div class="ri-sr-e">${esc(dateSplit(p.date))} · ${esc((p.tags || []).join(' / '))}</div>
        </div>`).join('')
      : '<div class="ri-empty">NO MATCH // 未找到相关档案</div>';
  };
  if (input) {
    input.oninput = doSearch;
    input.onkeydown = e => { if (e.key === 'Escape') modal.classList.remove('active'); };
  }

  // 移动端菜单
  const menuBtn = $('menuBtn');
  const rail = $('riRail');
  if (menuBtn && rail) {
    menuBtn.onclick = () => rail.classList.toggle('open');
    document.addEventListener('click', e => {
      if (rail.classList.contains('open') && !rail.contains(e.target) && e.target !== menuBtn) {
        rail.classList.remove('open');
      }
    });
  }

  // 页脚向下箭头
  const sd = $('riScrollDown');
  if (sd) sd.onclick = () => window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });

  // 回到顶部
  const top = $('backToTop');
  if (top) {
    window.addEventListener('scroll', () => top.classList.toggle('visible', window.scrollY > 400));
    top.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', router);
}

// ---------- 加载屏 ----------
(function riLoader() {
  const loader = $('ri-loader'), pct = $('ri-pct'), bar = $('ri-bar'), dots = $('ri-dots');
  if (!loader || !pct) return;
  let p = 0, n = 0;
  const dt = setInterval(() => { n = (n % 7) + 1; if (dots) dots.textContent = '.'.repeat(n).padEnd(7, ' '); }, 160);
  const t = setInterval(() => {
    p += Math.random() * 17 + 7;
    if (p >= 100) {
      p = 100; clearInterval(t);
      setTimeout(() => { clearInterval(dt); loader.classList.add('done'); setTimeout(() => loader.remove(), 750); }, 400);
    }
    pct.textContent = Math.floor(p);
    if (bar) bar.style.width = p + '%';
  }, 105);
})();

// ---------- 启动 ----------
(async function init() {
  applyTheme();
  await loadPosts();
  bindEvents();
  renderRail();
  startClock();
  startParticles();
  router();
})();
