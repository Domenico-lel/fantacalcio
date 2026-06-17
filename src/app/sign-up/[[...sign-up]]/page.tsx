import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(160deg, #0a2010 0%, #1a4028 100%)" }}
    >
      <div className="mb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-4xl mx-auto mb-3 shadow-xl">
          ⚽
        </div>
        <h1 className="text-2xl font-black text-white">
          Fanta<span className="text-emerald-400">Calcio</span>
        </h1>
        <p className="text-white/50 text-xs mt-1">Crea il tuo account gratis</p>
      </div>

      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#34d399",
            colorBackground: "#ffffff",
            colorText: "#111827",
            colorTextSecondary: "#6b7280",
            colorInputBackground: "#f9fafb",
            colorInputText: "#111827",
            borderRadius: "0.875rem",
            fontFamily: "system-ui, sans-serif",
          },
          elements: {
            card: "shadow-2xl border-0 w-full max-w-sm",
            headerTitle: "text-gray-900 font-bold",
            headerSubtitle: "text-gray-500",
            formButtonPrimary:
              "bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-none",
            formFieldInput:
              "border border-gray-200 bg-gray-50 text-gray-900 focus:ring-emerald-400 focus:border-emerald-400",
            formFieldLabel: "text-gray-700 font-medium",
            footerActionLink: "text-emerald-600 font-semibold",
            socialButtonsBlockButton:
              "border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-400 text-xs",
          },
        }}
      />
    </main>
  );
}
