# 资源管理与调度二级设计

> SVG 架构图：`architecture/resource-management-scheduling-architecture.svg`
>
> SVG 状态机：`architecture/resource-management-state-machines.svg`
>
> 资源可视化：`architecture/resource-management-visualization.svg`
>
> 数据模型：`architecture/resource-management-data-model.md`

## 1. 设计目标

资源管理与调度模块负责把 FPGA、EMU、CPU Farm、QEMU+cmodel、QEMU+amodel 等资源统一纳管，并在“人”和“程序”之间做可解释、可中断、可审计的分配。

这部分的关键不是简单排队，而是解决五个问题：

1. **优先级**：投片阻塞、P0 定位、高风险模块、夜间回归、普通任务必须有明确排序。
2. **中断**：低价值任务占用稀缺设备时，高价值任务可以请求抢占，但必须保护现场。
3. **不可虚拟化设备**：FPGA / EMU 默认不能虚拟化，必须通过独占租约避免多人或多个程序同时占用。
4. **人和程序共享**：人工调试、自动回归、CI、Agent 任务都走同一资源请求模型。
5. **昼夜策略**：白天优先人，晚上优先程序，同时保留 P0、预约和人工审批的覆盖能力。

## 2. 二级架构图

![资源管理与调度二级架构](./resource-management-scheduling-architecture.svg)

## 3. 状态机图

![资源管理与调度状态机](./resource-management-state-machines.svg)

## 4. 模块边界

### 请求入口

统一接收人工资源申请、程序执行请求、外部事件触发，并标准化为 `ResourceRequest`。

人工请求包括调试、复现、保留现场、专项验证。程序请求包括回归计划、夜间计划、CI 触发、Agent 复跑、日志分析。

### 调度核心

调度核心包括优先级与策略引擎、昼夜窗口策略、多队列调度、独占租约管理、资源匹配、抢占控制、预约日历和调度决策记录。

这里是全模块的“大脑”。所有资源分配、拒绝、抢占、迁移都必须有决策记录。

### 资源执行面

资源执行面负责资源注册、能力矩阵、心跳健康检查、执行适配器、checkpoint、现场保护和真实资源池管理。

它不决定业务优先级，只负责可靠执行调度决策，并把资源状态回写。

### 治理与观测

治理与观测负责资源利用率、等待时间、中断次数、人机公平性、审计解释、通知审批。

资源调度如果没有可观测和审计，很快会变成“谁声音大谁拿资源”。这个模块要让每次资源占用都有理由、有记录、可复盘。

### 资源可视化工作台

资源可视化不是普通列表，而是调度系统的操作面。它需要让用户一眼看清：

- 哪些 FPGA / EMU / CPU / QEMU 正在被谁占用。
- 当前是人工占用还是程序占用。
- 租约还有多久，能不能续约、释放、抢占或 drain。
- 当前排队请求的优先级、动态分数和等待原因。
- 白天/夜间策略是否影响了排序。
- 哪些设备 unhealthy、reserved、draining 或现场保护中。
- 每次调度为什么选这个资源，为什么没有选另一个资源。

## 5. 资源可视化图

![资源可视化工作台](./resource-management-visualization.svg)

## 6. 调度策略摘要

### 白天：Human First

默认工作时段，例如 `Asia/Shanghai` 工作日 `09:00-19:00`：

- 人工调试、问题复现、P0/P1 定位优先。
- 程序任务可以执行，但优先使用空闲资源或 CPU/QEMU。
- 程序占用 FPGA/EMU 时，需要可 drain 或可 checkpoint。
- 人工申请可以触发对低优先级程序任务的中断流程。

### 夜间：Program Fill

默认非工作时段：

- 自动回归、夜间计划、长稳压力、批量复跑优先填充 FPGA/EMU/CPU/QEMU。
- 普通人工租约到期后进入提醒和释放流程。
- 已预约人工调试、P0 定位、现场保护资源不被普通程序抢占。
- 资源空闲时由程序自动补任务，避免“人下班，资源也下班”。

### P0 Override

P0 可以覆盖昼夜默认策略，但不能跳过安全规则：

- FPGA/EMU 抢占必须生成现场保护动作。
- 强制释放必须有审批和审计。
- 中断前尽量 checkpoint 或 drain。
- 不可恢复任务要明确记录损失和原因。

## 7. 中断语义

中断分四类：

| 类型 | 语义 | 适用场景 |
| --- | --- | --- |
| `DRAIN` | 不接新阶段，运行到安全退出点后释放 | 长回归、阶段性测试 |
| `CHECKPOINT` | 保存现场、进度、命令、artifact 后释放 | 可恢复任务、QEMU/CPU/部分 EMU 流程 |
| `MIGRATE` | checkpoint 后换资源继续 | CPU/QEMU 或兼容资源 |
| `FORCE` | 强制终止 | 只允许 P0 + 审批 + 现场保护 |

FPGA/EMU 的中断要更保守：如果设备正在人工 debug 或失败现场保护，默认不抢占，除非 owner 释放或审批通过。

## 8. 可视化页面建议

资源管理至少需要以下视图：

| 视图 | 用途 | 关键字段 |
| --- | --- | --- |
| 资源地图 | 快速看资源池状态 | resource、kind、state、owner、lease、remaining、health |
| 时间线 / 日历 | 看预约、占用、夜间计划 | resource、time window、consumer、task、reservation |
| 队列视图 | 看谁在等资源 | request、priority、score、consumer、wait time、reason |
| 租约详情 | 看当前占用和操作 | owner、expiresAt、interruptibility、checkpoint、actions |
| 健康视图 | 看故障和隔离 | heartbeat、healthScore、signals、failureReason |
| 调度解释 | 看系统为什么这么排 | scoreBreakdown、matchedRules、candidate resources |
| 审批中心 | 处理抢占和强制释放 | requester、target lease、risk、artifact、approval |

## 9. 后续拆分建议

建议下一步继续拆以下二级文档：

1. **资源登记与健康检查详细设计**：ResourceUnit、Heartbeat、HealthScore。
2. **独占租约与预约日历详细设计**：ResourceLease、ReservationWindow、TTL、续约。
3. **优先级评分详细设计**：PriorityClass、ShiftPolicy、SchedulerPolicy。
4. **中断与恢复详细设计**：InterruptionPolicy、TaskCheckpoint、恢复任务。
5. **资源看板交互设计**：人工申请、续约、释放、抢占审批、原因展示。
