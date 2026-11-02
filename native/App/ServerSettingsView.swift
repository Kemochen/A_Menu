import SwiftUI

@MainActor
struct ServerSettingsView: View {
    @ObservedObject var store: MenuStore
    let onConnected: () -> Void
    @State private var address = ""
    @State private var connecting = false
    @State private var error: String?
    @State private var confirmSwitch = false

    var body: some View {
        Form {
            Section("菜单服务器") {
                TextField("http://192.168.1.111:3000", text: $address)
                    .keyboardType(.URL).autocapitalization(.none).disableAutocorrection(true)
                    .accessibilityIdentifier("server-address")
                if address.lowercased().hasPrefix("http:") {
                    Text("HTTP 未加密，仅在可信内网或 VPN 中使用。").font(.footnote).foregroundColor(.orange)
                }
                Button(connecting ? "连接中…" : "连接并同步") {
                    if let current = store.server, (try? ServerAddress.normalize(address)) != current,
                       store.draft.hasContent { confirmSwitch = true }
                    else { Task { await connect() } }
                }.disabled(connecting || store.isSaving).accessibilityIdentifier("connect-server")
            }
            Section("当前状态") {
                LabeledValue(label: "服务器", value: store.server?.absoluteString ?? "未连接")
                LabeledValue(label: "菜品", value: "\(store.recipes.count) 道")
                LabeledValue(label: "历史菜单", value: "\(store.history.count) 份")
                if store.isRefreshing { ProgressView("正在同步") }
            }
            if let error = error { Section { Text(error).font(.footnote).foregroundColor(.red) } }
            ForEach(store.errors, id: \.self) { text in Section { StatusBanner(text: text, isError: true) } }
            Section { Button("返回菜品库", action: onConnected) }
        }
        .navigationTitle("服务器设置").navigationBarTitleDisplayMode(.inline)
        .onAppear { address = store.server?.absoluteString ?? "" }
        .confirmationDialog("切换服务器？当前草稿会保留在原服务器的本机缓存中。", isPresented: $confirmSwitch, titleVisibility: .visible) {
            Button("切换") { Task { await connect() } }
            Button("取消", role: .cancel) {}
        }
    }
    private func connect() async {
        guard !connecting else { return }
        connecting = true; error = nil
        defer { connecting = false }
        do { try await store.connect(address); onConnected() } catch { self.error = error.localizedDescription }
    }
}

private struct LabeledValue: View {
    let label: String
    let value: String
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label); Spacer(minLength: 16)
            Text(value).foregroundColor(.secondary).multilineTextAlignment(.trailing)
        }.font(.subheadline)
    }
}
