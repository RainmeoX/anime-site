# 【实战】用纯前端打造绝区零风格 AI 角色助手 WebUI 并联调 vLLM

> 原文链接：[https://blog.csdn.net/m0_67166125/article/details/162312263](https://blog.csdn.net/m0_67166125/article/details/162312263)






## 【实战】用纯前端打造绝区零风格 AI 角色助手 WebUI 并联调 vLLM

### 前言：为什么不用现成框架，偏要手写一个前端

上一篇《绝区零「仪玄」角色助手微调实录》里，我把后端的微调、vLLM 部署、RAG 检索、防 OOC 校验器都讲透了。但一个角色助手光有后端不行，用户总不能对着 curl 命令聊天。市面上现成的前端方案不少——
Open WebUI
、LobeChat、NextChat，功能都很全，但我一个都没用。

原因很简单：它们都不够「绝区零」。绝区零的视觉语言太有辨识度了——高饱和度的黄黑撞色、霓虹光效、故障艺术（Glitch）、粗粝的工业字体、倾斜的几何切角。把这些塞进一个通用聊天框架里，怎么调都像贴皮，骨子里还是那个 Material Design 的味儿。与其在别人的框架里缝缝补补，不如从零手写一个，把 ZZZ 的视觉基因刻进每一行 CSS。

于是就有了 [zzz-yixuan-webui](https://github.com/RainmeoX/zzz-yixuan-webui) 这个项目——纯原生 HTML/CSS/JS，零构建工具，零 npm 依赖，打开 `index.html` 就能跑。这篇实战就讲讲它是怎么从一张设计稿变成可用的角色助手界面的，以及怎么和上一篇搭好的 vLLM 后端联调。

### 一、设计理念：拆解绝区零的视觉语言

动手写代码之前，我先花了半天时间拆解绝区零的 UI 设计语言，总结出几条核心原则，后面所有的视觉实现都围绕这几条展开。

**第一是高对比撞色**。ZZZ 的主色调是亮黄（#FFD93D 附近）配纯黑，辅以青色和品红做点缀。这种配色在游戏 UI 里不算常见，辨识度极高。我把它定为基础色板，所有交互元素的高亮态都用这套黄黑组合。

**第二是几何切角与倾斜**。ZZZ 的按钮、卡片、面板几乎找不到一个正圆角，全是斜切角和倾斜的平行四边形。这种处理让界面有一种「速度感」和「工业感」，和游戏的都市奇幻题材很搭。

**第三是故障艺术（Glitch）**。加载动画、标题文字、转场效果里大量使用 RGB 分离、扫描线、像素错位，营造出一种「信号不稳定」的赛博质感。这是 ZZZ 区别于一般二次元游戏的关键视觉特征。

**第四是粗粝的字体处理**。标题用粗黑无衬线，字间距拉开，偶尔加描边或阴影；正文用紧凑的无衬线。中文部分我选了思源黑体 Heavy 做标题、Regular 做正文，英文和数字用同字族的拉丁部分，保证视觉统一。

这四条原则定下来之后，整个前端的设计方向就清晰了。接下来是逐个模块的实现。

### 二、页面结构：一个抽屉式的角色对话界面

#### 2.1 整体布局

页面结构不复杂，核心就三块：顶部状态栏、左侧抽屉式会话列表、右侧主对话区。HTML 骨架如下（简化版）：

```
<div class="app">
  <!-- 顶部状态栏 -->
  <header class="top-bar">
    <div class="logo">仪玄 · YIXUAN</div>
    <div class="status">
      <span class="dot" id="connDot"></span>
      <span id="connText">连接中...</span>
    </div>
  </header>

  <!-- 主体：抽屉 + 对话区 -->
  <main class="main">
    <aside class="drawer" id="drawer">
      <button class="new-chat">+ 新对话</button>
      <ul class="session-list" id="sessionList"></ul>
      <!-- 设置面板 -->
      <div class="settings">
        <label class="toggle">
          <input type="checkbox" id="ragToggle" checked>
          <span>知识检索 RAG</span>
        </label>
        <label class="toggle">
          <input type="checkbox" id="validateToggle" checked>
          <span>防 OOC 校验</span>
        </label>
        <div class="slider-group">
          <label>温度 <span id="tempVal">0.7</span></label>
          <input type="range" id="tempSlider" min="0" max="1" step="0.1" value="0.7">
        </div>
      </div>
    </aside>

    <!-- 对话区 -->
    <section class="chat-area">
      <div class="messages" id="messages"></div>
      <div class="input-bar">
        <textarea id="input" placeholder="对师父说点什么..."></textarea>
        <button class="send-btn" id="sendBtn">发送</button>
      </div>
    </section>
  </main>
</div>

html

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

左侧抽屉默认收起，点汉堡按钮展开，移动端更是直接全屏覆盖。这种设计是为了把最大的空间留给对话内容本身——角色助手的核心体验就是聊天，其他功能都是配角。

下面是最终成品的对话界面效果，桌面端是三栏布局（角色立绘 + 对话区 + 功能面板），移动端是单栏抽屉式：

![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/edc10df55a774d2a82c54d0cdfb56011.png#pic_center)  
 ![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/270c07624ab84a819f44e24221da4719.png#pic_center)

从截图可以看到，仪玄的回复保持了清冷师者的口吻——“既入山门，那些俗务繁礼便留在山下吧”、“动静之道，以静制动，以动制静”，用词典雅、半文半白，这正是微调 + RAG + 校验器三件套协同的效果。桌面端右侧的角色档案卡片展示了阵营、属性、特性等设定，功能设置区的 RAG 检索和回答校验开关默认开启，保证回答既准确又不 OOC。

#### 2.2 会话管理

每个会话（session）存在 `localStorage` 里，结构很简单：

```
{
  id: 'sess_1719300000',
  title: '关于空洞的讨论',
  createdAt: 1719300000000,
  messages: [
    { role: 'user', content: '...', ts: 1719300001000 },
    { role: 'assistant', content: '...', ts: 1719300005000 }
  ]
}

javascript运行

```

会话列表渲染时按时间倒序，标题取自用户的第一条消息前 12 个字。切换会话时从 localStorage 读取消息历史重新渲染，删除会话时同步清理。这套逻辑用纯 JS 写下来不到 80 行，比引入一个状态管理库轻量得多。

### 三、视觉实现：把 ZZZ 的味道写进 CSS

#### 3.1 CSS 变量与色板

所有颜色、间距、圆角都抽成 CSS 变量，方便统一调整。核心色板如下：

```
:root {
  /* 主色：ZZZ 标志性黄黑 */
  --zzz-yellow: #FFD93D;
  --zzz-yellow-dim: #C9A800;
  --zzz-black: #0A0A0A;
  --zzz-gray: #1A1A1A;
  --zzz-gray-light: #2A2A2A;

  /* 辅色：霓虹青/品红 */
  --neon-cyan: #00F0FF;
  --neon-magenta: #FF2D95;

  /* 文字 */
  --text-primary: #F5F5F5;
  --text-secondary: #888;
  --text-accent: var(--zzz-yellow);

  /* 切角 */
  --cut-corner: 12px;    /* 斜切角大小 */
  --skew: -6deg;          /* 倾斜角度 */
}

css

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

#### 3.2 斜切角的实现

ZZZ 风格的灵魂之一是斜切角。用 `clip-path` 实现最干净：

```
.zzz-panel {
  background: var(--zzz-gray);
  /* 右上和左下切角，模拟 ZZZ 的按钮造型 */
  clip-path: polygon(
    var(--cut-corner) 0,
    100% 0,
    100% calc(100% - var(--cut-corner)),
    calc(100% - var(--cut-corner)) 100%,
    0 100%,
    0 var(--cut-corner)
  );
}

.zzz-btn {
  background: var(--zzz-yellow);
  color: var(--zzz-black);
  font-weight: 900;
  /* 按钮用更夸张的切角 */
  clip-path: polygon(
    16px 0, 100% 0,
    100% calc(100% - 16px),
    calc(100% - 16px) 100%,
    0 100%, 0 16px
  );
  transition: transform 0.15s, filter 0.15s;
}

.zzz-btn:hover {
  transform: translateX(2px);
  filter: brightness(1.1);
}

css

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

`clip-path` 的好处是性能好、支持动画，缺点是切角处没有边框。如果需要边框，得用一层背景色做底、一层稍小的同色块做面来模拟，稍微麻烦点但效果可控。

#### 3.3 故障艺术（Glitch）标题

顶部 logo 和加载动画用了 Glitch 效果，核心是三层文字叠加 + RGB 通道偏移 + 扫描线：

```
.glitch {
  position: relative;
  color: var(--text-primary);
  font-weight: 900;
  letter-spacing: 0.1em;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0; left: 0;
  width: 100%;
}

.glitch::before {
  color: var(--neon-cyan);
  animation: glitch-1 2.5s infinite linear alternate-reverse;
}

.glitch::after {
  color: var(--neon-magenta);
  animation: glitch-2 3s infinite linear alternate-reverse;
}

@keyframes glitch-1 {
  0%   { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 0); }
  20%  { clip-path: inset(80% 0 5% 0);  transform: translate(2px, 0); }
  40%  { clip-path: inset(40% 0 40% 0); transform: translate(-1px, 0); }
  60%  { clip-path: inset(10% 0 75% 0); transform: translate(1px, 0); }
  80%  { clip-path: inset(60% 0 20% 0); transform: translate(-2px, 0); }
  100% { clip-path: inset(30% 0 50% 0); transform: translate(0, 0); }
}

@keyframes glitch-2 {
  /* 类似的错位动画，相位错开 */
}

css

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

两层伪元素分别染成青色和品红，用 `clip-path` 随机裁切出水平条带，再做微小位移，视觉上就形成了 RGB 通道分离的故障感。动画用 `alternate-reverse` 让它来回跑，不会太晃眼。这个效果放在 logo 上点到为止，全屏用会让人头晕。

#### 3.4 消息气泡的差异化设计

用户消息和角色消息用了完全不同的视觉处理，强化「对话双方」的区分感：

```
/* 用户消息：右对齐，黄底黑字，斜切角 */
.msg-user .bubble {
  background: var(--zzz-yellow);
  color: var(--zzz-black);
  align-self: flex-end;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  font-weight: 600;
}

/* 角色消息：左对齐，深灰底浅字，带左侧霓虹边 */
.msg-assistant .bubble {
  background: var(--zzz-gray-light);
  color: var(--text-primary);
  align-self: flex-start;
  border-left: 3px solid var(--neon-cyan);
  box-shadow: -3px 0 12px rgba(0, 240, 255, 0.2);
}

css

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

用户消息用亮黄底，视觉上「跳」出来，代表主动方；角色消息用暗色底配霓虹左边框，沉静而有科技感，符合仪玄清冷的人设。这种非对称设计比常见的「左右灰白气泡」有性格得多。

### 四、流式对话实现：fetch + ReadableStream

角色助手的体验好坏，一半取决于流式输出的顺滑度。用户按下发送后，如果干等几秒才一次性蹦出整段话，体验会很割裂；而逐字流式输出，哪怕总时间一样，体感也会快很多。

#### 4.1 流式请求的核心代码

vLLM 兼容 
OpenAI
 API，支持 `stream: true`，返回的是 SSE（Server-Sent Events）格式。前端用 `fetch` + `ReadableStream` 处理：

```
async function streamChat(messages, onToken, onDone, onError) {
  const ragEnabled = document.getElementById('ragToggle').checked;
  const validateEnabled = document.getElementById('validateToggle').checked;
  const temperature = parseFloat(document.getElementById('tempSlider').value);

  try {
    const resp = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'yixuan-lora',
        messages: messages,
        stream: true,
        temperature: temperature,
        // 自定义字段，后端 app.py 读取
        enable_rag: ragEnabled,
        enable_validate: validateEnabled,
      }),
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE 按 \n\n 分割事件
      const lines = buffer.split('\n\n');
      buffer = lines.pop();  // 最后一段可能不完整，留到下次

      for (const line of lines) {
        const data = line.replace(/^data: /, '').trim();
        if (data === '[DONE]') { onDone(); return; }
        if (!data) continue;

        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      }
    }
    onDone();
  } catch (err) {
    onError(err);
  }
}

