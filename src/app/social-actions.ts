"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { isAdminPostTag } from "@/lib/post-tags";

// ─── Tipi esposti al client ─────────────────────────────────────────────────

export interface Viewer {
  userId: string;
  isAdmin: boolean;
  displayName: string;
  logo: string;
  hasProfile: boolean;
}

export interface FeedComment {
  id: string;
  authorName: string;
  authorLogo: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorLogo: string;
  body: string;
  imageUrl: string | null;
  tag: string | null;
  mine: boolean;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  comments: FeedComment[];
}

export interface Listing {
  id: string;
  ownerName: string;
  ownerLogo: string;
  playerName: string;
  playerPhoto: string | null;
  note: string | null;
  status: "available" | "closed";
  createdAt: string;
  mine: boolean;
}

// ─── Helper: chi sta guardando ──────────────────────────────────────────────

interface ViewerInternal extends Viewer {
  email: string | null;
}

async function getViewer(): Promise<ViewerInternal | null> {
  const { userId } = await auth();
  if (!userId || !isSupabaseConfigured()) return null;

  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  const db = createAdminClient();

  // Admin?
  let isAdmin = false;
  let adminName = "Admin Lega";
  let adminLogo = "📣";
  if (email) {
    const { data: admin } = await db
      .from("fanta_admins")
      .select("display_name, avatar")
      .eq("email", email)
      .maybeSingle();
    if (admin) {
      isAdmin = true;
      adminName = admin.display_name;
      adminLogo = admin.avatar;
    }
  }

  if (isAdmin) {
    return { userId, email, isAdmin: true, displayName: adminName, logo: adminLogo, hasProfile: false };
  }

  // Manager con profilo squadra?
  const { data: profile } = await db
    .from("fanta_profiles")
    .select("first_name, logo, team_name, team_ref")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile) {
    let logo = profile.logo || "⚽";
    if (profile.team_ref) {
      const { data: team } = await db
        .from("fanta_teams")
        .select("logo_url")
        .eq("id", profile.team_ref)
        .maybeSingle();
      if (team?.logo_url) logo = team.logo_url;
    }
    return {
      userId,
      email,
      isAdmin: false,
      displayName: profile.team_name || profile.first_name || cu?.firstName || "Manager",
      logo,
      hasProfile: true,
    };
  }

  return {
    userId,
    email,
    isAdmin: false,
    displayName: cu?.firstName || "Manager",
    logo: "⚽",
    hasProfile: false,
  };
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  const v = await getViewer();
  if (!v) return null;
  const { email: _email, ...pub } = v;
  void _email;
  return pub;
}

// ─── Feed scoop ─────────────────────────────────────────────────────────────

export async function fetchFeed(): Promise<{ posts: FeedPost[]; viewer: Viewer | null }> {
  const viewer = await getViewer();
  if (!viewer) return { posts: [], viewer: null };

  const db = createAdminClient();
  const { data: posts } = await db
    .from("fanta_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (!posts || posts.length === 0) {
    return { posts: [], viewer: stripEmail(viewer) };
  }

  const ids = posts.map((p) => p.id);
  const [{ data: likes }, { data: comments }] = await Promise.all([
    db.from("fanta_post_likes").select("post_id, user_id").in("post_id", ids),
    db.from("fanta_post_comments").select("*").in("post_id", ids).order("created_at", { ascending: true }),
  ]);

  const feed: FeedPost[] = posts.map((p) => {
    const postLikes = (likes ?? []).filter((l) => l.post_id === p.id);
    const postComments = (comments ?? [])
      .filter((c) => c.post_id === p.id)
      .map((c) => ({
        id: c.id,
        authorName: c.author_name,
        authorLogo: c.author_logo,
        body: c.body,
        createdAt: c.created_at,
        mine: c.user_id === viewer.userId,
      }));
    return {
      id: p.id,
      authorName: p.author_name,
      authorLogo: p.author_logo,
      body: p.body,
      imageUrl: p.image_url,
      tag: p.tag,
      mine: p.author_id === viewer.userId,
      createdAt: p.created_at,
      likeCount: postLikes.length,
      likedByMe: postLikes.some((l) => l.user_id === viewer.userId),
      comments: postComments,
    };
  });

  return { posts: feed, viewer: stripEmail(viewer) };
}

function stripEmail(v: ViewerInternal): Viewer {
  const { email: _e, ...pub } = v;
  void _e;
  return pub;
}

// ─── Mutazioni post ─────────────────────────────────────────────────────────
// Tutti i manager possono pubblicare; solo l'admin può assegnare/cambiare un tag.

export async function createPost(input: { body: string; imageUrl?: string | null; tag?: string | null }): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autenticato" };

  const body = (input.body ?? "").trim();
  const imageUrl = input.imageUrl || null;
  if (!body && !imageUrl) return { error: "Scrivi qualcosa o aggiungi un'immagine" };

  // Solo l'admin può assegnare un tag; gli utenti normali postano senza tag
  const tag = viewer.isAdmin && isAdminPostTag(input.tag) ? input.tag : null;

  const db = createAdminClient();
  const { error } = await db.from("fanta_posts").insert({
    author_id: viewer.userId,
    author_name: viewer.displayName,
    author_logo: viewer.logo,
    body,
    image_url: imageUrl,
    tag,
  });
  return { error: error?.message ?? null };
}

