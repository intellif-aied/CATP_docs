const statusTone = {
  passed: "green",
  running: "blue",
  queued: "cyan",
  warning: "amber",
  failed: "red",
  blocked: "red",
  review: "purple",
  idle: "green",
  open: "blue",
  closed: "gray",
};

const metrics = [
  ["里程碑准入", "82%", "+6% 本周", "green", 82],
  ["夜间计划完成", "74%", "18 个任务运行中", "blue", 74],
  ["FPGA / EMU 利用率", "68%", "夜间 Program Fill", "amber", 68],
  ["未闭环 P0/P1", "7", "2 个阻塞投片", "red", 42],
];

const requirements = [
  ["REQ-DMA-001", "DMA doorbell 基础功能", "DMA", "P0", "92%", "准入必需", "张工"],
  ["REQ-BOOT-014", "Boot API 初始化链路", "Runtime", "P0", "100%", "已准入", "李工"],
  ["REQ-RST-022", "Reset recovery 异常恢复", "SoC", "P1", "63%", "缺 EMU 证据", "王工"],
  ["REQ-MEM-031", "IOMMU 映射与权限", "Memory", "P1", "78%", "PR 影响", "陈工"],
  ["REQ-PERF-018", "FPGA 长稳吞吐趋势", "Perf", "P2", "41%", "夜间执行中", "赵工"],
];

const cases = [
  ["CASE-BOOT-API", "Boot API smoke", "FOUNDATION", "REQUIRED", "OPTIONAL", "OPTIONAL", "QEMU -> EMU -> FPGA", "pass"],
  ["CASE-DMA-BAR", "BAR / DMA queue", "COMMON", "PRECHECK", "OPTIONAL", "REQUIRED", "QEMU -> FPGA", "running"],
  ["CASE-RST-REC", "Reset recovery", "EMU_ENHANCED", "UNSUPPORTED", "REQUIRED", "OPTIONAL", "EMU-only", "failed"],
  ["CASE-LONG-STRESS", "72h long stress", "FPGA_ENHANCED", "UNSUPPORTED", "OPTIONAL", "REQUIRED", "FPGA-only", "queued"],
  ["CASE-IOMMU-MAP", "IOMMU map/unmap", "COMMON", "PRECHECK", "REQUIRED", "OPTIONAL", "QEMU -> EMU", "review"],
];

const resources = [
  ["FPGA-01", "FPGA", "running", "nightly-reg-042", "program", "02:14", 91],
  ["FPGA-02", "FPGA", "debug", "王工", "human", "01:32", 83],
  ["FPGA-03", "FPGA", "reserved", "P0 DMA", "human", "00:48", 94],
  ["EMU-01", "EMU", "running", "reset-repro", "program", "05:20", 86],
  ["EMU-02", "EMU", "idle", "可用", "none", "-", 98],
  ["EMU-03", "EMU", "unhealthy", "trace timeout", "system", "-", 42],
  ["CPU-12", "CPU", "running", "log-parse", "program", "00:18", 96],
  ["CPU-28", "CPU", "idle", "可用", "none", "-", 99],
  ["QEMU-A", "QEMU", "running", "smoke-slice", "program", "00:08", 97],
  ["QEMU-B", "QEMU", "idle", "可用", "none", "-", 99],
];

const queue = [
  ["RR-2031", "人工 P0 DMA 复现", "HUMAN", "P0", "FPGA", "98.4", "白天 Human First + P0"],
  ["RR-2044", "Reset recovery trace", "PROGRAM", "P1", "EMU", "86.2", "稳定失败定位"],
  ["RR-1998", "Nightly full slice", "PROGRAM", "P2", "FPGA", "74.5", "夜间 Program Fill"],
  ["RR-2017", "IOMMU rerun", "PROGRAM", "P2", "QEMU", "61.3", "QEMU precheck"],
];

const plans = [
  ["PLAN-NGT-0615", "SoC-A0 nightly full", "nightly", "running", "74%", "246 / 332", "2026-06-15 19:00"],
  ["PLAN-PR-8842", "DMA PR impact slice", "incremental", "running", "62%", "31 / 50", "PR #8842"],
  ["PLAN-DBG-117", "Reset recovery repro", "debug", "queued", "0%", "0 / 12", "王工"],
  ["PLAN-MILE-A0", "Tapeout gate sweep", "milestone", "review", "82%", "148 / 181", "A0 Gate"],
];

