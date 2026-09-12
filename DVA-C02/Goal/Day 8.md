---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 8（09-15）任务清单

**总时长 2 小时** | 主题：事件驱动（半天）+ X-Ray（半天）
**基线**：SQS / SNS / Kinesis / Step Functions 全是 Level 2 且 SAA 刚考完，**只有 EventBridge 是真新东西**；**X-Ray 是 Level 3，是今天的重点**。

> [!note] 为什么这么排
> 消息类服务与 SAA 重合度极高，压缩到 50 分钟只补 DVA 视角的参数细节；省下的时间全部给 X-Ray——X-Ray 是 Level 3，不该和 Day 9 的容器（Level 2）挤在一天。

---

## 开场（3 分钟）

### 0 检查 Day 7 遗留

- [ ] **默画一遍 Cognito User Pool → Identity Pool → STS → AWS 资源的流程**
- [ ] 信封加密的 4 KB 临界值
- [ ] 昨天的"最模糊 3 个点"

---

## 上半场：事件驱动（约 50 分钟）

### 1 EventBridge（20 分钟，真正的新内容，Skill 1.1.12）

- [ ] 核心概念：
  - **Event Bus（事件总线）**：`default`（AWS 服务事件）、**custom**（自己的应用事件）、**partner**（SaaS 事件源）
  - **Rule（规则）**：匹配事件并路由到 target
  - **Event Pattern（事件模式）**：**基于 JSON 内容匹配**——这是它和 SNS 最大的区别
  - **Target（目标）**：Lambda / SQS / SNS / Step Functions / ECS task / API Destination 等
- [ ] 认识事件的标准信封字段：`source`、`detail-type`、`detail`、`account`、`region`、`time`
- [ ] 一个最简 event pattern，看懂即可：
  ```json
  {
    "source": ["myapp.orders"],
    "detail-type": ["OrderPlaced"],
    "detail": { "amount": [{ "numeric": [">", 100] }] }
  }
  ```
- [ ] **Schedule**：cron 或 rate 表达式定时触发（**替代过去用 CloudWatch Events 做定时任务**的写法）；现在还有独立的 **EventBridge Scheduler**
- [ ] **Archive & Replay**：归档事件并在之后重放——**"生产出 bug，想用当时的真实事件重跑一遍"的标准答案**
- [ ] **Schema Registry**：从事件自动推断 schema，还能生成代码绑定
- [ ] **API Destination**：把事件发到外部 HTTP 端点（带认证配置）

- [ ] **EventBridge vs SNS 的选择（高频对比）**：

| 维度 | EventBridge | SNS |
| --- | --- | --- |
| 过滤 | **基于事件内容的复杂 pattern 匹配** | subscription filter policy（基于 message attributes，较简单） |
| 事件源 | AWS 服务 / SaaS / 自定义 | 只有你自己发布的消息 |
| 吞吐与延迟 | 略高延迟 | **更低延迟、更高吞吐** |
| 特色功能 | archive & replay、schema registry、schedule | 扇出到大量订阅者、支持短信/邮件 |
| 一句话 | **事件路由与集成** | **简单快速的 fanout** |

**自测**："只想让金额大于 1000 的订单事件触发风控函数，不想在函数里写过滤逻辑" → 选哪个、怎么配？

---

### 2 测试事件驱动应用（8 分钟，Skill 3.2.5）

- [ ] 核心思路：事件驱动的测试难点在于**怎么构造真实的 event payload**
- [ ] **`sam local generate-event`**（Day 2 学过）可以生成 S3 / SQS / SNS / API Gateway / DynamoDB Stream 等各种示例事件
- [ ] EventBridge 控制台有 **Sandbox**，可以直接测试 event pattern 是否匹配某个事件
- [ ] 分层测试思路：**单元测试（直接给 handler 传 event JSON）→ 集成测试（真实发事件）**
- [ ] 记住一个原则：事件投递通常是**至少一次**语义，**消费端必须幂等**

---

### 3 SQS / SNS / Kinesis / Step Functions 快速补差（22 分钟，只补 DVA 视角）

**SQS（8 分钟，DVA 比 SAA 考得细）**

- [ ] **Visibility Timeout**：默认 **30 秒**，范围 0 秒–**12 小时**
  - 消息被取走后其他消费者看不见它；处理超时没删除 → 消息**重新可见，会被重复消费**
  - **`ChangeMessageVisibility` API**：处理时间不够时，**在处理过程中延长**——这是高频考点
  - 经验法则：**visibility timeout 应该 ≥ Lambda 的 timeout（通常设成 6 倍）**
