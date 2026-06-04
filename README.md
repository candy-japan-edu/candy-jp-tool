# Candy 日本校内考雷达

每天自动检测 30 所日本大学官方留学生入试页面，捕获变化，提供 Candy 老师人工解读。

## 工作机制

1. GitHub Actions 每天日本时间 9:00 跑 `scripts/check-updates.mjs`
2. 脚本逐个检查 `data/watch-list.json` 中的所有 URL
3. 计算页面内容 hash，与上次对比
4. 有变化 -> 写入 `data/updates.json` -> 自动 commit + push
5. Vercel 检测到 push -> 自动重新部署网站
6. Candy 老师每天看 `data/updates.json`，给新增的 `candy_comment` 字段填解读
7. 解读填完 push 后，网站立刻更新

## 维护操作

### Candy 老师每日操作（约 15 分钟）

1. 查看 GitHub 仓库 `data/updates.json`
2. 找到最新一批 `candy_comment` 为空的记录
3. 打开对应的 `watch_url`，对比官网当前内容
4. 在 GitHub 网页直接编辑 `data/updates.json`：
   - 填入 `candy_comment`（1-3 句话）
   - 填入 `candy_comment_at`（当前时间 ISO 格式）
5. 提交修改

### 增减监控学校

修改 `data/watch-list.json`，按现有格式增减条目即可。

## 技术栈

- 静态 HTML/CSS/JS（无构建步骤）
- Node.js（仅 GitHub Actions 中使用）
- GitHub Actions（每日定时）
- Vercel（自动部署）

## 本地检查

```bash
node --check scripts/check-updates.mjs
CANDY_DRY_RUN=1 CANDY_CHECK_LIMIT=3 CANDY_CHECK_DELAY_MS=100 node scripts/check-updates.mjs
```

## 免责声明

本网站监控的是公开的大学入试信息页面，仅用于教育研究目的。所有解读为 Candy 老师个人观点，不代表大学官方立场。最终申请决策请以各校官方公告为准。
