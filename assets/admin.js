/* ============================================
   RainmeoX 博客 · 管理中心（独立后台页面版）
   模块化命名空间架构 — Admin 全局单例
   适配 admin.html 独立页面结构
   ============================================ */

const Admin = (function () {
  'use strict';

  // ==================== 工具函数 ====================
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // ==================== Auth — 登录认证 ====================
  const Auth = {
    AUTH_HASH: '08cddd5f3963f8a80b06b9a65b4dffe97663af09ee91d0303561aeb662476a16',

    async sha256(str) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async login() {
      const userInput = document.getElementById('loginUsername');
      const passInput = document.getElementById('loginPassword');
      const errorEl = document.getElementById('loginError');
      const submitBtn = document.getElementById('loginSubmit');
      const username = userInput.value.trim();
      const password = passInput.value;

      userInput.classList.remove('input-error');
      passInput.classList.remove('input-error');
      errorEl.textContent = '';

      if (!username || !password) {
        errorEl.textContent = '请输入用户名和密码';
        if (!username) userInput.classList.add('input-error');
        if (!password) passInput.classList.add('input-error');
        return;
      }

      submitBtn.textContent = '⏳ 验证中...';
      submitBtn.disabled = true;

      const inputHash = await this.sha256(username + ':' + password);
      if (inputHash === this.AUTH_HASH) {
        localStorage.setItem('rainmeo_admin_remember_user', username);
        sessionStorage.setItem('rainmeo_admin_auth', 'true');
        // 隐藏登录弹窗，显示后台布局
        document.getElementById('loginOverlay').classList.remove('active');
        document.getElementById('adminLayout').style.display = 'flex';
        // 渲染侧边栏并切换到仪表盘
        Page.renderSidebar();
        Page.switchTo('dashboard');
      } else {
        errorEl.textContent = '用户名或密码错误';
        userInput.classList.add('input-error');
        passInput.classList.add('input-error');
        passInput.value = '';
        setTimeout(() => passInput.focus(), 100);
      }

      submitBtn.textContent = '🔐 登 录';
      submitBtn.disabled = false;
    },

    logout() {
      sessionStorage.removeItem('rainmeo_admin_auth');
      document.getElementById('adminLayout').style.display = 'none';
      document.getElementById('loginOverlay').classList.add('active');
      // 重置登录表单
      const remembered = localStorage.getItem('rainmeo_admin_remember_user') || '';
      document.getElementById('loginUsername').value = remembered;
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginError').textContent = '';
      UI.toast('已退出登录', 'success');
    },

    check() {
      return sessionStorage.getItem('rainmeo_admin_auth') === 'true';
    }
  };

  // ==================== Store — 数据存储 ====================
  const Store = {
    KEYS: {
      posts: 'rainmeo_custom_posts',
      profile: 'rainmeo_profile',
      appearance: 'rainmeo_appearance',
      widgets: 'rainmeo_widgets',
      links: 'rainmeo_links',
      stats: 'rainmeo_stats'
    },

    DEFAULTS: {
      profile: {
        name: 'RainmeoX',
        bio: '大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发',
        avatar: 'assets/images/avatar.jpg',
        location: '中国 · 深圳',
        github: 'https://github.com/RainmeoX',
        csdn: 'https://blog.csdn.net/m0_67166125',
        blog: 'https://www.rainmeo.xyz',
        elecfans: 'https://bbs.elecfans.com/user/6963000/',
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
        { name: '博客主站', url: 'https://www.rainmeo.xyz' },
        { name: '电子发烧友', url: 'https://bbs.elecfans.com/user/6963000/' }
      ]
    },

    get(key) {
      try {
        const raw = localStorage.getItem(this.KEYS[key]);
        if (raw) return JSON.parse(raw);
        return this.DEFAULTS[key]
          ? JSON.parse(JSON.stringify(this.DEFAULTS[key]))
          : (key === 'posts' ? [] : {});
      } catch (e) {
        return this.DEFAULTS[key]
          ? JSON.parse(JSON.stringify(this.DEFAULTS[key]))
          : (key === 'posts' ? [] : {});
      }
    },

    set(key, value, silent = false) {
      localStorage.setItem(this.KEYS[key], JSON.stringify(value));
      if (!silent) UI.toast('保存成功', 'success');
      if (['posts', 'profile', 'widgets', 'links', 'appearance'].includes(key)) {
        window.dispatchEvent(new Event('blog:refresh'));
        // 跨标签页通信：通知主站 index.html 刷新
        try {
          const bc = new BroadcastChannel('rainmeo_blog');
          bc.postMessage({ type: 'config_changed', key });
        } catch(e) {}
      }
    },

    reset(key) {
      localStorage.removeItem(this.KEYS[key]);
      return this.get(key);
    },

    // 自定义文章 CRUD
    posts: {
      list() { return Store.get('posts'); },

      save(post) {
        const posts = Store.get('posts');
        if (post.id) {
          const idx = posts.findIndex(p => p.id === post.id);
          if (idx >= 0) posts[idx] = post;
          else posts.push(post);
        } else {
          post.id = 'custom_' + Date.now();
          post.date = post.date || new Date().toISOString().slice(0, 10);
          posts.unshift(post);
        }
        Store.set('posts', posts);
        return post;
      },

      delete(id) {
        const posts = Store.get('posts').filter(p => p.id !== id);
        Store.set('posts', posts);
      },

      togglePin(id) {
        const posts = Store.get('posts');
        const post = posts.find(p => p.id === id);
        if (post) {
          post.pinned = !post.pinned;
          Store.set('posts', posts);
        }
      },

      toggleStatus(id) {
        const posts = Store.get('posts');
        const post = posts.find(p => p.id === id);
        if (post) {
          post.status = post.status === 'draft' ? 'published' : 'draft';
          Store.set('posts', posts);
        }
      }
    },

    exportAll() {
      return {
        version: '1.0',
        exportTime: new Date().toISOString(),
        posts: Store.get('posts'),
        profile: Store.get('profile'),
        appearance: Store.get('appearance'),
        widgets: Store.get('widgets'),
        links: Store.get('links')
      };
    },

    importAll(data) {
      if (data.posts) Store.set('posts', data.posts, true);
      if (data.profile) Store.set('profile', data.profile, true);
      if (data.appearance) Store.set('appearance', data.appearance, true);
      if (data.widgets) Store.set('widgets', data.widgets, true);
      if (data.links) Store.set('links', data.links, true);
    },

    clearAll() {
      Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    }
  };

  // ==================== UI — 通用 UI 工具 ====================
  const UI = {
    toast(msg, type = '') {
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
    },

    /**
     * 自定义确认弹窗
     * @param {string} msg - 提示消息
     * @param {function} onOk - 确认回调
     */
    confirm(msg, onOk) {
      const overlay = document.getElementById('adminConfirmOverlay');
      const msgEl = document.getElementById('adminConfirmMsg');
      const cancelBtn = document.getElementById('adminConfirmCancel');
      const okBtn = document.getElementById('adminConfirmOk');

      if (!overlay || !msgEl || !cancelBtn || !okBtn) {
        // 降级到原生 confirm
        if (confirm(msg) && onOk) onOk();
        return;
      }

      msgEl.textContent = msg;
      overlay.classList.add('active');

      const cleanup = () => {
        overlay.classList.remove('active');
        cancelBtn.removeEventListener('click', onCancel);
        okBtn.removeEventListener('click', onOkHandler);
      };

      const onCancel = () => {
        cleanup();
      };

      const onOkHandler = () => {
        cleanup();
        if (onOk) onOk();
      };

      cancelBtn.addEventListener('click', onCancel);
      okBtn.addEventListener('click', onOkHandler);

      // 点击遮罩取消
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) onCancel();
      }, { once: true });

      setTimeout(() => okBtn.focus(), 50);
    },

    /**
     * 应用外观设置到页面
     */
    applyAppearance(a) {
      if (!a) a = Store.get('appearance');

      document.documentElement.setAttribute('data-theme', a.theme);
      if (typeof CURRENT_THEME !== 'undefined') {
        CURRENT_THEME = a.theme;
        localStorage.setItem('theme', a.theme);
      }

      document.documentElement.style.setProperty('--pink', a.accentColor);
      const hex = a.accentColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--pink-rgb', `${r}, ${g}, ${b}`);

      document.body.style.fontSize = a.fontSize + 'px';
      document.documentElement.style.setProperty('--radius', a.radius + 'px');
      document.documentElement.style.setProperty('--radius-sm', (a.radius - 4) + 'px');

      const container = document.getElementById('sakura-container');
      if (container) {
        container.style.display = a.sakuraEnabled ? 'block' : 'none';
      }
      if (a.sakuraEnabled && typeof createSakura === 'function') {
        createSakura(a.sakuraCount);
      }
    }
  };

  // ==================== Editor — 文章编辑器 ====================
  const Editor = {
    currentPost: null,
    _dirty: false,

    _markDirty() { this._dirty = true; },

    checkUnsaved() {
      if (!this._dirty) return true;
      return confirm('你有未保存的修改，确定离开吗？');
    },

    reset() {
      this.currentPost = null;
      this._dirty = false;

      const titleEl = document.getElementById('postTitle');
      if (titleEl) titleEl.value = '';

      const categoryEl = document.getElementById('postCategory');
      if (categoryEl) categoryEl.value = '';

      const tagsEl = document.getElementById('postTags');
      if (tagsEl) tagsEl.value = '';

      const excerptEl = document.getElementById('postExcerpt');
      if (excerptEl) excerptEl.value = '';

      const contentEl = document.getElementById('postContent');
      if (contentEl) contentEl.value = '';

      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = '';

      this._updatePreview();
    },

    loadPost(postId) {
      const posts = Store.posts.list();
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      this.currentPost = post;
      this._dirty = false;

      document.getElementById('postTitle').value = post.title || '';
      document.getElementById('postCategory').value = post.category || '';
      document.getElementById('postTags').value = (post.tags || []).join(', ');
      document.getElementById('postExcerpt').value = post.excerpt || '';
      document.getElementById('postContent').value = post.content || '';

      this._updatePreview();

      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = `编辑中：${post.title}`;
    },

    save(status) {
      const titleEl = document.getElementById('postTitle');
      const title = titleEl.value.trim();
      if (!title) {
        UI.toast('请输入标题', 'error');
        return;
      }

      const contentEl = document.getElementById('postContent');
      const content = contentEl.value;
      if (!content.trim()) {
        UI.toast('请输入正文内容', 'error');
        return;
      }

      const tags = document.getElementById('postTags').value
        .split(',').map(t => t.trim()).filter(Boolean);

      const post = {
        id: this.currentPost ? this.currentPost.id : null,
        title,
        category: document.getElementById('postCategory').value.trim() || '未分类',
        tags,
        excerpt: document.getElementById('postExcerpt').value.trim() || content.slice(0, 80),
        content,
        status,
        pinned: this.currentPost ? this.currentPost.pinned : false,
        date: this.currentPost ? this.currentPost.date : new Date().toISOString().slice(0, 10),
        file: this.currentPost ? this.currentPost.file : ('custom_' + Date.now() + '.md'),
        custom: true
      };

      const saved = Store.posts.save(post);
      this.currentPost = saved;
      this._dirty = false;

      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = `已保存：${saved.title}（${status === 'draft' ? '草稿' : '已发布'}）`;

      UI.toast(status === 'draft' ? '草稿已保存' : '文章已发布', 'success');
      window.dispatchEvent(new Event('blog:refresh'));
    },

    insert(before, after, placeholder) {
      const ta = document.getElementById('postContent');
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = ta.value.substring(start, end) || placeholder;
      ta.value = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;

      this._markDirty();
      this._updatePreview();
    },

    _updatePreview() {
      const content = document.getElementById('postContent');
      const preview = document.getElementById('postPreview');
      if (!content || !preview) return;

      const text = content.value;
      if (!text.trim()) {
        preview.innerHTML = '<div class="preview-empty">预览区（输入内容后实时显示）</div>';
        return;
      }
      try {
        preview.innerHTML = marked.parse(text);
        preview.querySelectorAll('pre code').forEach(b => {
          try { hljs.highlightElement(b); } catch (e) {}
        });
      } catch (e) {
        preview.innerHTML = '<p style="color:red;">预览渲染失败</p>';
      }
    },

    render(container) {
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
            <button data-action="insert" data-before="**" data-after="**" data-placeholder="粗体" title="粗体">B</button>
            <button data-action="insert" data-before="*" data-after="*" data-placeholder="斜体" title="斜体">I</button>
            <button data-action="insert" data-before="## " data-after="" data-placeholder="标题" title="标题">H</button>
            <button data-action="insert" data-before="- " data-after="" data-placeholder="列表项" title="列表">•</button>
            <button data-action="insert" data-before="1. " data-after="" data-placeholder="有序列表" title="有序列表">1.</button>
            <button data-action="insert" data-before="\`" data-after="\`" data-placeholder="代码" title="行内代码">&lt;/&gt;</button>
            <button data-action="insert" data-before="\n\`\`\`\n" data-after="\n\`\`\`\n" data-placeholder="代码块" title="代码块">{ }</button>
            <button data-action="insert" data-before="[" data-after="](url)" data-placeholder="链接" title="链接">🔗</button>
            <button data-action="insert" data-before="\n![alt](" data-after="url)" data-placeholder="图片" title="图片">🖼</button>
            <button data-action="insert" data-before="\n> " data-after="" data-placeholder="引用" title="引用">"</button>
            <button data-action="insert" data-before="\n---\n" data-after="" data-placeholder="分隔线" title="分隔线">—</button>
          </div>
          <div class="editor-container">
            <div class="editor-pane">
              <textarea id="postContent" placeholder="在这里输入 Markdown 内容..."></textarea>
            </div>
            <div class="editor-pane preview" id="postPreview">
              <div class="preview-empty">预览区（输入内容后实时显示）</div>
            </div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" data-action="save" data-status="published">📤 发布</button>
          <button class="btn btn-secondary" data-action="save" data-status="draft">💾 存草稿</button>
          <button class="btn btn-secondary" data-action="reset">🔄 清空</button>
          <span style="margin-left:auto;font-size:12px;color:var(--muted);align-self:center;" id="editorStatus"></span>
        </div>
      `;

      this.currentPost = null;
      this._dirty = false;

      this._bindEditorEvents(container);
    },

    _bindEditorEvents(container) {
      container.querySelector('.editor-toolbar').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="insert"]');
        if (!btn) return;
        Editor.insert(btn.dataset.before, btn.dataset.after, btn.dataset.placeholder);
      });

      container.querySelector('.btn-row').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'save') {
          Editor.save(btn.dataset.status);
        } else if (btn.dataset.action === 'reset') {
          Editor.reset();
        }
      });

      const contentEl = container.querySelector('#postContent');
      if (contentEl) {
        contentEl.addEventListener('input', () => {
          Editor._markDirty();
          Editor._updatePreview();
        });
      }

      const titleEl = container.querySelector('#postTitle');
      if (titleEl) {
        titleEl.addEventListener('input', () => Editor._markDirty());
      }
    }
  };

  // ==================== Page — 页面路由（替代旧 Tabs） ====================
  const Page = {
    current: 'dashboard',

    menu: [
      { id: 'dashboard', icon: '📊', label: '仪表盘' },
      { id: 'posts',     icon: '📝', label: '文章管理' },
      { id: 'editor',    icon: '✏️', label: '写文章' },
      { id: 'profile',   icon: '👤', label: '个人资料' },
      { id: 'appearance',icon: '🎨', label: '外观设置' },
      { id: 'widgets',   icon: '🧩', label: '侧边栏' },
      { id: 'links',     icon: '🔗', label: '友情链接' },
      { id: 'data',      icon: '💾', label: '数据管理' }
    ],

    switchTo(id) {
      // 检查编辑器未保存
      if (this.current === 'editor' && id !== 'editor') {
        if (!Editor.checkUnsaved()) return;
      }

      this.current = id;
      sessionStorage.setItem('rainmeo_admin_tab', id);

      // 更新侧边栏 active
      document.querySelectorAll('.admin-menu-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === id);
      });

      // 更新顶栏标题
      const menuItem = this.menu.find(m => m.id === id);
      const titleEl = document.getElementById('adminPageTitle');
      if (titleEl && menuItem) {
        titleEl.textContent = menuItem.icon + ' ' + menuItem.label;
      }

      // 渲染内容
      const container = document.getElementById('adminContent');
      if (!container) return;

      const renderMap = {
        dashboard:  this.renderDashboard.bind(this),
        posts:      this.renderPosts.bind(this),
        editor:     this.renderEditor.bind(this),
        profile:    this.renderProfile.bind(this),
        appearance: this.renderAppearance.bind(this),
        widgets:    this.renderWidgets.bind(this),
        links:      this.renderLinks.bind(this),
        data:       this.renderData.bind(this)
      };

      if (renderMap[id]) {
        container.innerHTML = '';
        renderMap[id](container);
      }
    },

    renderSidebar() {
      const nav = document.getElementById('adminMenu');
      if (!nav) return;

      nav.innerHTML = this.menu.map(item => `
        <button class="admin-menu-item" data-page="${item.id}">
          <span class="admin-menu-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('');

      // 绑定点击事件
      nav.addEventListener('click', (e) => {
        const item = e.target.closest('.admin-menu-item');
        if (!item) return;
        this.switchTo(item.dataset.page);
      });
    },

    // ===== 仪表盘 =====
    async renderDashboard(container) {
      const posts = Store.posts.list();
      const customCount = posts.length;
      const publishedCount = posts.filter(p => p.status !== 'draft').length;
      const draftCount = posts.filter(p => p.status === 'draft').length;

      // 获取内置文章数据
      let builtinCount = 0;
      let builtinPosts = [];
      try {
        const res = await fetch('posts/posts.json');
        builtinPosts = await res.json();
        builtinCount = builtinPosts.length;
      } catch(e) {}

      // 合并内置文章标签统计
      const tagSet = new Set();
      posts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
      builtinPosts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));

      const totalPosts = customCount + builtinCount;

      // 数据大小
      const totalSize = JSON.stringify(Store.exportAll()).length;

      container.innerHTML = `
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <div class="dash-stat-icon">📝</div>
            <div class="dash-stat-value">${totalPosts}</div>
            <div class="dash-stat-label">总文章数</div>
          </div>
          <div class="dashboard-card">
            <div class="dash-stat-icon">📤</div>
            <div class="dash-stat-value">${publishedCount}</div>
            <div class="dash-stat-label">自定义已发布</div>
          </div>
          <div class="dashboard-card">
            <div class="dash-stat-icon">🏷</div>
            <div class="dash-stat-value">${tagSet.size}</div>
            <div class="dash-stat-label">标签数（含内置）</div>
          </div>
          <div class="dashboard-card">
            <div class="dash-stat-icon">💾</div>
            <div class="dash-stat-value">${(totalSize / 1024).toFixed(1)} KB</div>
            <div class="dash-stat-label">自定义数据大小</div>
          </div>
        </div>

        <div class="dashboard-section">
          <h3 class="section-header">📋 最近文章（自定义）</h3>
          ${customCount === 0 ? `
            <div class="admin-empty">
              <div class="empty-icon">📝</div>
              <div>还没有自定义文章</div>
              <div style="margin-top:8px;">
                <button class="btn btn-primary" data-action="goto-editor">✏️ 写第一篇文章</button>
              </div>
            </div>
          ` : `
            <div class="dashboard-post-list">
              ${posts.slice(0, 5).map(p => `
                <div class="dashboard-post-item">
                  <div class="dash-post-title">${escapeHtml(p.title)}</div>
                  <div class="dash-post-meta">
                    <span>${p.date}</span>
                    <span class="badge ${p.status === 'draft' ? 'badge-draft' : 'badge-published'}">${p.status === 'draft' ? '草稿' : '已发布'}</span>
                    ${p.pinned ? '<span class="badge badge-pinned">置顶</span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="dashboard-section">
          <h3 class="section-header">⚡ 快捷操作</h3>
          <div class="dashboard-actions">
            <button class="btn btn-primary" data-action="goto-editor">✏️ 写文章</button>
            <button class="btn btn-secondary" data-action="goto-data-export">📥 导出数据</button>
            <button class="btn btn-secondary" data-action="goto-appearance">🎨 外观设置</button>
            <button class="btn btn-secondary" data-action="goto-profile">👤 编辑资料</button>
          </div>
        </div>
      `;

      // 快捷操作按钮事件
      container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          switch (btn.dataset.action) {
            case 'goto-editor':
              Page.switchTo('editor');
              break;
            case 'goto-data-export':
              Page.switchTo('data');
              break;
            case 'goto-appearance':
              Page.switchTo('appearance');
              break;
            case 'goto-profile':
              Page.switchTo('profile');
              break;
          }
        });
      });
    },

    // ===== 文章管理 =====
    renderPosts(container) {
      const posts = Store.posts.list();
      const searchId = 'adminPostSearch_' + Date.now();

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
          <h3 class="section-header">📝 文章管理（${posts.length} 篇）</h3>
          <button class="btn btn-primary" data-action="new-post">+ 写新文章</button>
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <input type="text" class="form-control" id="${searchId}" placeholder="🔍 搜索文章标题..." style="max-width:400px;">
        </div>
        <div class="admin-post-list" id="adminPostList"></div>
      `;

      container.querySelector('[data-action="new-post"]').addEventListener('click', () => {
        Page.switchTo('editor');
      });

      const searchInput = container.querySelector('#' + searchId);
      const listEl = container.querySelector('#adminPostList');

      const renderList = (filtered) => {
        if (filtered.length === 0) {
          listEl.innerHTML = `
            <div class="admin-empty">
              <div class="empty-icon">📝</div>
              <div>${posts.length === 0 ? '还没有自定义文章' : '没有匹配的文章'}</div>
              <div style="margin-top:8px;font-size:12px;">${posts.length === 0 ? '点击"写新文章"开始创作' : ''}</div>
            </div>
          `;
          return;
        }
        listEl.innerHTML = filtered.map(p => `
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
              <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${p.id}" title="编辑">✏️</button>
              <button class="btn btn-secondary btn-sm" data-action="pin" data-id="${p.id}" title="置顶">📌</button>
              <button class="btn btn-secondary btn-sm" data-action="status" data-id="${p.id}" title="切换状态">${p.status === 'draft' ? '📤' : '📥'}</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-id="${p.id}" title="删除">🗑</button>
            </div>
          </div>
        `).join('');

        listEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const id = btn.dataset.id;
          switch (btn.dataset.action) {
            case 'edit':
              Page.switchTo('editor');
              setTimeout(() => Editor.loadPost(id), 50);
              break;
            case 'pin':
              Store.posts.togglePin(id);
              Page.switchTo('posts');
              break;
            case 'status':
              Store.posts.toggleStatus(id);
              Page.switchTo('posts');
              break;
            case 'delete':
              UI.confirm('确定删除这篇文章吗？此操作不可恢复。', () => {
                Store.posts.delete(id);
                Page.switchTo('posts');
              });
              break;
          }
        });
      };

      renderList(posts);

      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        if (!q) {
          renderList(posts);
          return;
        }
        const filtered = posts.filter(p => p.title.toLowerCase().includes(q));
        renderList(filtered);
      });
    },

    // ===== 编辑器 =====
    renderEditor(container) {
      Editor.render(container);
    },

    // ===== 个人资料 =====
    renderProfile(container) {
      const p = Store.get('profile');
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
          <button class="btn btn-primary" data-action="save-profile">💾 保存</button>
          <button class="btn btn-secondary" data-action="reset-profile">🔄 恢复默认</button>
        </div>
      `;

      container.querySelector('[data-action="save-profile"]').addEventListener('click', () => {
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
        Store.set('profile', profile);
        if (typeof window.onProfileChange === 'function') window.onProfileChange();
      });

      container.querySelector('[data-action="reset-profile"]').addEventListener('click', () => {
        UI.confirm('确定恢复默认个人资料吗？', () => {
          Store.reset('profile');
          Page.switchTo('profile');
          UI.toast('已恢复默认', 'success');
          if (typeof window.onProfileChange === 'function') window.onProfileChange();
          window.dispatchEvent(new Event('blog:refresh'));
        });
      });
    },

    // ===== 外观设置 =====
    renderAppearance(container) {
      const a = Store.get('appearance');
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
            ${colors.map(c => `<div class="color-swatch ${c === a.accentColor ? 'selected' : ''}" style="background:${c};" data-color="${c}"></div>`).join('')}
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
          <input type="range" id="apSakuraCount" min="5" max="50" value="${a.sakuraCount}" style="width:150px;">
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">正文字号 <span class="hint" id="fontSizeVal">${a.fontSize}px</span></div>
            <div class="setting-desc">全局正文字体大小（12-18px）</div>
          </div>
          <input type="range" id="apFontSize" min="12" max="18" value="${a.fontSize}" style="width:150px;">
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">圆角大小 <span class="hint" id="radiusVal">${a.radius}px</span></div>
            <div class="setting-desc">卡片、按钮的圆角半径（0-20px）</div>
          </div>
          <input type="range" id="apRadius" min="0" max="20" value="${a.radius}" style="width:150px;">
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" data-action="save-appearance">💾 保存并应用</button>
          <button class="btn btn-secondary" data-action="reset-appearance">🔄 恢复默认</button>
        </div>
      `;

      const sakuraCountInput = container.querySelector('#apSakuraCount');
      const fontSizeInput = container.querySelector('#apFontSize');
      const radiusInput = container.querySelector('#apRadius');

      sakuraCountInput.addEventListener('input', () => {
        container.querySelector('#sakuraCountVal').textContent = sakuraCountInput.value;
      });
      fontSizeInput.addEventListener('input', () => {
        container.querySelector('#fontSizeVal').textContent = fontSizeInput.value + 'px';
      });
      radiusInput.addEventListener('input', () => {
        container.querySelector('#radiusVal').textContent = radiusInput.value + 'px';
      });

      container.querySelector('#apColors').addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch) return;
        container.querySelectorAll('#apColors .color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });

      container.querySelector('[data-action="save-appearance"]').addEventListener('click', () => {
        const appearance = {
          theme: container.querySelector('#apTheme').value,
          accentColor: container.querySelector('#apColors .color-swatch.selected')?.dataset.color || '#ff6b9d',
          sakuraEnabled: container.querySelector('#apSakura').checked,
          sakuraCount: parseInt(container.querySelector('#apSakuraCount').value),
          fontSize: parseInt(container.querySelector('#apFontSize').value),
          radius: parseInt(container.querySelector('#apRadius').value),
          layout: 'sidebar-right'
        };
        Store.set('appearance', appearance);
        UI.applyAppearance(appearance);
        UI.toast('外观已更新', 'success');
      });

      container.querySelector('[data-action="reset-appearance"]').addEventListener('click', () => {
        UI.confirm('确定恢复默认外观吗？', () => {
          Store.reset('appearance');
          Page.switchTo('appearance');
          UI.applyAppearance(Store.DEFAULTS.appearance);
          UI.toast('已恢复默认', 'success');
          window.dispatchEvent(new Event('blog:refresh'));
        });
      });
    },

    // ===== 侧边栏模块 =====
    renderWidgets(container) {
      const w = Store.get('widgets');
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
          <button class="btn btn-primary" data-action="save-widgets">💾 保存</button>
        </div>
      `;

      container.querySelector('[data-action="save-widgets"]').addEventListener('click', () => {
        const widgetsObj = {};
        ['profile', 'stats', 'tags', 'recent', 'links'].forEach(k => {
          widgetsObj[k] = document.getElementById('widget_' + k).checked;
        });
        Store.set('widgets', widgetsObj);
        if (typeof window.onWidgetsChange === 'function') window.onWidgetsChange();
      });
    },

    // ===== 友情链接 =====
    renderLinks(container) {
      const links = Store.get('links');
      container.innerHTML = `
        <h3 class="section-header">🔗 友情链接</h3>
        <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">侧边栏"链接"模块显示的内容</p>
        <div id="linksList">
          ${links.map((l, i) => `
            <div class="link-edit-row" data-idx="${i}">
              <input type="text" class="form-control link-name" value="${escapeAttr(l.name)}" placeholder="名称">
              <input type="text" class="form-control link-url" value="${escapeAttr(l.url)}" placeholder="URL">
              <button class="btn btn-danger btn-sm" data-action="remove-link">🗑</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary" data-action="add-link" style="margin:12px 0;">+ 添加链接</button>
        <div class="btn-row">
          <button class="btn btn-primary" data-action="save-links">💾 保存</button>
        </div>
      `;

      container.querySelector('[data-action="add-link"]').addEventListener('click', () => {
        const list = container.querySelector('#linksList');
        const div = document.createElement('div');
        div.className = 'link-edit-row';
        div.innerHTML = `
          <input type="text" class="form-control link-name" placeholder="名称">
          <input type="text" class="form-control link-url" placeholder="URL">
          <button class="btn btn-danger btn-sm" data-action="remove-link">🗑</button>
        `;
        list.appendChild(div);
      });

      container.querySelector('#linksList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-link"]');
        if (!btn) return;
        btn.closest('.link-edit-row').remove();
      });

      container.querySelector('[data-action="save-links"]').addEventListener('click', () => {
        const rows = container.querySelectorAll('#linksList .link-edit-row');
        const linksArr = [];
        rows.forEach(row => {
          const name = row.querySelector('.link-name').value.trim();
          const url = row.querySelector('.link-url').value.trim();
          if (name && url) linksArr.push({ name, url });
        });
        Store.set('links', linksArr);
        if (typeof window.onLinksChange === 'function') window.onLinksChange();
      });
    },

    // ===== 数据管理 =====
    renderData(container) {
      const posts = Store.posts.list();
      const links = Store.get('links');
      const totalSize = JSON.stringify({
        posts, profile: Store.get('profile'), links,
        appearance: Store.get('appearance'), widgets: Store.get('widgets')
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
          <button class="btn btn-primary" data-action="export-data">📥 导出 JSON</button>
        </div>
        <div class="data-card">
          <div class="data-title">📥 导入数据</div>
          <div class="data-desc">从 JSON 文件恢复配置（会覆盖现有数据）</div>
          <input type="file" id="importFile" accept=".json" style="display:none;">
          <button class="btn btn-secondary" data-action="import-data">📤 选择文件</button>
        </div>
        <div class="data-card">
          <div class="data-title">🗑 清空数据</div>
          <div class="data-desc">删除所有自定义配置和文章（不可恢复）</div>
          <button class="btn btn-danger" data-action="clear-data">⚠️ 清空所有</button>
        </div>
      `;

      container.querySelector('[data-action="export-data"]').addEventListener('click', () => {
        const data = Store.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rainmeo-blog-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('数据已导出', 'success');
      });

      const fileInput = container.querySelector('#importFile');
      container.querySelector('[data-action="import-data"]').addEventListener('click', () => {
        fileInput.click();
      });
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            UI.confirm('确定导入吗？这将覆盖现有数据。', () => {
              Store.importAll(data);
              UI.toast('导入成功，即将刷新', 'success');
              setTimeout(() => location.reload(), 1500);
            });
          } catch (err) {
            UI.toast('文件格式错误', 'error');
          }
        };
        reader.readAsText(file);
      });

      container.querySelector('[data-action="clear-data"]').addEventListener('click', () => {
        UI.confirm('⚠️ 确定清空所有自定义数据吗？\n\n这包括：所有自定义文章、个人资料修改、外观设置、侧边栏配置、友情链接\n\n此操作不可恢复！', () => {
          UI.confirm('再次确认：真的要清空所有数据吗？', () => {
            Store.clearAll();
            UI.toast('已清空，即将刷新', 'success');
            setTimeout(() => location.reload(), 1500);
          });
        });
      });
    }
  };

  // ==================== 初始化 ====================
  function init() {
    // 1. 应用外观设置
    UI.applyAppearance(Store.get('appearance'));

    // 2. 检查登录状态
    if (Auth.check()) {
      document.getElementById('loginOverlay').classList.remove('active');
      document.getElementById('adminLayout').style.display = 'flex';
      Page.renderSidebar();
      // 恢复上次页面或默认仪表盘
      const lastPage = sessionStorage.getItem('rainmeo_admin_tab') || 'dashboard';
      Page.switchTo(lastPage);
    } else {
      // 显示登录弹窗，预填用户名
      const remembered = localStorage.getItem('rainmeo_admin_remember_user') || '';
      document.getElementById('loginUsername').value = remembered;
      document.getElementById('loginPassword').value = '';
      if (remembered) {
        setTimeout(() => document.getElementById('loginPassword').focus(), 100);
      } else {
        setTimeout(() => document.getElementById('loginUsername').focus(), 100);
      }
    }

    // 3. 登录表单事件
    document.getElementById('loginSubmit').addEventListener('click', () => Auth.login());
    document.getElementById('loginPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Auth.login();
    });
    document.getElementById('loginUsername').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Auth.login();
    });

    // 4. 退出按钮
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
      UI.confirm('确定退出登录吗？', () => Auth.logout());
    });

    // 5. 确认弹窗事件（使用页面内已有的 #adminConfirmOverlay）
    const confirmOverlay = document.getElementById('adminConfirmOverlay');
    if (confirmOverlay) {
      // 点击遮罩取消
      confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) {
          confirmOverlay.classList.remove('active');
        }
      });
    }

    // 6. ESC 关闭登录弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay && loginOverlay.classList.contains('active')) {
          loginOverlay.classList.remove('active');
        }
      }
    });

    // 7. window 兼容层（暴露函数供 HTML onclick 调用）
    window.editPost = (id) => { Editor.loadPost(id); Page.switchTo('editor'); };
    window.togglePin = (id) => { Store.posts.togglePin(id); Page.switchTo('posts'); };
    window.toggleStatus = (id) => { Store.posts.toggleStatus(id); Page.switchTo('posts'); };
    window.removePost = (id) => {
      UI.confirm('确定删除这篇文章吗？此操作不可恢复。', () => {
        Store.posts.delete(id);
        Page.switchTo('posts');
      });
    };
    window.editorInsert = Editor.insert.bind(Editor);
    window.updatePreview = () => Editor._updatePreview();
    window.savePost = (status) => Editor.save(status);
    window.resetEditor = () => Editor.reset();
    window.selectColor = (color) => {
      document.querySelectorAll('#apColors .color-swatch').forEach(s => s.classList.remove('selected'));
      const swatch = document.querySelector(`#apColors .color-swatch[data-color="${color}"]`);
      if (swatch) swatch.classList.add('selected');
    };
    window.saveAppearance = () => {
      const themeEl = document.getElementById('apTheme');
      const colorEl = document.querySelector('#apColors .color-swatch.selected');
      const appearance = {
        theme: themeEl ? themeEl.value : 'light',
        accentColor: colorEl ? colorEl.dataset.color : '#ff6b9d',
        sakuraEnabled: document.getElementById('apSakura')?.checked ?? true,
        sakuraCount: parseInt(document.getElementById('apSakuraCount')?.value || '15'),
        fontSize: parseInt(document.getElementById('apFontSize')?.value || '14'),
        radius: parseInt(document.getElementById('apRadius')?.value || '12'),
        layout: 'sidebar-right'
      };
      Store.set('appearance', appearance);
      UI.applyAppearance(appearance);
      UI.toast('外观已更新', 'success');
    };
    window.resetAppearance = () => {
      UI.confirm('确定恢复默认外观吗？', () => {
        Store.reset('appearance');
        Page.switchTo('appearance');
        UI.applyAppearance(Store.DEFAULTS.appearance);
        UI.toast('已恢复默认', 'success');
        window.dispatchEvent(new Event('blog:refresh'));
      });
    };
    window.saveProfileSettings = () => {
      const profile = {
        name: document.getElementById('pfName')?.value.trim() || 'RainmeoX',
        bio: document.getElementById('pfBio')?.value.trim() || '',
        avatar: document.getElementById('pfAvatar')?.value.trim() || '',
        location: document.getElementById('pfLocation')?.value.trim() || '',
        github: document.getElementById('pfGithub')?.value.trim() || '',
        csdn: document.getElementById('pfCsdn')?.value.trim() || '',
        blog: document.getElementById('pfBlog')?.value.trim() || '',
        elecfans: document.getElementById('pfElecfans')?.value.trim() || '',
        skills: (document.getElementById('pfSkills')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
        interests: (document.getElementById('pfInterests')?.value || '').split(',').map(s => s.trim()).filter(Boolean)
      };
      Store.set('profile', profile);
      if (typeof window.onProfileChange === 'function') window.onProfileChange();
    };
    window.resetProfileSettings = () => {
      UI.confirm('确定恢复默认个人资料吗？', () => {
        Store.reset('profile');
        Page.switchTo('profile');
        UI.toast('已恢复默认', 'success');
        if (typeof window.onProfileChange === 'function') window.onProfileChange();
        window.dispatchEvent(new Event('blog:refresh'));
      });
    };
    window.saveWidgets = () => {
      const widgets = {};
      ['profile', 'stats', 'tags', 'recent', 'links'].forEach(k => {
        const el = document.getElementById('widget_' + k);
        widgets[k] = el ? el.checked : true;
      });
      Store.set('widgets', widgets);
      if (typeof window.onWidgetsChange === 'function') window.onWidgetsChange();
    };
    window.addLink = () => {
      const list = document.getElementById('linksList');
      if (!list) return;
      const div = document.createElement('div');
      div.className = 'link-edit-row';
      div.innerHTML = `
        <input type="text" class="form-control link-name" placeholder="名称">
        <input type="text" class="form-control link-url" placeholder="URL">
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">🗑</button>
      `;
      list.appendChild(div);
    };
    window.removeLink = (idx) => {
      const list = document.getElementById('linksList');
      if (list && list.children[idx]) list.children[idx].remove();
    };
    window.saveLinks = () => {
      const rows = document.querySelectorAll('#linksList .link-edit-row');
      const linksArr = [];
      rows.forEach(row => {
        const name = row.querySelector('.link-name')?.value.trim();
        const url = row.querySelector('.link-url')?.value.trim();
        if (name && url) linksArr.push({ name, url });
      });
      Store.set('links', linksArr);
      if (typeof window.onLinksChange === 'function') window.onLinksChange();
    };
    window.exportData = () => {
      const data = Store.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rainmeo-blog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('数据已导出', 'success');
    };
    window.importData = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          UI.confirm('确定导入吗？这将覆盖现有数据。', () => {
            Store.importAll(data);
            UI.toast('导入成功，即将刷新', 'success');
            setTimeout(() => location.reload(), 1500);
          });
        } catch (err) {
          UI.toast('文件格式错误', 'error');
        }
      };
      reader.readAsText(file);
    };
    window.clearAllData = () => {
      UI.confirm('⚠️ 确定清空所有自定义数据吗？\n\n这包括：所有自定义文章、个人资料修改、外观设置、侧边栏配置、友情链接\n\n此操作不可恢复！', () => {
        UI.confirm('再次确认：真的要清空所有数据吗？', () => {
          Store.clearAll();
          UI.toast('已清空，即将刷新', 'success');
          setTimeout(() => location.reload(), 1500);
        });
      });
    };

    // 8. 暴露 Admin 工具给全局
    window.AdminAuthCheck = Auth.check.bind(Auth);
  }

  // ==================== 启动 ====================
  document.addEventListener('DOMContentLoaded', () => init());

  // ==================== 公开 API ====================
  return { Auth, Store, UI, Editor, Page, init };
})();
