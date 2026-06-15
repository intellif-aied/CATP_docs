# 资源管理与调度数据模型

> 配套图：
>
> - `architecture/resource-management-scheduling-architecture.svg`
> - `architecture/resource-management-state-machines.svg`
>
> 设计目标：支持优先级、可中断、不可虚拟化资源独占租约、人和程序共享资源、白天优先人、夜间优先程序。

## 1. 核心原则

1. **FPGA / EMU 默认不可虚拟化**：调度模型不能假设一台 FPGA 或 EMU 可以被多个任务共享。除非硬件本身支持物理分区，否则统一按 `ResourceUnit` 独占租约管理。
2. **人和程序都是资源消费者**：人工调试、问题复现、自动回归、CI 验证都进入统一 `ResourceRequest`，通过 `consumerType` 区分。
3. **白天优先人，夜间优先程序**：默认策略由 `ShiftPolicy` 控制。工作时段给人工调试和高优先级人工任务加权；非工作时段给自动回归、夜间计划、长稳任务加权。
4. **中断必须保护现场**：抢占不是直接 kill。系统先根据 `interruptibility` 选择 drain、checkpoint、迁移、等待 owner 确认或拒绝抢占。
5. **所有自动决策可解释**：每次资源分配、抢占、拒绝、迁移、释放都写入 `AllocationDecision` 和 `ResourceEvent`。

## 2. 枚举模型

### ResourceKind

| 值 | 说明 |
| --- | --- |
| `FPGA` | FPGA 板卡或板卡组，默认独占 |
| `EMU` | EMU 资源，默认独占 |
| `CPU` | CPU Farm 资源，可并发 |
| `QEMU_CMODEL` | QEMU + cmodel |
| `QEMU_AMODEL` | QEMU + amodel |
| `LOG_ANALYSIS` | 日志、trace、dump 分析资源 |

### ShareMode

| 值 | 说明 |
| --- | --- |
| `EXCLUSIVE` | 任意时刻只能有一个 active lease，FPGA / EMU 默认值 |
| `PARTITIONED` | 资源可被物理分区，分区也要建模为独立 `ResourceUnit` |
| `CONCURRENT` | 可并发运行多个任务，例如 CPU / QEMU 池 |

### ConsumerType

| 值 | 说明 |
| --- | --- |
| `HUMAN` | 人工调试、复现、现场保留、专项实验 |
| `PROGRAM` | 自动回归、CI、夜间计划、复跑、报告或分析任务 |

### PriorityClass

| 值 | 说明 |
| --- | --- |
| `P0` | 投片阻塞、紧急定位、关键资源故障，可申请覆盖昼夜默认策略 |
| `P1` | 里程碑阻塞、高风险问题、关键 PR 修复验证 |
| `P2` | 高风险模块回归、重要增量验证 |
| `P3` | 常规回归、普通复跑、批量分析 |
| `P4` | 低优先级长任务、探索性任务、可延后任务 |

### Interruptibility

| 值 | 说明 |
| --- | --- |
| `NONE` | 不可中断，必须等任务完成或人工确认 |
| `DRAIN` | 不接新阶段，运行到安全检查点后释放 |
| `CHECKPOINT` | 可保存现场和进度，后续恢复或迁移 |
| `KILLABLE` | 可直接终止，适用于低价值、无现场保护要求的任务 |

### ResourceState

| 值 | 说明 |
| --- | --- |
| `OFFLINE` | 不可访问 |
| `HEALTH_CHECKING` | 健康检查中 |
| `IDLE` | 空闲，可调度 |
| `RESERVED` | 被预约，尚未进入 active lease |
| `ALLOCATING` | 正在发放租约或部署环境 |
| `IN_USE_HUMAN` | 被人工使用 |
| `IN_USE_PROGRAM` | 被程序使用 |
| `DRAINING` | 不接新任务，等待当前任务安全退出 |
| `UNHEALTHY` | 健康失败，自动隔离 |
| `MAINTENANCE` | 维护、升级或人工修复中 |

### LeaseState

| 值 | 说明 |
| --- | --- |
| `REQUESTED` | 租约申请已创建 |
| `QUEUED` | 等待排序和匹配 |
| `CANDIDATE_SELECTED` | 已找到候选资源 |
| `GRANTED` | 租约已发放，等待使用方确认 |
| `ACTIVE` | 租约生效，资源被独占或占用 |
| `RENEWING` | 正在续约 |
| `PREEMPTING` | 正在处理抢占 |
| `RELEASED` | 正常释放 |
| `REVOKED` | 被抢占或强制释放 |
| `EXPIRED` | 过期释放 |

