"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchFeed, createPost, uploadPostImage, toggleLike, addComment, deletePost,
  fetchListings, createListing, setListingStatus, deleteListing,
  type FeedPost, type Listing, type Viewer,
} from "@/app/social-actions";
import {
  fetchMyRoster, fetchTeams, syncTeams, uploadTeamLogo, fetchRoster,
  addRosterPlayer, deleteRosterPlayer,
  type Team, type RosterPlayer,
} from "@/app/teams-actions";

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
  if (src?.startsWith("http")) {
    return <img src={src} alt="" className="rounded-full object-cover flex-none" style={{ width: size, height: size }} />;
  }
  return <span className="flex-none leading-none" style={{ fontSize: size * 0.85 }}>{src}</span>;
}

export default function BachecaPage() {
  const [tab, setTab] = useState<TabKey>("scoop");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    const { posts, viewer } = await fetchFeed();
    setPosts(posts);
    setViewer(viewer);
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  return (
    <div className="screen sec-board">
      {/* Header + tabs */}
      <div className="sec-header px-4 pt-12 pb-3 sticky top-0 z-20">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-soft)" }}>La lega</p>
        <h1 className="text-white font-bold text-2xl leading-tight mb-3">Bacheca</h1>
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
          {(([["scoop", "Scoop"], ["cedibili", "Cedibili"],
              ...(viewer?.isAdmin ? [["gestione", "Gestione"]] : [])] as [TabKey, string][])).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
              style={{
                background: tab === key ? "var(--accent)" : "transparent",
                color: tab === key ? "var(--accent-ink)" : "rgba(255,255,255,0.55)",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "scoop" && <ScoopTab viewer={viewer} posts={posts} loading={loading} reload={loadFeed} setPosts={setPosts} />}
      {tab === "cedibili" && <CedibiliTab viewer={viewer} />}
      {tab === "gestione" && viewer?.isAdmin && <GestioneTab />}
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
  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {viewer?.isAdmin && <Composer onPublished={reload} />}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ height: 180, background: "rgba(255,255,255,0.05)" }} />
      ))}

      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">📣</span>
          <p className="text-white/50 text-sm text-center">
            Nessuno scoop ancora.{viewer?.isAdmin ? " Pubblica il primo!" : " Torna più tardi."}
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

function Composer({ onPublished }: { onPublished: () => Promise<void> }) {
  const [body, setBody] = useState("");
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
      const res = await createPost({ body, imageUrl });
      if (res.error) { setError(res.error); setBusy(false); return; }
      setBody(""); pickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await onPublished();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📣</span>
        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">Pubblica uno scoop</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Es. Tizio rende cedibile Lautaro…"
        rows={3}
        className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-400/40"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#34d399" }}
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          🖼️ Foto
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        <button onClick={publish} disabled={busy}
          className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "#34d399", color: "#052e16" }}>
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

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header autore */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden text-xl flex-none"
          style={{ background: "var(--accent-bg)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {post.authorLogo?.startsWith("http")
            ? <img src={post.authorLogo} alt="" className="w-full h-full object-cover" />
            : <span>{post.authorLogo}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{post.authorName}</p>
          <p className="text-white/40 text-xs">{timeAgo(post.createdAt)} fa</p>
        </div>
        <span className="text-[9px] font-bold tracking-wider px-2 py-1 rounded-md flex-none"
          style={{ background: "rgba(52,211,153,0.15)", color: "var(--accent-soft)" }}>SCOOP</span>
        {viewer?.isAdmin && (
          <button onClick={async () => { if (confirm("Eliminare questo scoop?")) { await deletePost(post.id); await reload(); } }}
            className="text-white/30 text-sm px-1 active:opacity-60 flex-none">🗑️</button>
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
        <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
              className="flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#34d399" }}
            />
            <button onClick={send} disabled={sending || !comment.trim()}
              className="px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "#34d399", color: "#052e16" }}>
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
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [{ listings }, my] = await Promise.all([fetchListings(), fetchMyRoster()]);
    setListings(listings);
    setRoster(my.players);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!player.trim()) { setError("Inserisci il nome del giocatore"); return; }
    setBusy(true); setError("");
    const res = await createListing({ playerName: player, note });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setPlayer(""); setNote("");
    await load();
  }

  const available = listings.filter((l) => l.status === "available");
  const closed = listings.filter((l) => l.status === "closed");

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Form (solo manager con profilo) */}
      {viewer?.hasProfile ? (
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wide mb-3">Metti un giocatore sul mercato</p>
          {roster.length > 0 ? (
            <select value={player} onChange={(e) => setPlayer(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none mb-2 focus:ring-2 focus:ring-emerald-400/40"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <option value="" style={{ background: "#141d33" }}>Seleziona un giocatore…</option>
              {roster.map((p) => (
                <option key={p.id} value={p.playerName} style={{ background: "#141d33" }}>
                  {p.role ? `${p.role} · ` : ""}{p.playerName}
                </option>
              ))}
            </select>
          ) : (
            <input value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Nome giocatore (es. Lautaro)"
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none mb-2 focus:ring-2 focus:ring-emerald-400/40"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#34d399" }} />
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (facoltativa) — es. cerco un centrocampista"
            className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#34d399" }} />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button onClick={add} disabled={busy}
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "#34d399", color: "#052e16" }}>
            {busy ? "Aggiungo…" : "Rendi cedibile"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-white/50 text-sm">
            {viewer?.isAdmin
              ? "Sei l'admin: la bacheca cedibili è per i manager con una squadra."
              : "Completa il tuo profilo squadra per mettere giocatori sul mercato."}
          </p>
        </div>
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ height: 64, background: "rgba(255,255,255,0.05)" }} />
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
  const isClosed = listing.status === "closed";
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3"
      style={{
        background: isClosed ? "rgba(255,255,255,0.03)" : "rgba(52,211,153,0.07)",
        border: `1px solid ${isClosed ? "rgba(255,255,255,0.07)" : "rgba(52,211,153,0.2)"}`,
        opacity: isClosed ? 0.6 : 1,
      }}>
      <Avatar src={listing.ownerLogo} size={28} />
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
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white/70"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {isClosed ? "Riapri" : "Chiudi"}
          </button>
          <button onClick={async () => { if (confirm("Eliminare?")) { await deleteListing(listing.id); await onChange(); } }}
            className="px-2 py-1.5 rounded-lg text-[11px] text-red-400/80"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── TAB GESTIONE (solo admin) ─────────────────────────────────────────── */

function GestioneTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setTeams(await fetchTeams());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function sync() {
    setSyncing(true); setMsg("");
    const res = await syncTeams();
    setSyncing(false);
    setMsg(res.error ?? `✓ Sincronizzate ${res.count} squadre dalla classifica`);
    await load();
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <button onClick={sync} disabled={syncing}
        className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
        style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
        {syncing ? "Sincronizzo…" : "🔄 Sincronizza squadre dalla classifica"}
      </button>
      {msg && <p className="text-white/60 text-xs text-center">{msg}</p>}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ height: 56, background: "rgba(255,255,255,0.05)" }} />
      ))}
      {!loading && teams.length === 0 && (
        <p className="text-white/50 text-sm text-center py-10">
          Nessuna squadra. Premi &quot;Sincronizza&quot; per importarle dalla classifica.
        </p>
      )}
      {teams.map((t) => <TeamAdminCard key={t.id} team={t} onTeamsChange={load} />)}
      <div className="h-4" />
    </div>
  );
}

