# iOS / AltStore 分支

`ios-altstore` 用于家庭侧载实验；`main` 继续作为群晖网页版。

## 架构

- 复用 `components/MenuApp.tsx`、`data/recipes.ts` 和菜品图片。
- 初始菜库和图片随 IPA 打包；连接后通过 `/api/recipes` 同步群晖的完整菜库，页面新增的菜品也会共享。内置图片更新需要重新构建 IPA。
- Vite 只负责把现有 React 界面打成 Capacitor 可打包的静态资源，不替换 Next.js 服务端。
- 首次启动填写群晖菜单根网址，支持 HTTPS，以及可信内网或 VPN 中的 HTTP，例如 `http://192.168.1.111:3000`。
- 所有手机和网页都应连接同一个群晖实例；提交、修改和删除继续访问 `/api/history`，共享同一份服务器 JSON。
- 使用 Capacitor 原生 HTTP 访问接口，无需给群晖接口开放通配 CORS。
- 普通手机是三列、每页九道菜，系统工具栏在底部；网页版采用对应的底部导航，桌面宽屏保留六列网格。Duo 根据系统折叠区域进入双页布局，当前九道菜留在右侧、左侧增加下一组九道菜。只有一套搜索、分类和分页，展开时均位于右页。折叠和展开不重置搜索、分类、当前页或已选菜单。
- 菜品、历史、已选菜单和服务器设置接入 `UINavigationController` 管理的系统工具栏，Duo 在支持的姿态自动将其排到侧边共享栏。其他姿态由 iOS 决定工具栏的位置，不强行覆盖系统相机和状态栏区域。已选数量使用系统角标。
- 原生桥接读取实际视图的折叠保留区域（包含平放时的非活动分隔区域），供网页对齐左右菜页；非折叠设备使用普通布局，不把宽屏手机误认为 Duo。双页模式内再根据可用容器宽度判断是否显示左页，不通过机型名称或设备方向猜测。
- 原生入口保存在 `mobile/ios/SceneDelegate.swift`，准备脚本在每次同步后复制到生成项目；不直接修改依赖包或依赖未提交的 ios/ 文件。
- 仍需在 Duo 真机上验证工具栏、展开/合拢、键盘和不对称安全区域；浏览器侧边栏只是预览后备界面，不是原生工具栏的模拟器。
- 服务器地址只保存在本机，菜单和历史仍在群晖；离线不能提交或同步历史。

## 不买 Mac：用 GitHub Actions 构建

1. 将此分支推送到 GitHub；对 `ios-altstore` 的推送会自动触发 **Build AltStore IPA**。
2. 在仓库的 Actions 中打开这次构建。
3. 等待 macOS runner 完成，在该次运行的 Artifacts 中下载 `A_Menu-altstore`。
4. 解压 artifact，里面的 `A_Menu-altstore.ipa` 是未签名的真机安装包，由 AltStore 在安装时重新签名。

需要重新构建时，向该分支推送新提交即可。`workflow_dispatch` 按钮受 GitHub 默认分支规则限制，不能假设仅在实验分支增加工作流就会出现手动运行按钮；自动构建不依赖该按钮，也不需要合并到 main。

