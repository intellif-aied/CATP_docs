# 通用事件规则与 Managed Agent 编排数据模型

> 配套图：
>
> - `architecture/automation-orchestration-architecture.svg`
> - `architecture/automation-orchestration-state-machines.svg`
>
> 设计目标：把事件驱动、规则引擎、Managed Agent Runtime 做成通用模块。业务模块只负责发布标准事件和接收 Agent 输出，不直接硬编码自动化流程。

## 1. 核心原则

1. **事件只表达事实**：事件描述发生了什么，不描述应该怎么处理。
2. **规则负责判断是否触发**：规则读取事件和上下文，产出可解释的触发/跳过决策。
3. **规则与 Agent 触发 1:1**：配置层一条启用规则只绑定一个 Agent Trigger；运行层一个 `RuleActivation` 只创建一个 `AgentRun`。
4. **Agent 模板可复用**：同一个 `AgentTemplate` 可以被不同规则复用，但每条规则都有自己的 `RuleAgentBinding`、输入映射和输出处理。
5. **Agent 结果回到事件总线**：Agent 完成后发布 `agent.completed`、`agent.failed` 或业务结果事件，继续由规则处理。
6. **所有自动化可回放**：事件、规则上下文、决策理由、Agent 输入输出、工具调用都必须可追溯。

## 2. 1:1 触发语义

### 配置层

```text
AutomationRule 1 -- 1 RuleAgentBinding 1 -- 1 AgentTriggerConfig
AgentTriggerConfig N -- 1 AgentTemplate
```

解释：

- 每条启用规则只能绑定一个 Agent 触发配置。
- Agent 模板可以复用，因为复用的是实现，不是触发关系。
- 如果同一个 Agent 能力需要处理多个场景，创建多条规则和多个绑定。

### 运行层

```text
RuleActivation 1 -- 1 AgentRun
AgentRun 1 -- 1 RuleActivation
```

解释：

- 一个事件可以命中多条规则。
- 每条规则命中生成一个 `RuleActivation`。
- 每个 `RuleActivation` 只能创建一个 `AgentRun`。
- 如果业务需要多个 Agent 并行，要么拆成多条规则，要么由一个 AgentRun 内部使用 subagent。

## 3. 枚举模型

### EventStatus

| 值 | 说明 |
| --- | --- |
| `RECEIVED` | 已接收 |
| `VALIDATED` | schema 校验通过 |
| `STORED` | 已持久化 |
| `ROUTED` | 已投递规则匹配 |
| `MATCHED` | 已完成规则匹配 |
| `PROCESSED` | 规则处理完成 |
| `DLQ` | 进入死信队列 |
| `REPLAYED` | 被重放 |

### RuleStatus

| 值 | 说明 |
| --- | --- |
| `DRAFT` | 草稿 |
| `ENABLED` | 启用 |
| `DISABLED` | 停用 |
| `CANARY` | 灰度 |
| `ARCHIVED` | 归档 |

### RuleActivationStatus

| 值 | 说明 |
| --- | --- |
| `MATCHED` | 事件初步命中规则 |
| `CONTEXT_READY` | 上下文已装载 |
| `EVALUATED` | 条件已计算 |
| `TRIGGERED` | 已触发 AgentRun |
| `SKIPPED` | 条件不满足、节流或去重跳过 |
| `AGENT_LINKED` | 已绑定 AgentRun |
| `COMPLETED` | 等待 AgentRun 完成 |
| `FAILED` | 规则处理失败 |

### AgentRunStatus

| 值 | 说明 |
| --- | --- |
| `CREATED` | 已创建 |
| `QUEUED` | 等待执行 |
| `RUNNING` | 执行中 |
| `TOOL_CALLING` | 正在调用工具 |
| `VALIDATING` | 输出校验中 |
| `SUCCESS` | 成功 |
| `FAILED` | 失败 |
| `CANCELLED` | 取消 |
| `HUMAN_REVIEW` | 需要人工确认 |
| `EVENT_OUT` | 已发布结果事件 |

