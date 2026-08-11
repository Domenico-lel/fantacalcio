"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import PageHeader from "@/components/PageHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import TabPanel from "@/components/TabPanel";
import { useConfirm, useToast } from "@/components/Dialog";
import { useRegisterRefresh } from "@/components/PullToRefresh";
import {
  acceptCareerTransfer,
  acknowledgeCareerReport,
  advanceCareerSeason,
  chooseCareerClub,
  continueCareerChoice,
  createCareer,
  declineCareerTransfers,
  fetchCareerHub,
  resolveCareerChoice,
  restartCareer,
  type CareerHub,
  type CareerMutationResult,
  type CareerRecord,
  type CreateCareerRequest,
} from "@/app/career-actions";
import {
  CLUBS_BY_COUNTRY,
  COUNTRY_OPTIONS,
  ROLE_OPTIONS,
  TRAINING_OPTIONS,
  getClubByName,
  getProjectedSquadRole,
  type CareerDecision,
  type CareerDecisionEffects,
  type CareerDecisionOption,
  type CareerDecisionProbability,
  type CareerDecisionResult,
  type CareerEvent,
  type CareerOffer,
  type CareerSeason,
  type CareerSeasonPreparation,
  type CareerState,
  type CareerArc,
  type ClubDefinition,
  type CountryCode,
  type GameMode,
  type NationalRankingEntry,
  type NationalRankingTrend,
  type PreferredFoot,
  type Role,
  type StartMode,
  type TrainingChoice,
} from "@/lib/career-engine";

type TabKey = "career" | "stats" | "archive";
type SetupStep = 1 | 2 | 3;

interface SetupDraft {
  firstName: string;
  lastName: string;
  nationality: CountryCode;
  role: Role | "";
  preferredFoot: PreferredFoot;
  shirtNumber: string;
  gameMode: GameMode;
  startMode: StartMode;
  agentEnabled: boolean;
  startingClubName: string;
}

const DEFAULT_DRAFT: SetupDraft = {
  firstName: "",
  lastName: "",
  nationality: "IT",
  role: "",
  preferredFoot: "right",
  shirtNumber: "10",
  gameMode: "balanced",
  startMode: "academy",
  agentEnabled: true,
  startingClubName: "",
};

export default function CareerGame({ initialHub }: { initialHub: CareerHub }) {
  const [hub, setHub] = useState(initialHub);
  const [tab, setTab] = useState<TabKey>("career");
  const [setupStep, setSetupStep] = useState<SetupStep | null>(null);
  const [draft, setDraft] = useState<SetupDraft>(DEFAULT_DRAFT);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const reload = useCallback(async () => {
    try {
      const next = await fetchCareerHub();
      setHub(next);
      if (next.error) toast(next.error, "error");
    } catch {
      toast("Connessione non disponibile. Riprova tra poco.", "error");
    }
  }, [toast]);
  useRegisterRefresh(reload);

  const applyResult = useCallback((result: CareerMutationResult) => {
    setHub(result.hub);
    if (result.error) toast(result.error, "error");
    return !result.error;
  }, [toast]);

  async function submitCareer() {
    if (!draft.role) { toast("Scegli il ruolo del giocatore.", "error"); setSetupStep(2); return; }
    const shirtNumber = Number(draft.shirtNumber);
    const payload: CreateCareerRequest = {
      firstName: draft.firstName,
      lastName: draft.lastName,
      nationality: draft.nationality,
      role: draft.role,
      preferredFoot: draft.preferredFoot,
      shirtNumber,
      gameMode: draft.gameMode,
      startMode: draft.startMode,
      agentEnabled: draft.agentEnabled,
      startingClubName: draft.startMode === "freeAgent" ? draft.startingClubName : undefined,
    };
    setBusy(true);
    try {
      const result = await createCareer(payload);
      if (applyResult(result)) {
        setSetupStep(null);
        toast(draft.startMode === "academy" ? "Le prime offerte sono arrivate." : "Carriera creata.", "success");
      }
    } catch {
      toast("Non riesco a salvare la carriera. Controlla la connessione e riprova.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function mutate(action: () => Promise<CareerMutationResult>, success?: string): Promise<CareerMutationResult | null> {
    setBusy(true);
    try {
      const result = await action();
      if (applyResult(result) && success) toast(success, "success");
      return result;
    } catch {
      toast("Operazione non riuscita. Controlla la connessione e riprova.", "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function simulate(choice: TrainingChoice) {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di simulare la stagione.", "error");
      return;
    }
    await mutate(() => advanceCareerSeason(choice, expectedVersion));
  }

  async function resolveDecision(decisionId: string, optionId: string) {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di confermare la scelta.", "error");
      return;
    }
    await mutate(() => resolveCareerChoice(decisionId, optionId, expectedVersion));
  }

  async function continueDecision(decisionId: string) {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di continuare.", "error");
      return;
    }
    await mutate(() => continueCareerChoice(decisionId, expectedVersion));
  }

  async function closeReport(seasonId: string) {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di continuare.", "error");
      return;
    }
    await mutate(() => acknowledgeCareerReport(seasonId, expectedVersion));
  }

  async function acceptTransfer(clubName: string) {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di accettare l'offerta.", "error");
      return;
    }
    await mutate(() => acceptCareerTransfer(clubName, expectedVersion), "Trasferimento completato.");
  }

  async function declineTransfers() {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di rispondere alle offerte.", "error");
      return;
    }
    await mutate(() => declineCareerTransfers(expectedVersion), "Resti nel tuo club.");
  }

  async function reset() {
    const expectedVersion = hub.career?.dbVersion;
    if (!expectedVersion) {
      toast("Ricarica la carriera prima di archiviarla.", "error");
      return;
    }
    const ok = await confirm({
      title: "Archiviare e ricominciare?",
      message: "Questa carriera resterà nell'archivio. Potrai creare subito un nuovo giocatore.",
      confirmLabel: "Archivia e ricomincia",
    });
    if (!ok) return;
    const result = await mutate(() => restartCareer(expectedVersion));
    if (result && !result.error) {
      setSetupStep(null);
      setTab("career");
      toast("Carriera archiviata. Puoi creare un nuovo giocatore.", "success");
    }
  }

  if (!hub.career) {
    const archivedCareers = hub.archivedCareers;
    return (
      <div className="screen sec-career">
        <PageHeader eyebrow="Il tuo viaggio" title="Carriera" />
        {hub.error && <ErrorBanner message={hub.error} onRetry={reload} />}
        {setupStep === null
          ? <ModePicker onPick={(mode) => { setDraft({ ...DEFAULT_DRAFT, gameMode: mode }); setSetupStep(1); }} />
          : <SetupWizard step={setupStep} setStep={setSetupStep} draft={draft} setDraft={setDraft} busy={busy} onSubmit={submitCareer} onCancel={() => setSetupStep(null)} />}
        {setupStep === null && archivedCareers.length > 0 ? <ArchivedCareerShelf records={archivedCareers} /> : null}
        <ClubDataCredit />
      </div>
    );
  }

  const state = hub.career.state;
  if (state.stage === "choosingClub") {
    return (
      <div className="screen sec-career">
        <PageHeader eyebrow="Primo contratto" title="Scegli il club" />
        {hub.error && <ErrorBanner message={hub.error} onRetry={reload} />}
        <StartingOffers state={state} busy={busy} onChoose={(name) => mutate(() => chooseCareerClub(name), "Hai firmato il primo contratto.")} />
        <ClubDataCredit />
      </div>
    );
  }

  return (
    <div className="screen sec-career">
      <PageHeader
        eyebrow="Il tuo viaggio"
        title="Carriera"
        right={<GoatPill score={state.goatScore} />}
      >
        <SegmentedTabs<TabKey>
          value={tab}
          onChange={setTab}
          items={[
            { key: "career", label: "Carriera" },
            { key: "stats", label: "Statistiche" },
            { key: "archive", label: "Archivio" },
          ]}
        />
      </PageHeader>

      {hub.error && <ErrorBanner message={hub.error} onRetry={reload} />}
      <TabPanel tabKey={tab} keys={["career", "stats", "archive"]}>
        {tab === "career" ? (
          <CareerTab
            state={state}
            busy={busy}
            onReportClose={closeReport}
            onResolveDecision={resolveDecision}
            onContinueDecision={continueDecision}
            onSimulate={simulate}
            onAcceptTransfer={acceptTransfer}
            onDeclineTransfers={declineTransfers}
            onReset={reset}
          />
        ) : tab === "stats" ? (
          <StatsTab state={state} onReset={reset} />
        ) : (
          <ArchiveTab hub={hub} state={state} />
        )}
      </TabPanel>
      <ClubDataCredit />
    </div>
  );
}

