import { fetchCareerHub } from "@/app/career-actions";
import { isCareerOpen } from "@/app/release-actions";
import { getCurrentViewer } from "@/app/social-actions";
import PageHeader from "@/components/PageHeader";
import { canAccessCareer } from "@/lib/career-release";
import CareerGame from "./CareerGame";

export const dynamic = "force-dynamic";

export default async function CarrieraPage() {
  const [viewer, open] = await Promise.all([getCurrentViewer(), isCareerOpen()]);
  if (!canAccessCareer(!!viewer?.isAdmin, open)) {
    return (
      <div className="screen sec-career">
        <PageHeader eyebrow="Il tuo viaggio" title="Carriera" />
        <main className="px-4 py-10">
          <section className="card-accent p-6 text-center" aria-labelledby="career-coming-soon-title">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }} aria-hidden="true">
              🛠️
            </div>
            <p className="eyebrow mt-5">Work in progress</p>
            <h2 id="career-coming-soon-title" className="font-display mt-1 text-xl font-extrabold text-white">
              Sto fixando dei bug
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
              Porcoddio, la apro quando non esplode tutto 😭
            </p>
          </section>
        </main>
      </div>
    );
  }

  const hub = await fetchCareerHub();
  return <CareerGame initialHub={hub} />;
}
