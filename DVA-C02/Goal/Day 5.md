---
tags: [cloud/aws, certification, devops/cicd]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 5（09-12）任务清单

**总时长 2 小时** | 主题：CI/CD 三件套 + CodeArtifact（重点日 · CI/CD 双日之一）
**基线**：CodeBuild / CodeDeploy / CodePipeline / CodeArtifact **全部 Level 3**，是整个备考里最大的一块空白。

> [!warning] 坑
> 面对全 Level 3，直觉是"搭一条真实 pipeline 练手"。**不要。** 搭通一条 CI/CD pipeline 连调试带排错能吃掉 34 小时里的 10 小时，而 DVA **根本不考你能不能搭出来**（官方 exam guide 明确写了"设计和创建 CI/CD pipeline"不在目标考生范围内）。
> **正确做法：读配置文件样例 + 背 hooks 顺序。** 在纸上和文档里学，比在控制台里学快十倍。

> [!tip] 减压
> Day 10 已预留为本主题的补强日。今天没吃透是**计划之内**的，不用慌。今天的目标是"建立骨架"，不是"全部记牢"。

---

## 开场（3 分钟）

### 0 检查 Day 4 遗留

- [ ] Presigned URL 的有效期规则还记得吗
- [ ] 昨天的"最模糊 3 个点"

---

## 学习部分（约 80 分钟）

### 1 先建立全局骨架（5 分钟，别跳过这步）

在纸上画出这条链，后面所有细节都往这个骨架上挂：

```text
源码仓库 ──> CodePipeline（编排/串联）
              ├─ Source  阶段：拉代码，产出 artifact
              ├─ Build   阶段：调 CodeBuild，读 buildspec.yml
              ├─ Test    阶段：可选
              └─ Deploy  阶段：调 CodeDeploy / CloudFormation / ECS，读 appspec.yml
                              依赖来自 CodeArtifact（私有制品仓库）
```

- [ ] 记住一句话分工：**CodePipeline 是编排器，CodeBuild 干活（构建），CodeDeploy 干活（部署）**
- [ ] 记住两个配置文件的归属：**`buildspec.yml` 属于 CodeBuild，`appspec.yml` 属于 CodeDeploy**——搞混就全错

---

### 2 CodeBuild 与 buildspec.yml（20 分钟）

- [ ] 背下四个 phase 的**顺序和职责**：
  - `install` —— 装运行时和依赖（这里指定 runtime 版本）
  - `pre_build` —— 构建前的准备（典型：**登录 ECR**、装 npm 包）
  - `build` —— 真正的编译/打包/跑测试
  - `post_build` —— 构建后处理（典型：**推镜像到 ECR**、生成报告）
- [ ] 记住 `buildspec.yml` **默认放在源码根目录**，也可以在项目配置里指定路径或直接内联
- [ ] 认识顶层字段：`version` / `env` / `phases` / `artifacts` / `cache` / `reports`
- [ ] **环境变量的三种类型**（高频）：
  - `variables` —— 明文
  - `parameter-store` —— 从 SSM Parameter Store 取
  - `secrets-manager` —— 从 Secrets Manager 取
  - **考点：凭证绝不写 `variables` 明文**
- [ ] `cache` 的作用：缓存依赖目录到 S3，加速后续构建（"构建太慢怎么优化"的标准答案之一）
- [ ] 其他优化手段：换更大的 compute 类型、用 **local cache**
- [ ] 抄写一份最简样例，逐行看懂：

```yaml
version: 0.2
env:
  parameter-store:
    DB_HOST: /myapp/db/host
  secrets-manager:
    DB_PASS: prod/db:password
phases:
  install:
    runtime-versions:
      nodejs: 20
  pre_build:
    commands:
      - npm ci
      - aws ecr get-login-password | docker login --username AWS --password-stdin $REPO
  build:
    commands:
      - npm run build
      - docker build -t $REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION .
  post_build:
    commands:
      - docker push $REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION
artifacts:
  files:
    - '**/*'
  base-directory: dist
cache:
  paths:
    - 'node_modules/**/*'
```

- [ ] 顺手记一下：构建日志去 **CloudWatch Logs**，也可以存 S3；排错先看这里

**自测**：能默写四个 phase 的名字和顺序

---

### 3 CodeDeploy 与 appspec.yml hooks（30 分钟，今天的核心）

> 这是整个 DVA 记忆量最大、但考频最高的一块，**性价比最好**。

- [ ] 先记住三套平台的 hooks **完全不同**，考试就是靠这个区分：

**EC2 / On-Premises（7 个，含 2 个 agent 保留）**

```text
ApplicationStop
  → DownloadBundle    ← agent 保留，不能写脚本
  → BeforeInstall
  → Install           ← agent 保留，不能写脚本
  → AfterInstall
  → ApplicationStart
  → ValidateService
```

**Lambda（只有 2 个，最容易考）**

```text
BeforeAllowTraffic  →  （切流量）  →  AfterAllowTraffic
```

**ECS（5 个）**

```text
BeforeInstall
  → AfterInstall
  → AfterAllowTestTraffic
  → BeforeAllowTraffic
  → AfterAllowTraffic
```

