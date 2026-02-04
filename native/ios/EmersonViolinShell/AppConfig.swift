import Foundation

enum AppConfig {
    static let defaultOrigin = "https://localhost"
    static let appScheme = "app"
    static let appHost = "pwa"

    static func resolveAppURL() -> URL {
        if let override = UserDefaults.standard.string(forKey: "PWAOrigin"),
           let url = URL(string: override) {
            return url
        }
        if shouldUseAppScheme, offlineRootURL() != nil {
            return appSchemeURL(path: "/index.html")
        }
        if let bundled = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "pwa") {
            return bundled
        }
        return URL(string: defaultOrigin) ?? URL(fileURLWithPath: "/")
    }

    static var shouldUseAppScheme: Bool {
        if UserDefaults.standard.object(forKey: "UseAppScheme") != nil {
            return UserDefaults.standard.bool(forKey: "UseAppScheme")
        }
        return offlineRootURL() != nil
    }

    static func appSchemeURL(path: String) -> URL {
        var components = URLComponents()
        components.scheme = appScheme
        components.host = appHost
        components.path = path.hasPrefix("/") ? path : "/" + path
        return components.url ?? URL(fileURLWithPath: "/")
    }

    static func offlineRootURL() -> URL? {
        if let support = appSupportPwaURL(), FileManager.default.fileExists(atPath: support.path) {
            return support
        }
        if let bundled = Bundle.main.url(forResource: "pwa", withExtension: nil) {
            return bundled
        }
        return nil
    }

    static func offlineFallbackURL() -> URL? {
        guard let root = offlineRootURL() else { return nil }
        let fallbackFile = root.appendingPathComponent("offline.html")
        guard FileManager.default.fileExists(atPath: fallbackFile.path) else {
            return nil
        }
        if shouldUseAppScheme {
            return appSchemeURL(path: "/offline.html")
        }
        return fallbackFile
    }

    static func allowedHosts() -> Set<String> {
        var hosts = Set<String>()
        if let override = UserDefaults.standard.string(forKey: "PWAOrigin"),
           let url = URL(string: override),
           let host = url.host {
            hosts.insert(host)
        }
        if let url = URL(string: defaultOrigin),
           let host = url.host {
            hosts.insert(host)
        }
        if let domains = Bundle.main.object(forInfoDictionaryKey: "WKAppBoundDomains") as? [String] {
            domains.forEach { hosts.insert($0) }
        }
        return hosts
    }

    private static func appSupportPwaURL() -> URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        return base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
            .appendingPathComponent("pwa", isDirectory: true)
    }
}
