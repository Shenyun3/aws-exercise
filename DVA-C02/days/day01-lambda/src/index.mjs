import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// A. 模块初始化：普通热调用不会重新执行这一段。
// 这是我们自己生成的“本次模块初始化编号”，不是 AWS 提供的环境 ID。
const initializationId = randomUUID();
const initializedAt = new Date().toISOString();
let invocationCount = 0;

// AWS 上默认使用 /tmp。本地演示用独立临时目录，不读写真实 AWS 资源。
const tmpDir = process.env.DVA_LAB_TMP_DIR ?? "/tmp";
const tmpFilePath = path.join(tmpDir, "dva_day01_cache.json");

// 叫 INIT：预置并发也会提前初始化，不能把每条初始化日志都当成用户遇到的冷启动。
console.log(JSON.stringify({ type: "INIT", initializationId, initializedAt }));

export const handler = async (event = {}, context = {}) => {
  // B. 调用阶段：共享计数接着增加，局部计数每次重新从 0 开始。
  invocationCount += 1;
  let localCount = 0;
  localCount += 1;

  // C. 可选对照：只删本实验的一个缓存文件，不会清空 /tmp。
  const resetTmpRequested = event?.resetTmp === true;
  if (resetTmpRequested) fs.rmSync(tmpFilePath, { force: true });

  // 这里的 before 指“本次写入之前”，若请求 resetTmp，检查发生在删除之后。
  const tmpFileExistedBefore = fs.existsSync(tmpFilePath);
  if (!tmpFileExistedBefore) {
    fs.writeFileSync(tmpFilePath, JSON.stringify({
      createdAt: new Date().toISOString(),
      createdByInitializationId: initializationId,
      createdByRequestId: context.awsRequestId ?? "local",
    }), "utf8");
  }

  // D. 只输出本实验的非敏感配置，不打印完整 event 或环境变量集合。
  const result = {
    initializationId,
    initializedAt,
    invocationCount,
    localCount,
    appEnv: process.env.APP_ENV ?? "not-set",
    tmpFileExistedBefore,
    tmpFileContent: JSON.parse(fs.readFileSync(tmpFilePath, "utf8")),
    resetTmpRequested,
    awsRequestId: context.awsRequestId ?? "local",
    functionVersion: context.functionVersion ?? "local",
    logStreamName: context.logStreamName ?? "local",
  };
  console.log(JSON.stringify({ type: "INVOCATION", ...result }));

  // E. 可选失败事件：真正抛异常，区别于正常返回 { statusCode: 500 }。
  if (event?.fail === true) {
    throw new Error("Day01IntentionalError: 本实验主动抛出的异常");
  }

  // 为 Day 2 的 API Gateway 代理集成保留这种响应形式。
  return { statusCode: 200, body: JSON.stringify(result) };
};