function ModePicker({ onPick }: { onPick: (mode: GameMode) => void }) {
  return (
    <main className="px-4 py-5">
      <div className="mb-5 rounded-3xl p-5 overflow-hidden relative"
        style={{ background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 16%, var(--surface-2)), var(--bg-soft) 65%, var(--bg))", border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full blur-3xl" style={{ background: "var(--accent-glow)" }} />
        <p className="eyebrow">Nuova modalità</p>
        <h2 className="font-display mt-2 text-3xl font-extrabold leading-tight text-white">Scrivi la tua<br />storia nel calcio</h2>
        <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
          Parti dal vivaio, cresci stagione dopo stagione e prova a diventare una leggenda.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["14–42 anni", "OVR iniziale 40", "9 nazioni", "Salvataggio automatico"].map((label) => <span key={label} className="chip">{label}</span>)}
        </div>
      </div>

      <p className="eyebrow mb-3 px-1">Scegli il ritmo</p>
      <div className="space-y-3">
        <ModeCard title="Rapida" badge="Classica" icon="⚡" description="Una stagione in un tocco, con risultati e resoconto subito." onClick={() => onPick("balanced")} />
        <ModeCard title="Immersiva" badge="Dettagliata" icon="🎬" description="Il resoconto si apre per scene: stagione, numeri, eventi e premi." onClick={() => onPick("realistic")} />
        <div className="card-flat flex min-h-[88px] items-center gap-4 p-4 opacity-55" aria-disabled="true">
          <span className="text-3xl" aria-hidden="true">👑</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><h3 className="font-display font-bold text-white">Leggenda</h3><span className="chip">Più avanti</span></div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>Una modalità narrativa speciale arriverà nelle prossime versioni.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function ModeCard({ title, badge, icon, description, onClick }: { title: string; badge: string; icon: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card-accent w-full min-h-[104px] p-4 text-left active:scale-[.985] transition-transform">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-3xl"
          style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 24%, transparent)" }} aria-hidden="true">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h3 className="font-display text-lg font-extrabold text-white">{title}</h3><span className="chip">{badge}</span></div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>{description}</p>
        </div>
        <span className="text-xl" style={{ color: "var(--accent)" }} aria-hidden="true">›</span>
      </div>
    </button>
  );
}

