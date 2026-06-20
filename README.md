# SteelReinforcement

钢筋翻样与设计优化开源项目雏形。当前版本先聚焦三个可落地能力：

- 钢筋明细输入：按编号、直径、根数、分段长度、弯钩生成翻样明细。
- 工程量汇总：计算单根长度、总长度、理论重量，并按直径汇总。
- 定尺下料优化：按同直径钢筋做一维下料排布，输出每根原材的切割组合、余料和利用率。
- 选筋优化：给定所需钢筋面积，搜索满足面积且浪费较小的直径/根数组合。

> 说明：本项目当前是工程计算 MVP，不替代结构设计责任、规范审查或企业翻样规则。锚固、搭接、弯曲调整值、构造要求应按项目所在地规范和企业规则扩展。

## 安装

```bash
python -m pip install -e ".[dev]"
```

## 快速开始

使用示例钢筋表生成翻样汇总：

```bash
steelreinforcement summarize examples/sample_bars.csv --out outputs/summary.csv
```

生成定尺下料方案：

```bash
steelreinforcement optimize-cuts examples/sample_bars.csv --stock-length-mm 12000 --out outputs/cutting_plan.csv
```

做一个简单选筋优化：

```bash
steelreinforcement select-bars --required-area-mm2 1600 --diameters 16,18,20,22,25 --max-bars 8
```

生成项目管理模型：

```bash
steelreinforcement project-demo examples/sample_bars.csv --out outputs/project.json
```

初始化可持久化项目文件：

```bash
steelreinforcement project-init examples/sample_bars.csv --out outputs/project_state.json
steelreinforcement project-status outputs/project_state.json
```

推进工作包状态：

```bash
steelreinforcement advance-package outputs/project_state.json WP-XXXXXXXX detailing --actor planner
```

生成 AI 智能体任务接口数据：

```bash
steelreinforcement agent-tasks examples/sample_bars.csv --out outputs/agent_tasks.json
steelreinforcement project-agent-tasks outputs/project_state.json --out outputs/project_agent_tasks.json
```

比较两版翻样表，输出设计变更影响：

```bash
steelreinforcement compare-schedules examples/sample_bars.csv examples/sample_bars_rev_b.csv --out outputs/change_impact.json
```

启动本地项目管理台：

```bash
steelreinforcement serve outputs/project_state.json --host 127.0.0.1 --port 8765
```

然后打开 `http://127.0.0.1:8765`。

## CSV 输入格式

`examples/sample_bars.csv`:

```csv
mark,member,diameter_mm,quantity,segments_mm,hooks,steel_grade,remark
B1-01,Beam B1,20,18,4200+300+4200,90;90,HRB400,bottom longitudinal
B1-02,Beam B1,10,80,250+450+250,135;135,HPB300,stirrup
```

字段说明：

- `mark`：钢筋编号。
- `member`：构件名，可为空。
- `diameter_mm`：公称直径，单位 mm。
- `quantity`：根数。
- `segments_mm`：中心线分段长度，支持 `4200+300+4200`、`;`、`,` 或空格分隔。
- `hooks`：弯钩类型，支持 `90`、`135`、`180`、`none`，多个用 `;`、`,`、`+` 或空格分隔。
- `steel_grade`：钢筋牌号，可为空。
- `remark`：备注，可为空。

## 开发路线

1. 完善企业/规范可配置规则：弯曲调整值、锚固、搭接、抗震构造。
2. 支持更多构件模板：梁、板、柱、墙、基础、桩。
3. 增加 DXF/Excel 输出和 AutoCAD/FreeCAD/Revit 接口。
4. 引入库存余料池、采购定尺组合、多目标优化。
5. 接入结构分析结果，形成“设计结果 -> 配筋优化 -> 翻样 -> 下料”的工作流。

## 数字化管理模型

新增的管理底座包含三层：

- `project.py`：项目、图纸版本、构件、工作包、变更集、状态历史。
- `workflow.py`：从 `draft` 到 `closed` 的钢筋业务状态流转校验。
- `agents.py`：面向 AI 智能体的任务契约，包括翻样、规则校核、下料优化、变更影响、项目管理和成本控制任务。
- `storage.py`：项目 JSON 持久化，可保存状态历史并继续推进工作包。
- `change.py`：两版钢筋翻样表对比，输出增删改、重量变化和影响数量。
- `server.py` + `web/`：本地 HTTP API 和浏览器管理台，支持查看项目、推进工作包、加载智能体任务。

典型状态流：

```text
draft -> detailing -> checking -> approved -> optimized
-> issued_for_fabrication -> fabricated -> delivered
-> installed -> inspected -> closed
```

这套模型用于把钢筋翻样从单次计算扩展为项目级闭环：图纸来源、构件、BBS、下料、采购、加工、配送、安装、验收都能被统一追踪。

## 开源项目研究

本地参考项目克隆在 `references/open_source/`，该目录已加入 `.gitignore`。研究记录见 [docs/open-source-study.md](docs/open-source-study.md)。
