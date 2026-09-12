---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 17（09-24）任务清单

**总时长 2 小时（可以更短）** | 主题：速记 + 状态调整
**考试日期：2026-09-25（明天）**

> [!warning] 今天的唯一纪律
> **不碰新题，不学新知识。** 只背固定格式和数字，只看昨天生成的那一页速记表。
> 考前一天做新题，唯一的作用是制造焦虑——遇到没见过的考点已经来不及消化，只会动摇信心。

---

## 第一部分：速记（约 60 分钟）

### 1 格式类默写（20 分钟，最高优先级）

- [ ] **合上速记表**，在纸上默写：
  - `buildspec.yml` 四个 phase
  - `appspec.yml` 三套 hooks（EC2 7 个 / Lambda 2 个 / ECS 5 个）
- [ ] 对答案，**错的地方重写三遍**
- [ ] 20 分钟后再默一次，确认还在

```text
buildspec: install → pre_build → build → post_build

appspec EC2:  ApplicationStop → DownloadBundle* → BeforeInstall → Install*
              → AfterInstall → ApplicationStart → ValidateService
              （* = agent 保留，不可写脚本）
appspec Lambda: BeforeAllowTraffic → AfterAllowTraffic
appspec ECS:  BeforeInstall → AfterInstall → AfterAllowTestTraffic
              → BeforeAllowTraffic → AfterAllowTraffic
```

### 2 公式与数字（15 分钟）

- [ ] **DynamoDB RCU/WCU**，重点确认这三步的顺序：
  1. **先把 item 大小向上取整**（读 → 4 KB 的倍数；写 → 1 KB 的倍数）
  2. 乘以每秒条数
  3. **最终一致读 ÷ 2；事务读 × 2；事务写 × 2**
- [ ] **现场做三道口算题**验证（自己出题，30 秒内出结果）
- [ ] 过一遍数字表：

```text
Lambda      内存 128MB–10240MB / timeout 15min / zip 50MB / 解压 250MB
            / 镜像 10GB / layer 最多 5 层 / 默认账户并发 1000
KMS         Encrypt/Decrypt 单次上限 4KB（超过用信封加密）
SQS         visibility 默认 30s（0–12h）/ long polling 最大 20s
            / 保留最长 14 天 / 单条消息 256KB
Kinesis     写 1MB/s 或 1000 records/s per shard / 读 2MB/s per shard
            / Enhanced Fan-Out 每消费者独享 2MB/s
X-Ray       daemon UDP 2000 / 默认采样 = reservoir 1 + 5% fixed rate
            / annotation 每 trace 最多 50 个
API GW      缓存 TTL 默认 300s（范围 0–3600）
S3          单次 PUT 上限 5GB / 对象上限 5TB / multipart >100MB 建议、>5GB 必须
            / presigned URL 最长 7 天（IAM user 签发）
CodeArtifact  login token 默认 12 小时
CloudTrail    控制台事件历史 90 天
```

### 3 流程图默画（15 分钟）

- [ ] **Cognito**：用户 → User Pool（认证，三个 token）→ Identity Pool（授权）→ STS `AssumeRoleWithWebIdentity` → 临时凭证 → AWS 服务
- [ ] **KMS 信封加密**：`GenerateDataKey` →（明文密钥 + 密文密钥）→ 本地加密 → 丢明文 → 存密文密钥 + 密文数据 → 解密先 `Decrypt`
- [ ] **X-Ray**：annotation **建索引可过滤** / metadata **不建索引**
- [ ] **Credential provider chain**：命令行参数 → 环境变量 → credentials 文件 → config 文件 → 容器凭证 → instance profile

### 4 取舍表默填（10 分钟）

- [ ] **EB 六种部署策略**：空表默填（停机 / 额外实例 / 回滚速度 / 成本）
- [ ] 对着昨天的**判据表**，逐条自问自答（看到 X 关键词 → 选 Y）

---

## 第二部分：应试策略回顾（约 20 分钟）

### 5 考试机制提醒（5 分钟）

- [ ] **65 题 / 130 分钟 / 720 分通过（满分 1000）**
- [ ] **只有 50 题计分，15 题是不计分的 pretest**，且**不标注是哪些**
  - **推论：遇到完全没见过的考点，很可能它根本不算分**。答完标记跳过，不要动摇心态
  - exam guide 明确说了：**AI 辅助开发相关题目属于 pretest，不计分**
