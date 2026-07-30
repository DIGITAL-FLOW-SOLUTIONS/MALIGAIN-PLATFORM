import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { supabase } from "../lib/supabase";
import { earnFunSSE } from "../lib/earn-fun-sse";

const router: IRouter = Router();
router.use(requireAuth);

const VALID_CATEGORIES = ["tiktok", "youtube", "movies", "reals", "ads"] as const;

// GET /api/earn-assets?category=tiktok
router.get("/", async (req: Request, res: Response) => {
  const category = String(req.query["category"] ?? "").trim().toLowerCase();
  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    res.status(400).json({ error: "ValidationError", message: "Invalid category" });
    return;
  }

  const { data, error } = await supabase
    .from("earn_fun_assets")
    .select("id, title, url, thumbnail_url, asset_type, sort_order")
    .eq("category", category)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "ServerError", message: "Failed to load assets" });
    return;
  }

  res.json({ assets: data ?? [] });
});

// GET /api/earn-assets/stream  — SSE real-time updates
router.get("/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial connection ack
  res.write("event: connected\ndata: {}\n\n");

  const unsubscribe = earnFunSSE.subscribe((payload) => {
    try {
      res.write(`event: update\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch { /* client disconnected */ }
  });

  // 30-second heartbeat to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write("event: heartbeat\ndata: {}\n\n"); } catch { /* ignore */ }
  }, 30_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
