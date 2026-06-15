# 用例失败分析 Issue/PR 闭环设计

> 架构图：`architecture/failure-analysis-issue-pr-architecture.svg`
>
> 状态机：`architecture/failure-analysis-issue-pr-state-machine.svg`
>
> 数据模型：`architecture/failure-analysis-issue-pr-data-model.md`

## 1. 定位

用例执行失败分析可以借鉴 GitHub Issue 和 PR 的协作模型：

- **Failure Issue**：像 GitHub Issue 一样跟踪失败，包括标签、owner、milestone、评论、关联关系、证据和关闭原因。
- **Fix / Verification PR**：像 GitHub PR 一样跟踪修复、评审、CI/checks、验证计划和关闭门禁。

这样失败不只是“某次执行 failed”，而是进入一个可协作、可追溯、可验证的闭环。

## 2. 架构图

![用例失败分析 Issue/PR 闭环架构](./failure-analysis-issue-pr-architecture.svg)

## 3. 状态机

![Failure Issue 与 Fix PR 状态机](./failure-analysis-issue-pr-state-machine.svg)

## 4. 关键对象

### Fail Snapshot

每次执行失败都先形成现场快照，包括：

- result.json
- case.log
- trace / dump / waveform
- expected / actual
- checkpoint
- 平台、资源、版本矩阵
- 复现命令

Fail Snapshot 是后续 Issue、Agent 分析、复跑和关闭证据的基础。

### Failure Issue

对应 GitHub Issue，用来管理一个失败或一类同根失败：

- title / status / severity / priority
- owner / milestone / labels
- failure type / confidence
- primary snapshot
- occurrences
- timeline
- duplicate / related / blocks
- linked PR / verification plan
- close criteria

### Fix / Verification PR

对应 GitHub PR 或平台内部验证请求：

- 代码 PR、配置修复、用例修复、平台修复、workaround 或 waiver。
- 关联 review、CI、QEMU/EMU/FPGA checks。
- required checks 通过后才能关闭 Issue。

## 5. 推荐流程

1. `CaseExecutionNode` 失败，生成 `FailSnapshot`。
2. 事件 `fail_snapshot.created` 触发 Triage Agent。
3. Duplicate / Cluster Agent 判断是否追加到已有 Failure Issue。
4. 如果是新失败，创建 Failure Issue，自动打标签、分级、推荐 owner。
5. Owner 确认后进入分析，生成复现计划或定位计划。
6. 修复产生 FixProposal 或关联外部 PR。
7. Fix Verification Agent 生成 VerificationPlan 和 required checks。
8. QEMU/EMU/FPGA 验证结果回写 Issue timeline。
9. Close Gate Agent 评估是否允许关闭。
10. 满足证据和 checks 后关闭；否则回到分析或修复状态。

## 6. GitHub 思路在平台中的落点

| GitHub 思路 | 平台落点 |
| --- | --- |
| Issue 管失败 | FailureIssue 管失败闭环 |
| Labels 分类 | failure type、platform、risk、flaky、known issue |
| Assignee 负责 | owner / DRI |
| Milestone 归属 | 投片准入阶段门 |
| Comments / timeline | Agent 输出、人工分析、复跑证据 |
| Duplicate / related | FailureRelation |
| PR 修复 | FixProposal / External PR |
| Checks 门禁 | VerificationCheck |
| Merge 后关闭 | CloseGateEvaluation |

## 7. 与自动化编排的关系

失败分析本身也走通用事件规则 Agent 编排模块：

```text
execution.node.failed
  -> fail_snapshot.created
  -> triage rule
  -> Triage AgentRun
  -> failure_issue.opened / failure_issue.updated
```

每条规则仍然遵守 1:1：一条规则触发一个 AgentRun。多个 Agent 协作则拆成多个规则，或者由一个 AgentRun 内部调用 subagent。

## 8. 关闭要求

Issue 不能只靠人工口头关闭。关闭必须满足至少一种受控 resolution：

- `fixed`：修复已合入或 fix proposal approved，required verification checks 通过。
- `duplicate`：有主 Issue 链接。
- `known_issue`：有已知问题链接和影响范围。
- `waived`：有风险接受审批。
- `not_reproducible`：有多次复跑不复现证据。
- `obsolete`：版本或用例已废弃，有变更证据。

## 9. 下一步可细化

1. Failure Board UI。
2. Failure Issue Detail 页面。
3. Verification Matrix 页面。
4. 失败签名和 duplicate/cluster 算法。
5. Close Gate 规则。
6. 与外部 GitHub/GitLab PR 的同步协议。