## 3. 实体模型

### ResourcePool

资源池表示一组同类资源，例如 FPGA 池、EMU 池、CPU Farm、QEMU+cmodel 池。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 资源池 ID |
| `name` | string | 资源池名称 |
| `kind` | ResourceKind | 资源类型 |
| `shareMode` | ShareMode | 默认共享模式 |
| `projectScope` | string | 所属项目或可见范围 |
| `defaultShiftPolicyId` | string | 默认昼夜策略 |
| `ownerTeam` | string | 维护团队 |
| `enabled` | boolean | 是否启用 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### ResourceUnit

资源调度的最小单位。不可虚拟化的 FPGA / EMU 每台设备或每个真实可独占分区都应建成一个 ResourceUnit。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 资源 ID |
| `poolId` | string | 所属资源池 |
| `name` | string | 设备名 |
| `kind` | ResourceKind | 资源类型 |
| `shareMode` | ShareMode | 共享模式，FPGA / EMU 默认 `EXCLUSIVE` |
| `state` | ResourceState | 当前状态 |
| `currentLeaseId` | string? | 当前 active lease |
| `currentTaskId` | string? | 当前执行任务 |
| `currentOwner` | string? | 当前人或程序 owner |
| `allowPreemption` | boolean | 是否允许被抢占 |
| `allowNightProgramRun` | boolean | 夜间是否允许程序自动使用 |
| `allowDayProgramRun` | boolean | 白天是否允许程序使用 |
| `supportsCheckpoint` | boolean | 是否支持 checkpoint |
| `supportsDebug` | boolean | 是否支持 debug |
| `supportsTrace` | boolean | 是否支持 trace |
| `heartbeatAt` | datetime? | 最近心跳 |
| `lockedUntil` | datetime? | 现场保护或预约结束时间 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### ResourceCapability

描述资源能跑什么，不把能力散落在任务逻辑里。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 能力 ID |
| `resourceUnitId` | string | 资源 ID |
| `chipVersions` | string[] | 支持芯片版本 |
| `softwareVersions` | string[] | 支持软件版本 |
| `platformVersions` | string[] | FPGA bitstream、EMU build、QEMU/model 版本 |
| `supportedCaseTypes` | string[] | 支持用例类型 |
| `forbiddenCaseTypes` | string[] | 禁止用例类型 |
| `avgRuntimeFactor` | number | 平均速度因子 |
| `stabilityScore` | number | 稳定性评分 |
| `debugFeatures` | string[] | trace、dump、waveform 等 |

### ResourceHealthSnapshot

记录资源健康和可用性。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 快照 ID |
| `resourceUnitId` | string | 资源 ID |
| `state` | ResourceState | 快照状态 |
| `heartbeatAt` | datetime | 心跳时间 |
| `healthScore` | number | 健康分 |
| `signals` | json | 温度、磁盘、连接、board 状态、服务状态 |
| `failureReason` | string? | 健康失败原因 |
| `reportedBy` | string | agent / worker / human |

### ResourceRequest

统一的人和程序资源请求。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 请求 ID |
| `consumerType` | ConsumerType | 人或程序 |
| `requesterId` | string | 人员 ID 或 Agent/系统 ID |
| `projectId` | string | 项目 |
| `planId` | string? | 执行计划 |
| `taskId` | string? | 执行任务 |
| `issueId` | string? | 关联 Issue |
| `priority` | PriorityClass | 显式优先级 |
| `effectiveScore` | number | 调度时计算的动态分数 |
| `resourceKind` | ResourceKind | 期望资源类型 |
| `requiredCapabilities` | json | 芯片、版本、debug、trace、用例类型等 |
| `durationEstimateMinutes` | number | 预计占用 |
| `latestStartAt` | datetime? | 最晚开始时间 |
| `deadlineAt` | datetime? | 截止时间 |
| `interruptibility` | Interruptibility | 可中断能力 |
| `preemptible` | boolean | 是否允许被抢占 |
| `status` | string | created / queued / matched / granted / rejected / cancelled |
| `reason` | string | 请求原因 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### ResourceLease

