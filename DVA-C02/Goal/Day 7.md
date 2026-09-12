---
tags: [cloud/aws, certification, security]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 7（09-14）任务清单

**总时长 2 小时** | 主题：安全与认证（Domain 2 占 26%，第二大权重）
**基线**：Cognito 是 Level 3 且是**唯一真正"绕"的概念**；KMS / Secrets Manager / STS 是 Level 2（STS 实际已有 IRSA 实践基础）。

> [!tip] 今天的时间分配
> **Cognito 35 分钟 + KMS 30 分钟**是重心。Secrets Manager / Parameter Store 的选型题很直白，10 分钟够。STS 有 IRSA 底子，快速过。

---

## 开场（3 分钟）

### 0 检查 Day 6 遗留

- [ ] EB 六种部署策略的对比表，能凭记忆复述"哪个需要额外实例、哪个有停机"吗
- [ ] `Ref` 和 `GetAtt` 的区别
- [ ] 昨天的"最模糊 3 个点"

---

## 学习部分（约 95 分钟）

### 1 Cognito：User Pool vs Identity Pool（35 分钟，今天的核心）

> [!warning] 坑
> 这是 DVA 最高频的混淆点。分不清这两个，Domain 2 会成片丢分。

- [ ] 先记住这一句话：
  - **User Pool = 认证（Authentication）= "你是谁" → 返回 JWT**
  - **Identity Pool（Federated Identities）= 授权（Authorization）= "你能动哪些 AWS 资源" → 返回临时 AWS 凭证**

- [ ] **User Pool** 细节：
  - 就是一个**用户目录**：注册、登录、改密码、MFA、邮箱/手机验证
  - 支持社交登录联邦（Google / Facebook / Apple）和企业 SAML / OIDC
  - 登录成功返回**三个 token**：
    - **ID Token** —— 包含用户身份信息（claims），给应用识别用户
    - **Access Token** —— 用于访问受保护的 API / User Pool 自身的 API
    - **Refresh Token** —— 用来换新的 ID/Access token（有效期最长）
  - **Lambda Triggers**（考点）：`PreSignUp`、`PostConfirmation`、`PreTokenGeneration`（往 token 里加自定义 claim）、`PostAuthentication` 等
  - **Hosted UI**：托管的登录页，省得自己写
  - 可以直接作为 **API Gateway 的 Cognito Authorizer**（Day 2 提过）

- [ ] **Identity Pool** 细节：
  - 输入：User Pool 的 token，或第三方 IdP 的 token，**或匿名（unauthenticated）身份**
  - 输出：通过 **STS `AssumeRoleWithWebIdentity`** 换来的**临时 AWS 凭证**
  - 可以给 authenticated 和 unauthenticated 分别配不同的 IAM Role
  - **可以按用户细分权限**：IAM policy 里用 `${cognito-identity.amazonaws.com:sub}` 做变量，实现"每个用户只能访问 S3 里自己那个前缀"——**这是多租户数据隔离的标准答案（Skill 2.3.6）**

- [ ] **把完整流程画在纸上**（Day 17 还要再画一次）：

```text
用户 ──登录──> Cognito User Pool
                  │  返回 ID / Access / Refresh Token
                  ▼
             Cognito Identity Pool
                  │  拿 token 去 STS AssumeRoleWithWebIdentity
                  ▼
            临时 AWS 凭证（AccessKeyId / SecretKey / SessionToken）
                  │
                  ▼
        客户端直接调用 S3 / DynamoDB 等 AWS 服务
```

- [ ] 记住判据：
  - 题目只说**"用户登录/注册/MFA"** → 只需要 **User Pool**
  - 题目说**"移动端要直接访问 S3 / DynamoDB"** → 必须有 **Identity Pool**

**自测**："手机 App 用户登录后，需要直接把照片上传到 S3 里属于自己的目录" → 需要哪些组件？policy 里用什么变量？

---

### 2 KMS（30 分钟）

- [ ] **信封加密（Envelope Encryption）全流程**——必须能画出来：

