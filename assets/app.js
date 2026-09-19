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
  // 首页标记：首页有大屏立绘，隐藏右侧固定装饰
  document.body.classList.toggle('ri-home', base === '/');

  main.innerHTML = '';
  if (hash === '/') renderHome(main);
  else if (hash === '/blog') renderBlog(main);
  else if (hash === '/projects') renderProjects(main);
  else if (hash === '/tags') renderTags(main);
  else if (hash === '/about') renderAbout(main);
  else if (hash.startsWith('/post/')) renderPost(main, decodeURIComponent(hash.slice(6)));
  else renderHome(main);
  window.scrollTo(0, 0);
  setTimeout(initReveal, 30);
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

// ---------- 首页（仿官网 7 区结构）----------
const HOME_TOTAL = '07';

function renderHome(el) {
  const latest = POSTS[0];
  const cats = ['最新', ...new Set(POSTS.map(p => p.category).filter(Boolean))];
  const feats = PROJECTS.slice(0, 4);
  el.innerHTML = `
    <!-- 01 HERO 大屏 -->
    <section class="ri-hero" data-code="01" data-name="HERO">
      <div class="ri-hero-bgtext" aria-hidden="true">RHODES<br>ISLAND</div>
      <div class="ri-hero-art" aria-hidden="true"></div>
      <div class="ri-hero-deco" aria-hidden="true">
        <!-- 两层嵌套渐隐：wash 管上下转场，wash-x 管左右转场；遮罩作用于整棵子树 -->
        <div class="ri-hero-wash">
          <div class="ri-hero-wash-x">
            <div class="ri-hero-plate"></div>
            <div class="ri-hero-plate ri-hero-plate-b"></div>
            <div class="ri-hero-vignette"></div>
          </div>
        </div>
        <div class="ri-hero-scale"></div>
        <div class="ri-hero-coord">X:1180&nbsp; Y:0640&nbsp; //&nbsp; PRTS OPTICAL UNIT</div>
      </div>
      <div class="ri-hero-body">
        <div class="ri-hero-tag">PRTS TERMINAL // PERSONAL ARCHIVE</div>
        <h1 class="ri-hero-title">RAINMEOX</h1>
        <div class="ri-hero-sub">罗德岛终端 <span>// RHODES ISLAND OPERATOR LOG</span></div>
        <p class="ri-hero-desc">${esc(PROFILE.bio)}<br>用代码点亮喜欢的角色，这里存放我的情报、项目与实验记录。</p>
        <div class="ri-hero-btns">
          <a class="ri-btn ri-btn-solid" href="#/blog">READ MORE <i>查看情报</i></a>
          <a class="ri-btn ri-btn-ghost" href="#/projects">OPERATOR <i>项目档案</i></a>
        </div>
        <div class="ri-hero-rule"></div>
        <div class="ri-hero-meta">
          <span>STATUS <b>ONLINE</b></span><span>LOCATION <b>${esc(PROFILE.location)}</b></span>
          <span>POSTS <b>${POSTS.length}</b></span><span>PROJECTS <b>${PROJECTS.length}</b></span>
        </div>
      </div>
      <div class="ri-hero-side">
        <div class="ri-hero-follow">关<br>注<br>频<br>道</div>
        <div class="ri-hero-social">
          <a href="${esc(PROFILE.github)}" target="_blank" rel="noopener" title="GitHub">GH</a>
          <a href="${esc(PROFILE.csdn)}" target="_blank" rel="noopener" title="CSDN">CS</a>
          <a href="${esc(PROFILE.elecfans)}" target="_blank" rel="noopener" title="电子发烧友">EF</a>
          <a href="${esc(PROFILE.mail)}" title="Mail">@</a>
        </div>
      </div>
    </section>

    <!-- 02 BREAKING NEWS 跑马条 -->
    ${latest ? `
    <section class="ri-breaking" data-code="02" data-name="BREAKING NEWS">
      <div class="ri-breaking-label"><i></i>BREAKING NEWS</div>
      <a class="ri-breaking-link" href="#/post/${encodeURIComponent(latest.file || '')}">
        <span class="ri-breaking-title">${esc(latest.title)}</span>
        <span class="ri-breaking-date">${esc(dateSplit(latest.date))}</span>
      </a>
      <a class="ri-breaking-more" href="#/blog">更多情报 <b>READ MORE</b></a>
    </section>` : ''}

    <!-- 03 情报（带标签页）-->
    <section class="ri-sec" data-code="03" data-name="INFORMATION">
      <div class="ri-sec-head">
        <span class="ri-sec-no">03</span>
        <div class="ri-sec-h"><h2>情报</h2><i>INFORMATION</i></div>
        <a class="ri-sec-more" href="#/blog">READ MORE +</a>
      </div>
      <div class="ri-tabs" id="riTabs">
        ${cats.map((c, i) => `<button class="ri-tab${i === 0 ? ' active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <div class="ri-list" id="riTabList">
        <div class="ri-list-head"><span>DATE</span><span>ARCHIVE</span></div>
        ${POSTS.slice(0, 5).map(itemHTML).join('') || '<div class="ri-empty">NO RECORDS // 暂无记录</div>'}
      </div>
    </section>

    <!-- 04 干员档案（可切换）-->
    <section class="ri-sec" data-code="04" data-name="PROFILE">
      <div class="ri-sec-head">
        <span class="ri-sec-no">04</span>
        <div class="ri-sec-h"><h2>档案</h2><i>RHODES ISLAND :// PROFILE</i></div>
        <a class="ri-sec-more" href="#/about">READ MORE +</a>
      </div>
      <div class="ri-op">
        <div class="ri-op-visual">
          <div class="ri-op-avatar" style="background-image:url('${esc(PROFILE.avatar)}')"></div>
          <div class="ri-op-code" id="riOpCode">RL-00</div>
        </div>
        <div class="ri-op-info">
          <div class="ri-op-en" id="riOpEn">RAINMEOX</div>
          <div class="ri-op-cn" id="riOpCn">${esc(PROFILE.role)}</div>
          <div class="ri-op-voice" id="riOpVoice">SKILL STACK <b>${PROFILE.skills.length}</b></div>
          <p class="ri-op-bio" id="riOpBio">${esc(PROFILE.bio)}。常驻${esc(PROFILE.location)}，长期活跃于开源社区与硬件开发一线。</p>
          <div class="ri-op-tags" id="riOpTags">${PROFILE.skills.slice(0, 8).map(s => `<span>${esc(s)}</span>`).join('')}</div>
        </div>
        <div class="ri-op-list" id="riOpList">
          <button class="ri-op-item active" data-i="-1">RAINMEOX<span>TERMINAL ADMIN</span></button>
          ${feats.map((p, i) => `<button class="ri-op-item" data-i="${i}">${esc(p.name)}<span>${esc(p.lang)}</span></button>`).join('')}
        </div>
      </div>
    </section>

    <!-- 05 术语（泰拉万象）-->
    <section class="ri-sec" data-code="05" data-name="WORLD">
      <div class="ri-sec-head">
        <span class="ri-sec-no">05</span>
        <div class="ri-sec-h"><h2>泰拉万象</h2><i>ABOUT TERRA</i></div>
      </div>
      <div class="ri-terms">
        ${PROFILE.interests.map((t, i) => `
          <div class="ri-term">
            <div class="ri-term-en">TERM-${String(i + 1).padStart(2, '0')}</div>
            <div class="ri-term-cn">${esc(t)}</div>
          </div>`).join('')}
      </div>
    </section>

    <!-- 06 更多内容 -->
    <section class="ri-sec" data-code="06" data-name="MORE CONTENT">
      <div class="ri-sec-head">
        <span class="ri-sec-no">06</span>
        <div class="ri-sec-h"><h2>更多内容</h2><i>MORE CONTENT</i></div>
      </div>
      <div class="ri-more-grid">
        <a class="ri-more-card" href="#/blog"><b>情报档案</b><i>INFORMATION ARCHIVE</i><em>VIEW MORE &gt;</em></a>
        <a class="ri-more-card" href="#/projects"><b>项目工坊</b><i>WORKSHOP / OPERATOR</i><em>VIEW MORE &gt;</em></a>
        <a class="ri-more-card" href="#/tags"><b>标签图鉴</b><i>INDEX / WORLD</i><em>VIEW MORE &gt;</em></a>
        <a class="ri-more-card" href="#/about"><b>关于我</b><i>PROFILE / MEDIA</i><em>VIEW MORE &gt;</em></a>
      </div>
    </section>

    <!-- 07 外部频道 -->
    <section class="ri-sec" data-code="07" data-name="MEDIA">
      <div class="ri-sec-head">
        <span class="ri-sec-no">07</span>
        <div class="ri-sec-h"><h2>外部频道</h2><i>MEDIA</i></div>
      </div>
      <div class="ri-media-rows">
        <a href="${esc(PROFILE.github)}" target="_blank" rel="noopener"><span class="ri-media-en">GITHUB</span><span class="ri-media-cn">代码仓库 · 开源项目</span><em>→</em></a>
        <a href="${esc(PROFILE.csdn)}" target="_blank" rel="noopener"><span class="ri-media-en">CSDN</span><span class="ri-media-cn">技术博客 · 文章首发</span><em>→</em></a>
        <a href="${esc(PROFILE.elecfans)}" target="_blank" rel="noopener"><span class="ri-media-en">ELECFANS</span><span class="ri-media-cn">电子发烧友 · 硬件社区</span><em>→</em></a>
        <a href="${esc(PROFILE.mail)}"><span class="ri-media-en">MAIL</span><span class="ri-media-cn">2692738315@qq.com · 联络信道</span><em>→</em></a>
      </div>
    </section>
  `;
  bindHomeEvents(el);
}

// 首页交互：情报标签页 + 档案切换
function bindHomeEvents(el) {
  const tabs = el.querySelectorAll('.ri-tab');
  const list = el.querySelector('#riTabList');
  if (tabs.length && list) {
    tabs.forEach(btn => btn.onclick = () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      const rows = (cat === '最新' ? POSTS.slice(0, 5) : POSTS.filter(p => p.category === cat).slice(0, 5));
      list.innerHTML = `<div class="ri-list-head"><span>DATE</span><span>ARCHIVE</span></div>` +
        (rows.length ? rows.map(itemHTML).join('') : '<div class="ri-empty">NO RECORDS // 暂无记录</div>');
      setTimeout(initReveal, 30);
    });
  }

  const opItems = el.querySelectorAll('.ri-op-item');
  if (opItems.length) {
    const show = i => {
      if (i < 0) {
        $('riOpCode').textContent = 'RL-00';
        $('riOpEn').textContent = 'RAINMEOX';
        $('riOpCn').textContent = PROFILE.role;
        $('riOpVoice').innerHTML = `SKILL STACK <b>${PROFILE.skills.length}</b>`;
        $('riOpBio').textContent = `${PROFILE.bio}。常驻${PROFILE.location}，长期活跃于开源社区与硬件开发一线。`;
        $('riOpTags').innerHTML = PROFILE.skills.slice(0, 8).map(s => `<span>${esc(s)}</span>`).join('');
      } else {
        const p = PROJECTS.slice(0, 4)[i];
        if (!p) return;
        $('riOpCode').textContent = 'RL-' + String(i + 1).padStart(2, '0');
        $('riOpEn').textContent = p.name.toUpperCase();
        $('riOpCn').textContent = 'PROJECT // ' + p.lang;
        $('riOpVoice').innerHTML = `STARS <b>${p.stars || 0}</b>`;
        $('riOpBio').textContent = p.desc;
        $('riOpTags').innerHTML = `<span>${esc(p.lang)}</span><span>OPEN SOURCE</span><span>GITHUB</span>`;
      }
    };
    opItems.forEach(btn => btn.onclick = () => {
      opItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      show(parseInt(btn.dataset.i, 10));
    });
  }
}

// 首页分区计数（仿官网 00 // 00 / 05）
function initSectionCounter() {
  const el = $('riSecCode');
  if (!el) return;
  const isHome = () => (location.hash.slice(1) || '/') === '/';
  const update = () => {
    if (!isHome()) { el.textContent = ''; return; }
    const secs = [...document.querySelectorAll('#mainContent [data-code]')];
    let cur = secs[0];
    for (const s of secs) {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.5) cur = s;
    }
    if (cur) el.textContent = `${cur.dataset.code} // ${cur.dataset.code} / ${HOME_TOTAL}  ${cur.dataset.name || ''}`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('hashchange', () => setTimeout(update, 60));
  update();
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


/* ============================================================
   v5.1 交互增强：滚动揭示 / 视差 / 涟漪 / 转场 / 左右切换
   ============================================================ */
const NAV_ORDER = ['/', '/blog', '/projects', '/tags', '/about'];

function initReveal() {
  const els = document.querySelectorAll('.ri-item, .ri-card, .ri-term, .ri-sec-title, .ri-page-head, .ri-list-head');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: .1, rootMargin: '0px 0px -36px 0px' });
  els.forEach((el, i) => {
    el.classList.add('ri-reveal');
    el.style.transitionDelay = (Math.min(i % 9, 8) * 0.04) + 's';
    io.observe(el);
  });
  // 兜底：1.6s 后强制显示全部，避免观察器未触发导致内容隐身
  setTimeout(() => els.forEach(e => e.classList.add('in')), 1600);
}

