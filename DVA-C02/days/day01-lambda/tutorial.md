# Day 1 实操教程：Lambda 核心机制 10 分钟微验证

> 模式定位：**AWS Console 为主，AWS CLI + Terraform 为辅**  
> 预计耗时：10 分钟（严控时间，不做繁重配置，以建立控制台肌肉记忆和直观体感为主）  
> 对应考点：Execution Context 复用、`/tmp` 存储持久性、环境变量读取、CloudWatch 日志分析

---

## 一、微验证目标

通过一次轻量动手，亲眼在 CloudWatch 日志中见证：

1. **Handler 外部代码在冷启动时仅执行 1 次**。
2. **热调用时，全局变量在同一个执行环境中跨调用连续递增**。
3. **写入 `/tmp` 目录的文件在后续调用中依然存在且可读写**。
4. **通过配置环境变量动态改变函数输出**。

---

## 二、AWS Console 主流程操作（推荐在浏览器完成）

### 步骤 1：在控制台创建 Lambda 函数

1. 登录 AWS 管理控制台，在上方全局搜索框中输入 `Lambda` 并进入服务页。
2. 确保右上角的 AWS Region 选择为你常用的区域（推荐 `us-east-1` 弗吉尼亚北部）。
3. 点击橙色的 **Create function** 按钮。
4. 基础配置：
   - 方式：选择 **Author from scratch**（从头开始创作）。
   - **Function name**（函数名称）：输入 `dva-lab-day1-context`。
   - **Runtime**（运行时）：选择 `Node.js 20.x`。
   - **Architecture**（架构）：保持默认 `x86_64`。
   - **Change default execution role**（执行角色）：保持默认 _Create a new role with basic Lambda permissions_（会自动在 IAM 创建一个带基础 CloudWatch Logs 写入权限的角色）。
5. 点击页面右下角的 **Create function**，等待 3~5 秒创建完成。

---

### 步骤 2：替换函数代码并部署

