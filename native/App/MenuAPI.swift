import Foundation
import Darwin

enum ServerAddress {
    static func normalize(_ input: String) throws -> URL {
        let value = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var components = URLComponents(string: value),
              let scheme = components.scheme?.lowercased(), ["http", "https"].contains(scheme),
              let rawHost = components.host, !rawHost.isEmpty else {
            throw MenuError.message("请输入完整的 HTTP 或 HTTPS 服务器网址。")
        }
        let host = rawHost.trimmingCharacters(in: CharacterSet(charactersIn: "[]")).lowercased()
        guard components.user == nil, components.password == nil, components.query == nil, components.fragment == nil,
              components.path.isEmpty || components.path == "/" else {
            throw MenuError.message("请填写服务器根网址，不要包含路径、账号或参数。")
        }
        if let port = components.port, !(1...65535).contains(port) { throw MenuError.message("服务器端口不正确。") }
        guard host != "localhost", host != "::1", !host.hasPrefix("127."), host != "0.0.0.0" else {
            throw MenuError.message("请填写 NAS 或 Mac 的局域网地址，不能使用 localhost。")
        }
        if scheme == "http" && !isPrivateHost(host) {
            throw MenuError.message("HTTP 仅用于内网或 VPN 地址，公网服务器请使用 HTTPS。")
        }
        components.scheme = scheme
        components.host = rawHost.lowercased()
        components.path = ""
        guard let url = components.url else { throw MenuError.message("服务器网址格式不正确。") }
        return url
    }

    private static func isPrivateHost(_ host: String) -> Bool {
        var address = in6_addr()
        if host.withCString({ inet_pton(AF_INET6, $0, &address) }) == 1 {
            let bytes = withUnsafeBytes(of: address) { Array($0) }
            return bytes[0] & 0xfe == 0xfc || (bytes[0] == 0xfe && bytes[1] & 0xc0 == 0x80)
        }
        let pieces = host.split(separator: ".", omittingEmptySubsequences: false)
        if pieces.count == 4, pieces.allSatisfy({ !$0.isEmpty && $0.allSatisfy(\.isNumber) }) {
            let parts = pieces.compactMap { Int($0) }
            guard parts.count == 4, parts.allSatisfy({ (0...255).contains($0) }) else { return false }
            return parts[0] == 10 || (parts[0] == 172 && (16...31).contains(parts[1])) ||
                (parts[0] == 192 && parts[1] == 168) || (parts[0] == 100 && (64...127).contains(parts[1]))
        }
        if host.hasSuffix(".local") { return true }
        return host.range(of: "^[a-z][a-z0-9-]*$", options: .regularExpression) != nil
    }
}

final class MenuAPI {
    private let session: URLSession
    init(session: URLSession = .shared) { self.session = session }

    func recipes(server: URL) async throws -> [Recipe] {
        let response: RecipeResponse = try await request(server, path: "api/recipes")
        guard Set(response.recipes.map(\.id)).count == response.recipes.count else {
            throw MenuError.message("服务器菜品库包含重复编号，请检查群晖数据。")
        }
        return response.recipes
    }

    func history(server: URL) async throws -> [HistoryEntry] {
        let response: HistoryResponse = try await request(server, path: "api/history")
        return response.historyEntries.sorted { $0.submittedAt > $1.submittedAt }
    }

    func submit(server: URL, draft: MenuDraft) async throws -> HistoryResponse {
        let input = HistorySubmission(id: draft.editingEntryId,
            items: draft.items.map { SubmissionItem(recipeId: $0.recipeId, day: $0.day) }, note: draft.note.trimmingCharacters(in: .whitespacesAndNewlines))
        let response: HistoryResponse = try await request(server, path: "api/history", method: draft.editingEntryId == nil ? "POST" : "PUT", body: JSONEncoder().encode(input))
        guard response.entry != nil else { throw MenuError.message("保存结果未确认，请先查看历史菜单，避免重复提交。") }
        return response
    }

    func delete(server: URL, id: String) async throws -> [HistoryEntry] {
        let response: HistoryResponse = try await request(server, path: "api/history", method: "DELETE", body: JSONEncoder().encode(["id": id]))
        return response.historyEntries
    }

    func createRecipe(server: URL, input: RecipeInput) async throws -> Recipe {
        let valid = try input.validated()
        let response: CreatedRecipeResponse = try await request(server, path: "api/recipes", method: "POST", body: JSONEncoder().encode(valid))
        return response.recipe
    }

    private func request<T: Decodable>(_ server: URL, path: String, method: String = "GET", body: Data? = nil) async throws -> T {
        var request = URLRequest(url: server.appendingPathComponent(path), cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch is CancellationError { throw CancellationError() }
        catch {
            throw MenuError.message("无法连接菜单服务器，请检查网址、Wi-Fi、VPN 或局域网权限。")
        }
        guard let http = response as? HTTPURLResponse else { throw MenuError.message("服务器没有返回有效响应。") }
        if http.statusCode == 404 {
            throw MenuError.message(path == "api/recipes"
                ? "群晖缺少菜品库接口，请更新群晖服务；当前仍可浏览本地菜品。"
                : "找不到历史菜单接口，请检查群晖网址和服务版本。")
        }
        if http.statusCode == 401 || http.statusCode == 403 {
            throw MenuError.message("服务器拒绝访问，请检查菜单服务权限或反向代理登录设置。")
        }
        let decoder = JSONDecoder()
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? decoder.decode(ServerErrorResponse.self, from: data))?.error
            throw MenuError.message(message ?? "菜单服务请求失败（HTTP \(http.statusCode)），请检查群晖服务。")
        }
        do { return try decoder.decode(T.self, from: data) }
        catch { throw MenuError.message("服务器返回的不是有效菜单数据，请确认地址指向菜单服务并更新群晖。") }
    }
}
