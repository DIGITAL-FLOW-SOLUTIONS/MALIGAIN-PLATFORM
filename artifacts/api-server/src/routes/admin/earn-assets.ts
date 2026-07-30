import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { earnFunSSE } from "../../lib/earn-fun-sse";
import { logAdminAction } from "../../middlewares/adminAuth";

const router: IRouter = Router();

const VALID_CATEGORIES = ["tiktok", "youtube", "movies", "reals", "ads"];
const VALID_ASSET_TYPES = ["video_link", "image_url"];

// GET /api/admin/earn-assets?category=tiktok (optional filter)
router.get("/", async (req: Request, res: Response) => {
  const category = String(req.query["category"] ?? "").trim().toLowerCase();

  let query = supabase
    .from("earn_fun_assets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: "ServerError", message: "Failed to load assets" });
    return;
  }
  res.json({ assets: data ?? [] });
});

// POST /api/admin/earn-assets
router.post("/", async (req: Request, res: Response) => {
  const { category, title, url, thumbnail_url, asset_type, sort_order } = req.body as Record<string, unknown>;

  if (!category || !VALID_CATEGORIES.includes(String(category))) {
    res.status(400).json({ error: "ValidationError", message: "Invalid category" }); return;
  }
  if (!url || String(url).trim().length < 1) {
    res.status(400).json({ error: "ValidationError", message: "URL is required" }); return;
  }
  const finalTitle = (title && String(title).trim().length > 0)
    ? String(title).trim()
    : String(url).trim();
  const finalAssetType = asset_type && VALID_ASSET_TYPES.includes(String(asset_type))
    ? String(asset_type)
    : "video_link";

  const { data, error } = await supabase
    .from("earn_fun_assets")
    .insert({
      category: String(category),
      title: finalTitle,
      url: String(url).trim(),
      thumbnail_url: thumbnail_url ? String(thumbnail_url).trim() : null,
      asset_type: finalAssetType,
      sort_order: sort_order ? Number(sort_order) : 0,
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "ServerError", message: "Failed to create asset" }); return;
  }

  const row = data as Record<string, unknown>;
  earnFunSSE.broadcast({ action: "created", category: String(category), assetId: row["id"] as number });

  const adminUsername = String(req.session?.["adminUsername"] ?? "admin");
  await logAdminAction(adminUsername, "earn_asset.created", "earn_fun_asset", row["id"] as number, { category, title });

  res.status(201).json({ message: "Asset created", asset: data });
});

// PUT /api/admin/earn-assets/:id
router.put("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"]));
  if (isNaN(id)) { res.status(400).json({ error: "ValidationError", message: "Invalid id" }); return; }

  const { title, url, thumbnail_url, asset_type, sort_order, is_active, category } = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (title !== undefined)        updates["title"]         = String(title).trim();
  if (url !== undefined)          updates["url"]           = String(url).trim();
  if (thumbnail_url !== undefined) updates["thumbnail_url"] = thumbnail_url ? String(thumbnail_url).trim() : null;
  if (asset_type !== undefined && VALID_ASSET_TYPES.includes(String(asset_type)))
                                  updates["asset_type"]    = String(asset_type);
  if (sort_order !== undefined)   updates["sort_order"]    = Number(sort_order);
  if (is_active !== undefined)    updates["is_active"]     = Boolean(is_active);
  if (category !== undefined && VALID_CATEGORIES.includes(String(category)))
                                  updates["category"]      = String(category);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "ValidationError", message: "Nothing to update" }); return;
  }

  const { data: existing } = await supabase
    .from("earn_fun_assets").select("category").eq("id", id).single();

  const { data, error } = await supabase
    .from("earn_fun_assets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "ServerError", message: "Failed to update asset" }); return;
  }

  const affectedCategory = String((updates["category"] ?? (existing as Record<string, unknown> | null)?.["category"]) ?? "");
  earnFunSSE.broadcast({ action: "updated", category: affectedCategory, assetId: id });

  const adminUsername = String(req.session?.["adminUsername"] ?? "admin");
  await logAdminAction(adminUsername, "earn_asset.updated", "earn_fun_asset", id, updates);

  res.json({ message: "Asset updated", asset: data });
});

// DELETE /api/admin/earn-assets/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"]));
  if (isNaN(id)) { res.status(400).json({ error: "ValidationError", message: "Invalid id" }); return; }

  const { data: existing } = await supabase
    .from("earn_fun_assets").select("category, title").eq("id", id).single();

  const { error } = await supabase.from("earn_fun_assets").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: "ServerError", message: "Failed to delete asset" }); return;
  }

  const category = String((existing as Record<string, unknown> | null)?.["category"] ?? "");
  if (category) earnFunSSE.broadcast({ action: "deleted", category, assetId: id });

  const adminUsername = String(req.session?.["adminUsername"] ?? "admin");
  await logAdminAction(adminUsername, "earn_asset.deleted", "earn_fun_asset", id, { category });

  res.json({ message: "Asset deleted" });
});

export default router;
