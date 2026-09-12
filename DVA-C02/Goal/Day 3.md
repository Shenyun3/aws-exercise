---
tags: [cloud/aws, certification]
type: 规划
created: 2026-09-09
updated: 2026-09-09
---
# Day 3（09-10）任务清单

**总时长 2 小时** | 主题：DynamoDB
**基线**：DynamoDB 是 Level 2（SAA 时期建立过概念，缺 DVA 视角的参数细节）。今天的重心不是"DynamoDB 是什么"，而是 **RCU/WCU 算数** 和 **API 参数级细节**——这两块 SAA 不考，DVA 逐题考。

---

## 开场（3 分钟）

### 0 检查 Day 2 遗留

- [ ] 昨天记的"最模糊 3 个点"，能答上来了吗
- [ ] SAM 和 CloudFormation 的关系还记得吗（`Transform` 那行）——Day 6 要用

---

## 学习部分（约 75 分钟）

### 1 RCU / WCU 计算（20 分钟，必须形成肌肉记忆）

这是 DVA 唯一需要"算"的考点，也是最容易在考场上白送分的地方。

- [ ] 背下四条换算：
  - **强一致读**：1 RCU = 4 KB/s
  - **最终一致读**：1 RCU = 2 × 4 KB/s（即同样数据量只要一半 RCU）
  - **事务读**：4 KB 消耗 **2 RCU**
  - **写**：1 WCU = 1 KB/s；**事务写 = 2 WCU**
- [ ] 记住计算顺序：**先把 item 大小向上取整**（读向上取整到 4 KB 的倍数，写向上取整到 1 KB 的倍数），**再**乘以每秒条数，**最后**按一致性模型除或乘
- [ ] 自己手算三道：
  - 每秒 10 次强一致读，每个 item 6 KB → 6 向上取整到 8 KB = 2 单位 × 10 = **20 RCU**
  - 同上但最终一致 → 20 ÷ 2 = **10 RCU**
  - 每秒 20 次写，每个 item 3.5 KB → 取整到 4 KB × 20 = **80 WCU**

> [!warning] 坑
> 题干里出现 `transactional` / `ACID` / `TransactWriteItems` 这些词，就要立刻把结果翻倍。这是最常见的丢分点。

**自测**：能不看笔记算出"每秒 100 次最终一致读、item 2 KB"需要多少 RCU（答案 25）

---

### 2 主键与分区设计（10 分钟）

- [ ] Partition Key（HASH）与 Sort Key（RANGE）组成的两种主键形式
- [ ] **高基数（high cardinality）** 是分区键设计的第一原则（Skill 1.3.1）
- [ ] 理解**热分区（hot partition）** 怎么产生：低基数键、时间戳前缀、单一租户
- [ ] 缓解手段：**write sharding**（在键后拼随机后缀或计算后缀）、复合键
- [ ] 了解 adaptive capacity 会自动缓解部分热分区，但不能替代好的键设计

**自测**："某表用 `status` 当分区键，只有 3 种取值，写入报限流" → 问题出在哪、怎么改

---

### 3 Query vs Scan（8 分钟，Skill 1.3.3）

| 维度 | Query | Scan |
| --- | --- | --- |
| 必须条件 | 必须指定 partition key | 不需要条件 |
| 读取范围 | 只读该分区 | 全表 |
| 效率 | 高 | 低，消耗全表容量 |
| 考试暗示词 | efficient / specific item | 尽量避免 |

- [ ] 记住 **FilterExpression 是在读取之后才过滤的**——不省 RCU，只减少返回的数据量
- [ ] `ProjectionExpression` 减少返回属性（省网络，不省读容量的计算基数）
- [ ] Scan 优化：`Limit`、**Parallel Scan**（分 segment 并行）
- [ ] 分页：`LastEvaluatedKey` → 下一次请求传 `ExclusiveStartKey`

> [!warning] 坑
> "加个 FilterExpression 就能省 RCU"是错的。这是 DVA 的高频干扰项。

---

### 4 索引：LSI vs GSI（12 分钟，高频）

| 维度 | LSI | GSI |
| --- | --- | --- |
| 创建时机 | **只能建表时创建** | 随时可加可删 |
| 分区键 | 与主表**相同** | 可以不同 |
| 容量 | **与主表共享** | **独立的 RCU/WCU** |
| 一致性 | 支持强一致读 | **只支持最终一致读** |
| 大小限制 | 每个分区键 10 GB | 无 |