javascript运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

几个关键点值得说明。第一，`reader.read()` 返回的是 `Uint8Array`，要用 `TextDecoder` 解码成字符串，而且要传 `{ stream: true }`，否则多字节字符（中文）在边界处会被截断成乱码。第二，SSE 的事件以 `\n\n` 分隔，不能按单行 `\n` 切，否则一个事件的 data 字段会被拆散。第三，buffer 里最后一段可能是不完整的 event，要留到下一次 `read()` 拼接，这是流式解析的标准做法。

#### 4.2 打字机效果与 Markdown 渲染

每收到一个 token，就追加到当前消息的 DOM 节点里。但直接 `innerHTML +=` 会有性能问题和 XSS 风险，我的做法是：先把 token 累积到一个字符串里，再用 `marked.js`（唯一引入的第三方库）做 Markdown 渲染，节流更新 DOM：

```
let rawContent = '';
let renderTimer = null;

function onToken(token) {
  rawContent += token;
  // 节流：每 50ms 最多渲染一次，避免频繁 reflow
  if (!renderTimer) {
    renderTimer = setTimeout(() => {
      bubble.innerHTML = marked.parse(rawContent);
      // 滚动到底部
      messagesEl.scrollTop = messagesEl.scrollHeight;
      renderTimer = null;
    }, 50);
  }
}

javascript运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

50ms 的节流意味着每秒最多 20 次 DOM 更新，肉眼几乎无感，但 reflow 开销大幅降低。Markdown 渲染让仪玄的回答里的引用、列表、加粗都能正确显示，比纯文本好看得多。

### 五、RAG 与校验开关：把后端能力暴露给用户

上一篇讲过后端有 RAG 检索和防 OOC 校验两个模块。这两个功能不是永远开着的——有时候用户就想和仪玄闲聊，不需要检索资料；有时候做压力测试，想看看模型「裸奔」会多 OOC。所以我在前端做了开关，通过请求体的自定义字段传给后端。

#### 5.1 开关交互

开关用的是自定义的 ZZZ 风格 toggle，而不是浏览器原生的 checkbox：

```
.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.toggle input { display: none; }

