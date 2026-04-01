import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://atgssebsyfjgperkaijn.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_BoVF_FjVvSR0-WrQfxbkyA_IFVKbHHx";
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log(`[supabase] Service role key loaded (${SUPABASE_SERVICE_ROLE_KEY.length} chars).`);
} else {
  console.warn("[supabase] Service role key not set — storage bucket auto-creation disabled.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

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
      "Message:", postsCheckErr.message
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
