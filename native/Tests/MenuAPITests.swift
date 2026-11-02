import XCTest
@testable import AMenu

private final class StubProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.handler!(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: [:])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}

final class MenuAPITests: XCTestCase {
    private var api: MenuAPI!
    private var session: URLSession!
    private let server = URL(string: "http://192.168.1.111:3000")!
    override func setUp() {
        super.setUp()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubProtocol.self]
        session = URLSession(configuration: configuration)
        api = MenuAPI(session: session)
    }
    override func tearDown() { session.invalidateAndCancel(); StubProtocol.handler = nil; super.tearDown() }

    func testMissingRecipeEndpointHasChineseUpgradeMessage() async {
        StubProtocol.handler = { _ in (404, Data("<html>not found</html>".utf8)) }
        do { _ = try await api.recipes(server: server); XCTFail("Expected failure") }
        catch { XCTAssertTrue(error.localizedDescription.contains("请更新群晖服务")) }
    }

    func testLoginHTMLIsNotTreatedAsJSON() async {
        StubProtocol.handler = { _ in (200, Data("<html>Synology login</html>".utf8)) }
        do { _ = try await api.history(server: server); XCTFail("Expected failure") }
        catch { XCTAssertTrue(error.localizedDescription.contains("有效菜单数据")) }
    }

    func testRequestPreservesServerValidationMessage() async {
        StubProtocol.handler = { _ in (409, Data("{\"error\":\"这道菜已经存在\"}".utf8)) }
        do { _ = try await api.recipes(server: server); XCTFail("Expected failure") }
        catch { XCTAssertEqual(error.localizedDescription, "这道菜已经存在") }
    }

    @MainActor func testFailedSubmissionDoesNotClearDraftOrNote() async throws {
        StubProtocol.handler = { request in
            if request.httpMethod == "POST" { return (500, Data("server error".utf8)) }
            return (200, Data((request.url!.path == "/api/recipes" ? "{\"recipes\":[]}" : "{\"historyEntries\":[]}").utf8))
        }
        let defaults = UserDefaults(suiteName: "AMenuTests.\(UUID().uuidString)")!
        let store = MenuStore(api: api, defaults: defaults, bundled: [])
        try await store.connect(server.absoluteString)
        let recipe = Recipe(id: "test", name: "测试菜", category: "素菜", tags: [], weather: .both, image: "", ingredients: ["白菜"], ingredientTypes: ["白菜": "蔬菜"])
        XCTAssertTrue(store.add(recipe, day: .monday))
        store.note = "少盐"
        await store.submit()
        XCTAssertEqual(store.draft.items.count, 1)
        XCTAssertEqual(store.note, "少盐")
        XCTAssertNil(store.submittedEntry)
    }

    @MainActor func testSuccessfulSubmissionClearsMarkersAndIncludesNote() async throws {
        let payload = "{\"historyEntries\":[],\"entry\":{\"id\":\"saved\",\"submittedAt\":\"2026-11-01T12:00:00Z\",\"note\":\"少盐\",\"items\":[{\"recipeId\":\"test\",\"recipeName\":\"测试菜\",\"day\":\"monday\"}],\"ingredientSummary\":[{\"name\":\"白菜\",\"count\":1}]}}"
        StubProtocol.handler = { request in
            if request.httpMethod == "POST" { return (200, Data(payload.utf8)) }
            return (200, Data((request.url!.path == "/api/recipes" ? "{\"recipes\":[]}" : "{\"historyEntries\":[]}").utf8))
        }
        let defaults = UserDefaults(suiteName: "AMenuTests.\(UUID().uuidString)")!
        let store = MenuStore(api: api, defaults: defaults, bundled: [])
        try await store.connect(server.absoluteString)
        let recipe = Recipe(id: "test", name: "测试菜", category: "素菜", tags: [], weather: .both, image: "", ingredients: ["白菜"], ingredientTypes: ["白菜": "蔬菜"])
        store.add(recipe, day: .monday); store.note = "少盐"
        await store.submit()
        XCTAssertTrue(store.draft.items.isEmpty)
        XCTAssertTrue(store.selectedDays("test").isEmpty)
        XCTAssertEqual(store.submittedEntry?.note, "少盐")
    }
}
