/* ============================================
   RainmeoX 二次元博客 · 主逻辑
   ============================================ */

// ---------- 配置 ----------
const PROFILE = {
  name: 'RainmeoX',
  bio: 'AI × 二次元 × 全栈开发 / 用代码点亮喜欢的角色',
  avatar: '🌸',
  github: 'https://github.com/RainmeoX',
  csdn: 'https://blog.csdn.net/m0_67166125',
  elecfans: 'https://bbs.elecfans.com/jishu_2518692_1_1.html',
  location: '中国',
  skills: ['Python', 'PyTorch', 'LoRA 微调', 'ROCm', 'FastAPI', 'Vue', 'JavaScript', 'HTML/CSS'],
  interests: ['明日方舟', '绝区零', 'AI 助手', '老设备折腾', '二次元']
};

const PROJECTS = [
  { name: 'arknights-qwen-assistant', desc: '明日方舟干员问答助手', lang: 'Python', stars: 0 },
  { name: 'arknights-dataset', desc: '明日方舟干员资料数据集 | 干员信息、技能、档案多源整理', lang: 'Python', stars: 0 },
  { name: 'zzz-yixuan-assistant', desc: '绝区零「仪玄」角色助手后端', lang: 'Python', stars: 0 },
  { name: 'zzz-yixuan-webui', desc: '绝区零「仪玄」角色助手前端', lang: 'JavaScript', stars: 0 },
  { name: 'zzz-yixuan-dataset', desc: '绝区零仪玄角色资料数据集', lang: 'Markdown', stars: 0 },
  { name: 'gemma4-emotion-lora-rocm', desc: 'Gemma 4 E4B 情绪分类微调', lang: 'Python', stars: 0 },
  { name: 'K230-Vision-System', desc: '基于 K230 AI 芯片的视觉检测系统', lang: 'C++', stars: 0 },
  { name: 'Web-Security-Learning', desc: '网络安全学习项目', lang: 'Markdown', stars: 0 },
  { name: 'wechat-mini-program', desc: '青智益村微信小程序', lang: 'JavaScript', stars: 0 },
  { name: 'auto-publisher', desc: '自动发布与数据扒取工具集', lang: 'Python', stars: 0 }
];

// ---------- 全局状态 ----------
let POSTS = [];
let CURRENT_THEME = localStorage.getItem('theme') || 'dark';

// ---------- 初始化 ----------
async function init() {
  applyTheme();
  await loadPosts();
  setupRouter();
  setupSearch();
  setupThemeToggle();
  setupSakura();
  setupBackToTop();
  setupReadingProgress();
  fetchGitHubStars();
}

// ---------- 返回顶部 ----------
function setupBackToTop() {
  const btn = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- 阅读进度条 ----------
function setupReadingProgress() {
  const bar = document.getElementById('reading-progress');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = scrolled + '%';
  });
}

// ---------- 樱花飘落 ----------
function setupSakura() {
  const container = document.getElementById('sakura-container');
  const chars = ['🌸','🌺','💮','🌷'];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.className = 'sakura';
    s.textContent = chars[Math.floor(Math.random()*chars.length)];
    s.style.left = Math.random()*100 + '%';
    s.style.animationDuration = (10 + Math.random()*10) + 's';
    s.style.animationDelay = Math.random()*10 + 's';
    s.style.fontSize = (12 + Math.random()*14) + 'px';
    container.appendChild(s);
  }
}

// ---------- 主题 ----------
function applyTheme() {
  document.documentElement.setAttribute('data-theme', CURRENT_THEME);
  document.getElementById('theme-btn').textContent = CURRENT_THEME === 'dark' ? '🌙' : '☀️';
}
function setupThemeToggle() {
  document.getElementById('theme-btn').addEventListener('click', () => {
    CURRENT_THEME = CURRENT_THEME === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', CURRENT_THEME);
    applyTheme();
  });
}

// ---------- 加载文章 ----------
async function loadPosts() {
  try {
    const res = await fetch('posts/posts.json');
    POSTS = await res.json();
    POSTS.sort((a,b) => new Date(b.date) - new Date(a.date));
  } catch(e) {
    console.error('加载文章失败:', e);
    POSTS = [];
  }
}

// ---------- 路由 ----------
function setupRouter() {
  window.addEventListener('hashchange', render);
  render();
}