function TeamAdminCard({ team, onTeamsChange }: { team: Team; onTeamsChange: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    await uploadTeamLogo(team.id, fd);
    if (logoRef.current) logoRef.current.value = "";
    setBusy(false);
    await onTeamsChange();
  }

  async function add() {
    if (!name.trim()) return;
    await addRosterPlayer(team.id, name, role || null);
    setName(""); setRole("");
    await loadRoster();
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
      <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-3 text-left">
        {team.logoUrl
          ? <img src={team.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
          : <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-none" style={{ background: "rgba(255,255,255,0.08)" }}>⚽</span>}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{team.name}</p>
          <p className="text-white/40 text-xs">{team.claimed ? "Assegnata" : "Libera"}</p>
        </div>
        <span className="text-white/30 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Logo */}
          <div className="pt-3">
            <button onClick={() => logoRef.current?.click()} disabled={busy}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white/70 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {busy ? "Carico…" : team.logoUrl ? "🖼️ Cambia logo" : "🖼️ Carica logo"}
            </button>
            <input ref={logoRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }} />
          </div>

          {/* Rosa */}
          <div>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide mb-2">Rosa</p>
            <div className="flex gap-2 mb-2">
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="rounded-lg px-2 py-2 text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <option value="" style={{ background: "#141d33" }}>—</option>
                {["P", "D", "C", "A"].map((r) => <option key={r} value={r} style={{ background: "#141d33" }}>{r}</option>)}
              </select>
              <input value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="Nome giocatore"
                className="flex-1 rounded-lg px-3 py-2 text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#34d399" }} />
              <button onClick={add}
                className="px-3 py-2 rounded-lg text-sm font-bold"
                style={{ background: "#34d399", color: "#052e16" }}>+</button>
            </div>

            {loadingRoster && <p className="text-white/40 text-xs">Carico rosa…</p>}
            {!loadingRoster && roster.length === 0 && <p className="text-white/35 text-xs">Nessun giocatore inserito.</p>}
            <div className="flex flex-col gap-1">
              {roster.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                  {p.role && <span className="text-emerald-400/80 text-[10px] font-bold w-4">{p.role}</span>}
                  <span className="text-white/85 text-sm flex-1 truncate">{p.playerName}</span>
                  <button onClick={async () => { await deleteRosterPlayer(p.id); await loadRoster(); }}
                    className="text-red-400/70 text-xs px-1.5">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
