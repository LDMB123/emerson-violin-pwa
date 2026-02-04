import Foundation
import CryptoKit

enum ModelIntegrityVerifier {
    static func verify(url: URL, expectedSHA256: String) -> Bool {
        guard let digest = sha256(url: url) else { return false }
        return digest.lowercased() == expectedSHA256.lowercased()
    }

    private static func sha256(url: URL) -> String? {
        var hasher = SHA256()
        if url.hasDirectoryPath {
            guard let enumerator = FileManager.default.enumerator(
                at: url,
                includingPropertiesForKeys: [.isRegularFileKey],
                options: [.skipsHiddenFiles]
            ) else {
                return nil
            }
            var files: [URL] = []
            for case let fileURL as URL in enumerator {
                let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey])
                if values?.isRegularFile == true {
                    files.append(fileURL)
                }
            }
            files.sort { $0.path < $1.path }
            for fileURL in files {
                let relativePath = fileURL.path.replacingOccurrences(of: url.path, with: "")
                if let data = relativePath.data(using: .utf8) {
                    hasher.update(data: data)
                }
                if !updateHasher(&hasher, with: fileURL) {
                    return nil
                }
            }
        } else {
            guard updateHasher(&hasher, with: url) else { return nil }
        }

        let digest = hasher.finalize()
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    private static func updateHasher(_ hasher: inout SHA256, with url: URL) -> Bool {
        guard let stream = InputStream(url: url) else { return false }
        stream.open()
        defer { stream.close() }

        let bufferSize = 64 * 1024
        var buffer = [UInt8](repeating: 0, count: bufferSize)
        while stream.hasBytesAvailable {
            let read = stream.read(&buffer, maxLength: bufferSize)
            if read < 0 { return false }
            if read == 0 { break }
            hasher.update(data: Data(buffer[0..<read]))
        }
        return true
    }
}