function initScrollFx() {
  const wm = document.getElementById('riWatermark');
  const pg = document.getElementById('ri-progress');
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (wm) wm.style.transform = 'translateY(' + (-y * 0.07) + 'px)';
    if (pg) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      pg.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initRipple() {
  document.addEventListener('click', e => {
    const t = e.target.closest('.ri-item, .ri-card, .ri-btn, .ri-nav-item, .ri-rail-link, .ri-term');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement('span');
    s.className = 'ri-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    t.appendChild(s);
    setTimeout(() => s.remove(), 640);
  });
}

function gotoRoute(path, animate) {
  const tr = document.getElementById('riTransition');
  if (animate && tr) { tr.classList.add('run'); setTimeout(() => tr.classList.remove('run'), 540); }
  if (location.hash === '#' + path) { router(); setTimeout(initReveal, 30); return; }
  location.hash = '#' + path;
}

function initSwitch() {
  const prev = document.getElementById('riPrev');
  const next = document.getElementById('riNext');
  const cur = () => {
    const h = location.hash.slice(1) || '/';
    return h.startsWith('/post/') ? '/blog' : h;
  };
  const update = () => {
    const i = NAV_ORDER.indexOf(cur());
    if (prev) prev.disabled = i <= 0;
    if (next) next.disabled = i >= NAV_ORDER.length - 1;
  };
  if (prev) prev.onclick = () => { const i = NAV_ORDER.indexOf(cur()); if (i > 0) gotoRoute(NAV_ORDER[i - 1], true); };
  if (next) next.onclick = () => { const i = NAV_ORDER.indexOf(cur()); if (i < NAV_ORDER.length - 1) gotoRoute(NAV_ORDER[i + 1], true); };
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const i = NAV_ORDER.indexOf(cur());
    if (e.key === 'ArrowRight' && i < NAV_ORDER.length - 1) { e.preventDefault(); gotoRoute(NAV_ORDER[i + 1], true); }
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); gotoRoute(NAV_ORDER[i - 1], true); }
    if (e.key === '/') { e.preventDefault(); const sb = document.getElementById('searchBtn'); if (sb) sb.click(); }
  });
  window.addEventListener('hashchange', () => setTimeout(update, 20));
  setTimeout(update, 60);
}

function initScrollHint() {
  const hint = document.getElementById('riScrollHint');
  if (!hint) return;
  const toggle = () => { hint.style.display = ((location.hash.slice(1) || '/') === '/') ? 'flex' : 'none'; };
  window.addEventListener('hashchange', toggle);
  toggle();
}

// 页脚「向下滚动」箭头 + 滚动提示点击
function initScrollDown() {
  const go = () => window.scrollBy({ top: window.innerHeight * 0.72, behavior: 'smooth' });
  const sd = document.getElementById('riScrollDown');
  const hint = document.getElementById('riScrollHint');
  if (sd) sd.onclick = e => { e.preventDefault(); go(); };
  if (hint) hint.onclick = go;
}

// ---------- 启动 ----------
(async function init() {
  applyTheme();
  await loadPosts();
  bindEvents();
  renderRail();
  startClock();
  startParticles();
  router();
  initReveal();
  initScrollFx();
  initRipple();
  initSwitch();
  initScrollHint();
  initScrollDown();
  initSectionCounter();
})();
