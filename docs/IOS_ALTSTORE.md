# 原生 SwiftUI / AltStore

`ios-altstore` 的 iOS 安装包现在使用 `native/` 下的 SwiftUI 工程，不再通过 Capacitor、WKWebView 或网页容器运行。Next.js 网页和 NAS 接口保留，不需要迁移服务器历史数据。

## Big Sur 上打开 Demo

基础工程使用 Swift 5 / iOS 15 API，按 Xcode 13.2.1 可用的工具链编写。Duo 专用符号同时受编译器条件和系统版本限制，旧编译器不编译这一部分。

1. Big Sur 至少更新到 11.3，安装并打开 Xcode 13.2.1，完成首次组件安装。参考 [苹果版本说明](https://developer.apple.com/documentation/xcode-release-notes/xcode-13_2_1-release-notes)。
2. 从 GitHub 下载或克隆 `ios-altstore` 分支的完整项目。
3. 直接打开 `native/AMenu.xcodeproj`，Scheme 选 `AMenu`。
4. 选择已安装的 iOS 15 模拟器，按 Command-R。首次构建不需要 npm、pnpm、Node、CocoaPods、SwiftPM 依赖或 NAS。
5. 通过“菜品库”直接浏览 79 道菜和图片，选菜、查看食材、选择星期和编辑本机草稿；不会把测试草稿写入 NAS。
6. 要共享提交或查看服务器历史，在“设置”填写 NAS 地址并连接。

选择模拟器不需要开发者签名；运行到真实设备时，需在 Signing & Capabilities 设置自己的开发团队，或使用下述 AltStore 安装包。

**验证边界：当前 Windows 环境只能检查 Swift 语法、工程结构和资源，不能代替 Xcode 编译。基础工程的 Big Sur 构建和实际 UI 仍须在对应 Mac 上运行验证；不把静态检查当成原生构建成功。**

## 原生功能

- SwiftUI 原生五个入口：菜品库、历史、已选菜单、添加、设置。
- 手机每页三列九道菜；宽屏普通设备可显示六列。
- 原生系统标签栏由 iOS 管理；Duo 的栏位跟随系统，不用网页画一个假任务栏。
- Duo 用实际视图的 division 保留区域对齐双页，右页保留当前九道，左页显示下一组；只有一套搜索、分类和分页，展开时位于右侧。普通设备不通过机型名称或宽度猜测折叠屏。
- 点开图片查看标签和食材，选择周一到周日后加入菜单，详情自动关闭。
- 草稿按周一到周日排列，可以改星期、删任意一天的菜，并填写备注。
- 提交成功才清空选中标记和草稿，显示最终菜单、分类购物清单，备注位于最后。保存失败保留草稿。
- 共享历史支持全部/上周、详情、修改和确认删除。离线可以看缓存，但不能写入共享记录。
- 新增菜品直接访问 NAS，不需要重新打包。新增成功后打开菜品详情，便于马上选星期。
- 草稿及上次读取的数据保存在本机 UserDefaults；缓存按服务器隔离，不会把另一台 NAS 的历史显示到当前服务器中。

## 本地资源

`native/Resources/recipes.json` 和 `native/Resources/Photos/*.jpg` 已提交到仓库，Xcode 会直接打包。79 张 AI 图由原有 WebP 转为 512px JPEG，保证旧系统能用原生图片组件读取，未重新生成图片。映射和 NAS 返回的菜品 ID 保持一致；自定义 HTTP/HTTPS 图片网址仍使用远程图片。

更改 `data/recipes.ts` 或 `public/dishes/photos/` 后，运行一次：

```bash
pnpm run native:resources
pnpm run native:check
```

提交生成后的原生资源。`native:check` 核对 JSON、源图哈希、JPEG 哈希和尺寸，避免网页版更新后忘记更新随包菜库。

`scripts/create-native-project.mjs` 是工程脚手架的显式再生成工具，不属于准备/构建流程；它会重写工程配置。日常使用 Xcode 修改签名和工程，不要随意运行此脚手架。新增 Swift 文件时在 Xcode 中勾选对应 target。

## NAS / VPN

- 原生网络使用 `URLSession` 和 `Codable`，连接同一个 NAS 后，网页与 App 仍共享 `/api/history` 和 `/api/recipes`，无需开放通配 CORS。
- 支持 HTTPS，以及 RFC1918、100.64/10、IPv6 ULA/链路本地地址、`.local` 和单段本地主机名的可信内网 HTTP。
- HTTP 不加密，仅用于可信家庭内网或已连接的 VPN；App 不会建立 VPN。公网地址需 HTTPS，不绕过证书校验。
- 不接受 localhost、凭据、路径、参数和片段。模拟器连接 Mac 本地服务器时也填写 Mac 的局域网 IP，例如 `http://192.168.1.111:3000`。
- 旧 WebView 的 localStorage 地址不直接迁移，原生版首次使用需要重新填写。NAS 上的历史不受影响。
- 新增菜品需要 NAS 部署包含 `/api/recipes` 的版本。只更新 App 不会更新 NAS；缺少接口时显示中文提示，仍可浏览本地菜库。
- 更新 NAS 时使用原有项目与数据卷，例如 `docker compose up -d --build`。不要删除 volume。
- 本项目沿用家庭共享模式，没有新增身份验证。任何能访问接口的人均可修改/删除共享记录，不应直接暴露到不受信任的公网。

## 云端原生构建和截图

推送 `ios-altstore` 后，GitHub Actions 的 **Build AltStore IPA** 将：

1. 校验共享逻辑、79 道原生资源和 Xcode 工程。
2. 使用 Xcode 27.1，选择可用的普通 iPhone 模拟器运行原生 XCTest 和 XCUITest，并在可用的 Duo 模拟器上再运行。缺少所需 Duo runtime 会明确失败，不把缺失的测试算通过。
3. UI 测试使用独立的离线数据，不连接家庭 NAS，不改真实历史。测试包括浏览、查看详情、选菜标记和搜索；截图作为测试附件导出。
4. 构建原生 unsigned IPA，交给 AltStore 重新签名。

Artifacts：

- `A_Menu-altstore`：`A_Menu-altstore.ipa`。
- `A_Menu-native-tests`：测试截图和 `.xcresult`。PNG/JPEG 可直接在 Big Sur/Windows 查看；新版 `.xcresult` 通常需要对应新版 Xcode。

模拟器截图不等于完成 Duo 所有姿态测试；展开/合拢连续性、非对称安全区域、键盘与真机局域网权限仍需对应设备验证。工作流开始运行或出现 IPA artifact 才有对应构建证据，源码中的测试并不代表已经通过。

云端仍使用 `xcode-27` 预览 runner 和 Xcode 27.1，可能受平台容量、稳定性、账户配额和计费影响。Duo 原生 API 要求见 [苹果适配文档](https://developer.apple.com/iphone-duo/prepare/)。

在支持 Xcode 27.1 的 Mac 上也可运行：

```bash
pnpm run ios:test --require-duo
pnpm run ios:ipa
```

普通 iPhone 的旧 SDK 测试可在 Xcode 13.2.1 中用 Product > Test，不通过要求新 SDK 的云端测试脚本。

## AltStore

使用 AltStore Classic 安装 CI 产出的 IPA；AltStore PAL 是不同的地区市场方案。安装、登录和周期刷新遵循 [AltStore 官方指南](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)。

`mobile/` 是旧混合容器/浏览器比较预览，仍可用于网页回归，但不再是 iOS 发布入口。Swift 工程不链接其中的 Capacitor 依赖。
