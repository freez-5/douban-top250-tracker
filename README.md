# Top 250 变化追踪器

自动追踪豆瓣和IMDB电影Top 250榜单变化的网站，可以观察哪些电影新进入榜单、哪些电影掉出榜单。

## ✨ 功能特点

- 🎬 **双榜单支持**：同时支持豆瓣和IMDB Top 250榜单
- 📊 **变化追踪**：实时显示新进入、掉出、排名上升/下降的电影
- 📋 **完整榜单**：查看完整的Top 250列表，支持排序和筛选
- 🔍 **搜索功能**：快速搜索电影名称、导演、演员
- 📅 **历史数据**：查看历史快照，对比不同时期的数据
- 📱 **响应式设计**：支持桌面、平板、手机等多种设备
- 🔄 **自动更新**：每周自动爬取最新数据
- 🎨 **主题切换**：豆瓣绿色/IMDB黄色主题自动切换

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/freez-5/douban-top250-tracker.git
cd douban-top250-tracker
```

### 2. 运行爬虫（首次）

确保已安装Python 3.7+和依赖：

```bash
pip install requests beautifulsoup4

# 爬取豆瓣Top 250
python scripts/scrape.py

# 爬取IMDB Top 250
python scripts/scrape_imdb.py
```

### 3. 本地预览

使用任意HTTP服务器启动本地预览：

```bash
# 使用Python内置服务器
python -m http.server 8000

# 或使用Node.js的http-server
npx http-server
```

然后在浏览器访问 `http://localhost:8000`

## 📦 部署到GitHub Pages

### 1. 创建GitHub仓库

在GitHub上创建一个新仓库，命名为 `douban-top250-tracker`

### 2. 推送代码

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/freez-5/douban-top250-tracker.git
git push -u origin main
```

### 3. 启用GitHub Pages

1. 进入仓库的 Settings 页面
2. 找到 Pages 选项
3. Source 选择 `Deploy from a branch`
4. Branch 选择 `main`，文件夹选择 `/ (root)`
5. 点击 Save

### 4. 启用GitHub Actions

1. 进入仓库的 Actions 页面
2. 如果提示启用Workflows，点击启用
3. 爬虫将每周自动运行（北京时间早上8点）

## 📁 项目结构

```
douban-top250-tracker/
├── .github/
│   └── workflows/
│       └── scrape.yml              # GitHub Actions配置
├── scripts/
│   ├── scrape.py                   # 豆瓣爬虫脚本
│   └── scrape_imdb.py              # IMDB爬虫脚本
├── data/
│   ├── douban/
│   │   ├── current.json            # 豆瓣当前Top 250数据
│   │   └── history/                # 豆瓣历史快照
│   └── imdb/
│       ├── current.json            # IMDB当前Top 250数据
│       └── history/                # IMDB历史快照
├── index.html                      # 主页面
├── style.css                       # 样式文件
├── script.js                       # 前端逻辑
└── README.md                       # 项目说明
```

## 🔧 配置说明

### 修改更新频率

编辑 `.github/workflows/scrape.yml` 文件中的 cron 表达式：

```yaml
schedule:
  # - cron: '0 0 * * *'  # 每天UTC 0点
  # - cron: '0 */12 * * *'  # 每12小时
  - cron: '0 0 * * 1'  # 每周一（当前设置）
```

### 数据源说明

#### 豆瓣爬虫 (`scripts/scrape.py`)
- 直接爬取豆瓣电影Top 250页面
- 提取电影标题、评分、年份、地区、类型、导演、演员、封面图等信息
- 请求间隔2秒，避免被封

#### IMDB爬虫 (`scripts/scrape_imdb.py`)
- 使用IMDB官方数据集计算Top 250
- 基于加权评分公式（贝叶斯估计）排名
- 最低投票数要求：25,000票
- 数据来源：https://datasets.imdbws.com/

## ⚠️ 注意事项

1. **请求频率**：豆瓣爬虫已设置2秒间隔，避免对服务器造成压力
2. **User-Agent**：请使用合理的User-Agent，不要使用空值
3. **数据使用**：本项目仅供学习交流，请勿用于商业用途
4. **IMDB数据**：使用官方公开数据集，符合非商业使用条款

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [豆瓣电影](https://movie.douban.com/) - 豆瓣数据来源
- [IMDB](https://www.imdb.com/) - IMDB数据来源
- [Font Awesome](https://fontawesome.com/) - 图标库
- [GitHub Pages](https://pages.github.com/) - 托管服务
- [GitHub Actions](https://github.com/features/actions) - 自动化服务

## 🔗 在线访问

https://freez-5.github.io/douban-top250-tracker/
