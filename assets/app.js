/* ============================================
   RainmeoX 技术博客 · 主逻辑
   ============================================ */

// ---------- 配置 ----------
const PROFILE = {
  name: 'RainmeoX',
  bio: '大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发',
  github: 'https://github.com/RainmeoX',
  csdn: 'https://blog.csdn.net/m0_67166125',
  blog: 'https://www.rainmeo.xyz',
  location: '中国 · 深圳',
  skills: ['Python', 'PyTorch', 'LoRA 微调', 'vLLM', 'ROCm', 'Transformers', 'ChromaDB', 'K230', 'MicroPython', 'JavaScript', 'HTML/CSS', 'Selenium', 'Flask'],
  interests: ['大模型微调', '推理部署', 'RAG 应用', '嵌入式 AI', '网络安全', '自动化工具']
};

const PROJECTS = [
  { name: 'zzz-yixuan-assistant', desc: '基于 Qwen3-4B + LoRA 微调的角色风格化对话系统后端，vLLM 部署 + RAG 检索 + 防 OOC 校验', lang: 'Python', stars: 0 },
  { name: 'zzz-yixuan-webui', desc: '纯原生 HTML/CSS/JS 打造的对话助手前端，零依赖，支持桌面/平板/手机三档响应式布局', lang: 'CSS', stars: 0 },
  { name: 'arknights-qwen-assistant', desc: '基于 Qwen3-0.6B + LoRA 的垂直知识问答系统，133 个实体 8846 条问答，8 分钟训练完成', lang: 'Python', stars: 0 },
  { name: 'gemma4-emotion-lora-rocm', desc: 'Gemma4-E4B 情绪分类 LoRA 微调，AMD ROCm 单卡 17 分钟训练，准确率 0.625→0.915', lang: 'Python', stars: 0 },
  { name: 'K230-Vision-System', desc: '基于 K230 AI 芯片的多功能嵌入式视觉检测系统，三角形/圆形/矩形检测 + 二维码识别 + UART 通信', lang: 'C++', stars: 0 },
  { name: 'Web-Security-Learning', desc: '网络安全学习项目，Web 安全 7 主题 + 应急响应 4 主题，配套 Flask 靶场与攻击脚本', lang: 'Markdown', stars: 0 },
  { name: 'auto-publisher', desc: '自动化发布与数据采集工具集，CSDN 自动发布 + 飞书/雨课堂文档采集 + GitHub 仓库管理', lang: 'Python', stars: 0 },
  { name: 'anime-site', desc: '个人博客网站，纯原生 HTML/CSS/JS 单文件实现，Markdown 渲染 + 代码高亮 + 全文搜索', lang: 'CSS', stars: 0 },
];

// ---------- 全局状态 ----------
let POSTS = [];
let CURRENT_THEME = localStorage.getItem('theme') || 'dark';

// ---------- 初始化 ----------
async function init() {
  applyTheme(CURRENT_THEME);
  await loadPosts();
  router();
  window.addEventListener('hashchange', router);
  bindEvents();
  fetchGitHubStars();
}

// ---------- 主题 ----------
function applyTheme(theme) {
  CURRENT_THEME = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// ---------- 加载文章 ----------
async function loadPosts() {
  try {
    const res = await fetch('posts/posts.json');
    POSTS = await res.json();
    POSTS.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    POSTS = [];
  }
}

// ---------- 路由 ----------
function router() {
  const hash = location.hash.slice(1) || '/';
  const main = document.getElementById('main');
  window.scrollTo(0, 0);

  // 更新导航高亮
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === hash);
  });

  // 关闭移动端菜单
  document.getElementById('navLinks').classList.remove('open');

  if (hash === '/') {
    renderHome(main);
  } else if (hash === '/blog') {
    renderBlog(main);
  } else if (hash === '/projects') {
    renderProjects(main);
  } else if (hash === '/tags') {
    renderTags(main);
  } else if (hash === '/about') {
    renderAbout(main);
  } else if (hash.startsWith('/post/')) {
    const file = decodeURIComponent(hash.slice(6));
    renderPost(main, file);
  } else if (hash.startsWith('/tag/')) {
    const tag = decodeURIComponent(hash.slice(5));
    renderBlog(main, tag);
  } else {
    renderHome(main);
  }
}