function SetupWizard({ step, setStep, draft, setDraft, busy, onSubmit, onCancel }: {
  step: SetupStep;
  setStep: (step: SetupStep) => void;
  draft: SetupDraft;
  setDraft: (draft: SetupDraft) => void;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const selectedCountry = countryFor(draft.nationality);
  const countryCodes = COUNTRY_OPTIONS.map((country) => country.code);
  const roleCodes = ROLE_OPTIONS.map((role) => role.code);
  const feet: PreferredFoot[] = ["left", "right", "both"];
  const startModes: StartMode[] = ["academy", "freeAgent"];
  const availableClubs = CLUBS_BY_COUNTRY[draft.nationality];
  const clubNames = availableClubs.map((club) => club.name);
  const canContinue = step === 1 || (step === 2 && !!draft.firstName.trim() && !!draft.role && Number(draft.shirtNumber) >= 1 && Number(draft.shirtNumber) <= 99)
    || (step === 3 && (draft.startMode === "academy" || !!draft.startingClubName));

  return (
    <main className="px-4 py-4 pb-8">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div><p className="eyebrow">Definisci la tua identità</p><h2 className="font-display mt-1 text-xl font-bold text-white">{step === 1 ? "Nazionalità" : step === 2 ? "Ruolo e maglia" : "Opzioni carriera"}</h2></div>
          <button type="button" onClick={onCancel} className="tap rounded-xl text-lg" style={{ color: "var(--text-dim)" }} aria-label="Chiudi configurazione">×</button>
        </div>
        <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Avanzamento configurazione">
          {[1, 2, 3].map((value) => (
            <li key={value} className="h-1.5 rounded-full" style={{ background: value <= step ? "var(--accent)" : "rgba(255,255,255,.09)" }}>
              <span className="sr-only">Passaggio {value}{value === step ? ", attuale" : ""}</span>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="mt-5">
            <p className="text-sm font-bold text-white">Dove nasce il tuo giocatore?</p>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nazionalità">
              {COUNTRY_OPTIONS.map((country) => {
                const selected = draft.nationality === country.code;
                return <button key={country.code} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1}
                  onClick={() => setDraft({ ...draft, nationality: country.code, startingClubName: "" })}
                  onKeyDown={(event) => onRadioKeyDown(event, countryCodes, draft.nationality, (nationality) => setDraft({ ...draft, nationality, startingClubName: "" }))}
                  className="min-h-[68px] rounded-2xl px-2 py-2 text-center transition-colors"
                  style={{ background: selected ? "color-mix(in srgb, var(--accent) 14%, var(--surface-2))" : "rgba(255,255,255,.045)", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}` }}>
                  <span className="block text-2xl" aria-hidden="true">{country.flag}</span><span className="mt-1 block text-xs font-bold text-white">{country.name}</span>
                </button>;
              })}
            </div>
            <div className="card-accent mt-4 p-4">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold" style={{ color: "var(--accent-soft)" }}>{selectedCountry.league.name}</p><p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>{selectedCountry.league.style}</p></div><strong className="font-display text-base text-white">{availableClubs.length} giocabili</strong></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center"><SmallInfo label="Club giocabili" value={String(availableClubs.length)} /><SmallInfo label="Partite" value={String(selectedCountry.league.leagueMatches)} /><SmallInfo label="Livello" value={String(selectedCountry.league.strength)} /></div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <Field id="career-first-name" label="Nome" value={draft.firstName} onChange={(value) => setDraft({ ...draft, firstName: value })} placeholder="Mario" maxLength={30} />
              <Field id="career-last-name" label="Cognome (facoltativo)" value={draft.lastName} onChange={(value) => setDraft({ ...draft, lastName: value })} placeholder="Rossi" maxLength={30} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Ruolo</p>
              <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Ruolo">
                {ROLE_OPTIONS.map((role) => {
                  const selected = draft.role === role.code;
                  return <button key={role.code} type="button" role="radio" aria-checked={selected}
                    aria-label={role.label}
                    tabIndex={selected || (!draft.role && role.code === roleCodes[0]) ? 0 : -1}
                    onClick={() => setDraft({ ...draft, role: role.code })}
                    onKeyDown={(event) => onRadioKeyDown(event, roleCodes, draft.role || roleCodes[0], (nextRole) => setDraft({ ...draft, role: nextRole }))}
                    className="min-h-[52px] rounded-xl px-1 text-xs font-bold"
                    title={role.label}
                    style={{ background: selected ? "var(--accent-grad)" : "rgba(255,255,255,.05)", color: selected ? "var(--accent-ink)" : "var(--text-dim)", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}` }}>
                    {role.shortLabel}
                  </button>;
                })}
              </div>
              {draft.role && <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>{roleFor(draft.role).label} · {roleFor(draft.role).department}</p>}
            </div>
            <div className="grid grid-cols-[94px_1fr] gap-3">
              <Field id="career-number" label="Numero" value={draft.shirtNumber} onChange={(value) => setDraft({ ...draft, shirtNumber: value })} type="number" inputMode="numeric" />
              <div><p className="mb-1.5 text-xs font-bold text-white">Piede preferito</p><div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Piede preferito">
                {feet.map((foot) => <button key={foot} type="button" role="radio" aria-checked={draft.preferredFoot === foot} tabIndex={draft.preferredFoot === foot ? 0 : -1}
                  onClick={() => setDraft({ ...draft, preferredFoot: foot })}
                  onKeyDown={(event) => onRadioKeyDown(event, feet, draft.preferredFoot, (preferredFoot) => setDraft({ ...draft, preferredFoot }))}
                  className="min-h-[46px] rounded-xl text-xs font-bold" style={{ background: draft.preferredFoot === foot ? "var(--accent-grad)" : "rgba(255,255,255,.05)", color: draft.preferredFoot === foot ? "var(--accent-ink)" : "var(--text-dim)", border: `1px solid ${draft.preferredFoot === foot ? "var(--accent)" : "var(--border)"}` }}>{foot === "left" ? "Sinistro" : foot === "right" ? "Destro" : "Entrambi"}</button>)}
              </div></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-5">
            <div><p className="text-sm font-bold text-white">Primo contratto</p><div className="mt-2 grid gap-2" role="radiogroup" aria-label="Tipo di partenza">
              <ChoiceCard selected={draft.startMode === "academy"} title="Offerte dal vivaio" description="Ricevi tre proposte a sorpresa adatte al tuo livello."
                onClick={() => setDraft({ ...draft, startMode: "academy", startingClubName: "" })}
                onKeyDown={(event) => onRadioKeyDown(event, startModes, draft.startMode, (startMode) => setDraft({ ...draft, startMode, startingClubName: startMode === "academy" ? "" : draft.startingClubName }))} />
              <ChoiceCard selected={draft.startMode === "freeAgent"} title="Scegli tu il club" description="Parti direttamente da una squadra della nazione selezionata."
                onClick={() => setDraft({ ...draft, startMode: "freeAgent" })}
                onKeyDown={(event) => onRadioKeyDown(event, startModes, draft.startMode, (startMode) => setDraft({ ...draft, startMode, startingClubName: startMode === "academy" ? "" : draft.startingClubName }))} />
            </div></div>
            {draft.startMode === "freeAgent" && (
              <div>
                <p id="career-club-label" className="mb-2 text-xs font-bold text-white">Club iniziale</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="career-club-label">
                  {availableClubs.map((club, index) => {
                    const selected = draft.startingClubName === club.name;
                    return (
                      <button
                        key={club.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${club.name}, valutazione ${club.rating}`}
                        tabIndex={selected || (!draft.startingClubName && index === 0) ? 0 : -1}
                        onClick={() => setDraft({ ...draft, startingClubName: club.name })}
                        onKeyDown={(event) => onRadioKeyDown(
                          event,
                          clubNames,
                          draft.startingClubName || clubNames[0] || "",
                          (startingClubName) => setDraft({ ...draft, startingClubName }),
                        )}
                        className="relative min-h-[104px] rounded-2xl px-2.5 py-3 text-center transition-colors active:scale-[.985]"
                        style={{
                          background: selected ? "color-mix(in srgb, var(--accent) 13%, var(--surface-2))" : "rgba(255,255,255,.045)",
                          border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        <span className="mx-auto block w-fit"><ClubCrest club={club} size={46} /></span>
                        <span className="mt-2 block min-h-8 text-xs font-bold leading-tight text-white">{club.name}</span>
                        <span className="mt-1 block text-[11px] font-semibold" style={{ color: selected ? "var(--accent-soft)" : "var(--text-dim)" }}>OVR {club.rating}</span>
                        {selected && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button type="button" role="switch" aria-checked={draft.agentEnabled} onClick={() => setDraft({ ...draft, agentEnabled: !draft.agentEnabled })}
              className="card-flat flex min-h-[72px] w-full items-center gap-3 p-3 text-left">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: "rgba(255,255,255,.06)" }} aria-hidden="true">🤝</span>
              <span className="min-w-0 flex-1"><strong className="block text-sm text-white">Agente trasferimenti</strong><span className="mt-0.5 block text-xs" style={{ color: "var(--text-dim)" }}>Se attivo, a fine stagione può portarti nuove offerte.</span></span>
              <span className="relative h-7 w-12 rounded-full transition-colors" style={{ background: draft.agentEnabled ? "var(--accent)" : "rgba(255,255,255,.16)" }}><span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-transform" style={{ left: 4, transform: draft.agentEnabled ? "translateX(20px)" : "none" }} /></span>
            </button>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => step === 1 ? onCancel() : setStep((step - 1) as SetupStep)} className="btn-soft min-h-12 flex-1 px-4 py-3 text-sm">{step === 1 ? "Annulla" : "Indietro"}</button>
          <button type="button" disabled={!canContinue || busy} onClick={() => step === 3 ? onSubmit() : setStep((step + 1) as SetupStep)} className="btn-primary min-h-12 flex-[1.4] px-4 py-3 text-sm">{busy ? "Salvataggio…" : step === 3 ? "Inizia carriera" : "Avanti"}</button>
        </div>
      </div>
    </main>
  );
}

function Field({ id, label, value, onChange, placeholder, maxLength, type = "text", inputMode }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength?: number; type?: string; inputMode?: "numeric" }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-bold text-white">{label}</label><input id={id} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} min={type === "number" ? 1 : undefined} max={type === "number" ? 99 : undefined} className="input min-h-12 w-full px-3 text-sm" /></div>;
}

function ChoiceCard({ selected, title, description, onClick, onKeyDown }: { selected: boolean; title: string; description: string; onClick: () => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void }) {
  return <button type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={onClick} onKeyDown={onKeyDown} className="min-h-[72px] rounded-2xl p-3 text-left" style={{ background: selected ? "color-mix(in srgb, var(--accent) 12%, var(--surface-2))" : "rgba(255,255,255,.045)", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}` }}><span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: `2px solid ${selected ? "var(--accent)" : "var(--text-faint)"}` }}>{selected && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />}</span><strong className="text-sm text-white">{title}</strong></span><span className="mt-1.5 block pl-7 text-xs" style={{ color: "var(--text-dim)" }}>{description}</span></button>;
}

function StartingOffers({ state, busy, onChoose }: { state: CareerState; busy: boolean; onChoose: (name: string) => void }) {
  return <main className="px-4 py-5"><div className="card-accent p-4"><p className="eyebrow">Inizio carriera · {state.seasonYear}</p><h2 className="font-display mt-2 text-xl font-bold text-white">Tre club credono in te</h2><p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>A {state.age} anni arriva il primo bivio. Confronta livello, ruolo previsto e contratto.</p></div><div className="mt-4 space-y-3">{state.pendingOffers.map((offer) => <OfferCard key={offer.id} offer={offer} busy={busy} label="Firma" onClick={() => onChoose(offer.clubName)} />)}</div><PlayerStrip state={state} /></main>;
}

function CareerTab({ state, busy, onReportClose, onResolveDecision, onContinueDecision, onSimulate, onAcceptTransfer, onDeclineTransfers, onReset }: {
  state: CareerState;
  busy: boolean;
  onReportClose: (seasonId: string) => void;
  onResolveDecision: (decisionId: string, optionId: string) => void;
  onContinueDecision: (decisionId: string) => void;
  onSimulate: (choice: TrainingChoice) => void;
  onAcceptTransfer: (name: string) => void;
  onDeclineTransfers: () => void;
  onReset: () => void;
}) {
  const viewState = state;
  const pendingReport = state.pendingSeasonReportId
    ? state.seasons.find((season) => season.id === state.pendingSeasonReportId)
    : undefined;

  if (pendingReport) {
    return (
      <main className="px-4 py-4 pb-8">
        <SeasonReport
          key={pendingReport.id}
          season={pendingReport}
          immersive={state.gameMode === "realistic"}
          busy={busy}
          onClose={() => onReportClose(pendingReport.id)}
        />
      </main>
    );
  }

  if (state.pendingSeasonReportId) {
    return (
      <main className="px-4 py-4 pb-8">
        <ReportRecoveryCard
          seasonId={state.pendingSeasonReportId}
          busy={busy}
          onContinue={onReportClose}
        />
      </main>
    );
  }

  if (state.lastDecisionResult) {
    return (
      <main className="px-4 py-4 pb-8">
        <DecisionResultPanel
          key={state.lastDecisionResult.id}
          result={state.lastDecisionResult}
          busy={busy}
          onContinue={onContinueDecision}
        />
      </main>
    );
  }

  if (state.pendingDecision) {
    return (
      <main className="px-4 py-4 pb-8">
        <DecisionPanel
          key={state.pendingDecision.id}
          decision={state.pendingDecision}
          busy={busy}
          onConfirm={onResolveDecision}
        />
      </main>
    );
  }

  return (
    <main className="px-4 py-4 pb-8 space-y-4">
      <PlayerHero state={state} />
      {viewState.activeCareerArc ? <CareerArcCard arc={viewState.activeCareerArc} /> : null}
      {state.stage === "retired" ? (
        <RetiredCard state={state} onReset={onReset} />
      ) : state.pendingOffers.length > 0 ? (
        <TransferPanel offers={state.pendingOffers} busy={busy} onAccept={onAcceptTransfer} onDecline={onDeclineTransfers} />
      ) : state.seasonPreparation ? (
        <SeasonReadyPanel state={state} preparation={state.seasonPreparation} busy={busy} onSimulate={onSimulate} />
      ) : (
        <FlowRecoveryCard />
      )}
      <EventFeed events={state.feed.slice(0, 6)} />
    </main>
  );
}

function PlayerHero({ state }: { state: CareerState }) {
  const viewState = state;
  const club = state.currentClub;
  const catalogClub = club ? getClubByName(club.name) : undefined;
  const displayClub = catalogClub ?? club;
  const country = countryFor(state.player.nationality);
  const role = roleFor(state.player.role);
  return <section className="relative overflow-hidden rounded-3xl p-5" aria-label="Scheda giocatore" style={{ background: displayClub ? `linear-gradient(145deg, ${displayClub.colors[0]}dd, #0b1220 70%)` : "var(--surface)", border: "1px solid rgba(255,255,255,.13)" }}>
    <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: displayClub?.colors[1] ?? "var(--accent)", opacity: .2 }} />
    <div className="relative flex items-start gap-4">
      <div className="relative flex h-20 w-20 flex-none items-center justify-center rounded-3xl" style={{ background: "rgba(5,10,20,.55)", border: "1px solid rgba(255,255,255,.16)" }}>
        {displayClub ? <ClubCrest club={displayClub} size={58} /> : <span className="font-display text-2xl font-extrabold text-white">{state.overall}</span>}
        {displayClub && <span className="absolute -bottom-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ background: "rgba(4,9,18,.92)", border: "1px solid rgba(255,255,255,.16)" }}>OVR {state.overall}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-dim)" }}><span>{country.flag}</span><span>#{state.player.shirtNumber}</span><span>{role.shortLabel}</span></div>
        <h2 className="font-display mt-1 truncate text-xl font-extrabold text-white">{state.player.displayName}</h2>
        <p className="mt-1 truncate text-sm font-semibold" style={{ color: "var(--accent-soft)" }}>{displayClub?.name ?? "Svincolato"}</p>
        <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-dim)" }}>{displayClub?.league}</p>
        {club ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip" aria-label={`Ruolo in squadra: ${squadRoleLabel(club.squadRole)}`}>{squadRoleLabel(club.squadRole)}</span>
            <span className="chip">{squadRoleStartRate(club.squadRole)}% dal 1′</span>
            {viewState.retirementPlan === "continueTo42" ? <span className="chip">Fino a 42 anni</span> : null}
          </div>
        ) : null}
      </div>
    </div>
    <div className="relative mt-5 grid grid-cols-4 gap-2"><HeroStat label="Età" value={String(state.age)} /><HeroStat label="Valore" value={formatMoney(state.marketValue)} /><HeroStat label="Forma" value={String(state.form)} /><HeroStat label="GOAT" value={String(state.goatScore)} /></div>
  </section>;
}

function CareerArcCard({ arc }: { arc: CareerArc }) {
  const progress = Math.max(0, Math.min(arc.progress, arc.target));
  const percentage = arc.target > 0 ? Math.round((progress / arc.target) * 100) : 0;
  return (
    <section className="card p-4" aria-label={`Svolta di carriera: ${arc.title}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Svolta in corso</p>
          <h3 className="font-display mt-1 truncate text-base font-bold text-white">{arc.title}</h3>
        </div>
        <strong className="flex-none text-sm" style={{ color: "var(--accent)" }}>{progress}/{arc.target}</strong>
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>{arc.description}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.07)" }} role="progressbar" aria-label={`Avanzamento ${arc.title}`} aria-valuemin={0} aria-valuemax={arc.target} aria-valuenow={progress}>
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: "var(--accent-grad)" }} />
      </div>
    </section>
  );
}

function DecisionPanel({ decision, busy, onConfirm }: {
  decision: CareerDecision;
  busy: boolean;
  onConfirm: (decisionId: string, optionId: string) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isRetirementChoice = decision.kind === "retirement";

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="space-y-3" aria-labelledby={`${decision.id}-title`} aria-busy={busy}>
      <div className="px-1 pb-1">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">{isRetirementChoice ? "Il momento della scelta" : decision.phase === "preSeason" ? "Inizio stagione" : "Fine stagione"}</p>
          <span className="chip">{seasonLabel(decision.seasonYear)}</span>
        </div>
        <h2 id={`${decision.id}-title`} ref={titleRef} tabIndex={-1} className="font-display mt-2 text-xl font-extrabold leading-tight text-white outline-none">{decision.title}</h2>
        {isRetirementChoice ? <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>A 40 anni decidi tu: chiudi qui oppure gioca fino a 42.</p> : null}
      </div>

      <fieldset disabled={busy}>
        <legend className="sr-only">Scegli una strategia</legend>
        <div className="space-y-2.5">
          {decision.options.map((option) => (
            <DecisionOptionCard
              key={option.id}
              option={option}
              busy={busy}
              onSelect={() => onConfirm(decision.id, option.id)}
            />
          ))}
        </div>
      </fieldset>
      {busy ? <p className="sr-only" role="status" aria-live="polite">La scelta viene salvata e l'esito viene calcolato.</p> : null}
    </section>
  );
}

function DecisionOptionCard({ option, busy, onSelect }: {
  option: CareerDecisionOption;
  busy: boolean;
  onSelect: () => void;
}) {
  const possibleOutcomes = option.probabilities.filter((item) => item.percentage > 0);
  const hasRisk = possibleOutcomes.length > 1;
  const certainEffect = possibleOutcomes.length === 1 ? primaryDecisionEffect(possibleOutcomes[0].effects) : null;
  return (
    <button type="button" disabled={busy} onClick={onSelect} className="card block min-h-12 w-full p-3.5 text-left transition-transform active:scale-[.99]">
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <strong className="block text-base text-white">{option.label}</strong>
          <span className="mt-1 block text-xs leading-snug" style={{ color: "var(--text-dim)" }}>{option.description}</span>
          {!hasRisk && certainEffect && certainEffect !== "Nessun cambio" ? <span className="mt-2 inline-flex text-xs font-bold" style={{ color: "var(--accent-soft)" }}>{certainEffect}</span> : null}
        </span>
        <span className="mt-1 text-lg" style={{ color: "var(--accent)" }} aria-hidden="true">›</span>
      </span>
      {hasRisk ? <div className="mt-3"><ProbabilityBreakdown probabilities={option.probabilities} /></div> : null}
    </button>
  );
}

function ProbabilityBreakdown({ probabilities }: { probabilities: CareerDecisionProbability[] }) {
  const possibleOutcomes = probabilities.filter((item) => item.percentage > 0);
  const isCertain = possibleOutcomes.length === 1 && possibleOutcomes[0]?.percentage === 100;
  if (isCertain) return null;
  return (
    <ul className="grid grid-cols-2 gap-1.5" aria-label="Possibili esiti">
      {possibleOutcomes.map((item) => {
        const effect = primaryDecisionEffect(item.effects);
        return (
          <li key={item.outcome} className="flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,.045)" }} aria-label={`${item.label}, ${item.percentage}%, ${effect}`}>
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: decisionOutcomeColor(item.outcome) }} aria-hidden="true" />
            <strong className="flex-none text-xs" style={{ color: decisionOutcomeColor(item.outcome) }}>{item.percentage}%</strong>
            <span className="min-w-0 truncate text-[11px] font-semibold text-white">· {effect}</span>
          </li>
        );
      })}
    </ul>
  );
}

function primaryDecisionEffect(effects: CareerDecisionEffects): string {
  if (effects.overall) return `${formatSigned(effects.overall)} OVR`;
  if (effects.potential) return `${formatSigned(effects.potential)} POT`;
  if (effects.squadRoleSteps) return effects.squadRoleSteps > 0 ? "Più titolare" : "Meno titolare";
  if (effects.offerInterest) return effects.offerInterest > 0 ? "Mercato ↑" : "Mercato ↓";
  if (effects.contractYears) return `${formatSigned(effects.contractYears)} anno contratto`;
  if (effects.form) return `${formatSigned(effects.form)} forma`;
  if (effects.reputation) return `${formatSigned(effects.reputation)} reputaz.`;
  if (effects.marketValuePercent) return `${formatSigned(effects.marketValuePercent)}% valore`;
  if (effects.seasonGrowth) return effects.seasonGrowth > 0 ? "Crescita ↑" : "Crescita ↓";
  if (effects.seasonPerformance) return effects.seasonPerformance > 0 ? "Rendimento ↑" : "Rendimento ↓";
  if (effects.injuryRiskPercent) return effects.injuryRiskPercent < 0 ? "Rischio ↓" : "Rischio ↑";
  return "Nessun cambio";
}

function DecisionResultPanel({ result, busy, onContinue }: {
  result: CareerDecisionResult;
  busy: boolean;
  onContinue: (decisionId: string) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const outcomeColor = decisionOutcomeColor(result.outcome);
  const isRetirementResult = result.optionId.endsWith("-ritirati") || result.optionId.endsWith("-continua");
  const continueLabel = result.optionId.endsWith("-ritirati")
    ? "Concludi la carriera"
    : result.optionId.endsWith("-continua")
      ? "Continua fino a 42 anni"
      : result.phase === "preSeason" ? "Prepara la stagione" : "Continua l'estate";

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="card-accent slide-up overflow-hidden" aria-labelledby={`${result.id}-title`} aria-busy={busy}>
      <div className="p-4" style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${outcomeColor} 15%, transparent), transparent)` }}>
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">{isRetirementResult ? "Scelta di ritiro" : result.phase === "preSeason" ? "Esito pre-stagione" : "Esito fine stagione"}</p>
          <span className="chip">{seasonLabel(result.seasonYear)}</span>
        </div>
        <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: `color-mix(in srgb, ${outcomeColor} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${outcomeColor} 42%, transparent)` }} aria-hidden="true">
          {decisionOutcomeIcon(result.outcome)}
        </div>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-[.14em]" style={{ color: outcomeColor }} role="status" aria-live="polite">{result.outcomeLabel} · {result.probability}%</p>
        <h2 id={`${result.id}-title`} ref={titleRef} tabIndex={-1} className="font-display mt-1 text-2xl font-extrabold leading-tight text-white outline-none">{result.title}</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>{result.description}</p>
        <DecisionEffectChips effects={result.effects} />

        <button type="button" disabled={busy} onClick={() => onContinue(result.decisionId)} className="btn-primary mt-4 min-h-12 w-full px-4 py-3 text-sm">
          {busy ? "Salvataggio…" : continueLabel}
        </button>
      </div>
    </section>
  );
}