```text
1. 调用 GenerateDataKey
     → KMS 返回：明文数据密钥（Plaintext）+ 密文数据密钥（CiphertextBlob）
2. 用【明文数据密钥】在本地加密大文件
3. 立刻把内存里的明文数据密钥丢掉
4. 把【密文数据密钥】和加密后的文件存在一起

解密时：
5. 把密文数据密钥交给 KMS Decrypt → 拿回明文数据密钥
6. 用它解开文件
```

- [ ] 记住 **为什么需要信封加密**：**KMS 的 `Encrypt` / `Decrypt` API 单次最多只能处理 4 KB**——超过 4 KB 就必须用信封加密。**这是最常考的一条数字。**
- [ ] `GenerateDataKey` vs **`GenerateDataKeyWithoutPlaintext`**：后者只返回密文，适合"现在不加密、以后才用"的场景
- [ ] **Key 类型**：
  - **AWS managed key**（`aws/s3` 这种，自动轮换，不能改 policy）
  - **Customer managed key（CMK）**：可以配 key policy、**可开启自动轮换（每年一次）**、可禁用/计划删除（**7–30 天等待期**）
  - **AWS owned key**、**Imported key material**（导入的密钥**不支持自动轮换**）
- [ ] **权限三件套的关系**（高频）：
  - **Key Policy** —— KMS key 的资源策略，**默认必须有它，IAM policy 才生效**
  - **IAM Policy** —— 给主体授权
  - **Grants** —— 临时的、细粒度的授权（可撤销），适合服务代持权限
- [ ] **跨账号加密（Skill 2.2.6）**：在 key policy 里允许对方账号 → 对方账号的 IAM policy 再授权给具体主体。**两边都要配。**
- [ ] **加密上下文（Encryption Context）**：额外的键值对，参与完整性校验，会写进 CloudTrail —— 加密时给了，解密时必须一样
- [ ] Region 特性：**KMS key 是 region 级的**，不能跨区直接用；跨区要用 **multi-Region key** 或重新加密

**自测**：要加密一个 100 MB 的文件，能直接调 KMS `Encrypt` 吗？为什么？

---

### 3 Secrets Manager vs Parameter Store（10 分钟）

| 维度 | Secrets Manager | SSM Parameter Store |
| --- | --- | --- |
| 费用 | **收费**（按密钥 + API 调用） | **标准参数免费** |
| **自动轮换** | **原生支持**（Lambda 轮换函数） | 不支持（要自己搭） |
| 与 RDS 集成 | **原生集成，一键轮换** | 无 |
| 加密 | KMS | SecureString 用 KMS |
| 大小上限 | 64 KB | 标准 4 KB / 高级 8 KB |
| 层级组织 | 无层级 | **支持 `/app/prod/db/host` 路径层级、版本历史** |
| 典型用途 | 数据库密码、API key | 配置项、环境变量、非敏感参数 |

- [ ] 记住这条一句话判据：**题干出现 "automatic rotation" → Secrets Manager；出现 "cost-effective / no rotation needed" → Parameter Store SecureString**
- [ ] Parameter Store 可以**直接引用** Secrets Manager 的密钥（`/aws/reference/secretsmanager/...`）
- [ ] 回顾 Day 5：**CodeBuild 的环境变量类型 `parameter-store` / `secrets-manager` 就对应这两个服务**

> [!example] 实例
> 个人项目正在做的"配置放哪"决策，直接拿来当案例：DB 密码 → Secrets Manager；API base URL、feature 开关 → Parameter Store（功能开关更进一步可以用 Day 6 的 AppConfig）。

---

### 4 IAM 与 STS（12 分钟，有 IRSA 底子，快速过）

- [ ] **Policy 评估逻辑**：**显式 Deny > 显式 Allow > 默认 Deny**——任何一处 Deny 就结束
- [ ] Identity-based policy vs **Resource-based policy**（S3 bucket policy、KMS key policy、Lambda resource policy、SQS policy）
  - 记住：**跨账号访问通常需要 resource-based policy**
