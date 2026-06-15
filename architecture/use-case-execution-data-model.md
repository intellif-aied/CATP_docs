# 用例执行编排数据模型

> 配套图：
>
> - `architecture/use-case-execution-orchestration.svg`
> - `architecture/use-case-execution-state-machine.svg`
>
> 设计目标：支持用例由人标注执行平台，支持 QEMU/EMU/FPGA 不同验证路线，支持用例执行顺序、依赖、基础 gate 失败阻断下游，以及 QEMU 预筛失败后跳过 FPGA/EMU。

## 1. 核心原则

1. **平台归属由人标注**：系统可以给建议，但最终每个用例在哪些平台执行、哪些平台必跑、哪些平台只是预筛，要有人工标注和版本。
2. **用例不是线性列表，而是 DAG**：用例之间有依赖边。基础用例失败后，下游用例可以 `BLOCKED`，不是继续浪费稀缺 FPGA/EMU。
3. **平台路线不是固定一条**：支持 `QEMU -> EMU -> FPGA`、`QEMU -> EMU`、`QEMU -> FPGA`、`EMU-only`、`FPGA-only`、`QEMU-only`。
4. **QEMU 可以是预筛 gate**：同一个用例既可在 QEMU 又可在 FPGA 执行时，如果 QEMU 作为 precheck 失败，FPGA 节点可直接 `SKIPPED`。
5. **模型不支持与真实失败要区分**：QEMU 不支持某特性时，不应该把后续 FPGA/EMU 跳过，而应该走人工标注的 EMU/FPGA 路线。
6. **结果要说明来源**：最终报告必须回答哪些结论来自 model，哪些来自 EMU，哪些来自 FPGA。

## 2. 枚举模型

### ExecutionPlatform

| 值 | 说明 |
| --- | --- |
| `QEMU_CMODEL` | QEMU + cmodel |
| `QEMU_AMODEL` | QEMU + amodel |
| `EMU` | EMU 平台 |
| `FPGA` | FPGA 平台 |
| `CPU_ANALYSIS` | 离线分析或日志解析 |

### PlatformSupport

| 值 | 说明 |
| --- | --- |
| `REQUIRED` | 必须执行，该平台结论是准入所需 |
| `PRECHECK` | 预筛平台，失败可阻断更高成本平台 |
| `OPTIONAL` | 选跑，用于补充证据 |
| `FALLBACK` | 当前面平台不支持或失败类型需要时运行 |
| `UNSUPPORTED` | 不支持，不应调度 |
| `HUMAN_REVIEW` | 需要人工判断是否可跑 |

### CaseLayer

| 值 | 说明 |
| --- | --- |
| `FOUNDATION` | 基础 gate 用例，例如 boot、基础寄存器、基础 API |
| `COMMON` | 跨平台通用用例，例如 queue、doorbell、fence |
| `EMU_ENHANCED` | 需要 EMU 可观测性或复杂状态的用例 |
| `FPGA_ENHANCED` | 需要真实板卡、外设、长稳或真实性能趋势的用例 |
| `SCENARIO` | 系统级、长链路或业务场景用例 |

### DependencyType

| 值 | 说明 |
| --- | --- |
| `BLOCKING` | 上游失败则下游 blocked |
| `SOFT` | 上游失败不阻断，但下游带风险标记 |
| `EVIDENCE` | 上游结果作为证据，不影响执行 |
| `MANUAL_GATE` | 上游失败后需要人工决定是否继续 |

### FailureGatePolicy

| 值 | 说明 |
| --- | --- |
| `BLOCK_DOWNSTREAM` | 阻断依赖的下游用例 |
| `SKIP_HIGHER_PLATFORM` | 跳过同用例更高成本平台节点 |
| `CONTINUE_WITH_RISK` | 继续执行但标记风险 |
| `REQUIRE_HUMAN_REVIEW` | 等人工确认 |
| `NO_GATE` | 不触发 gate |

### ExecutionNodeStatus

| 值 | 说明 |
| --- | --- |
| `PLANNED` | 节点已生成 |
| `WAITING_DEPENDENCY` | 等待依赖或 gate |
| `READY` | 可调度 |
| `SCHEDULED` | 已申请资源 |
| `RUNNING` | 执行中 |
| `PASSED` | 通过 |
| `FAILED` | 执行失败 |
| `SKIPPED` | 按策略跳过 |
| `BLOCKED` | 被上游 gate 阻断 |
| `HUMAN_REVIEW` | 等人工判定 |
| `CANCELLED` | 取消 |

## 3. 实体模型

