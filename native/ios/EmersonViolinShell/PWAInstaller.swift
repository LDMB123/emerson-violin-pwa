import Foundation

struct PWAStatus {
    let bundleVersion: String?
    let installedVersion: String?
    let useAppScheme: Bool
    let rootPath: String?
    let integrityOk: Bool?
    let integrityFailures: Int?
    let integrityCheckedAt: Date?
    let integrityVersion: String?
}

final class PWAInstaller {
    private static let installedKey = "PWAContentVersionInstalled"
    private static let forceRefreshKey = "PWAForceRefresh"
    private static let versionInfoKey = "PWAContentVersion"
    private static let integrityRequiredKey = "PWAIntegrityRequired"
    private static let integrityOKKey = "PWAIntegrityOK"
    private static let integrityFailuresKey = "PWAIntegrityFailures"
    private static let integrityCheckedAtKey = "PWAIntegrityCheckedAt"
    private static let integrityVersionKey = "PWAIntegrityVersion"

    static func ensureLocalPwa() {
        guard let bundledRoot = Bundle.main.url(forResource: "pwa", withExtension: nil) else {
            return
        }
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return
        }
        let root = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
        let destination = root.appendingPathComponent("pwa", isDirectory: true)
        let bundleVersion = Bundle.main.object(forInfoDictionaryKey: versionInfoKey) as? String
        let installedVersion = UserDefaults.standard.string(forKey: installedKey)
        let forceRefresh = UserDefaults.standard.bool(forKey: forceRefreshKey)

        let needsInstall = !FileManager.default.fileExists(atPath: destination.path)
        let versionChanged = bundleVersion != nil && bundleVersion != installedVersion

        let shouldCopy = needsInstall || versionChanged || forceRefresh
        if shouldCopy {
            do {
                if FileManager.default.fileExists(atPath: destination.path) {
                    try FileManager.default.removeItem(at: destination)
                }
                try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
                try FileManager.default.copyItem(at: bundledRoot, to: destination)
                if let bundleVersion = bundleVersion {
                    UserDefaults.standard.set(bundleVersion, forKey: installedKey)
                }
                if forceRefresh {
                    UserDefaults.standard.set(false, forKey: forceRefreshKey)
                }
                verifyIntegrityIfNeeded(rootURL: destination, version: bundleVersion ?? installedVersion)
            } catch {
                // Best-effort only; fallback to bundled assets if copy fails.
            }
            return
        }

        verifyIntegrityIfNeeded(rootURL: destination, version: installedVersion)
    }

    static func status() -> PWAStatus {
        let bundleVersion = Bundle.main.object(forInfoDictionaryKey: versionInfoKey) as? String
        let installedVersion = UserDefaults.standard.string(forKey: installedKey)
        let useAppScheme = AppConfig.shouldUseAppScheme
        let rootPath = AppConfig.offlineRootURL()?.path
        let integrityOk = UserDefaults.standard.object(forKey: integrityOKKey) as? Bool
        let integrityFailures = UserDefaults.standard.object(forKey: integrityFailuresKey) as? Int
        let integrityCheckedAt = UserDefaults.standard.object(forKey: integrityCheckedAtKey) as? Date
        let integrityVersion = UserDefaults.standard.string(forKey: integrityVersionKey)
        return PWAStatus(
            bundleVersion: bundleVersion,
            installedVersion: installedVersion,
            useAppScheme: useAppScheme,
            rootPath: rootPath,
            integrityOk: integrityOk,
            integrityFailures: integrityFailures,
            integrityCheckedAt: integrityCheckedAt,
            integrityVersion: integrityVersion
        )
    }

    static func refresh(completion: @escaping (PWAStatus) -> Void) {
        DispatchQueue.global(qos: .utility).async {
            UserDefaults.standard.set(true, forKey: forceRefreshKey)
            ensureLocalPwa()
            let status = status()
            DispatchQueue.main.async { completion(status) }
        }
    }

    static func verifyNow(completion: @escaping (PWAStatus) -> Void) {
        DispatchQueue.global(qos: .utility).async {
            if let rootURL = AppConfig.offlineRootURL() {
                let report = PWAIntegrityVerifier.verify(rootURL: rootURL)
                recordIntegrity(report: report, version: status().installedVersion)
            }
            let status = status()
            DispatchQueue.main.async { completion(status) }
        }
    }

    private static func verifyIntegrityIfNeeded(rootURL: URL, version: String?) {
        let required = UserDefaults.standard.object(forKey: integrityRequiredKey) as? Bool ?? true
        let existingVersion = UserDefaults.standard.string(forKey: integrityVersionKey)
        if existingVersion == version, UserDefaults.standard.object(forKey: integrityOKKey) != nil {
            return
        }
        DispatchQueue.global(qos: .utility).async {
            let report = PWAIntegrityVerifier.verify(rootURL: rootURL)
            recordIntegrity(report: report, version: version)
            if required, !report.verified {
                UserDefaults.standard.set(true, forKey: forceRefreshKey)
                if rootURL.path.contains("/Application Support/") {
                    try? FileManager.default.removeItem(at: rootURL)
                }
            }
        }
    }

    private static func recordIntegrity(report: PWAIntegrityReport, version: String?) {
        UserDefaults.standard.set(report.verified, forKey: integrityOKKey)
        UserDefaults.standard.set(report.failed.count + report.missing.count, forKey: integrityFailuresKey)
        UserDefaults.standard.set(Date(), forKey: integrityCheckedAtKey)
        if let version = version {
            UserDefaults.standard.set(version, forKey: integrityVersionKey)
        }
    }
}
