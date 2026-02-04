import Foundation
import CryptoKit

struct PWAIntegrityEntry: Decodable {
    let path: String
    let sha256: String
    let size: Int?
}

struct PWAIntegrityManifest: Decodable {
    let version: String?
    let generatedAt: String?
    let files: [PWAIntegrityEntry]
}

struct PWAIntegrityReport {
    let verified: Bool
    let failed: [String]
    let missing: [String]
    let manifestVersion: String?
}

enum PWAIntegrityVerifier {
    static func verify(rootURL: URL) -> PWAIntegrityReport {
        let manifestURL = rootURL.appendingPathComponent("pwa-manifest.json")
        guard let data = try? Data(contentsOf: manifestURL),
              let manifest = try? JSONDecoder().decode(PWAIntegrityManifest.self, from: data) else {
            return PWAIntegrityReport(verified: false, failed: [], missing: [], manifestVersion: nil)
        }

        var failed: [String] = []
        var missing: [String] = []
        for entry in manifest.files {
            let fileURL = rootURL.appendingPathComponent(entry.path)
            guard FileManager.default.fileExists(atPath: fileURL.path) else {
                missing.append(entry.path)
                continue
            }
            guard let digest = sha256(of: fileURL) else {
                failed.append(entry.path)
                continue
            }
            if digest != entry.sha256.lowercased() {
                failed.append(entry.path)
            }
        }
        let ok = failed.isEmpty && missing.isEmpty
        return PWAIntegrityReport(
            verified: ok,
            failed: failed,
            missing: missing,
            manifestVersion: manifest.version
        )
    }

    private static func sha256(of url: URL) -> String? {
        guard let stream = InputStream(url: url) else { return nil }
        stream.open()
        defer { stream.close() }
        var hasher = SHA256()
        let bufferSize = 64 * 1024
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let read = stream.read(buffer, maxLength: bufferSize)
            if read < 0 { return nil }
            if read == 0 { break }
            hasher.update(data: Data(bytes: buffer, count: read))
        }
        let digest = hasher.finalize()
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
