// 本地教学演示 + 断言：验证代码行为，不模拟 AWS 调度、冷启动、IAM 或重试服务。
// 直接运行 node scripts/run-local.mjs，无 npm 依赖、无 AWS 凭证需求。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "dva-day01-"));
const oldTmpDir = process.env.DVA_LAB_TMP_DIR;
const oldAppEnv = process.env.APP_ENV;
const readEvent = (name) => JSON.parse(fs.readFileSync(
  new URL(`../events/${name}.json`, import.meta.url), "utf8",
));

async function loadModule(label) {
  const directory = path.join(root, label);
  fs.mkdirSync(directory);
  process.env.DVA_LAB_TMP_DIR = directory;
  const moduleUrl = new URL("../src/index.mjs", import.meta.url);
  // 不同 URL 使 Node 加载两份独立模块状态；各自固定不同临时目录。
  moduleUrl.searchParams.set("local-demo", label);
  return (await import(moduleUrl.href)).handler;
}

const contextFor = (label) => ({
  awsRequestId: `local-${randomUUID()}`,
  functionVersion: "local-demo",
  logStreamName: `local-module-${label}`,
});

async function invoke(handler, event, label) {
  const response = await handler(event, contextFor(label));
  assert.equal(response.statusCode, 200);
  return JSON.parse(response.body);
}

try {
  process.env.APP_ENV = "local-demo";
  const a = await loadModule("A");
  const results = [];
  for (let i = 0; i < 3; i += 1) {
    results.push(await invoke(a, readEvent("normal"), "A"));
  }
  assert.deepEqual(results.map((r) => r.invocationCount), [1, 2, 3]);
  assert.deepEqual(results.map((r) => r.localCount), [1, 1, 1]);
  assert.deepEqual(results.map((r) => r.tmpFileExistedBefore), [false, true, true]);
  assert.equal(new Set(results.map((r) => r.initializationId)).size, 1);
  assert.equal(new Set(results.map((r) => r.awsRequestId)).size, 3);
  assert.equal(results[0].appEnv, "local-demo");
  assert.deepEqual(results[0].tmpFileContent, results[2].tmpFileContent);

  const reset = await invoke(a, readEvent("reset-tmp"), "A");
  assert.equal(reset.invocationCount, 4);
  assert.equal(reset.initializationId, results[0].initializationId);
  assert.equal(reset.tmpFileExistedBefore, false);
  assert.equal(reset.tmpFileContent.createdByRequestId, reset.awsRequestId);

  await assert.rejects(a(readEvent("fail"), contextFor("A")), /Day01IntentionalError/);
  const afterError = await invoke(a, readEvent("normal"), "A");
  assert.equal(afterError.invocationCount, 6);
  assert.equal(afterError.tmpFileExistedBefore, true);

  const b = await loadModule("B");
  const fresh = await invoke(b, readEvent("normal"), "B");
  assert.equal(fresh.invocationCount, 1);
  assert.equal(fresh.tmpFileExistedBefore, false);
  assert.notEqual(fresh.initializationId, results[0].initializationId);

  console.table([...results, reset, afterError, fresh].map((r) => ({
    module: r.logStreamName,
    shared: r.invocationCount,
    local: r.localCount,
    fileExisted: r.tmpFileExistedBefore,
  })));
  console.log("PASS：模块状态复用、局部变量、缓存重建、异常和独立模块均符合预期。");
  console.log("这些是本地代码验证；AWS 是否复用执行环境，需按 tutorial.md 在云上观察。");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  if (oldTmpDir === undefined) delete process.env.DVA_LAB_TMP_DIR;
  else process.env.DVA_LAB_TMP_DIR = oldTmpDir;
  if (oldAppEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = oldAppEnv;
}
