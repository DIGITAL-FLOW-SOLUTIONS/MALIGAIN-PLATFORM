import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, EarnAsset } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Music2, Youtube, Film, Clapperboard, Megaphone,
  Plus, Pencil, Trash2, Check, X, Link, Image, Video,
  ToggleLeft, ToggleRight, GripVertical, Eye, EyeOff,
} from "lucide-react";

// ─── Category config ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "tiktok",  label: "TikTok Earn",  icon: Music2,       color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",     border: "border-rose-200 dark:border-rose-800",
    urlLabel: "TikTok URL",
    urlPlaceholder: "https://www.tiktok.com/@username/video/...",
    urlHint: "Paste the TikTok video link",
    allowImageType: false,
  },
  {
    key: "youtube", label: "YouTube Earn", icon: Youtube,      color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",       border: "border-red-200 dark:border-red-800",
    urlLabel: "YouTube URL",
    urlPlaceholder: "https://www.youtube.com/watch?v=...",
    urlHint: "Thumbnail auto-detected from YouTube link",
    allowImageType: false,
  },
  {
    key: "movies",  label: "Movies",       icon: Film,         color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800",
    urlLabel: "Video URL",
    urlPlaceholder: "https://www.youtube.com/watch?v=... or any video URL",
    urlHint: "YouTube links get an auto-thumbnail; paste a custom thumbnail for other sources",
    allowImageType: false,
  },
  {
    key: "reals",   label: "Reels",        icon: Clapperboard, color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/30",     border: "border-pink-200 dark:border-pink-800",
    urlLabel: "Instagram Reels URL",
    urlPlaceholder: "https://www.instagram.com/reel/...",
    urlHint: "Paste the Instagram Reel link",
    allowImageType: false,
  },
  {
    key: "ads",     label: "Ads Earnings", icon: Megaphone,    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",   border: "border-amber-200 dark:border-amber-800",
    urlLabel: "Ad URL",
    urlPlaceholder: "https://...",
    urlHint: "Use a video link or an image URL",
    allowImageType: true,
  },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

// ─── YouTube URL helper ────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function thumbnailFor(asset: EarnAsset): string | null {
  if (asset.thumbnail_url) return asset.thumbnail_url;
  if (asset.asset_type === "video_link") {
    const id = extractYouTubeId(asset.url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }
  if (asset.asset_type === "image_url") return asset.url;
  return null;
}