const tasks = [
  ["TASK-9831", "CASE-DMA-BAR", "QEMU_CMODEL", "passed", "00:04:12", "qemu-a", "result.json"],
  ["TASK-9832", "CASE-DMA-BAR", "FPGA", "running", "01:24:08", "fpga-01", "uart.log"],
  ["TASK-9844", "CASE-RST-REC", "EMU", "failed", "00:47:33", "emu-01", "trace.dump"],
  ["TASK-9852", "CASE-IOMMU-MAP", "QEMU_AMODEL", "blocked", "00:00:00", "-", "upstream gate"],
  ["TASK-9868", "CASE-LONG-STRESS", "FPGA", "queued", "-", "-", "lease pending"],
];

const issues = [
  ["ISSUE-219", "Reset recovery stuck after warm reset", "TRIAGING", "P0", "SoC", "王工", "DESIGN_ISSUE", "0.72"],
  ["ISSUE-214", "DMA doorbell mismatch on FPGA", "VERIFYING", "P1", "DMA", "张工", "SOFTWARE_ISSUE", "0.81"],
  ["ISSUE-209", "QEMU model unsupported for MSI path", "ASSIGNED", "P2", "Model", "陈工", "MODEL_ISSUE", "0.66"],
  ["ISSUE-203", "EMU trace timeout on long scenario", "FIX_READY", "P1", "Infra", "平台组", "PLATFORM_ISSUE", "0.88"],
];

const prs = [
  ["PR-8842", "dma: fix queue doorbell ordering", "checking", "ISSUE-214", "3/5 passed", "张工"],
  ["PR-8817", "runtime: reset recovery timeout guard", "reviewing", "ISSUE-219", "1/4 passed", "李工"],
  ["PR-8799", "qemu-model: add MSI fallback stub", "draft", "ISSUE-209", "0/3 pending", "陈工"],
];

const agents = [
  ["Resource Scheduler Agent", "v1.8.2", "active", "资源分配、抢占建议、昼夜策略解释", "MCP: resource, Skill: scheduling"],
  ["Failure Triage Agent", "v2.1.0", "active", "日志归因、owner 推荐、重复失败判断", "MCP: logs, Skill: triage"],
  ["Fix Verification Agent", "v1.3.4", "canary", "生成 QEMU/EMU/FPGA checks", "MCP: ci, Skill: verification"],
  ["Report Agent", "v1.2.7", "active", "日报、周报、投片风险 Top", "MCP: docs, Skill: report"],
  ["Guardrail Agent", "v0.9.6", "active", "危险动作审批、预算和权限校验", "MCP: access, Skill: audit"],
];

const rules = [
  ["RULE-001", "execution.node.failed", "生成 FailSnapshot", "Snapshot Builder Agent", "enabled"],
  ["RULE-002", "fail_snapshot.created", "新失败归因", "Failure Triage Agent", "enabled"],
  ["RULE-003", "resource.lease.expiring", "人工租约提醒", "Lease Assistant Agent", "enabled"],
  ["RULE-004", "pr.updated", "影响验证路径", "Change Impact Agent", "enabled"],
  ["RULE-005", "verification_plan.completed", "关闭门禁评估", "Close Gate Agent", "canary"],
];

const milestones = [
  ["A0 Tapeout Gate", "82%", "7", "3", "2026-07-18", "yellow"],
  ["DMA Subsystem Exit", "76%", "4", "1", "2026-06-28", "red"],
  ["Runtime Bring-up", "91%", "2", "0", "2026-06-21", "green"],
  ["Long Stress Entry", "48%", "5", "2", "2026-07-02", "yellow"],
];

