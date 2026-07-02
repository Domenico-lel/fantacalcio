"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchFeed, createPost, uploadPostImage, toggleLike, addComment, deletePost, updatePostTag,
  fetchListings, createListing, setListingStatus, deleteListing,
  type FeedPost, type Listing, type Viewer,
} from "@/app/social-actions";
import { ADMIN_POST_TAGS } from "@/lib/post-tags";
import { BADGES, BADGE_MAP } from "@/lib/badges";
import BadgeRow from "@/components/Badges";
import {
  fetchTeams, syncTeams, uploadTeamLogo, fetchRoster,
  addRosterPlayer, deleteRosterPlayer, searchPlayers,
  adminListProfiles, adminUpdateProfile, adminReleaseTeam, adminAssignTeam, adminDeleteProfile, adminSetProfileBadges, adminSetTeamCapacity,
  type Team, type RosterPlayer, type AdminProfile, type PlayerHit,
} from "@/app/teams-actions";
import { isAppOpen, setAppOpen } from "@/app/release-actions";
import { isImageAvatar } from "@/lib/avatar";
import PageHeader from "@/components/PageHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import TabPanel from "@/components/TabPanel";
import { useConfirm, useToast } from "@/components/Dialog";
import { useRegisterRefresh } from "@/components/PullToRefresh";

