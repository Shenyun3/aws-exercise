# Day 1 实验｜看见 Lambda 如何复用代码和临时文件

> 先读：[notes 第 1–2 节](notes.md#fundamentals) · 核心代码：[index.mjs](src/index.mjs)
>
> 主线：AWS Console；CLI、本地演示和版本实验为可选。
>
> 核心操作约 10 分钟，首次创建函数和配置权限的等待另计。可选内容不计入核心时间。

## 0. 这次要看见什么

你已经做过三次连续调用。现在增加一组对照，分清这些现象：

| 观察项 | 想回答的问题 |
| --- | --- |
| `initializationId` | 这次是否还在使用同一份已初始化模块？ |
| `invocationCount` 与 `localCount` | handler 外部变量和内部变量，谁接着增加？ |
| `tmpFileExistedBefore` 与文件内容 | 临时文件是否留下了，是否重新创建了？ |
| `awsRequestId` | 每次调用是不是不同请求？ |
| `appEnv` 与 `functionVersion` | 读的是哪份配置、执行的是哪个版本？ |

初始化 ID 是程序自己生成的随机编号，**不是 AWS 提供的物理环境 ID**。运行时重初始化也会改变它。我们综合编号、计数和日志判断现象，不把一个字段当作所有生命周期情况的证明。

实验会产生 Lambda 调用和日志用量。主线只需要一个普通 Lambda 和基础日志权限，不配置预置并发、VPC、NAT 或数据库。Day 2、Day 8 还要复用函数，今天做完保留它。

## 1. 开始前检查

- 已登录练习用 AWS 账户，知道当前 Region；已有 Day 1 函数就使用同一区域。
- 若函数还在，直接打开 `dva-lab-day1-context`；不要因为重做教程又创建一个同名资源。
- 本实验使用 **Node.js 24.x**、`index.mjs`、Handler `index.handler`。旧教程的 Node.js 20 已被列为弃用运行时。[官方运行时清单](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- 只复制 [src/index.mjs](src/index.mjs)，不需要安装 npm 包。所用模块都是 Node 内置模块。
- 需要创建/更新函数及日志访问权限；创建新的执行角色还需要相应 IAM 权限。若已有角色，确认基础日志权限即可，不必为这个实验添加 S3、DynamoDB 等业务权限。

本地文件用途：

```text
day01-lambda/
  notes.md                  知识讲解、自测和覆盖表
  tutorial.md               本文件
  src/index.mjs             复制到 Lambda 的代码
  events/normal.json        正常调用：{}
  events/reset-tmp.json     只删除本实验缓存再重建
  events/fail.json          主动抛异常
  scripts/run-local.mjs     无 AWS 依赖的本地演示与校验
  terraform/main.tf         可选：把 Console 配置与 IaC 对照
  review.md                 留给你填写的结果和疑问
  changes.md                勘误、改动和验证边界
```

<a id="core-lab"></a>

## 2. 核心实验：三次调用，约 10 分钟

### 步骤 A｜准备函数

**已有函数：** 打开它，确认运行时、Handler 和配置符合下表，继续步骤 B。若此前用 Terraform 管理，优先同步修改本地配置，避免下次 apply 把 Console 改动覆盖；不要再用另一种工具重复创建。

**没有函数：** Lambda → Create function → Author from scratch，按下表创建：

| 设置 | 值 | 原因 |
| --- | --- | --- |
| Function name | `dva-lab-day1-context` | 与后续练习保持一致 |
| Runtime | Node.js 24.x | 当前受支持版本 |
| Architecture | x86_64 | 与辅助 Terraform 一致 |
| Execution role | 新建带 basic Lambda permissions 的角色，或选已有合适角色 | 允许写 CloudWatch Logs |
| Memory | 128 MB | 足够这个小实验 |
| Timeout | 15 秒 | 留出文件操作余量，区别于平台 900 秒上限 |
| Ephemeral storage | 512 MB | 默认临时磁盘已足够 |
| VPC | 不连接你的 VPC | 主线不需要私有资源 |

内存和超时一般在 Configuration → General configuration 中改；Runtime settings 可查看 Handler 和运行时。控制台名称可能随界面调整，以配置含义为准。

### 步骤 B｜部署代码和环境变量

1. 在 Code 页打开 `index.mjs`，用 [src/index.mjs](src/index.mjs) 的完整内容替换。
2. 确认 Handler 为 `index.handler`，点击 **Deploy**，等待更新完成。
3. Configuration → Environment variables → Edit，加入 `APP_ENV = DVA-Test`。保留已有的其他变量。
4. Save，等配置更新完成。AWS 上不需要设置 `DVA_LAB_TMP_DIR`，那只是本地演示用的路径覆盖。

不要在三次核心调用之间改代码、运行时或环境变量，否则可能换环境，观察对象就变了。

### 步骤 C｜创建事件，逐次调用

在 Test 页创建一个 **Private** 测试事件，名字如 `Day01Normal`，内容用 [normal.json](events/normal.json)：

```json
{}
```

点击 Test，**等这次完成**后再点下一次，连续做三次。顺序调用更便于观察复用；不要同时发三次并行请求。

响应外层长这样：

```json
{
  "statusCode": 200,
  "body": "{\"initializationId\":\"...\",\"invocationCount\":1,...}"
}
```

`body` 是 JSON 字符串，所以可能显示反斜杠。为了读清字段，可以看下面的日志；CLI 路径也提供了解码命令。

**以下是同模块复用时的一组示意结果，不是必须出现的固定输出：**

| 字段 | 第一次 | 第二次 | 第三次 |
| --- | --- | --- | --- |
| `initializationId` | 相同编号 A | A | A |
| `invocationCount` | 1 | 2 | 3 |
| `localCount` | 1 | 1 | 1 |
| `tmpFileExistedBefore` | false | true | true |
| `awsRequestId` | 请求 X | 请求 Y | 请求 Z |
| `appEnv` | DVA-Test | DVA-Test | DVA-Test |
| `functionVersion` | $LATEST | $LATEST | $LATEST |

`tmpFileContent.createdByRequestId` 通常仍是第一次创建文件的请求 X。当前请求编号变了，但文件内容没改，说明后续调用读到了留下的文件。

如果出现 `1、1、2`，先对照初始化 ID 和日志流。这可能只是 AWS 使用了不同环境，不能判为实验失败。你只需要找到一组相同初始化 ID 的连续结果，观察变量和文件如何变化；若暂时找不到，记录现象即可，不要花十几分钟强求特定分配。[官方：环境复用](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)

### 步骤 D｜把代码对应到结果

源码按 A–E 标注了位置：

| 代码段 | 执行时机 | 对应结果 |
| --- | --- | --- |
| A：`randomUUID()`、计数器初始化、`INIT` 日志 | 模块加载时 | 同模块复用时编号不变 |
| B：共享计数加一、局部计数从 0 开始 | 每次进入 handler | 共享值累加，局部值总是 1 |
| C：判断文件、首次写入 | 每次调用 | 第一次创建，后续可复用 |
| D：读配置并输出结果 | 每次调用 | 显示当前请求、版本、文件信息 |
| E：按事件主动抛异常 | 仅可选失败事件 | 供对照函数错误与正常返回 |

这里 `tmpFileContent` 是读取文件后解析出来的对象；旧版代码返回字符串，新版这样展示更容易看出是谁创建的文件。

### 步骤 E｜看 CloudWatch Logs

Monitor → View CloudWatch logs，进入 `/aws/lambda/dva-lab-day1-context`。可按响应中的 `logStreamName` 找对应日志流，不必猜最新一条一定属于哪次调用。日志可能延迟出现，刷新即可。

关注两种由代码输出的日志：

```text
{"type":"INIT","initializationId":"A",...}
{"type":"INVOCATION","initializationId":"A","invocationCount":1,...}
{"type":"INVOCATION","initializationId":"A","invocationCount":2,...}
```

- `INIT`：这一份模块初始化了。我们没有叫它 `COLD START`，因为预置并发等场景也会提前初始化，用户不一定在这次请求中等待。
- `INVOCATION`：一次 handler 执行到了结果输出位置。若随后主动抛异常，这条日志也会存在，所以它不等于“最终成功”。
- 平台的 `START` / `END` / `REPORT`：常规文本日志可见请求 ID、版本、时长、内存等。日志格式设为 JSON 时展示方式会不同。

`REPORT` 中的 `Duration` 是执行用时；`Billed Duration` 用于计费，不能总把两者当成相同数字。`Memory Size` 是配置，`Max Memory Used` 是观察到的内存使用信息，不能用几次这个小实验就判断真实业务的最优内存。

**核心实验完成标准：** 在 [review.md](review.md) 记录一组结果，并解释“请求编号变了，初始化编号为什么可能不变”。之后可直接进入 note 自测。

<a id="optional-labs"></a>

## 3. 可选对照，每个约 2–5 分钟

### 对照 A｜删掉文件，计数器也会归零吗

新增私有测试事件，内容用 [reset-tmp.json](events/reset-tmp.json)：

```json
{ "resetTmp": true }
```

它只删除 `/tmp/dva_day01_cache.json`，再走正常创建流程，不会删除 `/tmp` 下的其他文件。

若仍复用刚才模块，可能看到 `invocationCount=4`、`localCount=1`，但 `tmpFileExistedBefore=false`。这是**内存还在、缓存文件被主动删了**。再用 `{}` 调一次，文件应重新存在。

这里的 `Before` 是本次写文件之前；在 reset 请求中，检查发生在删除之后。如果初始化 ID 换了，先记录“模块也变了”，不要据此推断删除文件导致了计数器归零。

### 对照 B｜主动失败和正常返回有什么不同

用 [fail.json](events/fail.json) 创建事件：

```json
{ "fail": true }
```

Test 应显示函数错误，错误消息包含 `Day01IntentionalError`。代码先输出观察结果，再抛异常，所以日志里有 `INVOCATION` 不代表最终成功。

这是**同步 Test 调用**，不会因为你点一次 Test 就自动演示 Lambda 异步重试、DLQ 或 Destinations。这里只观察异常形式，完整规则回看 [note 第 5 节](notes.md#invocation)。不要为了这个对照额外搭队列。

如果把异常换成 `return {statusCode: 500}`，它仍可能是 Lambda 眼中的正常返回。HTTP 状态码和运行时错误要分清。主线源码已经给出解释，不需要实际改代码才能完成今天目标。

### 对照 C｜发布一个版本，再改环境变量

这个实验也为 Day 2 准备一个别名：

1. 确认 `$LATEST` 的 `APP_ENV=DVA-Test`、更新已完成。
2. Versions → Publish new version，记下**实际版本号**，不要假设一定是 1。
3. Aliases → Create alias，名称 `day01-demo`，指向刚发布的数字版本。若同名别名已存在，先查看它原来指向哪里，使用原有练习别名或另取一个未使用名字。
4. 回到 `$LATEST`，把 `APP_ENV` 改成 `DVA-Changed`，保存并等待更新完成。
5. 分别调用 `$LATEST` 和 `day01-demo`。在对应版本/别名页测试，或使用下一节 CLI 的 `--qualifier`。

预期：`$LATEST` 输出 `DVA-Changed`；别名仍输出 `DVA-Test`，并显示刚才的数字 `functionVersion`。这证明版本保存了当时配置。

收尾把 `$LATEST` 的 `APP_ENV` 改回 `DVA-Test`，保留发布版本和别名供 Day 2 使用。不要通过修改全局计数器是否连续来判断版本是否正确，要看 `functionVersion` 和 `appEnv`。[官方：版本](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)

## 4. 可选 CLI：同样的调用，换成命令行

在本日目录执行；不想装工具可跳过，Console 已能完成核心目标。

```bash
cd /Users/bianhanzhang/Desktop/AWS/DVA-C02/Days/day01-lambda
aws --version
aws sts get-caller-identity
```

确认是练习账户。命令默认使用当前凭证配置；如果使用命名 profile，在下面每条 AWS 命令加相同的 `--profile 你的配置名`，不要把 access key 写进代码。

```bash
# 改成函数实际所在区域；这里仅沿用旧实验的示例区域。
dva_region=us-east-1
dva_function=dva-lab-day1-context
mkdir -p outputs

# AWS CLI v2：按原样传入 JSON，不要求你手工做 base64。
aws lambda invoke \
  --region "$dva_region" \
  --function-name "$dva_function" \
  --cli-binary-format raw-in-base64-out \
  --payload file://events/normal.json \
  outputs/response1.json

aws lambda invoke \
  --region "$dva_region" \
  --function-name "$dva_function" \
  --cli-binary-format raw-in-base64-out \
  --payload file://events/normal.json \
  outputs/response2.json

node --input-type=module -e '
import fs from "node:fs";
for (const name of ["response1", "response2"]) {
  const response = JSON.parse(fs.readFileSync(`outputs/${name}.json`, "utf8"));
  console.log(name, response.body ? JSON.parse(response.body) : response);
}'

aws logs tail \
  "/aws/lambda/$dva_function" \
  --region "$dva_region" \
  --since 10m
```

`aws lambda invoke` 终端输出的是调用 API 的信息，文件里才是函数返回值。同步调用时，终端显示 `StatusCode: 200` 也可能带 `FunctionError`，所以要一起检查，不能仅凭 API 请求成功判断函数业务成功。[官方：Invoke API](https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html)

做过版本对照、且已经创建别名后，可以调用它：

```bash
aws lambda invoke \
  --region "$dva_region" \
  --function-name "$dva_function" \
  --qualifier day01-demo \
  --cli-binary-format raw-in-base64-out \
  --payload file://events/normal.json \
  outputs/alias-response.json
```

异步调用会使用 `--invocation-type Event`，接收成功通常返回 202，不能从这条响应拿到最终业务结果。今天只认识这个区别，不必额外发异步失败事件。

## 5. 可选本地演示：不使用 AWS 也能读代码

需要 Node.js 22 或 24，无 npm 依赖。在本日目录运行：

```bash
node scripts/run-local.mjs
```

脚本加载真实的 `src/index.mjs`，用两份独立模块状态和临时目录演示：

1. 模块 A 调三次：共享计数 1、2、3，局部计数始终 1，文件 false、true、true。
2. 只删缓存：计数到 4，文件重新创建。
3. 主动抛异常，再调用一次：本地共享计数到 6，因为失败那次也进入过 handler。
4. 模块 B 首次调用：新初始化编号、计数 1、新文件。

最后显示 `PASS` 并自动清理脚本专用临时目录。脚本不会读取 AWS 凭证、请求 AWS API 或碰你的云上函数。

这里验证的是 **JavaScript 状态和文件操作**。不是 AWS 模拟器，也不证明云上连续请求一定复用；本地出错后继续执行也不能推导 AWS 遇到运行时故障时的重置行为。

## 6. Terraform 辅助对照

看 [terraform/main.tf](terraform/main.tf)，把声明与 Console 选项对应：

| Terraform | Console 含义 |
| --- | --- |
| `aws_iam_role` 的 trust policy | 允许 Lambda 服务扮演该角色 |
| `aws_iam_role_policy_attachment` | 给角色基础日志权限 |
| `archive_file` | 把 `index.mjs` 打成 ZIP |
| `runtime` / `handler` | 语言版本、入口函数 |
| `memory_size` / `timeout` | 内存与超时 |
| `environment.variables` | 环境变量 |
| `source_code_hash` | 源码包变化时让 Terraform 识别更新 |

**已经用 Console 创建的函数，不会自动被 Terraform 接管。** 对同名函数直接 apply 可能冲突。今天推荐读文件；已有 Terraform state 的用户按原方式管理，接管资源需要另做 import 和 plan。

若只想检查文件，装有 Terraform 时可在该目录执行 `terraform fmt -check`、`terraform init -backend=false`、`terraform validate`；init 会下载 provider，但不创建云资源。不要把检查通过当成已经部署成功。

辅助配置把 AWS provider 从 5.x 更新到 6.x。已有旧锁文件时需要 `terraform init -upgrade` 重新解析版本，再检查 plan；不要直接覆盖原有 state 或跳过变更检查。

## 7. 常见现象怎么排查

| 现象 | 先检查 |
| --- | --- |
| `Runtime.HandlerNotFound` / 找不到模块 | 文件名 `index.mjs`、导出名 `handler`、设置 `index.handler`，以及是否 Deploy |
| 输出还是旧字段 | 等更新完成，检查是否在调用旧版本或别名 |
| `appEnv=not-set` | 变量键是否精确为 APP_ENV，是否保存在当前被调用版本 |
| 三次计数没有连续 | 看初始化 ID 和日志流；换环境是允许的 |
| count=1 但文件存在 | 可能重初始化保留了 `/tmp`，不要把磁盘与模块状态混为一谈 |
| `body` 中出现反斜杠 | 它是 JSON 字符串；用上面的解码命令读取 |
| 找不到日志 | Region、日志组、执行角色日志权限、日志投递延迟 |
| `AccessDenied` | 区分调用者的 Invoke 权限和执行角色的写日志权限 |
| 失败日志后没有 DLQ 消息 | 核心实验没配 DLQ，而且 Console Test 是同步调用 |
| 更新报 `ResourceConflictException` | 前一次配置/代码更新可能未完成，待完成再操作 |

## 8. 今天保留什么，什么时候清理

**Day 1 做完先保留：** 函数、执行角色、日志组；做过版本实验则保留版本和 `day01-demo`。Day 2 用于 API Gateway，Day 8 用于 X-Ray。

建议在 CloudWatch 日志组设置 **14 天保留期**，只控制日志保留时间，不会删除函数。可以在 Console 设置，或沿用第 4 节变量：

```bash
aws logs put-retention-policy \
  --region "$dva_region" \
  --log-group-name "/aws/lambda/$dva_function" \
  --retention-in-days 14
```

这次没有启用 Provisioned Concurrency。普通按需函数保留着不会产生预置容量待命费用；已有日志仍占存储，有调用仍按调用用量计费。[官方：Lambda 计费](https://aws.amazon.com/lambda/pricing/)

**所有复用实验结束后再清理：**

1. 先停止或移除后续练习创建的触发器/集成，确认不再使用本函数。
2. 删除本实验 Lambda；Console 要确认目标名称，CLI 对应 `delete-function`。
3. 删除对应 CloudWatch 日志组。
4. 只有确认执行角色由本实验独占、无其他资源使用时，才解除策略并删除该角色。旧 Terraform 角色名是 `newcomer2026-exercise`，不要仅凭名字认定可删除。
5. 若由 Terraform 管理，在原 state 下先查看 `terraform plan -destroy`，确认范围后再 destroy，不混用另一份 state 清理。

删除命令只在后续复用结束、已确认名称时执行：

```bash
# 先重新确认 dva_region / dva_function 是本实验的实际值。
aws lambda delete-function \
  --region "$dva_region" \
  --function-name "$dva_function"

aws logs delete-log-group \
  --region "$dva_region" \
  --log-group-name "/aws/lambda/$dva_function"
```

最后回到 [note 自测](notes.md#self-check)，用自己的话解释实验结果，把最模糊的三个问题写进 [review.md](review.md)。