租约表示某个消费者对某个资源的占用权。FPGA / EMU 通过租约保证独占。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 租约 ID |
| `requestId` | string | 来源请求 |
| `resourceUnitId` | string | 被占用资源 |
| `consumerType` | ConsumerType | 人或程序 |
| `ownerId` | string | 人员 ID 或系统 ID |
| `taskId` | string? | 关联任务 |
| `issueId` | string? | 关联问题 |
| `state` | LeaseState | 租约状态 |
| `priority` | PriorityClass | 租约优先级 |
| `startedAt` | datetime? | 开始时间 |
| `expiresAt` | datetime | 过期时间 |
| `renewedCount` | number | 续约次数 |
| `preemptedByLeaseId` | string? | 抢占来源 |
| `releaseReason` | string? | 释放原因 |
| `checkpointId` | string? | 中断前 checkpoint |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### ReservationWindow

预约窗口用于人工调试、专项验证、夜间回归等提前占位。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 预约 ID |
| `resourceUnitId` | string? | 指定资源，可为空表示资源池预约 |
| `poolId` | string? | 指定资源池 |
| `consumerType` | ConsumerType | 人或程序 |
| `ownerId` | string | 预约人或系统 |
| `priority` | PriorityClass | 预约优先级 |
| `startAt` / `endAt` | datetime | 预约窗口 |
| `purpose` | string | 调试、夜间回归、专项验证 |
| `approvalState` | string | pending / approved / rejected |
| `conflictPolicy` | string | reject / preempt_lower / allow_queue |

### ShiftPolicy

定义白天/夜间策略。建议按项目、资源池、资源类型可覆盖。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 策略 ID |
| `name` | string | 策略名称 |
| `timezone` | string | 例如 `Asia/Shanghai` |
| `workdayStart` | string | 默认 `09:00` |
| `workdayEnd` | string | 默认 `19:00` |
| `workdays` | string[] | 工作日，例如 Monday-Friday |
| `dayHumanBoost` | number | 白天人工请求加分 |
| `dayProgramPenalty` | number | 白天普通程序任务扣分 |
| `nightProgramBoost` | number | 夜间程序任务加分 |
| `nightHumanPenalty` | number | 夜间普通人工请求扣分 |
| `p0OverrideAllowed` | boolean | P0 是否可覆盖策略 |
| `maxHumanLeaseMinutesDay` | number | 白天人工默认租约时长 |
| `maxProgramLeaseMinutesNight` | number | 夜间程序默认租约时长 |

### SchedulerPolicy

调度全局策略。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 策略 ID |
| `scope` | string | global / project / pool |
| `priorityWeights` | json | 优先级权重 |
| `scarcityWeights` | json | FPGA/EMU 等稀缺资源惩罚或保护 |
| `agingWeight` | number | 等待老化权重 |
| `preemptionEnabled` | boolean | 是否允许抢占 |
| `preemptionMinPriorityGap` | number | 抢占所需最小优先级差 |
| `requireApprovalForForce` | boolean | 强制中断是否需要审批 |
| `maxQueueWaitMinutes` | number | 最大等待告警 |

### InterruptionPolicy

定义不同任务和资源如何被中断。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 策略 ID |
| `resourceKind` | ResourceKind | 资源类型 |
| `interruptibility` | Interruptibility | 任务声明 |
| `allowedActions` | string[] | drain / checkpoint / migrate / force_kill / deny |
| `requiresApproval` | boolean | 是否需要审批 |
| `checkpointTimeoutMinutes` | number | checkpoint 最大等待 |
| `drainTimeoutMinutes` | number | drain 最大等待 |
| `preserveArtifacts` | boolean | 是否强制保留现场 |

### AllocationDecision

调度解释记录。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 决策 ID |
| `requestId` | string | 请求 ID |
| `selectedResourceUnitId` | string? | 被选资源 |
| `candidateResourceUnitIds` | string[] | 候选资源 |
| `decision` | string | grant / queue / reject / preempt / migrate |
| `scoreBreakdown` | json | 分数明细 |
| `matchedRules` | string[] | 命中规则 |
| `reason` | string | 人类可读解释 |
| `createdBy` | string | scheduler / agent / human |
| `createdAt` | datetime | 决策时间 |

### TaskCheckpoint

保存任务中断和恢复所需信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | checkpoint ID |
| `taskId` | string | 任务 ID |
| `leaseId` | string | 租约 ID |
| `resourceUnitId` | string | 资源 ID |
| `versionMatrixId` | string | 版本矩阵 |
| `progress` | json | 阶段、子用例、执行进度 |
| `artifactRefs` | string[] | 现场 artifact |
| `resumeCommand` | string? | 恢复命令 |
| `isResumable` | boolean | 是否可恢复 |
| `createdAt` | datetime | 创建时间 |

### ResourceEvent

