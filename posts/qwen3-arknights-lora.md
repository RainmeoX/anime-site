# Qwen3-0.6B + LoRA 明日方舟干员助手微调实录：AMD ROCm 单卡全流程

> 原文链接：[https://blog.csdn.net/m0_67166125/article/details/162348092](https://blog.csdn.net/m0_67166125/article/details/162348092)

### 前言：为什么给明日方舟训一个干员助手

玩明日方舟的博士们大概都有过这样的体验：想查某个六星干员的技能机制，得翻游戏里的干员档案；想了解某个干员的背景故事，得去 PRTS Wiki 搜；想跟喜欢的干员"对话"，更是只能靠脑补。市面上的通用大模型问它"银灰的三技能是什么"，它要么编一个，要么说不知道——毕竟训练数据里没有这些游戏专有知识。

与其每次都手动查 Wiki，不如微调一个专属的干员助手。这篇实录记录的是我在 AMD Radeon Cloud 单卡上，用 Qwen3-0.6B 做底座、LoRA 做参数高效微调，训练一个能回答干员问题、查询干员资料、甚至扮演干员对话的 AI 助手的完整过程。选 0.6B 的小模型不是因为穷，而是因为干员问答这个任务用 0.6B 足够了——模型小、训练快、
部署 
轻，一张 AMD 显卡 8-15 分钟就能训完，LoRA adapter 才 20MB，推理时加载几乎零延迟。

整个项目的代码已经开源，训练脚本 + 部署脚本 + Gradio 界面都在 [arknights-qwen-assistant](https://github.com/RainmeoX/arknights-qwen-assistant)，数据集在 [arknights-dataset](https://github.com/RainmeoX/arknights-dataset)，感兴趣的可以对着文章一步步复现。

### 一、环境准备

#### 1.1 硬件与软件

这次用的是 AMD Radeon Cloud 的单卡环境，ROCm 6.x 生态。和之前训 Gemma 4、Qwen3-4B 一样，AMD 显卡跑 LoRA 微调已经相当成熟，只要把环境变量配对，体验和 NVIDIA 卡差别不大。

| 组件 | 配置 |
| --- | --- |
| GPU | AMD Radeon Cloud 单卡（ROCm 6.x） |
| 模型 | Qwen3-0.6B（bf16，约 1.2GB） |
| 微调方法 | LoRA (r=8, alpha=32) |
| 训练数据 | 133 个六星干员，8,846 条问答 |
| 训练时长 | 约 8-15 分钟 |
| LoRA 大小 | ~20MB |

#### 1.2 ROCm 环境配置

AMD 显卡跑 
PyTorch
 需要装 ROCm 版本，关键步骤：

```
# gfx1100 架构需要设置环境变量
export HSA_OVERRIDE_GFX_VERSION=11.0.0

# 安装 PyTorch ROCm 版本
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.2

# 验证
python -c "import torch; print(torch.cuda.is_available())"  # True

```

装完依赖后第一件事是验证 ROCm 能不能识别到显卡，跑一下 `rocm-smi` 确认显存和算力正常。

### 二、数据集构建

#### 2.1 数据来源

训练数据来自 [arknights-dataset](https://github.com/RainmeoX/arknights-dataset) 仓库，包含 133 个六星干员的完整资料，整理成问答对格式：

| 数据类型 | 数量 | 说明 |
| --- | --- | --- |
| 基础信息问答 | ~2,000 | 职业、星级、阵营、属性等 |
| 技能查询 | ~1,500 | 技能名称、效果描述 |
| 天赋查询 | ~1,200 | 天赋名称、触发条件、效果 |
| 属性查询 | ~1,000 | 满级生命、攻击、防御等 |
| 角色扮演 | ~2,500 | 干员语音台词 |
| 综合介绍 | ~600 | 干员完整介绍 |
| **总计** | **8,846** | 133 个六星干员 |

#### 2.2 数据格式

每条数据是标准的问答对，用 Qwen3 的 chat template 格式：

```
{
    "messages": [
        {"role": "system", "content": "你是明日方舟游戏助手，可以回答关于干员的各种问题，也能扮演干员进行对话。"},
        {"role": "user", "content": "银灰是什么职业？"},
        {"role": "assistant", "content": "银灰是近卫干员，六星，属于谢拉格阵营。"}
    ]
}

python运行

```

角色扮演类的数据会带上干员的语气特征，比如银灰的台词风格偏沉稳、有领袖气质，能天使则比较活泼直接。这样微调后模型不仅能回答事实性问题，还能模仿干员的说话方式。

### 三、LoRA 微调全流程

#### 3.1 加载模型和分词器

从 ModelScope 下载 Qwen3-0.6B，用 bf16 精度加载：

```
from modelscope import snapshot_download
from transformers import AutoTokenizer, AutoModelForCausalLM

model_path = snapshot_download('Qwen/Qwen3-0.6B', cache_dir='./models')

tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    device_map="auto",
    torch_dtype=torch.bfloat16,
    trust_remote_code=True
)

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

#### 3.2 数据预处理

把问答对转换成模型输入的 token 序列，用 Qwen3 的 chat template：

```
def preprocess(example):
    messages = example["messages"]
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False
    )
    return tokenizer(text, truncation=True, max_length=512)

dataset = dataset.map(preprocess, remove_columns=dataset.column_names)

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

#### 3.3 LoRA 配置

0.6B 模型用 r=8 就够了，比 4B 模型的 r=16 小一半，因为模型容量小，太大的 rank 反而容易过拟合：

```
from peft import LoraConfig, TaskType, get_peft_model

config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    inference_mode=False,
    r=8,
    lora_alpha=32,
    lora_dropout=0.1
)
model = get_peft_model(model, config)
model.print_trainable_parameters()
# trainable params: 1.3M || all params: 601M || trainable%: 0.22%

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

只训练 0.22% 的参数，这就是 LoRA 的魅力——用极小的代价让模型学会新知识。

#### 3.4 训练参数

0.6B 模型的训练参数和 4B 有所不同，学习率要大一些（小模型需要更大的步长），batch size 可以开大（显存占用小）：

```
from transformers import TrainingArguments, Trainer

args = TrainingArguments(
    output_dir="./output/Qwen3_Arknights_LoRA",
    per_device_train_batch_size=8,         # 0.6B 可以开大
    gradient_accumulation_steps=2,         # 等效 batch=16
    logging_steps=10,
    num_train_epochs=3,                    # 8846条数据，3轮足够
    save_steps=500,
    learning_rate=5e-4,                    # 0.6B 用大学习率
    save_on_each_node=True,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    bf16=True,                             # AMD ROCm 原生支持
    optim="adamw_torch",
    warmup_ratio=0.05,
    lr_scheduler_type="cosine",
)

python运行

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

#### 3.5 开始训练

```
trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized_dataset,
    data_collator=DataCollatorForSeq2Seq(tokenizer=tokenizer, padding=True),
)
trainer.train()

python运行

```

训练过程非常快，8846 条数据 3 个 epoch，在 AMD 单卡上大概 8-15 分钟就能跑完。loss 从 2.5 左右降到 0.8 以下就说明模型已经学会了干员知识。

#### 3.6 保存模型

```
trainer.save_model("./output/Qwen3_Arknights_LoRA_final")
tokenizer.save_pretrained("./output/Qwen3_Arknights_LoRA_final")

python运行

```

保存的 LoRA adapter 只有 20MB 左右，可以直接提交到 Git 仓库，不需要 LFS。

### 四、vLLM 部署

#### 4.1 一键部署脚本

项目提供了 `arknights-deploy` 一键部署脚本，自动启动 vLLM 服务：

```
#!/bin/bash
# AMD ROCm 环境变量
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export VLLM_USE_TRITON_FLASH_ATTN=0
export VLLM_USE_ROCM_FLASH_ATTN=1

MODEL_PATH="${MODEL_PATH:-./models/Qwen/Qwen3-0___6B}"
LORA_PATH="${LORA_PATH:-./output/Qwen3_Arknights_LoRA_final}"
PORT="${PORT:-8000}"

vllm serve $MODEL_PATH \
    --enable-lora \
    --lora-modules arknights-lora=$LORA_PATH \
    --port $PORT \
    --max-model-len 2048 \
    --reasoning-parser deepseek_r1

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

#### 4.2 启动服务

```
./arknights-deploy
```

脚本会自动检查环境、启动 vLLM、等待服务就绪。启动后可以测试：

```
# 命令行对话
arknights-chat "银灰是什么职业？"

# API 调用
curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "arknights-lora",
        "messages": [{"role": "user", "content": "银灰的技能有哪些？"}],
        "max_tokens": 200
    }'

![](https://csdnimg.cn/release/blogv2/dist/pc/img/runCode/icon-arrowwhite.png)

```

### 五、效果展示

#### 5.1 干员问答

> **问**：银灰是什么职业？  
>  **答**：银灰是近卫干员，六星，属于谢拉格阵营。他的三技能"真银斩"是明日方舟中最强的物理输出技能之一，攻击范围大、伤害高，是经典的"决战技"。

> **问**：能天使的二技能有什么特点？  
>  **答**：能天使的二技能"冲锋模式"是自动开启的技能，开启后攻击力提升，攻击次数增加。特点是技力消耗低、持续时间长，适合日常推图使用。

#### 5.2 角色扮演

> **问**：扮演银灰，说一句任命助理的台词。  
>  **答**：博士，谢拉格的雪山之子银灰，愿为您效劳。不过我希望您明白，我效忠的不是罗德岛，而是我们共同的利益。让我们合作愉快。

#### 5.3 资料查询

> **问**：推荐几个强力的近卫干员。  
>  **答**：近卫干员中比较强力的有：银灰（真银斩决战）、史尔特尔（黄昏高爆发）、玛恩纳（高台近卫）、棘刺（持续输出）。具体选择取决于关卡需求，银灰适合清杂，史尔特尔适合打Boss。

### 六、踩坑经验

#### 坑1：0.6B 模型学习率要大

0.6B 模型容量小，用 4B 模型的学习率（3e-5）训练效果很差，loss 降不下去。提到 5e-4 后 loss 正常下降。经验法则：模型越小，学习率越大。

#### 坑2：角色扮演数据要带语气特征

一开始角色扮演类的数据只是简单的问答，微调后模型回答干员问题时语气很"AI"。后来在数据里加入了干员的语音台词作为 assistant 回复，模型才学会了模仿干员的说话方式。

#### 坑3：vLLM 的 reasoning-parser

Qwen3 默认会输出 `<think>` 标签，vLLM 启动时加 `--reasoning-parser deepseek_r1`，OpenCode 会自动识别为思考过程，不会显示给用户。

#### 坑4：LoRA rank 不是越大越好

0.6B 模型用 r=16 容易过拟合（训练集 loss 很低但测试集效果差），降到 r=8 后泛化性更好。小模型用小 rank，大模型用大 rank。

### 七、总结

这个项目验证了 0.6B 级别的小模型在垂直领域（游戏问答）的可用性。133 个六星干员、8846 条问答数据，8 分钟训练，20MB 的 LoRA adapter，就能做出一个能回答干员问题、查询资料、扮演干员对话的助手。AMD ROCm 生态跑这种小模型微调绰绰有余，性价比极高。

和之前训的 Qwen3-4B 绝区零仪玄助手相比，0.6B 的明日方舟助手更轻量——训练快、部署轻、推理快，适合做垂直领域的问答助手。4B 模型适合做角色扮演（需要更强的语言理解能力），0.6B 适合做知识问答（数据驱动，不需要太强的生成能力）。

后续打算做的事：一是扩展到所有干员（不只是六星），二是加入干员立绘展示，三是做成微信小程序方便手机上用。

---

> **相关仓库**
>
> * 训练脚本 + 部署：https://github.com/RainmeoX/arknights-qwen-assistant
> * 数据集：https://github.com/RainmeoX/arknights-dataset