function DecisionEffectChips({ effects }: { effects: CareerDecisionEffects }) {
  const items = decisionEffectItems(effects);
  if (items.length === 0) return <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>Nessuna variazione immediata.</p>;
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Effetti applicati">
      {items.slice(0, 3).map((item) => (
        <li key={item.label} className="chip" style={{ color: item.good ? "#86efac" : "#fda4af" }}>
          {item.label} {formatSigned(item.value)}{item.suffix}
        </li>
      ))}
    </ul>
  );
}

function SeasonReadyPanel({ state, preparation, busy, onSimulate }: {
  state: CareerState;
  preparation: CareerSeasonPreparation;
  busy: boolean;
  onSimulate: (choice: TrainingChoice) => void;
}) {
  const training = TRAINING_OPTIONS.find((item) => item.code === preparation.trainingChoice);
  const projectedRole = getProjectedSquadRole(state, preparation.squadRoleSteps);
  return (
    <section className="card-accent p-4" aria-labelledby="season-ready-title" aria-busy={busy}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Stagione pronta</p>
        <span className="chip">{seasonLabel(state.seasonYear)}</span>
      </div>
      <h3 id="season-ready-title" className="font-display mt-2 text-xl font-extrabold text-white">È il momento di scendere in campo</h3>
      <div className="card-flat mt-3 flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <span className="block text-xs" style={{ color: "var(--text-dim)" }}>Piano scelto</span>
          <strong className="mt-0.5 block truncate text-sm text-white">{training?.label ?? preparation.trainingChoice}</strong>
        </div>
        {projectedRole ? <div className="flex-none text-right"><span className="block text-xs" style={{ color: "var(--text-dim)" }}>Titolarità prevista</span><strong className="mt-0.5 block text-sm text-white">{squadRoleLabel(projectedRole)} · {squadRoleStartRate(projectedRole)}%</strong></div> : null}
      </div>
      <button type="button" disabled={busy} onClick={() => onSimulate(preparation.trainingChoice)} className="btn-primary mt-3 min-h-12 w-full px-4 py-3 text-sm">
        {busy ? "Simulazione della stagione…" : "Simula la stagione"}
      </button>
      {busy ? <p className="sr-only" role="status" aria-live="polite">Simulazione e salvataggio della stagione in corso.</p> : null}
    </section>
  );
}