- [ ] **Long polling vs Short polling**：`WaitTimeSeconds`（**最大 20 秒**）；long polling **减少空响应、降低成本**——"减少 API 调用费用"的标准答案
- [ ] **DLQ 与 `maxReceiveCount`**：消息被接收超过这个次数就进死信队列；**DLQ 必须和源队列同类型（标准/FIFO）**
- [ ] **FIFO**：`MessageGroupId`（同组内保序，不同组可并行）、`MessageDeduplicationId`（**5 分钟去重窗口**）
- [ ] 消息保留：默认 4 天，最长 **14 天**；单条消息最大 **256 KB**（更大用 **S3 + Extended Client Library**）
- [ ] Delay Queue（最长 15 分钟）

**SNS（4 分钟）**

- [ ] **Subscription Filter Policy（Skill 4.3.4）**：基于 message attributes 过滤，让订阅者只收自己关心的消息
- [ ] **Fanout 模式**：SNS → 多个 SQS 队列
- [ ] FIFO topic 必须配 FIFO 队列
- [ ] 支持 DLQ（订阅级别）

**Kinesis（5 分钟）**

- [ ] **Data Streams 的分片吞吐（必背数字）**：
  - 写：每 shard **1 MB/s 或 1000 records/s**
  - 读：每 shard **2 MB/s**（经典模式，所有消费者共享）
  - **Enhanced Fan-Out**：每个消费者**独享 2 MB/s**
- [ ] **`ProvisionedThroughputExceededException`** → 加 shard、或改用更分散的 partition key、或退避重试
- [ ] **Partition Key 决定进哪个 shard**，选择不当会造成**热分片**（和 DynamoDB 的热分区一个道理）
- [ ] 保留期：默认 24 小时，可延长到 365 天
- [ ] 区分：**Data Streams（自己管消费、可重放）vs Firehose（全托管、近实时投递到 S3/OpenSearch，不能重放）**

**Step Functions（5 分钟）**

- [ ] **Standard vs Express**：

| | Standard | Express |
| --- | --- | --- |
| 时长上限 | **1 年** | **5 分钟** |
| 执行语义 | Exactly-once | At-least-once |
| 执行历史 | 完整可视化 | 走 CloudWatch Logs |
| 场景 | 长流程、人工审批 | 高频短流程、IoT 事件处理 |

- [ ] 状态类型：`Task` / `Choice` / `Parallel` / `Map` / `Wait` / `Pass` / `Succeed` / `Fail`
- [ ] **`Retry` 与 `Catch`**：`Retry` 配 `IntervalSeconds` / `MaxAttempts` / **`BackoffRate`**（指数退避）；`Catch` 捕获错误跳到兜底状态——**这是"怎么在工作流里做错误处理"的标准答案**
- [ ] 了解 **`.sync` 集成模式**（等待被调用的服务完成）和 **Task Token**（等待外部回调）

**AppSync（快速带过）**

- [ ] 托管 **GraphQL** 服务，支持实时订阅（WebSocket）和离线同步；知道它是 GraphQL 的答案即可

---

## 下半场：X-Ray（约 55 分钟，Level 3，今天的重点）

### 4 X-Ray 是什么与核心数据模型（15 分钟）

- [ ] 定位：**分布式追踪**——回答"这个请求在哪一段慢了 / 在哪一段报错了"
- [ ] 数据层级：
  - **Trace（追踪）** = 一次端到端请求的全部数据
  - **Segment（段）** = 一个服务/组件产生的数据
  - **Subsegment（子段）** = segment 内更细的划分（如一次 DynamoDB 调用、一次 HTTP 外呼）
- [ ] **Trace 靠 `X-Amzn-Trace-Id` header 在服务之间传递**
- [ ] **Service Map（服务地图）**：节点是服务，边是调用关系；**节点颜色/圆环显示错误率与延迟分布**——排错时先看这里定位是哪一跳出问题

---

### 5 Annotations vs Metadata（10 分钟，极高频，必须记死）

| | Annotations | Metadata |
| --- | --- | --- |
| **是否建索引** | **是** | **否** |
| **能否用于过滤/搜索** | **能**（filter expression） | **不能** |
| 数据类型 | 简单键值（string / number / boolean） | 任意 JSON |
| 数量限制 | 每个 trace **最多 50 个** | 无严格限制 |
| 典型用途 | `userId`、`environment`、`orderType` —— 想用来筛 trace 的 | 完整请求体、调试上下文 |

- [ ] 记住一句话：**想拿它当筛选条件 → Annotation；只是附加信息 → Metadata**
- [ ] 记住 API 名字：`put_annotation` / `put_metadata`（Python）、`addAnnotation` / `addMetadata`（Node）

