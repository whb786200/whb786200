# 试验工程师数据自动化平台

这是一个本地可运行的试验工程师产品原型，已把资源下载、注册人员入口、积分推广和试验数据自动计算放到同一个工作台。

## 已内嵌功能

- 注册人员入口：用户名、姓名、单位、证书编号、手机号、推广码。
- 积分管理：注册赠送、下载扣分、推广奖励、管理员手动加减分。
- 推广换积分：用户生成推广链接，成功注册一次推荐人加 10 分。
- 表格资源库：从 `工程质量检测常用Excel计算表格（139套）.zip` 导入 Excel 表格，支持检索、分类、按积分下载。
- 自动计算工作台：筛分级配、含水率/干密度/压实度、液塑限、混凝土性能轻量估算。
- 开源融合清单：展示已克隆国外开源项目、许可证、技术栈、可融合方式。

## 已克隆的开源项目

仓库都在 `open-source/` 下，并已按领域分类：

- `01-site-investigation`：勘察数据、AGS、CPT、钻孔和现场数据。
- `02-soil-lab-testing`：土工试验自动计算。
- `03-geotechnical-analysis`：岩土分析、边坡、液化、基础、地震动。
- `04-lims-lab-management`：实验室/LIMS 管理系统。
- `05-concrete-materials`：混凝土材料和强度预测。
- `06-instrument-data`：仪器通信和采集协议。
- `07-standards-data-models`：DIGGS、Excel、SQLite 数据模型。
- `08-inspection-test-management`：检验试验管理、电子实验记录、QA 检测台账。
- `09-test-automation-frameworks`：自动化试验执行、流程编排、接口/仪器脚本。
- `99-external-gpl-reference`：GPL/copyleft 外部参考项目。

详细融合方案见 [docs/open-source-fusion.md](docs/open-source-fusion.md)。
结构化调用索引见 [open-source/catalog.json](open-source/catalog.json)。

## 使用

```powershell
npm install
npm run import:resources
npm start
```

默认访问：`http://localhost:3000`

默认管理员：

- 用户名：`admin`
- 密码：`admin123`

## 数据文件

- `data/db.json`：用户、积分流水。
- `data/resources.json`：表格资源索引。
- `public/resources/`：导入后的 Excel 文件。

## 积分规则

- 自然注册：+5 分。
- 使用推广码注册：新用户 +3 分，推荐人 +10 分。
- 下载资源：普通表格 1 分，计算类表格 2 分，规范清单类免费。
- 管理员可在“人员管理”中手动加减积分。