工作流不需要 Apple ID、苹果开发者证书或群晖凭据。不要把这些凭据加入仓库或 Actions。
工作流选择 `xcode-27` runner，并使用 Xcode 27.1；这是苹果提供 Duo 开发支持的版本。GitHub 的此 runner 目前属于预览镜像，容量和稳定性可能有变化。macOS runner 的使用配额、计费由 GitHub 账户决定；构建日志会打印并检查 Xcode 版本。
参考 [苹果 Duo 开发说明](https://developer.apple.com/news/?id=kkphp5qo) 和 [GitHub Xcode 27 runner 软件清单](https://github.com/actions/runner-images/blob/main/images/macos/xcode-27-arm64-Readme.md)。

## 在 Windows 和 iPhone 上安装

本方案使用 **AltStore Classic**，不是地区应用市场 AltStore PAL。

1. 按 [AltStore 官方 Windows 安装指南](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows) 安装 AltServer 和所需 Apple 组件。
2. 连接 iPhone，按官方步骤安装 AltStore；Apple ID 等认证由你在官方工具中填写。
3. 将 IPA 放到 iPhone 的“文件”App 中，打开 AltStore 的 My Apps，通过 `+` 选择 IPA。
4. 启动 A Menu，填写与网页版相同的群晖网址；使用内网 HTTP 时先连上家庭 Wi-Fi 或 VPN。

免费 Apple 账户侧载通常需要每七天刷新，并受活跃 App 数量限制。电脑上的 AltServer 和手机需能互相连接以刷新。
详见 [AltStore 使用与刷新说明](https://faq.altstore.io/altstore-classic/your-altstore) 和 [AltServer 说明](https://faq.altstore.io/altstore-classic/altserver)。

## 群晖连接要求

- HTTPS 需要有效、受系统信任的证书；内网或 VPN 可以直接填写 `http://NAS-IP:3000`，不强制配置域名或证书。
- HTTP 支持 `10.*`、`172.16.*` 到 `172.31.*`、`192.168.*` 和 `100.64.*` 到 `100.127.*` 的地址，另支持 IPv6 ULA / 链路本地地址、`.local` 和无点的本地主机名。公网域名和公网 IP 仍需 HTTPS；VPN 使用自定义域名时优先填写服务器的内网 IP。
- 填写根网址，不带 `/api/history`，也不要在网址中嵌入账号密码。
- HTTP 未加密，只用于可信内网或受保护的 VPN；App 不会自动建立或验证 VPN，手机需要自行连接 VPN，且 VPN 路由必须能访问群晖。
- iOS 打包脚本将 `mobile/ios-network-policy.json` 合并到 Info.plist，仅对指定内网 / VPN 网段设置 HTTP 例外，保留局域网权限说明，不全局关闭 ATS，也不绕过 HTTPS 证书验证。参考 [苹果 ATS 例外配置](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsexceptiondomains)。
- 首次出现局域网访问提示时允许访问；拒绝后可在 iPhone 设置中重新允许此 App 使用局域网。
- 当前 API 沿用家庭共享模式，没有新增身份验证。不要直接把可任意修改/删除历史的接口暴露给不受信任的人；家庭远程使用优先配合私有 VPN 或受限网络访问。
- 不要填写 `localhost`；在手机中它指向手机自己。

## 本地开发与检查

```bash
pnpm install --frozen-lockfile
pnpm run test:mobile
pnpm run mobile:typecheck
pnpm run mobile:build
```

Windows 可验证静态资源，但不能运行 Xcode 或本地产出 iOS 二进制。
浏览器预览运行 `pnpm run dev` 和 `pnpm run mobile:dev`，打开 `http://127.0.0.1:5173`。
浏览器默认预览普通手机布局和底部导航，通过代理访问本地 3000 端口。开发模式打开 `http://127.0.0.1:5173/?duo-preview=1` 可预览双页菜单和右侧功能栏；搜索、分类、分页只显示在右侧。此开关不代表真实设备检测。服务器设置、内网 HTTP 和远程 HTTPS 连接需要在 iOS 真机上验证。
开发模式可以打开 `http://127.0.0.1:5173/?native-preview=1` 检查设置界面；浏览器没有原生 HTTP 能力，远程请求仍受浏览器 CORS 规则约束，不能代替真机连通性测试。

在 Mac 安装 Xcode 27.1 或更新版本及其命令行工具后：

```bash
pnpm run ios:ipa
```

`ios/`、`mobile/dist/`、`build/ios/`、`dist/` 都是生成目录，不提交。需要原生定制时，应把修改转为可重复执行的项目配置脚本，避免只修改会被重新生成的文件。

## 当前验证边界

Windows 上可以检查 TypeScript、服务器地址校验、网页静态构建和三列/六列布局。
只有 macOS 构建成功才表示 IPA 已生成；只有 AltStore 在真机安装并运行成功才表示侧载成功。
本分支本身不代表已经生成 IPA、通过 App Store 审核或完成 Duo 真机验证。
