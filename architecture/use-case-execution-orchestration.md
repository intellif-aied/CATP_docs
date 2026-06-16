# 用例执行编排二级设计

> 参考图：`image.png`
>
> 架构图：`architecture/use-case-execution-orchestration.svg`
>
> 状态机：`architecture/use-case-execution-state-machine.svg`
>
> 数据模型：`architecture/use-case-execution-data-model.md`

## 1. 定位

用例执行编排模块解决的是：**一个用例应该在哪些平台执行、按什么顺序执行、失败后是否继续、最终结论来自哪个平台**。

它不是简单把所有用例都放到同一个回归队列，也不是让所有用例都走 `QEMU -> EMU -> FPGA`。平台路线要由人标注，系统根据标注、依赖和失败策略自动编排。

## 2. 架构图

![用例执行编排二级架构](./use-case-execution-orchestration.svg)

## 3. ExecutionGraph 与状态机

![ExecutionGraph 与用例节点状态机](./use-case-execution-state-machine.svg)

## 4. 核心设计

### 人工标注平台归属

每个用例都需要标注它在 QEMU、EMU、FPGA 上的适配关系：

- `REQUIRED`：必须执行。
- `PRECHECK`：预筛，失败可阻断后续高成本平台。
- `OPTIONAL`：可选补充证据。
- `FALLBACK`：当前面平台不支持或失败类型需要时执行。
- `UNSUPPORTED`：不支持，不应调度。
- `HUMAN_REVIEW`：需要人工判断。

标注必须记录标注人、理由、证据和适用版本。Agent 可以给建议，但不能无痕覆盖人工标注。

### 用例执行是 DAG

基础用例、通用用例、EMU 强化用例、FPGA 强化用例之间不是简单上下层，而是通过依赖边表达顺序：

- `BLOCKING`：上游失败，下游 blocked。
- `SOFT`：上游失败，下游继续但带风险。
- `EVIDENCE`：上游结果只是证据。
- `MANUAL_GATE`：上游失败后需要人工决定是否继续。

### QEMU 预筛失败跳过后续

如果同一个用例既能在 QEMU 上跑，也能在 FPGA/EMU 上跑，并且 QEMU 被标注为 `PRECHECK`，那么：

- QEMU pass：继续跑后续 EMU/FPGA。
- QEMU fail：后续 EMU/FPGA 节点 `SKIPPED`，节省稀缺资源。
- QEMU model unsupported：不能当成真实 fail，应按人工标注进入 EMU/FPGA 或人工审核。

### 基础 gate 失败阻断下游

如果基础用例是 gate，例如 boot、基础寄存器访问、基础 API 初始化失败，那么依赖它的上层用例不再继续执行，状态为 `BLOCKED`，并记录上游失败原因。

## 5. 典型路线

| 路线 | 适用场景 |
| --- | --- |
| `QEMU -> EMU -> FPGA` | 通用软件用例、高风险关键路径、需要逐步收敛 |
| `QEMU -> EMU` | 复杂内部状态、需要 trace，但不强依赖真实板卡 |
| `QEMU -> FPGA` | QEMU 可预筛，最终必须真实硬件闭环 |
| `EMU-only` | QEMU/model 不支持，需要可观测硬件行为 |
| `FPGA-only` | 必须真实板卡、外设、长稳或真实性能趋势 |
| `QEMU-only` | 基础 API、参数、寄存器、CI 冒烟 |

## 6. 和其他模块关系

- **资源管理与调度**：用例编排生成 `ExecutionGraph` 和 `CaseExecutionNode`，执行驱动器 (Execution Driver) 监控资源状态并遍历执行图，找到资源条件满足的 READY 节点后下发任务；资源策略、抢占和独占租约仍由资源调度模块负责。
- **事件规则 Agent 编排**：任务完成或失败后发布事件，触发失败分析、复跑、问题定位或报告 Agent。
- **用例管理**：维护平台标注、依赖、层级、owner、风险等级。
- **结果管理**：合并多平台执行结果，形成最终结论和准入证据。

## 7. 下一步可细化

1. 平台映射矩阵的 UI 交互。
2. DAG 自动生成和人工修正流程。
3. QEMU model unsupported 的分类规则。
4. 跨平台结果合并规则。
5. 执行 DAG 与资源租约的联动。