- [ ] **把这三套抄在纸上，明天早上默写一遍**（Day 10 还要再默写一次）
- [ ] 记住两个"陷阱 hook"：**`DownloadBundle` 和 `Install` 是 agent 保留的**，题目给出"在 Install 阶段执行自定义脚本"的选项就是错的
- [ ] 记住 Lambda 只有两个 hook 这件事本身就是考点——**Lambda 没有 `ApplicationStop`**
- [ ] `appspec.yml` 的位置：**必须在 bundle 根目录**；EC2 用 **YAML**，Lambda/ECS 也用 YAML（JSON 亦可）
- [ ] Lambda 用的 appspec 长这样，看懂即可：

```yaml
version: 0.0
Resources:
  - myFunction:
      Type: AWS::Lambda::Function
      Properties:
        Name: my-function
        Alias: live
        CurrentVersion: "1"
        TargetVersion: "2"
Hooks:
  - BeforeAllowTraffic: validate-before-fn
  - AfterAllowTraffic: validate-after-fn
```

- [ ] **Deployment configurations（部署配置）**，记住哪个平台能用哪些：
  - EC2：`AllAtOnce` / `HalfAtATime` / `OneAtATime` / 自定义百分比
  - Lambda 与 ECS：**`Linear`**（每隔 N 分钟切 X%）、**`Canary`**（先切一小部分，观察后一次切完）、`AllAtOnce`
  - 记住命名规律：`CodeDeployDefault.LambdaLinear10PercentEvery1Minute` —— **10%、每 1 分钟**
- [ ] **回滚机制**（Skill 3.4.8）：
  - 自动回滚触发条件：部署失败、**CloudWatch Alarm 触发**
  - 关键认知：**回滚不是"撤销"，而是重新部署上一个已知正常的版本**
- [ ] EC2 部署的前置条件：目标实例上必须装 **CodeDeploy agent**，且实例要有对应的 IAM 角色和标签/ASG 归属

**自测**：Lambda 部署要在切流量之前跑一个健康检查函数，写在哪个 hook？（`BeforeAllowTraffic`）

---

### 4 CodePipeline（15 分钟）

- [ ] 结构层级：**Pipeline → Stage → Action**；一个 stage 里的 action 可以**并行（同 runOrder）或串行（不同 runOrder）**
- [ ] **Artifact 在 stage 之间通过 S3 传递**（input artifact / output artifact）——这是排错题的关键
- [ ] **手动审批（Manual Approval）** action：可以配 SNS 通知
- [ ] 触发方式：源变更事件（EventBridge，推荐）、轮询、Webhook
- [ ] 常见排错思路（Domain 4 会用）：
  - stage 失败 → 先看该 action 的 **详细错误和 CodeBuild 日志**
  - 权限报错 → 检查 **CodePipeline 的 service role**，以及 artifact bucket 的 KMS 权限
  - "Build 阶段拿不到上一步产物" → 检查 output artifact 名字是否与下游 input artifact 对上

> [!note] 补充
> 官方明确说 **不需要会"设计"pipeline**，只需要**会用**。所以看到复杂的 pipeline 架构题，往"哪个 action、哪个权限、哪个 artifact"这种具体层面想，而不是架构层面。

---

### 5 CodeArtifact（10 分钟，别跳过，in-scope）

- [ ] 是什么：**托管的私有制品仓库**，支持 **npm / pip / Maven / NuGet / Twine** 等
- [ ] 层级：**Domain → Repository → Package**；domain 层做跨仓库去重和统一 KMS 加密
- [ ] **Upstream repository**：可以把公共源（npm 官方源）配成 upstream，本地没有的包自动代理拉取并缓存
- [ ] 认证方式：`aws codeartifact login --tool npm ...` 拿临时 token（**默认 12 小时**）
- [ ] 典型考点：**"如何让 CodeBuild 用公司内部的私有 npm 包"** → CodeArtifact + 在 `pre_build` 里 login

---

## 动手部分（10 分钟，严格不超时）

### 6 微验证：写两个配置文件（不部署）

- [ ] 在本地新建一个文件夹，手写一份最简 `buildspec.yml`（四个 phase 各放一条 `echo`）
- [ ] 手写一份 Lambda 用的 `appspec.yml`
- [ ] **打开 AWS 官方文档的样例页，逐字段对照**，特别确认 hook 名字的大小写和拼写
- [ ] 不要真的去跑 pipeline

**产出**：两份自己写过、并与文档核对过的配置文件。手写过一遍的字段名，比读十遍记得牢。

---

## 收尾（5 分钟）

### 7 记录当天最模糊的 3 个点

追加到模糊清单。**今天大概率会记 3 个以上，全部记下来，Day 10 逐条清。**

---

## 完成标准

今天不要求全部记牢（Day 10 有补强）。但至少要能回答：

1. `buildspec.yml` 和 `appspec.yml` 分别属于哪个服务？
2. buildspec 的四个 phase 顺序是什么？
3. Lambda 平台的 appspec 有哪两个 hook？
4. EC2 平台哪两个 hook 是 agent 保留、不能写脚本的？
5. CodeBuild 里要用数据库密码，环境变量该配成哪种类型？
6. pipeline 的 stage 之间靠什么传递构建产物？

---

**一句提醒**：今天信息密度是全备考最高的一天，**不要追求一次记住**。优先保证第 1 节的"全局骨架"和第 3 节的"三套 hooks 抄在纸上"这两件事完成——骨架在，细节 Day 10 补得回来；骨架不在，后面每个细节都是散的。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 4]]
- [[Day 6]]
- [[Day 10]]
- [[CICD实战]]
- [[Devops & CICD basic]]
- [[Monorepo 架构重构与 GitLab CICD 落地]]
