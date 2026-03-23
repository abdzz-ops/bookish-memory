import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://atgssebsyfjgperkaijn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BoVF_FjVvSR0-WrQfxbkyA_IFVKbHHx";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function initSupabaseTables() {
  console.log("[supabase] Checking connection and tables...");

  const { data: postsCheck, error: postsCheckErr } = await supabase
    .from("posts")
    .select("id")
    .limit(1);

  if (postsCheckErr) {
    console.error(
      "[supabase] ERROR: Cannot access 'posts' table.",
      "Code:", postsCheckErr.code,
      "Message:", postsCheckErr.message,
      "Details:", postsCheckErr.details,
      "Hint:", postsCheckErr.hint
    );
    console.error(
      "[supabase] ACTION REQUIRED: Create the following tables in your Supabase SQL editor:\n" +
      "  posts (id UUID PK, user_id TEXT, content TEXT, media_url TEXT, created_at TIMESTAMPTZ)\n" +
      "  likes (id UUID PK, user_id TEXT, post_id UUID FK->posts, UNIQUE(user_id,post_id))\n" +
      "  views (id UUID PK, post_id UUID FK->posts UNIQUE, view_count INTEGER)"
    );
  } else {
    console.log("[supabase] 'posts' table is accessible. Row count check passed.");
  }

  const { error: likesCheckErr } = await supabase.from("likes").select("id").limit(1);
  if (likesCheckErr) {
    console.error("[supabase] ERROR: Cannot access 'likes' table.", likesCheckErr.code, likesCheckErr.message);
  } else {
    console.log("[supabase] 'likes' table is accessible.");
  }

  const { error: viewsCheckErr } = await supabase.from("views").select("id").limit(1);
  if (viewsCheckErr) {
    console.error("[supabase] ERROR: Cannot access 'views' table.", viewsCheckErr.code, viewsCheckErr.message);
  } else {
    console.log("[supabase] 'views' table is accessible.");
  }

  if (!postsCheckErr && !likesCheckErr && !viewsCheckErr) {
    console.log("[supabase] All tables verified. Supabase is ready.");
  }
}
