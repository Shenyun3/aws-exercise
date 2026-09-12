---
tags: [cloud/aws, certification, devops/cicd]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 10（09-17）任务清单

**总时长 2 小时** | 主题：CI/CD 补强日（原弹性休息日）
**性质**：**默写日，不是新学日。** 今天几乎不引入新知识，全部是"合上书写出来，再对答案"。

> [!tip] 先做一个判断（2 分钟）
> 如果 Day 5–7 意外顺利、下面这些一默就出，**那就把今天还给自己休息**。刚考完 SAA 连轴转到现在，这个弹性值得保留，硬塞新内容是负收益。
> 判断方法：先做下面的"5 分钟自检"，全对就休息，错一项就按清单往下走。

---

## 5 分钟自检

不看任何资料，在纸上写出：

- [ ] buildspec 的四个 phase 名字
- [ ] Lambda 平台 appspec 的两个 hook
- [ ] EB 六种部署策略里"需要额外实例"的是哪三个
- [ ] `Ref` 和 `GetAtt` 分别返回什么
- [ ] User Pool 返回什么，Identity Pool 返回什么

**全对 → 今天休息。错任意一项 → 往下做。**

---

## 优先级 A：三套 appspec hooks 默写（20 分钟）

### 1 合上资料，默写三套

- [ ] **EC2 / On-Premises**（7 个，标出哪两个是 agent 保留）
- [ ] **Lambda**（2 个）
- [ ] **ECS**（5 个）

### 2 对照答案核对

```text
EC2/On-prem:
  ApplicationStop → DownloadBundle* → BeforeInstall → Install*
  → AfterInstall → ApplicationStart → ValidateService
  （* = agent 保留，不能写自定义脚本）

Lambda:
  BeforeAllowTraffic → AfterAllowTraffic

ECS:
  BeforeInstall → AfterInstall → AfterAllowTestTraffic
  → BeforeAllowTraffic → AfterAllowTraffic
```

- [ ] 错的地方**用红笔标出来**，Day 17 只看红笔部分
- [ ] 补充确认三条常考细节：
  - Lambda **没有** `ApplicationStop` / `ValidateService`
  - ECS 比 Lambda 多的是 `BeforeInstall` / `AfterInstall` / **`AfterAllowTestTraffic`**
  - `ValidateService` 是 EC2 平台的**最后**一个 hook，用来做部署后健康检查

---

## 优先级 B：buildspec 与 CodeBuild（15 分钟）

### 3 默写 buildspec 骨架

- [ ] 写出四个 phase 的名字和顺序，并各写一句"这一步典型干什么"
- [ ] 写出环境变量的三种类型，以及"数据库密码该用哪一种"
- [ ] 回答：构建太慢有哪三种优化手段？（cache / 更大 compute / 减少 install 步骤）
- [ ] 回答：`artifacts` 段的作用是什么？它和 CodePipeline 的 output artifact 什么关系？

### 4 CodePipeline 排错三问

- [ ] Build 阶段拿不到上一步的产物 → 检查什么？（input/output artifact 名字对不对）
- [ ] pipeline 报权限错误 → 检查什么？（**CodePipeline 的 service role**，以及 artifact bucket 的 KMS 权限）
- [ ] 想在部署到 prod 前加人工确认 → 用什么？（Manual Approval action + SNS）

---

## 优先级 C：Elastic Beanstalk 对比表（20 分钟）

### 5 空表默填

- [ ] **画一张空表**，横轴写六种策略，纵轴写：**停机时间 / 是否需要额外实例 / 回滚速度 / 成本 / 是否混版本**
- [ ] 六种策略：All at once、Rolling、Rolling with additional batch、Immutable、Blue/Green、Traffic splitting
- [ ] 填完再翻 Day 6 核对

### 6 用题干关键词反查（这一步比背表更重要）

对着下面每句话，直接说出答案：