// ---------- 首页 ----------
function renderHome(el) {
  const recentPosts = POSTS.slice(0, 5);
  const featuredProjects = PROJECTS.slice(0, 6);

  el.innerHTML = `
    <section class="hero">
      <h1>专注 <span class="accent">大模型微调</span> 与<br>嵌入式 AI 工程实践</h1>
      <p class="tagline">${PROFILE.bio}。这里记录我的项目实战、技术笔记与踩坑经验。</p>
      <div class="hero-meta">
        <span>📍 ${PROFILE.location}</span>
        <span>📦 ${PROJECTS.length} 个开源项目</span>
        <span>📝 ${POSTS.length} 篇文章</span>
      </div>
    </section>

    <section style="margin-bottom: 48px;">
      <div class="section-header">
        <h2 class="section-title">最新文章</h2>
        <a href="#/blog" class="section-more">查看全部 →</a>
      </div>
      <div class="post-list">
        ${recentPosts.map(p => postCard(p)).join('')}
      </div>
    </section>

    <section>
      <div class="section-header">
        <h2 class="section-title">精选项目</h2>
        <a href="#/projects" class="section-more">查看全部 →</a>
      </div>
      <div class="project-grid">
        ${featuredProjects.map(p => projectCard(p)).join('')}
      </div>
    </section>
  `;
}

// ---------- 博客列表 ----------
function renderBlog(el, filterTag) {
  const posts = filterTag ? POSTS.filter(p => (p.tags || []).includes(filterTag)) : POSTS;
  const title = filterTag ? `标签：${filterTag}` : '全部文章';

  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">${title}</h2>
      <span style="font-size:13px;color:var(--text-tertiary);">${posts.length} 篇</span>
    </div>
    ${posts.length > 0
      ? `<div class="post-list">${posts.map(p => postCard(p)).join('')}</div>`
      : `<div class="empty-state"><div class="empty-icon">📝</div><p>暂无文章</p></div>`
    }
  `;
}

// ---------- 项目页 ----------
function renderProjects(el) {
  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">开源项目</h2>
      <a href="${PROFILE.github}" target="_blank" class="section-more">GitHub →</a>
    </div>
    <div class="project-grid">
      ${PROJECTS.map(p => projectCard(p)).join('')}
    </div>
  `;
}

// ---------- 标签页 ----------
function renderTags(el) {
  const tagCount = {};
  POSTS.forEach(p => {
    (p.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
  });
  const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);

  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">标签</h2>
      <span style="font-size:13px;color:var(--text-tertiary);">${tags.length} 个标签</span>
    </div>
    <div class="tag-cloud">
      ${tags.map(([tag, count]) => `
        <a href="#/tag/${encodeURIComponent(tag)}" class="tag-item">
          ${tag}<span class="tag-count">${count}</span>
        </a>
      `).join('')}
    </div>
  `;
}

// ---------- 关于页 ----------
function renderAbout(el) {
  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">关于我</h2>
    </div>
    <div class="about-card">
      <h2>${PROFILE.name}</h2>
      <p>${PROFILE.bio}。专注大语言模型微调、高性能推理部署与嵌入式边缘视觉，掌握 Transformer 架构、LoRA 参数高效微调与 vLLM 推理优化技术。基于 AMD ROCm 生态独立完成 Qwen3-4B、Qwen3-0.6B、Gemma4-E4B 三个大模型的 LoRA 微调与部署，具备从数据集构建、模型训练、推理服务到前端 UI 的全链路交付能力。</p>
      <p>同时具备 K230 嵌入式 AI 芯片视觉算法开发、网络安全实战（Web 安全 + 应急响应）、自动化工具开发经验。注重工程实践与方案落地，所有项目均开源并附详细文档。</p>

      <h3 style="font-size:16px;margin:24px 0 12px;">技术栈</h3>
      <div class="skill-tags">
        ${PROFILE.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>

      <h3 style="font-size:16px;margin:24px 0 12px;">关注方向</h3>
      <div class="skill-tags">
        ${PROFILE.interests.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>

      <div class="links">
        <a href="${PROFILE.github}" target="_blank">📦 GitHub</a>
        <a href="${PROFILE.csdn}" target="_blank">📝 CSDN</a>
        <a href="${PROFILE.blog}" target="_blank">🌐 博客主站</a>
      </div>
    </div>
  `;
}

