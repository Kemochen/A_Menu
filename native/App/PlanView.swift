import SwiftUI

@MainActor
struct PlanView: View {
    @ObservedObject var store: MenuStore
    let connect: () -> Void
    @State private var confirmClear = false

    var body: some View {
        List {
            if store.server == nil {
                Section { Button("连接菜单服务器", action: connect) }
            }
            if let message = store.message { Section { StatusBanner(text: message, isError: true) } }
            if store.draft.items.isEmpty {
                Section { Text("还没有加入菜品").foregroundColor(.secondary) }
            }
            ForEach(Weekday.allCases) { day in
                let items = store.draft.items.filter { $0.day == day }
                if !items.isEmpty {
                    Section(day.label) {
                        ForEach(items) { item in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(store.recipe(item.recipeId)?.name ?? "未知菜品")
                                    Spacer()
                                    Button(role: .destructive) { store.remove(item.id) } label: { Image(systemName: "trash").frame(width: 40, height: 40) }
                                        .buttonStyle(.borderless).accessibilityLabel("删除菜品")
                                }
                                Picker("食用日期", selection: Binding(get: { item.day }, set: { store.changeDay(item.id, to: $0) })) {
                                    ForEach(Weekday.allCases) { Text($0.label).tag($0) }
                                }.pickerStyle(.menu)
                            }
                        }.onDelete { indices in indices.forEach { store.remove(items[$0].id) } }
                    }
                }
            }
            if !store.draft.items.isEmpty {
                Section("食材汇总") { IngredientRows(ingredients: store.ingredientSummary) }
            }
            Section("备注") {
                TextEditor(text: Binding(get: { store.note }, set: { store.note = $0 }))
                    .frame(minHeight: 110).accessibilityLabel("菜单备注")
            }
            Section {
                Button(store.draft.editingEntryId == nil ? "清空待提交菜单" : "取消修改", role: .destructive) { confirmClear = true }
                    .disabled(!store.draft.hasContent)
            }
        }
        .disabled(store.isSaving)
        .navigationTitle(store.draft.editingEntryId == nil ? "待提交菜单" : "修改历史菜单")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(store.isSaving ? "保存中…" : store.draft.editingEntryId == nil ? "提交" : "保存") { Task { await store.submit() } }
                    .disabled(store.draft.items.isEmpty || store.isSaving || store.server == nil).accessibilityIdentifier("submit-menu")
            }
        }
        .alert("清空当前草稿？", isPresented: $confirmClear) {
            Button("清空", role: .destructive) { store.clearDraft() }
            Button("取消", role: .cancel) {}
        }
    }
}

struct SubmissionView: View {
    let entry: HistoryEntry
    let recipes: [Recipe]
    var body: some View {
        List {
            Section { Text(MenuLogic.dateTitle(entry.date)).font(.footnote).foregroundColor(.secondary) }
            ForEach(Weekday.allCases) { day in
                let items = entry.items.filter { $0.day == day }
                if !items.isEmpty {
                    Section(day.label) { ForEach(Array(items.enumerated()), id: \.offset) { _, item in Text(item.recipeName) } }
                }
            }
            ForEach(MenuLogic.grouped(entry.ingredientSummary, recipes: recipes)) { group in
                Section("需购买 · \(group.category)") { IngredientRows(ingredients: group.ingredients) }
            }
            Section("备注") { Text(entry.note?.isEmpty == false ? entry.note! : "无").fixedSize(horizontal: false, vertical: true) }
        }.navigationTitle("最终菜单").navigationBarTitleDisplayMode(.inline)
    }
}