- [ ] 理解 GSI 容量不足的后果：**会反压主表的写入**（写主表时同步写 GSI，GSI 被限流会导致主表写失败）
- [ ] 三种投影类型：`KEYS_ONLY` / `INCLUDE` / `ALL`

**自测**："已上线的表现在需要用另一个属性查询" → LSI 还是 GSI

---

### 5 条件写与乐观锁（10 分钟）

- [ ] `ConditionExpression` 的作用：条件不满足则整个写操作失败，返回 **`ConditionalCheckFailedException`**
- [ ] **乐观锁（Optimistic Locking）** 的实现：维护一个 version 属性，写入时加 `ConditionExpression: version = :expected`
- [ ] `attribute_not_exists(pk)` 实现"不存在才插入"（防覆盖）
- [ ] 与 `TransactWriteItems` 的区别：条件写是单 item，事务是跨 item / 跨表的原子性

---

### 6 批量操作与重试（8 分钟）

- [ ] `BatchGetItem`（最多 100 item）/ `BatchWriteItem`（最多 25 item，**不支持 UpdateItem**）
- [ ] **部分失败不是异常**：返回体里的 `UnprocessedKeys` / `UnprocessedItems` 才是重点
- [ ] 处理方式：**指数退避 + 抖动（exponential backoff with jitter）重试未处理项**
- [ ] `ProvisionedThroughputExceededException` 的三条解法：重试退避、提高容量、改 On-Demand

**自测**："批量写返回 200 但部分数据没进去" → 检查什么字段

---

### 7 附加特性快速过（7 分钟）

- [ ] **TTL**：属性必须是 **Unix epoch 秒**的 Number 类型；删除是**后台异步**的，不保证准点
- [ ] **DynamoDB Streams**：四种 `StreamViewType`（`KEYS_ONLY` / `NEW_IMAGE` / `OLD_IMAGE` / `NEW_AND_OLD_IMAGES`），触发 Lambda
- [ ] **DAX**：DynamoDB 专用的微秒级缓存，**代码几乎不用改**（API 兼容）；只解决读，不加速写
- [ ] Capacity 模式：Provisioned（可配 Auto Scaling）vs On-Demand（流量不可预测时选）

> [!tip] 大白话
> ElastiCache 需要自己写"先查缓存、没有再查库"的逻辑；DAX 是把这套逻辑内置了，换个 endpoint 就行。这个区别是考点。

---

## 动手部分（10 分钟，不要超时）

### 8 微验证：条件写失败长什么样

- [ ] 用 CLI 或 boto3 建一张最简表（只有一个分区键）
- [ ] 正常 `put_item` 写一条数据
- [ ] 再用带 `ConditionExpression="attribute_not_exists(pk)"` 的 `put_item` 写同一个键
- [ ] **看清楚返回的异常名**：`ConditionalCheckFailedException`
- [ ] 顺手在控制台看一眼这张表的 **Capacity 页签**，认一下 RCU/WCU 是怎么展示的

**产出**：亲眼见过这个异常名，考场上看到选项能一眼认出

---

## 收尾（5 分钟）

### 9 记录当天最模糊的 3 个点

追加到模糊清单。**如果 RCU/WCU 还算不利索，明天早上先补 10 分钟再开始 Day 4。**

---

## 完成标准

不查资料能回答：

1. 事务读 8 KB 的 item，每秒 5 次，需要多少 RCU？（答案：8÷4=2，×2（事务）=4，×5=**20 RCU**）
2. LSI 和 GSI 在"什么时候能建"和"容量怎么算"上分别有什么区别？
3. 加 FilterExpression 能省读容量吗？为什么？
4. 乐观锁在 DynamoDB 里靠哪个参数实现？
5. `BatchWriteItem` 返回成功但数据不全，看哪个字段？

---

**一句提醒**：DynamoDB 的题在 Domain 1（32%）里占比很高，而且**算数题是确定性的**——公式记牢就是白送分，不像架构题还要揣摩题干。今天的 20 分钟算数练习性价比最高。

## 关联

- [[DVA-C02 17 天备考计划(修订版)]]
- [[Day 2]]
- [[Day 4]]
- [[DynamoDB & ElastiCache NoSQL与极速缓存]]
- [[SAA 易混淆架构选型对比矩阵]]
