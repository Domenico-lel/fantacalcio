"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full py-3 text-center rounded-2xl text-sm font-semibold text-white/70 border border-white/15 backdrop-blur transition-colors active:scale-95"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      Esci dall&apos;account
    </button>
  );
}
