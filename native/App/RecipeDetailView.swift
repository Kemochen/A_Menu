import SwiftUI

@MainActor
struct RecipeDetailView: View {
    @ObservedObject var store: MenuStore
    let recipe: Recipe
    @State private var day: Weekday = .monday
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    DishPhoto(recipe: recipe).frame(height: 210).frame(maxWidth: .infinity).clipped().cornerRadius(8)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(recipe.category).font(.caption).foregroundColor(MenuStyle.green)
                        Text(recipe.name).font(.title2).fontWeight(.bold)
                        Text("上次食用：\(MenuLogic.relativeTime(store.lastEaten(recipe)))").font(.footnote).foregroundColor(.secondary)
                    }
                    VStack(alignment: .leading, spacing: 10) { Text("菜品标签").font(.headline); TagList(tags: recipe.tags + [recipe.weather.symbol + " " + recipe.weather.label]) }
                    VStack(alignment: .leading, spacing: 10) { Text("所需食材").font(.headline); TagList(tags: recipe.ingredients) }
                    Picker("食用日期", selection: $day) { ForEach(Weekday.allCases) { Text($0.label).tag($0) } }
                        .pickerStyle(.menu).accessibilityIdentifier("recipe-day-picker")
                    if let message = store.message { StatusBanner(text: message, isError: true) }
                    Button {
                        if store.add(recipe, day: day) { dismiss() }
                    } label: {
                        Text("加入本周菜单").fontWeight(.semibold).frame(maxWidth: .infinity).frame(minHeight: 48)
                    }.buttonStyle(.borderedProminent).disabled(store.isSaving).accessibilityIdentifier("add-to-plan")
                }.padding(16)
            }
            .navigationTitle("菜品详情").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .navigationBarTrailing) { Button("关闭") { dismiss() } } }
        }.navigationViewStyle(StackNavigationViewStyle()).accentColor(MenuStyle.green)
    }
}
