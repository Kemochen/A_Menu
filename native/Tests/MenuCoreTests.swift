import XCTest
@testable import AMenu

final class MenuCoreTests: XCTestCase {
    private func recipe(_ id: String = "one", ingredients: [String] = ["番茄", "牛肉"]) -> Recipe {
        Recipe(id: id, name: "番茄牛腩", category: "肉类", tags: ["牛肉", "炖菜"], weather: .cold,
            image: "/dishes/photos/\(id).webp", ingredients: ingredients, ingredientTypes: ["番茄": "蔬菜", "牛肉": "肉类"])
    }

    func testBundledLibraryHas79RecipesAndEveryPhoto() throws {
        let recipes = NativeResources.recipes
        XCTAssertEqual(recipes.count, 79)
        XCTAssertEqual(Set(recipes.map(\.id)).count, 79)
        for recipe in recipes {
            let url = try XCTUnwrap(Bundle.main.url(forResource: recipe.id, withExtension: "jpg", subdirectory: "Photos"))
            XCTAssertGreaterThan(try Data(contentsOf: url).count, 1000)
        }
    }

    func testSearchMatchesNamesIngredientsAndTags() {
        XCTAssertEqual(MenuLogic.filtered([recipe()], category: "全部", search: "番茄 牛肉").count, 1)
        XCTAssertEqual(MenuLogic.filtered([recipe()], category: "全部", search: "炖菜").count, 1)
        XCTAssertTrue(MenuLogic.filtered([recipe()], category: "素菜", search: "").isEmpty)
    }

    func testPagesPreserveNineOriginalDishesAndNeverSkipTheLastPage() {
        let recipes = (0..<79).map { recipe(String($0)) }
        XCTAssertEqual(MenuLogic.page(recipes, number: 1).map(\.id), (0..<9).map(String.init))
        XCTAssertEqual(MenuLogic.page(recipes, number: 2).map(\.id), (9..<18).map(String.init))
        XCTAssertEqual(MenuLogic.page(recipes, number: 9).count, 7)
        XCTAssertTrue(MenuLogic.page(recipes, number: 10).isEmpty)
        XCTAssertTrue(MenuLogic.page(recipes, number: 0).isEmpty)
    }

    func testIngredientsCountDishesNotDuplicateIngredientRowsOrQuantities() {
        let recipes = [recipe(), recipe("two", ingredients: ["番茄", "番茄"])]
        let dishes = [PlannedDish(recipeId: "one", day: .monday), PlannedDish(recipeId: "two", day: .friday)]
        XCTAssertEqual(MenuLogic.summarize(dishes, recipes: recipes), [IngredientUse(name: "番茄", count: 2), IngredientUse(name: "牛肉", count: 1)])
        let groups = MenuLogic.grouped(MenuLogic.summarize(dishes, recipes: recipes), recipes: recipes)
        XCTAssertEqual(groups.map(\.category), ["蔬菜", "肉类"])
    }

    func testWeekdaysAndRelativeDates() {
        XCTAssertEqual(Weekday.allCases.map(\.label), ["周一", "周二", "周三", "周四", "周五", "周六", "周日"])
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        XCTAssertEqual(MenuLogic.relativeTime(now.addingTimeInterval(-14 * 86400), now: now), "两周前")
        XCTAssertNotNil(MenuLogic.parseDate("2026-11-01T12:00:00.123Z"))
        XCTAssertNotNil(MenuLogic.parseDate("2026-11-01T12:00:00Z"))
        XCTAssertNil(MenuLogic.parseDate("not a date"))
    }

    func testNativeSubmissionUsesTheExistingNASContract() throws {
        let input = HistorySubmission(id: "history-id", items: [SubmissionItem(recipeId: "one", day: .wednesday)], note: "少盐")
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(input)) as? [String: Any])
        XCTAssertEqual(json["id"] as? String, "history-id")
        XCTAssertEqual(json["note"] as? String, "少盐")
        let items = try XCTUnwrap(json["items"] as? [[String: String]])
        XCTAssertEqual(items, [["recipeId": "one", "day": "wednesday"]])
    }

    func testNewRecipeValidationPreservesIngredientCategories() throws {
        let input = RecipeInput(name: "新菜", category: "家常菜", tags: ["清淡"], weather: .both, image: "", ingredients: ["番茄"], ingredientTypes: ["番茄": "蔬菜"])
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(input.validated())) as? [String: Any])
        XCTAssertEqual(json["weather"] as? String, "both")
        XCTAssertEqual(json["ingredientTypes"] as? [String: String], ["番茄": "蔬菜"])
        let empty = RecipeInput(name: "", category: "家常菜", tags: [], weather: .both, image: "", ingredients: [], ingredientTypes: [:])
        XCTAssertThrowsError(try empty.validated())
    }

    func testBookLayoutNeedsARealFoldAndPreservesAsymmetricPanes() {
        XCTAssertNil(BookSplit.resolve(width: 1000, division: nil))
        XCTAssertNil(BookSplit.resolve(width: 390, division: CGRect(x: 200, y: 0, width: 0, height: 844)))
        XCTAssertEqual(BookSplit.resolve(width: 800, division: CGRect(x: 420, y: 0, width: 20, height: 844)), BookSplit(left: 420, right: 360, gap: 20))
    }

    func testPrivateHTTPAndHTTPSAddresses() throws {
        for input in ["http://192.168.1.111:3000", "http://10.0.0.1:3000", "http://172.16.0.1", "http://100.64.0.1", "http://nas.local:3000", "http://ckm-nas:3000", "http://[fd00::1]:3000", "https://menu.example.com"] {
            XCTAssertNotNil(try ServerAddress.normalize(input), input)
        }
        for input in ["", "http://8.8.8.8", "http://menu.example.com", "http://localhost:3000", "http://127.0.0.1", "http://[::1]", "https://user:pass@example.com", "https://example.com/api/history", "https://example.com?token=secret", "https://example.com#section", "ftp://nas.local"] {
            XCTAssertThrowsError(try ServerAddress.normalize(input), input)
        }
    }

    @MainActor func testOfflineDraftPersistsAndDuplicateDaysAreRejected() {
        let suite = "AMenuTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = MenuStore(defaults: defaults, bundled: [recipe()], offline: true)
        XCTAssertTrue(store.add(recipe(), day: .wednesday))
        XCTAssertFalse(store.add(recipe(), day: .wednesday))
        XCTAssertTrue(store.add(recipe(), day: .monday))
        store.note = "少辣"
        let restored = MenuStore(defaults: defaults, bundled: [recipe()], offline: true)
        XCTAssertEqual(restored.selectedDays("one"), [.monday, .wednesday])
        XCTAssertEqual(restored.note, "少辣")
        restored.remove(restored.draft.items[0].id)
        XCTAssertEqual(restored.draft.items.count, 1)
    }
}
