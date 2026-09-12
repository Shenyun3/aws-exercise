# Day 1｜勘误与验证记录

> 更新：2026-09-12 · [教材](notes.md) · [实验](tutorial.md)

## 1. 这次改了什么

- notes 从概念入口讲到请求流程，再对应代码、场景、自测；末尾逐项映射 Day 1 Goal。
- tutorial 保留 Console 主线，补输出解读、异常排查、可选版本实验和资源复用说明。
- 代码增加模块初始化编号、局部计数、缓存创建者、版本和日志流信息；保留原共享计数、APP_ENV 和 `/tmp` 实验。
- 提供三个事件文件和一个无需 AWS 的本地演示脚本；运行后清理自己的临时目录。
- Terraform 更新到 Node.js 24、AWS provider 6.x，补明确的日志策略依赖。保留原函数、角色和资源地址，未执行迁移或部署。
- 原 Goal 的勾选状态和其他天的文件未修改。

## 2. 为什么需要勘误

| 旧表述或问题 | 本次采用的表述 | 官方依据 |
| --- | --- | --- |
| DEV Alias 可指向 `$LATEST` | Alias 指向已发布数字版本 | [加权 Alias](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html) |
| `$LATEST` 不能用于生产绑定 | 技术上可调用，生产发布通常使用版本和 Alias 控制变更 | [版本](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html) |
| 已发布版本所有东西都完全冻结 | 代码及大部分配置固定，触发器、异步配置等有例外 | [版本](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html) |
| DLQ 不带请求 ID 或错误原因 | 原始事件外有有限错误消息属性 | [异步调用记录](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html) |
| Destinations 永远只有四种目标 | 当前还支持 S3 失败目标；与事件源映射分别说明 | [目标类型](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html) |
| 所有超出 Reserved 的请求都直接返回 429 | 同步调用、异步队列、事件源映射的后续行为不同 | [异步重试](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html) |
| 连接池放外面能防止数据库被打满 | 只减少同环境的重复初始化；总连接量还受环境数和池大小影响 | [最佳实践](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html) |
| 空闲固定几分钟后回收；三次测试一定 1、2、3 | 回收和复用无这样的保证；记录真实观察 | [生命周期](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) |
| Hyperplane 保证亚秒冷启动；联网必须 NAT | 不给固定延迟保证；公网 IPv4、IPv6、服务 Endpoint 分场景 | [VPC](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html) |
| 运行时选 Node.js 20 | 使用当前受支持的 Node.js 24 | [运行时](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) |
| Day 1 结束立即删函数 | 按 Day 2、Day 8 的依赖保留，复用结束后清理 | 本地原 Goal Day 2、Day 8 |
| 源码链接重复包含 days/day01-lambda | 使用本目录相对链接 | 本地链接检查 |

这些修正用于帮助理解原目标，没有把所有新服务能力扩成额外学习任务。

## 3. 验证范围

本地验证与 AWS 实测分别记录，避免把本地演示当成云上结果。

- JavaScript 语法：已通过 `node --check`。
- 本地演示断言：已在 Node.js 24.19.0 验证共享计数、局部计数、文件复用、缓存重建、主动异常和独立模块状态。
- 文档：31 个本地链接及锚点、10 段 JavaScript/命令行片段的语法、3 个事件 JSON、代码围栏和答案折叠结构均通过检查；`git diff --check` 通过。
- 云上创建/更新、真实环境复用、日志投递和 Alias 实验：未执行，按 tutorial 在你的账户操作。
- Terraform：配置经人工对照检查，未执行 fmt、validate、plan 或 apply；本机没有预装 Terraform CLI，临时 HCL 解析器下载也受网络限制，不能声称已通过 provider 校验。已有 5.x 锁文件的环境需按教程处理 6.x 升级。

初次验证用本机 Node.js 26.8.2，随后用配套运行环境的 Node.js 24.19.0 复验通过，与 AWS 教程选择的主版本一致。
