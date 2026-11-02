import Foundation
import Combine

enum NativeResources {
    static var recipes: [Recipe] {
        guard let url = Bundle.main.url(forResource: "recipes", withExtension: "json"),
              let data = try? Data(contentsOf: url), let recipes = try? JSONDecoder().decode([Recipe].self, from: data) else { return [] }
        return recipes
    }
}

private struct ServerCache: Codable { let recipes: [Recipe]; let history: [HistoryEntry] }

@MainActor
final class MenuStore: ObservableObject {
    @Published private(set) var recipes: [Recipe]
    @Published private(set) var history: [HistoryEntry] = []
    @Published private(set) var draft = MenuDraft()
    @Published private(set) var server: URL? = nil
    @Published private(set) var submittedEntry: HistoryEntry? = nil
    @Published private(set) var isSaving = false
    @Published private(set) var isRefreshing = false
    @Published private(set) var syncErrors: [String: String] = [:]
    @Published var message: String?

    private let api: MenuAPI
    private let defaults: UserDefaults
    private let bundled: [Recipe]
    private var revision = 0
    private var refreshToken: UUID?

    init(api: MenuAPI = MenuAPI(), defaults: UserDefaults = .standard, bundled: [Recipe] = NativeResources.recipes, offline: Bool = false) {
        self.api = api; self.defaults = defaults; self.bundled = bundled; self.recipes = bundled
        if !offline, let saved = defaults.string(forKey: "a-menu.native.server"), let url = try? ServerAddress.normalize(saved) { server = url }
        if let url = server, let cache = decode(ServerCache.self, key: "cache.\(url.absoluteString)") {
            recipes = cache.recipes; history = cache.history
        }
        draft = decode(MenuDraft.self, key: draftKey) ?? MenuDraft()
    }

    var categories: [String] { ["全部"] + MenuLogic.unique(recipes.map(\.category).filter { $0 != "全部" }) }
    var ingredientSummary: [IngredientUse] { MenuLogic.summarize(draft.items, recipes: recipes) }
    var shoppingGroups: [IngredientGroup] { MenuLogic.grouped(ingredientSummary, recipes: recipes) }
    var errors: [String] { MenuLogic.unique(syncErrors.keys.sorted().compactMap { syncErrors[$0] }) }
    var note: String {
        get { draft.note }
        set { guard !isSaving else { return }; draft.note = String(newValue.prefix(500)); persistDraft() }
    }
    private var draftKey: String { "draft.\(server?.absoluteString ?? "offline")" }

    func recipe(_ id: String) -> Recipe? { recipes.first { $0.id == id } }
    func selectedDays(_ id: String) -> [Weekday] { draft.items.filter { $0.recipeId == id }.map(\.day).sorted { $0.index < $1.index } }
    func lastEaten(_ recipe: Recipe) -> Date? {
        let dates = history.filter { $0.items.contains { $0.recipeId == recipe.id } }.compactMap(\.date)
        if let date = dates.max() { return date }
        return recipe.initialLastEatenDaysAgo.map { Date().addingTimeInterval(-Double($0) * 86400) }
    }

    @discardableResult func add(_ recipe: Recipe, day: Weekday) -> Bool {
        guard !isSaving else { return false }
        guard !draft.items.contains(where: { $0.recipeId == recipe.id && $0.day == day }) else {
            message = "这道菜已经安排在\(day.label)了。"; return false
        }
        draft.items.append(PlannedDish(recipeId: recipe.id, day: day))
        submittedEntry = nil; message = nil; persistDraft(); return true
    }

    func remove(_ id: UUID) {
        guard !isSaving else { return }
        draft.items.removeAll { $0.id == id }; persistDraft()
    }

    func changeDay(_ id: UUID, to day: Weekday) {
        guard !isSaving, let index = draft.items.firstIndex(where: { $0.id == id }) else { return }
        guard !draft.items.contains(where: { $0.id != id && $0.recipeId == draft.items[index].recipeId && $0.day == day }) else {
            message = "这道菜已经安排在\(day.label)了。"; return
        }
        draft.items[index].day = day; persistDraft()
    }

    func clearDraft() {
        guard !isSaving else { return }
        draft = MenuDraft(); message = nil; persistDraft()
    }

    func edit(_ entry: HistoryEntry) {
        guard !isSaving else { return }
        draft = MenuDraft(items: entry.items.map { PlannedDish(recipeId: $0.recipeId, day: $0.day) }, note: entry.note ?? "", editingEntryId: entry.id)
        message = "正在修改已提交菜单，保存后所有访客都能看到。"; persistDraft()
    }

