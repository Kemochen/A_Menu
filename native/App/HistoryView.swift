import SwiftUI

@MainActor
struct HistoryView: View {
    @ObservedObject var store: MenuStore
    let onEdit: () -> Void
    @State private var lastWeekOnly = false
    @State private var selected: HistoryEntry?
    @State private var pendingDelete: HistoryEntry?
    @State private var pendingEdit: HistoryEntry?
    private var entries: [HistoryEntry] {
        store.history.filter { !lastWeekOnly || $0.date.map { MenuLogic.isLastWeek($0) } == true }
            .sorted { $0.submittedAt > $1.submittedAt }
    }
    var body: some View {
        List {
            Section {
                Picker("时间范围", selection: $lastWeekOnly) { Text("全部").tag(false); Text("上周").tag(true) }.pickerStyle(.segmented)
            }
            ForEach(store.errors, id: \.self) { StatusBanner(text: $0, isError: true) }
            if let message = store.message { StatusBanner(text: message, isError: true) }
            if entries.isEmpty { Text(store.isRefreshing ? "正在同步…" : "暂无历史菜单").foregroundColor(.secondary) }
            ForEach(entries) { entry in
                VStack(alignment: .leading, spacing: 12) {
                    Button { selected = entry } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(MenuLogic.dateTitle(entry.date)).font(.headline).foregroundColor(.primary)
                            ForEach(Weekday.allCases) { day in
                                let names = entry.items.filter { $0.day == day }.map(\.recipeName)
                                if !names.isEmpty { Text("\(day.label)：\(names.joined(separator: "、"))").font(.subheadline).foregroundColor(.secondary) }
                            }
                            if let note = entry.note, !note.isEmpty { Text(note).font(.footnote).foregroundColor(.secondary).lineLimit(2) }
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }.buttonStyle(.plain)
                    HStack {
                        Button { requestEdit(entry) } label: { Label("修改", systemImage: "pencil") }
                        Spacer()
                        Button(role: .destructive) { pendingDelete = entry } label: { Label("删除", systemImage: "trash") }
                    }.font(.subheadline).buttonStyle(.borderless).disabled(store.isSaving || store.server == nil)
                }.padding(.vertical, 6)
            }
        }
        .navigationTitle("历史菜单").navigationBarTitleDisplayMode(.inline)
        .refreshable { await store.refresh() }
        .task { await store.refresh() }
        .sheet(item: $selected) { entry in
            NavigationView { HistoryDetail(entry: entry, recipes: store.recipes) }.navigationViewStyle(StackNavigationViewStyle())
        }
        .alert(item: $pendingDelete) { entry in
            Alert(title: Text("删除这份菜单？"), message: Text("删除后其他访客也无法查看。"),
                primaryButton: .destructive(Text("删除")) { Task { await store.delete(entry) } }, secondaryButton: .cancel(Text("取消")))
        }
        .confirmationDialog("用这条历史记录替换当前待提交草稿？", isPresented: Binding(get: { pendingEdit != nil }, set: { if !$0 { pendingEdit = nil } })) {
            if let entry = pendingEdit {
                Button("替换草稿") { store.edit(entry); onEdit(); pendingEdit = nil }
            }
            Button("取消", role: .cancel) { pendingEdit = nil }
        }
    }
    private func requestEdit(_ entry: HistoryEntry) {
        if !store.draft.hasContent { store.edit(entry); onEdit() } else { pendingEdit = entry }
    }
}

private struct HistoryDetail: View {
    let entry: HistoryEntry
    let recipes: [Recipe]
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        SubmissionView(entry: entry, recipes: recipes)
            .toolbar { ToolbarItem(placement: .navigationBarTrailing) { Button("完成") { dismiss() } } }
    }
}
