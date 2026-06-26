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
  elecfans: 'https://bbs.elecfans.com/jishu_2518692_1_1.html'
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
  fetchGitHubStars();
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
  const app = document.getElementById('app');
  app.innerHTML = '';

  // 高亮导航
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === hash);
  });

  if (hash === '/' || hash === '') {
    renderHome();
  } else if (hash === '/blog') {
    renderBlogList();
  } else if (hash.startsWith('/post/')) {
    renderPost(decodeURIComponent(hash.slice(6)));
  } else if (hash === '/tags') {
    renderTags();
  } else if (hash.startsWith('/tag/')) {
    renderTagPosts(decodeURIComponent(hash.slice(5)));
  } else if (hash === '/archive') {
    renderArchive();
  } else if (hash === '/about') {
    renderAbout();
  } else {
    app.innerHTML = '<div class="empty"><div class="emoji">🌸</div><p>页面不存在</p></div>';
  }
  window.scrollTo(0, 0);
}

// ---------- 首页 ----------
function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="hero">
      <div class="hero-avatar">${PROFILE.avatar}</div>
      <h1>${PROFILE.name}</h1>
      <p class="bio">${PROFILE.bio}</p>
      <div class="hero-links">
        <a href="${PROFILE.github}" target="_blank" class="btn-github">📦 GitHub</a>
        <a href="${PROFILE.csdn}" target="_blank" class="btn-csdn">📝 CSDN</a>
        <a href="#/blog" class="btn-csdn">📚 博客</a>
      </div>
    </div>
    <div class="section">
      <h2 class="section-title">最新文章</h2>
      <div class="post-list" id="recent-posts"></div>
    </div>
    <div class="section">
      <h2 class="section-title">开源项目</h2>
      <div class="projects-grid" id="projects-grid"></div>
    </div>
  `;
  // 最新文章（取前3篇）
  const recent = document.getElementById('recent-posts');
  POSTS.slice(0, 3).forEach(p => recent.appendChild(postItem(p)));
  // 项目
  const grid = document.getElementById('projects-grid');
  PROJECTS.forEach(p => grid.appendChild(projectCard(p)));
}

// ---------- 博客列表 ----------
function renderBlogList() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="section"><h2 class="section-title">全部文章</h2><div class="post-list" id="all-posts"></div></div>`;
  const list = document.getElementById('all-posts');
  if (POSTS.length === 0) {
    list.innerHTML = '<div class="empty"><div class="emoji">📝</div><p>还没有文章</p></div>';
    return;
  }
  POSTS.forEach(p => list.appendChild(postItem(p)));
}

// ---------- 文章详情 ----------
async function renderPost(filename) {
  const app = document.getElementById('app');
  const post = POSTS.find(p => p.file === filename);
  if (!post) {
    app.innerHTML = '<div class="empty"><div class="emoji">🌸</div><p>文章不存在</p></div>';
    return;
  }
  app.innerHTML = `
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
  } catch(e) {
    document.getElementById('post-content').innerHTML = '<p>文章加载失败</p>';
  }
}

// ---------- 标签云 ----------
function renderTags() {
  const app = document.getElementById('app');
  const tagCount = {};
  POSTS.forEach(p => (p.tags||[]).forEach(t => tagCount[t] = (tagCount[t]||0)+1));
  const tags = Object.keys(tagCount).sort((a,b) => tagCount[b]-tagCount[a]);
  app.innerHTML = `
    <div class="section">
      <h2 class="section-title">标签云</h2>
      <div class="tags-cloud">
        ${tags.map(t => `<a class="tag-cloud-item" href="#/tag/${encodeURIComponent(t)}">${t}<span class="count">${tagCount[t]}</span></a>`).join('')}
      </div>
    </div>
  `;
}

// ---------- 标签文章 ----------
function renderTagPosts(tag) {
  const app = document.getElementById('app');
  const filtered = POSTS.filter(p => (p.tags||[]).includes(tag));
  app.innerHTML = `<div class="section"><h2 class="section-title">标签: ${tag} (${filtered.length})</h2><div class="post-list" id="tag-posts"></div></div>`;
  const list = document.getElementById('tag-posts');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty"><div class="emoji">🏷️</div><p>该标签下没有文章</p></div>';
    return;
  }
  filtered.forEach(p => list.appendChild(postItem(p)));
}

// ---------- 归档 ----------
function renderArchive() {
  const app = document.getElementById('app');
  const byYear = {};
  POSTS.forEach(p => {
    const y = new Date(p.date).getFullYear();
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(p);
  });
  const years = Object.keys(byYear).sort((a,b) => b-a);
  app.innerHTML = `<div class="section"><h2 class="section-title">归档</h2><div id="archive-list"></div></div>`;
  const list = document.getElementById('archive-list');
  if (POSTS.length === 0) {
    list.innerHTML = '<div class="empty"><div class="emoji">📚</div><p>还没有文章</p></div>';
    return;
  }
  years.forEach(y => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="archive-year">${y}</div>`;
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
function renderAbout() {
  const app = document.getElementById('app');
  app.innerHTML = `
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
