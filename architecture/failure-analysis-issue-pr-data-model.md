# 用例失败分析 Issue/PR 闭环数据模型

> 配套图：
>
> - `architecture/failure-analysis-issue-pr-architecture.svg`
> - `architecture/failure-analysis-issue-pr-state-machine.svg`
>
> 设计目标：参照 GitHub Issue 和 PR 的协作模式，把用例执行失败从“单条失败记录”升级为“可追踪、可讨论、可验证、可关闭”的失败管理闭环。

## 1. 核心原则

1. **失败先形成 Fail Snapshot**：任何平台失败都必须保留 result、日志、trace、dump、版本矩阵、资源和命令。
2. **失败归档为 Failure Issue**：类似 GitHub Issue，承载标题、标签、owner、状态、里程碑、讨论、关联关系和证据。
3. **修复和验证像 PR**：一个 Issue 可以关联代码 PR、patch、workaround 或纯验证请求。PR/checks 决定是否能关闭 Issue。
4. **重复失败合并**：相同签名、相似日志、同一 root cause 的失败追加到已有 Issue，而不是无限创建新 Issue。
5. **关闭必须有证据**：fixed 需要修复和验证通过；duplicate 需要主 Issue；known issue 需要链接；waived 需要风险接受审批。
6. **Agent 给建议，人保留裁决权**：失败分析 Agent 可以创建草稿、推荐标签、owner 和复跑计划，但高风险关闭、waive、owner 争议需要人工确认。

## 2. 与 GitHub 心智的映射

| GitHub 概念 | 平台概念 | 说明 |
| --- | --- | --- |
| Issue | FailureIssue | 跟踪一个失败或一类同根失败 |
| Issue labels | FailureLabel | 归因、平台、严重性、风险、状态 |
| Assignee | Owner / DRI | 负责分析或修复的人 |
| Milestone | Tapeout Milestone | 关联投片准入或阶段门 |
| Comments | FailureTimelineEvent | 讨论、Agent 输出、复跑结果、人工 override |
| Duplicate / Related | FailureRelation | 失败之间的关系 |
| Pull Request | FixProposal / ExternalPR | 代码修复、配置修复或 workaround |
| PR checks | VerificationCheck | QEMU/EMU/FPGA 复跑、CI、长稳等验证 |
| Merge gate | CloseGate | 是否允许关闭 FailureIssue |

## 3. 枚举模型

### FailureIssueStatus

| 值 | 说明 |
| --- | --- |
| `OPEN` | 新建 |
| `TRIAGING` | 归因、去重、分级中 |
| `ASSIGNED` | owner 已确认 |
| `ANALYZING` | 复现或定位中 |
| `FIX_READY` | 已关联修复 PR、patch 或 workaround |
| `VERIFYING` | 验证中 |
| `RESOLVED` | 修复验证通过，待关闭 |
| `DUPLICATE` | 重复，已合并到主 Issue |
| `WAIVED` | 风险接受或豁免 |
| `CLOSED` | 关闭 |

### FailureType

| 值 | 说明 |
| --- | --- |
| `CASE_ISSUE` | 用例本身问题 |
| `SOFTWARE_ISSUE` | driver、runtime、firmware、compiler、library 等软件问题 |
| `PLATFORM_ISSUE` | FPGA/EMU/QEMU 环境、资源、脚本或 infra 问题 |
| `DESIGN_ISSUE` | RTL/IP/SoC 设计行为问题 |
| `MODEL_ISSUE` | cmodel/amodel/QEMU 模型问题 |
| `VERSION_MISMATCH` | 版本矩阵不匹配 |
| `FLAKY` | 偶现或非确定性问题 |
| `UNKNOWN` | 尚未归因 |

### FixProposalType

| 值 | 说明 |
| --- | --- |
| `CODE_PR` | 代码 PR |
| `CONFIG_CHANGE` | 配置或参数变更 |
| `TESTCASE_FIX` | 用例修复 |
| `PLATFORM_FIX` | 平台环境或脚本修复 |
| `WORKAROUND` | 临时规避 |
| `WAIVER` | 风险接受 / 豁免 |
| `VALIDATION_ONLY` | 不改代码，只跑验证确认 |

### VerificationCheckStatus

| 值 | 说明 |
| --- | --- |
| `PENDING` | 待执行 |
| `RUNNING` | 执行中 |
| `PASSED` | 通过 |
| `FAILED` | 失败 |
| `SKIPPED` | 跳过 |
| `BLOCKED` | 阻塞 |
| `REQUIRES_REVIEW` | 需要人工判定 |

## 4. 实体模型

### FailSnapshot