### TestCase

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 用例 ID |
| `name` | string | 用例名称 |
| `module` | string | 所属模块 |
| `layer` | CaseLayer | 用例层级 |
| `riskLevel` | string | 风险等级 |
| `ownerId` | string | owner |
| `scriptRef` | string | 脚本路径或仓库引用 |
| `parameterSchema` | json | 参数定义 |
| `estimatedRuntimeMinutes` | number | 默认预计耗时 |
| `supportsCheckpoint` | boolean | 是否支持断点 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### CasePlatformAnnotation

由人维护的平台适配标注，是编排的核心输入。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 标注 ID |
| `caseId` | string | 用例 ID |
| `platform` | ExecutionPlatform | 平台 |
| `support` | PlatformSupport | REQUIRED / PRECHECK / OPTIONAL 等 |
| `routeOrder` | number | 同一用例的平台执行顺序 |
| `isGate` | boolean | 该平台结果是否作为 gate |
| `failureGatePolicy` | FailureGatePolicy | 失败后的 gate 策略 |
| `skipHigherPlatformOnFail` | boolean | 失败是否跳过后续更高成本平台 |
| `modelUnsupportedBehavior` | string | continue_to_hardware / human_review / block |
| `annotatedBy` | string | 标注人 |
| `annotationReason` | string | 标注理由 |
| `evidenceRefs` | string[] | 证据，例如历史结果、专家说明 |
| `validFromVersion` | string? | 生效版本 |
| `validToVersion` | string? | 失效版本 |
| `reviewState` | string | draft / approved / deprecated |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### CaseDependency

定义用例之间的顺序和阻断关系。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 依赖 ID |
| `upstreamCaseId` | string | 上游用例 |
| `downstreamCaseId` | string | 下游用例 |
| `dependencyType` | DependencyType | blocking / soft / evidence / manual_gate |
| `requiredPlatforms` | ExecutionPlatform[] | 上游哪些平台结果参与 gate |
| `failureGatePolicy` | FailureGatePolicy | 上游失败后的策略 |
| `reason` | string | 依赖原因 |
| `createdBy` | string | 创建人 |

### ExecutionPlan

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 计划 ID |
| `name` | string | 计划名称 |
| `planType` | string | smoke / full / incremental / debug / milestone |
| `projectId` | string | 项目 |
| `triggerSource` | string | manual / pr / milestone / night_schedule |
| `scope` | json | 模块、需求、PR、用例范围 |
| `versionMatrixId` | string | 版本矩阵 |
| `status` | string | created / planned / running / paused / completed |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### ExecutionGraph

每个执行计划生成一个 DAG 快照。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 图 ID |
| `planId` | string | 执行计划 |
| `graphVersion` | number | DAG 版本 |
| `caseCount` | number | 用例数 |
| `nodeCount` | number | 平台节点数 |
| `edgeCount` | number | 边数 |
| `buildReason` | string | 生成原因 |
| `createdAt` | datetime | 创建时间 |

### CaseExecutionNode

一个用例在一个平台上的执行节点。一个 TestCase 可以生成多个平台节点。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 节点 ID |
| `graphId` | string | ExecutionGraph ID |
| `caseId` | string | 用例 ID |
| `platform` | ExecutionPlatform | 执行平台 |
| `routeOrder` | number | 同一用例平台顺序 |
| `support` | PlatformSupport | 来自人工标注 |
| `isGate` | boolean | 是否 gate |
| `failureGatePolicy` | FailureGatePolicy | 失败策略 |
| `status` | ExecutionNodeStatus | 节点状态 |
| `resourceRequestId` | string? | 资源申请 |
| `executionTaskId` | string? | 实际执行任务 |
| `resultId` | string? | 执行结果 |
| `skipReason` | string? | 跳过原因 |
| `blockReason` | string? | 阻断原因 |
| `decisionReason` | string | 为什么生成/调度/跳过该节点 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### ExecutionGraphEdge

平台节点之间的依赖边。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 边 ID |
| `graphId` | string | 图 ID |
| `fromNodeId` | string | 上游节点 |
| `toNodeId` | string | 下游节点 |
| `edgeType` | string | platform_order / case_dependency / gate / evidence |
| `onPass` | string | release / continue / record |
| `onFail` | FailureGatePolicy | 失败动作 |
| `reason` | string | 边原因 |

### PlatformExecutionResult

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 结果 ID |
| `nodeId` | string | CaseExecutionNode ID |
| `caseId` | string | 用例 |
| `platform` | ExecutionPlatform | 平台 |
| `result` | string | pass / fail / skip / blocked / timeout / infra_fail / model_unsupported |
| `failureType` | string? | case / software / platform / design / model / version |
| `confidence` | number? | 置信度 |
| `artifactRefs` | string[] | 日志、trace、dump |
| `versionMatrixId` | string | 版本矩阵 |
| `startedAt` / `finishedAt` | datetime | 执行时间 |

