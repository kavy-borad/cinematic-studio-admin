import { useEffect, useState, useRef } from "react";
import { useUIStore } from "@/store/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Edit,
  Trash2,
  Star,
  Grid3X3,
  List,
  Loader2,
  Plus,
  ImagePlus,
  X,
  FolderOpen,
  Save,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  getPortfolio,
  addPortfolioItem,
  updatePortfolioItem,
  removePortfolioImage,
  deletePortfolioItem,
} from "@/lib/api";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────
const API_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const CATEGORIES = [
  "All",
  "Weddings",
  "Pre-Wedding",
  "Engagement",
  "Corporate",
  "Birthday",
  "Portraits",
  "Events",
  "Baby Shower",
  "Anniversary",
];

const colors = [
  "from-amber-900/40 to-amber-800/20",
  "from-rose-900/40 to-rose-800/20",
  "from-blue-900/40 to-blue-800/20",
  "from-emerald-900/40 to-emerald-800/20",
  "from-violet-900/40 to-violet-800/20",
  "from-cyan-900/40 to-cyan-800/20",
  "from-pink-900/40 to-pink-800/20",
  "from-orange-900/40 to-orange-800/20",
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

// ─── Default Form State ───────────────────────────────────────────────────────
const defaultForm = {
  title: "",
  slug: "",
  category: "Weddings",
  clientName: "",
  eventDate: "",
  description: "",
  featured: false,
};

// ─── Helper: resolve image src (local uploads vs. full URL) ─────────────────
function resolveImg(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const setHeaderInfo = useUIStore((s) => s.setHeaderInfo);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  // ── Add dialog state ──────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState(defaultForm);
  const [addCoverFile, setAddCoverFile] = useState<File | null>(null);
  const [addCoverPreview, setAddCoverPreview] = useState<string | null>(null);
  const [addGalleryFiles, setAddGalleryFiles] = useState<File[]>([]);
  const [addGalleryPreviews, setAddGalleryPreviews] = useState<string[]>([]);
  const addCoverRef = useRef<HTMLInputElement>(null);
  const addGalleryRef = useRef<HTMLInputElement>(null);

  // ── Edit dialog state ─────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [deletingImageUrl, setDeletingImageUrl] = useState<string | null>(null); // tracks which image is being deleted

  // New cover file for edit (null = keep existing)
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);

  // New gallery images to APPEND (previously saved images shown separately)
  const [editNewGalleryFiles, setEditNewGalleryFiles] = useState<File[]>([]);
  const [editNewGalleryPreviews, setEditNewGalleryPreviews] = useState<string[]>([]);

  const editCoverRef = useRef<HTMLInputElement>(null);
  const editGalleryRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Portfolio ────────────────────────────────────────────────────────
  const fetchPortfolio = async (category?: string) => {
    setLoading(true);
    try {
      const params = category && category !== "All" ? { category } : {};
      const res = await getPortfolio(params);
      if (res.success) setAlbums(res.data);
    } catch (error) {
      console.error("Failed to load portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setHeaderInfo("Portfolio", "Manage your photography collections");
  }, [setHeaderInfo]);

  useEffect(() => {
    fetchPortfolio(activeTab);
  }, [activeTab]);

  // ════════════════════════════════════════════════════════
  // ADD DIALOG HANDLERS
  // ════════════════════════════════════════════════════════

  const resetAddDialog = () => {
    setAddForm(defaultForm);
    setAddCoverFile(null);
    setAddCoverPreview(null);
    setAddGalleryFiles([]);
    setAddGalleryPreviews([]);
    if (addCoverRef.current) addCoverRef.current.value = "";
    if (addGalleryRef.current) addGalleryRef.current.value = "";
  };

  const openAddDialog = () => {
    resetAddDialog();
    setAddDialogOpen(true);
  };

  const handleAddCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddCoverFile(file);
    setAddCoverPreview(URL.createObjectURL(file));
  };

  const handleAddGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAddGalleryFiles((prev) => [...prev, ...files]);
    setAddGalleryPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    if (addGalleryRef.current) addGalleryRef.current.value = "";
  };

  const removeAddGallery = (idx: number) => {
    setAddGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
    setAddGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSubmit = async () => {
    if (!addForm.title.trim()) return toast.error("Title is required!");
    if (!addForm.category) return toast.error("Please select a category!");
    if (!addCoverFile) return toast.error("Please upload a cover photo!");

    const fd = new FormData();
    fd.append("title", addForm.title.trim());
    if (addForm.slug.trim()) fd.append("slug", addForm.slug.trim());
    fd.append("category", addForm.category);
    if (addForm.clientName.trim()) fd.append("clientName", addForm.clientName.trim());
    if (addForm.eventDate) fd.append("eventDate", addForm.eventDate);
    if (addForm.description.trim()) fd.append("description", addForm.description.trim());
    fd.append("featured", String(addForm.featured));
    fd.append("coverImage", addCoverFile);
    addGalleryFiles.forEach((f) => fd.append("images", f));

    setAddSubmitting(true);
    try {
      const res = await addPortfolioItem(fd);
      if (res.success) {
        toast.success(res.message || "Portfolio added successfully!");
        setAddDialogOpen(false);
        fetchPortfolio(activeTab);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error adding portfolio item!");
    } finally {
      setAddSubmitting(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // EDIT DIALOG HANDLERS
  // ════════════════════════════════════════════════════════

  const openEditDialog = (album: any) => {
    setEditingAlbum(album);
    setEditForm({
      title: album.title || "",
      slug: album.slug || "",
      category: album.category || "Weddings",
      clientName: album.clientName || "",
      eventDate: album.eventDate || "",
      description: album.description || "",
      featured: album.featured || false,
    });
    // Reset new-file states
    setEditCoverFile(null);
    setEditCoverPreview(null);
    setEditNewGalleryFiles([]);
    setEditNewGalleryPreviews([]);
    if (editCoverRef.current) editCoverRef.current.value = "";
    if (editGalleryRef.current) editGalleryRef.current.value = "";
    setEditDialogOpen(true);
  };

  const handleEditCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditCoverFile(file);
    setEditCoverPreview(URL.createObjectURL(file));
  };

  const handleEditGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setEditNewGalleryFiles((prev) => [...prev, ...files]);
    setEditNewGalleryPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    if (editGalleryRef.current) editGalleryRef.current.value = "";
  };

  const removeEditNewGallery = (idx: number) => {
    setEditNewGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
    setEditNewGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── DELETE /api/portfolio/:id/image ──────────────────────────────────────
  const handleRemoveExistingImage = async (imageUrl: string) => {
    if (!editingAlbum) return;
    if (!confirm("Are you sure you want to delete this image?")) return;

    setDeletingImageUrl(imageUrl);
    try {
      const res = await removePortfolioImage(editingAlbum.id, imageUrl);
      // Backend returns { message, portfolio: { id, images[] } }
      const updatedImages: string[] = res.portfolio?.images ?? [];

      toast.success(res.message || "Image deleted successfully!");

      // Update the editingAlbum so the gallery strip re-renders immediately
      setEditingAlbum((prev: any) => ({ ...prev, images: updatedImages }));

      // Also update the main albums list card (photo count badge)
      setAlbums((prev: any[]) =>
        prev.map((a) =>
          a.id === editingAlbum.id
            ? { ...a, images: updatedImages, photoCount: updatedImages.length }
            : a
        )
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error deleting image!"
      );
    } finally {
      setDeletingImageUrl(null);
    }
  };

  // ── PUT /api/portfolio/:id ─────────────────────────────────────────────────
  const handleEditSubmit = async () => {
    if (!editingAlbum) return;
    if (!editForm.title.trim()) return toast.error("Title is required!");
    if (!editForm.category) return toast.error("Please select a category!");

    const fd = new FormData();

    // Append only changed / provided fields
    fd.append("title", editForm.title.trim());
    fd.append("slug", editForm.slug.trim());
    fd.append("category", editForm.category);
    fd.append("clientName", editForm.clientName.trim());
    if (editForm.eventDate) fd.append("eventDate", editForm.eventDate);
    fd.append("description", editForm.description.trim());
    fd.append("featured", String(editForm.featured));

    // New cover (if selected)
    if (editCoverFile) fd.append("coverImage", editCoverFile);

    // New gallery images to APPEND
    editNewGalleryFiles.forEach((f) => fd.append("images", f));

    setEditSubmitting(true);
    try {
      const res = await updatePortfolioItem(editingAlbum.id, fd);
      // Backend returns { message, portfolio }
      const updated = res.portfolio ?? res.data;
      toast.success(res.message || "Portfolio updated successfully!");
      setEditDialogOpen(false);
      // Optimistically update local state
      setAlbums((prev) =>
        prev.map((a) => (a.id === editingAlbum.id ? { ...a, ...updated } : a))
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error updating portfolio item!"
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this portfolio item?")) return;
    try {
      const res = await deletePortfolioItem(id);
      if (res.success) {
        toast.success("Portfolio item deleted!");
        setAlbums((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const filteredAlbums =
    activeTab === "All"
      ? albums
      : albums.filter(
        (a) => a.category?.toLowerCase() === activeTab.toLowerCase()
      );

  // ─── Shared form section renderer (used by both add + edit dialogs) ────────
  const renderFormFields = (
    form: typeof defaultForm,
    setForm: (f: any) => void,
    mode: "add" | "edit"
  ) => {
    const pfx = mode;
    return (
      <div className="grid gap-5 py-2">
        {/* Row 1 – Title + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${pfx}-title`}>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${pfx}-title`}
              placeholder="e.g. Royal Engagement Ceremony"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${pfx}-category`}>
              Category <span className="text-destructive">*</span>
            </Label>
            <select
              id={`${pfx}-category`}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2 – Client Name + Event Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${pfx}-client`}>Client Name</Label>
            <Input
              id={`${pfx}-client`}
              placeholder="e.g. Rahul & Anjali"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${pfx}-date`}>Event Date</Label>
            <Input
              id={`${pfx}-date`}
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            />
          </div>
        </div>

        {/* Row 3 – Slug */}
        <div className="space-y-1.5">
          <Label htmlFor={`${pfx}-slug`}>
            Slug{" "}
            <span className="text-xs text-muted-foreground">
              (optional – auto-generated)
            </span>
          </Label>
          <Input
            id={`${pfx}-slug`}
            placeholder="e.g. royal-engagement-2026"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>

        {/* Row 4 – Description */}
        <div className="space-y-1.5">
          <Label htmlFor={`${pfx}-desc`}>Description</Label>
          <textarea
            id={`${pfx}-desc`}
            rows={3}
            placeholder="Short description about the album..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Featured toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`${pfx}-featured`}
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <Label htmlFor={`${pfx}-featured`} className="cursor-pointer">
            Mark as Featured{" "}
            <span className="text-xs text-muted-foreground">
              (Will be visible on the homepage)
            </span>
          </Label>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Hidden file inputs – Add */}
      <input ref={addCoverRef} type="file" accept="image/*" className="hidden" onChange={handleAddCoverChange} />
      <input ref={addGalleryRef} type="file" multiple accept="image/*" className="hidden" onChange={handleAddGalleryChange} />

      {/* Hidden file inputs – Edit */}
      <input ref={editCoverRef} type="file" accept="image/*" className="hidden" onChange={handleEditCoverChange} />
      <input ref={editGalleryRef} type="file" multiple accept="image/*" className="hidden" onChange={handleEditGalleryChange} />

      {/* Tabs + Action buttons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c} className="text-xs">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon"><Grid3X3 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><List className="h-4 w-4" /></Button>
            <Button size="sm" className="gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add Portfolio
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <FolderOpen className="h-12 w-12 opacity-30" />
              <p className="text-sm">No portfolio items found</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> Add First Album
              </Button>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredAlbums.map((album, i) => (
                <motion.div key={album.id} variants={item}>
                  <Card className="glass-card group overflow-hidden stat-card-hover cursor-pointer">
                    <div
                      className={`h-40 bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center relative overflow-hidden`}
                    >
                      {album.coverImage ? (
                        <img
                          src={resolveImg(album.coverImage)!}
                          alt={album.title}
                          className="w-full h-full object-cover absolute inset-0"
                        />
                      ) : (
                        <span className="text-4xl opacity-30">📷</span>
                      )}

                      {album.featured && (
                        <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground gap-1 text-xs z-10">
                          <Star className="h-3 w-3" /> Featured
                        </Badge>
                      )}

                      {/* ── Hover action buttons ─────────────────────── */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-background/80 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(album);
                          }}
                          title="Edit portfolio"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(album.id);
                          }}
                          title="Delete portfolio"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {album.title}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {album.photoCount || (album.images?.length ?? 0)} photos
                        </span>
                        <Badge variant="outline" className="text-xs border-border/50">
                          {album.category}
                        </Badge>
                      </div>
                      {album.clientName && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          👤 {album.clientName}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════
          ADD NEW PORTFOLIO DIALOG
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addDialogOpen} onOpenChange={(o) => { if (!addSubmitting) setAddDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ImagePlus className="h-5 w-5 text-primary" />
              Add New Portfolio Album
            </DialogTitle>
          </DialogHeader>

          {renderFormFields(addForm, setAddForm, "add")}

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>
              Cover Photo <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-1">(Photo shown on the main card)</span>
            </Label>
            <div
              onClick={() => addCoverRef.current?.click()}
              className="relative border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/60 transition-colors flex items-center gap-4 bg-muted/20"
            >
              {addCoverPreview ? (
                <img src={addCoverPreview} alt="cover-preview" className="h-20 w-28 object-cover rounded-lg" />
              ) : (
                <div className="h-20 w-28 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{addCoverPreview ? addCoverFile?.name : "Choose cover photo"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP – max 10 MB</p>
              </div>
            </div>
          </div>

          {/* Gallery Images */}
          <div className="space-y-2">
            <Label>
              Gallery Photos
              <span className="text-xs text-muted-foreground ml-1">(Photos visible in the View Story popup)</span>
            </Label>
            {addGalleryPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {addGalleryPreviews.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`gallery-${idx}`} className="h-16 w-20 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => removeAddGallery(idx)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 w-full border-dashed"
              onClick={() => addGalleryRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {addGalleryFiles.length > 0
                ? `${addGalleryFiles.length} photos selected – Add More`
                : "Choose Gallery Photos"}
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={addSubmitting}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={addSubmitting} className="gap-2 min-w-[140px]">
              {addSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><Plus className="h-4 w-4" /> Add Portfolio</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          EDIT PORTFOLIO DIALOG  →  PUT /api/portfolio/:id
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={(o) => { if (!editSubmitting) setEditDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5 text-primary" />
              Edit Portfolio Item
              {editingAlbum && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  (ID: {editingAlbum.id})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {renderFormFields(editForm, setEditForm, "edit")}

          {/* Current Cover Image + Replace */}
          <div className="space-y-2">
            <Label>
              Cover Photo
              <span className="text-xs text-muted-foreground ml-1">(Leave empty to keep current)</span>
            </Label>
            <div
              onClick={() => editCoverRef.current?.click()}
              className="relative border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/60 transition-colors flex items-center gap-4 bg-muted/20"
            >
              {/* Show new preview if chosen, else show existing */}
              {editCoverPreview ? (
                <img src={editCoverPreview} alt="new-cover" className="h-20 w-28 object-cover rounded-lg" />
              ) : editingAlbum?.coverImage ? (
                <img
                  src={resolveImg(editingAlbum.coverImage)!}
                  alt="current-cover"
                  className="h-20 w-28 object-cover rounded-lg opacity-80"
                />
              ) : (
                <div className="h-20 w-28 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">
                  {editCoverFile
                    ? `New: ${editCoverFile.name}`
                    : editingAlbum?.coverImage
                      ? "Current cover (click to replace)"
                      : "Choose cover photo"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP – max 10 MB</p>
              </div>
            </div>
          </div>

          {/* Existing gallery – DELETE /api/portfolio/:id/image */}
          {editingAlbum && Array.isArray(editingAlbum.images) && editingAlbum.images.length > 0 && (
            <div className="space-y-2">
              <Label>
                Existing Gallery
                <span className="text-xs text-muted-foreground ml-1 font-normal">
                  ({editingAlbum.images.length} photos — hover to remove)
                </span>
              </Label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {editingAlbum.images.map((url: string, idx: number) => {
                  const isDeleting = deletingImageUrl === url;
                  return (
                    <div key={url + idx} className="relative group shrink-0">
                      <img
                        src={resolveImg(url)!}
                        alt={`existing-${idx}`}
                        className={`h-16 w-20 object-cover rounded-lg border border-border transition-opacity ${isDeleting ? "opacity-30" : "opacity-80 group-hover:opacity-100"
                          }`}
                      />
                      {/* Spinner overlay while this image is being deleted */}
                      {isDeleting && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/40">
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                        </div>
                      )}
                      {/* Delete button – calls DELETE /api/portfolio/:id/image */}
                      {!isDeleting && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(url)}
                          disabled={!!deletingImageUrl}
                          title="Delete this image"
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:cursor-not-allowed"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 New photos added below will be <strong>appended</strong> to these, not replace them.
              </p>
            </div>
          )}

          {/* New Gallery Images to APPEND */}
          <div className="space-y-2">
            <Label>
              Add More Photos
              <span className="text-xs text-muted-foreground ml-1 font-normal">
                (Upload new images to add to the gallery)
              </span>
            </Label>
            {editNewGalleryPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {editNewGalleryPreviews.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`new-gallery-${idx}`} className="h-16 w-20 object-cover rounded-lg border border-primary/30" />
                    <button
                      type="button"
                      onClick={() => removeEditNewGallery(idx)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 w-full border-dashed"
              onClick={() => editGalleryRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {editNewGalleryFiles.length > 0
                ? `${editNewGalleryFiles.length} new photos selected`
                : "Choose New Gallery Photos"}
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editSubmitting}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting} className="gap-2 min-w-[140px]">
              {editSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
