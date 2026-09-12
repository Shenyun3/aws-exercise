---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 16（09-23）任务清单

**总时长 2 小时** | 主题：模考 3 复盘 + 三套错题总复盘
**性质**：**收敛日。** 从今天起不再补新知识，只做"把已经错过的全部清干净"。

> [!tip] 今天的判断标准
> 一道错题算不算"搞定了"，唯一标准是：**能一眼说出干扰项错在哪个具体的单词或参数上。**
> 说不出来的，就还没搞定。

---

## 开场（3 分钟）

### 0 准备

- [ ] 摊开三样东西：**模糊清单**、**数字表**、**"两次都错"那一页**
- [ ] 按 Day 14 算出的 **"权重 × 差距"优先级**分配今天的时间

---

## 第一部分：模考 3 复盘（约 40 分钟）

### 1 新错题回文档（25 分钟）

- [ ] 沿用 Day 12 的方法：定位文档 → 抄关键句 → 写"考试会怎么问"
- [ ] 今天速度应该明显快了，大部分能靠已有知识直接判断
- [ ] 数字类的直接补进数字表

### 2 时间问题的针对性处理（15 分钟）

如果昨天第一轮用时超过 115 分钟：

- [ ] 挑 10 道昨天做得慢的题，**重新计时做一遍，目标每题 60 秒**
- [ ] 练一个具体动作：**先扫一眼四个选项，找出明显错的两个划掉，再回头精读题干**
  - DVA 大部分题的两个干扰项是"服务用错"或"功能张冠李戴"，**不用读完题干就能排除**
- [ ] 记住考场节奏参考：**每 20 题检查一次时钟**，20 题应在 40 分钟左右

如果昨天时间充裕：

- [ ] 跳过这一节，把 15 分钟并入第二部分

---

## 第二部分：三套错题总复盘（约 60 分钟，今天的核心）

### 3 把三套错题合并（10 分钟）

- [ ] 把三套的所有错题按**考点**归并（不是按题号），同一个考点错三次就合成一条
- [ ] 按下面三档分类：

| 档 | 定义 | 处理方式 |
| --- | --- | --- |
| **A 档：重复错** | 两套或三套都错 | **今天必须彻底解决**，占今天一半时间 |
| **B 档：错一次但能说清** | 复盘后确实懂了 | 快速扫一遍确认 |
| **C 档：纯记忆型** | 理解没问题，就是记不住（hooks、数字、参数名） | **不在今天解决**，全部转进 Day 17 速记表 |

> [!warning] 关键区分
> **不要把"记不住"当成"不懂"反复重学。** hooks 顺序、RCU 公式、端口号这类，理解一百遍也不会自动记住，它们只能靠 Day 17 的短期强记。今天把它们识别出来并归到 C 档，就是最有效的处理。

### 4 A 档逐条清理（35 分钟）

对每一条重复错的考点：

- [ ] 写下**我当时是怎么想的**（错误的推理路径）
- [ ] 写下**正确的推理路径**
- [ ] **两条并排放着对比**，找出分岔点在哪一步
- [ ] 用一句话总结成一条判据，例如：
  - "看到 `消除冷启动` → Provisioned；看到 `不要影响其他函数` → Reserved"
  - "看到 `多个文件` → Signed Cookie；`单个文件` → Signed URL"
  - "看到 `不改代码` → DAX / AppConfig / alias，不是重写逻辑"
- [ ] 这些一句话判据抄成一张"判据表"，Day 17 要看

### 5 高频易混对照表复查（15 分钟）

把整个备考里最容易混的成对概念过一遍，**每对都要能一句话说清区别**：

- [ ] Reserved Concurrency vs Provisioned Concurrency
- [ ] Lambda Destinations vs DLQ
- [ ] REST API vs HTTP API
- [ ] Lambda Authorizer：Token 型 vs Request 型
- [ ] LSI vs GSI
- [ ] Query vs Scan（以及 FilterExpression 省不省 RCU）
- [ ] DAX vs ElastiCache
- [ ] Lazy Loading vs Write-Through
- [ ] S3 Presigned URL vs CloudFront Signed URL vs Signed Cookie
- [ ] SSE-S3 vs SSE-KMS vs SSE-C
- [ ] **Cognito User Pool vs Identity Pool**
- [ ] Secrets Manager vs Parameter Store vs AppConfig
- [ ] KMS Key Policy vs IAM Policy vs Grants
- [ ] **Task Role vs Task Execution Role**
- [ ] X-Ray Annotations vs Metadata
- [ ] CloudWatch vs CloudTrail
- [ ] EventBridge vs SNS
- [ ] Step Functions Standard vs Express
- [ ] Kinesis Data Streams vs Firehose
- [ ] CloudFormation vs SAM vs CDK
- [ ] EB 六种部署策略之间
- [ ] `Ref` vs `GetAtt`
- [ ] `--filters` vs `--query`

- [ ] **说不清的那几对，用红笔圈出来，Day 17 优先看**

---

## 收尾（15 分钟）

### 6 生成 Day 17 速记表（10 分钟，今天最重要的产出）

明天只看这一份东西，所以今天要把它做好。**一页纸，只放"纯记忆型"内容：**

```text
【格式类】
buildspec 四 phase：install → pre_build → build → post_build
appspec EC2：ApplicationStop → DownloadBundle* → BeforeInstall → Install*
             → AfterInstall → ApplicationStart → ValidateService
appspec Lambda：BeforeAllowTraffic → AfterAllowTraffic
appspec ECS：BeforeInstall → AfterInstall → AfterAllowTestTraffic
             → BeforeAllowTraffic → AfterAllowTraffic

【公式类】
RCU/WCU：先取整（读 4KB / 写 1KB）→ 再算条数 → 最终一致 ÷2、事务 ×2

【流程图类】
Cognito：用户 → User Pool（认证，返回 ID/Access/Refresh token）
              → Identity Pool（授权）→ STS AssumeRoleWithWebIdentity
              → 临时凭证 → AWS 服务
KMS 信封加密：GenerateDataKey → 明文密钥加密数据 → 丢弃明文密钥
              → 存密文密钥 + 密文数据 → 解密时先 Decrypt 拿回明文密钥

【取舍表类】
EB 六种部署策略（停机 / 额外实例 / 回滚速度 / 成本）

【数字类】
（Day 12 起头的数字表，直接并进来）

【判据表类】
（今天第 4 节总结的一句话判据）
```

- [ ] 把上面这些整理到**一页纸**上，明天只看它

### 7 明天的安排确认（5 分钟）

- [ ] 明天 Day 17 是**收敛日，不碰新题**
- [ ] 确认考试相关事项已经准备：证件、考场路线或线上考试环境
- [ ] **今天晚上开始调作息**，别熬夜

---

## 完成标准

1. 模考 3 的错题已回文档
2. 三套错题已按 **A/B/C 三档**归并，A 档已逐条清理
3. **判据表**（一句话判据）已成型
4. **高频易混对照表**已过一遍，说不清的已圈出
5. **Day 17 速记表已生成**（一页纸）

---

**一句提醒**：今天要克制"再做一套题"的冲动。**考前一天半再做新题只会带来新的焦虑，不会带来新的能力**——新题必然会出现没见过的考点，而这时候已经没有时间消化了。今天把已知的问题清干净，明天把记忆型内容压进短期记忆，这是最优路径。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 15]]
- [[Day 17]]
- [[SAA 核心坑点与高频错题]]
- [[SAA 易混淆架构选型对比矩阵]]