function FlowRecoveryCard() {
  return (
    <section className="card p-4" role="status">
      <p className="eyebrow">Sincronizzazione carriera</p>
      <h3 className="font-display mt-1 text-lg font-bold text-white">Prepariamo la prossima scelta</h3>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>Aggiorna la schermata tra un istante. I progressi già salvati non andranno persi.</p>
    </section>
  );
}

function ReportRecoveryCard({ seasonId, busy, onContinue }: { seasonId: string; busy: boolean; onContinue: (seasonId: string) => void }) {
  return (
    <section className="card-accent p-5 text-center" role="alert">
      <span className="text-4xl" aria-hidden="true">📋</span>
      <h2 className="font-display mt-3 text-xl font-extrabold text-white">Report già salvato</h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>Il riepilogo non è più disponibile, ma la stagione è al sicuro nell'archivio.</p>
      <button type="button" disabled={busy} onClick={() => onContinue(seasonId)} className="btn-primary mt-4 min-h-12 w-full px-4 py-3 text-sm">{busy ? "Salvataggio…" : "Continua"}</button>
    </section>
  );
}

function SeasonReport({ season, immersive, busy, onClose }: { season: CareerSeason; immersive: boolean; busy: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const maxStep = immersive ? 2 : 0;
  const club = getClubByName(season.clubName);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return <section className="card-accent slide-up overflow-hidden" aria-labelledby={`${season.id}-report-title`} aria-busy={busy}><div className="p-4" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent)" }}><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><ClubCrest club={club} clubName={season.clubName} size={48} /><div className="min-w-0"><p className="eyebrow">Report stagione</p><h3 id={`${season.id}-report-title`} ref={titleRef} tabIndex={-1} className="font-display mt-1 truncate text-lg font-extrabold text-white outline-none">{season.label} · {club?.name ?? season.clubName}</h3></div></div><div className="flex-none rounded-2xl px-3 py-2 text-center" style={{ background: "rgba(0,0,0,.24)" }}><span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>Media</span><strong className="font-display text-xl text-white">{season.averageRating.toFixed(2)}</strong></div></div>
      <p className="sr-only" role="status" aria-live="polite">Passaggio {Math.min(step, maxStep) + 1} di {maxStep + 1} del report.</p>
      {(step === 0 || !immersive) && <div className="mt-4 grid grid-cols-4 gap-2"><HeroStat label="Pres." value={String(season.appearances)} /><HeroStat label="Titolare" value={String(season.starts)} /><HeroStat label="Gol" value={String(season.goals)} /><HeroStat label="Media" value={season.averageRating.toFixed(2)} /></div>}
      {(step >= 1 || !immersive) && <div className="mt-4 card-flat p-3"><div className="grid grid-cols-3 gap-2 text-center"><SmallInfo label="Campionato" value={`${season.leaguePosition}°`} /><SmallInfo label="Coppa" value={season.cupResult} /><SmallInfo label="OVR" value={`${season.overallStart}→${season.overallEnd}`} /></div></div>}
      {(step >= 2 || !immersive) && <div className="mt-4 space-y-2">{season.nationalCompetition ? <div className="card-flat flex items-center justify-between gap-3 px-3 py-2.5"><span className="text-xs" style={{ color: "var(--text-dim)" }}>{season.nationalCompetition}</span><strong className="text-xs text-white">{season.nationalResult ?? "Convocato"}</strong></div> : null}{[...season.trophies, ...season.awards].length > 0 ? <div className="flex flex-wrap gap-2">{season.trophies.map((item) => <span key={item} className="chip">🏆 {item}</span>)}{season.awards.map((item) => <span key={item} className="chip">⭐ {item}</span>)}</div> : <p className="text-xs" style={{ color: "var(--text-dim)" }}>Nessun trofeo, ma ogni stagione costruisce la carriera.</p>}{season.events.map((event) => <p key={event.id} className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}><strong className="text-white">{event.title}.</strong> {event.description}</p>)}</div>}
      <button type="button" disabled={busy} onClick={step < maxStep ? () => setStep((value) => value + 1) : onClose} className="btn-primary mt-5 min-h-12 w-full px-4 py-3 text-sm">{busy ? "Salvataggio…" : step < maxStep ? "Continua" : season.retiredAfterSeason ? "Guarda la carriera" : "Scelte di fine stagione"}</button>
    </div></section>;
}

function TransferPanel({ offers, busy, onAccept, onDecline }: { offers: CareerOffer[]; busy: boolean; onAccept: (name: string) => void; onDecline: () => void }) {
  return <section><div className="px-1"><p className="eyebrow">Mercato estivo</p><h3 className="font-display mt-1 text-lg font-bold text-white">Il tuo agente ha delle offerte</h3></div><div className="mt-3 space-y-2">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} busy={busy} label="Accetta" onClick={() => onAccept(offer.clubName)} />)}</div><button type="button" disabled={busy} onClick={onDecline} className="btn-soft mt-3 min-h-12 w-full px-4 py-3 text-sm">Resta nel club attuale</button></section>;
}

