import SwiftUI
import Combine

struct ShellView: View {
    @AppStorage("ShowTelemetryOverlay") private var showOverlay = false
    @Environment(\.scenePhase) private var scenePhase
    @State private var pwaStatus = PWAInstaller.status()
    @State private var bannerVisible = false
    @State private var toastMessage: String?
    @State private var showToast = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            WebViewContainer()
                .ignoresSafeArea()
                .onAppear {
                    WebViewStore.shared.prewarm()
                    WebViewStore.shared.setScenePhase(scenePhase)
                    pwaStatus = PWAInstaller.status()
                    bannerVisible = pwaStatus.integrityOk == false
                }
            if showOverlay {
                TelemetryOverlayView(bridge: WebViewStore.shared.coreMLBridge)
                    .padding([.top, .trailing], 12)
            }
            if bannerVisible {
                IntegrityBannerView(status: $pwaStatus, isVisible: $bannerVisible)
                    .padding([.bottom, .leading, .trailing], 16)
                    .frame(maxWidth: 520)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            }
            if showToast {
                ToastView(message: toastMessage ?? "Updated")
                    .padding(.top, 24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .onChange(of: scenePhase) { phase in
            WebViewStore.shared.setScenePhase(phase)
            if phase == .active {
                pwaStatus = PWAInstaller.status()
                bannerVisible = pwaStatus.integrityOk == false
            }
        }
        .onReceive(Timer.publish(every: 5, on: .main, in: .common).autoconnect()) { _ in
            let next = PWAInstaller.status()
            pwaStatus = next
            if next.integrityOk == false {
                bannerVisible = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .pwaRefreshCompleted)) { notification in
            let message = (notification.userInfo?["message"] as? String) ?? "Local content refreshed"
            toastMessage = message
            withAnimation(.easeOut(duration: 0.2)) {
                showToast = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                withAnimation(.easeIn(duration: 0.2)) {
                    showToast = false
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .pwaVerifyCompleted)) { notification in
            let message = (notification.userInfo?["message"] as? String) ?? "Integrity verified"
            toastMessage = message
            withAnimation(.easeOut(duration: 0.2)) {
                showToast = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                withAnimation(.easeIn(duration: 0.2)) {
                    showToast = false
                }
            }
        }
    }
}

private struct IntegrityBannerView: View {
    @Binding var status: PWAStatus
    @Binding var isVisible: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Offline content integrity failed.")
                .font(.headline)
            Text("Tap refresh to restore the local PWA bundle.")
                .font(.caption)
                .foregroundColor(.secondary)
            HStack {
                Button("Refresh") {
                    WebViewStore.shared.refreshPwa()
                }
                .buttonStyle(.borderedProminent)
                Button("Verify") {
                    PWAInstaller.verifyNow { _ in }
                }
                .buttonStyle(.bordered)
                Button("Dismiss") {
                    isVisible = false
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(12)
        .background(.ultraThinMaterial)
        .cornerRadius(14)
        .shadow(radius: 6)
    }
}

private struct ToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.caption)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .shadow(radius: 6)
    }
}

extension Notification.Name {
    static let pwaRefreshCompleted = Notification.Name("pwaRefreshCompleted")
    static let pwaVerifyCompleted = Notification.Name("pwaVerifyCompleted")
}
