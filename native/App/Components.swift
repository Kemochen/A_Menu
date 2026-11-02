import SwiftUI
import UIKit

enum MenuStyle {
    static let green = Color(red: 36.0 / 255, green: 100.0 / 255, blue: 71.0 / 255)
    static let categories = ["肉类", "家常菜", "素菜", "海鲜类", "主食类", "汤类", "早餐", "甜品"]
}

private enum PhotoCache {
    static let images: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 36
        cache.totalCostLimit = 32 * 1024 * 1024
        return cache
    }()
    static func image(_ id: String) -> UIImage? {
        if let image = images.object(forKey: id as NSString) { return image }
        guard let url = Bundle.main.url(forResource: id, withExtension: "jpg", subdirectory: "Photos"),
              let image = UIImage(contentsOfFile: url.path) else { return nil }
        images.setObject(image, forKey: id as NSString, cost: Int(image.size.width * image.size.height * 4))
        return image
    }
}

struct DishPhoto: View {
    let recipe: Recipe
    var body: some View {
        Group {
            if let url = URL(string: recipe.image), ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                AsyncImage(url: url) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() }
                    else { placeholder }
                }
            } else if let image = PhotoCache.image(recipe.id) {
                Image(uiImage: image).resizable().scaledToFill()
            } else { placeholder }
        }.accessibilityHidden(true)
    }
    private var placeholder: some View {
        ZStack { Color(UIColor.secondarySystemBackground); Image(systemName: "fork.knife").font(.title2).foregroundColor(MenuStyle.green) }
    }
}

struct StatusBanner: View {
    let text: String
    var isError = false
    var body: some View {
        Text(text).font(.footnote).foregroundColor(isError ? .red : .secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8).fixedSize(horizontal: false, vertical: true)
    }
}

struct TagList: View {
    let tags: [String]
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 72), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(MenuLogic.unique(tags), id: \.self) { tag in
                Text(tag).font(.caption).padding(.horizontal, 8).padding(.vertical, 7)
                    .frame(maxWidth: .infinity).background(Color(UIColor.secondarySystemBackground)).cornerRadius(6)
            }
        }
    }
}

struct IngredientRows: View {
    let ingredients: [IngredientUse]
    var body: some View {
        ForEach(ingredients) { ingredient in
            HStack(alignment: .firstTextBaseline) {
                Text(ingredient.name)
                Spacer(minLength: 12)
                Text("\(ingredient.count) 道菜用到").font(.caption).foregroundColor(.secondary)
            }
        }
    }
}