function render() {
  const hash = window.location.hash.slice(1) || '/';
  const main = document.getElementById('main-content');
  const sidebar = document.getElementById('sidebar');

  // 渲染侧边栏（所有页面都显示）
  renderSidebar(sidebar);

  // 高亮导航
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === hash);
  });

  if (hash === '/' || hash === '') {
    renderHome(main);
  } else if (hash === '/blog') {
    renderBlogList(main);
  } else if (hash.startsWith('/post/')) {
    renderPost(decodeURIComponent(hash.slice(6)), main);
  } else if (hash === '/tags') {
    renderTags(main);
  } else if (hash.startsWith('/tag/')) {
    renderTagPosts(decodeURIComponent(hash.slice(5)), main);
  } else if (hash === '/archive') {
    renderArchive(main);
  } else if (hash === '/about') {
    renderAbout(main);
  } else {
    main.innerHTML = '<div class="empty"><div class="emoji">🌸</div><p>页面不存在</p></div>';
  }
  window.scrollTo(0, 0);
}

// ---------- 侧边栏 ----------
function renderSidebar(el) {
  const tagCount = {};
  POSTS.forEach(p => (p.tags||[]).forEach(t => tagCount[t] = (tagCount[t]||0)+1));
  const topTags = Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const categories = [...new Set(POSTS.map(p=>p.category).filter(Boolean))];

  el.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${PROFILE.avatar}</div>
      <h3 class="profile-name">${PROFILE.name}</h3>
      <p class="profile-bio">${PROFILE.bio}</p>
      <div class="profile-location">📍 ${PROFILE.location}</div>
      <div class="profile-stats">
        <div class="stat"><span class="num">${POSTS.length}</span><span class="label">文章</span></div>
        <div class="stat"><span class="num">${PROJECTS.length}</span><span class="label">项目</span></div>
        <div class="stat"><span class="num">${Object.keys(tagCount).length}</span><span class="label">标签</span></div>
      </div>
      <div class="profile-links">
        <a href="${PROFILE.github}" target="_blank" title="GitHub">📦</a>
        <a href="${PROFILE.csdn}" target="_blank" title="CSDN">📝</a>
        <a href="${PROFILE.elecfans}" target="_blank" title="电子发烧友">💡</a>
      </div>
    </div>

    <div class="side-card">
      <h4 class="side-title">🛠 技能</h4>
      <div class="skill-tags">
        ${PROFILE.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>

    <div class="side-card">
      <h4 class="side-title">💖 兴趣</h4>
      <div class="skill-tags">
        ${PROFILE.interests.map(s => `<span class="skill-tag interest">${s}</span>`).join('')}
      </div>
    </div>

    <div class="side-card">
      <h4 class="side-title">🏷 热门标签</h4>
      <div class="tag-cloud">
        ${topTags.map(([t,c]) => `<a href="#/tag/${encodeURIComponent(t)}" class="cloud-tag">${t}<sup>${c}</sup></a>`).join('')}
      </div>
    </div>

    <div class="side-card">
      <h4 class="side-title">📂 分类</h4>
      <div class="category-list">
        ${categories.map(cat => {
          const count = POSTS.filter(p=>p.category===cat).length;
          return `<a href="#/blog" class="cat-item"><span>${cat}</span><span class="cat-count">${count}</span></a>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ---------- 首页 ----------
function renderHome(el) {
  el.innerHTML = `
    <div class="welcome-banner">
      <h2>👋 欢迎来到我的小窝</h2>
      <p>这里记录我的 AI 微调实践、二次元项目和老设备折腾记</p>
    </div>

    <div class="section">
      <h2 class="section-title">📌 最新文章 <a href="#/blog" class="more-link">查看全部 →</a></h2>
      <div class="post-list" id="recent-posts"></div>
    </div>

    <div class="section">
      <h2 class="section-title">⭐ 精选项目 <a href="${PROFILE.github}" target="_blank" class="more-link">GitHub →</a></h2>
      <div class="projects-grid" id="projects-grid"></div>
    </div>
  `;
  const recent = document.getElementById('recent-posts');
  POSTS.slice(0, 4).forEach(p => recent.appendChild(postItem(p)));
  const grid = document.getElementById('projects-grid');
  PROJECTS.slice(0, 6).forEach(p => grid.appendChild(projectCard(p)));
}

// ---------- 博客列表 ----------
function renderBlogList(el) {
  el.innerHTML = `<div class="section"><h2 class="section-title">全部文章 <span class="count-badge">${POSTS.length} 篇</span></h2><div class="post-list" id="all-posts"></div></div>`;
  const list = document.getElementById('all-posts');
  if (POSTS.length === 0) {
    list.innerHTML = '<div class="empty"><div class="emoji">📝</div><p>还没有文章</p></div>';
    return;
  }
  POSTS.forEach(p => list.appendChild(postItem(p)));
}

// ---------- 文章详情 ----------
async function renderPost(filename, el) {
  const post = POSTS.find(p => p.file === filename);
  if (!post) {
    el.innerHTML = '<div class="empty"><div class="emoji">🌸</div><p>文章不存在</p></div>';
    return;
  }
  el.innerHTML = `
    <div class="post-detail">
      <a class="back-btn" href="#/blog">← 返回列表</a>
      <h1>${post.title}</h1>
      <div class="meta">
        <span>📅 ${post.date}</span>
        <span>📁 ${post.category || '未分类'}</span>
        <div class="post-tags">${(post.tags||[]).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
      </div>
      ${post.source ? `<a class="source-btn" href="${post.source}" target="_blank">📖 阅读原文 (${post.source.includes('csdn')?'CSDN':post.source.includes('elecfans')?'电子发烧友':'原文'})</a>` : ''}
      <div class="post-content" id="post-content">加载中...</div>
      ${post.source ? `<a class="source-btn bottom" href="${post.source}" target="_blank">📖 阅读原文 (${post.source.includes('csdn')?'CSDN':post.source.includes('elecfans')?'电子发烧友':'原文'})</a>` : ''}
    </div>
  `;
  try {
    const res = await fetch('posts/' + post.file);
    const md = await res.text();
    document.getElementById('post-content').innerHTML = marked.parse(md);
    // 渲染后生成 TOC
    generateTOC(el);
  } catch(e) {
    document.getElementById('post-content').innerHTML = '<p>文章加载失败</p>';
  }
}

// ---------- 生成目录 TOC ----------
function generateTOC(el) {
  const content = document.getElementById('post-content');
  if (!content) return;
  const headings = content.querySelectorAll('h2, h3');
  if (headings.length < 3) return; // 少于3个标题不显示
  const toc = document.createElement('div');
  toc.className = 'post-toc';
  toc.innerHTML = '<h4>📑 目录</h4><ul>' + 
    Array.from(headings).map((h, i) => {
      h.id = `heading-${i}`;
      const indent = h.tagName === 'H3' ? 'style="padding-left:16px"' : '';
      return `<li ${indent}><a href="#heading-${i}" onclick="document.getElementById('heading-${i}').scrollIntoView({behavior:'smooth'});return false">${h.textContent}</a></li>`;
    }).join('') + '</ul>';
  const detail = el.querySelector('.post-detail');
  detail.insertBefore(toc, document.getElementById('post-content'));
}

// ---------- 标签云 ----------
function renderTags(el) {
  const tagCount = {};
  POSTS.forEach(p => (p.tags||[]).forEach(t => tagCount[t] = (tagCount[t]||0)+1));
  const tags = Object.keys(tagCount).sort((a,b) => tagCount[b]-tagCount[a]);
  el.innerHTML = `
    <div class="section">
      <h2 class="section-title">标签云</h2>
      <div class="tags-cloud">
        ${tags.map(t => `<a class="tag-cloud-item" href="#/tag/${encodeURIComponent(t)}">${t}<span class="count">${tagCount[t]}</span></a>`).join('')}
      </div>
    </div>
  `;
}

// ---------- 标签文章 ----------
function renderTagPosts(tag, el) {
  const filtered = POSTS.filter(p => (p.tags||[]).includes(tag));
  el.innerHTML = `<div class="section"><h2 class="section-title">标签: ${tag} <span class="count-badge">${filtered.length} 篇</span></h2><div class="post-list" id="tag-posts"></div></div>`;
  const list = document.getElementById('tag-posts');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty"><div class="emoji">🏷️</div><p>该标签下没有文章</p></div>';
    return;
  }
  filtered.forEach(p => list.appendChild(postItem(p)));
}

// ---------- 归档 ----------
function renderArchive(el) {
  const byYear = {};
  POSTS.forEach(p => {
    const y = new Date(p.date).getFullYear();
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(p);
  });
  const years = Object.keys(byYear).sort((a,b) => b-a);
  el.innerHTML = `<div class="section"><h2 class="section-title">归档</h2><div id="archive-list"></div></div>`;
  const list = document.getElementById('archive-list');
  if (POSTS.length === 0) {
    list.innerHTML = '<div class="empty"><div class="emoji">📚</div><p>还没有文章</p></div>';
    return;
  }
  years.forEach(y => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="archive-year">${y} <span class="count-badge">${byYear[y].length} 篇</span></div>`;
    byYear[y].forEach(p => {
      const item = document.createElement('div');
      item.className = 'archive-item';
      item.innerHTML = `<span class="date">${p.date.slice(5)}</span><a class="title" href="#/post/${encodeURIComponent(p.file)}">${p.title}</a>`;
      div.appendChild(item);
    });
    list.appendChild(div);
  });
}

// ---------- 关于 ----------
function renderAbout(el) {
  el.innerHTML = `
    <div class="about-content">
      <h2>👋 关于我</h2>
      <p>${PROFILE.bio}</p>
      <p>一个热爱二次元和代码的开发者，喜欢用 AI 给喜欢的角色做助手。从明日方舟到绝区零，每个喜欢的角色都值得一个专属的智能助手。</p>
      <h2>🛠️ 技能</h2>
      <div class="skills">
        <span class="skill-tag">Python</span>
        <span class="skill-tag">JavaScript</span>
        <span class="skill-tag">PyTorch</span>
        <span class="skill-tag">LoRA 微调</span>
        <span class="skill-tag">RAG</span>
        <span class="skill-tag">FastAPI</span>
        <span class="skill-tag">Vue/React</span>
        <span class="skill-tag">爬虫</span>
        <span class="skill-tag">网络安全</span>
      </div>
      <h2>📂 项目方向</h2>
      <p>• 游戏角色 AI 助手（方舟/绝区零）</p>
      <p>• 小模型微调与边缘部署</p>
      <p>• 数据扒取与自动化发布</p>
      <p>• 视觉检测系统</p>
      <h2>🔗 联系</h2>
      <p>GitHub: <a href="${PROFILE.github}" target="_blank" style="color:var(--pink)">${PROFILE.github}</a></p>
      <p>CSDN: <a href="${PROFILE.csdn}" target="_blank" style="color:var(--pink)">${PROFILE.csdn}</a></p>
    </div>
  `;
}

// ---------- 组件 ----------
function postItem(p) {
  const div = document.createElement('a');
  div.className = 'post-item';
  div.href = `#/post/${encodeURIComponent(p.file)}`;
  div.innerHTML = `
    ${p.cover ? `<img class="post-cover" src="${p.cover}" onerror="this.style.display='none'">` : ''}
    <div class="post-body">
      <div class="post-title">${p.title} ${p.source ? `<span class="source-badge">${p.source.includes('csdn')?'CSDN':p.source.includes('elecfans')?'电子发烧友':'转载'}</span>` : ''}</div>
      <div class="post-excerpt">${p.excerpt || p.description || ''}</div>
      <div class="post-meta">
        <span>📅 ${p.date}</span>
        <span>📁 ${p.category || '未分类'}</span>
        <div class="post-tags">${(p.tags||[]).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
      </div>
    </div>
  `;
  return div;
}

function projectCard(p) {
  const a = document.createElement('a');
  a.className = 'project-card';
  a.href = `https://github.com/RainmeoX/${p.name}`;
  a.target = '_blank';
  a.innerHTML = `
    <div class="name">${p.name}</div>
    <div class="desc">${p.desc}</div>
    <div class="meta">
      <span class="lang">${p.lang}</span>
      <span class="stars" data-repo="${p.name}">⭐ ${p.stars}</span>
    </div>
  `;
  return a;
}

// ---------- 搜索 ----------
function setupSearch() {
  const btn = document.getElementById('search-btn');
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  btn.addEventListener('click', () => {
    modal.classList.add('active');
    input.value = '';
    results.innerHTML = '';
    setTimeout(() => input.focus(), 100);
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('active');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') modal.classList.remove('active');
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); btn.click(); }
  });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    const matched = POSTS.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.excerpt||'').toLowerCase().includes(q) ||
      (p.tags||[]).some(t => t.toLowerCase().includes(q))
    );
    if (matched.length === 0) {
      results.innerHTML = '<div class="search-result"><div class="excerpt">未找到相关文章</div></div>';
      return;
    }
    results.innerHTML = matched.map(p => `
      <div class="search-result" onclick="location.hash='#/post/${encodeURIComponent(p.file)}';document.getElementById('search-modal').classList.remove('active')">
        <div class="title">${p.title}</div>
        <div class="excerpt">${(p.excerpt||'').slice(0,80)} · ${p.date}</div>
      </div>
    `).join('');
  });
}

// ---------- 动态拉取 GitHub stars ----------
async function fetchGitHubStars() {
  try {
    const res = await fetch('https://api.github.com/users/RainmeoX/repos?per_page=100');
    const repos = await res.json();
    if (!Array.isArray(repos)) return;
    repos.forEach(repo => {
      const el = document.querySelector(`[data-repo="${repo.name}"]`);
      if (el) el.textContent = `⭐ ${repo.stargazers_count}`;
    });
  } catch(e) {}
}

// ---------- 启动 ----------
init();
