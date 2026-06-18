# 开源项目融合方案

## 分类目录

开源项目已经按后续调用场景分类存放在 `open-source/`：

- `01-site-investigation`：勘察数据、AGS、CPT、钻孔、现场数据。
- `02-soil-lab-testing`：土工试验自动计算。
- `03-geotechnical-analysis`：岩土分析、边坡、液化、基础、地震动。
- `04-lims-lab-management`：实验室/LIMS 管理系统。
- `05-concrete-materials`：混凝土材料和强度预测。
- `06-instrument-data`：仪器通信和数据采集。
- `07-standards-data-models`：DIGGS、Excel、SQLite、数据标准。
- `08-inspection-test-management`：检验试验管理、电子实验记录、QA 检测台账。
- `09-test-automation-frameworks`：自动化试验执行、流程编排、接口/仪器脚本。
- `99-external-gpl-reference`：GPL/copyleft 外部参考。

结构化索引见 [open-source/catalog.json](../open-source/catalog.json)。

## 产品形态

融合后的产品按五个业态组织：

1. 资源交易：Excel 表格资源、积分下载、推广换积分。
2. 勘察数据：AGS/CPT/GEF 文件上传、校验、解析、钻孔数据管理。
3. 试验计算：筛分、含水率、干密度、压实度、液塑限、混凝土估算。
4. 岩土分析：承载力、边坡稳定、液化、地震动和反应谱处理。
5. 实验室管理：样品收样、试验委托、仪器采集、报告归档。

## 推荐模块组合

| 模块 | 优先项目 | 接入方式 |
| --- | --- | --- |
| AGS 勘察数据导入 | `python-ags4`, `agslint`, `pyagsapi` | Python/Node 服务，上传后校验和结构化入库。 |
| CPT/GEF 数据解析 | `pygef` | Python 服务，解析现场数据文件。 |
| 土工试验计算 | `geotech-utils`, `soiltools` | 当前 Node 内嵌 + 算法校核。 |
| 岩土设计分析 | `geolysis`, `PySlope`, `liquepy`, `geofound`, `eqsig` | Python FastAPI 微服务。 |
| 数据标准模型 | `DIGGS_SQL` | 数据库表设计和导入导出参考。 |
| 实验室管理 | `SENAITE LIMS`, `OpenELIS Global`, `LabKey Server` | 独立部署或参考流程设计。 |
| 检验试验管理 | `QATrack+`, `eLabFTW`, `Kiwi TCMS`, `TestLink` | QATrack+ 可服务化；GPL/AGPL 项目独立部署或参考流程。 |
| 自动化试验执行 | `Robot Framework`, `OpenHTF`, `TofuPilot`, `labgrid` | 用于接口、仪器、硬件设备、批量检测脚本编排和结果回传。 |
| 仪器采集 | `python-astm` | Python 采集网关。 |
| 混凝土预测 | `SustainableConcrete` | 独立 ML 服务。 |

## 许可证边界

MIT、Apache-2.0、BSD 类项目可优先内嵌或二开。GPL、LGPL、MPL 类项目需要按许可证做隔离设计；若未来要闭源或商业化，优先通过独立服务、API 调用或流程参考方式接入。

AGPL 项目尤其要谨慎：如果作为网络服务对外提供，通常需要开放对应服务源码。当前建议把 eLabFTW 作为独立系统或流程参考，不直接合并进主产品。

## 当前实现

当前 Node/Express 产品已实现：

- `/api/open-source/projects`：读取 `open-source/catalog.json` 返回分类后的开源项目清单。
- `/api/calculations/sieve`：筛分级配计算。
- `/api/calculations/moistureDensity`：含水率、干密度、压实度计算。
- `/api/calculations/atterberg`：液限、塑限、塑性指数计算。
- `/api/calculations/concrete`：混凝土强度、坍落度、GWP 轻量估算。

## 下一步工程化

1. 新增“勘察数据”页面，支持 AGS/GEF/CPT 文件上传和校验。
2. 把 `python-ags4`、`pygef`、`geolysis`、`PySlope` 包装为 Python FastAPI 服务。
3. 把计算结果落库，形成项目、钻孔、样品、检测项目和报告记录。
4. 用 ExcelJS 或 xlsx 把计算结果回填到现有 Excel 模板。
5. 仪器采集侧用 `python-astm` 做采集网关，再把结果写入当前系统。
6. 用 `QATrack+` 的思想设计“检验项目-频率-限值-趋势-审核”模块。
7. 用 `Robot Framework`、`OpenHTF`、`TofuPilot` 承接自动化试验脚本执行和报告回传。