一次具体执行失败的完整现场。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | snapshot ID |
| `executionNodeId` | string | 用例执行节点 |
| `caseId` | string | 用例 |
| `platform` | ExecutionPlatform | QEMU/EMU/FPGA |
| `resultId` | string | 平台执行结果 |
| `versionMatrixId` | string | 版本矩阵 |
| `resourceUnitId` | string? | 资源 |
| `expected` | string | 期望 |
| `actual` | string | 实际 |
| `exitCode` | string? | 返回码 |
| `failureSignature` | string | 归一化失败签名 |
| `logArtifactRefs` | string[] | 日志 |
| `traceArtifactRefs` | string[] | trace/dump/波形 |
| `reproCommand` | string? | 复现命令 |
| `createdAt` | datetime | 时间 |

### FailureIssue

类似 GitHub Issue 的失败管理对象。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | Issue ID |
| `title` | string | 标题 |
| `status` | FailureIssueStatus | 状态 |
| `severity` | string | blocker / critical / major / minor |
| `priority` | string | P0-P4 |
| `failureType` | FailureType | 初步归因 |
| `confidence` | number | 归因置信度 |
| `projectId` | string | 项目 |
| `module` | string | 模块 |
| `ownerId` | string? | 当前 owner |
| `milestoneId` | string? | 里程碑 |
| `firstSeenAt` | datetime | 首次发现 |
| `lastSeenAt` | datetime | 最近出现 |
| `occurrenceCount` | number | 出现次数 |
| `primarySnapshotId` | string | 主失败现场 |
| `rootCauseSummary` | string? | 根因摘要 |
| `resolution` | string? | fixed / duplicate / known_issue / waived / obsolete / not_reproducible |
| `closeReason` | string? | 关闭理由 |
| `closedAt` | datetime? | 关闭时间 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### FailureIssueOccurrence

一个 Issue 可以聚合多次失败。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | occurrence ID |
| `issueId` | string | FailureIssue |
| `snapshotId` | string | FailSnapshot |
| `caseId` | string | 用例 |
| `platform` | ExecutionPlatform | 平台 |
| `versionMatrixId` | string | 版本 |
| `matchedBy` | string | agent / human / rule |
| `matchConfidence` | number | 聚类置信度 |
| `createdAt` | datetime | 时间 |

### FailureLabel

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | label ID |
| `name` | string | 标签名 |
| `category` | string | type / platform / risk / state / owner |
| `color` | string | 展示颜色 |
| `description` | string | 描述 |

### FailureIssueLabel

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `issueId` | string | Issue |
| `labelId` | string | Label |
| `addedBy` | string | 添加人或 Agent |
| `createdAt` | datetime | 时间 |

### FailureTimelineEvent

类似 GitHub Issue timeline。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | timeline event ID |
| `issueId` | string | Issue |
| `eventType` | string | comment / status_change / label_added / owner_changed / agent_summary / check_result |
| `actorType` | string | human / agent / system |
| `actorId` | string | actor |
| `body` | text | 内容 |
| `payload` | json | 结构化详情 |
| `artifactRefs` | string[] | 证据 |
| `createdAt` | datetime | 时间 |

### FailureRelation

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | relation ID |
| `sourceIssueId` | string | 源 Issue |
| `targetIssueId` | string | 目标 Issue |
| `relationType` | string | duplicate / related / blocks / blocked_by / caused_by |
| `reason` | string | 关系原因 |
| `createdBy` | string | 创建人或 Agent |
| `createdAt` | datetime | 时间 |

### FixProposal

类似 PR 或修复提案。可以关联真实 GitHub/GitLab PR，也可以是平台内部验证请求。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | proposal ID |
| `issueId` | string | 关联 FailureIssue |
| `type` | FixProposalType | 类型 |
| `title` | string | 标题 |
| `description` | text | 说明 |
| `externalPrUrl` | string? | GitHub/GitLab PR URL |
| `branch` | string? | 分支 |
| `commitSha` | string? | commit |
| `authorId` | string | 作者 |
| `reviewerIds` | string[] | reviewers |
| `status` | string | draft / open / reviewing / checking / approved / merged / closed |
| `createdAt` / `updatedAt` | datetime | 审计 |

### VerificationPlan

PR/checks 背后的验证计划。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | plan ID |
| `issueId` | string | Issue |
| `fixProposalId` | string? | FixProposal |
| `versionMatrixId` | string | 验证版本 |
| `scope` | json | 需要复跑的用例、平台、资源要求 |
| `requiredPlatforms` | ExecutionPlatform[] | required checks 平台 |
| `createdBy` | string | human / agent / system |
| `status` | string | draft / running / completed / failed / cancelled |

### VerificationCheck

类似 PR checks。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | check ID |
| `verificationPlanId` | string | plan |
| `name` | string | check 名称 |
| `platform` | ExecutionPlatform | 平台 |
| `caseIds` | string[] | 用例集合 |
| `executionPlanId` | string? | 关联执行计划 |
| `status` | VerificationCheckStatus | 状态 |
| `required` | boolean | 是否必须通过 |
| `resultSummary` | string? | 结果摘要 |
| `artifactRefs` | string[] | 证据 |
| `startedAt` / `finishedAt` | datetime? | 时间 |