export async function uploadPostImage(formData: FormData): Promise<{ url: string | null; error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { url: null, error: "Non autenticato" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { url: null, error: "Nessun file valido" };
  if (file.size > 5 * 1024 * 1024) return { url: null, error: "Immagine troppo grande (max 5MB)" };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext || "jpg"}`;
  const db = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage.from("post-images").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) return { url: null, error: error.message };

  const { data } = db.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function updatePostTag(postId: string, tag: string | null): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin può cambiare il tag" };

  // null = rimuove il tag; altrimenti deve essere un tag valido
  const next = isAdminPostTag(tag) ? tag : null;

  const db = createAdminClient();
  const { error } = await db.from("fanta_posts").update({ tag: next }).eq("id", postId);
  return { error: error?.message ?? null };
}

export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autorizzato" };
  const db = createAdminClient();
  // l'admin può cancellare qualsiasi post; l'utente solo i propri
  let q = db.from("fanta_posts").delete().eq("id", postId);
  if (!viewer.isAdmin) q = q.eq("author_id", viewer.userId);
  const { error } = await q;
  return { error: error?.message ?? null };
}

// ─── Like ───────────────────────────────────────────────────────────────────

export async function toggleLike(postId: string): Promise<{ liked: boolean; error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { liked: false, error: "Non autenticato" };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("fanta_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from("fanta_post_likes").delete().eq("id", existing.id);
    return { liked: false, error: error?.message ?? null };
  }

  const { error } = await db.from("fanta_post_likes").insert({ post_id: postId, user_id: viewer.userId });
  return { liked: !error, error: error?.message ?? null };
}

// ─── Commenti ─────────────────────────────────────────────────────────────────

export async function addComment(postId: string, body: string): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autenticato" };
  const text = (body ?? "").trim();
  if (!text) return { error: "Commento vuoto" };
  if (text.length > 500) return { error: "Commento troppo lungo (max 500)" };

  const db = createAdminClient();
  const { error } = await db.from("fanta_post_comments").insert({
    post_id: postId,
    user_id: viewer.userId,
    author_name: viewer.displayName,
    author_logo: viewer.logo,
    body: text,
  });
  return { error: error?.message ?? null };
}

export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autenticato" };

  const db = createAdminClient();
  // l'autore può cancellare il proprio commento; l'admin qualsiasi
  let q = db.from("fanta_post_comments").delete().eq("id", commentId);
  if (!viewer.isAdmin) q = q.eq("user_id", viewer.userId);
  const { error } = await q;
  return { error: error?.message ?? null };
}

// ─── Bacheca cedibili ─────────────────────────────────────────────────────────

export async function fetchListings(): Promise<{ listings: Listing[]; viewer: Viewer | null }> {
  const viewer = await getViewer();
  if (!viewer) return { listings: [], viewer: null };

  const db = createAdminClient();
  const { data } = await db
    .from("fanta_transfer_listings")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const listings: Listing[] = (data ?? []).map((l) => ({
    id: l.id,
    ownerName: l.owner_name,
    ownerLogo: l.owner_logo,
    playerName: l.player_name,
    playerPhoto: l.player_photo ?? null,
    note: l.note,
    status: l.status,
    createdAt: l.created_at,
    mine: l.user_id === viewer.userId,
  }));

  return { listings, viewer: stripEmail(viewer) };
}

export async function createListing(input: { playerName: string; note?: string; photoUrl?: string | null }): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autenticato" };
  if (!viewer.hasProfile) return { error: "Completa prima il tuo profilo squadra" };

  const player = (input.playerName ?? "").trim();
  if (!player) return { error: "Inserisci il nome del giocatore" };
  const photo = (input.photoUrl ?? "").trim() || null;
  const note = (input.note ?? "").trim() || null;

  const db = createAdminClient();
  const { error } = await db.from("fanta_transfer_listings").insert({
    user_id: viewer.userId,
    owner_name: viewer.displayName,
    owner_logo: viewer.logo,
    player_name: player,
    player_photo: photo,
    note,
  });
  // fallback se la colonna player_photo non è ancora stata migrata
  if (error && /player_photo/i.test(error.message)) {
    const retry = await db.from("fanta_transfer_listings").insert({
      user_id: viewer.userId,
      owner_name: viewer.displayName,
      owner_logo: viewer.logo,
      player_name: player,
      note,
    });
    return { error: retry.error?.message ?? null };
  }
  return { error: error?.message ?? null };
}

export async function setListingStatus(id: string, status: "available" | "closed"): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autenticato" };
  const db = createAdminClient();
  const { error } = await db
    .from("fanta_transfer_listings")
    .update({ status })
    .eq("id", id)
    .eq("user_id", viewer.userId);
  return { error: error?.message ?? null };
}

export async function deleteListing(id: string): Promise<{ error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Non autenticato" };
  const db = createAdminClient();
  const { error } = await db
    .from("fanta_transfer_listings")
    .delete()
    .eq("id", id)
    .eq("user_id", viewer.userId);
  return { error: error?.message ?? null };
}