### CaseFinalConclusion

用例多平台结果合并后的结论。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 结论 ID |
| `planId` | string | 执行计划 |
| `caseId` | string | 用例 |
| `finalStatus` | string | passed / failed / partial / blocked / skipped / needs_review |
| `conclusionSource` | ExecutionPlatform[] | 结论来自哪些平台 |
| `qemuResultId` | string? | QEMU 结果 |
| `emuResultId` | string? | EMU 结果 |
| `fpgaResultId` | string? | FPGA 结果 |
| `summary` | string | 结论摘要 |
| `risk` | string | 风险说明 |
| `requiresHumanReview` | boolean | 是否需要人工确认 |

## 4. 关系约束

```text
TestCase 1 -- N CasePlatformAnnotation
TestCase 1 -- N CaseDependency as upstream
TestCase 1 -- N CaseDependency as downstream
ExecutionPlan 1 -- 1 ExecutionGraph
ExecutionGraph 1 -- N CaseExecutionNode
ExecutionGraph 1 -- N ExecutionGraphEdge
CaseExecutionNode 1 -- 0..1 PlatformExecutionResult
ExecutionPlan 1 -- N CaseFinalConclusion
```

关键约束：

- 同一个 `caseId + platform + valid version range` 只允许一个 approved `CasePlatformAnnotation`。
- `ExecutionGraph` 是执行时快照，后续用例标注变更不应悄悄改变正在执行的计划。
- `CaseExecutionNode.status=SKIPPED` 必须有 `skipReason`。
- `CaseExecutionNode.status=BLOCKED` 必须有 `blockReason` 和上游节点引用。
- FPGA/EMU 节点必须关联资源申请或人工确认的资源租约。

## 5. 平台路线生成规则

### QEMU -> EMU -> FPGA

适合通用软件用例或高风险关键路径：

- QEMU 先做快速预筛。
- QEMU 通过后进入 EMU 做复杂状态和可观测验证。
- EMU 通过后进入 FPGA 做真实硬件闭环。
- QEMU fail 且不是 model unsupported 时，EMU/FPGA 节点 `SKIPPED`。

### QEMU -> EMU

适合依赖复杂内部状态、需要 trace，但不强依赖真实板卡外设的用例。

### QEMU -> FPGA

适合 QEMU 能完成软件预筛，但最终必须在真实硬件环境闭环的用例。

### EMU-only / FPGA-only

适合 QEMU/model 不支持的硬件特性。这里不能因为 QEMU 不支持就判定失败，应该由人工标注直接进入 EMU 或 FPGA。

## 6. 失败阻断规则

| 场景 | 动作 |
| --- | --- |
| 基础 gate 用例失败 | 下游 blocking 依赖节点 `BLOCKED` |
| QEMU precheck fail | 同用例后续 EMU/FPGA 节点 `SKIPPED` |
| QEMU model unsupported | 按 `modelUnsupportedBehavior` 进入 EMU/FPGA 或人工审核 |
| EMU fail 且 FPGA 是 required final | 默认进入 `HUMAN_REVIEW`，由 owner 判断是否仍需 FPGA 复现 |
| FPGA fail | 生成失败分析和 Issue，必要时回退 EMU/QEMU 定位 |
| soft dependency fail | 下游继续执行，但带风险标记 |

## 7. 可视化页面建议

### 平台映射矩阵

按用例行、平台列展示人工标注：

| 用例 | QEMU | EMU | FPGA | 路线 | 标注人 |
| --- | --- | --- | --- | --- | --- |
| Boot API | REQUIRED | OPTIONAL | OPTIONAL | QEMU -> EMU -> FPGA | CV Owner |
| BAR/DMA | PRECHECK | OPTIONAL | REQUIRED | QEMU -> FPGA | CV Owner |
| Reset Recovery | UNSUPPORTED | REQUIRED | OPTIONAL | EMU-only | CV Owner |
| Long Stress | UNSUPPORTED | OPTIONAL | REQUIRED | FPGA-only | CV Owner |

### 执行 DAG 视图

展示用例层级、依赖边、平台节点、状态颜色、跳过原因、阻断原因。

### 跨平台结果矩阵

展示每个用例在 QEMU、EMU、FPGA 上的结果，并明确最终结论来源。

## 8. 与资源调度模块关系

用例编排只决定“应该在哪个平台执行”和“是否继续执行”，不直接占用 FPGA/EMU。实际资源申请交给资源管理与调度模块：

```text
CaseExecutionNode(EMU/FPGA READY)
  -> ResourceRequest
  -> ResourceLease
  -> ExecutionTask
  -> PlatformExecutionResult
```

QEMU/CPU 节点可以使用并发资源池，但也要保留任务、日志和结果协议。
