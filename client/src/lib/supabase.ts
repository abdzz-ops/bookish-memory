import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://atgssebsyfjgperkaijn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BoVF_FjVvSR0-WrQfxbkyA_IFVKbHHx";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type SupabasePost = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
};

export type SupabaseLike = {
  id: string;
  user_id: string;
  post_id: string;
};

export type SupabaseView = {
  id: string;
  post_id: string;
  view_count: number;
};

export async function uploadFile(file: File, bucket = "uploads", folder = "public") {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost(userId: string, content: string, mediaUrl?: string) {
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, content, media_url: mediaUrl ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as SupabasePost;
}

export async function getPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupabasePost[];
}

export async function likePost(userId: string, postId: string) {
  const { error } = await supabase.from("likes").insert({ user_id: userId, post_id: postId });
  if (error) throw error;
}

export async function unlikePost(userId: string, postId: string) {
  const { error } = await supabase.from("likes").delete()
    .eq("user_id", userId).eq("post_id", postId);
  if (error) throw error;
}

export async function getLikesForPost(postId: string): Promise<number> {
  const { count, error } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
  if (error) throw error;
  return count ?? 0;
}

export async function incrementPostView(postId: string) {
  const { data } = await supabase.from("views").select("*").eq("post_id", postId).single();
  if (data) {
    await supabase.from("views").update({ view_count: data.view_count + 1 }).eq("post_id", postId);
  } else {
    await supabase.from("views").insert({ post_id: postId, view_count: 1 });
  }
}

export async function getPostViews(postId: string): Promise<number> {
  const { data } = await supabase.from("views").select("view_count").eq("post_id", postId).single();
  return data?.view_count ?? 0;
}
