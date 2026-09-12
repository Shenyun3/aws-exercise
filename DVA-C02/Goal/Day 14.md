---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 14（09-21）任务清单

**总时长 2 小时** | 主题：模考 2 深度复盘 + CLI / SDK 专项
**结构**：60 分钟复盘 + 50 分钟 CLI/SDK 专项 + 10 分钟整理

---

## 开场（3 分钟）

### 0 准备

- [ ] 打开昨天的待深挖清单
- [ ] **先处理标了"重复错"的题**——同一个考点错第二次，说明 Day 12 的复盘没做到位

---

## 第一部分：模考 2 深度复盘（约 60 分钟）

### 1 重复错的考点优先（20 分钟）

- [ ] 对每一条**在套卷 1 和套卷 2 都错的考点**，追问一层：**为什么第一次复盘没治好？**
  - 是**文档没看懂**？→ 换一个角度：看 FAQ 页或 API Reference
  - 是**没记住**？→ 说明它属于"纯记忆型"，**必须进 Day 17 速记表**，光理解没用
  - 是**理解错了方向**？→ 把自己的错误理解写下来，再写正确理解，两句话并排放着
- [ ] 这类考点**单独抄成一页**，标题写"两次都错"——Day 16 和 Day 17 各看一次

### 2 新错题回文档（30 分钟）

- [ ] 沿用 Day 12 的方法：找文档原句 → 手抄 → 写"考试会怎么问"
- [ ] 今天可以更快，因为大部分服务已经熟悉了，只需要定位到具体那一段
- [ ] **数字类考点直接补进 Day 12 起头的那张数字表**

### 3 四个 domain 的正确率诊断（10 分钟）

- [ ] 把两套的 domain 正确率并排列出来：

```text
                  套卷1    套卷2    权重
Domain 1 开发      __%     __%     32%
Domain 2 安全      __%     __%     26%
Domain 3 部署      __%     __%     24%
Domain 4 排错优化   __%     __%     18%
```

- [ ] **按"权重 × 差距"排优先级**，不是按正确率高低排
  - 例：Domain 1 占 32%，正确率 70% → 提升 10% 能拿 3.2 分
  - 例：Domain 4 占 18%，正确率 55% → 提升 10% 只拿 1.8 分
  - **所以大权重的中等分数，比小权重的低分更值得投入**
- [ ] 决定 Day 16 总复盘时的时间分配

---

## 第二部分：CLI / SDK 专项（约 50 分钟）

### 4 Credential Provider Chain（15 分钟，必背顺序）

- [ ] **背下完整顺序**（从高到低，先找到的先用）：

```text
1. 命令行参数（--profile / --region 等显式传入）
2. 环境变量（AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN）
3. CLI credentials 文件（~/.aws/credentials）
4. CLI config 文件（~/.aws/config）
5. 容器凭证（ECS task role / EKS IRSA）
6. 实例元数据（EC2 instance profile）
```

- [ ] 记住这条关键推论（高频考点）：
  **"EC2 上的应用一直用着某个旧凭证，明明已经给实例配了 role 却不生效"**
  → 因为**环境变量或 `~/.aws/credentials` 里还有硬编码凭证，排在 instance profile 前面**
  → 解法：删掉硬编码凭证，让它落到 instance profile
- [ ] 记住最佳实践：**EC2 用 instance profile，容器用 task role，本地开发用 profile，任何时候都不要硬编码 access key**
- [ ] SDK 的 chain 顺序略有差异但大体一致，考试按上面这个记

### 5 重试、退避与抖动（10 分钟）

- [ ] **指数退避（exponential backoff）**：第 n 次重试等待 `base × 2^n`
- [ ] **抖动（jitter）**：在等待时间上加随机量，**防止大量客户端同步重试造成二次冲击**（"thundering herd"）
- [ ] SDK 的 retry mode：
  - `legacy`（旧默认）
  - **`standard`** —— 统一的重试逻辑，默认 3 次
  - **`adaptive`** —— 带客户端限流，会根据被 throttle 的情况自动降速
- [ ] 记住：**SDK 已经内置重试**，所以题目问"代码没做任何重试处理，还持续报 throttling"时，答案往往是**调整重试配置或降低请求速率/加容量**，而不是"手写一个重试循环"
- [ ] 哪些错误该重试：**5xx 全部**、**429 / ThrottlingException**；**其他 4xx 不该重试**

### 6 分页（10 分钟）

- [ ] 各服务的分页 token 名字不一样，认全：

| 服务 | 分页字段 |
| --- | --- |
| 大多数服务 | `NextToken` |
| S3 `ListObjectsV2` | `ContinuationToken` / `NextContinuationToken` |
| **DynamoDB** | **`LastEvaluatedKey` → `ExclusiveStartKey`** |
| Kinesis | `NextShardIterator` |
| 部分老 API | `Marker` / `NextMarker` |

- [ ] 记住判断信号：**"只拿到了部分结果"→ 一定是分页没处理**
- [ ] SDK 的 **paginator** 自动处理（boto3：`paginator = client.get_paginator('list_objects_v2')`）

### 7 CLI 实用参数与常见考法（15 分钟）

- [ ] **`--query`**（JMESPath）：在客户端过滤输出
  ```bash
  aws ec2 describe-instances \
    --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name}' \
    --output table
  ```
- [ ] **`--output`**：`json` / `text` / `table` / `yaml`
- [ ] **`--filters` vs `--query` 的区别（考点）**：
  - `--filters` 在**服务端**过滤，减少传输
  - `--query` 在**客户端**过滤，数据已经传回来了
  - "减少 API 返回的数据量" → **用 `--filters`**
- [ ] **`--dry-run`**：只检查权限，不真正执行
- [ ] `aws configure --profile xxx`、`--profile` 参数、`AWS_PROFILE` 环境变量
- [ ] 分页相关：`--max-items` / `--page-size` / `--starting-token`
- [ ] 顺手确认几个高频 CLI 命令能认出来（不必背全）：
  - `aws s3 presign`（Day 4）
  - `aws kms generate-data-key`（Day 7）
  - `aws ecr get-login-password`（Day 5/9）
  - `aws codeartifact login`（Day 5）
  - `aws logs tail --follow`（实时看日志，排错常用）
  - `sam local invoke` / `sam deploy`（Day 2）

---

## 收尾（7 分钟）

### 8 更新清单

- [ ] 模糊清单去掉已解决项
- [ ] 数字表补充今天的新数字
- [ ] **"两次都错"那一页**确认已经单独整理好

### 9 明天的准备

- [ ] Day 15 是**全真计时模考**：130 分钟 65 题，目标是 115 分钟做完 + 15 分钟检查
- [ ] 今天早点结束，明天需要一个完整的、不被打断的时段

---

## 完成标准

不查资料能回答：

1. Credential provider chain 的完整顺序（6 层）
2. EC2 配了 instance profile 却用着旧凭证，为什么？
3. 哪些 HTTP 状态码值得重试？哪些不值得？
4. 抖动（jitter）解决的是什么问题？
5. DynamoDB 的分页字段叫什么？（和别的服务不一样）
6. `--filters` 和 `--query` 的区别？"想减少返回数据量"该用哪个？

---

**一句提醒**：CLI/SDK 这块是 DVA 相对 SAA 的**增量考点**，题目模式高度固定——**认出模式就能秒选**。今天投入的 50 分钟，性价比接近 Day 5 的 appspec hooks。明天全真计时，今天务必按时收工休息。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 13]]
- [[Day 15]]
- [[Security & Compliance 安全防护与合规审计]]
- [[Linux]]
