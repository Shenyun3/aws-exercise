---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 2(09-09)任务清单

**总时长 2 小时** | 主题:API Gateway + SAM
**你的基线**:API Gateway 是 Level 2(有概念、缺实践),SAM 没单独评但属于 CloudFormation 家族(Level 3)。所以今天前半程可以快,**SAM 那部分要慢**。

---

## 开场(3 分钟)

### 0 检查 Day 1 遗留

- [ ] 昨天记的"最模糊 3 个点",能答上来了吗?答不上的现在花 5 分钟补掉
- [ ] Day 1 的 Lambda 别删,今天 Day 2、Day 8 都要复用它

---

## 学习部分(约 70 分钟)

### 1 REST API vs HTTP API(10 分钟)

- [ ] 记住 **HTTP API 更便宜、延迟更低、功能更少**;REST API 功能全但贵
- [ ] 明确 **HTTP API 不支持的关键功能**:API Keys / Usage Plans、请求验证(request validation)、Mapping Templates、缓存、WAF 集成
- [ ] 反过来说:**题目一旦提到"需要 API Key 限流""需要转换请求格式""需要缓存"→ 只能是 REST API**

**自测**:"需要给不同客户配不同调用配额" → 选哪个?

---

### 2 Stages 与 Stage Variables(10 分钟,高频)

- [ ] Stage 是什么:同一个 API 的不同部署环境(dev / test / prod)
- [ ] **Stage Variables 的核心用途**(Skill 3.4.10):让同一份 API 定义,在不同 stage 指向**不同的 Lambda 版本或 alias**
- [ ] 语法记一下:`${stageVariables.变量名}`
- [ ] 理解它和 Lambda alias 怎么配合(昨天学的 alias 在这里用上了)

**自测**:"同一个 API,dev stage 调 Lambda 的 dev 版本,prod stage 调 prod 版本,怎么实现?"

---

### 3 请求/响应处理链(15 分钟,概念最绕的一块)

- [ ] 搞清楚四个阶段的顺序和各自职责:
  - **Method Request** → 验证、授权、参数校验
  - **Integration Request** → **Mapping Template** 在这里,把请求转成后端要的格式
  - **Integration Response** → 后端返回后,在这里转换
  - **Method Response** → 定义对客户端暴露的状态码和 header
- [ ] Mapping Template 用的是 **VTL(Velocity Template Language)**,知道有这么个东西即可,不用背语法
- [ ] **状态码覆盖(overriding status codes)** 在哪一层做(Skill 1.1.6 点名了这个)
- [ ] 请求验证(request validation):可以在 Method Request 层用 JSON Schema 校验 body

**自测**:"后端 Lambda 返回的 JSON 字段名和前端要求的不一致,不改代码怎么解决?"

---

### 4 Lambda Authorizer:Token vs Request(10 分钟,高频)

- [ ] **Token 型**:只看一个 header(通常是 `Authorization` 里的 Bearer token)
- [ ] **Request 型**:能看 headers、query string、path、stage variables 等**更多上下文**
- [ ] 两者都返回一个 **IAM policy 文档**给 API Gateway,决定放行还是拒绝
- [ ] **授权结果可以被缓存**(TTL 可配),知道这点
- [ ] 和 **Cognito User Pool authorizer** 的区别(Day 7 会细讲 Cognito,今天只需知道这是另一个选项)

**自测**:"授权逻辑需要根据请求路径和来源 IP 判断" → Token 还是 Request 型?

---

### 5 Usage Plans + API Keys(8 分钟)

- [ ] API Key 用来**标识调用方**,Usage Plan 用来**给它配额和速率限制**
- [ ] 两个限制维度:**throttle(速率,rate + burst)** 和 **quota(配额,按天/周/月)**
- [ ] 记住一个重点:**API Key 不是认证机制**,不能拿来做身份验证,只是用来做用量计量和限流
- [ ] 只有 REST API 支持

---

### 6 缓存与失效(7 分钟)

- [ ] 缓存配在 **stage 级别**,可以按 method 覆盖
- [ ] TTL 默认 300 秒,范围 0–3600
- [ ] **客户端主动使缓存失效**:发 `Cache-Control: max-age=0` header,**但调用方必须有 `InvalidateCache` 权限**
- [ ] 缓存 key 可以基于哪些参数(query string / header / path)

---

### 7 CORS(10 分钟,DVA 常考)