1. 页面自动跳转至函数详情页，向下滚动找到 **Code**（代码）标签页。
2. 在内置的代码编辑器中，双击左侧文件列表中的 `index.mjs`。
3. 将编辑区全部代码替换为 [days/day01-lambda/src/index.mjs](days/day01-lambda/src/index.mjs) 中的代码：

   ```javascript
   import fs from "node:fs";
   import path from "node:path";

   // 1. Handler 外部代码：仅在冷启动（Cold Start）阶段执行一次
   let invocationCount = 0;
   const tmpFilePath = path.join("/tmp", "dva_demo_cache.txt");

   console.log("[COLD START] Execution environment initialized.");

   export const handler = async (event, context) => {
     // 2. Handler 内部代码：每次请求均会执行
     invocationCount += 1;

     // 读取环境变量
     const appEnv = process.env.APP_ENV || "undefined";

     // 检查 /tmp 目录文件状态
     const fileExistedBefore = fs.existsSync(tmpFilePath);
     if (!fileExistedBefore) {
       fs.writeFileSync(
         tmpFilePath,
         `Created at call #1 by Request ID: ${context.awsRequestId}`,
       );
     }

     const fileContent = fs.readFileSync(tmpFilePath, "utf-8");

     const result = {
       invocationCount,
       appEnv,
       tmpFileExistedBefore: fileExistedBefore,
       tmpFileContent: fileContent,
       awsRequestId: context.awsRequestId,
     };

     console.log("[INVOCATION RESULT]", JSON.stringify(result));

     return {
       statusCode: 200,
       body: JSON.stringify(result),
     };
   };
   ```

4. **至关重要的一步**：点击编辑器左上方的 **Deploy** 按钮（未点击 Deploy 代码不会更新生效）。

---

### 步骤 3：配置环境变量

1. 点击上方的 **Configuration**（配置）标签页。
2. 在左侧子菜单中选择 **Environment variables**（环境变量）。
3. 点击右侧的 **Edit** 按钮。
4. 点击 **Add environment variable**：
   - **Key**：输入 `APP_ENV`
   - **Value**：输入 `DVA-Test`
5. 点击 **Save**（保存）。

---

### 步骤 4：连续执行测试（验证核心）

1. 切换回 **Test**（测试）标签页。
2. 首次测试时需要保存测试事件：
   - **Event name**：输入 `TestCall`。
   - **Event JSON**：保持默认 `{}` 即可。
   - 点击右上角 **Save**。
3. **开始连击测试**：
   - 快速点击 **Test** 按钮 **3 次**（间隔 1 秒左右，触发热调用执行环境复用）。
4. 展开每次的 **Execution result** 查看返回的 JSON：
   - **第 1 次**：
     - `invocationCount`: `1`
     - `tmpFileExistedBefore`: `false`
     - `appEnv`: `DVA-Test`
   - **第 2 次**：
     - `invocationCount`: `2`（说明全局变量被保留复用！）
     - `tmpFileExistedBefore`: `true`（说明 `/tmp` 下写入的文件跨调用依然存在！）
   - **第 3 次**：
     - `invocationCount`: `3`
     - `tmpFileExistedBefore`: `true`

---

### 步骤 5：在 CloudWatch Logs 审查生命周期行为

1. 点击函数详情页上方的 **Monitor**（监控）标签页。
2. 点击右上方的 **View CloudWatch logs** 按钮，将在新标签页中打开 CloudWatch 页面。
3. 在 Log streams 列表中，点击最顶部最新的那条 Stream。
4. 观察日志输出次序：
   - `[COLD START] Execution environment initialized.` **仅仅打印了 1 次**（在流的最开始）。
   - 紧接着输出了 3 段 `START RequestId: ...`、`[INVOCATION RESULT] ...`、`END RequestId: ...`、`REPORT ...`。
   - 这完全证明了冷启动与热调用的本质差异！

---

## 三、AWS CLI 辅助对照（本地终端验证）

如果你已配置本地 AWS CLI 凭证，可以在本地终端直接体验 CLI 与 Lambda 的交互：

### 1. 同步调用该函数并输出响应

在终端执行以下命令连续调用 2 次：

```bash
# 第一次调用
aws lambda invoke \
  --function-name dva-lab-day1-context \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  response1.json

cat response1.json && echo ""

# 紧接着第二次调用
aws lambda invoke \
  --function-name dva-lab-day1-context \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  response2.json

cat response2.json && echo ""
```

### 2. 通过 CLI 实时拉取最新日志

```bash
aws logs tail /aws/lambda/dva-lab-day1-context --since 10m
```

---

## 四、Terraform 辅助映射（对照 IaC 考点）

在 [days/day01-lambda/terraform/main.tf](days/day01-lambda/terraform/main.tf) 中，我们提供了极简的 Terraform 声明代码。

你可以通过查阅该文件，直观理解控制台里的每个点击操作在 IaC 中对应什么声明：

- **控制台 Execution Role 选项** $\leftrightarrow$ `aws_iam_role` + `aws_iam_role_policy_attachment` (AWSLambdaBasicExecutionRole)
- **控制台 Runtime / Handler / Memory** $\leftrightarrow$ `aws_lambda_function` 属性字段
- **控制台 Environment Variables** $\leftrightarrow$ `environment { variables = { ... } }` 块

---

## 五、资源清理（保持环境整洁）

微验证完成后，养成随手清理实验资源的习惯（避免意外计费）：

### 控制台清理方式

1. 进入 AWS Lambda 控制台 -> 选中 `dva-lab-day1-context`。
2. 点击右上角 **Actions** -> **Delete** -> 确认删除。
3. 进入 AWS CloudWatch 控制台 -> **Log groups** -> 找到 `/aws/lambda/dva-lab-day1-context` -> **Actions** -> **Delete log group**。

### CLI 快速清理命令

```bash
# 删除 Lambda 函数
aws lambda delete-function --function-name dva-lab-day1-context

# 删除 CloudWatch 日志组
aws logs delete-log-group --log-group-name /aws/lambda/dva-lab-day1-context
```