## 4. 实体模型

### EventSchema

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | schema ID |
| `eventType` | string | 例如 `resource.lease.expiring` |
| `version` | string | schema 版本 |
| `jsonSchema` | json | payload schema |
| `compatibility` | string | backward / strict |
| `ownerModule` | string | 事件所属模块 |
| `enabled` | boolean | 是否启用 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### EventRecord

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 事件 ID |
| `eventType` | string | 事件类型 |
| `schemaVersion` | string | schema 版本 |
| `source` | string | 来源模块或外部系统 |
| `subjectType` | string | 业务对象类型 |
| `subjectId` | string | 业务对象 ID |
| `projectId` | string? | 项目范围 |
| `traceId` | string | 链路 ID |
| `idempotencyKey` | string | 幂等键 |
| `payload` | json | 事件事实 |
| `status` | EventStatus | 状态 |
| `occurredAt` | datetime | 发生时间 |
| `receivedAt` | datetime | 接收时间 |

### AutomationRule

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 规则 ID |
| `name` | string | 规则名称 |
| `status` | RuleStatus | 状态 |
| `scopeType` | string | global / project / module / resource_pool |
| `scopeId` | string? | 作用域 ID |
| `eventTypes` | string[] | 监听的事件类型 |
| `conditionExpression` | string | 条件表达式 |
| `contextQuerySpec` | json | 需要装载的上下文 |
| `priority` | number | 规则处理优先级 |
| `debounceWindowSeconds` | number | 防抖窗口 |
| `throttleLimit` | number? | 限流 |
| `dedupWindowSeconds` | number | 同类事件去重窗口 |
| `explainTemplate` | string | 解释模板 |
| `version` | string | 规则版本 |
| `owner` | string | 规则 owner |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### RuleAgentBinding

一条启用规则对应一条绑定。这里是配置层 1:1 的核心约束。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 绑定 ID |
| `ruleId` | string | 规则 ID，唯一 |
| `agentTriggerConfigId` | string | Agent 触发配置 ID，唯一 |
| `inputMapping` | json | event/context 到 Agent 输入的映射 |
| `outputMapping` | json | Agent 输出到业务动作/事件的映射 |
| `requiresHumanApproval` | boolean | 是否需要人工审批后触发 |
| `enabled` | boolean | 是否启用 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### AgentTemplate

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | Agent 模板 ID |
| `name` | string | 名称 |
| `purpose` | string | 明确目标，例如失败分析、资源调度、报告生成 |
| `owner` | string | 维护人 |
| `capabilities` | string[] | 能力声明 |
| `defaultModel` | string | 默认模型 |
| `riskLevel` | string | low / medium / high / critical |
| `enabled` | boolean | 是否启用 |

### AgentVersion

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 版本 ID |
| `templateId` | string | AgentTemplate ID |
| `version` | string | 版本号 |
| `systemPrompt` | text | 系统提示词 |
| `inputSchema` | json | 输入 schema |
| `outputSchema` | json | 输出 schema |
| `skillRefs` | string[] | 可用 Skill |
| `mcpToolRefs` | string[] | 可用 MCP Tool |
| `subagentRefs` | string[] | 可用 Subagent |
| `releaseState` | string | draft / canary / stable / retired |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### AgentTriggerConfig

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 触发配置 ID |
| `agentVersionId` | string | Agent 版本 |
| `queueName` | string | 运行队列 |
| `timeoutSeconds` | number | 超时 |
| `maxRetries` | number | 最大重试 |
| `budget` | json | token、工具调用、成本预算 |
| `concurrencyKeyTemplate` | string | 并发锁 key |
| `requiresApproval` | boolean | 是否需要审批 |
| `guardrailPolicyId` | string? | 治理策略 |
| `enabled` | boolean | 是否启用 |

### RuleActivation

