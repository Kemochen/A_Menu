# A Menu

一个轻量的中文菜单小应用，用来选择本周菜品、安排周一到周日的食用日期，并自动生成食材汇总。

本分支 `ios-altstore` 提供原生 SwiftUI iOS App；群晖 Next.js 网页与共享接口保留。直接打开 `native/AMenu.xcodeproj` 可运行本地菜品 Demo，基础工程按 Xcode 13.2.1 / iOS 15 API 编写，Duo 专用适配需要新版 SDK。详见 [原生 iOS / AltStore 说明](docs/IOS_ALTSTORE.md)。

## 功能

- Next.js、TypeScript、Tailwind CSS
- 本地菜谱数据：`data/recipes.ts`
- 展示菜名、图片、分类、标签、天气适合度
- 手机端三列九道菜、底部导航；Duo 展开保留右页并在左侧增加菜品，搜索和分页只放右侧
- 支持搜索菜名、食材和标签；内置 79 道菜全部配有独立 AI 图片，说明见 [配图来源](docs/DISH_PHOTOS.md)
- 天气符号：冷天 `❄️`，热天 `☀️`，冷热都适合 `🌤️`
- 选择菜品时必须选择周一到周日的某一天
- 待提交菜单按星期分组展示
- 食材汇总只显示“几道菜用到”，不显示克数或精确用量
- Submit 后保存最终结果、刷新菜品上次食用时间，并写入服务器共享历史菜谱
- 所有访问者都能查看同一份历史菜谱
- 已提交的历史记录可以修改或删除
- 页面“+”按钮新增共享菜品，支持名称、分类、标签、天气、图片网址和食材类别
- 历史菜谱支持查看全部和上周记录
- Docker 部署，适合 Synology Container Manager

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 修改菜谱

点击网页右上角或 iOS 工具栏的“+”添加菜品。图片网址可选，未填写时使用分类图片。新菜品保存到服务器的 `storage/custom-recipes.json`，不会修改内置菜谱，其他设备会自动同步。所有能访问服务器的访客均可新增菜品，适用于可信家庭内网或 VPN。

iOS 版本新增菜品需要同时更新群晖服务器，使其包含 `/api/recipes` 接口；只更新 IPA 不会更新群晖服务。

编辑 `data/recipes.ts`。图片放在 `public/dishes` 下，然后在菜谱里设置图片路径：

```ts
image: "/dishes/my-dish.svg"
```

## Docker

```bash
docker build -t a-menu .
docker run -p 3000:3000 -v a-menu-data:/app/storage a-menu
```

## Docker Compose

```bash
docker compose up -d --build
```

启动后访问 `http://NAS-IP:3000`。

## Synology Container Manager

1. 把项目文件夹复制到 NAS。
2. 在 Container Manager 里选择“项目”，从包含 `docker-compose.yml` 的文件夹创建项目。
3. 构建并启动项目。
4. 启动后访问 `http://NAS-IP:3000`。

如果构建时报 `Property 'eaDir' is missing`，说明群晖生成的 `@eaDir` 缩略图/索引目录被 Next.js 误认为页面路由。项目已经在 `.dockerignore` 中排除了 `@eaDir`，并且 `npm run build` 会先自动清理 `@eaDir`、旧 `.next` 和旧 `out` 后再构建。

不需要数据库或外部服务。共享历史记录和新增菜品保存在 Docker volume `a-menu-data` 里，对所有访问者可见。删除这个 volume 会清空历史记录和新增菜品。备份时请保留整个 volume。可选环境变量 `RECIPES_FILE` 用于指定新增菜品文件路径，默认与 `DATA_FILE` 位于同一目录。
