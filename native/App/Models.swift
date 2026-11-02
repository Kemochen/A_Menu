import Foundation
import CoreGraphics

enum Weather: String, Codable, CaseIterable, Identifiable {
    case cold, hot, both
    var id: String { rawValue }
    var symbol: String {
        switch self { case .cold: return "❄️"; case .hot: return "☀️"; case .both: return "🌤️" }
    }
    var label: String {
        switch self { case .cold: return "冷天"; case .hot: return "热天"; case .both: return "都适合" }
    }
}

enum Weekday: String, Codable, CaseIterable, Identifiable {
    case monday, tuesday, wednesday, thursday, friday, saturday, sunday
    var id: String { rawValue }
    var index: Int { Self.allCases.firstIndex(of: self)! }
    var label: String { ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index] }
}

struct Recipe: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var category: String
    var tags: [String]
    var weather: Weather
    var image: String
    var ingredients: [String]
    var ingredientTypes: [String: String]
    var initialLastEatenDaysAgo: Int?
}

struct PlannedDish: Codable, Identifiable, Equatable {
    var id = UUID()
    let recipeId: String
    var day: Weekday
}

struct HistoryItem: Codable, Equatable {
    let recipeId: String
    let recipeName: String
    let day: Weekday
}

struct IngredientUse: Codable, Identifiable, Equatable {
    let name: String
    let count: Int
    var id: String { name }
}

struct IngredientGroup: Identifiable {
    let category: String
    let ingredients: [IngredientUse]
    var id: String { category }
}

struct HistoryEntry: Codable, Identifiable, Equatable {
    let id: String
    let submittedAt: String
    var updatedAt: String?
    var note: String?
    let items: [HistoryItem]
    let ingredientSummary: [IngredientUse]
    var date: Date? { MenuLogic.parseDate(submittedAt) }
}

struct HistoryResponse: Decodable {
    let historyEntries: [HistoryEntry]
    let entry: HistoryEntry?
}

struct RecipeResponse: Decodable { let recipes: [Recipe] }
struct CreatedRecipeResponse: Decodable { let recipe: Recipe }
struct ServerErrorResponse: Decodable { let error: String }

struct SubmissionItem: Encodable {
    let recipeId: String
    let day: Weekday
}

struct HistorySubmission: Encodable {
    let id: String?
    let items: [SubmissionItem]
    let note: String
}

struct RecipeInput: Encodable {
    let name: String
    let category: String
    let tags: [String]
    let weather: Weather
    let image: String
    let ingredients: [String]
    let ingredientTypes: [String: String]

    func validated() throws -> RecipeInput {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.count <= 60 else {
            throw MenuError.message("请填写不超过 60 个字的菜品名称。")
        }
        guard !category.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, category.count <= 30 else {
            throw MenuError.message("请填写不超过 30 个字的分类。")
        }
        guard tags.count <= 12, tags.allSatisfy({ !$0.isEmpty && $0.count <= 20 }) else {
            throw MenuError.message("最多填写 12 个标签，每个不超过 20 个字。")
        }
        guard (1...60).contains(ingredients.count), ingredients.allSatisfy({ !$0.isEmpty && $0.count <= 40 }) else {
            throw MenuError.message("请填写 1 到 60 种食材，每个名称不超过 40 个字。")
        }
        guard ingredients.allSatisfy({ MenuLogic.ingredientCategories.contains(ingredientTypes[$0] ?? "") }) else {
            throw MenuError.message("请为每种食材选择类别。")
        }
        if !image.isEmpty {
            guard image.count <= 2048, let url = URLComponents(string: image),
                  ["http", "https"].contains(url.scheme?.lowercased() ?? ""),
                  url.host != nil, url.user == nil, url.password == nil else {
                throw MenuError.message("请填写完整的 HTTP 或 HTTPS 图片网址。")
            }
        }
        return self
    }
}

enum MenuError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let text) = self { return text }; return nil }
}

struct MenuDraft: Codable {
    var items: [PlannedDish] = []
    var note = ""
    var editingEntryId: String?
    var hasContent: Bool { !items.isEmpty || !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || editingEntryId != nil }
}

