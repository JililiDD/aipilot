<p align="center">
  <img src="../assets/logo.png" alt="AIPilot logo" width="180">
</p>

<h1 align="center">AIPilot</h1>

<p align="center">
  面向 Coding Agent 的文档驱动、阶段门控产品开发工作流插件。
</p>

<p align="center">
  <img alt="Release 1.1.1" src="https://img.shields.io/badge/release-1.1.1-12B5EA">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-0B1537">
  <img alt="Claude Code, Codex, and Grok Build" src="https://img.shields.io/badge/agents-Claude%20Code%20%7C%20Codex%20%7C%20Grok-F7B32B">
</p>

<p align="center">
  <a href="../README.md">English</a> | 中文 | <a href="README_ja-JP.md">日本語</a> | <a href="README_es-ES.md">Español</a>
</p>

AIPilot 是一套面向 AI Coding Agent 的专业工作流 Skill 集合，旨在对日常软件开发流程进行自动化与结构化管理。它将产品开发提炼为一个可审查的阶段门控过程：定义需求、作出设计决策、创建可执行计划、编写与实施代码、审查结果，并将已批准的更新合并回项目文档中。用户只需从单一入口启动，AIPilot 便会自动检查项目状态并将任务路由至相应的 Skill。

配合 [ezreview](https://github.com/JililiDD/ezreview)，AIPilot 可将 Markdown 文档渲染为可交互的 HTML 页面供浏览器端审查。你可以在浏览器中直接对特定标题、段落或界面元素添加批注；AIPilot 会将反馈自动应用至 Markdown 源码、刷新 HTML 预览，并保持审查循环直至最终批准。

## 安装 AIPilot

### Claude Code

```bash
claude plugin marketplace add JililiDD/aipilot
claude plugin install aipilot@aipilot
```

### Codex

```bash
codex plugin marketplace add JililiDD/aipilot
codex plugin add aipilot@aipilot
```

### Grok Build

```bash
grok plugin install JililiDD/aipilot@v1.1.1 --trust
```

## 单一入口启动

你无需手动选择 Skill。`workflow-orchestrator` 会读取当前项目状态，恢复中断的记录，并自动将工作路由至对应阶段的 Skill。

使用 Slash 命令或自然语言 Prompt 启动或恢复工作：

```text
/aipilot 构建一个 TODO 列表应用
```
*或*
```text
使用 AIPilot 构建一个 TODO 列表应用。
```

在 **Codex** 中，从插件列表中选择 AIPilot 或选择 `Aipilot: Workflow Orchestrator` 作为入口。

```mermaid
flowchart LR
    Entry["/aipilot"] --> Orchestrator["workflow-orchestrator"]
    Orchestrator --> Requirement["product-spec-builder"]
    Requirement --> Design["design-spec-builder"]
    Design --> Plan["dev-plan-builder"]
    Plan --> Build["dev-builder"]
    Build --> Review["code-reviewer"]
    Review --> Merge["合并回写"]
    Review -->|审查意见| Build
```

* **智能阶段路由：** 对于无 UI 界面（如后端/CLI）的任务，系统会自动跳过视觉设计阶段（`design-spec-builder`）。当项目需要打包、部署、公开发布或最终交接时，会自动启用发布准备（Release Readiness）。
* **人工门控审查：** AIPilot 默认会在阶段边界处暂停，允许你在下一个 Skill 启动前审查当前文档，确保不会将误解的需求转化为错误的实施。

## 使用 ezreview 进行 HTML 文档审查（可选）

AIPilot 与 [ezreview](https://github.com/JililiDD/ezreview) 结合，为产品规格、设计规格、计划和 UI 原型提供交互式的浏览器审查循环。

1. **零 Token 消耗渲染：** AIPilot 使用 [marked](https://github.com/markedjs/marked) 将 Markdown 源码本地转换为临时 HTML 文件，不消耗任何 API Token。
2. **浏览器内批注：** `ezreview` 在浏览器中打开页面并提供批注工具，允许你针对具体标题、段落或界面元素附带反馈意见。
3. **自动化更新循环：** AIPilot 直接将反馈更新至 Markdown 源码，回复批注，并重新加载 HTML 预览以进行下一轮审查。
4. **批准与清理：** 循环持续直至你给予最终批准。Markdown 始终保持为唯一的真实来源——当审查关闭时，临时 HTML 文件会自动从会话暂存区中清理（或作为视觉设计产物保留）。

## 各 Skill 职责一览

工作流编排器会根据项目状态自动选择这些 Skill，但在需要时你也可以直接调用任何 Skill。

| Skill | 职责 |
| --- | --- |
| [`workflow-orchestrator`](../skills/workflow-orchestrator/SKILL.md) | 编排工作流阶段、跟踪项目状态、管理确认门控，并合并已批准的工作 |
| [`product-spec-builder`](../skills/product-spec-builder/SKILL.md) | 通过结构化访谈明确需求、作用域、行为、数据边界及验收标准 |
| [`design-spec-builder`](../skills/design-spec-builder/SKILL.md) | 将模糊的视觉方向转化为具体的布局、排版、组件交互及设计决策 |
| [`dev-plan-builder`](../skills/dev-plan-builder/SKILL.md) | 构建包含有序任务、复用策略及验证测试计划的可执行阶段路线图 |
| [`dev-builder`](../skills/dev-builder/SKILL.md) | 实施已批准的计划、收集执行证据，并在测试/构建失败时诊断根因 |
| [`code-reviewer`](../skills/code-reviewer/SKILL.md) | 基于产品规格、设计指南、实施计划及测试证据，在干净上下文中开展代码审查 |
| [`release-builder`](../skills/release-builder/SKILL.md) | 验证打包、权限、隐私合规、发布说明及部署准备情况 |
| [`note-keeper`](../skills/note-keeper/SKILL.md) | 将架构决策、发现的坑点及项目指南记录至持久化记忆中 |
| [`java-backend-expert`](../skills/java-backend-expert/SKILL.md) | 跨所有阶段提供 Spring Boot、REST API、JPA/SQL 及 JVM 架构的专业判断 |

## 跨会话保持项目记忆

AIPilot 将持久上下文存储在项目文档中。`workflow-orchestrator` 会在后续会话启动时读取这些记忆文件。

### `memory/decisions.md` 记录影响未来工作的决策

用于记录约束未来实施且未在产品/设计规格中明确的技术或架构选择。例如服务边界、持久化策略、身份验证模型、事务边界或改变产品长期设计方向的决策。

即使项目替换了旧决策，该决策仍会保留在历史记录中，后续条目会替代旧选择而不是重写历史。

### `memory/lessons.md` 记录约束与坑点

用于记录通过实施、诊断或集成工作发现的事实。例如第三方 API 限制、未公开的 SDK 行为、构建系统陷阱、平台权限要求或未来工作必须遵守的仓库规范。

避免后续会话在另一轮调试中重复踩坑。

### `memory/agent-guideline.md` 记录工作流改进

用于记录关于 AIPilot 应如何计划、提问、暂停、审查或汇报工作的项目专属指令。这些规则会在不改变 AIPilot 全局配置的前提下仅改变当前项目的日常工作流。

如果工作流存在缺陷，告诉 AIPilot 应该改进什么并使其生效。例如：

```text
For this project, always show API contract changes before writing the implementation plan. Remember this as a workflow rule.
```

## 选择 AIPilot 项目文档的存储位置

首次运行 AIPilot 时会初始化项目并询问文档存储路径。接受 `docs/aipilot/` 保存在项目内部，或指定任何自定义目录。

自定义目录可以位于仓库内部或外部。对于外部文档根目录，AIPilot 可以创建一个以项目命名的子文件夹，以便多个项目共享一个父目录。外部文档不会随 Git 分支或仓库克隆移动，因此请仅在确有必要时选择该选项。

AIPilot 会将解析后的位置写入项目根目录的 `AGENTS.md` 中的 `## AIPilot` 标题下。后续会话会在打开项目状态前读取该指针。默认布局为：

```text
docs/aipilot/
├── product-spec.md
├── design-spec.md
├── dev-phase-plan.md
├── memory/               # 记录第一条记忆时生成
│   ├── decisions.md
│   ├── lessons.md
│   └── agent-guideline.md
├── design-assets/
└── work-items/
    ├── active-change.md
    └── merged/
```

主规格书描述已批准的产品状态。活动工作项拥有挂起的 Requirement、Design、Plan 及 Execution Record，直至审查结束。合并回写会更新主文档并将已完成的工作项移动至 `work-items/merged/`。

冷启动会创建 `work-items/`、`work-items/merged/` 以及 `design-assets/`。`memory/` 目录保持延迟创建：记录第一条记忆的 Skill 会随对应的 Markdown 文件及必需标题一并创建它。

## 第三方软件

AIPilot 内置了两个采用 MIT 许可证的组件，用于离线文档审查：

- [ezreview](https://github.com/JililiDD/ezreview) `0.2.2` 打开可审查的 HTML 并返回锚定到元素的批注
- [marked](https://github.com/markedjs/marked) `18.0.6` 无需运行下载即可渲染 Markdown

参阅 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) 获取源码与许可证详情。
