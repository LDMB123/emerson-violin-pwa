import Foundation
import WebKit
import UniformTypeIdentifiers

final class OfflineSchemeHandler: NSObject, WKURLSchemeHandler {
    private let rootURL: URL
    private let cache = NSCache<NSString, NSData>()
    private let ioQueue = DispatchQueue(label: "offline.scheme.io", qos: .userInitiated)
    private var activeTasks: Set<ObjectIdentifier> = []
    private let activeLock = NSLock()

    init(rootURL: URL) {
        self.rootURL = rootURL
        cache.countLimit = 64
        cache.totalCostLimit = 8 * 1024 * 1024
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        let taskId = ObjectIdentifier(urlSchemeTask)
        activate(taskId)
        ioQueue.async { [weak self] in
            guard let self = self else { return }
            guard self.isActive(taskId) else { return }
            defer { self.deactivate(taskId) }

            let resolved = self.resolveFileURL(for: requestURL)
            guard let fileURL = resolved, FileManager.default.fileExists(atPath: fileURL.path) else {
                if self.isActive(taskId) {
                    urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
                }
                return
            }
            let cacheKey = fileURL.path as NSString
            let mimeType = self.mimeType(for: fileURL)

            if let range = urlSchemeTask.request.value(forHTTPHeaderField: "Range"),
               let partial = self.readRange(range, from: fileURL) {
                let headers = [
                    "Content-Range": "bytes \(partial.start)-\(partial.end)/\(partial.total)",
                    "Accept-Ranges": "bytes",
                    "Content-Length": "\(partial.data.count)",
                    "Content-Type": mimeType
                ]
                if let response = HTTPURLResponse(
                    url: requestURL,
                    statusCode: 206,
                    httpVersion: "HTTP/1.1",
                    headerFields: headers
                ) {
                    guard self.isActive(taskId) else { return }
                    urlSchemeTask.didReceive(response)
                    urlSchemeTask.didReceive(partial.data)
                    urlSchemeTask.didFinish()
                    return
                }
            }

            if let cached = self.cache.object(forKey: cacheKey) {
                let response = URLResponse(
                    url: requestURL,
                    mimeType: mimeType,
                    expectedContentLength: cached.length,
                    textEncodingName: mimeType == "text/html" ? "utf-8" : nil
                )
                guard self.isActive(taskId) else { return }
                urlSchemeTask.didReceive(response)
                urlSchemeTask.didReceive(cached as Data)
                urlSchemeTask.didFinish()
                return
            }

            do {
                let data = try Data(contentsOf: fileURL, options: [.mappedIfSafe])
                let response = URLResponse(
                    url: requestURL,
                    mimeType: mimeType,
                    expectedContentLength: data.count,
                    textEncodingName: mimeType == "text/html" ? "utf-8" : nil
                )
                guard self.isActive(taskId) else { return }
                urlSchemeTask.didReceive(response)
                urlSchemeTask.didReceive(data)
                urlSchemeTask.didFinish()
                if data.count <= self.cache.totalCostLimit {
                    self.cache.setObject(data as NSData, forKey: cacheKey, cost: data.count)
                }
            } catch {
                guard self.isActive(taskId) else { return }
                urlSchemeTask.didFailWithError(error)
            }
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        deactivate(ObjectIdentifier(urlSchemeTask))
    }

    func clearCache() {
        cache.removeAllObjects()
    }

    func updateCacheLimits(countLimit: Int, totalCostLimit: Int) {
        cache.countLimit = max(8, countLimit)
        cache.totalCostLimit = max(1024 * 1024, totalCostLimit)
    }

    private func resolveFileURL(for url: URL) -> URL? {
        let path = url.path.isEmpty ? "/index.html" : url.path
        let normalized = path.hasSuffix("/") ? (path + "index.html") : path
        let trimmed = normalized.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let fileURL = rootURL.appendingPathComponent(trimmed)
        let standardized = fileURL.standardizedFileURL
        guard standardized.path.hasPrefix(rootURL.standardizedFileURL.path) else {
            return nil
        }
        if FileManager.default.fileExists(atPath: standardized.path) {
            return standardized
        }
        if URL(fileURLWithPath: standardized.path).pathExtension.isEmpty {
            let fallback = rootURL.appendingPathComponent("index.html")
            return FileManager.default.fileExists(atPath: fallback.path) ? fallback : nil
        }
        return nil
    }

    private func mimeType(for url: URL) -> String {
        let ext = url.pathExtension
        if let type = UTType(filenameExtension: ext), let mime = type.preferredMIMEType {
            return mime
        }
        switch ext.lowercased() {
        case "html": return "text/html"
        case "js": return "application/javascript"
        case "css": return "text/css"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "wasm": return "application/wasm"
        default: return "application/octet-stream"
        }
    }

    private func readRange(_ header: String, from url: URL) -> (data: Data, start: Int, end: Int, total: Int)? {
        let prefix = "bytes="
        guard header.lowercased().hasPrefix(prefix) else { return nil }
        let rangeString = header.dropFirst(prefix.count)
        let parts = rangeString.split(separator: "-", maxSplits: 1).map { String($0) }
        guard parts.count == 2 else { return nil }
        let fileSize = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
        guard fileSize > 0 else { return nil }
        let start = Int(parts[0]) ?? 0
        let end = parts[1].isEmpty ? (fileSize - 1) : (Int(parts[1]) ?? (fileSize - 1))
        let clampedStart = max(0, min(start, fileSize - 1))
        let clampedEnd = max(clampedStart, min(end, fileSize - 1))
        let length = clampedEnd - clampedStart + 1
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        do {
            try handle.seek(toOffset: UInt64(clampedStart))
            let data = handle.readData(ofLength: length)
            return (data: data, start: clampedStart, end: clampedEnd, total: fileSize)
        } catch {
            return nil
        }
    }

    private func activate(_ id: ObjectIdentifier) {
        activeLock.lock()
        activeTasks.insert(id)
        activeLock.unlock()
    }

    private func deactivate(_ id: ObjectIdentifier) {
        activeLock.lock()
        activeTasks.remove(id)
        activeLock.unlock()
    }

    private func isActive(_ id: ObjectIdentifier) -> Bool {
        activeLock.lock()
        let active = activeTasks.contains(id)
        activeLock.unlock()
        return active
    }
}
