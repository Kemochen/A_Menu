# A Menu

一个轻量的中文菜单小应用，用来选择本周菜品、安排周一到周日的食用日期，并自动生成食材汇总。

## 功能

- Next.js、TypeScript、Tailwind CSS
- 本地菜谱数据：`data/recipes.ts`
- 展示菜名、图片、分类、标签、天气适合度
- 天气符号：冷天 `❄️`，热天 `☀️`，冷热都适合 `🌤️`
- 选择菜品时必须选择周一到周日的某一天
- 待提交菜单按星期分组展示
- 食材汇总只显示“几道菜用到”，不显示克数或精确用量
- Submit 后保存最终结果、刷新菜品上次食用时间，并写入本地历史菜谱
- 历史菜谱支持查看全部和上周记录
- 静态 Docker 部署，适合 Synology Container Manager

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 修改菜谱

编辑 `data/recipes.ts`。图片放在 `public/dishes` 下，然后在菜谱里设置图片路径：

```ts
image: "/dishes/my-dish.svg"
```

## Docker

```bash
docker build -t a-menu .
docker run -p 3000:80 a-menu
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

不需要数据库或外部服务，菜单和历史记录保存在浏览器本地。
