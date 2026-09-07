import SwiftUI

struct LoginView: View {
    @ObservedObject var session: AppSession
    @State private var dni = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error = ""
    @State private var showServer = false
    @State private var draftURL = AppConfig.serverURL.absoluteString

    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.95, blue: 0.90).ignoresSafeArea()
            VStack(spacing: 0) {
                Spacer()
                VStack(spacing: 18) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
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
                            .frame(width: 64, height: 64)
                        Text("S·3")
                            .font(.system(size: 18, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(red: 0.05, green: 0.08, blue: 0.06))
                    }
                    Text("CEFOT-2")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                    Text("Gestión de personal — acceso restringido")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)

                    VStack(alignment: .leading, spacing: 12) {
                        field("Usuario", text: $dni, secret: false)
                            .textInputAutocapitalization(.characters)
                        field("Contraseña", text: $password, secret: true)
                    }
                    .padding(.top, 8)

                    if !error.isEmpty {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(Color(red: 0.70, green: 0.23, blue: 0.19))
                            .frame(maxWidth: .infinity, alignment: .center)
                    }

                    Button {
                        Task { await entrar() }
                    } label: {
                        HStack {
                            if busy { ProgressView().tint(Color(red: 0.05, green: 0.08, blue: 0.06)) }
                            Text(busy ? "Entrando…" : "Entrar")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.12, green: 0.48, blue: 0.24))
                    .disabled(busy || dni.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)
                    .padding(.top, 4)

                    Button("Privacidad") {
                        if let url = URL(string: AppConfig.serverURL.absoluteString + "/privacidad.html") {
                            UIApplication.shared.open(url)
                        }
                    }
                    .font(.system(size: 13))
                    .padding(.top, 6)
                }
                .padding(28)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.10), radius: 18, y: 8)
                )
                .padding(.horizontal, 22)
                Spacer()
                Button("Servidor…") { showServer = true }
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 18)
            }
        }
        .sheet(isPresented: $showServer) {
            NavigationStack {
                Form {
                    Section("URL del servidor") {
                        TextField("https://tu-servicio.onrender.com", text: $draftURL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                    }
                    Section {
                        Button("Guardar") {
                            AppConfig.saveServerURL(draftURL)
                            showServer = false
                        }
                    }
                }
                .navigationTitle("Servidor")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cerrar") { showServer = false }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private func field(_ title: String, text: Binding<String>, secret: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .tracking(0.4)
            Group {
                if secret {
                    SecureField(title, text: text)
                } else {
                    TextField(title, text: text)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                }
            }
            .padding(12)
            .background(Color(red: 0.93, green: 0.95, blue: 0.89), in: RoundedRectangle(cornerRadius: 8))
        }
    }

    @MainActor
    private func entrar() async {
        error = ""
        busy = true
        defer { busy = false }
        do {
            try await session.login(dni: dni, password: password)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
