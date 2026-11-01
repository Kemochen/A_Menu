import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let content = MenuBridgeViewController()
        let navigation = UINavigationController(rootViewController: content)
        navigation.setNavigationBarHidden(true, animated: false)
        navigation.setToolbarHidden(false, animated: false)
        navigation.overrideUserInterfaceStyle = .light
        navigation.view.backgroundColor = UIColor(red: 0.969, green: 0.976, blue: 0.984, alpha: 1)
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = navigation
        window?.makeKeyAndVisible()
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class MenuBridgeViewController: CAPBridgeViewController {
    private var controls: MenuControlsPlugin?
    private var lastLayout = ""
    private lazy var browseItem = makeItem("菜品", symbol: "square.grid.3x3", action: #selector(browse))
    private lazy var historyItem = makeItem("历史菜谱", symbol: "clock.arrow.circlepath", action: #selector(history))
    private lazy var planItem = makeItem("已选菜单", symbol: "cart", action: #selector(plan))
    private lazy var settingsItem = makeItem("服务器设置", symbol: "gearshape", action: #selector(settings))

    override func capacitorDidLoad() {
        let plugin = MenuControlsPlugin()
        plugin.controller = self
        controls = plugin
        bridge?.registerPluginInstance(plugin)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        toolbarItems = [browseItem, historyItem, planItem,
                        UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), settingsItem]
        updateControls(hasServer: false, count: 0)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        publishLayout()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        publishLayout()
    }

    private func makeItem(_ title: String, symbol: String, action: Selector) -> UIBarButtonItem {
        let item = UIBarButtonItem(image: UIImage(systemName: symbol), style: .plain, target: self, action: action)
        item.title = title
        item.accessibilityLabel = title
        return item
    }

    func updateControls(hasServer: Bool, count: Int) {
        for item in [browseItem, historyItem, planItem] { item.isEnabled = hasServer }
        planItem.title = "已选菜单 \(count)"
        planItem.accessibilityLabel = "已选菜单，\(count) 道菜"
        if #available(iOS 26.0, *) {
            planItem.badge = count > 0 ? .count(count) : nil
        }
    }

    func layoutData() -> [String: Any] {
        guard isViewLoaded else { return [:] }
        var result: [String: Any] = ["width": Double(view.bounds.width), "height": Double(view.bounds.height)]
        if #available(iOS 27.1, *) {
            let regions = view.reservedRegions(kind: .division, options: .includeInactive)
            if let fold = regions.first(where: { region in
                let frame = region.frame
                return frame.height > frame.width && frame.midX > 0 && frame.midX < view.bounds.width
            }) {
                result["division"] = ["x": Double(fold.frame.minX), "width": Double(fold.frame.width)]
            }
        }
        return result
    }

    private func publishLayout() {
        let data = layoutData()
        guard let encoded = try? JSONSerialization.data(withJSONObject: data, options: .sortedKeys),
              let key = String(data: encoded, encoding: .utf8), key != lastLayout else { return }
        lastLayout = key
        controls?.notifyListeners("layout", data: data)
    }

    @objc private func browse() { controls?.notifyListeners("command", data: ["action": "browse"]) }
    @objc private func history() { controls?.notifyListeners("command", data: ["action": "history"]) }
    @objc private func plan() { controls?.notifyListeners("command", data: ["action": "plan"]) }
    @objc private func settings() { controls?.notifyListeners("command", data: ["action": "settings"]) }
}

@objc(MenuControlsPlugin)
class MenuControlsPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "MenuControlsPlugin"
    let jsName = "MenuControls"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLayout", returnType: CAPPluginReturnPromise)
    ]
    weak var controller: MenuBridgeViewController?

    @objc func setState(_ call: CAPPluginCall) {
        let hasServer = call.getBool("hasServer") ?? false
        let count = max(0, call.getInt("selectedCount") ?? 0)
        DispatchQueue.main.async { [weak self] in
            self?.controller?.updateControls(hasServer: hasServer, count: count)
            call.resolve()
        }
    }

    @objc func getLayout(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            call.resolve(self?.controller?.layoutData() ?? [:])
        }
    }
}