// ---------- 文章详情 ----------
async function renderPost(el, file) {
  el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>加载中...</p></div>`;

  const post = POSTS.find(p => p.file === file);
  if (!post) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">404</div><p>文章不存在</p><a href="#/blog" style="display:inline-block;margin-top:16px;">← 返回博客</a></div>`;
    return;
  }

  try {
    const res = await fetch(`posts/${file}`);
    let md = await res.text();
    // 去掉开头的引用块
    md = md.replace(/^>\s.*$/m, '').trim();

    const html = marked.parse(md);

    el.innerHTML = `
      <article class="post-detail">
        <a href="#/blog" class="back-link">← 返回博客</a>
        <div class="post-header">
          <h1 class="post-title-large">${post.title}</h1>
          <div class="post-meta">
            <span>📅 ${post.date}</span>
            <span>📁 ${post.category}</span>
            ${post.source ? `<span>🔗 <a href="${post.source}" target="_blank">原文链接</a></span>` : ''}
          </div>
          ${post.tags && post.tags.length ? `<div class="post-tags" style="margin-top:12px;">${post.tags.map(t => `<a href="#/tag/${encodeURIComponent(t)}" class="tag">${t}</a>`).join('')}</div>` : ''}
        </div>
        <div class="post-content">${html}</div>
      </article>
    `;

    // 代码高亮
    document.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) hljs.highlightElement(block);
    });
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>加载失败</p></div>`;
  }
}

// ---------- 文章卡片 ----------
function postCard(p) {
  return `
    <div class="post-card" onclick="location.hash='#/post/${encodeURIComponent(p.file)}'">
      <div class="post-date">${p.date}</div>
      <div class="post-body">
        <div class="post-title">${p.title}</div>
        <div class="post-excerpt">${p.excerpt || ''}</div>
        <div class="post-tags">
          ${(p.tags || []).slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ---------- 项目卡片 ----------
function projectCard(p) {
  return `
    <a href="https://github.com/RainmeoX/${p.name}" target="_blank" class="project-card" data-lang="${p.lang}">
      <div class="proj-header">
        <span class="proj-name">${p.name}</span>
        <span class="proj-lang">${p.lang}</span>
      </div>
      <div class="proj-desc">${p.desc}</div>
      <div class="proj-stars" data-repo="${p.name}">⭐ ${p.stars}</div>
    </a>
  `;
}

// ---------- 事件绑定 ----------
function bindEvents() {
  // 主题切换
  document.getElementById('themeBtn').addEventListener('click', () => {
    applyTheme(CURRENT_THEME === 'dark' ? 'light' : 'dark');
  });

  // 移动端菜单
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // 搜索
  const searchModal = document.getElementById('searchModal');
  const searchInput = document.getElementById('searchInput');

  document.getElementById('searchBtn').addEventListener('click', () => {
    searchModal.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
  });

  document.getElementById('searchOverlay').addEventListener('click', () => {
    searchModal.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchModal.classList.remove('active');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchModal.classList.add('active');
      setTimeout(() => searchInput.focus(), 100);
    }
  });

  // 搜索输入
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const results = document.getElementById('searchResults');
    if (!q) {
      results.innerHTML = '';
      return;
    }
    const matched = POSTS.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
    if (matched.length === 0) {
      results.innerHTML = '<div class="search-result"><div class="excerpt">未找到相关文章</div></div>';
      return;
    }
    results.innerHTML = matched.map(p => `
      <div class="search-result" onclick="location.hash='#/post/${encodeURIComponent(p.file)}';document.getElementById('searchModal').classList.remove('active')">
        <div class="title">${p.title}</div>
        <div class="excerpt">${(p.excerpt || '').slice(0, 80)} · ${p.date}</div>
      </div>
    `).join('');
  });

  // 回到顶部
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  } catch (e) {}
}

// ---------- 启动 ----------
init();
