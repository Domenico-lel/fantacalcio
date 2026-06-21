import { SignIn } from "@clerk/nextjs";
import { BrandCrest, BrandWordmark } from "@/components/BrandLogo";

export default function SignInPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(165deg, #0a0f1d 0%, #16203c 60%, #0e2e26 100%)" }}
    >
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandCrest size={72} />
        <BrandWordmark size={20} className="mt-2" />
        <p className="text-white/50 text-xs mt-1.5">Accedi al tuo account</p>
      </div>

      <div style={{ width: "25rem", maxWidth: "calc(100vw - 2rem)" }}>
      <SignIn
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
            rootBox: { width: "100%" },
            card: "shadow-2xl border-0",
            headerTitle: "text-gray-900 font-bold",
            headerSubtitle: "text-gray-500",
            formButtonPrimary:
              "bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-none",
            formFieldInput:
              "border border-gray-200 bg-gray-50 text-gray-900 focus:ring-emerald-400 focus:border-emerald-400",
            formFieldLabel: "text-gray-700 font-medium",
            footerActionLink: "text-emerald-600 font-semibold",
            identityPreviewText: "text-gray-800",
            identityPreviewEditButton: "text-emerald-600",
            socialButtonsBlockButton:
              "border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-400 text-xs",
          },
        }}
      />
      </div>
    </main>
  );
}
