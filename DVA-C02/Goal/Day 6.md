---
tags: [cloud/aws, certification, devops/cicd]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 6（09-13）任务清单

**总时长 2 小时** | 主题：Elastic Beanstalk + IaC（CloudFormation / CDK / AppConfig）
**基线**：Elastic Beanstalk、CloudFormation、CDK、AppConfig **全部 Level 3**。但昨天 SAM 那部分已经给 CloudFormation 铺了底（`Transform` 那行），今天不是从零开始。

> [!tip] 今天的性价比排序
> **EB 六种部署策略 > CloudFormation intrinsic functions > AppConfig > CDK**。
> EB 的部署策略是"送分题重灾区"——纯记忆、题干直白、几乎每套模考都有。时间不够就砍 CDK（只要知道它是"用代码生成 CloudFormation"就够了）。

---

## 开场（3 分钟）

### 0 检查 Day 5 遗留

- [ ] **默写三套 appspec hooks**（EC2 / Lambda / ECS），对着昨天的纸核对
- [ ] 默写 buildspec 四个 phase
- [ ] 错的地方现在改，别攒到 Day 10

---

## 第一部分：Elastic Beanstalk（约 40 分钟）

### 1 EB 是什么（8 分钟）

- [ ] 一句话定位：**PaaS，你只管上传代码，它自动创建 EC2 / ASG / ELB / 安全组等底层资源**
- [ ] 三层概念：**Application（应用）→ Environment（环境，dev/prod 各一个）→ Application Version（版本）**
- [ ] 两种环境类型：
  - **Web Server Environment** —— 处理 HTTP 请求，前面挂 ELB
  - **Worker Environment** —— 从 **SQS 队列**拉消息处理，用 **`cron.yaml`** 配置定时任务
- [ ] 关键认知：**EB 底层就是 CloudFormation**，出问题可以去 CloudFormation 控制台看事件

---

### 2 六种部署策略（20 分钟，今天的核心，必背表）

- [ ] **自己画一遍这张表**（不要只是读）：

| 策略 | 停机 | 需要额外实例 | 回滚速度 | 成本 | 一句话特征 |
| --- | --- | --- | --- | --- | --- |
| **All at once** | **有** | 否 | 慢（要重新部署旧版） | 最低 | 最快但会中断，只适合 dev |
| **Rolling** | 无 | 否 | 慢 | 低 | **容量临时下降**，新旧版本共存 |
| **Rolling with additional batch** | 无 | **是** | 慢 | 中 | **容量不下降**，多花一批实例的钱 |
| **Immutable** | 无 | **是（全新一批）** | **快（直接终止新实例）** | 高 | 最安全，新实例在新 ASG 里起 |
| **Blue/Green** | 无 | 是（整套新环境） | **最快（swap 回去）** | 高 | **swap environment URL**，不是 EB 内置动作而是操作方式 |
| **Traffic splitting** | 无 | 是 | 快 | 高 | **canary，按百分比切流并自动监控健康** |

- [ ] 记住三条判据（考试题干的关键词映射）：
  - **"不能有停机 + 不能降容量 + 成本敏感"** → Rolling with additional batch
  - **"最快回滚 / 零风险"** → Immutable 或 Blue/Green
  - **"按比例逐步放流量、自动监控"** → Traffic splitting
- [ ] 注意区分：**Rolling 会同时存在两个版本**；**Immutable 不会混版本**（新实例全起来才切）

**自测**："部署失败后要能在几分钟内回到旧版本，预算充足" → 选哪个？（Immutable / Blue-Green）

---

### 3 EB 配置与运维（12 分钟）

- [ ] **`.ebextensions/`**：放在源码根目录的 **`.config` 文件（YAML/JSON 格式）**，用来定制底层资源
  - 常用段：`option_settings`（改 EB 配置项）、`Resources`（加 CloudFormation 资源）、`packages` / `files` / `commands` / `container_commands`
  - 记住 **`container_commands` 在应用部署之后、启动之前执行**（典型用途：跑数据库 migration）