所有状态变化和人工/自动动作的事件记录。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 事件 ID |
| `eventType` | string | resource.state_changed / lease.granted / lease.preempted 等 |
| `resourceUnitId` | string? | 资源 ID |
| `leaseId` | string? | 租约 ID |
| `requestId` | string? | 请求 ID |
| `taskId` | string? | 任务 ID |
| `actorType` | string | human / agent / system |
| `actorId` | string | 触发者 |
| `reason` | string | 原因 |
| `payload` | json | 事件详情 |
| `traceId` | string | 链路 ID |
| `createdAt` | datetime | 事件时间 |

### ResourceVisualizationSnapshot

用于资源可视化页面的聚合读模型。它可以由后台定期刷新，也可以由事件流增量更新，避免前端一次拼接大量业务表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `resourceUnitId` | string | 资源 ID |
| `poolId` | string | 资源池 |
| `kind` | ResourceKind | 资源类型 |
| `displayName` | string | 页面展示名 |
| `state` | ResourceState | 当前状态 |
| `consumerType` | ConsumerType? | 当前人或程序 |
| `ownerName` | string? | 当前 owner 展示名 |
| `currentLeaseId` | string? | 当前租约 |
| `currentTaskTitle` | string? | 当前任务标题 |
| `remainingMinutes` | number? | 租约剩余时间 |
| `interruptibility` | Interruptibility? | 当前任务可中断能力 |
| `nextCheckpointEtaMinutes` | number? | 下一 checkpoint 预计时间 |
| `healthScore` | number | 健康分 |
| `healthSummary` | string | 健康摘要 |
| `nextReservationAt` | datetime? | 下一预约时间 |
| `lastDecisionReason` | string? | 最近一次调度理由 |
| `availableActions` | string[] | release / renew / preempt / drain / approve 等 |
| `updatedAt` | datetime | 快照更新时间 |

### ResourceTimelineBlock

用于日历和时间线视图。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 时间块 ID |
| `resourceUnitId` | string | 资源 ID |
| `blockType` | string | lease / reservation / drain / maintenance / health_outage |
| `consumerType` | ConsumerType? | 人或程序 |
| `ownerName` | string? | owner 展示名 |
| `title` | string | 时间块标题 |
| `startAt` / `endAt` | datetime | 时间范围 |
| `state` | string | active / planned / completed / interrupted |
| `priority` | PriorityClass? | 优先级 |
| `canDrag` | boolean | 是否允许拖拽调整 |
| `canPreempt` | boolean | 是否允许申请抢占 |

### ResourceApprovalRequest

用于抢占、强制释放、延长现场保护等高风险动作审批。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 审批 ID |
| `actionType` | string | preempt / force_release / extend_lock / cleanup_site |
| `requesterId` | string | 申请人或 Agent |
| `targetResourceUnitId` | string | 目标资源 |
| `targetLeaseId` | string? | 目标租约 |
| `riskLevel` | string | low / medium / high / critical |
| `reason` | string | 申请理由 |
| `evidenceArtifactRefs` | string[] | 证据和现场 |
| `status` | string | pending / approved / rejected / expired |
| `approverId` | string? | 审批人 |
| `decisionReason` | string? | 审批理由 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

## 4. 关键关系

```text
ResourcePool 1 -- N ResourceUnit
ResourceUnit 1 -- N ResourceCapability
ResourceUnit 1 -- N ResourceHealthSnapshot
ResourceUnit 1 -- N ReservationWindow
ResourceRequest 1 -- 0..1 ResourceLease
ResourceLease N -- 1 ResourceUnit
ResourceLease 1 -- N ResourceEvent
ResourceRequest 1 -- N AllocationDecision
ResourceLease 1 -- 0..N TaskCheckpoint
ShiftPolicy 1 -- N ResourcePool
SchedulerPolicy 1 -- N AllocationDecision
ResourceUnit 1 -- 1 ResourceVisualizationSnapshot
ResourceUnit 1 -- N ResourceTimelineBlock
ResourceApprovalRequest N -- 1 ResourceUnit
```

## 5. 调度评分建议

调度器不只按人工填写的优先级排序，建议计算动态分数。

```text
effectiveScore =
  basePriorityWeight
  + milestoneUrgencyBoost
  + tapeoutRiskBoost
  + issueSeverityBoost
  + changeImpactBoost
  + resourceAffinityBoost
  + waitingAgingBoost
  + shiftConsumerBoost
  - resourceScarcityPenalty
  - incompatibilityPenalty
```

关键解释：

