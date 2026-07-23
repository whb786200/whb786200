# Open Source Catalog

本目录按后续产品调用场景分类存放开源项目。每个仓库保持原始目录结构，分类目录只负责组织，不修改仓库内部代码。

## 目录分类

| 目录 | 用途 | 代表项目 |
| --- | --- | --- |
| `01-site-investigation` | 勘察数据、AGS、CPT、钻孔和现场数据 | `python-ags4`, `pyagsapi`, `agslint`, `pygef` |
| `02-soil-lab-testing` | 土工试验自动计算 | `geotech-utils`, `soiltools` |
| `03-geotechnical-analysis` | 岩土分析、边坡、液化、基础、地震动 | `geolysis`, `liquepy`, `PySlope`, `geofound`, `eqsig` |
| `04-lims-lab-management` | 实验室/LIMS 管理 | `senaite.core`, `openelisglobal-core`, `labkey-server` |
| `05-concrete-materials` | 混凝土材料和强度预测 | `SustainableConcrete`, `upv-compressive-strength-predictions` |
| `06-instrument-data` | 仪器通信和采集协议 | `python-astm` |
| `07-standards-data-models` | 数据标准、DIGGS、Excel/SQLite 模型 | `DIGGS_SQL` |
| `08-inspection-test-management` | 检验试验管理、电子实验记录、QA 测试台账 | `elabftw`, `qatrackplus`, `kiwi-tcms`, `testlink` |
| `09-test-automation-frameworks` | 自动化试验执行、流程编排、接口/仪器脚本 | `robotframework`, `openhtf`, `tofupilot`, `labgrid` |
| `99-external-gpl-reference` | GPL/copyleft 参考项目 | `soilphysics` |

## 调用索引

结构化索引文件是 [catalog.json](catalog.json)。后端接口 `/api/open-source/projects` 会读取这个文件，因此新增或移动仓库后应同步更新该 JSON。

## 推荐接入顺序

1. 勘察数据导入：`python-ags4`、`agslint`、`pygef`。
2. 土工试验自动计算：`geotech-utils`、`soiltools`。
3. 岩土分析服务：`geolysis`、`PySlope`、`liquepy`、`geofound`。
4. 实验室管理参考：`SENAITE LIMS`、`OpenELIS Global`、`LabKey Server`。
5. 仪器采集：`python-astm`。
6. 检验试验管理：`QATrack+`、`eLabFTW`、`Kiwi TCMS`、`TestLink`。
7. 试验自动化执行：`Robot Framework`、`OpenHTF`、`TofuPilot`、`labgrid`。

## 待网络恢复后补拉

以下项目适合继续研究，但本次 GitHub/GitLab 连接仍失败，未成功克隆：

- `OpenTAP`：通用测试自动化平台，适合仪器/硬件测试执行。
- `Squash TM`：测试管理平台，源码主要在 GitLab，适合参考测试计划和执行管理。
