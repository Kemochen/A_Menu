import XCTest

final class AMenuUITests: XCTestCase {
    override func setUp() { super.setUp(); continueAfterFailure = false }

    private func launch() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launch()
        return app
    }

    private func screenshot(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    func testOfflineCatalogAndDetail() {
        let app = launch()
        let recipe = app.buttons["recipe-fanqie_niunan"]
        XCTAssertTrue(recipe.waitForExistence(timeout: 10))
        screenshot(app, name: "catalog")
        recipe.tap()
        XCTAssertTrue(app.staticTexts["所需食材"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["菜品标签"].exists)
        screenshot(app, name: "recipe-detail")
        let add = app.buttons["add-to-plan"]
        for _ in 0..<3 where !add.isHittable { app.swipeUp() }
        add.tap()
        XCTAssertTrue(recipe.waitForExistence(timeout: 5))
        let selected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label CONTAINS %@", "周一"), object: recipe)
        XCTAssertEqual(XCTWaiter.wait(for: [selected], timeout: 5), .completed)
        screenshot(app, name: "selected-day")
    }

    func testSearchFindsDessertWithoutNAS() {
        let app = launch()
        let search = app.textFields["recipe-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap(); search.typeText("cream")
        XCTAssertTrue(app.buttons["recipe-danta"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["recipe-fanqie_niunan"].exists)
        screenshot(app, name: "dessert-search")
    }
}