- [ ] 环境变量：控制台或 `.ebextensions` 设置；**改环境变量会触发环境更新**
- [ ] **EB CLI**：`eb init` / `eb create` / `eb deploy` / `eb status` / `eb logs` / `eb open`
- [ ] RDS 的坑（DVA 也考）：**在 EB 环境里创建的 RDS 会随环境一起被删**；生产环境应该在 EB 之外单独建 RDS，用环境变量注入连接信息
- [ ] Worker 环境的 `cron.yaml` 格式（知道有这个文件、用来配周期任务即可）

---

## 第二部分：CloudFormation（约 40 分钟）

### 4 模板结构（10 分钟）

- [ ] 记住各段的作用，特别是**哪些是必需的**：

| 段 | 必需 | 作用 |
| --- | --- | --- |
| `AWSTemplateFormatVersion` | 否 | 版本声明 |
| `Description` | 否 | 描述 |
| `Metadata` | 否 | 附加信息 |
| `Parameters` | 否 | **部署时传入的输入值** |
| `Mappings` | 否 | **静态查找表**（典型：按 region 查 AMI ID） |
| `Conditions` | 否 | 条件创建资源（如 prod 才建某资源） |
| **`Resources`** | **是（唯一必需段）** | 要创建的资源 |
| `Outputs` | 否 | **输出值，可被其他 stack 引用** |
| `Transform` | 否 | 宏，SAM 就用这个 |

- [ ] 记牢：**只有 `Resources` 是必需的**——这是直接的考点

---

### 5 Intrinsic Functions（15 分钟，高频）

- [ ] 逐个搞清楚**返回什么**：

| 函数 | 作用 | 记忆点 |
| --- | --- | --- |
| `Ref` | 引用 Parameter 的值，或资源的**默认标识**（通常是物理 ID / 名字） | 对 EC2 返回 instance id，对 S3 返回 bucket 名 |
| `Fn::GetAtt` | 取资源的**某个具体属性** | `!GetAtt MyBucket.Arn`、`!GetAtt MyDB.Endpoint.Address` |
| `Fn::Sub` | **字符串内插变量** | `!Sub "arn:aws:s3:::${BucketName}/*"` |
| `Fn::Join` | 拼接字符串 | 老写法，`Sub` 更常用 |
| `Fn::ImportValue` | **引用另一个 stack 的 Output**（需要那边 `Export`） | 跨 stack 的唯一方式 |
| `Fn::FindInMap` | 从 `Mappings` 里查值 | 配合 region → AMI |
| `Fn::If` / `Fn::Equals` | 条件逻辑 | 配合 `Conditions` |
| `Fn::GetAZs` | 取当前 region 的可用区列表 | |

- [ ] 区分 **`Ref` vs `GetAtt`**：要"这个资源本身的标识"用 `Ref`，要"这个资源的某个字段（ARN / Endpoint / DNS）"用 `GetAtt`——**这是最常考的一对**
- [ ] 记住跨 stack 引用的完整链路：**A stack 的 `Outputs` 里写 `Export: Name` → B stack 用 `Fn::ImportValue` 引用**；**被 import 的 export 不能删除或修改**

---

### 6 Stack 生命周期与关键选项（15 分钟）

- [ ] **Change Sets**：先预览"这次更新会改什么、会不会替换资源"，再决定执行——"更新前想知道影响"的标准答案
- [ ] **Drift Detection**：检测实际资源是否被手工改过、与模板不一致
- [ ] **`DeletionPolicy`**：`Delete`（默认）/ **`Retain`**（删 stack 时保留资源）/ `Snapshot`（对 RDS、EBS 等先快照）
  - 高频题："删 stack 时不能丢数据库" → `DeletionPolicy: Retain` 或 `Snapshot`
