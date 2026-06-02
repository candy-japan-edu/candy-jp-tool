# Candy 校内考数据库字段说明

> 当前 H5 读取 `data/schools.json`。从腾讯文档导出 CSV 时，请按 `data/schools-template.csv` 的表头填写，再转成同字段 JSON。

## 必填字段

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| id | string | 唯一标识，建议用学校英文缩写-学部-专业 | `todai-eng-mech` |
| school_name_cn | string | 中文学校名 | `东京大学` |
| school_type | string | `国公立` / `私立` | `国公立` |
| tier | number | 1 / 2 / 3 | `1` |
| faculty | string | 学部名 | `工学部` |
| major | string | 专业名 | `機械工学科` |
| application_window_start | date | 出愿开始，YYYY-MM-DD | `2026-11-18` |
| application_window_end | date | 出愿截止，YYYY-MM-DD | `2026-12-05` |
| exam_date | date | 校内考日期，YYYY-MM-DD | `2027-02-25` |
| exam_form | array | JSON 用数组；CSV 用英文逗号分隔 | `["笔试","面试"]` |
| required_documents | array | JSON 用数组；CSV 用英文逗号分隔 | `["志望理由书","EJU成绩单"]` |
| candy_review | string | Candy 点评，建议 1-2 段，不超过 300 字 | `竞争强，适合...` |

## 推荐字段

| 字段 | 类型 | 说明 |
|---|---|---|
| school_name_jp | string | 日文学校名 |
| region | string | `关东` / `关西` / `其他` |
| direction | string | `理科` / `文科` / `艺术` / `医学` |
| major_category | string | 大类标签，例如 `理工-机械` |
| subject_tags | array | 选科标签 |
| eju_subjects_required | array | EJU 必考或参考科目 |
| eju_japanese_min | number | 日语参考分 |
| english_required | boolean | 是否强制英语成绩 |
| english_min | string | 英语要求描述 |
| result_date | date | 合格发表日 |
| exam_subjects | string | 校内考科目 |
| exam_description | string | 校内考说明 |
| exam_tips | string | 备考建议 |
| candy_tags | array | 标签 |
| candy_rating | number | 1-5 推荐度 |

## 可选字段

| 字段 | 类型 | 说明 |
|---|---|---|
| official_url | string | 官网或入试要项页 |
| logo | string | 图片文件名，留空则使用学校首字母占位 |
| other_requirements | string | 其他要求 |
| updated_at | date | 数据更新日期 |

## 填写规范

- 日期统一 `YYYY-MM-DD`。
- CSV 里的数组字段用英文逗号，不要用中文逗号。
- 未官网核验的日期不要标正式数据，可先留空或在运营文档中标记“待核验”。
