# 数字化营销开源工具集

> 目标：把营销自动化、客户经营、内容获客、数据分析和转化实验相关的开源项目，整理成可拉取、可评估、可二次集成的工具集。

## 1. 获取方式

在线仓库：

```text
https://github.com/whb786200/whb786200/tree/main/digital-marketing-open-source-toolkit
```

拉取本工具集及全部子模块源码：

```bash
git clone --recurse-submodules https://github.com/whb786200/whb786200.git
cd whb786200/digital-marketing-open-source-toolkit
```

如果已经克隆了大仓：

```bash
git submodule update --init --recursive --depth 1 digital-marketing-open-source-toolkit/tools
```

也可以使用脚本按清单拉取：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\fetch-tools.ps1
```

```bash
bash ./scripts/fetch-tools.sh
```

## 2. 工具矩阵

| 类别 | 项目 | 用途 | 许可证 |
|------|------|------|--------|
| 营销自动化 | Mautic | 线索培育、邮件活动、营销自动化 | GPL-3.0 |
| 邮件营销 | listmonk | 自托管 newsletter、邮件列表、群发管理 | AGPL-3.0 |
| 邮件营销 | SendPortal | 自托管邮件营销和 newsletter | MIT |
| CRM | Twenty | 现代 CRM，可用于客户和销售流程管理 | AGPL-3.0 |
| CRM | SuiteCRM | 传统企业级 CRM | AGPL-3.0 |
| 客户沟通 | Chatwoot | 在线客服、邮件支持、全渠道会话 | MIT |
| Web 分析 | Matomo | 自托管网站分析，Google Analytics 替代 | GPL-3.0 |
| Web 分析 | Plausible Analytics | 隐私友好的轻量网站分析 | AGPL-3.0 |
| Web 分析 | Umami | 隐私友好的网站分析 | MIT |
| 增长实验 | GrowthBook | Feature Flag、A/B 测试、实验分析 | MIT/Open Core |
| 表单调研 | Formbricks | 问卷、用户反馈、NPS 和调研 | AGPL-3.0/Open Core |
| 链接追踪 | Shlink | 自托管短链接和访问统计 | MIT |
| 预约转化 | Cal.com / Cal DIY | 预约排期、线索转预约 | MIT |
| 工作流自动化 | Huginn | 监控、触发器、自动化代理 | MIT |
| AI应用案例库 | awesome-llm-apps | 100+ AI Agent、RAG、Chat with X 和多智能体案例，可作为营销/工程资料 AI 应用二次开发起点 | Apache-2.0 |

## 2.1 AI应用案例库：awesome-llm-apps

项目地址：

```text
https://github.com/Shubhamsaboo/awesome-llm-apps
```

许可证：Apache-2.0，可商用、可修改、可分发，但需要保留许可证和版权声明。

推荐拉取方式：

```powershell
git clone --depth 1 https://github.com/Shubhamsaboo/awesome-llm-apps.git
```

当前本地尝试位置：

```text
D:\Codex\projects\数字化\open_source_ai_apps\awesome-llm-apps-shallow
D:\Codex\projects\数字化\open_source_ai_apps\awesome-llm-apps-complete
D:\Codex\projects\数字化\open_source_ai_apps\awesome-llm-apps-main.zip
```

当前状态：已取得 Git 提交和 1791 条文件树清单，但 GitHub 大包下载/checkout 多次因网络超时中断，完整源码尚未稳定落盘。后续网络恢复后继续执行上方 clone 命令即可。

优先改造方向：

| 子项目方向 | 仓库路径 | 落地用途 |
|------------|----------|----------|
| 房地产智能体团队 | `advanced_ai_agents/multi_agent_apps/agent_teams/ai_real_estate_agent_team` | 项目、房源、客群、竞品和市场问答 |
| 销售情报团队 | `advanced_ai_agents/multi_agent_apps/agent_teams/ai_sales_intelligence_agent_team` | 销售话术、客户分层、渠道线索分析 |
| 竞品情报团队 | `advanced_ai_agents/multi_agent_apps/agent_teams/ai_competitor_intelligence_agent_team` | 竞品楼盘、价格、活动、卖点自动汇总 |
| 数据分析智能体 | `starter_ai_agents/ai_data_analysis_agent` | 到访、转化、渠道、费用和日报数据分析 |
| 知识图谱 RAG | `rag_tutorials/knowledge_graph_rag_citations` | 制度、合同、工程资料问答并保留引用 |
| 多模态 RAG | `rag_tutorials/multimodal_agentic_rag` | 图纸、照片、PDF、项目资料混合问答 |

## 3. 推荐组合

### 3.1 轻量营销闭环

| 环节 | 工具 |
|------|------|
| 线索表单/调研 | Formbricks |
| 邮件触达 | listmonk |
| 网站分析 | Umami 或 Plausible |
| 链接追踪 | Shlink |
| 预约转化 | Cal DIY |

### 3.2 标准营销自动化闭环

| 环节 | 工具 |
|------|------|
| 营销自动化 | Mautic |
| CRM | Twenty 或 SuiteCRM |
| 客户沟通 | Chatwoot |
| 数据分析 | Matomo |
| 工作流联动 | Huginn |

### 3.3 增长实验闭环

| 环节 | 工具 |
|------|------|
| 网站分析 | Umami / Plausible / Matomo |
| 实验与 Feature Flag | GrowthBook |
| 反馈调研 | Formbricks |
| 短链归因 | Shlink |

## 4. 本地目录

子模块源码默认位于：

```text
digital-marketing-open-source-toolkit/tools/
```

机器可读清单：

```text
digital-marketing-open-source-toolkit/tools.json
digital-marketing-open-source-toolkit/tools-lock.json
```

脚本：

```text
digital-marketing-open-source-toolkit/scripts/fetch-tools.ps1
digital-marketing-open-source-toolkit/scripts/fetch-tools.sh
```

## 5. 许可证和使用边界

1. 本目录只做开源项目索引、子模块引用和拉取脚本，不把第三方源码直接复制改名为自有代码。
2. 每个项目的许可证以原仓库 `LICENSE` 文件为准。商用部署、二次分发、修改后发布前，必须复核原项目许可证。
3. AGPL/GPL 项目尤其要注意网络服务、修改发布和源码提供义务。
4. Open Core 项目可能存在社区版/企业版边界，集成前应确认可用模块范围。
5. 项目版本会随原仓库更新变化，生产使用前应固定 commit/tag 并做安全审计。

## 6. 已锁定源码版本

本工具集用 Git 子模块锁定每个项目的当前远端 HEAD，具体 commit 见 `tools-lock.json`。如果需要更新版本：

```bash
git submodule update --remote digital-marketing-open-source-toolkit/tools/<tool-slug>
git add .gitmodules digital-marketing-open-source-toolkit/tools/<tool-slug> digital-marketing-open-source-toolkit/tools-lock.json
git commit -m "Update digital marketing tool submodules"
```
