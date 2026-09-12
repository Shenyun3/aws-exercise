---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 9（09-16）任务清单

**总时长 2 小时** | 主题：CloudWatch + 容器 + Amazon Q Developer + 清库存
**基线**：CloudWatch、ECS/ECR、ElastiCache 都是 Level 2（SAA 打过底，补 DVA 视角即可）；Amazon Q Developer / CloudShell / CodeArtifact / Amplify 是 Level 3 但**都很便宜**，今天顺手清掉。

> [!tip] 今天的定位
> 这是第一阶段的**收尾日**，特点是"面广但每块都浅"。明天 Day 10 是 CI/CD 补强日，之后就进模考阶段。**今天的隐藏任务：确认 Level 3 清单已经全部清零**。

---

## 开场（3 分钟）

### 0 检查 Day 8 遗留

- [ ] X-Ray 三个数字：daemon 端口？默认采样 reservoir 和 rate？
- [ ] Annotation vs Metadata
- [ ] 昨天的"最模糊 3 个点"

---

## 第一部分：CloudWatch（约 35 分钟，Domain 4 主力）

### 1 Metrics 基础（8 分钟）

- [ ] **命名空间（Namespace）+ 指标名 + Dimensions** 三者定位一个指标
- [ ] **Standard resolution（1 分钟）vs High-resolution（1 秒）**——自定义指标可以选高分辨率，**报警最短可到 10 秒**
- [ ] `PutMetricData` API：可以一次发多个数据点；也可以直接发**统计集（StatisticSet）** 减少调用次数
- [ ] **哪些指标默认没有**（高频）：EC2 的**内存使用率**和**磁盘使用率**不是默认指标，**必须装 CloudWatch Agent** 才能采集
- [ ] EC2 基础监控 5 分钟 / 详细监控 1 分钟（要额外付费）

---

### 2 EMF：Embedded Metric Format（8 分钟，Skill 4.1.4 直接点名）

- [ ] 是什么：**把指标以特定 JSON 格式直接写进日志**，CloudWatch 自动从日志里提取成 metric
- [ ] 好处：
  - **不需要单独调 `PutMetricData` API**（Lambda 里同步调 API 会增加执行时长和成本）
  - 指标和产生它的日志上下文**天然关联**
- [ ] 记住格式里的关键字段 `_aws.CloudWatchMetrics`（认识即可，不用背结构）
- [ ] 典型考点："在 Lambda 里发布自定义指标，又不想增加延迟" → **EMF**

> [!tip] 大白话
> 传统做法是"干活的时候顺手打个电话上报数据"（PutMetricData，要等电话接通）；EMF 是"把数据写在日志里，让 CloudWatch 自己去日志里捡"，不占用函数执行时间。

---

### 3 Logs 与告警（12 分钟）

- [ ] 层级：**Log Group → Log Stream → Log Event**；保留期可配（默认永不过期，考点：**改保留期省钱**）
- [ ] **Metric Filter**：从日志里匹配模式（比如 `ERROR`）生成指标 → 再配 Alarm
  - 注意：**metric filter 只对创建之后的日志生效**，不会回溯历史
- [ ] **Subscription Filter**：把日志实时推给 Lambda / Kinesis / Firehose / OpenSearch（做集中式日志分析）
- [ ] **Logs Insights**：查询语法认识几个基本命令即可
  ```text
  fields @timestamp, @message
  | filter @message like /ERROR/
  | stats count() by bin(5m)
  | sort @timestamp desc
  | limit 20
  ```
- [ ] **Alarm 的三种状态**：`OK` / `ALARM` / **`INSUFFICIENT_DATA`**
- [ ] Alarm 关键参数：`Period`、`EvaluationPeriods`、`DatapointsToAlarm`、`TreatMissingData`
- [ ] **Composite Alarm**：多个 alarm 组合，减少告警噪音
- [ ] Alarm 的动作：SNS 通知、Auto Scaling、EC2 动作、**触发 CodeDeploy 回滚**（回顾 Day 5）
- [ ] Lambda 要写日志，执行角色需要 `AWSLambdaBasicExecutionRole`——**"Lambda 没有日志"的第一排查项就是这个权限**

---

### 4 CloudWatch 其他与 CloudTrail 区分（7 分钟）