- [ ] "开发环境，成本最低，短暂中断可接受" → **All at once**
- [ ] "不能停机，不能降低处理容量，但预算有限" → **Rolling with additional batch**
- [ ] "不能停机，容量短暂下降可以接受，成本优先" → **Rolling**
- [ ] "要求最快回滚，新旧版本不能混跑" → **Immutable**
- [ ] "要能一键切回旧环境，且旧环境保留一段时间" → **Blue/Green（swap URL）**
- [ ] "先放 10% 流量观察指标，再全量" → **Traffic splitting**

---

## 优先级 D：CloudFormation 与 Cognito（20 分钟）

### 7 CloudFormation 快速默写（10 分钟）

- [ ] 模板里**唯一必需**的段是哪个？
- [ ] 写出五个 intrinsic function 及其用途：`Ref` / `Fn::GetAtt` / `Fn::Sub` / `Fn::ImportValue` / `Fn::FindInMap`
- [ ] 回答场景题：
  - 要拿 RDS 的 endpoint 地址 → `GetAtt`
  - 要在 ARN 字符串里插入参数 → `Sub`
  - 要引用另一个 stack 导出的 VPC ID → `ImportValue`
  - 删 stack 时保留 S3 bucket → `DeletionPolicy: Retain`
  - 更新前想知道会不会替换资源 → **Change Set**
- [ ] 一句话说清 **CloudFormation / SAM / CDK** 三者关系

### 8 Cognito 流程图默画（10 分钟）

- [ ] **合上资料，画出完整链路**：用户 → User Pool →（三个 token）→ Identity Pool → STS → 临时凭证 → AWS 服务
- [ ] 标出：哪一步是**认证**，哪一步是**授权**
- [ ] 写出三个 token 的名字和各自用途
- [ ] 写出"每个用户只能访问 S3 里自己前缀"用的那个 policy 变量

---

## 优先级 E：查漏（15 分钟）

### 9 补 Day 9 收尾时发现的空白

- [ ] 昨天 Level 3 归零检查里，**如果有服务没被任何一天覆盖到，现在补掉**
- [ ] 翻一遍 in-scope 服务清单，任何"完全没印象"的，花 3 分钟查一下它是干什么的即可（不用深入）
  - 特别确认这几个容易被忽略的：**Athena、OpenSearch Service、AppSync、EKS、Route 53、WAF、EFS**
  - 都只需要一句话定位，DVA 对它们考得很浅

---

## 收尾（10 分钟）

### 10 整理模糊清单（关键动作）

第一阶段到今天结束，明天开始模考。**现在把 Day 1–10 累积的所有"模糊 3 个点"合并成一份清单：**

- [ ] 把重复出现的合并
- [ ] 已经解决的划掉
- [ ] **剩下的按"能不能一句话说清"排序**——说不清的排前面
- [ ] 这份清单就是 Day 17 唯一要看的东西，从今天起只增补、不重写

### 11 心态提醒

- [ ] 第一阶段结束。**从明天起做题会错很多，这是正常的**——模考的作用是暴露问题，不是验证水平
- [ ] Day 11 的模考**不要为了分数好看去提前复习**，那会让这套题失去诊断价值

---

## 完成标准

今天没有"新知识"的完成标准，只有一条：

**上面 A–D 四项，每项都能在合上资料的情况下写出来，且错误已经用红笔标注进模糊清单。**

如果做到了这一点，CI/CD 这块最大的空白就算填平了——**它是 Domain 3（24%）的主体，也是你唯一从零开始的一块。**

---

**一句提醒**：今天如果自检全对，**认真地休息，不要愧疚**。剩下 7 天全是高强度的模考和复盘，体力和注意力是消耗品。计划里留这一天，就是为了让它在需要的时候真的能被用掉。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 9]]
- [[Day 11]]
- [[Day 5]]
- [[Day 6]]
- [[CICD实战]]
- [[CloudFormation 基础设施即代码与批量部署]]
