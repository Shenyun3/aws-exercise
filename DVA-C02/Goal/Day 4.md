---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 4（09-11）任务清单

**总时长 2 小时** | 主题：S3 + CloudFront
**基线**：S3 加密体系 SAA 已经很熟，**快速过**；真正要花时间的是 **Presigned URL**、**Multipart Upload 的失败清理**、**S3 CORS**——这三块是 DVA 独有视角，SAA 几乎不考。

> [!warning] 坑
> 原备考计划完全缺了这一天。Presigned URL 是 DVA 出现频率最高的单个知识点之一，不要因为"S3 我很熟"就跳过。

---

## 开场（3 分钟）

### 0 检查 Day 3 遗留

- [ ] RCU/WCU 三道题重算一遍，30 秒内能出结果吗
- [ ] 昨天的"最模糊 3 个点"

---

## 学习部分（约 75 分钟）

### 1 Presigned URL（20 分钟，超高频）

- [ ] 理解本质：**用签发者的凭证，给一个没有 AWS 身份的人，一个限时的、单对象的访问链接**
- [ ] **权限继承自签发者**——签发者没有的权限，URL 也没有（这是最常考的一句话）
- [ ] 生成方式：`aws s3 presign`、SDK 的 `generate_presigned_url`
- [ ] 有效期上限：
  - 用 **IAM user 凭证**签发 → 最长 **7 天**
  - 用 **IAM role / 临时凭证（STS）** 签发 → **不能超过临时凭证本身的有效期**
- [ ] 既能用于**下载（GET）**，也能用于**上传（PUT）**——上传场景很常考："让用户直接传到 S3，不经过我的服务器"
- [ ] 进阶：**presigned POST**（可以限制文件大小、content-type）

**自测**："bucket 是私有的，要让第三方在 1 小时内下载一个文件，不给他 AWS 账号" → 答案与实现方式

---

### 2 Presigned URL vs CloudFront Signed URL / Cookie（10 分钟，选型题）

| 场景 | 选择 |
| --- | --- |
| 单个对象、临时访问、不需要 CDN | **S3 Presigned URL** |
| 需要走 CDN 缓存 / 全球加速 | **CloudFront Signed URL** |
| **多个文件**（整站、整个视频目录）统一授权 | **CloudFront Signed Cookie** |
| 需要限制 IP、日期范围等更细的策略 | CloudFront（custom policy） |

- [ ] 记住这条一句话判据：**"多个文件" → Signed Cookie；"单个文件" → Signed URL**
- [ ] **OAC（Origin Access Control）**：让 S3 只接受来自 CloudFront 的请求（OAI 是旧方案，现在推荐 OAC）

---

### 3 Multipart Upload（10 分钟）

- [ ] 大小规则：**> 100 MB 建议用**，**> 5 GB 必须用**（单次 PUT 上限 5 GB，对象上限 5 TB）
- [ ] 三步 API：`CreateMultipartUpload` → `UploadPart` → `CompleteMultipartUpload`（或 `AbortMultipartUpload`）
- [ ] **失败后未完成的分片会一直占用存储并计费**
- [ ] 解法（高频考点）：**配置 Lifecycle Rule，自动清理 N 天后仍未完成的 multipart upload**
- [ ] 了解 **S3 Transfer Acceleration**（走边缘节点加速跨地域上传），可与 multipart 组合

**自测**："S3 账单里有一部分存储找不到对应对象" → 想到什么

---

### 4 S3 事件通知（8 分钟）

- [ ] 支持的目标：**Lambda / SQS / SNS / EventBridge**
- [ ] 事件类型：`s3:ObjectCreated:*`、`s3:ObjectRemoved:*`、`s3:ObjectRestore:*` 等
- [ ] 可按 **prefix / suffix** 过滤（比如只对 `uploads/` 下的 `.jpg` 触发）
- [ ] **走 EventBridge 的好处**：更丰富的过滤规则、多目标扇出、archive & replay（Day 8 会再碰 EventBridge）
- [ ] 通知是**至少一次（at least once）** 语义，下游要幂等

---

