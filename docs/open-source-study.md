# 开源项目研究笔记

研究日期：2026-06-19

本仓库已将参考项目浅克隆到 `references/open_source/`。该目录已加入 `.gitignore`，仅用于本地研究，不随本项目提交。

## 参考项目清单

| 项目 | 本地目录 | 许可证 | 主要价值 | 对本项目的启发 |
|---|---|---:|---|---|
| FreeCAD-Reinforcement | `references/open_source/FreeCAD-Reinforcement` | LGPL 系列声明 | FreeCAD 钢筋建模、BOM、Rebar Shape Cut List、Bar Bending Schedule、SVG 形状表 | 后续可以学习其形状编码、SVG 翻样表、构件模板和 FreeCAD 插件接口，但不直接复制代码。 |
| OPTiBAR | `references/open_source/OPTiBAR` | GPL-3.0 | ETABS 输出到钢筋详图、AutoCAD 输出、构件模型、下料/实用优化、GUI/CLI | 适合作架构参考：`components`、`io`、`optimization`、`schemas`、`tests` 的边界清晰。GPL 代码不能直接混入 MIT 项目。 |
| BarMate | `references/open_source/BarMate` | 未明确 | BBS、切长、重量换算、6/7.5/9/12m 库存长度比较、Streamlit UI、AutoCAD 表格 | 业务点直接，但工程形态偏单文件原型。可借鉴用户流程，不复用代码。 |
| concrete-properties | `references/open_source/concrete-properties` | MIT | 任意钢筋混凝土截面属性、开裂、极限、M-phi、交互曲线 | 适合未来作为可选分析依赖或 API 参考，尤其是截面分析与结果对象设计。 |
| ConcreteDesignPy | `references/open_source/concretedesignpy` | MIT | ACI/NSCP 梁柱设计、剪力、扭转、挠度、M-phi、P-M 交互、Flask Web | 适合参考“计算器模块 + Web API + 报告”的组织方式。 |
| opcut | `references/open_source/opcut` | GPL-3.0 | 切割库存优化、CLI、REST、Web、OpenAPI schema | Windows 无法 checkout 其 `playground/dockerfiles` 中含冒号的文件名；可用 `git show` 读取源码对象。适合参考输入/输出 schema 与服务化边界，不直接复用 GPL 代码。 |

## 关键发现

### FreeCAD-Reinforcement

目录体现出完整的翻样链路：

- `StraightRebar.py`、`Stirrup.py`、`UShapeRebar.py` 等：按钢筋形状建模。
- `BeamReinforcement/`、`ColumnReinforcement/`、`SlabReinforcement/`、`FootingReinforcement/`：按构件生成钢筋。
- `BillOfMaterial/`：生成材料表。
- `RebarShapeCutList/`：生成钢筋形状切料表。
- `BarBendingSchedule/BBSfunc.py`：组合 BOM 和形状 SVG，生成 BBS。

对本项目的直接启发：

- BBS 不能只做数字表，应该保留 `shape_code`，未来输出 SVG/PNG/DXF 形状列。
- 输出应允许按 `mark`、`member/host`、直径分组。
- 几何建模和工程量统计要解耦，避免 CLI 和 CAD 插件互相绑定。

### OPTiBAR

核心结构：

- `src/core/components/rebar.py`：钢筋直径、面积、锚固、搭接、弯钩长度。
- `src/core/optimization/cut.py`：一维 cutting stock，使用 Pyomo + GLPK 列生成。
- `src/core/optimization/practical.py`、`shear.py`、`executive/`：更高层的实用配筋和类型数控制。
- `src/core/schemas/`：输入、输出、分析配置 JSON schema。
- `src/core/tests/`：组件、IO、优化测试。

对本项目的直接启发：

- 当前 MVP 用 first-fit decreasing，保持零外部求解器依赖。
- 下一阶段可以增加 `optimizer_backend`：`heuristic`、`milp`、`column_generation`。
- 钢筋规则应支持“默认公式 + 项目特殊长度表”两种来源。
- 用 schema 固化输入输出契约，便于接 Excel、ETABS、Web 和 CAD 插件。

### BarMate

业务能力集中在：

- `Cutlength()`：按弯折扣减计算切长。
- `bars_and_offcuts()`：给定切长、定尺和数量，计算原材根数和余料。
- `optimal_bar_size()`：在多个定尺长度中选余料较小者。
- BBS 表、PDF、CSV、AutoCAD 表格输出。

对本项目的直接启发：

- 用户需要的不只是最小余料，还需要“和固定 6m/9m/12m 方案对比节约多少”。
- 后续 CLI 可增加 `compare-stock-lengths`，输出不同定尺策略的损耗对比。
- UI 层可以先做 Streamlit/Flask 原型，但计算核心必须保持纯 Python 包。

### concrete-properties

适合做设计优化的“分析核心”参考：

- `ConcreteSection` 封装截面对象。
- 支持 gross、cracked、ultimate properties。
- 支持 moment-curvature、moment interaction、biaxial bending diagrams。
- 文档、测试、类型标注和工程质量较成熟。

对本项目的直接启发：

- 设计优化不要急着重写截面分析库；优先定义本项目自己的配筋候选、工程量、构造约束和接口。
- 未来可增加 `extras = ["analysis"]`，可选接入 `concreteproperties`。

### ConcreteDesignPy

项目按计算模块拆分：

- `calculators/beam_moment.py`
- `calculators/beam_shear.py`
- `calculators/beam_torsion.py`
- `calculators/column_interaction.py`
- `calculators/development_length.py`
- `webapp/routes/`

对本项目的直接启发：

- 结构设计规则应按构件/验算类型拆模块，不应堆进一个大函数。
- 报告输出应保留公式代入过程，方便工程复核。

### opcut

特点：

- 面向 cutting stock，提供 CLI、REST、Web 和 schema。
- Windows checkout 被 `playground/dockerfiles/build-opcut:...` 阻塞，因为文件名含冒号。
- 仍可通过 `git -C references/open_source/opcut show HEAD:<path>` 读取仓库对象。

对本项目的直接启发：

- 一开始就定义 JSON/CSV 输出结构，后续服务化成本低。
- GPL 项目只作为思路参考，不把实现拷入当前 MIT 项目。

## 本项目路线调整

当前 MVP 保持轻量：

1. `models.py`：钢筋标记、长度、重量、面积。
2. `detailing.py`：CSV 输入、BBS 汇总、直径汇总。
3. `cutting.py`：同直径定尺钢筋的一维下料优化。
4. `design.py`：按所需面积选筋。
5. `cli.py`：命令行入口。

下一阶段建议：

1. 增加 `rules.py`：把弯钩、弯曲调整、锚固、搭接从硬编码改为规则表。
2. 增加 `shape.py`：形状编码、段长、弯折角、SVG/DXF 输出接口。
3. 增加 `stock.py`：支持多种定尺、余料池和采购策略。
4. 增加 `schemas/`：定义 JSON schema，作为 Web/CAD/Excel 插件共同契约。
5. 增加 `adapters/`：Excel、DXF、FreeCAD、AutoCAD、ETABS 输出导入。
6. 增加 `optimizer/exact.py`：可选依赖 Pyomo/OR-Tools，作为精确优化后端。
