import SwiftUI
import UIKit

struct FoldReader: UIViewRepresentable {
    let changed: (CGRect?) -> Void
    func makeUIView(context: Context) -> FoldObserverView { FoldObserverView(changed: changed) }
    func updateUIView(_ view: FoldObserverView, context: Context) { view.changed = changed }
}

final class FoldObserverView: UIView {
    var changed: (CGRect?) -> Void
    private var lastFrame: CGRect?
    init(changed: @escaping (CGRect?) -> Void) { self.changed = changed; super.init(frame: .zero); isUserInteractionEnabled = false }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func layoutSubviews() {
        super.layoutSubviews()
        var frame: CGRect?
        // Xcode 13 can compile the regular-phone app without parsing new SDK symbols.
        #if compiler(>=6.4)
        if #available(iOS 27.1, *) {
            frame = reservedRegions(kind: .division, options: .includeInactive)
                .first(where: { $0.frame.height > $0.frame.width })?.frame
        }
        #endif
        guard frame != lastFrame else { return }
        lastFrame = frame
        let callback = changed
        let snapshot = frame
        DispatchQueue.main.async { callback(snapshot) }
    }
}
