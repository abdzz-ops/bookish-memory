import type { Express } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { pool } from "./db";
import { supabase, supabaseAdmin } from "./supabase";
import { fireWebhook, makeProfileUrl } from "./webhookService";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://atgssebsyfjgperkaijn.supabase.co";
const BUCKET = "uploads";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let useLocalMode = false;
export function getStorageMode(): "supabase" | "local" { return useLocalMode ? "local" : "supabase"; }

const pendingUploads = new Map<string, { storagePath: string; contentType: string; ext: string }>();

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string || (req.secure ? "https" : "http")).split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] as string || req.headers.host || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

export async function initSupabaseBucket(): Promise<void> {
  console.log("[upload] Checking Supabase 'uploads' bucket...");

  // Step 1: Probe the bucket directly to see if it already exists and is accessible
  const { error: probeErr } = await supabase.storage.from(BUCKET).list("public", { limit: 1 });
  if (!probeErr) {
    console.log("[upload] Bucket 'uploads' is accessible via anon key. Supabase storage ready.");
    return;
  }
  console.log(`[upload] Bucket probe (anon): ${probeErr.message}`);

  // Step 2: Try with service role key if available
  if (supabaseAdmin) {
    const { error: adminProbeErr } = await supabaseAdmin.storage.from(BUCKET).list("public", { limit: 1 });
    if (!adminProbeErr) {
      console.log("[upload] Bucket 'uploads' accessible via service role key. Supabase storage ready.");
      return;
    }

    // Try to create the bucket
    console.log("[upload] Attempting to create 'uploads' bucket with service role key...");
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    if (!createErr) {
      console.log("[upload] Bucket 'uploads' created successfully via service role key.");
      return;
    }
    // "already exists" errors are fine
    if (createErr.message.toLowerCase().includes("already exists") || createErr.message.toLowerCase().includes("duplicate")) {
      console.log("[upload] Bucket 'uploads' already exists. Supabase storage ready.");
      return;
    }
    console.warn(`[upload] Failed to create bucket 'uploads': ${createErr.message}`);
  } else {
    console.warn("[upload] SUPABASE_SERVICE_ROLE_KEY is not set. Cannot auto-create storage bucket.");
    console.warn("[upload] TIP: Set SUPABASE_SERVICE_ROLE_KEY in Replit Secrets and restart to enable Supabase storage.");
  }

  console.warn("[upload] Falling back to local file storage.");
  useLocalMode = true;
}