### 5 S3 CORS（8 分钟，DVA 常考）

- [ ] 场景：网页在 `a.com`，用 JS 直接向 `bucket.s3.amazonaws.com` 发请求 → 跨域
- [ ] 配置项：`AllowedOrigins` / `AllowedMethods` / `AllowedHeaders` / `ExposeHeaders` / `MaxAgeSeconds`
- [ ] 明确：**S3 CORS 配置在 bucket 上**，和 Day 2 的 API Gateway CORS 是**两套独立配置**
- [ ] 高频组合题：**前端用 presigned URL 直传 S3，报 CORS 错** → 要在 bucket 上配 CORS，允许 `PUT` 方法

---

### 6 版本控制与生命周期（7 分钟）

- [ ] Versioning 开启后：删除是加 **delete marker**，不是真删；真删要指定 `versionId`
- [ ] **MFA Delete**（知道存在即可）
- [ ] Lifecycle：Transition（转存储类）与 Expiration（过期删除）两类动作
- [ ] 可以对 **noncurrent version** 单独配规则（这条常和 multipart 清理一起考）

---

### 7 加密（7 分钟，SAA 已熟，只做 DVA 视角确认）

| 方式 | 密钥管理 | 关键特征 |
| --- | --- | --- |
| SSE-S3 | AWS 全托管 | 默认，header `AES256` |
| SSE-KMS | 你的 KMS key | 可审计、可控轮换，**受 KMS API 限流影响** |
| SSE-C | 客户提供 | 每次请求都要传密钥，**必须 HTTPS** |
| 客户端加密 | 完全自己 | 数据到 S3 前已是密文 |

- [ ] 记住 SSE-KMS 的坑：**高并发下会撞 KMS 的 request quota** → 用 **S3 Bucket Keys** 降低调用次数
- [ ] 强制加密的两种方式：bucket policy 拒绝没有加密 header 的 PUT，或开启 **default encryption**

---

### 8 CloudFront（5 分钟，DVA 视角）

- [ ] **基于 header / cookie / query string 的缓存**（Skill 4.3.5）：Cache Policy 决定哪些进 cache key
- [ ] 失效：`CreateInvalidation`（临时手段）vs **对象版本化文件名**（推荐做法）
- [ ] 了解 **CloudFront Functions**（轻量、边缘、header 改写）vs **Lambda@Edge**（更强、能访问外部）

---

## 动手部分（10 分钟，严格不超时）

### 9 微验证：Presigned URL 的时效

- [ ] 建一个私有 bucket，传一个小文件
- [ ] 浏览器直接访问对象 URL → 确认 **403 AccessDenied**
- [ ] CLI 生成短有效期的 presigned URL：
  ```bash
  aws s3 presign s3://your-bucket/test.txt --expires-in 60
  ```
- [ ] 立刻用浏览器打开 → 能下载
- [ ] **等 60 秒后再打开** → 看报错内容（`Request has expired`）

**产出**：亲眼确认"权限来自签名而非对象 ACL"，以及过期后的具体报错

---

## 收尾（5 分钟）

### 10 记录当天最模糊的 3 个点

追加到模糊清单。

---

## 完成标准

不查资料能回答：

1. Presigned URL 的权限从哪来？用 role 签发时有效期受什么限制？
2. 要给用户一次性授权访问**一整个目录**的视频文件，选什么？
3. Multipart upload 失败后怎么避免持续计费？
4. 前端 presigned URL 直传 S3 报 CORS 错，改哪里？
5. SSE-KMS 在高并发下的已知问题和解法是什么？

---

**一句提醒**：今天大部分内容 SAA 打过底，节奏会比 Day 3 轻。**省下来的时间不要提前收工，投给 Presigned URL 的上传场景**——DVA 特别喜欢考"让客户端直传 S3，绕开应用服务器"这个模式，明天开始的 CI/CD 双日会非常吃力，今天多留一点余量。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 3]]
- [[Day 5]]
- [[S3 对象存储与生命周期管理]]
- [[Storage 存储选型全景对比]]
- [[Security & Compliance 安全防护与合规审计]]