type TabKey = "scoop" | "cedibili" | "gestione";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g`;
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/* Mostra un logo (URL immagine) oppure un'emoji */
function Avatar({ src, size }: { src: string; size: number }) {
  if (isImageAvatar(src)) {
    return <img src={src} alt="" className="rounded-full object-cover flex-none" style={{ width: size, height: size }} />;
  }
  return <span className="flex-none leading-none" style={{ fontSize: size * 0.85 }}>{src}</span>;
}

/* Metadati dei tag (solo l'admin può assegnarli) */
const TAG_META: Record<string, { label: string; color: string }> = {
  scoop:     { label: "Scoop",     color: "#34d399" },
  ufficiale: { label: "Ufficiale", color: "#3b8eea" },
  mercato:   { label: "Mercato",   color: "#f0a43a" },
  sondaggio: { label: "Sondaggio", color: "#857cf0" },
};

/* Badge mostrato per i post senza tag (utenti normali) */
const MANAGER_TAG = { label: "Manager", color: "#94a3b8" };

function tagMeta(tag: string | null) {
  return (tag && TAG_META[tag]) || MANAGER_TAG;
}

export default function BachecaPage() {
  const [tab, setTab] = useState<TabKey>("scoop");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const { posts, viewer } = await fetchFeed();
      setPosts(posts);
      setViewer(viewer);
    } catch {
      // network/server error — mantieni stato vuoto
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const tabKeys: TabKey[] = viewer?.isAdmin ? ["scoop", "cedibili", "gestione"] : ["scoop", "cedibili"];

  return (
    <div className="screen sec-board">
      {/* Header + tabs */}
      <PageHeader eyebrow="La lega" title="Bacheca">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "scoop" as TabKey, label: "Scoop" },
            { key: "cedibili" as TabKey, label: "Cedibili" },
            ...(viewer?.isAdmin ? [{ key: "gestione" as TabKey, label: "Gestione" }] : []),
          ]}
        />
      </PageHeader>

      <TabPanel tabKey={tab} keys={tabKeys}>
        {tab === "scoop" ? <ScoopTab viewer={viewer} posts={posts} loading={loading} reload={loadFeed} setPosts={setPosts} />
          : tab === "cedibili" ? <CedibiliTab viewer={viewer} />
          : viewer?.isAdmin ? <GestioneTab />
          : null}
      </TabPanel>
    </div>
  );
}

/* ─── TAB SCOOP ─────────────────────────────────────────────────────────── */

function ScoopTab({ viewer, posts, loading, reload, setPosts }: {
  viewer: Viewer | null;
  posts: FeedPost[];
  loading: boolean;
  reload: () => Promise<void>;
  setPosts: React.Dispatch<React.SetStateAction<FeedPost[]>>;
}) {
  useRegisterRefresh(reload);
  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {viewer && <Composer viewer={viewer} onPublished={reload} />}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 180 }} />
      ))}

      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">📣</span>
          <p className="text-white/50 text-sm text-center">
            Nessun post ancora.{viewer ? " Pubblica il primo!" : " Torna più tardi."}
          </p>
        </div>
      )}

      {!loading && posts.map((post) => (
        <PostCard key={post.id} post={post} viewer={viewer} reload={reload} setPosts={setPosts} />
      ))}
      <div className="h-4" />
    </div>
  );
}

function Composer({ viewer, onPublished }: { viewer: Viewer; onPublished: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>(ADMIN_POST_TAGS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function publish() {
    if (!body.trim() && !file) { setError("Scrivi qualcosa o aggiungi una foto"); return; }
    setBusy(true); setError("");
    try {
      let imageUrl: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await uploadPostImage(fd);
        if (up.error) { setError(up.error); setBusy(false); return; }
        imageUrl = up.url;
      }
      // solo l'admin assegna un tag; gli utenti normali pubblicano senza tag
      const res = await createPost({ body, imageUrl, tag: viewer.isAdmin ? tag : null });
      if (res.error) { setError(res.error); setBusy(false); return; }
      setBody(""); pickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await onPublished();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-accent p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{viewer.isAdmin ? "📣" : "✍️"}</span>
        <span className="eyebrow">
          {viewer.isAdmin ? "Pubblica un post" : "Condividi con la lega"}
        </span>
      </div>

      {/* Selettore tag: solo l'admin */}
      {viewer.isAdmin && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ADMIN_POST_TAGS.map((t) => {
            const meta = tagMeta(t);
            const active = tag === t;
            return (
              <button key={t} onClick={() => setTag(t)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all active:scale-95"
                style={{
                  background: active ? meta.color : "rgba(255,255,255,0.06)",
                  color: active ? "#06121f" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${active ? meta.color : "rgba(255,255,255,0.12)"}`,
                }}>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={viewer.isAdmin ? "Es. Tizio rende cedibile Lautaro…" : "Cosa vuoi dire alla lega?"}
        rows={3}
        className="input w-full px-3 py-2.5 text-sm resize-none"
      />

      {preview && (
        <div className="relative mt-3 rounded-xl overflow-hidden">
          <img src={preview} alt="anteprima" className="w-full max-h-64 object-cover" />
          <button onClick={() => { pickFile(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
            style={{ background: "rgba(0,0,0,0.6)" }}>✕</button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      <div className="flex items-center justify-between mt-3">
        <button onClick={() => fileRef.current?.click()}
          className="btn-soft flex items-center gap-1.5 px-3 py-2 text-xs">
          🖼️ Foto
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        <button onClick={publish} disabled={busy} className="btn-primary px-5 py-2 text-sm">
          {busy ? "Pubblico…" : "Pubblica"}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, viewer, reload, setPosts }: {
  post: FeedPost;
  viewer: Viewer | null;
  reload: () => Promise<void>;
  setPosts: React.Dispatch<React.SetStateAction<FeedPost[]>>;
}) {
  const confirm = useConfirm();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function onLike() {
    // ottimistico
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
      : p));
    const res = await toggleLike(post.id);
    if (res.error) reload(); // rollback via refetch
  }

  async function send() {
    if (!comment.trim()) return;
    setSending(true);
    const res = await addComment(post.id, comment);
    setSending(false);
    if (!res.error) { setComment(""); await reload(); }
  }

  async function changeTag(value: string) {
    const next = value === "" ? null : value;
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, tag: next } : p));
    const res = await updatePostTag(post.id, next);
    if (res.error) reload();
  }

  const meta = tagMeta(post.tag);

  return (
    <div className="card overflow-hidden">
      {/* Header autore */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden text-xl flex-none"
          style={{ background: "var(--accent-bg)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {isImageAvatar(post.authorLogo)
            ? <img src={post.authorLogo} alt="" className="w-full h-full object-cover" />
            : <span>{post.authorLogo}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{post.authorName}</p>
          {post.authorBadges?.length > 0 && (
            <div className="mt-1 mb-0.5"><BadgeRow ids={post.authorBadges} compact size={16} /></div>
          )}
          <p className="text-white/40 text-xs">{timeAgo(post.createdAt)} fa</p>
        </div>
        {viewer?.isAdmin ? (
          <select
            value={post.tag ?? ""}
            onChange={(e) => changeTag(e.target.value)}
            className="text-[10px] font-bold tracking-wider rounded-md px-1.5 py-1 outline-none flex-none appearance-none cursor-pointer"
            style={{ background: `${meta.color}26`, color: meta.color, border: `1px solid ${meta.color}55` }}
            aria-label="Cambia tag"
          >
            <option value="" style={{ background: "var(--surface-2)", color: "#fff" }}>— Nessuno</option>
            {ADMIN_POST_TAGS.map((t) => (
              <option key={t} value={t} style={{ background: "var(--surface-2)", color: "#fff" }}>{TAG_META[t].label}</option>
            ))}
          </select>
        ) : (
          <span className="text-[9px] font-bold tracking-wider px-2 py-1 rounded-md flex-none uppercase"
            style={{ background: `${meta.color}26`, color: meta.color }}>{meta.label}</span>
        )}
        {(viewer?.isAdmin || post.mine) && (
          <button onClick={async () => { if (await confirm({ title: "Eliminare questo post?", confirmLabel: "Elimina", danger: true })) { await deletePost(post.id); await reload(); } }}
            className="tap text-white/40 text-sm active:opacity-60 flex-none">🗑️</button>
        )}
      </div>

      {post.body && <p className="text-white/90 text-sm leading-relaxed px-4 pb-3 whitespace-pre-wrap">{post.body}</p>}

      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="w-full object-cover" style={{ maxHeight: 420 }} loading="lazy" />
      )}

      {/* Azioni */}
      <div className="flex items-center gap-5 px-4 py-3 mt-1" style={{ borderTop: "1px solid var(--border)" }}>
        <button onClick={onLike} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <span className="text-lg">{post.likedByMe ? "❤️" : "🤍"}</span>
          <span className="text-white/70 text-sm font-semibold">{post.likeCount}</span>
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <span className="text-lg">💬</span>
          <span className="text-white/70 text-sm font-semibold">{post.comments.length}</span>
        </button>
      </div>

      {/* Commenti */}
      {showComments && (
        <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-2.5 pt-3">
            {post.comments.length === 0 && <p className="text-white/35 text-xs">Nessun commento. Scrivi il primo!</p>}
            {post.comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <span className="mt-0.5"><Avatar src={c.authorLogo} size={18} /></span>
                <div className="flex-1 min-w-0">
                  <span className="text-emerald-400 text-xs font-bold">{c.authorName}</span>
                  <span className="text-white/30 text-[10px] ml-2">{timeAgo(c.createdAt)} fa</span>
                  <p className="text-white/80 text-sm leading-snug break-words">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Scrivi un commento…"
              className="input flex-1 px-3 py-2 text-sm"
            />
            <button onClick={send} disabled={sending || !comment.trim()}
              className="btn-primary px-3 py-2 text-sm">
              Invia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TAB CEDIBILI ──────────────────────────────────────────────────────── */

function CedibiliTab({ viewer }: { viewer: Viewer | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState("");
  const [playerPhoto, setPlayerPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { listings } = await fetchListings();
    setListings(listings);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useRegisterRefresh(load);

  async function add() {
    if (!player.trim()) { setError("Inserisci il nome del giocatore"); return; }
    setBusy(true); setError("");
    const res = await createListing({ playerName: player, note, photoUrl: playerPhoto });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setPlayer(""); setNote(""); setPlayerPhoto(null);
    await load();
  }

  const available = listings.filter((l) => l.status === "available");
  const closed = listings.filter((l) => l.status === "closed");

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Form (solo manager con profilo) */}
      {viewer?.hasProfile ? (
        <div className="card-accent p-4">
          <p className="eyebrow mb-3">Metti un giocatore sul mercato</p>
          <div className="mb-2">
            <PlayerSearchBox
              value={player}
              onChange={(t) => { setPlayer(t); setPlayerPhoto(null); }}
              onPick={(h) => { setPlayer(h.name); setPlayerPhoto(h.photoUrl); }}
              placeholder="Cerca il giocatore da cedere…" />
            <p className="text-white/30 text-[10px] mt-1">
              {playerPhoto ? "Foto associata ✓" : "Scrivi e scegli dal menu per avere la foto."}
            </p>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (facoltativa) — es. cerco un centrocampista"
            className="input w-full px-3 py-2.5 text-sm" />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button onClick={add} disabled={busy} className="btn-primary w-full mt-3 py-2.5 text-sm">
            {busy ? "Aggiungo…" : "Rendi cedibile"}
          </button>
        </div>
      ) : (
        <div className="card-flat p-4 text-center">
          <p className="text-white/50 text-sm">
            {viewer?.isAdmin
              ? "Sei l'admin: la bacheca cedibili è per i manager con una squadra."
              : "Completa il tuo profilo squadra per mettere giocatori sul mercato."}
          </p>
        </div>
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 64 }} />
      ))}

      {!loading && listings.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-5xl">🔁</span>
          <p className="text-white/50 text-sm">Nessun giocatore sul mercato.</p>
        </div>
      )}

      {available.map((l) => <ListingRow key={l.id} listing={l} onChange={load} />)}

      {closed.length > 0 && (
        <>
          <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mt-2">Trattative chiuse</p>
          {closed.map((l) => <ListingRow key={l.id} listing={l} onChange={load} />)}
        </>
      )}
      <div className="h-4" />
    </div>
  );
}

function ListingRow({ listing, onChange }: { listing: Listing; onChange: () => Promise<void> }) {
  const confirm = useConfirm();
  const isClosed = listing.status === "closed";
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3"
      style={{
        background: isClosed ? "rgba(255,255,255,0.03)" : "rgba(52,211,153,0.07)",
        border: `1px solid ${isClosed ? "rgba(255,255,255,0.07)" : "rgba(52,211,153,0.2)"}`,
        opacity: isClosed ? 0.6 : 1,
      }}>
      {listing.playerPhoto
        ? <img src={listing.playerPhoto} alt="" className="w-9 h-11 rounded object-cover flex-none" style={{ background: "rgba(255,255,255,0.08)" }} />
        : <Avatar src={listing.ownerLogo} size={28} />}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${isClosed ? "text-white/60 line-through" : "text-white"}`}>
          {listing.playerName}
        </p>
        <p className="text-white/40 text-xs truncate">
          {listing.ownerName}{listing.note ? ` · ${listing.note}` : ""}
        </p>
      </div>
      {listing.mine && (
        <div className="flex items-center gap-1.5 flex-none">
          <button onClick={async () => { await setListingStatus(listing.id, isClosed ? "available" : "closed"); await onChange(); }}
            className="btn-soft px-2.5 py-1.5 text-[11px]">
            {isClosed ? "Riapri" : "Chiudi"}
          </button>
          <button onClick={async () => { if (await confirm({ title: "Eliminare l'annuncio?", confirmLabel: "Elimina", danger: true })) { await deleteListing(listing.id); await onChange(); } }}
            className="btn-danger-soft tap text-[13px]">
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── TAB GESTIONE (solo admin) ─────────────────────────────────────────── */

/* Interruttore di rilascio: apre l'app a tutti o la rimette in "arrivo".
   Stato salvato in DB (fanta_settings.app_open), nessun deploy necessario. */
function AppReleaseToggle() {
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState<boolean | null>(null); // null = in caricamento
  const [busy, setBusy] = useState(false);

  useEffect(() => { isAppOpen().then(setOpen).catch(() => setOpen(null)); }, []);

  async function toggle() {
    if (open === null || busy) return;
    const next = !open;
    const ok = next
      ? await confirm({ title: "Aprire l'app a tutti?", message: "Da ora ogni manager vedrà l'app completa.", confirmLabel: "Apri a tutti" })
      : await confirm({ title: "Rimettere in arrivo?", message: "I manager (non admin) vedranno solo la pagina di attesa.", confirmLabel: "Metti in arrivo", danger: true });
    if (!ok) return;
    setBusy(true);
    const res = await setAppOpen(next);
    setBusy(false);
    if (res.error) { toast(res.error, "error"); return; }
    setOpen(res.open);
    toast(res.open ? "App aperta a tutti ✓" : "App rimessa in arrivo", "success");
  }

  const loading = open === null;
  const live = open === true;

  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{
        background: live ? "rgba(52,211,153,0.1)" : "rgba(255,177,26,0.1)",
        border: `1px solid ${live ? "rgba(52,211,153,0.3)" : "rgba(255,177,26,0.3)"}`,
      }}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: live ? "#34d399" : "#ffd479" }}>
          Stato app
        </p>
        <p className="text-white font-bold text-sm leading-tight">
          {loading ? "…" : live ? "Aperta a tutti" : "In arrivo (solo admin)"}
        </p>
        <p className="text-white/40 text-[11px] mt-0.5">
          {live ? "I manager vedono l'app completa." : "I manager vedono la pagina “in arrivo”."}
        </p>
      </div>
      <button onClick={toggle} disabled={loading || busy}
        className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex-none active:scale-95 transition-transform"
        style={live
          ? { background: "rgba(255,177,26,0.15)", border: "1px solid rgba(255,177,26,0.35)", color: "#ffd479" }
          : { background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>
        {busy ? "…" : live ? "Metti in arrivo" : "Apri a tutti"}
      </button>
    </div>
  );
}

function GestioneTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([fetchTeams(), adminListProfiles()]);
    setTeams(t);
    setProfiles(p);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useRegisterRefresh(load);

  // Una squadra può avere più allenatori → lista di profili per squadra.
  const profilesByTeam = new Map<string, AdminProfile[]>();
  for (const p of profiles) if (p.teamRef) {
    const arr = profilesByTeam.get(p.teamRef) ?? [];
    arr.push(p);
    profilesByTeam.set(p.teamRef, arr);
  }

  const unassignedManagers = profiles.filter((p) => !p.teamRef);
  const freeTeams = teams.filter((t) => !t.claimed);

  async function sync() {
    setSyncing(true); setMsg("");
    const res = await syncTeams();
    setSyncing(false);
    setMsg(res.error ?? `✓ Sincronizzate ${res.count} squadre dalla classifica`);
    await load();
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <AppReleaseToggle />

      <button onClick={sync} disabled={syncing}
        className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
        style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }}>
        {syncing ? "Sincronizzo…" : "🔄 Sincronizza squadre dalla classifica"}
      </button>
      {msg && <p className="text-white/60 text-xs text-center">{msg}</p>}

      {!loading && unassignedManagers.length > 0 && (
        <UnassignedManagers managers={unassignedManagers} freeTeams={freeTeams} reload={load} />
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 56 }} />
      ))}
      {!loading && teams.length === 0 && (
        <p className="text-white/50 text-sm text-center py-10">
          Nessuna squadra. Premi &quot;Sincronizza&quot; per importarle dalla classifica.
        </p>
      )}
      {teams.map((t) => <TeamAdminCard key={t.id} team={t} profiles={profilesByTeam.get(t.id) ?? []} onTeamsChange={load} />)}
      <div className="h-4" />
    </div>
  );
}

/* Manager iscritti ma senza squadra: l'admin li assegna manualmente a una squadra libera. */
function UnassignedManagers({ managers, freeTeams, reload }: {
  managers: AdminProfile[];
  freeTeams: Team[];
  reload: () => Promise<void>;
}) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-2.5"
      style={{ background: "rgba(255,177,26,0.08)", border: "1px solid rgba(255,177,26,0.25)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#ffd479" }}>
        Manager senza squadra ({managers.length})
      </p>
      {managers.map((m) => (
        <AssignRow key={m.userId} manager={m} freeTeams={freeTeams} reload={reload} />
      ))}
      <p className="text-white/35 text-[10px]">
        Per spostare un manager già assegnato, prima &quot;Libera squadra&quot; dalla sua scheda: ricomparirà qui.
      </p>
    </div>
  );
}

function AssignRow({ manager, freeTeams, reload }: {
  manager: AdminProfile;
  freeTeams: Team[];
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const label = `${manager.firstName} ${manager.lastName}`.trim() || manager.teamName || "Manager";

  async function assign(teamRef: string) {
    if (!teamRef) return;
    setBusy(true); setErr("");
    const res = await adminAssignTeam(manager.userId, teamRef);
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    await reload();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-semibold flex-1 min-w-0 truncate">{label}</span>
        <select value="" disabled={busy || freeTeams.length === 0}
          onChange={(e) => assign(e.target.value)}
          className="input px-2 py-1.5 text-xs disabled:opacity-50 flex-none max-w-[55%]">
          <option value="">
            {freeTeams.length === 0 ? "Nessuna squadra libera" : busy ? "Assegno…" : "Assegna a…"}
          </option>
          {freeTeams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      {err && <p className="text-red-400 text-[11px]">{err}</p>}
    </div>
  );
}

/* Campo di ricerca giocatori con tendina + foto (Transfermarkt). Componente riusabile. */
function PlayerSearchBox({ value, onChange, onPick, placeholder }: {
  value: string;
  onChange: (text: string) => void;
  onPick: (hit: PlayerHit) => void;
  placeholder?: string;
}) {
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const pickedName = useRef("");

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2 || q === pickedName.current) { setHits([]); setOpen(false); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchPlayers(q);
      if (!active) return;
      setHits(res);
      setOpen(res.length > 0);
      setSearching(false);
    }, 350);
    return () => { active = false; clearTimeout(t); };
  }, [value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (hits.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="input w-full px-3 py-2 text-sm" />

      {open && hits.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-xl"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)" }}>
          {hits.map((h) => (
            <button key={h.id} type="button"
              onClick={() => { pickedName.current = h.name; onPick(h); setOpen(false); setHits([]); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left active:opacity-70"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <img src={h.photoUrl} alt="" className="w-7 h-8 rounded object-cover flex-none" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-white text-sm truncate">{h.name}</span>
            </button>
          ))}
        </div>
      )}
      {searching && <p className="text-white/30 text-[10px] mt-1">Cerco su Transfermarkt…</p>}
    </div>
  );
}

function RosterAdder({ teamRef, onAdded }: { teamRef: string; onAdded: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [picked, setPicked] = useState<PlayerHit | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    const name = query.trim();
    if (!name) return;
    setBusy(true);
    await addRosterPlayer(teamRef, name, role || null, picked?.photoUrl ?? null);
    setBusy(false);
    setQuery(""); setRole(""); setPicked(null);
    await onAdded();
  }

  return (
    <div className="mb-1">
      <div className="flex gap-2 items-start">
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="input px-2 py-2 text-sm flex-none">
          <option value="">—</option>
          {["P", "D", "C", "A"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex-1 min-w-0">
          <PlayerSearchBox
            value={query}
            onChange={(t) => { setQuery(t); setPicked(null); }}
            onPick={(h) => { setPicked(h); setQuery(h.name); }}
            placeholder="Cerca un giocatore…" />
        </div>
        <button onClick={add} disabled={busy || !query.trim()}
          className="btn-primary px-3 py-2 text-sm flex-none">+</button>
      </div>
      <p className="text-white/30 text-[10px] mt-1">
        {picked ? "Foto associata ✓" : "Scrivi e seleziona dal menu per avere la foto."}
      </p>
    </div>
  );
}

function ManagerEditor({ profile, reload }: { profile: AdminProfile; reload: () => Promise<void> }) {
  const confirm = useConfirm();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [teamName, setTeamName] = useState(profile.teamName);
  const [badges, setBadges] = useState<string[]>(profile.badges);
  const [busy, setBusy] = useState(false);
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const dirty = firstName !== profile.firstName || lastName !== profile.lastName || teamName !== profile.teamName;
  const availableBadges = BADGES.filter((b) => !badges.includes(b.id));

  async function save() {
    setBusy(true); setMsg("");
    const res = await adminUpdateProfile(profile.userId, { firstName, lastName, teamName });
    setBusy(false);
    if (res.error) { setMsg(res.error); return; }
    setMsg("✓ Salvato");
    await reload();
  }

  async function applyBadges(next: string[]) {
    const prev = badges;
    setBadges(next);
    setBadgeBusy(true); setMsg("");
    const res = await adminSetProfileBadges(profile.userId, next);
    setBadgeBusy(false);
    if (res.error) { setMsg(res.error); setBadges(prev); return; }
    await reload();
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <p className="eyebrow text-[10px] mb-2">Manager assegnato</p>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome"
            className="input flex-1 min-w-0 px-3 py-2 text-sm" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome"
            className="input flex-1 min-w-0 px-3 py-2 text-sm" />
        </div>
        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Nome squadra (mostrato)"
          className="input w-full px-3 py-2 text-sm" />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={busy || !dirty}
            className="btn-primary px-3 py-2 text-xs">Salva</button>
          <button onClick={async () => { if (await confirm({ title: "Liberare la squadra?", message: "Il manager potrà sceglierne un'altra.", confirmLabel: "Libera" })) { await adminReleaseTeam(profile.userId); await reload(); } }}
            className="btn-soft px-3 py-2 text-xs">Libera squadra</button>
          <button onClick={async () => { if (await confirm({ title: `Eliminare il profilo di ${profile.teamName || profile.firstName || "questo manager"}?`, message: "La squadra tornerà libera.", confirmLabel: "Elimina", danger: true })) { await adminDeleteProfile(profile.userId); await reload(); } }}
            className="btn-danger-soft px-3 py-2 text-xs">Elimina profilo</button>
        </div>

        {/* Badge — l'admin assegna onorificenze mostrate nei post e nel profilo */}
        <div className="mt-1">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-1.5">Badge</p>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {badges.map((id) => {
                const b = BADGE_MAP[id];
                if (!b) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full font-bold"
                    style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}55`, fontSize: 11, padding: "2px 6px 2px 4px" }}>
                    <img src={`/badges/${id}.svg`} alt="" width={18} height={18} style={{ display: "block", flex: "none" }} />{b.label}
                    <button onClick={() => applyBadges(badges.filter((x) => x !== id))} disabled={badgeBusy}
                      className="ml-0.5 px-1 opacity-70 disabled:opacity-30" aria-label={`Rimuovi ${b.label}`}>✕</button>
                  </span>
                );
              })}
            </div>
          )}
          <select value="" disabled={badgeBusy || availableBadges.length === 0}
            onChange={(e) => { if (e.target.value) applyBadges([...badges, e.target.value]); }}
            className="input w-full px-3 py-2 text-sm disabled:opacity-50">
            <option value="">
              {availableBadges.length === 0 ? "Tutti i badge assegnati" : "+ Aggiungi un badge…"}
            </option>
            {availableBadges.map((b) => (
              <option key={b.id} value={b.id}>{b.emoji} {b.label} — {b.description}</option>
            ))}
          </select>
        </div>

        {msg && <p className="text-white/60 text-xs">{msg}</p>}
      </div>
    </div>
  );
}

