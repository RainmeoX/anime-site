/* ============================================
   RainmeoX 博客 · 管理中心
   参考 CSDN / 博客园 的功能设计
   ============================================ */

// ---------- 配置存储 ----------
const STORAGE_KEYS = {
  posts: 'rainmeo_custom_posts',
  profile: 'rainmeo_profile',
  appearance: 'rainmeo_appearance',
  widgets: 'rainmeo_widgets',
  links: 'rainmeo_links',
  stats: 'rainmeo_stats'
};

// 默认配置
const DEFAULT_CONFIG = {
  profile: {
    name: 'RainmeoX',
    bio: '大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发',
    avatar: 'assets/images/avatar.jpg',
    location: '中国 · 深圳',
    github: 'https://github.com/RainmeoX',
    csdn: 'https://blog.csdn.net/m0_67166125',
    blog: 'https://www.rainmeo.xyz',
    elecfans: 'https://bbs.elecfans.com/jishu_2518692_1_1.html',
    skills: ['Python', 'PyTorch', 'LoRA 微调', 'vLLM', 'ROCm', 'Transformers', 'ChromaDB', 'K230', 'MicroPython', 'JavaScript', 'HTML/CSS', 'Selenium', 'Flask'],
    interests: ['大模型微调', '推理部署', 'RAG 应用', '嵌入式 AI', '网络安全', '自动化工具']
  },
  appearance: {
    theme: 'light',
    accentColor: '#ff6b9d',
    sakuraEnabled: true,
    sakuraCount: 15,
    fontSize: 14,
    radius: 12,
    layout: 'sidebar-right'
  },
  widgets: {
    profile: true,
    stats: true,
    tags: true,
    recent: true,
    links: true
  },
  links: [
    { name: 'GitHub', url: 'https://github.com/RainmeoX' },
    { name: 'CSDN', url: 'https://blog.csdn.net/m0_67166125' },
    { name: '博客主站', url: 'https://www.rainmeo.xyz' }
  ]
};

// ---------- 存储工具 ----------
function loadConfig(key) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (raw) return JSON.parse(raw);
    return DEFAULT_CONFIG[key] ? JSON.parse(JSON.stringify(DEFAULT_CONFIG[key])) : (key === 'posts' ? [] : {});
  } catch (e) {
    return DEFAULT_CONFIG[key] ? JSON.parse(JSON.stringify(DEFAULT_CONFIG[key])) : (key === 'posts' ? [] : {});
  }
}

function saveConfig(key, value, silent = false) {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  if (!silent) showToast('保存成功', 'success');
  // 文章或配置变更时通知主页面刷新
  if (key === 'posts' || key === 'profile' || key === 'widgets' || key === 'links' || key === 'appearance') {
    window.dispatchEvent(new Event('blog:refresh'));
  }
}