export function registerUploadRoutes(app: Express): void {
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
      const { name, contentType } = req.body;
      const uuid = randomUUID();
      const rawExt = (name || "file").split(".").pop() || "bin";
      const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "bin";
      const storagePath = `public/${uuid}.${safeExt}`;

      pendingUploads.set(uuid, { storagePath, contentType: contentType || "application/octet-stream", ext: safeExt });

      const base = getBaseUrl(req);
      const uploadURL = `${base}/api/uploads/file/${uuid}`;

      let publicUrl: string;
      let objectPath: string;

      if (useLocalMode) {
        publicUrl = `/objects/uploads/${uuid}.${safeExt}`;
        objectPath = `/objects/uploads/${uuid}.${safeExt}`;
      } else {
        publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
        objectPath = `/supabase-storage/${storagePath}`;
      }

      const user = req.user as any;
      pool.query(
        `INSERT INTO uploads (user_id, username, file_name, content_type, object_path, public_url) VALUES ($1,$2,$3,$4,$5,$6)`,
        [user?.id || null, user?.username || null, name || "file", contentType || "application/octet-stream", objectPath, publicUrl]
      ).catch((err) => {
        console.error("[upload] Failed to insert upload record into DB:", err?.message || err);
      });

      console.log(`[upload] Upload URL requested by user ${user?.username} for file '${name}' → path: ${storagePath} (mode: ${useLocalMode ? "local" : "supabase"})`);
      res.json({ uploadURL, objectPath, publicUrl, metadata: { name, contentType: contentType || "application/octet-stream" } });
    } catch (err) {
      console.error("[upload] Error generating upload URL:", err);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/uploads/file/:uuid", (req, res) => {
    const { uuid } = req.params;
    const pending = pendingUploads.get(uuid);
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = pending?.contentType || (req.headers["content-type"] as string) || "application/octet-stream";
        const storagePath = pending?.storagePath || `public/${uuid}`;
        const ext = pending?.ext || "bin";

        if (!useLocalMode) {
          console.log(`[upload] Uploading to Supabase storage: bucket='${BUCKET}' path='${storagePath}' size=${buffer.length} bytes contentType='${contentType}'`);
          const uploadClient = supabaseAdmin || supabase;
          const { data, error } = await uploadClient.storage
            .from(BUCKET)
            .upload(storagePath, buffer, { contentType, upsert: true });

          if (!error) {
            console.log(`[upload] Supabase storage upload SUCCESS: path='${data.path}'`);
            pendingUploads.delete(uuid);
            if ((req as any).user) {
              const u = (req as any).user as any;
              fireWebhook("uploads", {
                title: "📁 File Uploaded",
                description: `**[${u.username}](${makeProfileUrl(u.username)})** uploaded a file.`,
                fields: [
                  { name: "File", value: pending?.storagePath?.split("/").pop() || uuid, inline: true },
                  { name: "Type", value: contentType, inline: true },
                  { name: "Discord", value: u.discordUsername ? `@${u.discordUsername}` : "Not linked", inline: true },
                ],
              }).catch(() => {});
            }
            return res.status(200).send("OK");
          }

          console.warn(`[upload] Supabase upload failed (${error.message}), falling back to local storage.`);
          useLocalMode = true;

          // Update DB record to use local URL
          try {
            const localPath = `${uuid}.${ext}`;
            await pool.query(
              `UPDATE uploads SET public_url = $1, object_path = $2 WHERE object_path = $3`,
              [`/objects/uploads/${localPath}`, `/objects/uploads/${localPath}`, `/supabase-storage/${storagePath}`]
            );
          } catch (_) {}
        }

        // Local disk fallback
        const localFileName = `${uuid}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, localFileName);
        fs.writeFileSync(filePath, buffer);

        // Store content type metadata
        fs.writeFileSync(path.join(UPLOADS_DIR, `${localFileName}.meta.json`), JSON.stringify({ contentType }));

        console.log(`[upload] Local disk upload SUCCESS: ${filePath} (${buffer.length} bytes)`);
        pendingUploads.delete(uuid);
        if ((req as any).user) {
          const u = (req as any).user as any;
          fireWebhook("uploads", {
            title: "📁 File Uploaded",
            description: `**[${u.username}](${makeProfileUrl(u.username)})** uploaded a file.`,
            fields: [
              { name: "File", value: localFileName, inline: true },
              { name: "Type", value: contentType, inline: true },
              { name: "Discord", value: u.discordUsername ? `@${u.discordUsername}` : "Not linked", inline: true },
            ],
          }).catch(() => {});
        }
        res.status(200).send("OK");
      } catch (err: any) {
        console.error("[upload] Upload exception:", err?.message || err);
        res.status(500).json({ error: "Upload failed" });
      }
    });
    req.on("error", (err) => {
      console.error("[upload] Upload stream error:", err?.message);
      res.status(500).json({ error: "Upload stream error" });
    });
  });

  app.get("/objects/uploads/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const metaPath = path.join(UPLOADS_DIR, `${filename}.meta.json`);
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        if (meta?.contentType) res.setHeader("Content-Type", meta.contentType);
      } catch (_) {}
      res.setHeader("Cache-Control", "public, max-age=31536000");
      return res.sendFile(filePath);
    }
    res.status(404).json({ error: "File not found" });
  });
}