function OfferCard({ offer, busy, label, onClick }: { offer: CareerOffer; busy: boolean; label: string; onClick: () => void }) {
  const country = countryFor(offer.country);
  const club = getClubByName(offer.clubName);
  return <article className="card p-4"><div className="flex items-start gap-3"><ClubCrest club={club} clubName={offer.clubName} size={48} /><div className="min-w-0 flex-1"><h3 className="font-display truncate text-base font-bold text-white">{club?.name ?? offer.clubName}</h3><p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-dim)" }}>{country.flag} {offer.league} · OVR {offer.clubRating}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="chip">{squadRoleLabel(offer.squadRole)} · {squadRoleStartRate(offer.squadRole)}% dal 1′</span><span className="chip">{offer.contractYears} anni</span><span className="chip">Interesse {offer.interest}%</span></div></div></div><p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>{offer.message}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs" style={{ color: "var(--text-faint)" }}>Ingaggio {formatMoney(offer.annualSalary)}/anno</span><button type="button" disabled={busy} onClick={onClick} className="btn-primary min-h-11 px-5 py-2.5 text-sm">{label}</button></div></article>;
}

function StatsTab({ state, onReset }: { state: CareerState; onReset: () => void }) {
  const viewState = state;
  const isKeeper = state.player.role === "GK";
  const ownRanking = viewState.nationalRanking?.find((entry) => entry.country === state.player.nationality);
  return <main className="px-4 py-4 pb-8 space-y-4"><section className="card p-4"><div className="flex items-center justify-between"><div><p className="eyebrow">Numeri totali</p><h2 className="font-display mt-1 text-lg font-bold text-white">{state.player.displayName}</h2></div><div className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{state.goatScore}</div></div><div className="mt-4 grid grid-cols-3 gap-2"><BigStat label="Presenze" value={state.totals.appearances} /><BigStat label={isKeeper ? "Parate" : "Gol"} value={isKeeper ? state.totals.saves : state.totals.goals} /><BigStat label={isKeeper ? "Clean sheet" : "Assist"} value={isKeeper ? state.totals.cleanSheets : state.totals.assists} /><BigStat label="Da titolare" value={state.totals.starts} /><BigStat label={isKeeper ? "Porte inviolate" : "Passaggi chiave"} value={isKeeper ? state.totals.cleanSheets : state.totals.keyPasses} /><BigStat label="MVP" value={state.totals.playerOfTheMatch} /></div></section>
    <section className="card p-4"><p className="eyebrow">Livello attuale</p><div className="mt-3 grid grid-cols-4 gap-2"><HeroStat label="OVR" value={String(state.overall)} /><HeroStat label="Potenziale" value={String(state.potential)} /><HeroStat label="Reputaz." value={String(state.reputation)} /><HeroStat label="Forma" value={String(state.form)} /></div></section>
    <section className="card p-4"><div className="flex items-center justify-between gap-3"><p className="eyebrow">Nazionale {countryFor(state.player.nationality).flag}</p>{ownRanking ? <span className="chip">#{ownRanking.rank} al mondo</span> : null}</div><div className="mt-3 grid grid-cols-4 gap-2"><HeroStat label="Presenze" value={String(state.nationalTeam.caps)} /><HeroStat label="Gol" value={String(state.nationalTeam.goals)} /><HeroStat label="Assist" value={String(state.nationalTeam.assists)} /><HeroStat label="Trofei" value={String(state.nationalTeam.trophies)} /></div></section>
    {viewState.nationalRanking?.length ? <NationalRankingCard ranking={viewState.nationalRanking} playerCountry={state.player.nationality} /> : null}
    <Cabinet title="Trofei di squadra" empty="Nessun trofeo ancora." items={state.trophyCabinet.map((item) => ({ name: item.name, count: item.count }))} />
    <Cabinet title="Premi individuali" empty="Nessun premio ancora." items={state.awardCabinet.map((item) => ({ name: item.name, count: item.count }))} />
    <button type="button" onClick={onReset} className="btn-danger-soft min-h-12 w-full px-4 py-3 text-sm">Archivia e ricomincia</button>
  </main>;
}

function NationalRankingCard({ ranking, playerCountry }: { ranking: NationalRankingEntry[]; playerCountry: CountryCode }) {
  const sorted = [...ranking].sort((a, b) => a.rank - b.rank);
  const own = sorted.find((entry) => entry.country === playerCountry);
  const visible = sorted.slice(0, 5);
  if (own && !visible.some((entry) => entry.country === own.country)) visible.push(own);
  const hidden = sorted.filter((entry) => !visible.some((item) => item.country === entry.country));

  return (
    <section className="card overflow-hidden" aria-labelledby="national-ranking-title">
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <div><p className="eyebrow">Mondo nazionali</p><h3 id="national-ranking-title" className="font-display mt-1 text-lg font-bold text-white">Ranking live</h3></div>
        <span className="chip">{sorted.length} nazionali</span>
      </div>
      <ol className="px-2 pb-2">{visible.map((entry) => <NationalRankingRow key={entry.country} entry={entry} own={entry.country === playerCountry} />)}</ol>
      {hidden.length > 0 ? (
        <details style={{ borderTop: "1px solid var(--border)" }}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center px-4 text-xs font-bold" style={{ color: "var(--accent-soft)" }}>Classifica completa</summary>
          <ol className="px-2 pb-2">{hidden.map((entry) => <NationalRankingRow key={entry.country} entry={entry} own={false} />)}</ol>
        </details>
      ) : null}
    </section>
  );
}

function NationalRankingRow({ entry, own }: { entry: NationalRankingEntry; own: boolean }) {
  const trendLabel = entry.trend === "up" ? `sale dal ${entry.previousRank}° posto` : entry.trend === "down" ? `scende dal ${entry.previousRank}° posto` : "posizione stabile";
  return (
    <li className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2" aria-current={own ? "true" : undefined} style={{ background: own ? "color-mix(in srgb, var(--accent) 12%, transparent)" : undefined }}>
      <strong className="w-6 flex-none text-center text-sm text-white">{entry.rank}</strong>
      <span className="text-lg" aria-hidden="true">{entry.flag}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{entry.name}</span>
      <span className="flex flex-none gap-1" aria-label={`Forma: ${entry.form.map(nationalFormLabel).join(", ") || "nessun dato"}`}>{entry.form.slice(-3).map((result, index) => <span key={`${result}-${index}`} className="h-2 w-2 rounded-full" style={{ background: nationalFormColor(result) }} aria-hidden="true" />)}</span>
      <span className="w-11 flex-none text-right"><strong className="block text-xs text-white">{Math.round(entry.points)}</strong><span className="block text-[10px]" style={{ color: nationalTrendColor(entry.trend) }} aria-label={trendLabel}>{nationalTrendIcon(entry.trend)}</span></span>
    </li>
  );
}

function ArchiveTab({ hub, state }: { hub: CareerHub; state: CareerState }) {
  const viewState = state;
  const completedCareers = [...hub.archivedCareers];
  if (state.stage === "retired" && hub.career && !completedCareers.some((record) => record.id === hub.career?.id)) completedCareers.unshift(hub.career);
  const arcs = (viewState.careerArcHistory ?? []).filter((arc) => arc.status !== "active");
  const rankedSeasons = hub.seasons.filter((season) => typeof season.nationalTeamRank === "number").slice(0, 6);

  return <main className="space-y-5 px-4 py-4 pb-8">
    <ArchivedCareerShelf records={completedCareers} empty />

    {arcs.length > 0 ? <CareerArcHistory arcs={arcs} /> : null}
    {rankedSeasons.length > 0 ? <NationalRankingHistory seasons={rankedSeasons} /> : null}

    <section aria-labelledby="season-archive-title">
      <div className="mb-3 px-1"><p className="eyebrow">Carriera attuale</p><h2 id="season-archive-title" className="font-display mt-1 text-lg font-bold text-white">Stagioni</h2></div>
      {hub.seasons.length === 0
        ? <EmptyState icon="📚" title="Nessuna stagione" body="Completa la prima stagione per iniziare a scrivere la tua storia." />
        : <div className="space-y-3">{hub.seasons.map((season) => {
          const viewSeason = season;
          const club = getClubByName(season.clubName);
          return <article key={season.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ClubCrest club={club} clubName={season.clubName} size={44} />
                <div className="min-w-0"><p className="eyebrow">{season.label} · Età {season.age}</p><h3 className="font-display mt-1 truncate text-base font-bold text-white">{club?.name ?? season.clubName}</h3><p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-dim)" }}>{squadRoleLabel(season.squadRole)} · {season.starts}/{season.appearances} dal 1′</p></div>
              </div>
              <div className="flex-none rounded-xl px-2.5 py-2 text-center" style={{ background: "rgba(255,255,255,.055)" }}><span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>OVR</span><strong className="text-white">{season.overallEnd}</strong></div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2"><HeroStat label="Pres." value={String(season.appearances)} /><HeroStat label="Gol" value={String(season.goals)} /><HeroStat label="Assist" value={String(season.assists)} /><HeroStat label="Media" value={season.averageRating.toFixed(2)} /></div>
            {(viewSeason.nationalTeamRank || viewSeason.nationalCompetition || [...season.trophies, ...season.awards].length > 0) ? <div className="mt-3 flex flex-wrap gap-1.5">{viewSeason.nationalTeamRank ? <span className="chip">🌍 Nazionale #{viewSeason.nationalTeamRank}</span> : null}{viewSeason.nationalCompetition ? <span className="chip">{viewSeason.nationalCompetition} · {viewSeason.nationalResult ?? "Convocato"}</span> : null}{season.trophies.map((item) => <span key={item} className="chip">🏆 {item}</span>)}{season.awards.map((item) => <span key={item} className="chip">⭐ {item}</span>)}</div> : null}
          </article>;
        })}</div>}
    </section>
  </main>;
}

function ArchivedCareerShelf({ records, empty = false }: { records: CareerRecord[]; empty?: boolean }) {
  return <section className={empty ? undefined : "px-4 pb-6"} aria-labelledby="career-archive-title"><div className="mb-3 flex items-end justify-between gap-3 px-1"><div><p className="eyebrow">Le tue storie</p><h2 id="career-archive-title" className="font-display mt-1 text-lg font-bold text-white">Carriere archiviate</h2></div><span className="chip">{records.length}</span></div>{records.length > 0 ? <div className="space-y-2">{records.map((record) => <ArchivedCareerCard key={record.id} record={record} />)}</div> : <div className="card-flat p-4"><p className="text-sm font-semibold text-white">Ancora nessuna</p><p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>Quando ricominci, la carriera attuale resterà qui.</p></div>}</section>;
}

function ArchivedCareerCard({ record }: { record: CareerRecord }) {
  const state = record.state;
  const club = state.currentClub ? getClubByName(state.currentClub.name) : undefined;
  const trophies = state.trophyCabinet.reduce((sum, item) => sum + item.count, 0) + state.nationalTeam.trophies;
  const completed = state.stage === "retired";
  const clubs = [...new Set([
    ...state.seasons.map((season) => season.clubName),
    ...(state.currentClub ? [state.currentClub.name] : []),
  ])];
  const peakOverall = Math.max(state.overall, ...state.seasons.map((season) => season.overallEnd));
  return <details className="card overflow-hidden">
    <summary className="flex min-h-[88px] cursor-pointer list-none items-center gap-3 p-3.5">
      <ClubCrest club={club} clubName={state.currentClub?.name} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><h3 className="font-display truncate text-base font-bold text-white">{state.player.displayName}</h3><span className="chip">{completed ? "Conclusa" : "Interrotta"}</span></div>
        <p className="mt-1 truncate text-xs" style={{ color: "var(--text-dim)" }}>{state.seasons.length} stagioni · {completed ? "ritiro" : "stop"} a {state.retiredAtAge ?? state.age} anni</p>
        <p className="mt-1 text-xs font-semibold" style={{ color: "var(--accent-soft)" }}>{state.goatScore} GOAT · {trophies} trofei</p>
      </div>
      <span className="text-lg" style={{ color: "var(--accent)" }} aria-hidden="true">⌄</span>
    </summary>
    <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
      <div className="grid grid-cols-4 gap-2"><HeroStat label="OVR max" value={String(peakOverall)} /><HeroStat label="Pres." value={String(state.totals.appearances)} /><HeroStat label="Gol" value={String(state.totals.goals)} /><HeroStat label="Nazionale" value={String(state.nationalTeam.caps)} /></div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}><strong className="text-white">Percorso:</strong> {clubs.length > 0 ? clubs.join(" → ") : state.currentClub?.name ?? "Nessun club"}</p>
    </div>
  </details>;
}

function CareerArcHistory({ arcs }: { arcs: CareerArc[] }) {
  return <section aria-labelledby="career-arcs-title"><div className="mb-3 px-1"><p className="eyebrow">Momenti chiave</p><h2 id="career-arcs-title" className="font-display mt-1 text-lg font-bold text-white">Svolte di carriera</h2></div><div className="card overflow-hidden">{arcs.map((arc, index) => <article key={arc.id} className="flex min-h-14 items-center gap-3 p-3" style={{ borderTop: index ? "1px solid var(--border)" : undefined }}><span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl" style={{ background: arc.status === "completed" ? "rgba(52,211,153,.12)" : "rgba(251,113,133,.12)" }} aria-hidden="true">{arc.status === "completed" ? "✓" : "↘"}</span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-white">{arc.title}</h3><p className="mt-0.5 text-xs" style={{ color: "var(--text-dim)" }}>{arc.status === "completed" ? "Completata" : "Conclusa"} · {arc.progress}/{arc.target}</p></div></article>)}</div></section>;
}

function NationalRankingHistory({ seasons }: { seasons: CareerSeason[] }) {
  return <section aria-labelledby="ranking-history-title"><div className="mb-3 px-1"><p className="eyebrow">Nazionale</p><h2 id="ranking-history-title" className="font-display mt-1 text-lg font-bold text-white">Storico ranking</h2></div><div className="grid grid-cols-3 gap-2">{seasons.map((season) => <div key={season.id} className="card-flat p-3 text-center"><span className="block truncate text-[11px]" style={{ color: "var(--text-dim)" }}>{season.label}</span><strong className="font-display mt-1 block text-lg text-white">#{season.nationalTeamRank}</strong>{season.nationalTeamRankChange ? <span className="mt-0.5 block text-[10px]" style={{ color: season.nationalTeamRankChange > 0 ? "#34d399" : "#fb7185" }}>{season.nationalTeamRankChange > 0 ? "↑" : "↓"}{Math.abs(season.nationalTeamRankChange)}</span> : <span className="mt-0.5 block text-[10px]" style={{ color: "var(--text-faint)" }}>—</span>}</div>)}</div></section>;
}

function EventFeed({ events }: { events: CareerEvent[] }) {
  if (events.length === 0) return null;
  return <section><p className="eyebrow mb-3 px-1">Diario carriera</p><div className="card overflow-hidden">{events.map((event, index) => <article key={event.id} className="flex gap-3 p-3" style={{ borderTop: index ? "1px solid var(--border)" : undefined }}><span className="mt-1 h-2.5 w-2.5 flex-none rounded-full" style={{ background: event.tone === "negative" ? "#f87171" : event.tone === "special" ? "#fbbf24" : event.tone === "positive" ? "#34d399" : "var(--text-faint)" }} /><div><h3 className="text-sm font-bold text-white">{event.title}</h3><p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>{event.description}</p></div></article>)}</div></section>;
}

function RetiredCard({ state, onReset }: { state: CareerState; onReset: () => void }) {
  const trophies = state.trophyCabinet.reduce((sum, item) => sum + item.count, 0) + state.nationalTeam.trophies;
  return <section className="card-accent p-5 text-center"><span className="text-5xl" aria-hidden="true">🏟️</span><p className="eyebrow mt-4">Fine carriera</p><h3 className="font-display mt-1 text-2xl font-extrabold text-white">Una storia da {state.goatScore} punti</h3><p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>{state.player.displayName} si ritira a {state.retiredAtAge ?? state.age} anni dopo {state.seasons.length} stagioni e {trophies} trofei.</p><button type="button" onClick={onReset} className="btn-primary mt-5 min-h-12 w-full px-4 py-3 text-sm">Archivia e crea una nuova carriera</button></section>;
}

function Cabinet({ title, empty, items }: { title: string; empty: string; items: { name: string; count: number }[] }) {
  return <section className="card p-4"><p className="eyebrow">{title}</p>{items.length === 0 ? <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>{empty}</p> : <div className="mt-3 space-y-2">{items.map((item) => <div key={item.name} className="card-flat flex items-center gap-3 px-3 py-2.5"><span aria-hidden="true">🏆</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{item.name}</span><strong style={{ color: "var(--accent)" }}>×{item.count}</strong></div>)}</div>}</section>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl p-3" role="alert" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(248,113,113,.25)" }}><p className="min-w-0 flex-1 text-xs leading-relaxed text-red-200">{message}</p><button type="button" onClick={onRetry} className="btn-soft min-h-11 px-3 text-xs">Riprova</button></div>;
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <div className="py-16 text-center"><span className="text-5xl" aria-hidden="true">{icon}</span><h2 className="font-display mt-4 text-lg font-bold text-white">{title}</h2><p className="mx-auto mt-1.5 max-w-xs text-sm" style={{ color: "var(--text-dim)" }}>{body}</p></div>;
}

function PlayerStrip({ state }: { state: CareerState }) {
  const club = state.currentClub ? (getClubByName(state.currentClub.name) ?? state.currentClub) : undefined;
  return <div className="card-flat mt-4 flex items-center gap-3 p-3">{club ? <ClubCrest club={club} size={48} /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg font-extrabold" style={{ background: "var(--accent-grad)", color: "var(--accent-ink)" }}>{state.overall}</div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{state.player.displayName}</p><p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-dim)" }}>{club ? `${club.name} · ` : ""}#{state.player.shirtNumber} · {roleFor(state.player.role).label} · {state.age} anni</p></div><strong className="text-xs" style={{ color: "var(--accent-soft)" }}>{formatMoney(state.marketValue)}</strong></div>;
}

function ClubCrest({ club, clubName, size = 48 }: { club?: ClubDefinition | null; clubName?: string; size?: number }) {
  const resolvedClub = club ?? (clubName ? getClubByName(clubName) : undefined);
  const name = (resolvedClub?.name ?? clubName?.trim()) || "Club";
  const crestUrl = resolvedClub?.crestUrl;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!crestUrl && failedUrl !== crestUrl;
  const colors = resolvedClub?.colors ?? ["#1b260b", "#b7f34a"] as const;

  return (
    <span
      className="relative inline-flex flex-none items-center justify-center overflow-hidden rounded-2xl"
      role="img"
      aria-label={`Stemma ${name}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})`,
        border: "1px solid rgba(255,255,255,.16)",
      }}
    >
      {showImage ? (
        <Image
          src={crestUrl}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          unoptimized
          className="h-full w-full object-contain p-1"
          onError={() => setFailedUrl(crestUrl)}
        />
      ) : (
        <span className="font-display text-xs font-extrabold tracking-tight text-white" aria-hidden="true">{clubInitials(name)}</span>
      )}
    </span>
  );
}

