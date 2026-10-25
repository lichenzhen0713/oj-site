# LCZOJ 官网与文档中心

LCZOJ 开源项目的官方介绍页与文档中心：纯静态、零依赖、零外链资源，可直接托管在任意静态服务器上。

- 线上地址：<https://lichenzhen0713.github.io/oj-site/>
- 仓库地址：<https://github.com/lichenzhen0713/oj-site>
- 官网首页：`index.html`
- 文档中心：`docs/index.html`（15 篇文档）

## 目录

```
.
├── index.html          官网首页（内联 SVG 图标雪碧图）
├── css/style.css       官网样式（亮 / 暗两套主题令牌）
├── css/docs.css        文档中心样式（三栏布局、正文排版、搜索弹窗）
├── js/main.js          官网交互：主题、导航、标签页、复制、滚动入场
├── js/site-config.js   站点配置：测试站地址
├── js/docs.js          文档中心交互：搜索、目录高亮、代码复制
├── docs/               预渲染的文档中心 + 每篇文档 + search-index.json
├── assets/             站徽、favicon、界面截图（webp + png 回退）
├── serve.js            本地预览 / 静态托管（Node 内置模块，零依赖）
└── README.md           本文件
```

## 本地预览

需要 Node.js ≥ 18（不需要 `npm install`）：

```bash
node serve.js
# 打开 http://127.0.0.1:8088/
# 文档中心：http://127.0.0.1:8088/docs/
```

自定义端口：`PORT=9000 node serve.js`（Windows：`set PORT=9000 && node serve.js`）。

也可以直接双击 `index.html` 预览；搜索功能需要 HTTP 环境（`serve.js` 或任意静态服务器），因为它会按需加载 `docs/search-index.json`。

## 测试站入口

官网首页 Hero、页脚与文档中心页脚都有「测试站」入口，地址由 `js/site-config.js` 控制：

```js
window.LCZOJ_TEST_SITE = '';
```

- 留空：自动指向「当前访问主机的 80 端口」。例如官网在 `http://127.0.0.1:8088/` 打开时，入口是 `http://127.0.0.1/`；在局域网 `http://192.168.0.101:8088/` 打开时，入口是 `http://192.168.0.101/`。
- 指定：部署到公网、或测试站不在同一主机的 80 端口时，写入完整地址，例如：

  ```js
  window.LCZOJ_TEST_SITE = 'https://oj.example.com';
  ```

> GitHub Pages 只能托管静态页面，不能运行 LCZOJ 的 Node.js 判题服务。当前 Pages 上没有 OJ 实例，未配置真实地址时页面会在 `*.github.io` 上自动隐藏「测试站」入口，避免死链；绑定自定义域名并部署 OJ 后，把地址写入 `js/site-config.js` 即可恢复。

## 文档中心

`docs/` 是已经构建好的静态文档，不要手改 HTML。文档源文件位于 LCZOJ 主仓库的 `README.md` 与 `docs/*.md`，由主仓库中的 `site/build-docs.js` 预渲染后同步到这里。

同步内容：

- `docs/<slug>.html`：每篇文档一页（左侧导航、正文、右侧本页目录、上一篇 / 下一篇）；
- `docs/index.html`：文档中心（分组卡片 + 全文搜索入口）；
- `docs/search-index.json`：客户端搜索索引，打开搜索时才加载。

## 部署

### GitHub Pages（当前）

- 线上地址：<https://lichenzhen0713.github.io/oj-site/>
- 发布方式：`main` 分支根目录；根目录的 `.nojekyll` 关闭 Jekyll 处理

推送 `main` 后 GitHub Pages 会自动重新构建，通常 1 分钟内生效。

### 其它静态托管

站点是纯静态文件，任选一种方式：

- **任意静态托管**：把仓库根目录内容上传到 Netlify、Vercel、对象存储等；
- **Nginx**：

  ```nginx
  server {
    listen 80;
    server_name lczoj.example.com;
    root /var/www/lczoj-site;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }
  }
  ```

- **与 OJ 同机**：用 `serve.js` 监听一个内网端口，由 Nginx 反代到该端口即可，不影响 OJ 主服务。

## 内容维护

- 官网文案在 `index.html` 中，按区块注释定位即可；
- 首页截图位于 `assets/home-light.*` 与 `assets/home-dark.*`，替换同名文件即可（建议 1200×750，webp + png 各一份）；
- 文档 HTML 由 LCZOJ 主仓库预渲染后同步，修改源 Markdown 后重新生成，不要直接编辑 `docs/`；
- 若通过 Nginx 托管，注意为 CSS / JS / 截图配置缓存策略，文档页可按需加 `Cache-Control`。

## 与主站的关系

官网与 OJ 主程序相互独立：本仓库只包含静态页面，不参与 LCZOJ `server.js` 的路由，也不会被 OJ 的静态资源服务读取。

唯一的关联是站徽 `assets/logo.svg` 与主站 `public/img/logo.svg` 保持一致，以及文档源文件共用主仓库的 `docs/`。