**自测**："要在 X-Ray 控制台按客户 ID 筛出该客户的所有慢请求" → 该用哪个？

---

### 6 Sampling（采样，10 分钟）

- [ ] 为什么要采样：全量追踪成本高、开销大
- [ ] **默认规则**：**每秒第 1 个请求（reservoir = 1）+ 剩余请求的 5%（fixed rate = 5%）**——**这两个数字要背**
- [ ] 两个参数的含义：
  - **Reservoir（保底池）**：每秒**固定采集的条数**，保证低流量时也有数据
  - **Fixed rate（固定比率）**：超出 reservoir 的部分**按百分比采样**
- [ ] **自定义采样规则**可以按 service name、HTTP method、URL path 匹配，并设优先级
- [ ] 采样规则**在 X-Ray 服务端集中配置**，SDK 会拉取——改规则**不需要重新部署应用**（考点）

---

### 7 集成方式（15 分钟）

- [ ] **X-Ray Daemon**：
  - 监听 **UDP 端口 2000** —— **这个数字必考**
  - 作用：接收 SDK 发来的 segment，缓冲后批量上报给 X-Ray API
  - **EC2 / ECS（EC2 启动类型）/ 本地开发需要自己跑 daemon**（ECS 上作为 sidecar container）
- [ ] **Lambda**：勾选 **Active Tracing** 即可，**AWS 自动运行 daemon**，不用自己装
  - 但仍需要在代码里引入 SDK 才能追踪**下游调用的细节**和自定义 annotation
- [ ] **API Gateway**：stage 上开启 X-Ray tracing
- [ ] **Elastic Beanstalk**：`.ebextensions` 里开启，或在控制台勾选
- [ ] **权限（高频排错点）**：
  - 应用侧的角色需要 **`AWSXRayDaemonWriteAccess`**（`PutTraceSegments`、`PutTelemetryRecords`）
  - **"X-Ray 里看不到任何 trace"的排查顺序**：① 是否开了 tracing ② daemon 是否在跑 / 端口是否通 ③ **IAM 权限是否缺失** ④ 采样规则是否把它过滤掉了
- [ ] 了解 SDK 能自动 patch 常见库（boto3、requests、SQL 驱动）产生 subsegment

---

## 动手部分（10 分钟，严格不超时）

### 8 微验证：给 Day 1 的 Lambda 开 Active Tracing

- [ ] 打开 Day 1 建的那个 Lambda → Configuration → Monitoring → **勾选 Active tracing**
- [ ] 连续点 Test 调用 5 次以上（次数少了可能被采样规则过滤掉）
- [ ] 打开 X-Ray（或 CloudWatch → X-Ray traces）：
  - 看 **Service Map** 长什么样
  - 点开一条 trace，看 **segment / subsegment 的时间条**
  - 找一下 **Init duration（冷启动）** 在图上出现在哪里——这条正好呼应 Day 1 的 execution context
- [ ] 如果时间还有余：在函数代码里加一行 `put_annotation`，再调一次，看它出现在 trace 详情的哪个位置

**产出**：亲眼见过 trace 的层级结构，"annotation 出现在哪"从此不再抽象

---

## 收尾（5 分钟）

### 9 记录当天最模糊的 3 个点

追加到模糊清单。

---

## 完成标准

不查资料能回答：

1. EventBridge 和 SNS 在"过滤能力"上的区别是什么？
2. 生产事故后要用当时的真实事件重跑，用什么功能？
3. SQS 处理时间可能超过 visibility timeout，在处理中该调哪个 API？
4. Kinesis 单个 shard 的写入和读取吞吐分别是多少？
5. Step Functions 里做指数退避重试，配哪两个字段？
6. X-Ray daemon 监听哪个端口、什么协议？
7. Annotation 和 Metadata 的核心区别是什么？
8. X-Ray 默认采样规则是什么？

---

**一句提醒**：X-Ray 的三个数字——**UDP 2000、reservoir 1、fixed rate 5%**——和一个区别——**annotation 建索引、metadata 不建**——是今天必须带走的东西。事件驱动那半场如果发现比预期熟，**不要提前收工，把时间挪给 X-Ray 的集成与排错部分**，那块是 Domain 4（18%）的主力考点。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 7]]
- [[Day 9]]
- [[EventBridge & Step Functions 事件总线与工作流]]
- [[SQS & SNS 消息与事件集成]]
- [[03-高吞吐系统设计与消息流选型（Kafka vs SQS）]]