运行层规则命中记录。一个 `RuleActivation` 必须对应且只对应一个 `AgentRun`，除非状态为 `SKIPPED` 或 `FAILED`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | activation ID |
| `eventId` | string | 事件 ID |
| `ruleId` | string | 规则 ID |
| `bindingId` | string | RuleAgentBinding ID |
| `status` | RuleActivationStatus | 状态 |
| `contextSnapshot` | json | 上下文快照 |
| `conditionResult` | boolean | 条件结果 |
| `skipReason` | string? | 跳过原因 |
| `decisionReason` | string | 触发/跳过解释 |
| `agentRunId` | string? | AgentRun ID，触发时唯一 |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

### AgentRun

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | AgentRun ID |
| `ruleActivationId` | string | RuleActivation ID，唯一 |
| `agentVersionId` | string | Agent 版本 |
| `status` | AgentRunStatus | 状态 |
| `inputPayload` | json | 输入包 |
| `outputPayload` | json? | 输出 |
| `confidence` | number? | 置信度 |
| `evidenceRefs` | string[] | 证据 artifact |
| `toolCallCount` | number | 工具调用次数 |
| `cost` | json | token、耗时、费用 |
| `errorCode` | string? | 错误码 |
| `errorMessage` | string? | 错误信息 |
| `startedAt` / `finishedAt` | datetime? | 起止时间 |

### AgentToolCall

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | tool call ID |
| `agentRunId` | string | AgentRun ID |
| `toolType` | string | mcp / skill / subagent / api |
| `toolName` | string | 工具名 |
| `inputSummary` | string | 输入摘要 |
| `outputSummary` | string | 输出摘要 |
| `status` | string | success / failed / denied |
| `durationMs` | number | 耗时 |
| `riskLevel` | string | 风险等级 |
| `createdAt` | datetime | 时间 |

### AutomationAction

Agent 结果转成的业务动作或输出事件。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | action ID |
| `agentRunId` | string | AgentRun ID |
| `actionType` | string | create_task / update_issue / request_resource / publish_event |
| `targetType` | string | 目标对象类型 |
| `targetId` | string? | 目标对象 ID |
| `payload` | json | 动作内容 |
| `requiresApproval` | boolean | 是否需要审批 |
| `status` | string | pending / applied / rejected / failed |
| `createdAt` / `updatedAt` | datetime | 审计字段 |

## 5. 关系约束

```text
EventSchema 1 -- N EventRecord
EventRecord 1 -- N RuleActivation
AutomationRule 1 -- 1 RuleAgentBinding
RuleAgentBinding 1 -- 1 AgentTriggerConfig
AgentTriggerConfig N -- 1 AgentVersion
AgentVersion N -- 1 AgentTemplate
RuleActivation 1 -- 1 AgentRun
AgentRun 1 -- N AgentToolCall
AgentRun 1 -- N AutomationAction
AgentRun 0..1 -- N EventRecord
```

数据库建议约束：

- `RuleAgentBinding.ruleId` 唯一。
- `RuleAgentBinding.agentTriggerConfigId` 唯一。
- `AgentRun.ruleActivationId` 唯一且非空。
- `RuleActivation.agentRunId` 触发后唯一。
- `EventRecord.idempotencyKey` 在去重窗口内唯一。

## 6. 通用触发流程

1. 业务模块或外部系统发布标准事件。
2. Event Ingress 校验来源、schema、幂等键。
3. Event Store 持久化事件。
4. Event Router 找到监听该 `eventType` 的规则。
5. Rule Engine 为每条候选规则装载上下文。
6. Condition Evaluator 判断规则是否命中。
7. 命中则创建 `RuleActivation`。
8. 根据 `RuleAgentBinding` 创建且只创建一个 `AgentRun`。
9. Agent Runtime 运行 Agent，按配置加载 MCP、Skill、Subagent。
10. Output Validator 校验 Agent 输出。
11. Result Committer 写入业务动作、artifact、trace。
12. 发布 `agent.completed` 或业务结果事件，进入下一轮规则匹配。

