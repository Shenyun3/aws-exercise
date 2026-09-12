---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 12（09-19）任务清单

**总时长 2 小时** | 主题：模考 1 深度复盘
**核心方法**：**每一道错题都回 AWS 官方文档找原句。** 不看题目解析当成结论，解析只用来定位方向。

> [!warning] 为什么必须回文档
> 看解析时的"懂了"是假的——解析把答案摆在面前，你只是**认同**它，不是自己推出来的。回文档找原句是唯一能把"认同"变成"记住"的方式，而且顺带建立了考场上的直觉：**AWS 文档怎么描述这个功能，题干就会怎么问。**

---

## 开场（5 分钟）

### 0 准备

- [ ] 打开昨天的模糊考点清单和错因统计
- [ ] 打开 AWS 官方文档（docs.aws.amazon.com）
- [ ] 按昨天的错因分布决定今天的时间分配：
  - **知识空白最多** → 第 1 节占大头
  - **审题 / 干扰项最多** → 第 2、3 节占大头

---

## 第一部分：回文档（约 60 分钟）

### 1 逐题回原文

- [ ] 对清单上**每一条"知识空白"和"记忆不牢"**，做这三步：
  1. 在官方文档里找到讲这个功能的那一段
  2. **把关键的那一句话抄下来**（抄写，不是复制粘贴——手写会强制你读懂）
  3. 写一句"所以题目会怎么问这个点"

- [ ] 示例格式：

```text
考点：SQS visibility timeout
文档原句：If the message is not deleted before the visibility timeout expires,
          it becomes visible again and can be received by another consumer.
考试怎么问："消息被处理了两次" / "Lambda 处理时间超过了 timeout" → 改 visibility
           timeout 或调 ChangeMessageVisibility
```

- [ ] **优先查这几类文档页**（DVA 出题最爱的位置）：
  - 各服务的 **Quotas / Limits 页**（数字类考点全在这）
  - **Troubleshooting 页**（Domain 4 的题几乎照搬）
  - **Best practices 页**（"which is the recommended way" 类题目）
  - API Reference 里的**参数说明**（DVA 特有的细节考法）

> [!tip] 效率提示
> 如果一道题查了 5 分钟还没找到对应文档，**先跳过并标记**，不要陷进去。整套题里这种题不会超过 2–3 道，Day 14 或 Day 16 再回来处理。

---

## 第二部分：治老毛病（约 40 分钟）

### 2 限定词训练（20 分钟，SAA 时期的老毛病）

DVA 和 SAA 一样，**同一个场景配不同限定词，正确答案完全不同**。这是"明明会但选错"的主因。

- [ ] 把这张表抄在纸上，贴在做题时看得见的地方：

| 限定词 | 真实含义 | 倾向的答案类型 |
| --- | --- | --- |
| **least development effort** | 少写代码 | 托管服务、内置功能，**不是**自己写 Lambda |
| **least operational overhead** | 少运维 | Serverless、全托管，**不是**自建 EC2 方案 |
| **most cost-effective** | 最省钱 | 按量付费、更低层级的服务、缓存 |
| **most secure** | 最安全 | 临时凭证、最小权限、加密、**不是**方便的方案 |
| **minimal latency / fastest** | 最快 | 缓存、CDN、Provisioned Concurrency |
| **highly available / fault tolerant** | 高可用 | 多 AZ、重试、DLQ |
| **real-time** | 实时 | Kinesis / EventBridge，**不是**批处理 |
| **near real-time** | 准实时 | Firehose（有缓冲窗口）也可以 |
| **without changing application code** | 不改代码 | DAX、Parameter Store、AppConfig、alias |

- [ ] 回到昨天所有归类为 **"审题"** 的题，**逐题标出题干里的限定词**——确认自己漏读的是哪个词
- [ ] 总结一句：**你最容易漏读的是哪一类限定词？** 写在纸上

### 3 干扰项分析（20 分钟）

- [ ] 回到所有归类为 **"干扰项"** 的题，对每一道回答：**这个错误选项错在哪个具体的单词或参数上？**
- [ ] DVA 干扰项的常见构造手法，认一下：

| 手法 | 例子 |
| --- | --- |
| **服务对但功能张冠李戴** | "用 Reserved Concurrency 消除冷启动"（应该是 Provisioned） |
| **参数名相似** | `GenerateDataKey` vs `GenerateDataKeyWithoutPlaintext` |
| **顺序错误** | appspec hooks 的顺序被打乱 |
| **看起来更高级/更全面** | 明明用 alias 就够，选项给了一整套 CodeDeploy 蓝绿 |
| **架构师视角陷阱** | 给出漂亮的架构改造，但题目只问"改哪个配置" |

> [!warning] SAA 时期的老毛病
> **被"看起来更全面/更高级"的选项吸引。** DVA 尤其要警惕——官方明确说了"设计架构""设计 CI/CD pipeline"**不在**目标考生范围内，所以**当一个选项在做架构设计时，它多半是干扰项**。DVA 想听的是"改哪个参数、调哪个 API、看哪个日志"。

---

## 第三部分：整理（约 10 分钟）

### 4 更新模糊清单

- [ ] 已经彻底搞懂的 → **划掉**
- [ ] 查了文档但还是绕的 → **保留，并标注"待二次确认"**
- [ ] 新发现的空白 → **补进去**
- [ ] 数字类考点（限额、端口、时长）→ **单独抄到一张"数字表"上**，Day 17 专门背这张

### 5 数字表起个头

今天先把已经确认的数字填进去，后面几天持续补充：

```text
Lambda      内存 128MB–10240MB / timeout 15min / zip 50MB / 解压 250MB / 镜像 10GB / layer 5 层
DynamoDB    强一致读 1RCU=4KB/s / 最终一致 ×2 / 事务 ×2 / 写 1WCU=1KB/s
KMS         Encrypt/Decrypt 上限 4KB
SQS         visibility 默认 30s（0–12h）/ long poll 最大 20s / 保留最长 14 天 / 消息 256KB
Kinesis     写 1MB/s 或 1000 rec/s per shard / 读 2MB/s per shard
X-Ray       daemon UDP 2000 / 默认采样 reservoir 1 + 5%
API GW      缓存 TTL 默认 300s（0–3600）
S3          单次 PUT 上限 5GB / 对象上限 5TB / presigned 最长 7 天（IAM user）
```

---

## 收尾（5 分钟）

### 6 记录

- [ ] 今天彻底解决了几条？还剩几条？
- [ ] 明天 Day 13 做第二套，**做题时特别留意 CLI / SDK 类题目**（明天的观察重点）

---

## 完成标准

1. 模考 1 的**所有错题和蒙对题都回过官方文档**，关键句已手抄
2. **限定词对照表**已抄在纸上，并确认了自己最常漏读的那一类
3. **干扰项手法**能认出至少三种
4. 模糊清单已更新，**数字表已起头**

---

**一句提醒**：今天是整个第二阶段最重要的一天。**第一套模考的复盘质量，决定了后面两套的价值上限**——如果今天只是对了答案就过去，Day 13、Day 15 会重复踩同样的坑，等于白做两套题。宁可只复盘一半的题但复盘到位，也不要 65 题全部走马观花。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 11]]
- [[Day 13]]
- [[SAA 核心坑点与高频错题]]
- [[SAA 易混淆架构选型对比矩阵]]
