import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);

function num(val: unknown): number {
  return parseFloat(String(val ?? "0")) || 0;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const category = req.query["category"] as string;
    const search = req.query["search"] as string;

    let query = supabase.from("products").select("*").eq("is_active", true);
    if (category && category !== "All") {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: products } = await query;
    const list = (products ?? []) as Array<Record<string, unknown>>;

    // Get user's owned product ids
    const { data: purchasesData } = await supabase
      .from("purchases")
      .select("product_id")
      .eq("user_id", userId);

    const ownedIds = new Set((purchasesData ?? []).map((p: Record<string, unknown>) => p["product_id"]));

    // Get all categories
    const { data: allProducts } = await supabase.from("products").select("category").eq("is_active", true);
    const categories = [...new Set((allProducts ?? []).map((p: Record<string, unknown>) => String(p["category"])))];

    // Count total products
    const { count: totalCount } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    res.json({
      products: list.map(p => ({
        id: p["id"],
        title: p["title"],
        description: p["description"],
        price: num(p["price"]),
        originalPrice: p["original_price"] ? num(p["original_price"]) : null,
        category: p["category"],
        imageUrl: p["image_url"] ?? null,
        soldCount: p["sold_count"] ?? 0,
        commissionPercent: num(p["commission_percent"]),
        isOwned: ownedIds.has(p["id"]),
      })),
      total: totalCount ?? 0,
      categories,
      owned: ownedIds.size,
      sellers: 1,
    });
  } catch (err) {
    req.log.error({ err }, "Get products error");
    res.status(500).json({ error: "ServerError", message: "Failed to get products" });
  }
});

router.get("/my-purchases", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const { data: purchases } = await supabase
      .from("purchases")
      .select("*, products(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const list = (purchases ?? []) as Array<Record<string, unknown>>;
    const totalSpent = list.reduce((sum, p) => sum + num(p["amount_paid"]), 0);

    res.json({
      purchases: list.map(p => {
        const prod = p["products"] as Record<string, unknown> | null;
        return {
          id: p["id"],
          product: prod ? {
            id: prod["id"],
            title: prod["title"],
            description: prod["description"],
            price: num(prod["price"]),
            originalPrice: prod["original_price"] ? num(prod["original_price"]) : null,
            category: prod["category"],
            imageUrl: prod["image_url"] ?? null,
            soldCount: prod["sold_count"] ?? 0,
            commissionPercent: num(prod["commission_percent"]),
            isOwned: true,
          } : null,
          purchasedAt: p["created_at"],
          amountPaid: num(p["amount_paid"]),
        };
      }),
      totalSpent,
      totalOwned: list.length,
      totalPending: 0,
      totalCommissions: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Get purchases error");
    res.status(500).json({ error: "ServerError", message: "Failed to get purchases" });
  }
});

router.post("/:id/purchase", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const productId = parseInt(String(req.params["id"]));

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .limit(1);

    if (!products || products.length === 0) {
      res.status(404).json({ error: "NotFound", message: "Product not found" });
      return;
    }
    const product = products[0] as Record<string, unknown>;

    // Check if already owned
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .limit(1);

    if (existing && existing.length > 0) {
      res.status(400).json({ error: "AlreadyOwned", message: "You already own this product" });
      return;
    }

    // Check wallet balance
    const { data: wallets } = await supabase
      .from("wallet")
      .select("main_wallet")
      .eq("user_id", userId)
      .limit(1);

    const wallet = wallets?.[0] as Record<string, unknown> | undefined;
    const balance = num(wallet?.["main_wallet"]);
    const price = num(product["price"]);

    if (balance < price) {
      res.status(400).json({ error: "InsufficientFunds", message: "Insufficient balance" });
      return;
    }

    // Deduct from wallet and create purchase
    await supabase.from("wallet").update({ main_wallet: balance - price }).eq("user_id", userId);
    await supabase.from("purchases").insert({ user_id: userId, product_id: productId, amount_paid: price });

    // Increment sold count
    await supabase.from("products").update({ sold_count: (Number(product["sold_count"]) || 0) + 1 }).eq("id", productId);

    res.json({ message: "Product purchased successfully!", success: true });
  } catch (err) {
    req.log.error({ err }, "Purchase error");
    res.status(500).json({ error: "ServerError", message: "Purchase failed" });
  }
});

export default router;