- [ ] **STS API**：
  - `AssumeRole` —— 跨账号 / 切角色，最常用
  - **`AssumeRoleWithWebIdentity`** —— OIDC 联邦（Cognito Identity Pool、EKS IRSA 走的就是这条）
  - `AssumeRoleWithSAML` —— 企业 SAML 联邦
  - `GetSessionToken` —— 配合 MFA
- [ ] **Trust Policy（信任策略）** 决定"谁能扮演这个角色"，与角色的权限策略是两回事——SAA 学 IRSA 时验证 OIDC token 那套就是这个
- [ ] 临时凭证的三件套：`AccessKeyId` + `SecretAccessKey` + **`SessionToken`**（缺 SessionToken 是常见报错原因）
- [ ] **Lambda 的执行角色 vs 资源策略**：执行角色决定"函数能调什么"，资源策略决定"谁能调这个函数"

---

### 5 敏感数据处理与证书（8 分钟）

- [ ] **Lambda 环境变量加密（Skill 2.3.2）**：默认用 AWS 托管 key 加密静态数据；更严格时用 **CMK + "encryption helpers"**，在代码里显式 Decrypt——**这样控制台上也看不到明文**
- [ ] **数据脱敏 / masking（Skill 2.3.5）**：CloudWatch Logs 的 **data protection policy** 可以自动识别并遮蔽日志中的敏感数据（考点：日志里不小心打了信用卡号怎么办）
- [ ] **多租户数据访问（Skill 2.3.6）**：回到第 1 节的 `${cognito-identity.amazonaws.com:sub}`；DynamoDB 侧可用 **leading key 条件**（`dynamodb:LeadingKeys`）限制只能访问自己分区
- [ ] **ACM（Skill 2.2.2）**：公有证书**免费且自动续期**；只能用在 **ELB / CloudFront / API Gateway** 等集成服务上，**不能导出到 EC2 里自己用**
- [ ] **ACM Private CA**：签发内部证书，收费
- [ ] 回顾：**Edge-optimized API Gateway / CloudFront 的证书必须在 us-east-1**

---

## 动手部分（10 分钟，严格不超时）

### 6 微验证：看一眼信封加密的两个字段

- [ ] CLI 跑一次（先建或找一个 CMK）：
  ```bash
  aws kms generate-data-key --key-id alias/your-key --key-spec AES_256
  ```
- [ ] **看清楚返回的两个字段**：`Plaintext`（base64 的明文数据密钥）和 `CiphertextBlob`（密文版本）
- [ ] 理解一句话：**这两个是同一把钥匙的两种形态**——明文的用来干活，密文的用来存
- [ ] 如果还有时间：在控制台打开一个 Lambda 的环境变量页，看一眼"Enable helpers for encryption in transit"这个开关长什么样

**产出**：把抽象的"信封加密"变成两个具体字段

---

## 收尾（5 分钟）

### 7 记录当天最模糊的 3 个点

追加到模糊清单。**Cognito 的流程图如果画不出来，明天早上第一件事就是补画。**

---

## 完成标准

不查资料能回答：

1. User Pool 和 Identity Pool 分别解决什么问题？各返回什么？
2. 为什么加密大文件必须用信封加密？临界值是多少？
3. `GenerateDataKey` 返回的两个字段分别拿来干什么？
4. 什么情况下必须选 Secrets Manager 而不是 Parameter Store？
5. 怎么让每个移动端用户只能访问 S3 里属于自己的前缀？
6. 跨账号使用一个 KMS key，需要在几个地方配权限？

---

**一句提醒**：Domain 2 占 26%，是仅次于开发（32%）的第二大块，而这一天是它唯一的专项日。**今天宁可超时 15 分钟也要把 Cognito 那张流程图画出来**——它同时是 Domain 1（API 认证）和 Domain 2（授权）的交叉考点，回报率最高。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 6]]
- [[Day 8]]
- [[Security & Compliance 安全防护与合规审计]]
- [[JWT 原理与 Hono 实践笔记]]
- [[Organizations 多账号治理与权限边界]]
