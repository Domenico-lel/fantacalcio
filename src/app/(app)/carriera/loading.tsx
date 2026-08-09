import PageHeader from "@/components/PageHeader";

export default function CarrieraLoading() {
  return (
    <div className="screen sec-career" aria-busy="true" aria-live="polite">
      <PageHeader eyebrow="Il tuo viaggio" title="Carriera" />
      <div className="px-4 py-4 space-y-3">
        <div className="skeleton h-44" />
        <div className="skeleton h-28" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
        <span className="sr-only">Caricamento carriera</span>
      </div>
    </div>
  );
}
