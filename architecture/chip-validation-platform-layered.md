# 芯片软件验证自动化平台分层架构

> SVG 主图：`architecture/chip-validation-platform-layered.svg`
>
> 模块细节：`architecture/chip-validation-platform-module-details.md`
>
> Mermaid 旧图源：`architecture/chip-validation-platform-layered.mmd`
>
> 这张图用于先理解平台结构。它弱化具体业务流程，强调平台从资源底座到展示层的五层关系。SVG 是当前主图，便于在 draw.io、Figma、浏览器或矢量编辑软件中继续修改。

## SVG 分层图

![芯片软件验证自动化平台五层分层架构](./chip-validation-platform-layered.svg)

## 文件说明

- `chip-validation-platform-layered.svg`：主图，适合放到方案文档或导入画图软件继续修改。
- `chip-validation-platform-module-details.md`：每个模块的职责、输入、输出和关键设计点。
- `chip-validation-platform-layered.mmd`：保留的 Mermaid 简图，适合快速改结构。

## 五层职责

### 第一层：基础资源与存储层

这一层是平台真正能操作和沉淀数据的底座，包括 SQL、S3/MinIO、Redis、EMU、FPGA、CPU Farm、QEMU+cmodel/amodel、Git 仓库和 CI 产物。

它回答的问题是：平台能纳管什么资源，能保存什么数据，能从哪里拿到版本和构建产物。

### 第二层：平台组件与能力层

这一层是通用技术能力和 Agent 可插拔能力，包括 K8s/Worker Runtime、Log Pipeline、MCP、Skill、Subagent、Artifacts、Queue/Lock、Observability。

它回答的问题是：任务怎么运行，日志和产物怎么收集，Agent 用什么工具，Skill 如何发布，Subagent 如何隔离，资源锁和任务队列如何保证不抢占。

### 第三层：管理模块与规则编排层

这一层是平台业务主干，包括需求管理、用例管理、资源管理、里程碑管理、执行计划管理、执行任务管理、Issue 管理、PR 管理，以及规则引擎和事件驱动流程编排。

它回答的问题是：平台管理哪些对象，这些对象的状态如何变化，什么事件触发自动化，什么规则决定复跑、调度、准入和风险升级。

### 第四层：Agent 层

这一层放有明确目的的 Agent，不把 Agent 画成一个泛化黑盒。建议第一批至少包括资源调度 Agent、用例选择 Agent、执行 Agent、失败分析 Agent、复跑 Agent、问题定位 Agent、报告 Agent、变更影响 Agent。

它回答的问题是：哪些自动化动作由 Agent 完成，每个 Agent 的职责边界是什么，Agent 之间如何通过平台状态和事件协作。

### 第五层：展示与协同层

这一层面向用户和团队协作，包括 Dashboard、验证工作台、Agent Studio、报告与通知。

它回答的问题是：负责人如何看投片准入和风险，Owner 如何处理失败，资源管理员如何看资源占用，Agent 开发者如何配置 MCP、Skill 和 Subagent。

## 读图方式

从下往上看：

1. 第一层提供真实资源、存储和版本来源。
2. 第二层把这些资源包装成可调度、可观测、可审计的平台能力。
3. 第三层沉淀业务对象、状态机、规则和事件流程。
4. 第四层用 Agent 执行调度、分析、复跑、定位和报告等自动动作。
5. 第五层把执行状态、风险和人工操作入口呈现给用户。

这张图可以作为“总分层图”。后续每一层都可以继续拆二级图，例如资源调度图、Agent 平台图、事件驱动图、执行任务状态机图。
