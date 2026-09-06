import SwiftUI

struct ContentView: View {
    @State private var showSettings = false
    @State private var draftURL = AppConfig.serverURL.absoluteString
    @State private var reloadToken = UUID()
    @StateObject private var session = WebSession()

    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.95, blue: 0.90).ignoresSafeArea()

            WebView(session: session, reloadToken: reloadToken)
                .ignoresSafeArea(edges: .bottom)

            if session.isLoading && session.lastError == nil {
                splash
            }

            if let message = session.lastError {
                errorPane(message)
            }

            VStack {
                HStack {
                    Spacer()
                    Button {
                        draftURL = AppConfig.serverURL.absoluteString
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(red: 0.12, green: 0.18, blue: 0.10).opacity(0.55))
                            .padding(8)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .padding(.trailing, 10)
                    .padding(.top, 6)
                    .accessibilityLabel("Ajustes del servidor")
                }
                Spacer()
            }
        }
        .sheet(isPresented: $showSettings) {
            settingsSheet
        }
        .onReceive(NotificationCenter.default.publisher(for: .cefotShareFile)) { note in
            guard let url = note.object as? URL else { return }
            session.shareURL = url
        }
        .sheet(item: $session.shareItem) { item in
            ShareSheet(items: [item.url])
        }
    }

    private var splash: some View {
        VStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.18, green: 0.55, blue: 0.28),
                                Color(red: 0.20, green: 0.36, blue: 0.20)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 72, height: 72)
                    .shadow(color: .black.opacity(0.18), radius: 12, y: 6)
                Text("S·3")
                    .font(.system(size: 22, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color(red: 0.05, green: 0.08, blue: 0.06))
            }
            Text("CEFOT-2")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
            Text(session.statusText)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            ProgressView()
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.96, green: 0.95, blue: 0.90))
    }

    private func errorPane(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36))
                .foregroundStyle(Color(red: 0.12, green: 0.48, blue: 0.24))
            Text("No se ha podido abrir el servidor")
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            HStack(spacing: 12) {
                Button("Reintentar") {
                    session.lastError = nil
                    reloadToken = UUID()
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 0.12, green: 0.48, blue: 0.24))
                Button("Cambiar URL") {
                    draftURL = AppConfig.serverURL.absoluteString
                    showSettings = true
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.96, green: 0.95, blue: 0.90))
    }

    private var settingsSheet: some View {
        NavigationStack {
            Form {
                Section("Servidor") {
                    TextField("https://tu-servicio.onrender.com", text: $draftURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    Text("Sin barra final. En red local usa la IP del Mac, no localhost.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Section {
                    Button("Guardar y recargar") {
                        AppConfig.saveServerURL(draftURL)
                        showSettings = false
                        session.lastError = nil
                        reloadToken = UUID()
                    }
                }
            }
            .navigationTitle("CEFOT")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") { showSettings = false }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

final class WebSession: ObservableObject {
    @Published var isLoading = true
    @Published var lastError: String?
    @Published var statusText = "Conectando…"
    @Published var shareItem: ShareItem?

    var shareURL: URL? {
        get { shareItem?.url }
        set { shareItem = newValue.map(ShareItem.init) }
    }
}

struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

extension Notification.Name {
    static let cefotShareFile = Notification.Name("cefotShareFile")
}
