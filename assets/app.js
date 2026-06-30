/* ============================================
   RainmeoX 樱花博客 · 主逻辑
   左右侧布局 + 樱花飘落动画
   ============================================ */

// ---------- 配置 ----------
const DEFAULT_PROFILE = {
  name: 'RainmeoX',
  bio: '大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发',
  avatar: 'assets/images/avatar.jpg',
  github: 'https://github.com/RainmeoX',
  csdn: 'https://blog.csdn.net/m0_67166125',
  blog: 'https://www.rainmeo.xyz',
  elecfans: 'https://bbs.elecfans.com/user/6963000/',
  location: '中国 · 深圳',
  skills: ['Python', 'PyTorch', 'LoRA 微调', 'vLLM', 'ROCm', 'Transformers', 'ChromaDB', 'K230', 'MicroPython', 'JavaScript', 'HTML/CSS', 'Selenium', 'Flask'],
  interests: ['大模型微调', '推理部署', 'RAG 应用', '嵌入式 AI', '网络安全', '自动化工具']
};

// 动态获取 PROFILE（合并自定义配置）
function getProfile() {
  try {
    const custom = JSON.parse(localStorage.getItem('rainmeo_profile') || '{}');
    return { ...DEFAULT_PROFILE, ...custom };
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}
let PROFILE = getProfile();

const PROJECTS = [
  { name: 'zzz-yixuan-assistant', desc: '基于 Qwen3-4B + LoRA 微调的角色风格化对话系统后端，vLLM 部署 + RAG 检索 + 防 OOC 校验', lang: 'Python', stars: 0 },
  { name: 'zzz-yixuan-webui', desc: '纯原生 HTML/CSS/JS 打造的对话助手前端，零依赖，支持桌面/平板/手机三档响应式布局', lang: 'CSS', stars: 0 },
  { name: 'arknights-qwen-assistant', desc: '基于 Qwen3-0.6B + LoRA 的垂直知识问答系统，133 个实体 8846 条问答，8 分钟训练完成', lang: 'Python', stars: 0 },
  { name: 'gemma4-emotion-lora-rocm', desc: 'Gemma4-E4B 情绪分类 LoRA 微调，AMD ROCm 单卡 17 分钟训练，准确率 0.625→0.915', lang: 'Python', stars: 0 },
  { name: 'K230-Vision-System', desc: '基于 K230 AI 芯片的多功能嵌入式视觉检测系统，三角形/圆形/矩形检测 + 二维码识别 + UART 通信', lang: 'C++', stars: 0 },
  { name: 'Web-Security-Learning', desc: '网络安全学习项目，Web 安全 7 主题 + 应急响应 4 主题，配套 Flask 靶场与攻击脚本', lang: 'Markdown', stars: 0 },
  { name: 'auto-publisher', desc: '自动化发布与数据采集工具集，CSDN 自动发布 + 飞书/雨课堂文档采集 + GitHub 仓库管理', lang: 'Python', stars: 0 },
  { name: 'anime-site', desc: '个人博客网站，纯原生 HTML/CSS/JS 单文件实现，樱花主题 + 左右侧布局', lang: 'CSS', stars: 0 },
];

// ---------- 全局状态 ----------
let POSTS = [];
let CURRENT_THEME = localStorage.getItem('theme') || 'light';

// ---------- 初始化 ----------
async function init() {
  applyTheme();
  await loadPosts();
  bindEvents();
  startSakura();
  renderSidebar();
  router();
  fetchGitHubStars();
  // 监听管理面板的刷新事件
  window.addEventListener('blog:refresh', async () => {
    PROFILE = getProfile();  // 重新加载个人资料
    await loadPosts();
    renderSidebar();
    router();
  });

  // 跨标签页通信：接收后台管理面板的配置变更通知
  try {
    const bc = new BroadcastChannel('rainmeo_blog');
    bc.onmessage = async (e) => {
      if (e.data.type === 'config_changed') {
        PROFILE = getProfile();
        await loadPosts();
        renderSidebar();
        router();
      }
    };
  } catch(e) {}
}

// ---------- 樱花飘落 ----------
function startSakura() {
  const container = document.getElementById('sakura-container');
  const emojis = ['🌸', '🌺', '💮'];
  function createSakura() {
    const s = document.createElement('div');
    s.className = 'sakura';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = Math.random() * 100 + '%';
    s.style.fontSize = (12 + Math.random() * 14) + 'px';
    s.style.animationDuration = (8 + Math.random() * 8) + 's';
    s.style.opacity = 0.4 + Math.random() * 0.4;
    container.appendChild(s);
    setTimeout(() => s.remove(), 16000);
  }
  setInterval(createSakura, 600);
  for (let i = 0; i < 8; i++) setTimeout(createSakura, i * 200);
}

// ---------- 主题 ----------
function applyTheme() {
  document.documentElement.setAttribute('data-theme', CURRENT_THEME);
  localStorage.setItem('theme', CURRENT_THEME);
}

// ---------- 加载文章 ----------
async function loadPosts() {
  try {
    const res = await fetch('posts/posts.json');
    const builtin = await res.json();
    // 合并自定义文章（来自管理面板）
    const custom = JSON.parse(localStorage.getItem('rainmeo_custom_posts') || '[]');
    POSTS = [...custom, ...builtin];
    // 置顶的排前面
    POSTS.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });
  } catch (e) {
    console.error('加载文章失败', e);
    const custom = JSON.parse(localStorage.getItem('rainmeo_custom_posts') || '[]');
    POSTS = custom;
  }
}