enum MenuLogic {
    static let pageSize = 9
    static let ingredientCategories = ["蔬菜", "肉类", "海鲜", "主食", "豆制品", "蛋奶", "水果", "调料", "菌菇", "其他"]

    static func unique(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.filter { seen.insert($0).inserted }
    }

    static func filtered(_ recipes: [Recipe], category: String, search: String) -> [Recipe] {
        let terms = search.lowercased().split(whereSeparator: { $0.isWhitespace }).map(String.init)
        var result = recipes.filter { recipe in
            let text = ([recipe.name, recipe.category] + recipe.tags + recipe.ingredients).joined(separator: " ").lowercased()
            return (category == "全部" || recipe.category == category) && terms.allSatisfy { text.contains($0) }
        }
        let exact = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if let index = result.firstIndex(where: { $0.name.lowercased() == exact }), index > 0 {
            result.insert(result.remove(at: index), at: 0)
        }
        return result
    }

    static func page(_ recipes: [Recipe], number: Int) -> [Recipe] {
        guard number > 0 else { return [] }
        let start = (number - 1) * pageSize
        guard start < recipes.count else { return [] }
        return Array(recipes[start..<min(start + pageSize, recipes.count)])
    }

    static func summarize(_ items: [PlannedDish], recipes: [Recipe]) -> [IngredientUse] {
        let lookup = Dictionary(recipes.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        var counts: [String: Int] = [:]
        for item in items {
            for name in unique(lookup[item.recipeId]?.ingredients ?? []) { counts[name, default: 0] += 1 }
        }
        return counts.map { IngredientUse(name: $0.key, count: $0.value) }.sorted {
            $0.count == $1.count ? $0.name.localizedStandardCompare($1.name) == .orderedAscending : $0.count > $1.count
        }
    }

    static func grouped(_ summary: [IngredientUse], recipes: [Recipe]) -> [IngredientGroup] {
        var types: [String: String] = [:]
        for recipe in recipes {
            for (name, type) in recipe.ingredientTypes where types[name] == nil {
                types[name] = type == "面食" ? "主食" : type == "蛋类" ? "蛋奶" : type
            }
        }
        let groups = Dictionary(grouping: summary) { types[$0.name] ?? "其他" }
        return groups.map { category, ingredients in
            IngredientGroup(category: category, ingredients: ingredients.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending })
        }.sorted {
            let a = ingredientCategories.firstIndex(of: $0.category) ?? ingredientCategories.count
            let b = ingredientCategories.firstIndex(of: $1.category) ?? ingredientCategories.count
            return a == b ? $0.category < $1.category : a < b
        }
    }

    static func parseDate(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }

    static func relativeTime(_ date: Date?, now: Date = Date()) -> String {
        guard let date = date else { return "暂无记录" }
        let days = max(0, Int(now.timeIntervalSince(date) / 86400))
        switch days {
        case 0: return "今天"
        case 1: return "昨天"
        case 2..<7: return "\(days)天前"
        case 7..<14: return "一周前"
        case 14..<21: return "两周前"
        case 21..<60: return "\(days / 7)周前"
        case 60..<365: return "\(days / 30)个月前"
        default: return "\(days / 365)年前"
        }
    }

    static func isLastWeek(_ date: Date, now: Date = Date()) -> Bool {
        var calendar = Calendar(identifier: .iso8601)
        calendar.timeZone = .current
        guard let week = calendar.dateInterval(of: .weekOfYear, for: now),
              let start = calendar.date(byAdding: .day, value: -7, to: week.start) else { return false }
        return date >= start && date < week.start
    }

    static func dateTitle(_ date: Date?) -> String {
        guard let date = date else { return "日期未知" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "M月d日 HH:mm"
        return formatter.string(from: date)
    }
}

struct BookSplit: Equatable {
    let left: CGFloat
    let right: CGFloat
    let gap: CGFloat

    static func resolve(width: CGFloat, division: CGRect?) -> BookSplit? {
        guard let frame = division, width >= 532, frame.height > frame.width else { return nil }
        let gap = max(12, frame.width)
        let left = frame.minX - (gap - frame.width) / 2
        let right = width - left - gap
        guard left >= 260, right >= 260 else { return nil }
        return BookSplit(left: left, right: right, gap: gap)
    }
}
