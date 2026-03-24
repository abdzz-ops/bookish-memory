import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { pool } from "../../db";

/**
 * Register object storage routes for file uploads.
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   * Returns the full public HTTPS URL so clients can store it directly.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, contentType } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      // Build the full public URL so the frontend can use it directly
      const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const publicUrl = `${proto}://${host}${objectPath}`;

      const user = (req as any).user as any;
      pool.query(
        `INSERT INTO uploads (user_id, username, file_name, content_type, object_path, public_url) VALUES ($1,$2,$3,$4,$5,$6)`,
        [user?.id || null, user?.username || null, name || "file", contentType || "application/octet-stream", objectPath, publicUrl]
      ).catch(() => {});

      res.json({
        uploadURL,
        objectPath,        // relative: /objects/uploads/uuid
        publicUrl,         // full:     https://host/objects/uploads/uuid
        metadata: { name, contentType: contentType || "application/octet-stream" },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects — supports multi-segment paths like /objects/uploads/uuid
   * Express 5 wildcard syntax: *path captures everything after /objects/
   */
  app.get("/objects/*path", async (req, res) => {
    try {
      // In Express 5, wildcard parameter comes as an array or string
      const rawParam = (req.params as any).path;
      const segments = Array.isArray(rawParam) ? rawParam.join("/") : rawParam;

      if (!segments) {
        return res.status(400).json({ error: "Missing object path" });
      }

      const fullPath = `/objects/${segments}`;
      const objectFile = await objectStorageService.getObjectEntityFile(fullPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      console.error("Error serving object:", error);
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