### CloseGateEvaluation

关闭门禁评估。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | gate ID |
| `issueId` | string | Issue |
| `evaluatedBy` | string | agent / human / system |
| `allowed` | boolean | 是否允许关闭 |
| `requiredEvidenceReady` | boolean | 证据是否齐全 |
| `requiredChecksPassed` | boolean | required checks 是否通过 |
| `ownerApproved` | boolean | owner 是否确认 |
| `riskAccepted` | boolean | 风险是否接受 |
| `blockReasons` | string[] | 阻塞原因 |
| `createdAt` | datetime | 时间 |

## 5. 关系约束

```text
FailSnapshot N -- 1 PlatformExecutionResult
FailureIssue 1 -- N FailureIssueOccurrence
FailureIssueOccurrence N -- 1 FailSnapshot
FailureIssue N -- N FailureLabel via FailureIssueLabel
FailureIssue 1 -- N FailureTimelineEvent
FailureIssue 1 -- N FailureRelation
FailureIssue 1 -- N FixProposal
FailureIssue 1 -- N VerificationPlan
VerificationPlan 1 -- N VerificationCheck
FailureIssue 1 -- N CloseGateEvaluation
```

关键约束：

- `FailureIssue.primarySnapshotId` 必须引用一个 FailSnapshot。
- `FailureIssueOccurrence.snapshotId` 不能重复关联多个 active Issue，除非作为 related evidence。
- `DUPLICATE` Issue 必须有 `FailureRelation(type=duplicate)` 指向主 Issue。
- `WAIVED` Issue 必须有关联审批事件和风险接受说明。
- `CLOSED` Issue 必须有最近一次 `CloseGateEvaluation.allowed=true`。

## 6. 自动化触发建议

| 事件 | 规则 | Agent |
| --- | --- | --- |
| `execution.node.failed` | 失败节点生成 FailSnapshot | Snapshot Builder Agent |
| `fail_snapshot.created` | 新失败需要归因 | Triage Agent |
| `fail_snapshot.created` | 查找历史相似失败 | Duplicate / Cluster Agent |
| `failure_issue.opened` | 推荐 owner | Owner Routing Agent |
| `failure_issue.assigned` | 生成复现计划 | Repro Plan Agent |
| `fix_proposal.opened` | 生成验证计划 | Fix Verification Agent |
| `verification_check.failed` | 回写 Issue timeline | Failure Report Agent |
| `verification_plan.completed` | 评估关闭门禁 | Close Gate Agent |

每条规则仍遵守通用编排模块的 1:1 触发：一条规则只触发一个 AgentRun。

## 7. 关闭策略

| Resolution | 必要条件 |
| --- | --- |
| `fixed` | 修复 PR merged 或 fix proposal approved；required verification checks passed；owner approved |
| `duplicate` | 关联主 Issue；主 Issue 未关闭或已有完整证据 |
| `known_issue` | 链接已知问题库；风险和影响范围明确 |
| `waived` | 风险接受审批通过；里程碑影响记录 |
| `not_reproducible` | 多次复跑不复现；保存复跑证据 |
| `obsolete` | 版本已废弃或用例已废弃；有版本/用例变更证据 |

## 8. 可视化页面建议

### Failure Board

类似 GitHub project board：

- Open
- Triaging
- Assigned
- Analyzing
- Fix Ready
- Verifying
- Resolved
- Closed

### Failure Issue Detail

页面结构：

- Header：标题、状态、severity、priority、owner、milestone。
- Labels：归因、平台、风险、flaky、known issue。
- Evidence：FailSnapshot、日志、trace、dump、复现命令。
- Timeline：评论、Agent 输出、复跑结果、状态变化。
- Relations：duplicate、related、blocks、linked PR。
- Verification：required checks 和验证计划。
- Close Gate：是否允许关闭，阻塞原因。

### Verification Matrix

按平台展示 checks：

| Check | QEMU | EMU | FPGA | Required |
| --- | --- | --- | --- | --- |
| Repro original fail | pass/fail | pass/fail | pass/fail | yes |
| Verify fix | pass/fail | pass/fail | pass/fail | yes |
| Regression slice | pass/fail | pass/fail | pass/fail | depends |
| Long stress | skipped | optional | pass/fail | depends |

## 9. 与其他模块关系

- **用例执行编排**：提供 `PlatformExecutionResult` 和 `FailSnapshot` 来源。
- **事件规则 Agent 编排**：负责触发 triage、dedupe、owner routing、verification、close gate Agent。
- **资源管理与调度**：复跑、定位、验证 checks 需要申请 QEMU/EMU/FPGA 资源。
- **PR 管理**：同步外部 GitHub/GitLab PR 状态、review、CI、merge。
- **里程碑管理**：FailureIssue 的 severity、milestone 和 close gate 影响投片准入。
