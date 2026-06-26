# 绝区零「仪玄」角色助手：从数据到对话

> 绝区零的仪玄是我最喜欢的角色之一。这篇文章记录我如何整理仪玄的对话数据集，用 LoRA 微调小模型，让她能用仪玄的语气说话。

## 为什么是仪玄

绝区零角色很多，但仪玄的设定最打动我：冷静、理性、带点疏离感，但内心有温度。她的台词风格很独特——短句多、用词精准、偶尔冷幽默。

我想做一个助手，能用仪玄的语气回答问题、聊天、甚至写代码。

## 数据收集

LoRA 微调需要对话数据。我从这些来源整理：

1. **游戏内对话** —— 主线剧情、代理人任务、信赖事件
2. **角色语音** —— 战斗语音、待机语音、互动语音
3. **官方设定集** —— 角色档案、性格描述
4. **同人创作** —— 筛选高质量的仪玄同人对话

最终整理了约 2000 条对话，格式：

```json
{
  "conversations": [
    {"role": "user", "content": "仪玄，今天天气怎么样？"},
    {"role": "assistant", "content": "窗外有答案。何必问我。"}
  ]
}
```

## 数据清洗

原始数据很脏，需要处理：
- 去除重复对话
- 统一标点（全角/半角）
- 过滤过短对话（<5 字）
- 修正错别字
- 添加场景标签（战斗/日常/剧情）

用 Python 脚本批量处理：

```python
import json
import re

def clean_dialog(text):
    # 统一标点
    text = text.replace(',', '，').replace('.', '。')
    # 去除多余空白
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def filter_short(conv):
    return len(conv['content']) >= 5
```

## LoRA 微调

### 模型选择

| 模型 | 大小 | 中文能力 | 显存 |
|---|---|---|---|
| Qwen2.5-0.5B | 0.5B | 好 | 4GB |
| Qwen2.5-1.5B | 1.5B | 很好 | 8GB |
| Gemma-2-2B | 2B | 一般 | 8GB |

最终选 Qwen2.5-1.5B，中文好且显存友好。

### 训练配置

```python
# LoRA 配置
lora_config = {
    "r": 16,
    "alpha": 32,
    "dropout": 0.05,
    "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"]
}

# 训练参数
training_args = {
    "per_device_train_batch_size": 4,
    "gradient_accumulation_steps": 4,
    "num_train_epochs": 3,
    "learning_rate": 2e-4,
    "warmup_ratio": 0.1,
    "lr_scheduler_type": "cosine"
}
```

用 ROCm 在 RX 6700 XT 上训练，约 2 小时完成。

## 效果对比

### 微调前（原版 Qwen2.5-1.5B）

> **用户**：仪玄，今天天气怎么样？
> **模型**：今天天气晴朗，气温25度，适合外出活动。

### 微调后

> **用户**：仪玄，今天天气怎么样？
> **模型**：窗外有答案。何必问我。

### 更多例子

> **用户**：帮我写个 Python 函数
> **模型**：可以。但别指望我解释。自己看。
> ```python
> def solve(data):
>     return [x for x in data if x > 0]
> ```

> **用户**：你觉得我怎么样？
> **模型**：评价需要了解。我不了解你。所以，无可奉告。

## 部署

用 llama.cpp 量化成 GGUF（Q4_K_M，约 900MB），在服务器上跑：

```bash
./llama-server -m yixuan-qwen2.5-1.5b-q4.gguf --port 8080
```

前端用 Vue 3 + Tailwind，部署到 Vercel。

## 反思

1. **数据质量 > 数据量** —— 2000 条精选对话比 20000 条脏数据效果好
2. **角色语气很难学** —— 微调后语气对了，但偶尔还是会"出戏"
3. **小模型够用** —— 1.5B 模型在角色扮演任务上完全够用
4. **LoRA 性价比高** —— 只训练 0.5% 参数，效果却很显著

## 开源

- 数据集：[zzz-yixuan-dataset](https://github.com/RainmeoX/zzz-yixuan-dataset)
- 后端：[zzz-yixuan-assistant](https://github.com/RainmeoX/zzz-yixuan-assistant)
- 前端：[zzz-yixuan-webui](https://github.com/RainmeoX/zzz-yixuan-webui)

如果你也喜欢仪玄，欢迎一起完善数据集！
