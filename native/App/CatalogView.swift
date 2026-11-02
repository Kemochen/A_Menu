import SwiftUI
import UIKit

@MainActor
struct CatalogView: View {
    @ObservedObject var store: MenuStore
    @Binding var createdRecipe: Recipe?
    @State private var search = ""
    @State private var category = "全部"
    @State private var page = 1
    @State private var selected: Recipe?
    @State private var division: CGRect?

    private var matches: [Recipe] { MenuLogic.filtered(store.recipes, category: category, search: search) }
    private var pageCount: Int { max(1, (matches.count + MenuLogic.pageSize - 1) / MenuLogic.pageSize) }
    private var current: Int { min(max(1, page), pageCount) }

    var body: some View {
        GeometryReader { geometry in
            let width = max(0, geometry.size.width - 32)
            let localDivision = division.map { $0.offsetBy(dx: -16, dy: 0) }
            let split = BookSplit.resolve(width: width, division: localDivision)
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    controls.frame(width: split?.right, alignment: .leading).frame(maxWidth: .infinity, alignment: .trailing)
                    if matches.isEmpty {
                        Text("没有找到符合条件的菜品").font(.subheadline).foregroundColor(.secondary).padding(.vertical, 32)
                            .frame(maxWidth: .infinity)
                    } else if let split = split {
                        HStack(alignment: .top, spacing: split.gap) {
                            grid(MenuLogic.page(matches, number: current + 1), columns: 3).frame(width: split.left)
                            grid(MenuLogic.page(matches, number: current), columns: 3).frame(width: split.right)
                        }
                    } else {
                        grid(MenuLogic.page(matches, number: current), columns: width >= 600 ? 6 : 3)
                    }
                    if pageCount > 1 {
                        pagination(expanded: split != nil)
                            .frame(width: split?.right).frame(maxWidth: .infinity, alignment: .trailing)
                    }
                }.padding(16)
            }
            .background(FoldReader(changed: { division = $0 }))
            .refreshable { await store.refresh() }
        }
        .navigationTitle("菜品库")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: search) { _ in page = 1 }
        .onChange(of: category) { _ in page = 1 }
        .onChange(of: createdRecipe?.id) { _ in openCreatedRecipe() }
        .onAppear { openCreatedRecipe() }
        .sheet(item: $selected) { recipe in RecipeDetailView(store: store, recipe: recipe) }
    }

    private func openCreatedRecipe() {
        guard let recipe = createdRecipe else { return }
        search = recipe.name; category = "全部"; page = 1
        selected = recipe; createdRecipe = nil
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("A Menu").font(.caption).fontWeight(.semibold).foregroundColor(MenuStyle.green)
            if store.server == nil { Text("离线浏览").font(.caption).foregroundColor(.secondary) }
            ForEach(store.errors, id: \.self) { StatusBanner(text: $0, isError: true) }
            if let message = store.message { StatusBanner(text: message) }
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                TextField("搜索菜名、食材或标签", text: $search)
                    .font(.subheadline).autocapitalization(.none).disableAutocorrection(true)
                    .accessibilityIdentifier("recipe-search")
                if !search.isEmpty {
                    Button { search = "" } label: { Image(systemName: "xmark.circle.fill").foregroundColor(.secondary) }
                        .accessibilityLabel("清空搜索")
                }
            }.padding(.horizontal, 12).frame(height: 44).background(Color(UIColor.secondarySystemBackground)).cornerRadius(8)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(store.categories, id: \.self) { item in
                        Button { category = item } label: {
                            Text(item).font(.caption).fontWeight(.semibold).padding(.horizontal, 16).frame(minHeight: 40)
                                .background(category == item ? MenuStyle.green : Color(UIColor.secondarySystemBackground))
                                .foregroundColor(category == item ? .white : .primary).cornerRadius(8)
                        }.buttonStyle(.plain).accessibilityAddTraits(category == item ? [.isSelected] : [])
                    }
                }
            }
        }
    }

    private func grid(_ recipes: [Recipe], columns: Int) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: columns), alignment: .leading, spacing: 18) {
            ForEach(recipes) { recipe in
                let days = store.selectedDays(recipe.id)
                let last = MenuLogic.relativeTime(store.lastEaten(recipe))
                Button { selected = recipe } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        DishPhoto(recipe: recipe).frame(height: 88).frame(maxWidth: .infinity).clipped().cornerRadius(8)
                            .overlay(alignment: .topTrailing) {
                                Text(recipe.weather.symbol).font(.caption).padding(3).background(Color(UIColor.systemBackground).opacity(0.9)).cornerRadius(5).padding(4)
                            }
                            .overlay(alignment: .bottomTrailing) {
                                if !days.isEmpty {
                                    Text(days.count == 1 ? days[0].label : "已选 \(days.count) 天")
                                        .font(.caption2).foregroundColor(.white).padding(.horizontal, 5).padding(.vertical, 3)
                                        .background(MenuStyle.green).cornerRadius(4).padding(4)
                                }
                            }
                        Text(recipe.name).font(.caption).fontWeight(.semibold).foregroundColor(.primary)
                            .lineLimit(2).frame(minHeight: 32, alignment: .topLeading)
                        Text("上次：\(last)").font(.caption2).foregroundColor(.secondary)
                    }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityIdentifier("recipe-\(recipe.id)")
                    .accessibilityLabel("\(recipe.name)，上次\(last)\(days.isEmpty ? "" : "，已选：" + days.map(\.label).joined(separator: "、"))")
            }
        }
    }

    private func pagination(expanded: Bool) -> some View {
        let step = expanded ? 2 : 1
        return HStack(spacing: 18) {
            Button { page = max(1, current - step) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44) }
                .disabled(current == 1).accessibilityLabel("上一页")
            Text(expanded && current < pageCount ? "\(current)–\(current + 1) / \(pageCount)" : "\(current) / \(pageCount)")
                .font(.caption).foregroundColor(.secondary).frame(minWidth: 70)
            Button { page = min(pageCount, current + step) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44) }
                .disabled(current + step > pageCount).accessibilityLabel("下一页")
        }.frame(maxWidth: .infinity)
    }
}