- [ ] **Compensatory scoring**：**不需要每个 domain 都过线，只看总分**。单个 domain 崩掉不等于不及格
- [ ] **不倒扣分**：**任何题都不要空着**，不会也要排除后猜一个

### 6 答题节奏（5 分钟）

- [ ] **两轮法**：第一轮会的就做，不会的立刻标记跳过；第二轮回头处理
- [ ] **单题上限 2 分钟**，超时立刻标记
- [ ] **每 20 题看一次时钟**：20 题 ≈ 40 分钟，40 题 ≈ 80 分钟
- [ ] **改答案要克制**：只有能明确说出"我第一次漏读了哪个词"时才改

### 7 审题清单（10 分钟，最后一遍）

- [ ] **读题干时先圈限定词**，再看选项：

| 限定词 | 倾向答案 |
| --- | --- |
| least development effort | 托管服务、内置功能 |
| least operational overhead | serverless、全托管 |
| most cost-effective | 按量付费、缓存、更低层级服务 |
| most secure | 临时凭证、最小权限、加密 |
| minimal latency | 缓存、CDN、Provisioned Concurrency |
| real-time | Kinesis / EventBridge（不是批处理） |
| without changing application code | DAX / AppConfig / alias / 配置层解决 |

- [ ] **切换到开发者视角**（今天最后一次提醒）：
  - 官方明确说：**设计架构、设计 CI/CD pipeline、管理 IAM 用户、管理服务器、设计 VPC 网络，都不在目标考生范围内**
  - **所以：当一个选项在做架构设计时，它多半是干扰项。** DVA 想听的是"改哪个参数、调哪个 API、看哪个日志、用哪个 hook"
- [ ] 提醒自己 SAA 时期的老毛病：**不要被"看起来更全面/更高级"的选项吸引**

---

## 第三部分：考试准备与收工（约 20 分钟）

### 8 后勤检查（10 分钟）

- [ ] **证件**：两份有效证件（其中一份带照片），姓名与报名信息**完全一致**
- [ ] **线下考场**：确认地址、路线、交通时间，**预留提前 30 分钟到场**
- [ ] **线上考试（OnVUE）**：
  - 提前跑一次系统检测（system test）
  - 确认摄像头、麦克风、网络
  - 清空桌面，房间内不能有其他人和纸笔
  - 提前 30 分钟可以开始 check-in
- [ ] 确认考试的**开始时间和时区**
- [ ] 准备好第二天的衣服、水

### 9 收工（10 分钟）

- [ ] **把速记表放在明天出门前能看一眼的地方**——考前 15 分钟只扫 hooks 和数字，不要再看别的
- [ ] **今天到此为止，不要再学。** 剩下的时间做点别的
- [ ] **晚上早睡。** 睡眠对第二天判断力的影响，远大于今晚多背两个数字

> [!tip] 关于状态
> 刚考完 SAA 就连轴转了 17 天，现在的疲劳是真实的。**最后一晚的休息不是"浪费时间"，是考试的一部分**——130 分钟里有大量需要读懂限定词、辨别干扰项的题，这些全靠清醒的注意力，不靠昨晚多背的那两条。

---

## 完成标准

1. 三套 appspec hooks 和 buildspec 四 phase **能默写无误**
2. RCU/WCU 三道口算题**能在 30 秒内出结果**
3. Cognito 流程图、KMS 信封加密流程**能默画**
4. EB 六种部署策略表**能默填**
5. 考试后勤已全部确认
6. **速记表已放好，人已休息**

---

## 考后（留给自己的提醒）

- [ ] 考完当天先休息，不要立刻查答案复盘
- [ ] 无论结果如何，**把这 17 天里整理的模糊清单、数字表、判据表归档到本笔记库**——下一张证书（DevOps Pro / SAP）会直接复用其中大半
- [ ] 有余力的话，把这次备考里"压缩 SAA 重合内容 + 集中攻 Level 3 块"的方法本身记一笔，这套方法比单张证书更值钱

---

**一句提醒**：明天进考场前，只需要相信一件事——**这 17 天里所有"两次都错"的考点都已经被单独拎出来处理过了**。剩下的交给临场。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 16]]
- [[Day 1]]
- [[SAA-C03 考点大纲与核心考查矩阵]]