// ---------- Toast 提示 ----------
function showToast(msg, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ---------- 自定义文章管理 ----------
function loadCustomPosts() {
  return loadConfig('posts');
}

function saveCustomPost(post) {
  const posts = loadCustomPosts();
  if (post.id) {
    const idx = posts.findIndex(p => p.id === post.id);
    if (idx >= 0) posts[idx] = post;
    else posts.push(post);
  } else {
    post.id = 'custom_' + Date.now();
    post.date = post.date || new Date().toISOString().slice(0, 10);
    posts.unshift(post);
  }
  saveConfig('posts', posts);
  return post;
}

function deleteCustomPost(id) {
  const posts = loadCustomPosts().filter(p => p.id !== id);
  saveConfig('posts', posts);
}

function togglePostPin(id) {
  const posts = loadCustomPosts();
  const post = posts.find(p => p.id === id);
  if (post) {
    post.pinned = !post.pinned;
    saveConfig('posts', posts);
  }
}

function togglePostStatus(id) {
  const posts = loadCustomPosts();
  const post = posts.find(p => p.id === id);
  if (post) {
    post.status = post.status === 'draft' ? 'published' : 'draft';
    saveConfig('posts', posts);
  }
}

// ---------- 管理面板打开/关闭 ----------
function openAdmin(tab = 'posts') {
  document.getElementById('adminOverlay').classList.add('active');
  document.getElementById('adminPanel').classList.add('active');
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector(`.admin-tab[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  renderAdminTab(tab);
}

function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('active');
  document.getElementById('adminPanel').classList.remove('active');
}

// ---------- Tab 渲染分发 ----------
function renderAdminTab(tab) {
  const body = document.getElementById('adminBody');
  body.innerHTML = '';
  switch (tab) {
    case 'posts': renderPostsManager(body); break;
    case 'editor': renderEditor(body); break;
    case 'profile': renderProfileSettings(body); break;
    case 'appearance': renderAppearanceSettings(body); break;
    case 'widgets': renderWidgetSettings(body); break;
    case 'links': renderLinksSettings(body); break;
    case 'data': renderDataManager(body); break;
  }
}

// ---------- 1. 文章管理 ----------
function renderPostsManager(container) {
  const posts = loadCustomPosts();
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 class="section-header">📝 文章管理（${posts.length} 篇）</h3>
      <button class="btn btn-primary" onclick="openAdmin('editor')">+ 写新文章</button>
    </div>
    <div class="admin-post-list" id="adminPostList"></div>
  `;
  const list = container.querySelector('#adminPostList');
  if (posts.length === 0) {
    list.innerHTML = `
      <div class="admin-empty">
        <div class="empty-icon">📝</div>
        <div>还没有自定义文章</div>
        <div style="margin-top:8px;font-size:12px;">点击右上角"写新文章"开始创作</div>
      </div>
    `;
    return;
  }
  list.innerHTML = posts.map(p => `
    <div class="admin-post-item">
      <div class="post-info">
        <div class="title">${escapeHtml(p.title)}</div>
        <div class="meta">
          ${p.date}
          <span class="badge ${p.status === 'draft' ? 'badge-draft' : 'badge-published'}">${p.status === 'draft' ? '草稿' : '已发布'}</span>
          ${p.pinned ? '<span class="badge badge-pinned">置顶</span>' : ''}
          · ${(p.tags || []).join(', ')}
        </div>
      </div>
      <div class="post-actions">
        <button class="btn btn-secondary btn-sm" onclick="editPost('${p.id}')" title="编辑">✏️</button>
        <button class="btn btn-secondary btn-sm" onclick="togglePin('${p.id}')" title="置顶">📌</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleStatus('${p.id}')" title="切换状态">${p.status === 'draft' ? '📤' : '📥'}</button>
        <button class="btn btn-danger btn-sm" onclick="removePost('${p.id}')" title="删除">🗑</button>
      </div>
    </div>
  `).join('');
}

function editPost(id) {
  openAdmin('editor');
  setTimeout(() => loadPostToEditor(id), 50);
}

function togglePin(id) {
  togglePostPin(id);
  renderAdminTab('posts');
}

function toggleStatus(id) {
  togglePostStatus(id);
  renderAdminTab('posts');
}

function removePost(id) {
  if (confirm('确定删除这篇文章吗？此操作不可恢复。')) {
    deleteCustomPost(id);
    renderAdminTab('posts');
  }
}

// ---------- 2. 文章编辑器 ----------
let currentEditingPost = null;

function renderEditor(container) {
  container.innerHTML = `
    <h3 class="section-header">✏️ 写文章</h3>
    <div class="form-group">
      <label>标题 <span class="hint">必填</span></label>
      <input type="text" class="form-control" id="postTitle" placeholder="输入文章标题...">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="form-group">
        <label>分类</label>
        <input type="text" class="form-control" id="postCategory" placeholder="如：AI 微调">
      </div>
      <div class="form-group">
        <label>标签 <span class="hint">逗号分隔</span></label>
        <input type="text" class="form-control" id="postTags" placeholder="AI, LoRA, ROCm">
      </div>
    </div>
    <div class="form-group">
      <label>摘要 <span class="hint">显示在列表中</span></label>
      <textarea class="form-control" id="postExcerpt" rows="2" placeholder="一句话概括文章内容..."></textarea>
    </div>
    <div class="form-group">
      <label>正文（Markdown）</label>
      <div class="editor-toolbar">
        <button onclick="editorInsert('**','**','粗体')" title="粗体">B</button>
        <button onclick="editorInsert('*','*','斜体')" title="斜体">I</button>
        <button onclick="editorInsert('## ','','标题')" title="标题">H</button>
        <button onclick="editorInsert('- ','','列表项')" title="列表">•</button>
        <button onclick="editorInsert('1. ','','有序列表')" title="有序列表">1.</button>
        <button onclick="editorInsert('\`','\`','代码')" title="行内代码">&lt;/&gt;</button>
        <button onclick="editorInsert('\n\`\`\`\n','\n\`\`\`\n','代码块')" title="代码块">{ }</button>
        <button onclick="editorInsert('[','](url)','链接')" title="链接">🔗</button>
        <button onclick="editorInsert('\n![alt](','url)','图片')" title="图片">🖼</button>
        <button onclick="editorInsert('\n> ','','引用')" title="引用">"</button>
        <button onclick="editorInsert('\n---\n','','分隔线')" title="分隔线">—</button>
      </div>
      <div class="editor-container">
        <div class="editor-pane">
          <textarea id="postContent" placeholder="在这里输入 Markdown 内容..." oninput="updatePreview()"></textarea>
        </div>
        <div class="editor-pane preview" id="postPreview">
          <div class="preview-empty">预览区（输入内容后实时显示）</div>
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="savePost('published')">📤 发布</button>
      <button class="btn btn-secondary" onclick="savePost('draft')">💾 存草稿</button>
      <button class="btn btn-secondary" onclick="resetEditor()">🔄 清空</button>
      <span style="margin-left:auto;font-size:12px;color:var(--muted);align-self:center;" id="editorStatus"></span>
    </div>
  `;
  currentEditingPost = null;
}

function loadPostToEditor(id) {
  const posts = loadCustomPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  currentEditingPost = post;
  document.getElementById('postTitle').value = post.title || '';
  document.getElementById('postCategory').value = post.category || '';
  document.getElementById('postTags').value = (post.tags || []).join(', ');
  document.getElementById('postExcerpt').value = post.excerpt || '';
  document.getElementById('postContent').value = post.content || '';
  updatePreview();
  document.getElementById('editorStatus').textContent = `编辑中：${post.title}`;
}

function editorInsert(before, after, placeholder) {
  const ta = document.getElementById('postContent');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end) || placeholder;
  ta.value = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
  ta.focus();
  ta.selectionStart = start + before.length;
  ta.selectionEnd = start + before.length + selected.length;
  updatePreview();
}

function updatePreview() {
  const content = document.getElementById('postContent').value;
  const preview = document.getElementById('postPreview');
  if (!content.trim()) {
    preview.innerHTML = '<div class="preview-empty">预览区（输入内容后实时显示）</div>';
    return;
  }
  try {
    preview.innerHTML = marked.parse(content);
    preview.querySelectorAll('pre code').forEach(b => {
      try { hljs.highlightElement(b); } catch (e) {}
    });
  } catch (e) {
    preview.innerHTML = '<p style="color:red;">预览渲染失败</p>';
  }
}

function savePost(status) {
  const title = document.getElementById('postTitle').value.trim();
  if (!title) {
    showToast('请输入标题', 'error');
    return;
  }
  const contentEl = document.getElementById('editorTextarea') || document.getElementById('postContent');
  const content = contentEl ? contentEl.value : '';
  if (!content.trim()) {
    showToast('请输入正文内容', 'error');
    return;
  }
  const tags = document.getElementById('postTags').value
    .split(',').map(t => t.trim()).filter(Boolean);
  const post = {
    id: currentEditingPost ? currentEditingPost.id : null,
    title,
    category: document.getElementById('postCategory').value.trim() || '未分类',
    tags,
    excerpt: document.getElementById('postExcerpt').value.trim() || content.slice(0, 80),
    content,
    status,
    pinned: currentEditingPost ? currentEditingPost.pinned : false,
    date: currentEditingPost ? currentEditingPost.date : new Date().toISOString().slice(0, 10),
    file: currentEditingPost ? currentEditingPost.file : ('custom_' + Date.now() + '.md'),
    custom: true
  };
  const saved = saveCustomPost(post);
  currentEditingPost = saved;
  const statusEl = document.getElementById('editorStatus');
  if (statusEl) statusEl.textContent = `已保存：${saved.title}（${status === 'draft' ? '草稿' : '已发布'}）`;
  showToast(status === 'draft' ? '草稿已保存' : '文章已发布', 'success');
  // 触发主页面刷新
  window.dispatchEvent(new Event('blog:refresh'));
}

function resetEditor() {
  if (!confirm('确定清空编辑器内容吗？')) return;
  document.getElementById('postTitle').value = '';
  document.getElementById('postCategory').value = '';
  document.getElementById('postTags').value = '';
  document.getElementById('postExcerpt').value = '';
  document.getElementById('postContent').value = '';
  currentEditingPost = null;
  document.getElementById('editorStatus').textContent = '';
  updatePreview();
}

// ---------- 3. 个人资料设置 ----------
function renderProfileSettings(container) {
  const p = loadConfig('profile');
  container.innerHTML = `
    <h3 class="section-header">👤 个人资料</h3>
    <div class="form-group">
      <label>昵称</label>
      <input type="text" class="form-control" id="pfName" value="${escapeAttr(p.name)}">
    </div>
    <div class="form-group">
      <label>一句话简介</label>
      <input type="text" class="form-control" id="pfBio" value="${escapeAttr(p.bio)}">
    </div>
    <div class="form-group">
      <label>头像 URL <span class="hint">留空使用默认樱花</span></label>
      <input type="text" class="form-control" id="pfAvatar" value="${escapeAttr(p.avatar)}" placeholder="assets/images/avatar.jpg">
    </div>
    <div class="form-group">
      <label>所在地</label>
      <input type="text" class="form-control" id="pfLocation" value="${escapeAttr(p.location)}">
    </div>
    <h3 class="section-header" style="margin-top:24px;">🔗 社交链接</h3>
    <div class="form-group">
      <label>GitHub</label>
      <input type="text" class="form-control" id="pfGithub" value="${escapeAttr(p.github)}">
    </div>
    <div class="form-group">
      <label>CSDN</label>
      <input type="text" class="form-control" id="pfCsdn" value="${escapeAttr(p.csdn)}">
    </div>
    <div class="form-group">
      <label>博客主站</label>
      <input type="text" class="form-control" id="pfBlog" value="${escapeAttr(p.blog)}">
    </div>
    <div class="form-group">
      <label>电子发烧友</label>
      <input type="text" class="form-control" id="pfElecfans" value="${escapeAttr(p.elecfans)}">
    </div>
    <h3 class="section-header" style="margin-top:24px;">🏷 技能标签 <span class="hint">逗号分隔</span></h3>
    <div class="form-group">
      <textarea class="form-control" id="pfSkills" rows="3">${escapeHtml((p.skills || []).join(', '))}</textarea>
    </div>
    <h3 class="section-header" style="margin-top:24px;">💡 兴趣方向 <span class="hint">逗号分隔</span></h3>
    <div class="form-group">
      <textarea class="form-control" id="pfInterests" rows="3">${escapeHtml((p.interests || []).join(', '))}</textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="saveProfileSettings()">💾 保存</button>
      <button class="btn btn-secondary" onclick="resetProfileSettings()">🔄 恢复默认</button>
    </div>
  `;
}

function saveProfileSettings() {
  const profile = {
    name: document.getElementById('pfName').value.trim() || 'RainmeoX',
    bio: document.getElementById('pfBio').value.trim(),
    avatar: document.getElementById('pfAvatar').value.trim(),
    location: document.getElementById('pfLocation').value.trim(),
    github: document.getElementById('pfGithub').value.trim(),
    csdn: document.getElementById('pfCsdn').value.trim(),
    blog: document.getElementById('pfBlog').value.trim(),
    elecfans: document.getElementById('pfElecfans').value.trim(),
    skills: document.getElementById('pfSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    interests: document.getElementById('pfInterests').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  saveConfig('profile', profile);
  if (typeof window.onProfileChange === 'function') window.onProfileChange();
}

function resetProfileSettings() {
  if (confirm('确定恢复默认个人资料吗？')) {
    localStorage.removeItem(STORAGE_KEYS.profile);
    renderAdminTab('profile');
    showToast('已恢复默认', 'success');
    if (typeof window.onProfileChange === 'function') window.onProfileChange();
  }
}

// ---------- 4. 外观设置 ----------
function renderAppearanceSettings(container) {
  const a = loadConfig('appearance');
  const colors = ['#ff6b9d', '#a78bfa', '#5b87d1', '#5fc88f', '#f0c674', '#f85149', '#06b6d4', '#8b5cf6'];
  container.innerHTML = `
    <h3 class="section-header">🎨 外观设置</h3>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">主题模式</div>
        <div class="setting-desc">亮色 / 暗色</div>
      </div>
      <select class="form-control" id="apTheme" style="width:auto;">
        <option value="light" ${a.theme === 'light' ? 'selected' : ''}>亮色（浅蓝粉）</option>
        <option value="dark" ${a.theme === 'dark' ? 'selected' : ''}>暗色（深紫）</option>
      </select>
    </div>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">强调色</div>
        <div class="setting-desc">按钮、链接、边框的主色调</div>
      </div>
      <div class="color-picker-row" id="apColors">
        ${colors.map(c => `<div class="color-swatch ${c === a.accentColor ? 'selected' : ''}" style="background:${c};" onclick="selectColor('${c}')" data-color="${c}"></div>`).join('')}
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">樱花飘落动画</div>
        <div class="setting-desc">页面背景的樱花飘落效果</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="apSakura" ${a.sakuraEnabled ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">樱花数量 <span class="hint" id="sakuraCountVal">${a.sakuraCount}</span></div>
        <div class="setting-desc">飘落樱花的花瓣数（5-50）</div>
      </div>
      <input type="range" id="apSakuraCount" min="5" max="50" value="${a.sakuraCount}" style="width:150px;" oninput="document.getElementById('sakuraCountVal').textContent=this.value">
    </div>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">正文字号 <span class="hint" id="fontSizeVal">${a.fontSize}px</span></div>
        <div class="setting-desc">全局正文字体大小（12-18px）</div>
      </div>
      <input type="range" id="apFontSize" min="12" max="18" value="${a.fontSize}" style="width:150px;" oninput="document.getElementById('fontSizeVal').textContent=this.value+'px'">
    </div>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">圆角大小 <span class="hint" id="radiusVal">${a.radius}px</span></div>
        <div class="setting-desc">卡片、按钮的圆角半径（0-20px）</div>
      </div>
      <input type="range" id="apRadius" min="0" max="20" value="${a.radius}" style="width:150px;" oninput="document.getElementById('radiusVal').textContent=this.value+'px'">
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="saveAppearance()">💾 保存并应用</button>
      <button class="btn btn-secondary" onclick="resetAppearance()">🔄 恢复默认</button>
    </div>
  `;
}

function selectColor(color) {
  document.querySelectorAll('#apColors .color-swatch').forEach(s => s.classList.remove('selected'));
  document.querySelector(`#apColors .color-swatch[data-color="${color}"]`).classList.add('selected');
}

function saveAppearance() {
  const appearance = {
    theme: document.getElementById('apTheme').value,
    accentColor: document.querySelector('#apColors .color-swatch.selected')?.dataset.color || '#ff6b9d',
    sakuraEnabled: document.getElementById('apSakura').checked,
    sakuraCount: parseInt(document.getElementById('apSakuraCount').value),
    fontSize: parseInt(document.getElementById('apFontSize').value),
    radius: parseInt(document.getElementById('apRadius').value),
    layout: 'sidebar-right'
  };
  saveConfig('appearance', appearance);
  applyAppearance(appearance);
  showToast('外观已更新', 'success');
}

function resetAppearance() {
  if (confirm('确定恢复默认外观吗？')) {
    localStorage.removeItem(STORAGE_KEYS.appearance);
    renderAdminTab('appearance');
    applyAppearance(DEFAULT_CONFIG.appearance);
    showToast('已恢复默认', 'success');
  }
}

function applyAppearance(a) {
  if (!a) a = loadConfig('appearance');
  // 主题
  document.documentElement.setAttribute('data-theme', a.theme);
  if (typeof CURRENT_THEME !== 'undefined') {
    CURRENT_THEME = a.theme;
    localStorage.setItem('theme', a.theme);
  }
  // 强调色
  document.documentElement.style.setProperty('--pink', a.accentColor);
  // 字号
  document.body.style.fontSize = a.fontSize + 'px';
  // 圆角
  document.documentElement.style.setProperty('--radius', a.radius + 'px');
  document.documentElement.style.setProperty('--radius-sm', (a.radius - 4) + 'px');
  // 樱花
  const container = document.getElementById('sakura-container');
  if (container) {
    container.style.display = a.sakuraEnabled ? 'block' : 'none';
  }
  if (a.sakuraEnabled && typeof createSakura === 'function') {
    createSakura(a.sakuraCount);
  }
}

// ---------- 5. 侧边栏设置 ----------
function renderWidgetSettings(container) {
  const w = loadConfig('widgets');
  const widgets = [
    { key: 'profile', name: '个人资料卡', desc: '头像、昵称、简介、地点' },
    { key: 'stats', name: '统计数据', desc: '文章数、项目数、标签数' },
    { key: 'tags', name: '技能标签云', desc: '技术栈标签展示' },
    { key: 'recent', name: '最近文章', desc: '最新 5 篇文章列表' },
    { key: 'links', name: '友情链接', desc: '外部链接卡片' }
  ];
  container.innerHTML = `
    <h3 class="section-header">🧩 侧边栏模块</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">勾选要在侧边栏显示的模块</p>
    ${widgets.map(widget => `
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">${widget.name}</div>
          <div class="setting-desc">${widget.desc}</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="widget_${widget.key}" ${w[widget.key] ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `).join('')}
    <div class="btn-row">
      <button class="btn btn-primary" onclick="saveWidgets()">💾 保存</button>
    </div>
  `;
}

function saveWidgets() {
  const widgets = {};
  ['profile', 'stats', 'tags', 'recent', 'links'].forEach(k => {
    widgets[k] = document.getElementById('widget_' + k).checked;
  });
  saveConfig('widgets', widgets);
  if (typeof window.onWidgetsChange === 'function') window.onWidgetsChange();
}

// ---------- 6. 友情链接 ----------
function renderLinksSettings(container) {
  const links = loadConfig('links');
  container.innerHTML = `
    <h3 class="section-header">🔗 友情链接</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">侧边栏"链接"模块显示的内容</p>
    <div id="linksList">
      ${links.map((l, i) => `
        <div class="link-edit-row" data-idx="${i}">
          <input type="text" class="form-control link-name" value="${escapeAttr(l.name)}" placeholder="名称">
          <input type="text" class="form-control link-url" value="${escapeAttr(l.url)}" placeholder="URL">
          <button class="btn btn-danger btn-sm" onclick="removeLink(${i})">🗑</button>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-secondary" onclick="addLink()" style="margin:12px 0;">+ 添加链接</button>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="saveLinks()">💾 保存</button>
    </div>
  `;
}

function addLink() {
  const list = document.getElementById('linksList');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'link-edit-row';
  div.dataset.idx = idx;
  div.innerHTML = `
    <input type="text" class="form-control link-name" placeholder="名称">
    <input type="text" class="form-control link-url" placeholder="URL">
    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">🗑</button>
  `;
  list.appendChild(div);
}

function removeLink(idx) {
  const list = document.getElementById('linksList');
  if (list.children[idx]) list.children[idx].remove();
}

function saveLinks() {
  const rows = document.querySelectorAll('#linksList .link-edit-row');
  const links = [];
  rows.forEach(row => {
    const name = row.querySelector('.link-name').value.trim();
    const url = row.querySelector('.link-url').value.trim();
    if (name && url) links.push({ name, url });
  });
  saveConfig('links', links);
  if (typeof window.onLinksChange === 'function') window.onLinksChange();
}

// ---------- 7. 数据管理 ----------
function renderDataManager(container) {
  const posts = loadCustomPosts();
  const profile = loadConfig('profile');
  const links = loadConfig('links');
  const totalSize = JSON.stringify({
    posts, profile, links,
    appearance: loadConfig('appearance'),
    widgets: loadConfig('widgets')
  }).length;
  container.innerHTML = `
    <h3 class="section-header">💾 数据管理</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">
      所有数据保存在浏览器 localStorage 中，可导出备份或导入恢复。
    </p>
    <div class="data-card">
      <div class="data-title">📊 数据统计</div>
      <div class="data-desc">
        自定义文章：${posts.length} 篇<br>
        友情链接：${links.length} 个<br>
        数据大小：${(totalSize / 1024).toFixed(2)} KB
      </div>
    </div>
    <div class="data-card">
      <div class="data-title">📤 导出数据</div>
      <div class="data-desc">将所有配置和文章导出为 JSON 文件备份</div>
      <button class="btn btn-primary" onclick="exportData()">📥 导出 JSON</button>
    </div>
    <div class="data-card">
      <div class="data-title">📥 导入数据</div>
      <div class="data-desc">从 JSON 文件恢复配置（会覆盖现有数据）</div>
      <input type="file" id="importFile" accept=".json" style="display:none;" onchange="importData(event)">
      <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">📤 选择文件</button>
    </div>
    <div class="data-card">
      <div class="data-title">🗑 清空数据</div>
      <div class="data-desc">删除所有自定义配置和文章（不可恢复）</div>
      <button class="btn btn-danger" onclick="clearAllData()">⚠️ 清空所有</button>
    </div>
  `;
}

function exportData() {
  const data = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    posts: loadCustomPosts(),
    profile: loadConfig('profile'),
    appearance: loadConfig('appearance'),
    widgets: loadConfig('widgets'),
    links: loadConfig('links')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rainmeo-blog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('确定导入吗？这将覆盖现有数据。')) return;
      if (data.posts) saveConfig('posts', data.posts);
      if (data.profile) saveConfig('profile', data.profile);
      if (data.appearance) saveConfig('appearance', data.appearance);
      if (data.widgets) saveConfig('widgets', data.widgets);
      if (data.links) saveConfig('links', data.links);
      showToast('导入成功，即将刷新', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      showToast('文件格式错误', 'error');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('⚠️ 确定清空所有自定义数据吗？\n\n这包括：\n- 所有自定义文章\n- 个人资料修改\n- 外观设置\n- 侧边栏配置\n- 友情链接\n\n此操作不可恢复！')) return;
  if (!confirm('再次确认：真的要清空所有数据吗？')) return;
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  showToast('已清空，即将刷新', 'success');
  setTimeout(() => location.reload(), 1500);
}

// ---------- 工具函数 ----------
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s);
}

// ---------- 初始化 ----------
document.addEventListener('DOMContentLoaded', () => {
  // Tab 切换
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAdminTab(tab.dataset.tab);
    });
  });
  // 关闭
  document.getElementById('adminClose').addEventListener('click', closeAdmin);
  document.getElementById('adminOverlay').addEventListener('click', closeAdmin);
  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAdmin();
  });
  // 应用外观
  applyAppearance(loadConfig('appearance'));
});
