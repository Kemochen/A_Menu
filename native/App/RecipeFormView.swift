import SwiftUI

private struct IngredientDraft: Identifiable {
    let id = UUID()
    var name = ""
    var category = "蔬菜"
}

@MainActor
struct RecipeFormView: View {
    @ObservedObject var store: MenuStore
    let onSaved: (Recipe) -> Void
    let onCancel: () -> Void
    @State private var name = ""
    @State private var category = "家常菜"
    @State private var customCategory = ""
    @State private var tags = ""
    @State private var weather: Weather = .both
    @State private var image = ""
    @State private var ingredients = [IngredientDraft()]
    @State private var error: String?
    private let customOption = "自定义分类"
    private var categories: [String] { MenuLogic.unique(MenuStyle.categories + store.categories.filter { $0 != "全部" && $0 != customOption }) + [customOption] }

    var body: some View {
        Form {
            Section("菜品") {
                TextField("菜品名称", text: $name).accessibilityIdentifier("new-recipe-name")
                Picker("分类", selection: $category) { ForEach(categories, id: \.self) { Text($0).tag($0) } }
                if category == customOption { TextField("分类名称", text: $customCategory) }
                TextField("标签，例如：肉菜、牛肉、微辣", text: $tags)
            }
            Section("天气适合度") {
                Picker("天气适合度", selection: $weather) {
                    ForEach(Weather.allCases) { Text("\($0.symbol) \($0.label)").tag($0) }
                }.pickerStyle(.segmented)
            }
            Section("图片网址（选填）") {
                TextField("https://…", text: $image).keyboardType(.URL).autocapitalization(.none).disableAutocorrection(true)
            }
            Section("所需食材") {
                ForEach($ingredients) { $ingredient in
                    VStack(alignment: .leading, spacing: 8) {
                        TextField("食材名称", text: $ingredient.name)
                        Picker("类别", selection: $ingredient.category) {
                            ForEach(MenuLogic.ingredientCategories, id: \.self) { Text($0).tag($0) }
                        }.pickerStyle(.menu)
                    }
                }.onDelete { indices in
                    if ingredients.count > indices.count { ingredients.remove(atOffsets: indices) }
                }
                Button { ingredients.append(IngredientDraft()) } label: { Label("添加食材", systemImage: "plus") }
                    .disabled(ingredients.count >= 60)
            }
            if let error = error { Section { Text(error).font(.footnote).foregroundColor(.red) } }
            if store.server == nil { Section { Text("未连接菜单服务器").font(.footnote).foregroundColor(.secondary) } }
        }
        .disabled(store.isSaving)
        .navigationTitle("新增菜品").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) { Button("取消", action: onCancel).disabled(store.isSaving) }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(store.isSaving ? "保存中…" : "保存") { Task { await save() } }.disabled(store.isSaving || store.server == nil)
            }
        }
    }

    private func save() async {
        error = nil
        let trim: (String) -> String = { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        let names = MenuLogic.unique(ingredients.map { trim($0.name) })
        var types: [String: String] = [:]
        for ingredient in ingredients { types[trim(ingredient.name)] = ingredient.category }
        let tokens = MenuLogic.unique(tags.components(separatedBy: CharacterSet(charactersIn: ",，、\n")).map(trim).filter { !$0.isEmpty })
        let input = RecipeInput(name: trim(name), category: trim(category == customOption ? customCategory : category),
            tags: tokens, weather: weather, image: trim(image), ingredients: names, ingredientTypes: types)
        do { onSaved(try await store.create(input)) } catch { self.error = error.localizedDescription }
    }
}