const viewMeta = {
  dashboard: ["总控台", "验证负责人视角", "资源、任务、失败、准入、Agent 运行集中到一张作战桌面。"],
  requirements: ["需求管理", "Requirement Workspace", "管理需求拆解、覆盖关系、变更影响和投片准入项。"],
  cases: ["用例管理", "Case Library", "维护平台标注、用例 DAG、QEMU 预筛和跨平台结论来源。"],
  resources: ["资源调度", "Resource Operations", "纳管 FPGA、EMU、CPU、QEMU，支持人机共享、优先级、中断和可视化。"],
  plans: ["执行计划", "Execution Planning", "编排全量、增量、夜间、专项定位和里程碑准入计划。"],
  tasks: ["执行任务", "Task Monitor", "跟踪 CaseExecutionNode、资源租约、Result JSON、artifact 和阻断原因。"],
  failures: ["失败 Issue", "Failure Board", "按照 GitHub Issue/PR 心智管理失败、修复、验证和关闭门禁。"],
  prs: ["PR 验证", "Pull Request Checks", "把代码变化映射到需求、用例、平台和修复验证 checks。"],
  agents: ["Agent Studio", "Managed Agent Platform", "可视化管理 Agent、MCP、Skill、Subagent、运行 trace 和权限。"],
  rules: ["事件规则", "Event Rule Engine", "配置事件、规则、1:1 Agent 绑定、回放和治理。"],
  milestones: ["里程碑报告", "Milestone Readiness", "投片准入、风险 Top、未闭环项和报告通知。"],
  settings: ["管理配置", "Admin Console", "项目空间、角色权限、字典、策略和外部集成配置。"],
  architecture: ["架构总览", "Architecture Gallery", "集中查看最终设计文档中的全部关键架构图。"],
};

function badge(text, tone = "gray") {
  return `<span class="badge ${tone}">${text}</span>`;
}

function progress(value, tone = "blue") {
  return `<div class="progress"><span style="width:${value}%;background:var(--${tone})"></span></div>`;
}

function actionButtons(labels) {
  return labels.map((label, index) => {
    const cls = index === 0 ? "primary-button" : "secondary-button";
    return `<button class="${cls}" data-action="${label}">${label}</button>`;
  }).join("");
}

function pageHeader(view, actions = []) {
  const [title, eyebrow, subtitle] = viewMeta[view];
  return `
    <div class="page-header">
      <div>
        <div class="eyebrow">${eyebrow}</div>
        <h1 class="page-title">${title}</h1>
        <p class="page-subtitle">${subtitle}</p>
      </div>
      <div class="header-actions">${actionButtons(actions)}</div>
    </div>
  `;
}