- [ ] **`UpdateReplacePolicy`**：更新导致资源被替换时的处理（和 DeletionPolicy 成对）
- [ ] **Nested Stacks**：把公共组件（如统一的 ALB 配置）抽出来复用
- [ ] **StackSets**：跨账号、跨区域批量部署同一套 stack
- [ ] **Rollback**：更新失败默认自动回滚；`UPDATE_ROLLBACK_FAILED` 状态需要手动干预（了解即可）
- [ ] 三种资源更新行为：**No interruption / Some interruption / Replacement**——知道有的属性改了会**重建资源**

---

## 第三部分：CDK 与 AppConfig（约 25 分钟）

### 7 CDK（8 分钟，便宜，别多花时间）

- [ ] 一句话：**用 TypeScript / Python 等编程语言写基础设施，`cdk synth` 生成 CloudFormation 模板**
- [ ] 三层概念：**App → Stack → Construct**；Construct 分 L1（直接映射 CFN 资源，`Cfn` 前缀）/ L2（带合理默认值）/ L3（pattern，一整套架构）
- [ ] 命令流：`cdk init` → `cdk synth`（生成模板）→ `cdk bootstrap`（首次，在账号里建 CDK 需要的 S3/角色）→ `cdk deploy` → `cdk diff`
- [ ] 三者关系一句话总结：**CDK → 生成 CloudFormation；SAM → 是 CloudFormation 的 serverless 扩展；两者最终都落到 CloudFormation**

> [!tip] 大白话
> CloudFormation 是汇编，SAM 是给 serverless 用的宏，CDK 是高级语言编译器。三个都产出同一种"机器码"——CloudFormation stack。

---

### 8 AppConfig（12 分钟，Skill 3.1.5 直接点名）

- [ ] 是什么：**Systems Manager 下的配置与功能开关（feature flag）管理服务**——把配置从代码里剥离出来，**改配置不需要重新部署应用**
- [ ] 层级：**Application → Environment → Configuration Profile → Deployment**
- [ ] 配置源可以是：SSM Parameter Store、SSM Document、S3、AppConfig 托管的 hosted configuration
- [ ] **Validators（校验器）**：JSON Schema 或 Lambda，配置在推之前先校验——防止把坏配置推到生产
- [ ] **Deployment Strategy**：按百分比逐步生效（linear / exponential），配 **bake time（观察期）**
- [ ] **自动回滚**：绑定 CloudWatch Alarm，观察期内报警就自动回滚配置
- [ ] 应用侧怎么取：**AppConfig Agent / Lambda extension**，应用轮询本地端点拿最新配置
- [ ] 典型考点："要在不重新部署的前提下开关某个功能，并且能自动回滚" → **AppConfig feature flag + alarm 回滚**

**自测**：AppConfig 和 Parameter Store 的区别是什么？（Parameter Store 是"存值"，AppConfig 多了**校验、渐进式发布、自动回滚**这一整套发布流程）

---

## 收尾（5 分钟）

### 9 记录当天最模糊的 3 个点

追加到模糊清单。

---

## 完成标准

不查资料能回答：

1. EB 六种部署策略里，哪些需要额外实例？哪个有停机？哪个回滚最快？
2. `.ebextensions` 里的 `container_commands` 什么时候执行？
3. CloudFormation 模板里唯一必需的段是哪个？
4. 要拿 RDS 的连接地址，用 `Ref` 还是 `GetAtt`？
5. 删除 stack 时保留数据库，配哪个属性？
6. 想在应用不重启的情况下切换功能开关并支持自动回滚，用什么服务？

---

**一句提醒**：今天和昨天是全备考最重的两天。如果时间不够，**优先保 EB 部署策略表和 `Ref` / `GetAtt` 的区别**，CDK 和 nested stack 可以留到 Day 10。明天是 Domain 2（26%）安全专题，同样很重，**今天不要为了讲完而拖时长到 3 小时**——连续超时会拖垮后面。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 5]]
- [[Day 7]]
- [[Day 10]]
- [[CloudFormation 基础设施即代码与批量部署]]
- [[SSM & Config 系统运维与合规配置]]
- [[EC2 实例体系与购买扩展策略]]
