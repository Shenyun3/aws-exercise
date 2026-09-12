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
