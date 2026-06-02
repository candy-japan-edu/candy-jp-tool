# Candy 日本校内考查询库

移动端优先的纯静态 H5，用来查询日本大学校内考时间、考试形式、出愿要求，并引导用户添加 Candy 老师微信咨询。

## 已实现

- 首页 `index.html`
  - 考试时间月历前置展示
  - 学校名 / 日文名 / 学部 / 专业 / 标签实时搜索
  - 档位、类型、方向、地区多选筛选
  - 时间轴 / 列表视图切换
  - 从 `schools.json` 自动派生出愿截止、校内考、合格发表 3 类事件
  - 滚动后出现底部微信咨询 CTA

- 详情页 `school.html?id={id}`
  - 学校与专业基础信息
  - 出愿窗口、校内考日期、合格发表日
  - 准入要求 / 校内考 / Candy 说 3 个 Tab
  - 必交材料
  - 官方原文 / 募集要項链接、原文摘录、爬取快照状态
  - 加入对比与微信咨询

- 对比页 `compare.html?ids=id1,id2,id3`
  - 支持最多 3 个专业横向对比
  - 第一列字段固定
  - 差异字段粉色高亮
  - LocalStorage 保存对比清单

## 数据文件

- `data/schools.json`：H5 主数据，当前为第一批 10 所 × 3 专业样例数据。
- `data/filters.json`：筛选项配置。
- `data/schools.schema.md`：字段说明和填写规范。
- `data/schools-template.csv`：腾讯文档 / 表格录入空模板。
- `data/schools-sample.csv`：由当前 30 条 JSON 数据导出的样例表。
- `data/admission-sources.json`：官方募集要項入口、原文摘录和核验说明。
- `data/source-snapshots.json`：由爬取脚本生成的官方页面快照状态。
- `data/verification-report.md`：当前 30 条数据的核验报告。
- `DEPLOY_WECHAT_OFFICIAL_ACCOUNT.md`：微信公众号投放/部署说明。

> 当前日期和要求是产品演示样例。正式上线前，请用官网募集要项或腾讯文档核验后的真实数据覆盖。

## 本地预览

因为页面通过 `fetch()` 读取 JSON，建议使用静态服务器预览：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173/
```

## 表格导出

更新 `data/schools.json` 后，可重新生成样例 CSV：

```bash
node scripts/export-schools-csv.mjs
```

## 官方来源爬取

更新 `data/admission-sources.json` 后，可重新抓取官方页面状态：

```bash
node scripts/crawl-admission-sources.mjs
```

## 可选验证

本机安装 Playwright 后，可以跑浏览器回归脚本：

```bash
node scripts/verify-h5.mjs
```

如果需要指定 Chrome：

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/verify-h5.mjs
```

## 部署

把这些文件推到已关联 Vercel 的 GitHub 仓库即可自动部署。项目没有 React/Vue/Webpack，也没有构建步骤。