- [ ] 理解**预检请求(preflight)**:浏览器在跨域时先发一个 `OPTIONS` 请求
- [ ] 服务端必须返回三个 header:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Headers`
  - `Access-Control-Allow-Methods`
- [ ] 明确一个高频坑:**如果用的是 Lambda proxy integration,CORS header 必须由 Lambda 代码自己返回**,在 API Gateway 控制台点"Enable CORS"只解决 OPTIONS 那一半
- [ ] 顺带记一下 **S3 CORS 和 API Gateway CORS 是两套独立配置**(Day 4 会碰 S3 那边)

**自测**:"前端报 CORS 错误,但控制台已经 Enable CORS 了,为什么?"

---

### 8 自定义域名(5 分钟,Skill 3.4.2)

- [ ] 自定义域名 + base path mapping(把不同的 API 挂到同一个域名的不同路径下)
- [ ] 需要 ACM 证书;**Edge-optimized 类型的证书必须在 us-east-1**(SAA 学过的老知识点,这里复用)
- [ ] 三种 endpoint 类型:Edge-optimized / Regional / Private(SAA 已经过过)

---

## SAM 部分(约 30 分钟,你是 Level 3,慢一点)

### 9 SAM 是什么(10 分钟)

- [ ] 核心认知:**SAM 是 CloudFormation 的扩展**,不是独立的东西
- [ ] 模板顶部必须有:`Transform: AWS::Serverless-2016-10-31`
- [ ] SAM 会把简写的 `AWS::Serverless::*` 资源**展开成完整的 CloudFormation 资源**
- [ ] 认识三个核心资源类型:
  - `AWS::Serverless::Function`
  - `AWS::Serverless::Api`
  - `AWS::Serverless::SimpleTable`

---

### 10 SAM CLI 命令流(10 分钟)

- [ ] 记住顺序和各自作用:
  - `sam init` → 生成脚手架
  - `sam build` → 装依赖、打包
  - `sam local invoke` / `sam local start-api` → **本地测试**(这是 SAM 的杀手锏)
  - `sam package` → 上传 artifact 到 S3
  - `sam deploy` → 部署(`--guided` 首次交互式配置)
- [ ] 知道 `sam deploy` 底层其实是在创建/更新 CloudFormation stack

---

### 11 单元测试与本地测试(10 分钟,Skill 1.1.7)

- [ ] `sam local invoke` 怎么传测试 event(`-e event.json`)
- [ ] `sam local generate-event` 可以生成各种服务的示例 event payload(S3、SQS、API Gateway 等)—— 这个对应 Skill 3.3.1
- [ ] 理解本地测试的边界:**本地能模拟 Lambda 运行时,但不能完全模拟 IAM 权限和真实服务集成**

---

## 动手部分(10 分钟,严格不超时)

### 12 微验证:Stage Variable

- [ ] 用昨天的 Lambda,发布一个版本,建一个 alias
- [ ] 在控制台建一个最简 REST API,集成到这个 Lambda
- [ ] 建一个 stage,配一个 stage variable
- [ ] **在 integration 配置里用 `${stageVariables.xxx}` 引用它**,观察它长什么样

如果时间紧,退而求其次:**只去控制台把 Method Request / Integration Request / Integration Response / Method Response 这四个框点开看一遍**,建立"请求是怎么一层层流过去的"这个空间感。这比什么都不做强。

---

## 收尾(5 分钟)

### 13 记录当天最模糊的 3 个点

追加到你的模糊清单里。

---

## 完成标准

不查资料能回答:

1. 什么情况下**必须**用 REST API 而不能用 HTTP API?(至少说出两个)
2. Stage Variable 最典型的用途是什么?
3. Lambda Authorizer 的 Token 型和 Request 型,区别在哪?
4. 用了 Lambda proxy integration 时,CORS 为什么光在控制台点 Enable 不够?
5. `Transform: AWS::Serverless-2016-10-31` 这行是干什么的?

---

**一句提醒**:今天的 API Gateway 部分你是 Level 2,大概率会比预期快;**省下来的时间全部投给 SAM**,因为 SAM 是通往 Day 6(CloudFormation/CDK,你的 Level 3 重灾区)的桥梁,今天把 SAM 和 CloudFormation 的关系搞清楚,Day 6 会轻松很多。
## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 1]]
- [[API Gateway 和 nginx对比]]
- [[Serverless & Containers 无服务器与容器计算]]