## 7. 典型规则示例

### 资源租约快到期触发提醒 Agent

```json
{
  "name": "资源租约到期提醒",
  "eventTypes": ["resource.lease.expiring"],
  "conditionExpression": "payload.remainingMinutes <= 30 && payload.consumerType == 'HUMAN'",
  "contextQuerySpec": {
    "include": ["resourceUnit", "currentLease", "owner", "nextReservation"]
  },
  "binding": {
    "agent": "resource-lease-assistant@1.0.0",
    "inputMapping": {
      "lease": "$event.payload",
      "resource": "$context.resourceUnit",
      "owner": "$context.owner"
    }
  }
}
```

触发结果：一个规则命中创建一个 `AgentRun`，该 AgentRun 只负责生成续约/释放建议和通知内容。

### 任务失败触发失败分析 Agent

```json
{
  "name": "执行任务失败分析",
  "eventTypes": ["execution.task.failed"],
  "conditionExpression": "payload.result in ['FAIL', 'TIMEOUT', 'INFRA_FAIL']",
  "contextQuerySpec": {
    "include": ["case", "resource", "versionMatrix", "artifacts", "historicalFailures"]
  },
  "binding": {
    "agent": "failure-analysis-agent@2.1.0",
    "inputMapping": {
      "task": "$event.payload",
      "case": "$context.case",
      "artifacts": "$context.artifacts"
    }
  }
}
```

触发结果：一个失败任务事件可以命中多个规则，但这条规则只创建一个失败分析 AgentRun。

### PR 更新触发变更影响 Agent

```json
{
  "name": "PR 变更影响分析",
  "eventTypes": ["pr.updated"],
  "conditionExpression": "payload.changedFilesCount > 0 && payload.targetBranch in ['main', 'release']",
  "contextQuerySpec": {
    "include": ["requirements", "caseMapping", "moduleOwners", "recentResults"]
  },
  "binding": {
    "agent": "change-impact-agent@1.3.0",
    "inputMapping": {
      "pr": "$event.payload",
      "caseMapping": "$context.caseMapping"
    }
  }
}
```

## 8. Managed Agent 通用能力

每个 Agent 都必须声明：

- **purpose**：明确目的，不允许泛化成万能 Agent。
- **inputSchema**：输入结构。
- **outputSchema**：输出结构。
- **capabilities**：能力声明。
- **mcpToolRefs**：可调用工具。
- **skillRefs**：可用 Skill。
- **subagentRefs**：可用 Subagent。
- **riskLevel**：风险等级。
- **guardrailPolicyId**：治理策略。

Agent 输出必须包含：

- `summary`：结论摘要。
- `confidence`：置信度。
- `evidenceRefs`：证据链接。
- `recommendedActions`：建议动作。
- `requiresHumanApproval`：是否需要人工确认。
- `emittedEvents`：输出事件。

## 9. 可视化页面建议

通用编排模块需要一个“Automation Studio”：

| 视图 | 用途 |
| --- | --- |
| 事件流 | 查看事件接入、schema、payload、trace |
| 规则列表 | 管理规则状态、作用域、条件、版本、灰度 |
| 规则-Agent 绑定 | 展示 1:1 绑定关系，防止一条规则触发多个 Agent |
| Agent Registry | 管理模板、版本、输入输出 schema、工具权限 |
| AgentRun Trace | 查看上下文、prompt、tool call、输出、成本 |
| 回放与 Dry-run | 对历史事件重放规则，不实际触发业务动作 |
| 审批中心 | 对高风险 Agent 动作进行人工确认 |

## 10. 后续可继续细化

1. 规则表达式 DSL 与上下文查询协议。
2. Agent Runtime 沙箱、预算、超时、并发控制。
3. MCP / Skill / Subagent 权限模型。
4. Automation Studio 交互设计。
5. Agent 输出 schema 与业务动作协议。
6. 事件重放、规则 dry-run、Agent 回归测试样例库。