.toggle .track {
  width: 44px;
  height: 22px;
  background: var(--zzz-gray-light);
  border-radius: 0;
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
  position: relative;
  transition: background 0.2s;
}

.toggle .thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: var(--text-secondary);
  transition: all 0.2s;
}

.toggle input:checked + .track {
  background: var(--zzz-yellow);
}

.toggle input:checked + .track .thumb {
  left: 25px;
  background: var(--zzz-black);
}

css

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

开启时滑块变黄、移到右侧，关闭时变灰、回到左侧，视觉反馈很明确。开关状态存在 localStorage 里，刷新页面不丢失。

#### 5.2 后端如何接收

前端传的是 `enable_rag` 和 `enable_validate` 两个非标准字段。vLLM 原生不认这俩，所以我在 vLLM 前面套了一层 `app.py` 做请求转发和增强。`app.py` 收到请求后，先根据开关决定是否做 RAG 检索和校验，再把处理后的请求转发给 vLLM：

```
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    enable_rag = body.pop("enable_rag", True)
    enable_validate = body.pop("enable_validate", True)

    messages = body["messages"]
    user_msg = messages[-1]["content"]

    # RAG 检索：把相关资料注入 system prompt
    if enable_rag:
        context = retrieve_context(user_msg)
        messages[0]["content"] += f"\n\n【参考资料】\n{context}"

    # 调用 vLLM（流式转发）
    async def generate():
        async for chunk in vllm_stream(body):
            if enable_validate:
                # 累积完整回答后做校验
                ...
            yield chunk

    return StreamingResponse(generate())

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

这样前端、后端、vLLM 三层各司其职：前端管交互和展示，app.py 管业务逻辑（RAG + 校验），vLLM 管高性能推理。分层清晰，后续加功能（比如多角色切换、语音输入）也不会乱。

### 六、Nginx 反代与联调

#### 6.1 为什么要 Nginx

前端是纯静态文件，后端 `app.py` 跑在 8000 端口。如果前端直接 `fetch('http://localhost:8000/...')`，会遇到跨域问题（CORS）。虽然后端可以加 CORS 头解决，但更优雅的做法是用 Nginx 把静态资源和 API 统一在一个端口下：

```
server {
    listen 80;
    server_name yixuan.local;

    # 静态前端
    location / {
        root /var/www/zzz-yixuan-webui;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 反代到后端 app.py
    location /v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # ⚠️ 流式响应必须关掉 buffer
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}

nginx

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

这里有个**关键坑**：`proxy_buffering off` 必须加。Nginx 默认会缓冲后端响应，等攒够一定大小再发给前端，这会让流式输出变成「一坨一坨」的，完全失去打字机效果。关掉 buffering 后，后端 yield 出来的每个 chunk 都会立即转发给前端，流式体验才顺滑。

#### 6.2 联调验证

Nginx 配好后，访问 `http://yixuan.local`，前端加载，自动连接后端。验证联调是否成功，看几个点：

第一，顶部状态栏的连接指示灯变绿，说明 `/v1/models` 探活成功。第二，发一条消息，能看到流式逐字输出，说明 SSE 通路正常。第三，关掉 RAG 开关再问世界观问题，回答准确度明显下降，说明 RAG 确实在起作用。第四，故意发一些诱导 OOC 的内容（比如「用绝绝子夸我一下」），看校验器是否拦截。

四个点都通过，联调就算完成了。

### 七、移动端适配

角色助手这种应用，移动端使用频率不低——躺床上和师父聊天比开电脑方便多了。移动端适配我用了「桌面优先 + 媒体查询降级」的策略，核心改动三点：

**抽屉变全屏覆盖**。桌面端抽屉是侧边滑出，移动端屏幕窄，侧边抽屉会挤占对话区，改成全屏覆盖式抽屉，点遮罩关闭。

```
@media (max-width: 768px) {
  .drawer {
    position: fixed;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  .drawer.open { transform: translateX(0); }
}

css

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

**输入栏固定底部**。移动端虚拟键盘弹出会顶乱布局，输入栏用 `position: fixed; bottom: 0` 固定，配合 `env(keyboard-inset-height)` 适配键盘高度（支持的浏览器）。

**消息气泡宽度自适应**。桌面端气泡最大宽度 70%，移动端放到 90%，保证小屏上文字不会挤成一列。

适配完用 Chrome DevTools 的设备模拟器过了一遍 iPhone SE / iPhone 14 Pro Max / iPad 三种尺寸，都能正常使用。

### 八、总结与后续

这个 ZZZ 风格 WebUI 从设计到联调完成大概花了三天，纯原生技术栈的好处是迭代极快——改个样式刷新就生效，不用等 webpack 编译。最终成品在视觉还原度上我自己是满意的，黄黑撞色 + 斜切角 + 故障艺术三件套一上，那个味儿就出来了。

回过头看，整个角色助手项目（后端 + 前端 + 数据集）的技术选型有几个我觉得做对了的地方：后端用 LoRA + vLLM 而不是全参 + 
transformers
，兼顾了效果和性能；前端用原生三件套而不是 React/Vue，换来了极致的轻量和 ZZZ 视觉的完全掌控；RAG 和校验器做成开关而非硬编码，给了调试和体验的灵活性。

后续打算做的事：一是加语音输入输出，让和仪玄的对话更沉浸；二是接入更多角色（简、朱鸢、青衣），利用 vLLM 的 LoRA 热加载做多角色切换；三是把前端打包成 PWA，手机上加个图标就能当 App 用。

如果你也想给自己的 AI 项目套一个有辨识度的外壳，或者单纯想学学怎么用纯 CSS 搞出赛博朋克风的界面，欢迎来 [zzz-yixuan-webui](https://github.com/RainmeoX/zzz-yixuan-webui) 仓库抄作业。配合上一篇的后端实录，整套角色助手从训练到界面都能复现。

---

> **相关仓库**
>
> * 前端（ZZZ 风格 UI）：https://github.com/RainmeoX/zzz-yixuan-webui
> * 后端（训练 + vLLM + OpenCode）：https://github.com/RainmeoX/zzz-yixuan-assistant
> * 数据集（角色资料）：https://github.com/RainmeoX/zzz-yixuan-dataset