// ─── Add / Edit form ───────────────────────────────────────────────────────
function AssetForm({
  category,
  existing,
  onDone,
}: {
  category: CategoryKey;
  existing?: EarnAsset;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [thumbUrl, setThumbUrl] = useState(existing?.thumbnail_url ?? "");
  const [assetType, setAssetType] = useState<"video_link" | "image_url">(
    (existing?.asset_type as "video_link" | "image_url") ?? "video_link"
  );
  const [sortOrder, setSortOrder] = useState(String(existing?.sort_order ?? 0));

  const createMut = useMutation({
    mutationFn: () => api.createEarnAsset({ category, title, url, thumbnail_url: thumbUrl || undefined, asset_type: assetType, sort_order: Number(sortOrder) }),
    onSuccess: () => { toast({ title: "Asset added" }); qc.invalidateQueries({ queryKey: ["admin-earn-assets", category] }); onDone(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: () => api.updateEarnAsset(existing!.id, { title, url, thumbnail_url: thumbUrl || undefined, asset_type: assetType, sort_order: Number(sortOrder) }),
    onSuccess: () => { toast({ title: "Asset updated" }); qc.invalidateQueries({ queryKey: ["admin-earn-assets", category] }); onDone(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const submit = () => {
    if (!title.trim() || !url.trim()) { toast({ title: "Title and URL are required", variant: "destructive" }); return; }
    existing ? updateMut.mutate() : createMut.mutate();
  };

  const cat = CATEGORIES.find(c => c.key === category)!;

  const previewThumb = thumbnailFor({ id: 0, category, title, url, thumbnail_url: thumbUrl || null, asset_type: assetType, sort_order: 0, is_active: true, created_at: "" });

  // Derive URL field label/placeholder based on category + type
  const urlLabel = assetType === "image_url" ? "Image URL" : cat.urlLabel;
  const urlPlaceholder = assetType === "image_url" ? "https://example.com/image.jpg" : cat.urlPlaceholder;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cat.bg} ${cat.border}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-foreground/70">
        {existing ? "Edit asset" : "Add new asset"}
      </p>

      {/* Type toggle — only for categories that allow images */}
      {cat.allowImageType && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssetType("video_link")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${assetType === "video_link" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"}`}
          >
            <Video className="w-3 h-3" /> Video Link
          </button>
          <button
            onClick={() => setAssetType("image_url")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${assetType === "image_url" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"}`}
          >
            <Image className="w-3 h-3" /> Image URL
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Title */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Funny Dance Reel"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* URL */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {urlLabel}
          </label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={urlPlaceholder}
              className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {/* YouTube-only: warn if the URL doesn't look like a valid YouTube link */}
          {category === "youtube" && assetType === "video_link" && url && !extractYouTubeId(url) && (
            <p className="text-[10px] text-destructive mt-1">Could not detect YouTube video ID — check the URL</p>
          )}
          {/* Hint text for non-YouTube categories */}
          {category !== "youtube" && assetType === "video_link" && (
            <p className="text-[10px] text-muted-foreground mt-1">{cat.urlHint}</p>
          )}
        </div>

        {/* Thumbnail (optional) */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Custom Thumbnail URL <span className="font-normal text-muted-foreground/60">(optional)</span>
          </label>
          <input
            value={thumbUrl}
            onChange={e => setThumbUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Preview */}
      {previewThumb && (
        <div className="flex items-center gap-3 pt-1">
          <img
            src={previewThumb}
            alt="preview"
            className="w-24 h-14 object-cover rounded-lg border border-border flex-shrink-0 bg-muted"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <p className="text-xs text-muted-foreground">Thumbnail preview</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onDone} className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-all disabled:opacity-50 hover:brightness-110"
        >
          {isPending
            ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {existing ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </div>
  );
}

// ─── Asset row ─────────────────────────────────────────────────────────────
function AssetRow({
  asset,
  category,
  onEdit,
}: {
  asset: EarnAsset;
  category: CategoryKey;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const deleteMut = useMutation({
    mutationFn: () => api.deleteEarnAsset(asset.id),
    onSuccess: () => { toast({ title: "Asset deleted" }); qc.invalidateQueries({ queryKey: ["admin-earn-assets", category] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: () => api.updateEarnAsset(asset.id, { is_active: !asset.is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-earn-assets", category] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const thumb = thumbnailFor(asset);

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-3 py-2.5 w-10 text-muted-foreground/30 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </td>
      <td className="px-3 py-2.5 w-20">
        {thumb ? (
          <img
            src={thumb}
            alt={asset.title}
            loading="lazy"
            className="w-16 h-10 object-cover rounded-lg border border-border bg-muted"
            onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).className = "w-16 h-10 rounded-lg bg-muted border border-border"; }}
          />
        ) : (
          <div className="w-16 h-10 rounded-lg bg-muted border border-border" />
        )}
      </td>
      <td className="px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground leading-tight">{asset.title}</p>
        <p className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">{asset.url}</p>
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${asset.asset_type === "video_link" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-orange-50 text-orange-600 border-orange-200"}`}>
          {asset.asset_type === "video_link" ? <Video className="w-2.5 h-2.5" /> : <Image className="w-2.5 h-2.5" />}
          {asset.asset_type === "video_link" ? "Video" : "Image"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{asset.sort_order}</td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => toggleMut.mutate()}
          disabled={toggleMut.isPending}
          title={asset.is_active ? "Active — click to hide" : "Hidden — click to show"}
          className="transition-colors"
        >
          {asset.is_active
            ? <Eye className="w-4 h-4 text-emerald-500 hover:text-emerald-600" />
            : <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
        </button>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${asset.title}"?`)) deleteMut.mutate(); }}
            disabled={deleteMut.isPending}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Category panel ────────────────────────────────────────────────────────
function CategoryPanel({ category }: { category: CategoryKey }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-earn-assets", category],
    queryFn: () => api.listEarnAssets(category),
  });

  const assets = data?.assets ?? [];
  const cat = CATEGORIES.find(c => c.key === category)!;
  const Icon = cat.icon;

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${cat.color}`} />
          <div>
            <h2 className="font-bold text-foreground">{cat.label}</h2>
            <p className="text-xs text-muted-foreground">{assets.length} asset{assets.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {category === "ads" ? "Ad" : "Video"}
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <AssetForm category={category} onDone={() => setAdding(false)} />
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Icon className={`w-8 h-8 opacity-30 ${cat.color}`} />
            <p className="text-sm">No assets yet — add your first one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="w-20 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Preview</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Title / URL</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Order</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Visible</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map(asset =>
                  editingId === asset.id ? (
                    <tr key={asset.id}>
                      <td colSpan={7} className="px-3 py-3">
                        <AssetForm
                          category={category}
                          existing={asset}
                          onDone={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      category={category}
                      onEdit={() => setEditingId(asset.id)}
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function TaskAssets() {
  const [activeTab, setActiveTab] = useState<CategoryKey>("tiktok");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Task Asset Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload and manage video links and ad images shown to users in "Earn with Fun". Changes are reflected in real-time via SSE.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-muted/40 border border-border rounded-xl p-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key as CategoryKey)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                active
                  ? `bg-card shadow-sm text-foreground border border-border`
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? cat.color : ""}`} />
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="sm:hidden">{cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}</span>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <CategoryPanel key={activeTab} category={activeTab} />
    </div>
  );
}
