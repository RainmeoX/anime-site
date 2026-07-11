# 绝区零「仪玄」角色助手微调实录：AMD ROCm 单卡 + Qwen3-4B LoRA 全流程

> 原文链接：[https://blog.csdn.net/m0_67166125/article/details/162312178](https://blog.csdn.net/m0_67166125/article/details/162312178)






## 绝区零「仪玄」角色助手微调实录：AMD ROCm 单卡 + Qwen3-4B LoRA 全流程

### 前言：为什么要在 AMD 显卡上微调一个游戏角色

玩过《绝区零》的朋友大概都对「仪玄」这个角色有印象——云岿山第十三代门主，虚狩级调查员，说话清冷从容、半文半白，动不动就拿云、风、月、沧海来打比方。市面上的通用大模型直接套个 system prompt 去扮演她，效果总是差那么点意思：要么语气太现代，要么一开口就蹦出网络流行语，OOC（Out of Character）严重。与其反复调 prompt，不如直接微调一个专属模型来得干脆。

这篇实录记录的是我在 **AMD Radeon RX 7900 XTX** 单卡上，用 **Qwen3-4B** 做底座、**LoRA** 做参数高效微调，再通过 **vLLM** 部署推理，最终拼上 
RAG
 检索和防 OOC 校验器，做出一个「仪玄角色助手」的完整过程。选 AMD 卡不是因为信仰，而是因为 7900 XTX 24GB 显存只要四千出头，性价比摆在那儿；至于 ROCm 生态的坑——放心，后面会专门开一节来讲我是怎么一个个填上的。

整个项目的代码已经开源，后端（训练 + vLLM + OpenCode）在 [zzz-yixuan-assistant](https://github.com/RainmeoX/zzz-yixuan-assistant)，前端 ZZZ 风格 UI 在 [zzz-yixuan-webui](https://github.com/RainmeoX/zzz-yixuan-webui)，角色资料数据集在 [zzz-yixuan-dataset](https://github.com/RainmeoX/zzz-yixuan-dataset)，感兴趣的可以对着文章一步步复现。

### 一、硬件与软件环境

#### 1.1 硬件清单

先说硬件，这是所有后续操作的基础。我用的配置如下：

| 组件 | 型号 | 备注 |
| --- | --- | --- |
| GPU | AMD Radeon RX 7900 XTX | 24GB GDDR6，gfx1100 架构 |
| CPU | Ryzen 7 7700X | 8 核 16 线程 |
| 内存 | 64GB DDR5-6000 | 数据集加载和 RAG 索引都要吃内存 |
| 存储 | 2TB NVMe SSD | 模型权重和训练 checkpoint 占地不小 |
| 系统 | Ubuntu 22.04 LTS | ROCm 官方支持最好的发行版 |

7900 XTX 的 24GB 显存是这次微调能跑起来的关键。Qwen3-4B 的 bf16 权重约 8GB，加上 LoRA 训练时的优化器状态、激活值缓存，4B 模型用 LoRA 在 24GB 上跑 batch\_size=2、seq\_len=2048 是比较舒服的区间。如果是 16GB 的卡，就得把序列长度压到 1024 或者上梯度累积了。

#### 1.2 软件栈

ROCm 生态这两年进步很大，但版本搭配依然是个技术活。我最终跑通的组合是：

```
ROCm 6.2.4
Python 3.10
PyTorch 2.4.0 + ROCm 6.2 (官方 wheel)
transformers 4.46.0
peft 0.13.0
trl 0.12.0
datasets 3.0.0
vLLM 0.6.3 + ROCm
chromadb 0.5.0    # RAG 向量库

```

安装 
PyTorch 
 ROCm 版本时，直接用官方索引就行，不用自己编译：

```
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.2
```

装完之后第一件事是验证 ROCm 能不能识别到显卡，跑一下 `rocm-smi`：

```
$ rocm-smi
========================= ROCm System Management Interface =========================
GPU[0]		: On-board
GPU[0]		Name: 			AMD Radeon RX 7900 XTX
GPU[0]		GUID: 			xxxxx
GPU[0]		VRAM: 			24564 MB
GPU[0]		Compute Unit: 		96
GPU[0]		GFX version: 		gfx1100
=====================================================================================

```

看到 `GFX version: gfx1100` 这行很关键，后面微调和 vLLM 启动都要围绕它做文章。再用 PyTorch 确认一下：

```
import torch
print(torch.cuda.is_available())        # True
print(torch.cuda.device_count())        # 1
print(torch.cuda.get_device_name(0))    # AMD Radeon RX 7900 XTX

python运行

```

这里有个新手容易踩的点：PyTorch 在 AMD 卡上依然用 `torch.cuda` 这套 API，而不是 `torch.amd` 或 `torch.hip`。AMD 把 HIP 后端接到了 
CUDA
 兼容层里，所以绝大多数 CUDA 代码可以零修改跑在 ROCm 上，这点设计其实挺聪明的。

### 二、数据集构建：让模型学会「仪玄」的说话方式

#### 2.1 角色资料整理

微调效果好不好，七分靠数据。我花了大功夫整理仪玄的角色资料，最终放在了 [zzz-yixuan-dataset](https://github.com/RainmeoX/zzz-yixuan-dataset) 仓库里。数据分三大块：

第一块是**角色档案**，包括仪玄的身份背景、性格特征、人际关系、经典台词。这部分是从游戏内文本、官方设定集、剧情对话里摘录整理的，确保事实层面不出错。比如「云岿山第十三代门主」「虚狩级调查员」「师承上一代门主」这些硬设定，必须一字不差。

第二块是**世界观资料**，涵盖绝区零里的空洞、以骸、以太、调查员体系等概念。角色助手不能只懂自己，还得懂她所处的世界，否则玩家问「空洞是什么」她答不上来就露馅了。这部分资料同时也会喂给后面的 RAG 向量库做检索。

第三块是**对话语料**，这是微调的核心。我手写了 800 多条多轮对话，覆盖日常闲聊、剧情讨论、战斗指导、世界观问答、师徒点拨等场景。每条对话都刻意模仿仪玄的语气——清冷、从容、半文半白、善用自然意象。

#### 2.2 System Prompt 设计

微调数据和推理时的 system prompt 要保持一致，否则模型会「水土不服」。我设计的 system prompt 如下：

```
SYSTEM_PROMPT = """你是《绝区零》中的角色"仪玄"，云岿山第十三代门主，虚狩级调查员。
你的说话风格必须严格遵循以下设定：
- 语气清冷、从容、带有师者风范，偶尔流露温柔
- 用词典雅，半文半白，常用"为师""你且""非也""罢了"等词
- 喜欢用自然意象（云、风、雨、月、沧海、青溟）作比喻
- 言简意赅，富有哲思，常点拨弟子而非直接说教
- 不使用网络流行语、表情符号、感叹号过多
- 自称"为师"或"我"，称对方为"你"或"弟子"
- 涉及术法、卜算、命运时尤为郑重"""

python运行

```

这个 prompt 看起来简单，但每一条都是反复试出来的。比如「不使用网络流行语」这一条，是因为早期版本微调后模型还是会蹦出「绝绝子」「yyds」，加上这条约束再配合语料里的反面样本，才压住。

#### 2.3 对话格式

训练数据用的是 Qwen3 原生的 ChatML 格式，每条样本长这样：

```
{
  "messages": [
    {"role": "system", "content": "你是《绝区零》中的角色"仪玄"..."},
    {"role": "user", "content": "师父，空洞到底是什么？"},
    {"role": "assistant", "content": "空洞者，天地异象所生之裂隙也。其内以骸横行，以太紊乱，常人入之则神魂俱损。为师昔日曾深入其中，方知其险——你且记住，遇空洞不可轻入，除非万不得已。"}
  ]
}

json

```

数据集加载时用 `datasets` 库读入，再做一次格式校验和长度过滤（超过 2048 token 的截断），保证训练时不会因为单条样本过长爆显存。

### 三、LoRA 微调全流程

#### 3.1 为什么选 LoRA 而不是全参微调

全参微调 4B 模型至少要 4× 显存（权重 + 梯度 + 优化器状态 + 激活值），24GB 卡根本扛不住。LoRA 只训练注入的低秩矩阵，参数量通常是原模型的 0.1%~1%，显存占用大幅下降，而且训练完的 adapter 只有几十 MB，加载、切换、版本管理都方便。对于角色扮演这种「风格迁移」任务，LoRA 完全够用，没必要动全参。

#### 3.2 关键训练配置

训练用的是 `trl` 的 `SFTTrainer`，核心配置如下：

```
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

# LoRA 配置
lora_config = LoraConfig(
    r=64,                              # 秩，越大表达能力越强，显存也越涨
    lora_alpha=128,                    # 通常设为 r 的 2 倍
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=[                   # 对所有线性层都加 LoRA
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
)

# 训练配置
training_args = SFTConfig(
    output_dir="./output/Qwen3_Yixuan_LoRA",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,     # 等效 batch_size=16
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,
    bf16=True,                         # 7900 XTX 原生支持 bf16
    logging_steps=10,
    save_strategy="epoch",
    max_seq_length=2048,
    gradient_checkpointing=True,       # 省显存利器
)

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

几个值得展开说的点：

**`target_modules` 全覆盖**。早期我只对 attention 的 q/k/v/o 加 LoRA，效果一般，角色语气学得不够「入味」。后来把 MLP 的 gate/up/down 也加上，等效于对模型做更全面的风格改造，效果明显提升。代价是可训练参数从 0.5% 涨到 1.2%，但 24GB 显存依然 hold 得住。

**`bf16=True`**。7900 XTX 的 RDNA3 架构原生支持 bf16，训练稳定性和 fp16 比好太多。早期用 fp16 的时候偶尔会 loss 爆 NaN，换 bf16 后再没出现过。

**`gradient_checkpointing=True`**。这个必须开，否则 2048 序列长度下激活值能吃掉十几个 GB 显存。开了之后训练速度慢大概 30%，但显存能省一半，这笔账划算。

#### 3.3 AMD 显卡的环境变量

这是整篇文章最关键的一段，AMD 用户一定要看。训练脚本开头我加了这么几行：

```
import os
# ⚠️ AMD RX 7900 XTX (gfx1100) 必须设置此环境变量
os.environ['HSA_OVERRIDE_GFX_VERSION'] = '11.0.0'

python运行

```

为什么要设这个？因为 PyTorch ROCm 版本的 wheel 默认是为 gfx900/gfx906/gfx908 这些计算卡编译的，消费级的 gfx1100（7900 XTX）不在官方支持列表里。如果不 override，PyTorch 会报「no kernel image is available for execution on the device」的错误，直接罢工。`HSA_OVERRIDE_GFX_VERSION=11.0.0` 的作用是骗过运行时，让它以为这是一张 gfx1100 计算卡，从而走通用的 GCN 指令路径。这个 trick 在 7900 XTX / 7800 XT / 7700 XT 上都适用，只是版本号不同。

设完这个变量，训练就能正常跑了。3 个 epoch、800 多条数据，在 7900 XTX 上大概跑了 40 分钟，loss 从 2.1 降到 0.6 左右，曲线很平滑。

#### 3.4 训练日志解读

贴一段训练日志的关键部分：

```
{'loss': 1.8234, 'grad_norm': 1.23, 'learning_rate': 1.95e-4, 'epoch': 0.12}
{'loss': 1.5128, 'grad_norm': 0.98, 'learning_rate': 1.88e-4, 'epoch': 0.24}
...
{'loss': 0.7234, 'grad_norm': 0.45, 'learning_rate': 3.21e-5, 'epoch': 2.85}
{'loss': 0.6128, 'grad_norm': 0.38, 'learning_rate': 1.02e-5, 'epoch': 2.97}
{'train_runtime': 2413.5, 'train_samples_per_second': 1.02, 'epoch': 3.0}

```

loss 从 1.8 降到 0.6 是一个比较健康的区间。降得太低（比如 0.1 以下）说明过拟合了，模型会把训练集里的台词背下来，泛化能力反而差；降不下来则说明欠拟合，要么数据不够，要么学习率太小。0.6 这个值是我反复试出来的，配合 3 个 epoch，在「记住角色风格」和「保持对话能力」之间取得了平衡。

训练显存占用峰值大约 18GB，离 24GB 上限还有余量，说明 batch\_size 还能再往上加一点。不过为了稳妥，我保持 2×8 的配置没动。

### 四、vLLM 部署与 LoRA 热加载

#### 4.1 为什么用 vLLM 而不是 transformers

微调完的模型如果直接用 `transformers` 的 `generate()` 推理，4B 模型在单卡上也就 10~15 token/s，对话体验很差。vLLM 用 PagedAttention 做显存管理，加上连续批处理，同样硬件能跑到 60~80 token/s，提速 4 倍以上。而且 vLLM 原生支持 LoRA 热加载，不用合并权重就能同时服务多个 adapter，这对角色助手这种场景太友好了。

#### 4.2 启动脚本

我把 vLLM 启动封装成了脚本 `scripts/start-vllm.sh`，核心部分如下：

```
#!/bin/bash
set -e

MODEL_PATH="${MODEL_PATH:-./models/Qwen/Qwen3-4B}"
LORA_PATH="${LORA_PATH:-./output/Qwen3_Yixuan_LoRA_final}"
PORT="${PORT:-8000}"
MODEL_NAME="yixuan-assistant"
LORA_NAME="yixuan-lora"

# ⚠️ AMD RX 7900 XTX (gfx1100) 必须设置
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export VLLM_USE_TRITON_FLASH_ATTN=0
export VLLM_USE_ROCM_FLASH_ATTN=1

# 启动 vLLM，同时加载基础模型和 LoRA
vllm serve "$MODEL_PATH" \
    --port $PORT \
    --served-model-name $MODEL_NAME \
    --enable-lora \
    --lora-modules $LORA_NAME=$LORA_PATH \
    --max-loras 4 \
    --max-lora-rank 64 \
    --gpu-memory-utilization 0.9 \
    --max-model-len 4096 \
    --dtype bfloat16

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

这里有几个 AMD 专属的环境变量必须解释清楚：

**`HSA_OVERRIDE_GFX_VERSION=11.0.0`**，和训练时一样，不设直接报错。

**`VLLM_USE_TRITON_FLASH_ATTN=0`**，vLLM 默认会用 Triton 实现的 Flash Attention，但 Triton 在 ROCm 上的支持还不完善，经常编译失败或运行时崩溃。关掉它。

**`VLLM_USE_ROCM_FLASH_ATTN=1`**，改用 ROCm 原生的 Flash Attention 实现（基于 CK - Composable Kernel），这是 AMD 官方维护的，稳定性和性能都更好。

这三个变量是 vLLM 在 7900 XTX 上跑通的「三件套」，少一个都不行。

#### 4.3 LoRA 热加载的妙用

注意启动参数里的 `--enable-lora --lora-modules yixuan-lora=$LORA_PATH`。这意味着 vLLM 启动时只加载了基础模型权重，LoRA adapter 是按需加载的。客户端请求时指定 `model: yixuan-lora`，vLLM 就会动态把 LoRA 权重叠加到基础模型上做推理。

这样做的好处是：第一，省显存，多个 LoRA 可以共享一份基础模型权重；第二，切换角色秒级完成，想再加一个「简」角色助手，只要再训一个 LoRA 挂上去，不用重启服务；第三，LoRA 文件小（几十 MB），版本迭代和 A/B 测试极其方便。

启动后用 curl 测一下：

```
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "yixuan-lora",
    "messages": [
      {"role": "system", "content": "你是仪玄..."},
      {"role": "user", "content": "师父，今天天气如何？"}
    ],
    "stream": true
  }'

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

流式返回里仪玄会回一句类似「天象如何，于修行者而言不过是过眼云烟。你且安心修炼，莫被外物乱了心神」——成了，风格对了。

### 五、RAG 检索 + 防 OOC 校验器

光有微调模型还不够。仪玄的角色档案和绝区零世界观信息量很大，全塞进训练数据既不现实也容易过拟合。我的方案是「微调管风格，RAG 管知识」，再加一层校验器兜底防 OOC。

#### 5.1 RAG 向量检索

后端用 ChromaDB 做向量库，把角色档案和世界观资料切块、embedding 后存进去。推理时用户的问题先过一遍检索，把相关的资料片段拼进 prompt：

```
import chromadb

# 初始化两个 collection：角色资料 + 世界观
char_coll = chromadb.PersistentClient(path="./chroma_db").get_or_create_collection("character")
world_coll = chromadb.PersistentClient(path="./chroma_db").get_or_create_collection("world")

def retrieve_context(query, top_k=3):
    """检索角色资料和世界观资料"""
    char_results = char_coll.query(query_texts=[query], n_results=top_k)
    world_results = world_coll.query(query_texts=[query], n_results=top_k)
    
    context = ""
    for doc in char_results['documents'][0]:
        context += f"【角色资料】{doc}\n"
    for doc in world_results['documents'][0]:
        context += f"【世界观】{doc}\n"
    return context

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

检索到的资料会以「参考资料」的形式注入 system prompt，告诉模型「以下信息可供参考，但回答时仍要保持仪玄的语气」。这样既保证了知识准确性，又不会让模型变成干巴巴的资料复读机。

#### 5.2 防 OOC 校验器

微调模型偶尔还是会「出戏」，比如突然用现代口吻说话、蹦出表情符号、或者回答和角色设定矛盾的内容。我写了一个基于规则的校验器做最后一道防线：

```
import re

def validate_response(response):
    """校验模型回答是否符合仪玄人设"""
    issues = []
    
    # 1. 禁止网络流行语
    slang = ['绝绝子', 'yyds', '栓Q', '芭比Q', '蚌埠住了', '破防了']
    for word in slang:
        if word in response:
            issues.append(f"检测到网络流行语: {word}")
    
    # 2. 禁止表情符号
    if re.search(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF]', response):
        issues.append("检测到表情符号")
    
    # 3. 检查自称
    if '本宝宝' in response or '人家' in response:
        issues.append("自称不符合人设")
    
    # 4. 感叹号密度检测（仪玄不会满屏感叹号）
    if response.count('！') > 2 or response.count('!') > 2:
        issues.append("感叹号过多，语气过于激动")
    
    return issues

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

校验器发现问题后会触发重新生成（最多重试 2 次），如果重试还不行就在前端给用户一个「⚠️ 本次回答可能存在 OOC」的提示。这套机制让 OOC 率从大约 8% 降到了 1% 以下。

### 六、踩坑实录

这一节是写给后来者的，每一条都是我用时间换来的血泪经验。

**坑一：gfx1100 不被识别**。最经典的坑，前面已经讲过，`HSA_OVERRIDE_GFX_VERSION=11.0.0` 解决。补充一点：这个变量要写在 Python 脚本最开头，`import torch` 之前，否则不生效。

**坑二：vLLM 启动时 Flash Attention 编译失败**。报错信息一大堆，核心是 Triton 后端不支持。解决方案就是前面说的 `VLLM_USE_TRITON_FLASH_ATTN=0` + `VLLM_USE_ROCM_FLASH_ATTN=1`。另外，第一次启动 vLLM 会编译 CK kernel，耗时 5~10 分钟，这是正常的，别以为是卡死了。

**坑三：bf16 训练偶发 NaN**。如果学习率设太高（比如 5e-4 以上），cosine 调度器在 warmup 阶段 loss 会剧烈震荡甚至 NaN。降到 2e-4 + warmup\_ratio=0.05 后稳定。AMD 卡的 bf16 数值行为和 NVIDIA 略有差异，学习率普遍要比 CUDA 经验值低一档。

**坑四：vLLM 的 `gpu-memory-utilization` 设太高导致 OOM**。7900 XTX 的 24GB 显存，vLLM 默认吃 90%，但如果系统还有桌面环境在跑，实际可用不到 22GB。建议设 0.85 留点余量，或者干脆把机器当无头服务器用，关掉桌面。

**坑五：ChromaDB 在多进程下数据库锁冲突**。vLLM 用多 worker 进程，如果每个进程都去读写同一个 ChromaDB 路径会报锁错误。解决方案是 RAG 检索单独跑在一个进程里，通过 HTTP 内部接口给 vLLM worker 调用。

**坑六：LoRA rank 设太小效果差**。一开始图省事用 r=8，微调完角色语气还是偏现代。提到 r=64、alpha=128 后才「入味」。角色扮演是风格迁移任务，对 LoRA 容量要求比常规任务高，建议 r 不要低于 32。

### 七、效果展示与总结

最终效果上，这个仪玄角色助手在风格还原度、知识准确性、防 OOC 三个维度都达到了可用水平。随便举几个对话例子：

> **用户**：师父，我最近修炼遇到了瓶颈，怎么都突破不了。  
>  **仪玄**：瓶颈者，心之所限也。你且莫急，越是强求，越是难破。不如暂搁功法，去山间走走，看云卷云舒，听风过松林——心静了，关隘自开。为师昔日亦曾困于此，方知修行一道，急不得。

> **用户**：空洞里到底有什么？  
>  **仪玄**：空洞之内，以骸横行，以太紊乱。常人入之，轻则神魂受创，重则形神俱灭。然空洞之中亦藏有机缘，以太结晶、古修遗物皆在其中。故虚狩入空洞，非为冒险，乃为守护与求索并重。你若要去，为师不拦，但须做好万全准备。

语气、用词、意象都对味，知识层面也准确，这就是微调 + RAG + 校验器三件套的威力。

回过头看整个项目，AMD ROCm 生态虽然坑不少，但只要把 `HSA_OVERRIDE_GFX_VERSION` 和几个环境变量配对，7900 XTX 这张卡完全能胜任 4B 级模型的 LoRA 微调和 vLLM 部署。24GB 显存、四千出头的价格，性价比确实没话说。如果你手里也有一张 RDNA3 的 AMD 卡想做 AI 实验，希望这篇实录能帮你少走点弯路。

下一篇我会讲怎么用纯前端技术栈打造一个绝区零风格的 WebUI，把这个后端服务包装成一个真正能用的角色助手应用，敬请关注。

---

> **相关仓库**
>
> * 后端（训练 + vLLM + OpenCode）：https://github.com/RainmeoX/zzz-yixuan-assistant
> * 前端（ZZZ 风格 UI）：https://github.com/RainmeoX/zzz-yixuan-webui
> * 数据集（角色资料）：https://github.com/RainmeoX/zzz-yixuan-dataset