function ClubDataCredit() {
  return (
    <aside className="mx-4 mb-5 mt-1 text-center text-xs leading-relaxed" style={{ color: "var(--text-dim)" }} aria-label="Fonti dei dati dei club">
      Data provided by <a href="https://www.football-data.org/" target="_blank" rel="noreferrer" aria-label="football-data.org, apre una nuova scheda" className="underline underline-offset-2">football-data.org</a>
      {" · "}Alcuni stemmi <a href="https://www.espn.com/soccer/" target="_blank" rel="noreferrer" aria-label="ESPN Calcio, apre una nuova scheda" className="underline underline-offset-2">ESPN</a>
      {" · "}Nomi e marchi appartengono ai rispettivi club.
    </aside>
  );
}

function GoatPill({ score }: { score: number }) {
  return <div className="rounded-2xl px-3 py-2 text-right" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}><span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>GOAT</span><strong className="font-display block text-lg leading-none" style={{ color: "var(--accent)" }}>{score}</strong></div>;
}

function HeroStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl px-1.5 py-2 text-center" style={{ background: "rgba(4,9,18,.32)", border: "1px solid rgba(255,255,255,.07)" }}><span className="block truncate text-[11px]" style={{ color: "var(--text-dim)" }}>{label}</span><strong className="mt-0.5 block truncate text-sm text-white">{value}</strong></div>; }
function BigStat({ label, value }: { label: string; value: number }) { return <div className="card-flat p-3 text-center"><strong className="font-display block text-xl text-white">{value}</strong><span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-dim)" }}>{label}</span></div>; }
function SmallInfo({ label, value }: { label: string; value: string }) { return <div><span className="block text-[11px]" style={{ color: "var(--text-faint)" }}>{label}</span><strong className="mt-0.5 block truncate text-xs text-white">{value}</strong></div>; }

function clubInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] ?? "FC").slice(0, 2).toLocaleUpperCase("it");
  return `${words[0]?.[0] ?? ""}${words[words.length - 1]?.[0] ?? ""}`.toLocaleUpperCase("it");
}

function seasonLabel(year: number) {
  return `${year}/${String(year + 1).slice(-2)}`;
}

function decisionOutcomeColor(outcome: CareerDecisionProbability["outcome"]) {
  if (outcome === "greatSuccess") return "#34d399";
  if (outcome === "success") return "var(--accent)";
  if (outcome === "neutral") return "#94a3b8";
  return "#fb7185";
}

function decisionOutcomeIcon(outcome: CareerDecisionProbability["outcome"]) {
  if (outcome === "greatSuccess") return "🏆";
  if (outcome === "success") return "✓";
  if (outcome === "neutral") return "≈";
  return "↘";
}

interface DecisionEffectItem {
  label: string;
  value: number;
  suffix: string;
  good: boolean;
}

function decisionEffectItems(effects: CareerDecisionEffects): DecisionEffectItem[] {
  return [
    { label: "OVR", value: effects.overall, suffix: "", good: effects.overall > 0 },
    { label: "Potenziale", value: effects.potential, suffix: "", good: effects.potential > 0 },
    { label: "Reputazione", value: effects.reputation, suffix: "", good: effects.reputation > 0 },
    { label: "Forma", value: effects.form, suffix: "", good: effects.form > 0 },
    { label: "Valore", value: effects.marketValuePercent, suffix: "%", good: effects.marketValuePercent > 0 },
    { label: "Titolarità", value: effects.squadRoleSteps, suffix: "", good: effects.squadRoleSteps > 0 },
    { label: "Rendimento", value: effects.seasonPerformance * 100, suffix: "%", good: effects.seasonPerformance > 0 },
    { label: "Crescita", value: effects.seasonGrowth, suffix: "", good: effects.seasonGrowth > 0 },
    { label: "Rischio fisico", value: effects.injuryRiskPercent, suffix: "%", good: effects.injuryRiskPercent < 0 },
    { label: "Interesse club", value: effects.offerInterest, suffix: "", good: effects.offerInterest > 0 },
    { label: "Contratto", value: effects.contractYears, suffix: effects.contractYears === 1 ? " anno" : " anni", good: effects.contractYears > 0 },
  ].filter((item) => item.value !== 0);
}

function formatSigned(value: number) {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".0", "");
  return value > 0 ? `+${rounded}` : rounded;
}

function onRadioKeyDown<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  values: T[],
  current: T,
  onSelect: (value: T) => void,
) {
  const currentIndex = Math.max(0, values.indexOf(current));
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % values.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + values.length) % values.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = values.length - 1;
  else return;

  event.preventDefault();
  const group = event.currentTarget.closest('[role="radiogroup"]');
  onSelect(values[nextIndex]);
  requestAnimationFrame(() => group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus());
}

function countryFor(code: CountryCode) { return COUNTRY_OPTIONS.find((country) => country.code === code) ?? COUNTRY_OPTIONS[0]; }
function roleFor(code: Role) { return ROLE_OPTIONS.find((role) => role.code === code) ?? ROLE_OPTIONS[0]; }
function squadRoleLabel(role: CareerOffer["squadRole"]) { return role === "star" ? "Stella" : role === "starter" ? "Titolare" : role === "rotation" ? "Rotazione" : "Prospetto"; }
function squadRoleStartRate(role: CareerOffer["squadRole"]) { return role === "star" ? 91 : role === "starter" ? 78 : role === "rotation" ? 50 : 24; }
function nationalTrendIcon(trend: NationalRankingTrend) { return trend === "up" ? "▲" : trend === "down" ? "▼" : "—"; }
function nationalTrendColor(trend: NationalRankingTrend) { return trend === "up" ? "#34d399" : trend === "down" ? "#fb7185" : "var(--text-faint)"; }
function nationalFormColor(result: number) {
  if (result > 0) return "#34d399";
  if (result < 0) return "#fb7185";
  return "#94a3b8";
}
function nationalFormLabel(result: number) { return result > 0 ? "vittoria" : result < 0 ? "sconfitta" : "pareggio"; }
function formatMoney(value: number) { if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`; if (value >= 1_000) return `€${Math.round(value / 1_000)}K`; return `€${value}`; }
