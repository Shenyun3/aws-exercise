---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-08
updated: 2026-09-08
---
# Day 1(09-08)任务清单

**总时长 2 小时** | 主题:校准 + Lambda 深度

---
### 0 校准动作(20 分钟,一次性)

- [x] 打开已下载的 exam guide,翻到 **In-Scope AWS Services** 那一页
- [x] 对着 45 个服务逐个标记:**熟 / 一般 / 完全没碰过**
- [x] 把标记为"完全没碰过"的服务列出来,对照 17 天计划,确认它们都有对应的日子——**如果有服务没被任何一天覆盖到,现在补进去**
- [x] 记录结果(用你手边任何笔记工具都行),这份清单在 Day 17 还要用

**产出**:一份"我的薄弱服务清单"
## 学习部分(约 1 小时)

### 1 Execution context 重用机制

- [x] 搞清楚 Lambda 函数**handler 外部**的代码什么时候执行、执行几次
- [x] 理解为什么数据库连接、SDK client 应该放在 handler 外部初始化
- [x] 理解 `/tmp` 在同一个 execution environment 内是**可以跨调用复用**的

**自测**:能说出"为什么把 `boto3.client()` 写在 handler 里面是反模式"

---

### 2 内存 / CPU / 性能调优

- [x] 记住内存范围:**128 MB – 10,240 MB**
- [x] 理解 **CPU 是随内存线性分配的**(调内存 = 同时调 CPU)
- [x] 理解一个反直觉的点:**加内存有时候反而更便宜**(因为执行时间缩短,而计费 = 内存 × 时间)
- [x] 了解 Lambda Power Tuning 工具的存在和用途

**自测**:遇到"函数跑得慢,怎么优化且不一定增加成本"这类题,能说出调内存这条路

---

### 3 并发控制:Reserved vs Provisioned

- [x] **Reserved Concurrency**:给某个函数**预留/限制**并发上限,防止它占满账户配额(默认 1000)
- [x] **Provisioned Concurrency**:**预热**执行环境,消除冷启动延迟(要额外付费)
- [x] 记住两者解决的是**完全不同的问题**——一个是配额隔离,一个是延迟优化

**自测**:题目说"某个函数把整个账户的并发吃光了,影响了其他函数" → 选哪个?题目说"用户抱怨首次请求慢" → 选哪个?

---

### 4 Destinations vs DLQ(高频考点)

- [x] **DLQ**:只处理**失败**的事件,只支持 SQS / SNS 两种目标,丢过去的是原始 payload
- [x] **Destinations**:支持 **成功(OnSuccess)和失败(OnFailure)两条路径**,支持 SQS / SNS / Lambda / EventBridge 四种目标,传递的内容包含**更丰富的上下文**(请求、响应、错误信息)
- [x] 记住 AWS 现在**更推荐 Destinations**
- [ ] 明确这两个只对**异步调用**生效

**自测**:"需要在函数成功执行后触发下一步" → DLQ 做不到,只能用 Destinations

---

### 5 Lambda 访问 VPC 内资源(Skill 1.2.1)

- [x] 复习你昨天已经问过的 Hyperplane ENI 机制(这块你有基础,快速过)
- [x] 明确一个关键点:**Lambda 一旦配置进 VPC,就失去了默认的公网出口**——如果它还需要访问互联网,必须走 **NAT Gateway**
- [x] 理解 Lambda 访问 VPC 内 RDS 的典型配置

---

### 6 版本与 Alias(为 Day 5 部署策略打底)

- [ ] `$LATEST` vs 已发布版本(published version)的区别
- [ ] Alias 是什么、指向什么
- [ ] **Alias 可以做加权流量切分**(比如 90% 指向 v1、10% 指向 v2)——这是 Lambda canary 部署的基础
- [ ] 了解 alias 和 CodeDeploy 的 Lambda 部署是怎么配合的(Day 5 会细讲)

---

### 7 其他配置项快速过

- [ ] 环境变量(以及 **加密环境变量** — 对应 Skill 2.3.2,Day 7 会再碰)
- [ ] timeout 上限 **15 分钟**(你已经很熟)
- [ ] Layers 的作用和层数限制(**最多 5 层**)
- [ ] Extensions 是什么(用于监控/安全 agent)
- [ ] 部署包大小限制:zip 上传 **50 MB**,解压后 **250 MB**,容器镜像 **10 GB**

---

## 动手部分(10 分钟,不要超时)

### 8 微验证:Execution context 复用

- [x] 在控制台创建一个最简 Python/Node Lambda
- [x] 在 **handler 外部**声明一个计数器变量,每次调用 +1 并打印
- [x] 往 `/tmp` 写一个文件,同时打印这个文件是否已存在
- [x] **连续点击 Test 三次**,观察 CloudWatch Logs:
  - 计数器是不是累加了?
  - 第二次、第三次调用时 `/tmp` 里的文件还在吗?
- [x] 配一个环境变量,在代码里读出来打印

**产出**:亲眼确认 execution context 确实被复用了 —— 这个体感比看十遍文档管用

---

## 收尾(5 分钟)

### 9 记录当天最模糊的 3 个点

写进你的个人错题本/模糊清单,Day 17 只复习这份清单。

---

## 完成标准

今天结束时,你应该能不查资料回答:

1. 为什么数据库连接要放在 handler 外面?
2. Reserved 和 Provisioned Concurrency 分别解决什么问题?
3. 什么情况下必须用 Destinations 而不能用 DLQ?
4. Lambda 配置进 VPC 之后,想访问外网需要什么?

答不上来的那条,就是明天早上顺手补的内容。
## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 2]]
- [[Serverless & Containers 无服务器与容器计算]]
- [[VPC 虚拟私有云与网络路由]]