/* Selettore capienza: quanti allenatori può avere la squadra.
   1 = squadra normale, 2 = condivisa da due fantaallenatori. */
function TeamCapacity({ team, reload }: { team: Team; reload: () => Promise<void> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function set(n: number) {
    if (busy || n === team.maxManagers) return;
    setBusy(true);
    const res = await adminSetTeamCapacity(team.id, n);
    setBusy(false);
    if (res.error) { toast(res.error, "error"); return; }
    await reload();
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="eyebrow text-[10px]">Allenatori per squadra</p>
        <p className="text-white/40 text-[11px]">Occupati: {team.managerCount} · Posti: {team.maxManagers}</p>
      </div>
      <div className="flex gap-1 flex-none">
        {[1, 2].map((n) => {
          const active = team.maxManagers === n;
          return (
            <button key={n} onClick={() => set(n)} disabled={busy}
              className="w-9 h-9 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={active
                ? { background: "var(--accent-grad)", color: "var(--accent-ink)" }
                : { background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TeamAdminCard({ team, profiles, onTeamsChange }: { team: Team; profiles: AdminProfile[]; onTeamsChange: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoErr, setLogoErr] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    setRoster(await fetchRoster(team.id));
    setLoadingRoster(false);
  }, [team.id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadRoster();
  }

  async function onLogo(file: File) {
    setBusy(true); setLogoErr("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadTeamLogo(team.id, fd);
    if (logoRef.current) logoRef.current.value = "";
    setBusy(false);
    if (res.error) { setLogoErr(res.error); return; }
    await onTeamsChange();
  }

  // Etichetta sotto il nome squadra: nomi degli allenatori, o stato se vuota.
  const managerNames = profiles
    .map((p) => `${p.firstName} ${p.lastName}`.trim() || p.teamName || "Manager")
    .join(", ");
  const managerLabel = managerNames || (team.maxManagers > 1 ? "Libera · 2 posti" : "Libera");

  // Titolo card: il nome "mostrato" scelto in bacheca (team_name del profilo) ha la
  // precedenza sul nome del catalogo, così un rename si riflette anche qui.
  const displayName = profiles.map((p) => (p.teamName ?? "").trim()).find(Boolean) || team.name;

  return (
    <div className="card-flat overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-3 text-left">
        {team.logoUrl
          ? <img src={team.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
          : <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-none" style={{ background: "rgba(255,255,255,0.08)" }}>⚽</span>}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{displayName}</p>
          <p className="text-white/40 text-xs truncate">{managerLabel}</p>
        </div>
        {/* Posti occupati/capienza — evidenzia le squadre condivise */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-none mr-1"
          style={team.maxManagers > 1
            ? { background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }
            : { color: "var(--text-faint)" }}>
          {team.managerCount}/{team.maxManagers}
        </span>
        <span className="text-white/30 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Logo (è anche la foto profilo del manager) */}
          <div className="pt-3">
            <button onClick={() => logoRef.current?.click()} disabled={busy}
              className="btn-soft px-3 py-2 text-xs disabled:opacity-50">
              {busy ? "Carico…" : team.logoUrl ? "🖼️ Cambia logo / foto" : "🖼️ Carica logo / foto"}
            </button>
            <input ref={logoRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }} />
            <p className="text-white/30 text-[10px] mt-1.5">Questo logo è anche la foto profilo del manager.</p>
            {logoErr && <p className="text-red-400 text-xs mt-1">{logoErr}</p>}
          </div>

          {/* Capienza: quanti allenatori può avere la squadra (1 = normale, 2 = condivisa) */}
          <TeamCapacity team={team} reload={onTeamsChange} />

          {/* Manager assegnati — uno o più; l'admin modifica info o libera la squadra */}
          {profiles.map((p) => <ManagerEditor key={p.userId} profile={p} reload={onTeamsChange} />)}

          {/* Rosa */}
          <div>
            <p className="eyebrow text-[10px] mb-2">Rosa</p>
            <RosterAdder teamRef={team.id} onAdded={loadRoster} />

            {loadingRoster && <p className="text-white/40 text-xs">Carico rosa…</p>}
            {!loadingRoster && roster.length === 0 && <p className="text-white/35 text-xs">Nessun giocatore inserito.</p>}
            <div className="flex flex-col gap-1 mt-2">
              {roster.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt="" className="w-6 h-7 rounded object-cover flex-none" style={{ background: "rgba(255,255,255,0.08)" }} />
                    : <span className="w-6 h-7 rounded flex items-center justify-center text-[11px] flex-none" style={{ background: "rgba(255,255,255,0.08)" }}>⚽</span>}
                  {p.role && <span className="text-emerald-400/80 text-[10px] font-bold w-4 text-center flex-none">{p.role}</span>}
                  <span className="text-white/85 text-sm flex-1 truncate">{p.playerName}</span>
                  <button onClick={async () => { await deleteRosterPlayer(p.id); await loadRoster(); }}
                    className="tap text-red-400/70 text-sm flex-none">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
