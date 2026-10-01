# 把私有 AI Agent 摁在 AMD 显卡上跑：Radeon-Assistant「磐石」实战实录

> 原文链接：[https://blog.csdn.net/m0_67166125/article/details/163761301](https://blog.csdn.net/m0_67166125/article/details/163761301)

## 把私有 AI Agent 摁在 AMD 显卡上跑：Radeon-Assistant「磐石」实战实录
 

### 前言：为什么要在 AMD 卡上搞一个"不出本机"的 Agent
 

做过硬件研发的朋友大概都有过这种别扭：芯片手册、datasheet、内部 spec，东西涉密又庞大，你敢往公有云大模型里一扔？我是不敢。但需求又是实打实存在的——让 AI 帮着读 datasheet、按私有知识库问答、甚至顺手生成点 Verilog/Testbench。
 

与其每次都把资料传到别人家的服务器、再提心吊胆地等结果，不如直接把整套 Agent 系统摁在自家显卡上跑。这次我参加 **AMD ROCm 黑客松 Track 2**，做的项目 **Radeon-Assistant「磐石」**，干的就是这件事。先把定位摆正，免得后面被误会：它不是什么自研 EDA 引擎，也不是去训一个大模型，本质就是一个**完全本地部署的私有 AI Agent 系统**——推理（Qwen2.5-14B）、嵌入（all-MiniLM）、向量检索（FAISS）全跑在一张 AMD Radeon Pro W7900 上，对外面任何一个 API 都不调用。一句话：数据不出本机。
 

这篇文章就把它在 **W7900 + ROCm** 上从零跑通的过程记下来，包括架构怎么搭、ROCm 上踩了哪些坑、硬件特化这块到底是怎么落地的。代码已经开源，仓库在 [Radeon-hackathon-2026-07](https://github.com/RainmeoX/Radeon-hackathon-2026-07)，可以对着一步步复现。
 

### 一、硬件与环境：W7900 48GB，但 Windows 跑不了
 

#### 1.1 硬件清单
 

这次的主角是一张 **AMD Radeon Pro W7900**，48GB 显存的工作站级卡，gfx1100 架构。对比消费级 RX 7900 XTX 的 24GB，多出来的 24GB 是能塞下 14B FP16 权重 + KV cache 的关键——不是数字好看而已，是真能跑。
 
组件型号备注GPUAMD Radeon Pro W790048GB GDDR6，**gfx1100** 架构，单卡推理引擎vLLM 0.23.1ROCm 7.14 预编译 wheel底座模型Qwen2.5-14B-Instruct (FP16)7B 版本作备选运行时Python 3.14注意：比常规 3.10/3.11 新不少系统Linux + ROCm 7.14**Windows 桌面跑不了 ROCm**开发环境Radeon Cloud本地没卡时靠云端 AMD 实例

#### 1.2 先泼盆冷水：Windows 桌面别想直接跑
 

这是新手最容易踩的认知坑。ROCm 在 Windows 上基本没有可用的深度学习栈，vLLM / torch 的 ROCm 版都要求 **Linux + AMD GPU**。所以我开发要么本机装 Linux，要么像我一样直接用 **Radeon Cloud** 的云端 AMD 实例远程调试。想在 Win 桌面上 pip install 完直接 vllm serve，想都别想。
 

#### 1.3 gfx1100 那个必须设的环境变量
 

W7900 / RX 7900 系列是 gfx1100，而 vLLM 官方预编译 wheel 默认并不认这张卡的 GFX 版本。我把它固化进 setenv-rocm.sh，每次启动先 source 一下：
 

```
# setenv-rocm.sh —— 启动前必须 source
export HSA_OVERRIDE_GFX_VERSION=11.0.0   # 让运行时把 gfx1100 当 11.0.0 识别
export LD_PRELOAD=/path/to/glibc_shim.so  # 兼容 glibc 的 shim
# 其余 ROCm 相关的 PATH / LD_LIBRARY_PATH 也在这里统一设置

```
 

HSA_OVERRIDE_GFX_VERSION=11.0.0 的作用是骗过运行时，让它走通用的指令路径，否则 vLLM 直接报「device not recognized」罢工。这个变量要写在 import torch 之前，跟微调一个道理，忘了设就白忙活。
 

#### 1.4 性能数据（我实测的）
 

单卡 48GB，两个模型我实际跑下来的吞吐是这样：
 
模型精度吞吐 (tok/s)显存占用Qwen2.5-14B-InstructFP16**≈ 27.5**~30 GBQwen2.5-7B-InstructFP16**≈ 46**~15 GB

14B 在 48GB 上跑 FP16 还有余量留给多卡 TP；要是 24GB 的卡，14B FP16 基本别想，只能退 7B 或者上量化。这个余量对 Agent 这种"常驻一个模型 + 临时拉起子进程"的场景挺重要，不用去折腾多卡通信。说句实话，W7900 这卡工作站定价不便宜，但冲着 48GB 单卡能扛 14B 全量推理，性价比在本地私有部署这个场景里是站得住的。
 

### 二、核心功能：一个私有 Agent 该有的样子
 

磐石不是简单的套壳聊天，企业私有 Agent 常见的几块能力它都做齐了。
 

#### 2.1 本地 RAG 问答
 

私有知识库支持 PDF / DOCX / MD / TXT。重点在 PDF：我做了表格和引脚（pin）提取，不是只抽纯文本。回答带 **Sources 溯源**，每条结论能点回原文位置——这对硬件资料问答很关键，毕竟"模型说这颗芯片有 64 个 IO"，你得能查到它是从哪份 datasheet 里来的。
 

![](https://i-blog.csdnimg.cn/direct/e14a3c6aa2e34113a2993332342f78dc.png)

 

从上面这张 demo 截图能看出来：先问 STM32H7 的 SPI 时钟，模型用预训练知识答（128MHz@APB2，引 ST RM0433）；再上传一份文档问，它就走 RAG 检索回答（96MHz，带 Source: R9E-Embedded-TRM.txt Section 2.3 溯源）。这个"先知识后检索"的对比，是 RAG 价值的直观证明。
 

#### 2.2 14 个内置工具
 

按文件 / Shell / 代码 / 系统 / 硬件五类组织，一共 14 个。Agent 自己决定调哪个：
 
类别代表工具用途文件read_file / write_file / list_dir读写本地工程文件Shellrun_shell执行本地命令（高危，需审批）代码run_python / run_code跑脚本、做小计算系统sys_info / proc_manage查资源占用、管进程硬件generate_verilog / generate_testbench / simulate_verilog硬件研发特化（见第四节）

![](https://i-blog.csdnimg.cn/direct/b6af808c8c3342699863b79b159bdaef.png)

 

工具面板这一块，demo 里展开后能看到 15 个 registered tools（含 generate_verilog / generate_testbench / simulate_verilog），高危操作标了 approval 标记。这是磐石跟纯聊天机器人拉开差距的地方——它能真的动手干活的。
 

#### 2.3 多步任务规划
 

核心是一个**手写的** Planner → Executor → Reflector 循环，ReAct 模式决策每一步调什么工具。失败了 Reflector 自反思再重试，**上限 10 轮**，避免死循环把显存吃爆。
 

#### 2.4 人工审批 + 审计
 

删 / 写 / 执行这类高危操作，不是直接干，而是先过一道审批。审计日志用 JSON-Lines 格式，**只记录操作的长度（length），不记录内容**——这点我挺在意的，你不会在日志里看到某份机密 spec 的正文被落盘。可追溯性和隐私之间的平衡，就靠这个设计兜着。
 

#### 2.5 双入口
 
- Streamlit WebUI：ChatGPT 风格的对话界面，给同事看的门面；
- CLI：脚本化、可批处理；
- 外加一个 OpenAI 兼容接口，能直接接 Dify 这类编排平台。
 

对企业落地来说，CLI + 兼容接口往往是刚需，WebUI 只是面子工程。
 

### 三、技术架构拆解：手写循环，没引 LangChain
 

![](https://i-blog.csdnimg.cn/direct/2b07f251a25c4748ba190f2f62434807.png)

 

#### 3.1 整体分层
 

```
┌─────────────────────────────────────────────┐
│  入口层：Streamlit WebUI / CLI / OpenAI 兼容 API │
├─────────────────────────────────────────────┤
│  安全层：审批门 (Approval Gate) + 审计 Logger   │
├─────────────────────────────────────────────┤
│  Agent 层：手写 Planner → Executor → Reflector  │
│           （ReAct 决策，失败自反思 ≤10 轮）      │
├─────────────────────────────────────────────┤
│  工具层：14 个工具（文件/Shell/代码/系统/硬件）   │
├─────────────────────────────────────────────┤
│  RAG 层：FAISS (IndexFlatL2) + all-MiniLM-L6-v2 │
├─────────────────────────────────────────────┤
│  推理层：vLLM 0.23.1 + Qwen2.5-14B FP16         │
└─────────────────────────────────────────────┘
       全部运行于 AMD W7900 / ROCm 7.14

```
 

#### 3.2 推理与 RAG 参数
 

这是我实际跑通的配置，抄作业直接参考：
 

```
# 推理
ENGINE      = "vLLM 0.23.1"          # ROCm 7.14 预编译 wheel
MODEL       = "Qwen2.5-14B-Instruct" # FP16，7B 备选
DTYPE       = "fp16"

# RAG
EMBEDDING   = "all-MiniLM-L6-v2"
VECTOR_DB   = "FAISS(IndexFlatL2)"
CHUNK_SIZE  = 512
CHUNK_OVERLAP = 50
TOP_K       = 5

```
 

FAISS 用的是 IndexFlatL2，也就是暴力精确检索。数据量在几千 chunk 级别完全够用，没必要上 IVF 那种近似索引给自己找麻烦。chunk 512 / overlap 50 是试出来的平衡：太大检索粒度粗，太小上下文被切碎。
 

#### 3.3 为什么不用 LangChain
 

Agent 循环是完全手写的，没引 LangChain。原因很实际：黑客松要的是可控、可调试、依赖少。手写 Planner→Executor→Reflector，每一步输入输出看得清清楚楚，出错了直接打日志定位；引 LangChain 反而多一层抽象、多一堆版本兼容问题。对"私有部署 + 可审计"这个场景，少一层依赖就是少一个风险面。
 

#### 3.4 Agent 循环伪代码
 

```
def agent_loop(user_task, max_rounds=10):
    plan = planner.generate(user_task)          # Planner 拆解任务
    for round_i in range(max_rounds):
        action = executor.decide(plan, memory)  # Executor 选工具
        if action.needs_approval:               # 安全门
            if not human_approve(action):
                break
        result = tool_registry[action.tool](action.args)
        reflection = reflector.judge(result, plan)  # Reflector 自反思
        if reflection.done:
            return reflection.answer
        plan = reflection.revised_plan             # 失败则修订计划重试
    return fallback_answer

```
 

### 四、硬件研发特化：磐石真正和别人拉开差距的地方
 

如果说前面那些 RAG + Agent 是通用私有助手的标配，那**硬件研发特化**才是磐石跟别人不一样的地方——它直接面向芯片 / 数字电路工程师的日常工作。
 

#### 4.1 硬件领域 System Prompt
 

我在 system prompt 里注入了硬件研发语境：Verilog 编码规范、常见电路结构、datasheet 阅读习惯。这意味着你问"帮我写一个带异步复位的 8 位计数器"，它不会给你一段 Python，而是规规矩矩的 RTL。这一步做好了，模型回答问题才"入味"——不是泛泛的 AI 腔，而是像干了几年硬件的人。
 

#### 4.2 本地 HDL 生成：generate_verilog / generate_testbench
 

两个工具直接生成硬件描述语言，而且**完全本地**，不调任何外部模型服务：
 

```
# generate_verilog 工具伪代码
def generate_verilog(spec: str) -> str:
    prompt = HARDWARE_SYSTEM_PROMPT + f"\n需求：{spec}\n只输出 Verilog 代码："
    raw = vllm_chat(prompt, stop=["```"])   # 关键：stop 列表里带 ```
    code = strip_code_fence(raw)            # 强制裸代码，见坑五
    return code

# generate_testbench 同理，产出对应的 testbench
def generate_testbench(module: str) -> str:
    ...

```
 

![](https://i-blog.csdnimg.cn/direct/6a4e20d56fbb4accad109b5b6553d487.png)

 

这里明确要求模型只输出裸代码、不带 ```围栏，原因后面踩坑实录会细说——vLLM 的 stop 列表会提前截断带围栏的输出。
 

#### 4.3 仿真验证：simulate_verilog
 

生成完不算完，磐石用 **iverilog + vvp** 做本地仿真，把生成的 Verilog 真正编译跑一遍，验证功能对不对：
 

```
# simulate_verilog 内部流程
iverilog -o tb.out design.v tb.v   # 编译
vvp tb.out                          # 跑仿真，输出波形/断言结果

```
 

这一步是早期版本缺失、后来补上的。最开始只生成不验证，结果模型产出的 RTL 经常编译都过不了，纯属"看着像"。接上 iverilog 之后，能当场发现语法 / 端口不匹配，把"能跑的 HDL"和"能看的 HDL"区分开。说句实话，这是**场景特化的轻量验证，不是自研 EDA 引擎**——定位得清楚，别被名字忽悠了。
 

#### 4.4 Demo 里跑通的样子
 

黑客松要求的 demo 视频里，我演示了：CLI / WebUI 双入口 → RAG 问答带溯源 → Verilog 生成 → iverilog 仿真跑通 → 工具调用型 Agent 多步任务。一条龙下来，评委能直观看到"数据真的没出本机"。这五件事——本地推理 + 本地检索 + 本地工具 + 本地生成 + 本地仿真——就是磐石的**五件套**，缺一不可。
 

### 五、当前进度与成果
 

最新 commit 是 **2026-08-07**（Merge UI / 后端联调），Track 2 要求的四类材料已经齐了：规格 PDF、完整源码、demo 演示视频、poster。
 

评测这块我得说句实话：仓库自认是**自动评分**，不是人工判分。具体数字：
 
指标数值说明14B 基准吞吐**27.4 tok/s**和前面 27.5 一个量级关键词命中率**91%**自动评分知识库规模7 份 datasheet，约 **3.3k chunks**预置硬件资料

注意那个"自动评分"的标注——我没吹"人工专家评测 SOTA"，就是脚本按关键词命中算的分，可信但有限。这种诚实标注比虚高的数字更有价值，毕竟自己骗自己没意义。
 

### 六、踩坑实录
 

这一节写给后来者，每一条都是我用时间换来的。ROCm 的坑其实不少，我把最容易卡死人、最值钱的几条挑出来，其余的次级坑末尾一句话带过。
 

**坑一：ROCm 环境两连坑——gfx1100 不认 + CUDA wheel 误装。** 新人最容易栽的两个：
 
- W7900 是 gfx1100，vLLM 官方预编译 wheel 默认不认，启动直接报 device not recognized。解决：HSA_OVERRIDE_GFX_VERSION=11.0.0，固化进 setenv-rocm.sh 自动注入，别手敲漏了。
- 更阴间的是依赖地狱：pip install torch 走 PyPI / 清华源会拉到 CUDA 版 wheel，import 报 libcuda.so.1: cannot open shared object file。DL 栈必须从 AMD 源装，老老实实走 install_rocm.sh。ROCm 环境下 CUDA 那条线就是不能碰——不是口号，是血泪。
 

**坑二：Verilog 生成被 stop 列表提前截断。** 现象是代码到一半就没了。原因：vLLM 的 stop 序列里带 ，模型习惯用 verilog 包代码，输出到第一个 ```就被截断。解决：强制模型只输出**裸代码**、不带围栏，后处理里 strip_code_fence。这招是 HDL 生成能完整落地的关键（见 4.2 节）。
 

**坑三：务必诚实标注能力边界。** 早期我生成 HDL 没接仿真器，对外容易让人误以为"全自动 EDA"。后来明确：仓库定位是"使用场景特化"、**非自研 EDA 引擎**，并补上 simulate_verilog 做轻量验证。对外讲清楚能做什么、不能做什么，比含糊其辞更立得住。
 
 
 
其余次级坑一句话带过：多卡 TP 必须用 spawn 启动（否则 HIP 上下文炸）；WebUI 的审批是**策略开关**而非逐次阻塞弹窗（CLI 才保留 y/N）；PDF 抽取**无 OCR**，扫描件得先转文本 PDF 再入库。
 
 

### 七、效果展示与总结
 

回过头看，磐石想做的事情其实很直白：在单张 AMD W7900（48GB）+ ROCm 7.14 上，把一个企业级私有 AI Agent 跑通——推理、嵌入、向量检索全本地，零外部 API 调用，还顺手把硬件研发最痛的"读 datasheet / 写 Verilog / 跑仿真"给包了。
 

实测数字摆在这儿：14B FP16 ≈ 27.5 tok/s（~30GB）、7B ≈ 46 tok/s（~15GB）；首条消息 75–90 秒属正常预热；自动评测 14B 基准 27.4 tok/s、关键词命中率 91%；预置 7 份 datasheet 约 3.3k chunks。架构上我坚持手写 Planner→Executor→Reflector、不依赖 LangChain，安全层用审批门 + 只记长度的审计日志，把"私有"两个字落到实处。
 

ROCm 生态的坑（gfx1100 适配、CUDA wheel 误装、spawn 启动、stop 列表截断）我都替你踩过了，照着 setenv-rocm.sh 和 install_rocm.sh 来，能省掉大把绕路时间。如果你手里有一张 AMD 卡、又有"数据不能出本机"的刚需，磐石这套思路值得直接拿来改。
 

一句话收尾：私有 Agent 本地化，AMD 卡现在真能打，关键是别去碰 CUDA 那条线。
 
 
 
 
**相关仓库**
 
 - Radeon-Assistant「磐石」：https://github.com/RainmeoX/Radeon-hackathon-2026-07
