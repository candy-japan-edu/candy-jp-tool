# 部署到微信公众号怎么做

微信公众号不能直接“部署”一个 H5 文件。正确方式是：

1. 先把 H5 部署到 Vercel，得到一个 HTTPS 网址。
2. 再把这个 HTTPS 网址放进公众号菜单、图文消息或自动回复里。
3. 用户在微信里点链接后，会用微信内置浏览器打开这个 H5。

## 1. 推到 GitHub

把当前项目文件放进你已关联 Vercel 的仓库：

```text
https://github.com/candy-japan-edu/candy-jp-tool
```

需要包含这些核心文件：

- `index.html`
- `school.html`
- `compare.html`
- `styles.css`
- `app.js`
- `assets/candy-avatar.jpg`
- `assets/candy-qrcode.png`
- `data/schools.json`
- `data/filters.json`
- `data/admission-sources.json`

## 2. Vercel 部署

如果仓库已经绑定 Vercel：

1. GitHub push 后，Vercel 会自动部署。
2. 部署完成后复制 Production URL。
3. 打开以下页面检查：

```text
https://你的域名/
https://你的域名/school.html?id=todai-eng-mech
https://你的域名/compare.html
```

## 3. 放进公众号菜单

公众号后台路径：

```text
内容与互动 / 自定义菜单
```

菜单类型选择：

```text
跳转网页
```

菜单名称建议：

```text
校内考查询
```

网页地址填写 Vercel 的 HTTPS 首页地址：

```text
https://你的域名/
```

## 4. 放进图文消息

可以在公众号文章里放：

- 阅读原文链接
- 文中二维码海报
- 自动回复关键词，比如“校内考”

链接都指向：

```text
https://你的域名/
```

## 5. 是否需要公众号网页授权

当前版本不需要登录、不需要获取用户 openid、不需要网页授权。

如果后续要做这些功能，才需要配置：

- 公众号 JS 接口安全域名
- 网页授权域名
- 后端接口

## 6. 微信内置浏览器注意事项

- 不要用 `file://` 或 `localhost` 给家长访问。
- 必须使用 HTTPS。
- 页面里的 JSON 文件要和 HTML 同域部署。
- 二维码图片建议压缩到 1MB 以下。
- 如果绑定自己的域名，国内访问体验可能受 DNS 和跨境网络影响；要稳定承接家长，建议后续评估国内 CDN 或备案域名。