// ---------- 渲染侧边栏 ----------
function renderSidebar() {
  // 读取侧边栏模块开关配置
  let widgets = {};
  try {
    widgets = JSON.parse(localStorage.getItem('rainmeo_widgets') || '{}');
  } catch (e) {}

  // 根据配置控制各模块显示/隐藏
  const toggleWidget = (selector, key) => {
    const el = document.querySelector(selector);
    if (el) el.style.display = widgets[key] === false ? 'none' : '';
  };
  toggleWidget('.profile-widget', 'profile');
  toggleWidget('.profile-stats', 'stats');
  toggleWidget('.tag-cloud-widget', 'tags');
  toggleWidget('.recent-posts-widget', 'recent');
  toggleWidget('.links-widget', 'links');

  // 统计
  document.getElementById('statPosts').textContent = POSTS.length;
  document.getElementById('statProjects').textContent = PROJECTS.length;
  const allTags = new Set();
  POSTS.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));
  document.getElementById('statTags').textContent = allTags.size;

  // 技能标签云
  const tagCloud = document.getElementById('tagCloud');
  tagCloud.innerHTML = PROFILE.skills.map(s =>
    `<span class="tag-item" onclick="location.hash='#/tags'">${s}</span>`
  ).join('');

  // 最近文章（取前 5 篇）
  const recentList = document.getElementById('recentList');
  const recent = POSTS.slice(0, 5);
  recentList.innerHTML = recent.length === 0
    ? '<li style="color:var(--muted);font-size:13px;">暂无文章</li>'
    : recent.map(p => `
      <li>
        <a href="#/post/${encodeURIComponent(p.file)}">${p.title}</a>
        <span class="recent-date">${p.date}</span>
      </li>
    `).join('');

  // 动态渲染友链（从后台管理读取）
  const links = JSON.parse(localStorage.getItem('rainmeo_links') || 'null');
  if (links && links.length > 0) {
    const linksList = document.querySelector('.links-list');
    if (linksList) {
      linksList.innerHTML = links.map(l =>
        `<li><a href="${l.url}" target="_blank" rel="noopener"><span>${l.name}</span></a></li>`
      ).join('');
    }
  }
}

// ---------- 路由 ----------
function router() {
  const hash = location.hash.slice(1) || '/';
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  // 更新导航激活态
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-route') === hash);
  });

  if (hash === '/') renderHome(main);
  else if (hash === '/blog') renderBlog(main);
  else if (hash === '/projects') renderProjects(main);
  else if (hash === '/tags') renderTags(main);
  else if (hash === '/about') renderAbout(main);
  else if (hash.startsWith('/post/')) renderPost(main, decodeURIComponent(hash.slice(6)));
  else renderHome(main);

  window.scrollTo(0, 0);
}

// ---------- 首页 ----------
function renderHome(el) {
  const recent = POSTS.slice(0, 5);
  el.innerHTML = `
    <div class="hero">
      <h1>🌸 RainmeoX</h1>
      <p class="tagline">${PROFILE.bio}<br>用代码点亮喜欢的角色</p>
      <div class="hero-tags">
        ${PROFILE.interests.map(t => `<span class="hero-tag">${t}</span>`).join('')}
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-title">最新文章</h2>
      <a href="#/blog" class="section-count">查看全部 →</a>
    </div>
    <div class="post-list">
      ${recent.length === 0
        ? '<div class="empty-state"><div class="empty-icon">📝</div>暂无文章</div>'
        : recent.map(postCardHTML).join('')}
    </div>
  `;
}