- [ ] **CloudWatch Agent** 采集 OS 级指标和本地日志文件
- [ ] **Container Insights**（ECS/EKS）、**Lambda Insights**（函数级性能）——知道存在即可
- [ ] **CloudWatch vs CloudTrail 的一句话区分（必考）**：
  - **CloudWatch = 性能与日志（发生了什么、跑得怎么样）**
  - **CloudTrail = API 审计（谁、在什么时候、调用了哪个 API）**
- [ ] CloudTrail：**默认记录 management events**；**data events（S3 对象级、Lambda 调用级）需要显式开启且收费**
- [ ] CloudTrail 事件默认在控制台可查 **90 天**；要长期保留就投递到 S3

---

## 第二部分：容器与缓存（约 40 分钟）

### 5 ECS 核心概念（15 分钟）

- [ ] 层级：**Cluster → Service → Task → Container**；**Task Definition** 是"任务的蓝图"
- [ ] **两种启动类型**：**EC2**（自己管实例）vs **Fargate**（无服务器，不用管实例）
- [ ] **Task Role vs Task Execution Role（极高频，必须分清）**：

| | Task Execution Role | Task Role |
| --- | --- | --- |
| 用途 | **给 ECS agent 用**：拉 ECR 镜像、写 CloudWatch Logs、取 Secrets Manager 里的密钥注入环境变量 | **给容器里的业务代码用**：调 S3 / DynamoDB / SQS 等 AWS API |
| 一句话 | **把容器跑起来需要的权限** | **容器跑起来之后干活需要的权限** |

- [ ] 记住排错映射：
  - **拉不到镜像 / 没有日志** → Task **Execution** Role 的问题
  - **代码里调 S3 报 AccessDenied** → Task Role 的问题
- [ ] **Task Definition 里的资源限制**：
  - `cpu` / `memory` 在 task 级（Fargate 必填，有固定组合）
  - 容器级：**`memory` 是 hard limit（超了容器被杀）**，**`memoryReservation` 是 soft limit（保底）**
- [ ] 网络模式：Fargate 必须 **`awsvpc`**（每个 task 一个 ENI 和私有 IP）；EC2 类型还有 `bridge` / `host`
- [ ] Port mapping：`containerPort` 与 `hostPort`；**动态端口映射**（hostPort 设 0）配合 ALB target group
- [ ] 与 CodeDeploy 的关系（回顾 Day 5）：ECS 蓝绿部署走 CodeDeploy，hooks 是那五个

---

### 6 ECR（8 分钟）

- [ ] 登录命令（要能认出来）：
  ```bash
  aws ecr get-login-password --region ap-northeast-1 \
    | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
  ```
- [ ] 推送三步：`docker build` → `docker tag` → `docker push`
- [ ] **Lifecycle Policy**：自动清理旧镜像（按数量或天数）——"ECR 存储费用太高"的答案
- [ ] **Image Scanning**：basic（推送时扫）/ enhanced（Inspector 持续扫）
- [ ] **Tag immutability**：禁止覆盖同名 tag，保证 `v1.0` 永远指向同一个镜像——CI/CD 里防止"同一个 tag 内容变了"
- [ ] 私有仓库需要 IAM 权限；跨账号靠 **repository policy**

---

### 7 ElastiCache（12 分钟，Skill 4.3.6）

- [ ] **Redis vs Memcached**：

| | Redis | Memcached |
| --- | --- | --- |
| 数据结构 | 丰富（list/set/sorted set/hash） | 只有简单 key-value |
| 持久化 | **支持** | 不支持 |
| 复制与高可用 | **支持（Multi-AZ、自动故障转移）** | 不支持 |
| 多线程 | 单线程（新版有 IO 线程） | **多线程** |
| 备份恢复 | 支持 | 不支持 |
| 场景 | **排行榜、会话、发布订阅、需要高可用** | 纯粹的横向扩展缓存 |

- [ ] **两种缓存策略（必考）**：

| | Lazy Loading（Cache-Aside） | Write-Through |
| --- | --- | --- |
| 写入时机 | **读未命中时才写缓存** | **每次写数据库时同步写缓存** |
| 优点 | 只缓存真正被读的数据，节点故障影响小 | **缓存永远是新的，读几乎不会 miss** |
| 缺点 | **首次读一定 miss（有延迟）**、可能读到过期数据 | 写入延迟高，**缓存里可能有大量从没被读过的数据** |
| 常见搭配 | 配 **TTL** 缓解陈旧问题 | 配 lazy loading 一起用 |

