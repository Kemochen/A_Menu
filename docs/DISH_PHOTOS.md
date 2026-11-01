# 菜品配图

`public/dishes/photos/` 存放本项目使用内置图像生成工具制作的独立菜品示意图，未下载或复制 Crouton 的图片，也没有从设计预览图中裁切 UI 小图。

当前内置菜品库的 79 道菜全部配有独立图片，包含原有 20 张和本次补齐的 59 张，没有用一张分类图代替多个菜品。图片映射集中在 `data/dish-photos.ts`，新增图片只需补充对应菜品 ID。

完整性测试核对所有菜品 ID、图片路径、文件唯一性、512px 尺寸和非空内容。今后在前端手动新增菜品时，仍可填写自定义图片网址；没有填写时使用分类图，不会自动调用收费 AI 服务生成图片。

所有图片均无文字、图标或天气符号；网页单独叠加真实的天气和选中状态。生成结果为示意，不代表实拍、精确做法、分量或营养信息。后续可以替换为家中实拍照片。

## 生成方式与提示词

使用内置 `image_gen`，每一道菜单独生成一张方形图片，再缩小并压缩为 512px WebP；没有使用 CLI/API 回退。原始 PNG 留在本机生成图片目录，不随 App 打包。

本次新增 59 道菜的逐菜完整提示词保存在 [dish-photo-prompts.json](dish-photo-prompts.json)。原有 20 张保持不变。

统一提示词：

> Standalone square food photograph of [dish name]. [Recipe-specific description and main ingredients.] One complete portion in a simple white ceramic shallow bowl or plate, authentic home cooking. Natural side daylight, clean pale gray tabletop, camera at 45 degrees from above, full rim visible with narrow quiet margins, food fills 85% of frame, sharp natural textures, premium but honest recipe catalog photo. No text, no labels, no badges, no UI, no hands, no utensils, no collage. Single dish only, square composition, matching a cohesive recipe photography series.

逐菜约束包括：鱼香肉丝必须是肉丝而不是面条；疙瘩汤应是小块不规则面疙瘩而不是肉丸；白菜炖虾使用带头整虾，西兰花虾仁使用去壳虾仁；素菜不能混入肉类。其他主食、炖菜和汤按本地食材库描述主要食材。

界面会优先使用对应独立图片；旧版群晖接口返回分类图时，iOS 本地仍能解析到随包的新版菜图。自定义图片网址保留，不覆盖访客自行填写的图片。