- `basePriorityWeight`：P0 > P1 > P2 > P3 > P4。
- `shiftConsumerBoost`：白天给 `HUMAN` 加权，夜间给 `PROGRAM` 加权。
- `waitingAgingBoost`：防止低优先级任务长期饥饿。
- `resourceScarcityPenalty`：保护 FPGA / EMU，不让低价值任务长期占用。
- `resourceAffinityBoost`：真实硬件依赖任务优先 FPGA，需要 trace 的定位任务优先 EMU，快速筛查优先 QEMU/CPU。

## 6. 白天与夜间策略

默认策略可以配置为：

| 时段 | 策略 | 说明 |
| --- | --- | --- |
| 工作日 09:00-19:00 | `HumanFirst` | 人工调试、复现、专项验证优先；程序任务可跑但需要更高分或空闲资源 |
| 工作日 19:00-次日 09:00 | `ProgramFill` | 自动回归、夜间计划、长稳任务优先填充资源；人工 P0 或已预约任务可以覆盖 |
| 周末 / 节假日 | `ProgramBatch` | 默认程序批量回归优先，人工预约或 P0 可覆盖 |
| 投片前冲刺窗口 | `MilestoneOverride` | 以里程碑准入和风险收敛为最高优先级 |

## 7. 中断规则

### 中断决策顺序

1. 判断新请求是否有足够优先级差。
2. 判断当前租约是否允许抢占。
3. 判断当前任务 `interruptibility`。
4. 判断资源是否支持 checkpoint 或 drain。
5. 如果是人工租约，先发提醒和确认；P0 可以走审批覆盖。
6. 生成 checkpoint 或 drain 计划。
7. 释放租约，创建恢复任务或迁移任务。
8. 写入 `AllocationDecision` 和 `ResourceEvent`。

### 抢占矩阵

| 当前占用 | 新请求 | 默认动作 |
| --- | --- | --- |
| 白天程序 P3/P4 | 人工 P1/P2 | drain 或 checkpoint 后释放 |
| 白天程序 P1 | 人工 P2 | 不抢占，进入队列或等待人工审批 |
| 夜间人工普通租约过期 | 程序 P2/P3 | 提醒后释放，必要时 checkpoint |
| 夜间人工 P0 | 程序任意 | 不抢占 |
| FPGA/EMU debug 现场保护 | 程序任意 | 不抢占，除非 owner 释放或审批通过 |
| unhealthy 资源上的任务 | 任意 | 隔离资源，任务进入恢复或复跑流程 |

## 8. 二级架构落地接口建议

### 资源申请

```http
POST /api/v1/resource-requests
```

请求核心字段：

```json
{
  "consumerType": "HUMAN",
  "priority": "P1",
  "resourceKind": "EMU",
  "durationEstimateMinutes": 120,
  "interruptibility": "DRAIN",
  "requiredCapabilities": {
    "chipVersion": "NGU800P",
    "needsTrace": true,
    "softwareVersion": "v1.2.0"
  },
  "reason": "定位 P0 启动失败，需要打开 trace 复现"
}
```

### 租约续约

```http
POST /api/v1/resource-leases/{leaseId}/renew
```

### 抢占申请

```http
POST /api/v1/resource-leases/{leaseId}/preempt
```

### 资源状态回写

```http
POST /api/v1/resource-units/{resourceId}/heartbeat
```

## 9. 看板字段建议

资源看板至少展示：

- 资源类型、资源名、当前状态、当前 owner。
- 当前租约、剩余时间、是否可抢占。
- 当前任务、计划、用例、版本矩阵。
- 白天/夜间策略命中情况。
- 健康分、最近心跳、最近失败原因。
- 下一个预约窗口。
- 最近一次调度决策理由。

资源可视化页面建议支持：

- 按项目、资源池、资源类型、状态、owner、优先级、昼夜策略筛选。
- 资源地图用颜色区分 idle、human、program、reserved、draining、unhealthy。
- 时间线展示租约、预约、maintenance、drain、health outage。
- 队列展示 `effectiveScore` 和分数明细，避免黑盒排队。
- 资源详情展示可操作按钮，并根据权限和状态动态禁用危险动作。
- 审批中心展示抢占目标、风险、证据 artifact 和审批理由。

## 10. 后续可继续细化的子模块

1. 资源登记与健康检查。
2. 独占租约与预约日历。
3. 优先级评分与昼夜策略。
4. 抢占、中断、checkpoint 与恢复。
5. FPGA / EMU / CPU / QEMU 执行适配器。
6. 资源看板与人工操作闭环。
