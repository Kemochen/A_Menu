import SwiftUI
import Foundation

enum MenuTab: Hashable { case catalog, history, plan, add, settings }

@main
@MainActor
struct AMenuApp: App {
    @StateObject private var store: MenuStore

    init() {
        let testing = ProcessInfo.processInfo.arguments.contains("-ui-testing") ||
            ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil || NSClassFromString("XCTestCase") != nil
        let defaults = testing ? UserDefaults(suiteName: "a-menu.ui-tests.\(UUID().uuidString)")! : .standard
        _store = StateObject(wrappedValue: MenuStore(defaults: defaults, offline: testing))
    }

    var body: some Scene {
        WindowGroup { MenuRootView(store: store) }
    }
}

@MainActor
struct MenuRootView: View {
    @ObservedObject var store: MenuStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab: MenuTab = .catalog
    @State private var formID = UUID()
    @State private var createdRecipe: Recipe?

    var body: some View {
        TabView(selection: $tab) {
            NavigationView { CatalogView(store: store, createdRecipe: $createdRecipe) }
                .navigationViewStyle(StackNavigationViewStyle())
                .tabItem { Label("菜品库", systemImage: "square.grid.3x3") }.tag(MenuTab.catalog)
            NavigationView { HistoryView(store: store, onEdit: { tab = .plan }) }
                .navigationViewStyle(StackNavigationViewStyle())
                .tabItem { Label("历史", systemImage: "clock.arrow.circlepath") }.tag(MenuTab.history)
            NavigationView { PlanView(store: store, connect: { tab = .settings }) }
                .navigationViewStyle(StackNavigationViewStyle())
                .tabItem { Label("已选菜单", systemImage: "basket") }.badge(store.draft.items.count).tag(MenuTab.plan)
            NavigationView {
                RecipeFormView(store: store, onSaved: { recipe in createdRecipe = recipe; formID = UUID(); tab = .catalog }, onCancel: { formID = UUID(); tab = .catalog })
                    .id(formID)
            }
                .navigationViewStyle(StackNavigationViewStyle())
                .tabItem { Label("添加", systemImage: "plus") }.tag(MenuTab.add)
            NavigationView { ServerSettingsView(store: store, onConnected: { tab = .catalog }) }
                .navigationViewStyle(StackNavigationViewStyle())
                .tabItem { Label("设置", systemImage: "gearshape") }.tag(MenuTab.settings)
        }
        .accentColor(MenuStyle.green)
        .environment(\.locale, Locale(identifier: "zh_CN"))
        .task { await store.poll() }
        .onChange(of: scenePhase) { phase in if phase == .active { Task { await store.refresh() } } }
        .sheet(item: Binding(get: { store.submittedEntry }, set: { value in if value == nil { store.dismissResult() } })) { entry in
            NavigationView {
                SubmissionView(entry: entry, recipes: store.recipes)
                    .toolbar { ToolbarItem(placement: .navigationBarTrailing) { Button("完成") { store.dismissResult(); tab = .catalog } } }
            }.navigationViewStyle(StackNavigationViewStyle())
        }
    }
}