function metricCards() {
  return metrics.map(([label, value, foot, tone, pct]) => `
    <div class="panel metric-card">
      <div class="metric-label"><span>${label}</span>${badge(tone === "red" ? "Watch" : "Live", tone)}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-foot"><span>${foot}</span><span class="trend ${tone === "red" ? "bad" : tone === "amber" ? "warn" : ""}">${pct}%</span></div>
      ${progress(pct, tone === "red" ? "red" : tone === "amber" ? "amber" : "blue")}
    </div>
  `).join("");
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function panel(title, subtitle, body, extra = "") {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">${title}</h2>
          ${subtitle ? `<p class="panel-subtitle">${subtitle}</p>` : ""}
        </div>
        ${extra}
      </div>
      <div class="panel-body">${body}</div>
    </section>
  `;
}

function timeline(items) {
  return `<div class="timeline">${items.map(([title, text]) => `
    <div class="timeline-item">
      <div class="timeline-title">${title}</div>
      <div class="timeline-text">${text}</div>
    </div>
  `).join("")}</div>`;
}

function resourceTiles() {
  return `<div class="resource-grid">${resources.map(([name, kind, state, owner, consumer, ttl, health]) => `
    <div class="resource-tile state-${state}">
      <div class="name">${name} ${badge(kind, kind === "FPGA" ? "amber" : kind === "EMU" ? "purple" : kind === "QEMU" ? "cyan" : "gray")}</div>
      <div class="meta">状态：${state}<br>占用：${owner}<br>租约：${ttl} · 健康 ${health}</div>
    </div>
  `).join("")}</div>`;
}

function dagView() {
  const nodes = [
    ["Boot API", "QEMU_CMODEL", "passed"],
    ["BAR / DMA", "QEMU precheck", "passed"],
    ["BAR / DMA", "FPGA required", "running"],
    ["Failure snapshot", "等待结果", "queued"],
    ["Reset recovery", "EMU-only", "failed"],
    ["Triage Agent", "FailSnapshot created", "running"],
    ["Failure Issue", "ISSUE-219", "open"],
    ["Fix Verification", "checks pending", "queued"],
  ];
  return `<div class="dag"><div class="dag-grid">${nodes.map(([title, meta, state]) => `
    <div class="dag-node">
      <div class="node-title">${title} ${badge(state, statusTone[state] || "gray")}</div>
      <div class="node-meta">${meta}</div>
    </div>
  `).join("")}</div></div>`;
}

function laneBoard(columns) {
  return `<div class="lane-board">${columns.map(([title, items]) => `
    <div class="lane-column">
      <div class="lane-head"><span>${title}</span><span>${items.length}</span></div>
      <div class="lane-items">${items.map((item) => `
        <div class="work-card">
          <div class="work-card-title">${item.title}</div>
          <div class="work-card-meta">${item.tags.map(([t, tone]) => badge(t, tone)).join("")}</div>
        </div>
      `).join("")}</div>
    </div>
  `).join("")}</div>`;
}

function checkMatrix() {
  const rows = [
    ["Repro original fail", "passed", "running", "pending", "yes"],
    ["Verify fix", "passed", "pending", "pending", "yes"],
    ["Regression slice", "passed", "passed", "pending", "yes"],
    ["Long stress", "skipped", "optional", "pending", "depends"],
  ];
  return `
    <div class="check-grid">
      ${["Check", "QEMU", "EMU", "FPGA", "Required"].map((h) => `<div class="check-head">${h}</div>`).join("")}
      ${rows.map((row) => row.map((cell, index) => `<div>${index === 0 ? cell : badge(cell, statusTone[cell] || "gray")}</div>`).join("")).join("")}
    </div>
  `;
}

function flow(steps) {
  return `<div class="flow">${steps.map(([title, text]) => `
    <div class="flow-step">
      <div class="flow-title">${title}</div>
      <div class="flow-text">${text}</div>
    </div>
  `).join("")}</div>`;
}

function dashboard() {
  const riskRows = issues.map(([id, title, state, p, module, owner, type, conf]) => [
    `<span class="mono">${id}</span>`,
    title,
    badge(state, state === "VERIFYING" ? "purple" : state === "FIX_READY" ? "amber" : "blue"),
    badge(p, p === "P0" ? "red" : "amber"),
    module,
    owner,
    conf,
  ]);
  return `
    ${pageHeader("dashboard", ["提交夜间计划", "导出周报"])}
    <div class="grid cols-4">${metricCards()}</div>
    <div class="split">
      ${panel("投片风险 Top", "按 severity、milestone、阻塞时间排序", table(["Issue", "标题", "状态", "优先级", "模块", "Owner", "置信度"], riskRows))}
      ${panel("自动化事件流", "最近 2 小时", timeline([
        ["fail_snapshot.created", "TASK-9844 在 EMU 上失败，Triage Agent 已启动"],
        ["resource.lease.expiring", "FPGA-02 人工租约 30 分钟后到期"],
        ["pr.updated", "PR-8842 触发 DMA 增量回归"],
        ["agent.completed", "Report Agent 已生成夜间摘要草稿"],
      ]))}
    </div>
    <div class="grid cols-2">
      ${panel("资源地图", "FPGA / EMU 默认独占租约", resourceTiles())}
      ${panel("执行 DAG 快照", "QEMU 预筛、基础 gate 和失败闭环", dagView())}
    </div>
  `;
}

function requirementsView() {
  const rows = requirements.map(([id, title, module, p, cov, gate, owner]) => [
    `<span class="mono">${id}</span>`,
    title,
    module,
    badge(p, p === "P0" ? "red" : p === "P1" ? "amber" : "gray"),
    `${cov}<br>${progress(parseInt(cov, 10), parseInt(cov, 10) > 80 ? "green" : "amber")}`,
    gate,
    owner,
  ]);
  return `
    ${pageHeader("requirements", ["新建需求", "影响分析"])}
    <div class="toolbar">
      <div class="segmented"><button class="active">准入</button><button>变更</button><button>覆盖</button></div>
      <select class="select"><option>全部模块</option><option>DMA</option><option>Runtime</option></select>
      <input class="field" placeholder="按 owner 或需求 ID 过滤" />
    </div>
    <div class="split">
      ${panel("需求覆盖矩阵", "需求、用例、PR、里程碑的关联关系", table(["需求", "标题", "模块", "优先级", "覆盖率", "准入状态", "Owner"], rows))}
      ${panel("变更影响", "REQ-DMA-001", flow([
        ["PR #8842", "命中 DMA doorbell"],
        ["用例选择", "12 个 QEMU，4 个 FPGA"],
        ["资源申请", "FPGA 独占 3 小时"],
        ["准入", "P1 Issue 必须关闭"],
        ["报告", "同步里程碑风险"],
      ]))}
    </div>
  `;
}

function casesView() {
  const rows = cases.map(([id, name, layer, qemu, emu, fpga, route, state]) => [
    `<span class="mono">${id}</span>`,
    name,
    badge(layer, layer === "FOUNDATION" ? "red" : layer.includes("ENHANCED") ? "purple" : "blue"),
    badge(qemu, qemu === "UNSUPPORTED" ? "gray" : qemu === "PRECHECK" ? "cyan" : "green"),
    badge(emu, emu === "REQUIRED" ? "green" : emu === "UNSUPPORTED" ? "gray" : "amber"),
    badge(fpga, fpga === "REQUIRED" ? "green" : fpga === "UNSUPPORTED" ? "gray" : "amber"),
    route,
    badge(state, statusTone[state] || "gray"),
  ]);
  return `
    ${pageHeader("cases", ["导入用例", "生成 DAG"])}
    <div class="grid cols-2">
      ${panel("平台映射矩阵", "平台归属由人标注，Agent 只能建议", table(["Case", "名称", "层级", "QEMU", "EMU", "FPGA", "路线", "状态"], rows))}
      ${panel("执行 DAG", "基础 gate 失败阻断下游，QEMU precheck 失败跳过高成本平台", dagView())}
    </div>
    ${panel("跨平台结论", "最终报告必须说明结论来源", checkMatrix())}
  `;
}

function resourcesView() {
  const rows = queue.map(([id, name, consumer, p, kind, score, reason]) => [
    `<span class="mono">${id}</span>`,
    name,
    badge(consumer, consumer === "HUMAN" ? "purple" : "blue"),
    badge(p, p === "P0" ? "red" : p === "P1" ? "amber" : "gray"),
    kind,
    score,
    reason,
  ]);
  return `
    ${pageHeader("resources", ["申请资源", "抢占审批", "导出利用率"])}
    <div class="grid cols-2">
      ${panel("资源地图", "白天 Human First，夜间 Program Fill", resourceTiles())}
      ${panel("调度解释", "当前排序原因", table(["请求", "名称", "消费者", "优先级", "资源", "分数", "理由"], rows))}
    </div>
    <div class="grid cols-2">
      ${panel("租约时间线", "预约、占用、drain、maintenance", timeline([
        ["09:20 FPGA-02 人工 debug", "Owner 王工，P0 reset recovery，现场保护"],
        ["10:05 FPGA-03 预约", "DMA P0 复现，审批已通过"],
        ["19:00 夜间回归", "Program Fill 接管空闲 FPGA / EMU"],
        ["02:00 EMU-03 隔离", "trace timeout，HealthSnapshot 低于阈值"],
      ]))}
      ${panel("中断控制", "FPGA / EMU 抢占必须保护现场", flow([
        ["DRAIN", "运行到安全点释放"],
        ["CHECKPOINT", "保存现场和命令"],
        ["MIGRATE", "兼容资源迁移"],
        ["FORCE", "P0 + 审批"],
        ["AUDIT", "记录损失和原因"],
      ]))}
    </div>
  `;
}

function plansView() {
  const rows = plans.map(([id, name, type, state, pct, done, owner]) => [
    `<span class="mono">${id}</span>`,
    name,
    badge(type, type === "nightly" ? "purple" : type === "incremental" ? "cyan" : "gray"),
    badge(state, statusTone[state] || "gray"),
    `${pct}<br>${progress(parseInt(pct, 10), state === "review" ? "purple" : "blue")}`,
    done,
    owner,
  ]);
  return `
    ${pageHeader("plans", ["新建计划", "暂停", "批量复跑"])}
    ${panel("计划列表", "计划冻结版本矩阵后生成 ExecutionGraph", table(["计划", "名称", "类型", "状态", "进度", "节点", "来源"], rows))}
    <div class="grid cols-3">
      ${panel("夜间计划策略", "", flow([
        ["Scope", "全量 + 高风险模块"],
        ["QEMU", "快速预筛"],
        ["EMU", "复杂状态和 trace"],
        ["FPGA", "真实硬件闭环"],
        ["Report", "夜间摘要"],
      ]))}
      ${panel("增量回归策略", "", flow([
        ["PR diff", "影响模块"],
        ["需求映射", "准入项"],
        ["用例选择", "风险加权"],
        ["Checks", "PR 门禁"],
        ["Issue", "关联失败"],
      ]))}
      ${panel("专项定位策略", "", flow([
        ["FailSnapshot", "失败现场"],
        ["Owner", "确认复现"],
        ["Resource", "预约 EMU/FPGA"],
        ["Trace", "采集证据"],
        ["Close", "门禁评估"],
      ]))}
    </div>
  `;
}

function tasksView() {
  const rows = tasks.map(([id, name, platform, state, cost, resource, artifact]) => [
    `<span class="mono">${id}</span>`,
    name,
    platform,
    badge(state, statusTone[state] || "gray"),
    cost,
    resource,
    `<span class="mono">${artifact}</span>`,
  ]);
  return `
    ${pageHeader("tasks", ["创建复跑", "取消队列", "下载现场"])}
    <div class="grid cols-2">
      ${panel("任务监控", "CaseExecutionNode、ResourceLease、Result JSON", table(["任务", "用例", "平台", "状态", "耗时", "资源", "Artifact"], rows))}
      ${panel("Result JSON 预览", "统一执行结果协议", `<pre class="mono">{
  "task_id": "TASK-9844",
  "case_id": "CASE-RST-REC",
  "platform": "EMU",
  "result": "fail",
  "failure_type": "design_issue",
  "artifact_refs": ["trace.dump", "case.log"],
  "version_matrix_id": "vm-0615-nightly"
}</pre>`)}
    </div>
    ${panel("执行 DAG", "节点状态、跳过原因和阻断原因", dagView())}
  `;
}

function failuresView() {
  const columns = [
    ["Triaging", [{ title: "ISSUE-219 Reset recovery stuck", tags: [["P0", "red"], ["SoC", "blue"]] }]],
    ["Assigned", [{ title: "ISSUE-209 QEMU model unsupported", tags: [["P2", "gray"], ["Model", "purple"]] }]],
    ["Fix Ready", [{ title: "ISSUE-203 EMU trace timeout", tags: [["P1", "amber"], ["Infra", "cyan"]] }]],
    ["Verifying", [{ title: "ISSUE-214 DMA doorbell mismatch", tags: [["P1", "amber"], ["PR-8842", "green"]] }]],
  ];
  return `
    ${pageHeader("failures", ["新建 Issue", "合并重复", "请求关闭"])}
    ${panel("Failure Board", "类 GitHub Project 的失败闭环", laneBoard(columns))}
    <div class="grid cols-2">
      ${panel("Issue 详情", "ISSUE-219", table(["字段", "值"], [
        ["标题", "Reset recovery stuck after warm reset"],
        ["FailSnapshot", "TASK-9844 / EMU / trace.dump"],
        ["Owner", "王工"],
        ["Labels", `${badge("DESIGN_ISSUE", "red")} ${badge("P0", "red")} ${badge("EMU", "purple")}`],
        ["Close Gate", `${badge("blocked", "red")} 缺 FPGA 验证和 owner approval`],
      ]))}
      ${panel("Timeline", "Agent 输出和人工分析都进入 timeline", timeline([
        ["Snapshot Builder Agent", "生成 failureSignature rst-warm-0x19"],
        ["Duplicate Agent", "未发现可合并 Issue，置信度 0.72"],
        ["Owner Routing Agent", "推荐 SoC Reset owner 王工"],
        ["Repro Plan Agent", "建议 EMU trace + FPGA sanity check"],
      ]))}
    </div>
  `;
}

function prsView() {
  const rows = prs.map(([id, title, state, issue, checks, owner]) => [
    `<span class="mono">${id}</span>`,
    title,
    badge(state, state === "checking" ? "blue" : state === "reviewing" ? "purple" : "gray"),
    issue,
    checks,
    owner,
  ]);
  return `
    ${pageHeader("prs", ["同步 Git", "生成验证计划", "审批合入"])}
    <div class="grid cols-2">
      ${panel("PR 列表", "变更影响、CI、Review、修复验证", table(["PR", "标题", "状态", "Issue", "Checks", "Owner"], rows))}
      ${panel("Verification Matrix", "PR checks 映射 QEMU / EMU / FPGA", checkMatrix())}
    </div>
    ${panel("变更影响链路", "PR 到需求、用例、平台和 Issue", flow([
      ["Diff", "driver/dma/queue.c"],
      ["Requirement", "REQ-DMA-001"],
      ["Case Set", "12 QEMU + 4 FPGA"],
      ["Resource", "FPGA 独占 3h"],
      ["Gate", "checks 全通过"],
    ]))}
  `;
}

function agentsView() {
  const rows = agents.map(([name, version, state, purpose, caps]) => [
    name,
    version,
    badge(state, state === "active" ? "green" : "amber"),
    purpose,
    caps,
  ]);
  return `
    ${pageHeader("agents", ["发布 Agent", "测试运行", "回滚版本"])}
    <div class="grid cols-2">
      ${panel("Agent Registry", "目的明确、版本化、可回滚", table(["Agent", "版本", "状态", "目的", "能力"], rows))}
      ${panel("运行 Trace", "工具调用、成本、输出证据", timeline([
        ["RuleActivation RA-8821", "fail_snapshot.created 命中 RULE-002"],
        ["Context Load", "读取 result.json、case.log、历史失败 42 条"],
        ["Tool Call", "mcp.logs.search，耗时 2.4s"],
        ["Output Validator", "schema 通过，requiresHumanApproval=false"],
      ]))}
    </div>
    ${panel("MCP / Skill / Subagent 拓扑", "可视化、可插拔、可审计", flow([
      ["AgentTemplate", "Failure Triage"],
      ["MCP Tools", "logs, artifacts, issue"],
      ["Skills", "triage, dedupe"],
      ["Subagents", "log parser, owner routing"],
      ["Guardrail", "权限和预算"],
    ]))}
  `;
}

function rulesView() {
  const rows = rules.map(([id, event, cond, agent, state]) => [
    `<span class="mono">${id}</span>`,
    `<span class="mono">${event}</span>`,
    cond,
    agent,
    badge(state, state === "enabled" ? "green" : "amber"),
  ]);
  return `
    ${pageHeader("rules", ["新建规则", "Dry Run", "回放事件"])}
    <div class="grid cols-2">
      ${panel("规则列表", "每条启用规则只绑定一个 AgentTriggerConfig", table(["规则", "事件", "条件", "Agent", "状态"], rows))}
      ${panel("1:1 触发链路", "配置层和运行层都保持明确绑定", flow([
        ["EventRecord", "事实事件"],
        ["AutomationRule", "条件命中"],
        ["RuleActivation", "一次激活"],
        ["AgentRun", "一个运行"],
        ["Action", "结构化输出"],
      ]))}
    </div>
    ${panel("事件回放", "规则上线前验证误触发风险", timeline([
      ["Dry Run started", "输入 1,240 条历史 execution.node.failed 事件"],
      ["RULE-002 matched", "命中 236 次，跳过 1,004 次"],
      ["Agent budget estimate", "预计 18.4 美元，95 分钟"],
      ["Policy result", "建议 canary 发布到 SoC-A0 项目"],
    ]))}
  `;
}

function milestonesView() {
  const rows = milestones.map(([name, ready, issues, blockers, date, tone]) => [
    name,
    `${ready}<br>${progress(parseInt(ready, 10), tone === "green" ? "green" : tone === "red" ? "red" : "amber")}`,
    issues,
    blockers,
    date,
    badge(tone === "green" ? "ready" : tone === "red" ? "blocked" : "watch", tone === "green" ? "green" : tone === "red" ? "red" : "amber"),
  ]);
  return `
    ${pageHeader("milestones", ["生成日报", "发送周报", "风险升级"])}
    <div class="grid cols-2">
      ${panel("里程碑准入", "需求覆盖、用例通过、Issue 关闭、资源瓶颈", table(["里程碑", "Ready", "Open Issues", "Blockers", "日期", "状态"], rows))}
      ${panel("报告摘要", "夜间执行摘要草稿", `<div class="timeline">
        <div class="timeline-item"><div class="timeline-title">夜间吞吐</div><div class="timeline-text">332 个节点完成 246 个，QEMU 预筛节省 41 个 FPGA 节点。</div></div>
        <div class="timeline-item"><div class="timeline-title">风险 Top</div><div class="timeline-text">Reset recovery P0 阻塞 A0 Gate，DMA PR checks 仍在 verifying。</div></div>
        <div class="timeline-item"><div class="timeline-title">资源瓶颈</div><div class="timeline-text">EMU-03 unhealthy，FPGA-02 白天被人工 debug 占用。</div></div>
      </div>`)}
    </div>
  `;
}

function settingsView() {
  return `
    ${pageHeader("settings", ["保存策略", "导入配置", "查看审计"])}
    <div class="grid cols-3">
      ${panel("角色权限", "用户、项目、资源、工具授权", table(["角色", "权限", "审批"], [
        ["Validation Lead", "全局查看、计划审批、关闭门禁", "P0 waive"],
        ["Domain Owner", "需求、用例、Issue、PR", "owner approval"],
        ["Resource Admin", "资源注册、隔离、强制释放", "force release"],
        ["Agent Developer", "Agent、MCP、Skill 发布", "canary release"],
      ]))}
      ${panel("策略配置", "版本化和可回滚", table(["策略", "当前值"], [
        ["工作时段", "Asia/Shanghai 09:00-19:00"],
        ["白天策略", "Human First"],
        ["夜间策略", "Program Fill"],
        ["P0 抢占", "审批 + 现场保护"],
      ]))}
      ${panel("外部集成", "Repo、CI、IM、Issue 系统", table(["系统", "状态"], [
        ["GitHub / GitLab", badge("connected", "green")],
        ["CI/CD", badge("healthy", "green")],
        ["IM / 邮件", badge("enabled", "green")],
        ["Jira / 禅道", badge("syncing", "blue")],
      ]))}
    </div>
    ${panel("审计流", "危险动作和人工 override", timeline([
      ["10:12 强制释放申请", "FPGA-01，P0 DMA 复现，等待负责人审批"],
      ["09:43 Agent 发布", "Failure Triage Agent v2.1.0 canary 到 SoC-A0"],
      ["08:50 策略变更", "夜间 Program Fill 阈值从 P3 调整为 P2"],
    ]))}
  `;
}

function architectureView() {
  const diagrams = [
    ["端到端闭环", "../architecture/final-end-to-end-flow.svg"],
    ["核心领域数据关系", "../architecture/final-domain-data-map.svg"],
    ["五层架构", "../architecture/chip-validation-platform-layered.svg"],
    ["资源调度", "../architecture/resource-management-scheduling-architecture.svg"],
    ["用例执行", "../architecture/use-case-execution-orchestration.svg"],
    ["失败 Issue/PR", "../architecture/failure-analysis-issue-pr-architecture.svg"],
    ["Managed Agent 编排", "../architecture/automation-orchestration-architecture.svg"],
    ["资源可视化", "../architecture/resource-management-visualization.svg"],
  ];
  return `
    ${pageHeader("architecture", ["打开设计文档", "导出图片"])}
    <div class="diagram-strip">
      ${diagrams.map(([title, src]) => panel(title, src, `<div class="diagram-frame"><img src="${src}" alt="${title}" /></div>`)).join("")}
    </div>
  `;
}

const renderers = {
  dashboard,
  requirements: requirementsView,
  cases: casesView,
  resources: resourcesView,
  plans: plansView,
  tasks: tasksView,
  failures: failuresView,
  prs: prsView,
  agents: agentsView,
  rules: rulesView,
  milestones: milestonesView,
  settings: settingsView,
  architecture: architectureView,
};

function setActive(view) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

let currentView = "";

function render(view, options = { syncHash: true }) {
  const safeView = renderers[view] ? view : "dashboard";
  document.getElementById("viewRoot").innerHTML = renderers[safeView]();
  setActive(safeView);
  currentView = safeView;
  if (options.syncHash && window.location.hash !== `#${safeView}`) {
    window.location.hash = safeView;
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = `已触发：${message}`;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

document.getElementById("nav").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-view]");
  if (!btn) return;
  render(btn.dataset.view);
});

window.addEventListener("hashchange", () => {
  const nextView = window.location.hash.replace("#", "") || "dashboard";
  if (nextView !== currentView) {
    render(nextView, { syncHash: false });
  }
});

document.body.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  showToast(btn.dataset.action);
});

document.getElementById("globalSearch").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const value = event.currentTarget.value.trim();
  if (value) showToast(`全局搜索 ${value}`);
});

render(window.location.hash.replace("#", "") || "dashboard");