// ---------- 博客页 ----------
function renderBlog(el) {
  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">全部文章</h2>
      <span class="section-count">${POSTS.length} 篇</span>
    </div>
    <div class="post-list">
      ${POSTS.length === 0
        ? '<div class="empty-state"><div class="empty-icon">📝</div>暂无文章</div>'
        : POSTS.map(postCardHTML).join('')}
    </div>
  `;
}

// ---------- 文章卡片 HTML ----------
function postCardHTML(p) {
  const date = new Date(p.date);
  const day = date.getDate();
  const month = (date.getMonth() + 1) + '月';
  return `
    <div class="post-card" onclick="location.hash='#/post/${encodeURIComponent(p.file)}'">
      <div class="post-date">
        <span class="day">${day}</span>
        <span class="month">${month}</span>
      </div>
      <div class="post-content">
        <a href="#/post/${encodeURIComponent(p.file)}" class="post-title">${p.title}</a>
        <p class="post-excerpt">${p.excerpt || ''}</p>
        <div class="post-tags">
          ${(p.tags || []).slice(0, 4).map(t => `<span class="post-tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ---------- 项目页 ----------
function renderProjects(el) {
  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">开源项目</h2>
      <span class="section-count">${PROJECTS.length} 个</span>
    </div>
    <div class="project-grid">
      ${PROJECTS.map(p => `
        <a class="project-card" href="https://github.com/RainmeoX/${p.name}" target="_blank" rel="noopener">
          <div class="project-name">${p.name}</div>
          <div class="project-desc">${p.desc}</div>
          <div class="project-meta">
            <span class="project-lang">${p.lang}</span>
            <span data-repo="${p.name}">⭐ ${p.stars}</span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

// ---------- 标签页 ----------
function renderTags(el) {
  const tagMap = {};
  POSTS.forEach(p => (p.tags || []).forEach(t => {
    if (!tagMap[t]) tagMap[t] = [];
    tagMap[t].push(p);
  }));
  const tags = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);
  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">标签</h2>
      <span class="section-count">${tags.length} 个</span>
    </div>
    <div class="post-list">
      ${tags.map(t => `
        <div class="post-card" style="cursor:default;">
          <div class="post-content">
            <h3 style="color:var(--pink);margin-bottom:12px;">🏷 ${t} <span style="font-size:13px;color:var(--muted);">(${tagMap[t].length})</span></h3>
            ${tagMap[t].map(p => `
              <div style="padding:8px 0;border-bottom:1px solid var(--border-light);">
                <a href="#/post/${encodeURIComponent(p.file)}" style="color:var(--text-secondary);text-decoration:none;font-size:14px;">${p.title}</a>
                <span style="font-size:12px;color:var(--muted);margin-left:8px;">${p.date}</span>
              </div>
            `).join('')}
          </div>
        </div>
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
      <h2>🌸 RainmeoX</h2>
      <p>${PROFILE.bio}</p>
      <p>📍 ${PROFILE.location}</p>
      <p>专注大语言模型微调、高性能推理部署与嵌入式边缘视觉，掌握 Transformer 架构、LoRA 参数高效微调与 vLLM 推理优化技术。基于 AMD ROCm 生态独立完成 Qwen3-4B、Qwen3-0.6B、Gemma4-E4B 三个大模型的 LoRA 微调与部署，具备从数据集构建、模型训练、推理服务到前端 UI 的全链路交付能力；同时具备 K230 嵌入式视觉算法开发经验。</p>
      <h2 style="margin-top:24px;">🛠 技能栈</h2>
      <div class="about-skills">
        ${PROFILE.skills.map(s => `<span class="about-skill">${s}</span>`).join('')}
      </div>
      <h2 style="margin-top:24px;">🔗 链接</h2>
      <p>
        GitHub: <a href="${PROFILE.github}" target="_blank" style="color:var(--pink);">${PROFILE.github}</a><br>
        CSDN: <a href="${PROFILE.csdn}" target="_blank" style="color:var(--pink);">${PROFILE.csdn}</a><br>
        博客: <a href="${PROFILE.blog}" target="_blank" style="color:var(--pink);">${PROFILE.blog}</a><br>
        电子发烧友: <a href="${PROFILE.elecfans}" target="_blank" style="color:var(--pink);">${PROFILE.elecfans}</a>
      </p>
    </div>
  `;
}

// ---------- 文章详情 ----------
async function renderPost(el, file) {
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>加载中...</div>';
  try {
    const post = POSTS.find(p => p.file === file) || {};
    let md = '';
    // 优先从自定义文章读取
    if (post.custom) {
      const customPosts = JSON.parse(localStorage.getItem('rainmeo_custom_posts') || '[]');
      const found = customPosts.find(p => p.file === file);
      md = found ? found.content : '';
    } else {
      const res = await fetch(`posts/${file}`);
      if (!res.ok) throw new Error('文章不存在');
      md = await res.text();
    }
    const html = marked.parse(md);
    el.innerHTML = `
      <button class="back-btn" onclick="history.back()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        返回
      </button>
      <article class="post-detail">
        <h1 class="post-title-large">${post.title || file}${post.pinned ? ' <span style="color:var(--pink);font-size:14px;">📌 置顶</span>' : ''}</h1>
        <div class="post-meta">
          <span>📅 ${post.date || ''}</span>
          <span>📂 ${post.category || ''}</span>
          <span>🏷 ${(post.tags || []).join(', ')}</span>
        </div>
        <div id="toc-placeholder"></div>
        <div class="post-body">${html}</div>
        ${buildPostNav(post)}
      </article>
    `;

    // 生成目录（TOC）
    buildTOC(el);

    // 代码高亮
    el.querySelectorAll('pre code').forEach(b => {
      try { hljs.highlightElement(b); } catch (e) {}
    });
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div>文章加载失败</div>';
  }
}

// ---------- 上一篇/下一篇文章导航 ----------
function buildPostNav(currentPost) {
  // 在 POSTS 数组中找到当前文章的位置
  const idx = POSTS.findIndex(p => p.file === currentPost.file);
  if (idx === -1) return '';

  // POSTS 按日期倒序排列，idx-1 是下一篇（更新的），idx+1 是上一篇（更旧的）
  const prevPost = idx < POSTS.length - 1 ? POSTS[idx + 1] : null; // 上一篇（更旧的文章）
  const nextPost = idx > 0 ? POSTS[idx - 1] : null; // 下一篇（更新的文章）

  return `
    <nav class="post-nav">
      <div class="post-nav-item post-nav-prev">
        ${prevPost
          ? `<a href="#/post/${encodeURIComponent(prevPost.file)}" class="post-nav-link">
              <span class="post-nav-label">← 上一篇</span>
              <span class="post-nav-title">${prevPost.title}</span>
            </a>`
          : `<span class="post-nav-link post-nav-disabled">
              <span class="post-nav-label">← 上一篇</span>
              <span class="post-nav-title">已是第一篇</span>
            </span>`
        }
      </div>
      <div class="post-nav-item post-nav-next">
        ${nextPost
          ? `<a href="#/post/${encodeURIComponent(nextPost.file)}" class="post-nav-link">
              <span class="post-nav-label">下一篇 →</span>
              <span class="post-nav-title">${nextPost.title}</span>
            </a>`
          : `<span class="post-nav-link post-nav-disabled">
              <span class="post-nav-label">下一篇 →</span>
              <span class="post-nav-title">已是最后一篇</span>
            </span>`
        }
      </div>
    </nav>
  `;
}

// ---------- 文章目录（TOC）生成 ----------
function buildTOC(el) {
  const postBody = el.querySelector('.post-body');
  if (!postBody) return;

  // 提取所有 h2 和 h3 标题
  const headings = postBody.querySelectorAll('h2, h3');
  if (headings.length === 0) return;

  const tocItems = [];

  headings.forEach((h, i) => {
    // 自动生成 id（锚点跳转用）
    const id = 'heading-' + i + '-' + (h.textContent || '').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
    h.id = id;

    tocItems.push({
      level: h.tagName.toLowerCase(),
      text: h.textContent,
      id: id
    });
  });

  // 构建 TOC HTML
  const tocHTML = `
    <details class="toc-container" open>
      <summary class="toc-title">目录</summary>
      <nav class="toc-list">
        ${tocItems.map(item => `
          <a href="#${item.id}" class="toc-item toc-${item.level}" data-toc-target="${item.id}">
            ${item.text}
          </a>
        `).join('')}
      </nav>
    </details>
  `;

  const placeholder = el.querySelector('#toc-placeholder');
  if (placeholder) {
    placeholder.innerHTML = tocHTML;

    // 点击 TOC 项平滑滚动到对应标题
    placeholder.querySelectorAll('.toc-item').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.getElementById(this.getAttribute('data-toc-target'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
}

// ---------- 事件绑定 ----------
function bindEvents() {
  // 主题切换
  document.getElementById('themeBtn').addEventListener('click', () => {
    CURRENT_THEME = CURRENT_THEME === 'light' ? 'dark' : 'light';
    applyTheme();
  });

  // 移动端菜单
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // 路由
  window.addEventListener('hashchange', router);

  // 搜索
  const searchModal = document.getElementById('searchModal');
  const searchInput = document.getElementById('searchInput');
  document.getElementById('searchBtn').addEventListener('click', () => {
    searchModal.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
  });
  document.getElementById('searchClose').addEventListener('click', () => {
    searchModal.classList.remove('active');
  });
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) searchModal.classList.remove('active');
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchModal.classList.add('active');
      setTimeout(() => searchInput.focus(), 100);
    }
    if (e.key === 'Escape') searchModal.classList.remove('active');
  });
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
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