- [ ] 记住判据：**"数据必须最新" → Write-Through；"只缓存热点、节省内存" → Lazy Loading**
- [ ] **Session 存储**是 ElastiCache 在 DVA 里的经典用例（让应用无状态）
- [ ] 回顾对比 **DAX**（Day 3）：DAX 是 DynamoDB 专用、API 兼容、几乎不改代码；ElastiCache 通用但要自己写缓存逻辑

---

## 第三部分：清库存（约 25 分钟）

### 8 Amazon Q Developer（10 分钟，Skill 1.1.11 / 3.3.6）

- [ ] 定位：**AWS 的 AI 编码助手**（前身是 CodeWhisperer），集成在 IDE、控制台、CLI 里
- [ ] 记住它能做什么（考试只考"知不知道"）：
  - **代码生成与补全**（根据注释生成代码）
  - **单元测试生成**（Skill 3.3.6 直接点名）
  - **代码审查与优化建议**
  - **安全扫描（security scan）**：识别代码里的漏洞并给修复建议
  - **参考追踪（reference tracking）**：标出与开源代码相似的建议及其许可证
  - 在控制台里回答 AWS 问题、辅助排错
  - **代码转换 / 升级**（如 Java 版本升级）
- [ ] 记住这个边界：**exam guide 明确说"AI 辅助开发"类题目属于不计分的 pretest**，但 **Amazon Q Developer 本身在计分技能里**——所以只需要认得它能干什么，不必深挖

---

### 9 三个便宜的 Level 3（15 分钟，各 5 分钟）

- [ ] **CloudShell**：
  - **浏览器里的 Linux 终端**，**自带当前控制台用户的凭证**，预装 AWS CLI / Python / Node
  - 有持久化 home 目录（1 GB），免费
  - 考点：**"不想在本地配凭证，临时跑几条 CLI"** → CloudShell
- [ ] **CodeArtifact**（Day 5 已学，这里复习）：
  - 私有制品仓库；**Domain → Repository**；**upstream 代理公共源**；`aws codeartifact login` 拿 12 小时 token
- [ ] **Amplify**：
  - 前端/全栈托管：托管静态站点、CI/CD、后端资源编排
  - **DVA 只需记一条（Skill 3.3.3）：Amplify 的 branch 对应不同环境**——`main` 分支 → prod，`dev` 分支 → dev 环境，每个分支独立部署和 URL
  - 顺带知道 Amplify 常与 Cognito、AppSync 搭配

---

## 收尾（7 分钟）

### 10 Level 3 清单归零检查（关键动作）

- [ ] 拿出 Day 1 记的那份 **Level 3 服务清单（15 个）**，逐个打勾：
  - Amplify / CloudShell / CodeArtifact / Amazon Q Developer / CloudTrail —— 今天清完
  - CodeBuild / CodeDeploy / CodePipeline / CloudFormation / CDK / Elastic Beanstalk / AppConfig —— Day 5、Day 6 覆盖，**明天 Day 10 补强**
  - X-Ray —— Day 8 覆盖
  - Cognito / STS —— Day 7 覆盖
- [ ] **有没有哪个服务到现在还没被任何一天碰过？** 如果有，写进明天 Day 10 的清单

### 11 记录当天最模糊的 3 个点

追加到模糊清单。

---

## 完成标准

不查资料能回答：

1. EC2 的内存使用率为什么默认在 CloudWatch 里看不到？怎么解决？
2. 在 Lambda 里发自定义指标又不想增加执行时长，用什么？
3. CloudWatch 和 CloudTrail 各回答什么问题？
4. 容器拉不到 ECR 镜像，是哪个角色的问题？代码调 S3 被拒是哪个角色的问题？
5. 容器级的 `memory` 和 `memoryReservation` 分别是什么限制？
6. Lazy Loading 和 Write-Through 各自的最大缺点是什么？
7. Amplify 在 DVA 里唯一需要记的点是什么？

---

**一句提醒**：今天覆盖面最广，但每块都是"确认而非新学"。**真正要认真做的是收尾的第 10 项（Level 3 归零检查）**——第一阶段到今天结束，明天补强完就进模考。这时候发现"某个 in-scope 服务从头到尾没碰过"还来得及，进了模考阶段就只能靠错题被动发现了。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 8]]
- [[Day 10]]
- [[CloudWatch 监控与可观测性]]
- [[Serverless & Containers 无服务器与容器计算]]
- [[DynamoDB & ElastiCache NoSQL与极速缓存]]
