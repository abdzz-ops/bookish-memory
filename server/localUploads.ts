import type { Express } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { pool } from "./db";
import { supabase } from "./supabase";

const SUPABASE_URL = "https://atgssebsyfjgperkaijn.supabase.co";
const BUCKET = "uploads";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const pendingUploads = new Map<string, { storagePath: string; contentType: string }>();

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string || (req.secure ? "https" : "http")).split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] as string || req.headers.host || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

export async function initSupabaseBucket(): Promise<void> {
  console.log("[upload] Checking Supabase 'uploads' bucket...");
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("[upload] Cannot list Supabase buckets:", listErr.message);
    return;
  }
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    console.log("[upload] Bucket 'uploads' not found — attempting to create it...");
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      console.error("[upload] Failed to create bucket 'uploads':", createErr.message);
      console.error("[upload] ACTION REQUIRED: Create a public bucket named 'uploads' in your Supabase dashboard.");
    } else {
      console.log("[upload] Bucket 'uploads' created successfully.");
    }
  } else {
    console.log("[upload] Bucket 'uploads' is ready.");
  }
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

      pendingUploads.set(uuid, { storagePath, contentType: contentType || "application/octet-stream" });

      const base = getBaseUrl(req);
      const uploadURL = `${base}/api/uploads/file/${uuid}`;
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
      const objectPath = `/supabase-storage/${storagePath}`;

      const user = req.user as any;
      pool.query(
        `INSERT INTO uploads (user_id, username, file_name, content_type, object_path, public_url) VALUES ($1,$2,$3,$4,$5,$6)`,
        [user?.id || null, user?.username || null, name || "file", contentType || "application/octet-stream", objectPath, publicUrl]
      ).catch(() => {});

      console.log(`[upload] Upload URL requested by user ${user?.username} for file '${name}' → path: ${storagePath}`);
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

        console.log(`[upload] Uploading to Supabase storage: bucket='${BUCKET}' path='${storagePath}' size=${buffer.length} bytes contentType='${contentType}'`);

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType, upsert: true });

        if (error) {
          console.error(`[upload] Supabase storage upload FAILED for path '${storagePath}':`, error.message);
          return res.status(500).json({ error: "Failed to upload to Supabase storage: " + error.message });
        }

        console.log(`[upload] Supabase storage upload SUCCESS: path='${data.path}'`);
        pendingUploads.delete(uuid);
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

  app.get("/objects/uploads/:uuid", (req, res) => {
    const { uuid } = req.params;
    const filePath = path.join(UPLOADS_DIR, uuid);
    if (fs.existsSync(filePath)) {
      const metaPath = path.join(UPLOADS_DIR, `${uuid}.meta.json`);
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