    func connect(_ input: String) async throws {
        guard !isSaving else { throw MenuError.message("正在保存，请稍后切换服务器。") }
        let next = try ServerAddress.normalize(input)
        let expectedRevision = revision
        let entries = try await api.history(server: next)
        guard !isSaving, expectedRevision == revision else { throw MenuError.message("菜单状态已变化，请在保存完成后重新连接。") }
        let old = server
        persistDraft()
        revision += 1; refreshToken = nil; isRefreshing = false
        let cache = decode(ServerCache.self, key: "cache.\(next.absoluteString)")
        server = next; history = entries; recipes = cache?.recipes ?? bundled; syncErrors = [:]; submittedEntry = nil; message = nil
        defaults.set(next.absoluteString, forKey: "a-menu.native.server")
        if old != next {
            if old != nil { draft = decode(MenuDraft.self, key: draftKey) ?? MenuDraft() }
        }
        persistDraft(); persistCache()
        await refresh()
    }

    func refresh() async {
        guard let server = server, !isSaving, refreshToken == nil else { return }
        let token = UUID(); let currentRevision = revision
        refreshToken = token; isRefreshing = true
        defer { if refreshToken == token { refreshToken = nil; isRefreshing = false } }
        async let recipeResult = capture { try await self.api.recipes(server: server) }
        async let historyResult = capture { try await self.api.history(server: server) }
        let (loadedRecipes, loadedHistory) = await (recipeResult, historyResult)
        guard currentRevision == revision, !Task.isCancelled else { return }
        switch loadedRecipes {
        case .success(let items): recipes = items; syncErrors["recipes"] = nil
        case .failure(let error): syncErrors["recipes"] = error.localizedDescription
        }
        switch loadedHistory {
        case .success(let entries): history = entries; syncErrors["history"] = nil
        case .failure(let error): syncErrors["history"] = error.localizedDescription
        }
        persistCache()
    }

    func poll() async {
        await refresh()
        while !Task.isCancelled {
            do { try await Task.sleep(nanoseconds: 15_000_000_000) } catch { return }
            await refresh()
        }
    }

    func submit() async {
        guard let server = server else { message = "请先连接菜单服务器。"; return }
        guard !isSaving, !draft.items.isEmpty else { return }
        isSaving = true; revision += 1; message = nil
        defer { isSaving = false }
        do {
            let response = try await api.submit(server: server, draft: draft)
            history = response.historyEntries; submittedEntry = response.entry
            draft = MenuDraft(); persistDraft(); persistCache()
        } catch { message = error.localizedDescription }
    }

    func delete(_ entry: HistoryEntry) async {
        guard let server = server, !isSaving else { return }
        isSaving = true; revision += 1; message = nil
        defer { isSaving = false }
        do {
            history = try await api.delete(server: server, id: entry.id)
            if draft.editingEntryId == entry.id { draft = MenuDraft(); persistDraft() }
            persistCache()
        } catch { message = error.localizedDescription }
    }

    func create(_ input: RecipeInput) async throws -> Recipe {
        guard let server = server else { throw MenuError.message("请先在设置中连接菜单服务器。") }
        guard !isSaving else { throw MenuError.message("正在保存，请稍后再试。") }
        isSaving = true; revision += 1
        defer { isSaving = false }
        let recipe = try await api.createRecipe(server: server, input: input)
        recipes.removeAll { $0.id == recipe.id }; recipes.append(recipe)
        syncErrors["recipes"] = nil; persistCache()
        return recipe
    }

    func dismissResult() { submittedEntry = nil }
    private func persistDraft() { encode(draft, key: draftKey) }
    private func persistCache() {
        guard let server = server else { return }
        encode(ServerCache(recipes: recipes, history: history), key: "cache.\(server.absoluteString)")
    }
    private func decode<T: Decodable>(_ type: T.Type, key: String) -> T? {
        defaults.data(forKey: "a-menu.native.\(key)").flatMap { try? JSONDecoder().decode(type, from: $0) }
    }
    private func encode<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) { defaults.set(data, forKey: "a-menu.native.\(key)") }
    }
    private func capture<T>(_ operation: () async throws -> T) async -> Result<T, Error> {
        do { return .success(try await operation()) } catch { return .failure(error) }
    }
}
