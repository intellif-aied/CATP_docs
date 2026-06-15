# 通用事件规则与 Managed Agent 编排设计

> 架构图：`architecture/automation-orchestration-architecture.svg`
>
> 状态机：`architecture/automation-orchestration-state-machines.svg`
>
> 数据模型：`architecture/automation-orchestration-data-model.md`

## 1. 定位

这不是某一个业务模块，而是平台级通用自动化模块。需求管理、用例管理、资源调度、执行任务、Issue、PR、里程碑都可以通过它发布事件、配置规则、触发 Agent。

核心链路：

```text
Event -> Rule Match -> RuleActivation -> AgentRun -> Agent Result -> Event
```

## 2. 架构图

![通用事件规则与 Managed Agent 编排架构](./automation-orchestration-architecture.svg)

## 3. 状态机图

![事件规则 Agent 编排状态机](./automation-orchestration-state-machines.svg)

## 4. 规则与 Agent 1:1 触发

这里建议采用两层 1:1：

### 配置层 1:1

一条启用规则只绑定一个 Agent 触发配置：

```text
AutomationRule 1 -- 1 RuleAgentBinding 1 -- 1 AgentTriggerConfig
```

Agent 模板可以复用，但触发配置不能混用。这样同一个失败分析 Agent 可以被多个规则复用，同时每条规则仍然只有一个明确的触发目标。

### 运行层 1:1

一次规则命中只创建一个 AgentRun：

```text
RuleActivation 1 -- 1 AgentRun
```

如果一个事件同时满足三条规则，则创建三个 `RuleActivation` 和三个 `AgentRun`。如果一个业务目标内部需要多个子 Agent 协作，则由一个 AgentRun 内部使用 subagent，不在规则触发层拆散。

## 5. 模块边界

### 事件驱动引擎

负责事件接入、schema 校验、幂等去重、事件存储、路由、死信和回放。

它只处理事实，不做业务判断。例如 `execution.task.failed` 只说明任务失败，不决定是否复跑、是否定位、是否建 Issue。

### 规则引擎

负责判断事件是否应该触发自动化。规则读取事件和上下文，计算条件，写入命中/跳过原因，再通过 `RuleAgentBinding` 创建一个 AgentRun。

规则不直接执行业务动作。业务动作由 Agent 输出后经过 validator 和 committer 处理。

### Managed Agent 平台

负责管理 Agent 模板、版本、输入输出 schema、MCP 工具、Skill、Subagent、Runtime、预算、超时、工具调用和输出校验。

Agent 不直接绕过平台改数据。它输出结构化建议或动作，由 Result Committer 写入业务对象或发布下一轮事件。

### 治理与观测

负责解释、审计、安全、质量和回放：

- 为什么这个事件触发了这个规则。
- 为什么这个规则拉起了这个 Agent。
- Agent 用了哪些上下文和工具。
- 输出证据是什么。
- 是否需要人工审批。
- 历史事件重放时规则是否会改变行为。

## 6. 典型触发关系

| 事件 | 规则 | Agent |
| --- | --- | --- |
| `resource.lease.expiring` | 租约即将过期且 owner 是人工 | 资源租约助手 Agent |
| `execution.task.failed` | 任务失败且不是已知平台异常 | 失败分析 Agent |
| `execution.task.failed` | 失败类型疑似 infra fail | 复跑决策 Agent |
| `pr.updated` | PR 影响验证相关路径 | 变更影响 Agent |
| `case.updated` | 用例参数或脚本变更 | 增量回归选择 Agent |
| `milestone.risk.changed` | 准入风险升高 | 报告 Agent |

注意：一个事件可以命中多条规则，但每条规则只触发一个 AgentRun。

## 7. 设计收益

- **通用**：业务模块不需要硬编码 Agent 调用。
- **可解释**：每次触发都有事件、规则、上下文、Agent 版本和输出证据。
- **可治理**：高风险动作可以审批，工具权限可控。
- **可回放**：历史事件可以 dry-run 新规则，避免规则上线后误触发。
- **可插拔**：Agent、MCP、Skill、Subagent 都通过版本和绑定配置管理。

## 8. 下一步拆分建议

1. Automation Studio：事件流、规则列表、Agent 绑定、运行 trace 可视化。
2. 规则表达式 DSL：条件语法、上下文查询、去重和节流。
3. Agent Runtime：预算、超时、并发、重试、取消、输出校验。
4. MCP/Skill/Subagent 权限：按项目、规则、Agent 版本授权。
5. 业务动作协议：Agent 输出如何安全转成任务、Issue、通知或资源申请。
