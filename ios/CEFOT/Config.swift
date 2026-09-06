import Foundation

enum AppConfig {
    static let defaultServerURL = "https://cefot-vxs6.onrender.com"
    static let startPath = "/login.html"
    static let urlDefaultsKey = "cefot.serverURL"

    static var serverURL: URL {
        let raw = UserDefaults.standard.string(forKey: urlDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let chosen = (raw?.isEmpty == false) ? raw! : defaultServerURL
        let trimmed = chosen.hasSuffix("/") ? String(chosen.dropLast()) : chosen
        return URL(string: trimmed) ?? URL(string: defaultServerURL)!
    }

    static var startURL: URL {
        serverURL.appendingPathComponent(String(startPath.drop(while: { $0 == "/" })))
    }

    static func saveServerURL(_ raw: String) {
        var value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasSuffix("/") { value = String(value.dropLast()) }
        UserDefaults.standard.set(value, forKey: urlDefaultsKey)
    }

    static func isAllowed(_ url: URL) -> Bool {
        if url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" { return true }
        guard let host = url.host, let allowed = serverURL.host else { return false }
        return host.caseInsensitiveCompare(allowed) == .orderedSame
    }
}
