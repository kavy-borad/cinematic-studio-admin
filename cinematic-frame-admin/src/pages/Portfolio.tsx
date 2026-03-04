import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { getPortfolio, addPortfolioItem, deletePortfolioItem } from "@/lib/api";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────
const API_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

// Dynamic categories – admin can pass any of these (all lowercase sent to backend)
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
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);

  // File previews
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Portfolio ───────────────────────────────────────────────────────
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
    fetchPortfolio(activeTab);
  }, [activeTab]);

  // ─── Cover Image Handler ───────────────────────────────────────────────────
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  // ─── Gallery Images Handler ────────────────────────────────────────────────
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setGalleryPreviews((prev) => [...prev, ...previews]);
    // Reset input so same files can be re-added after removal
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const removeGalleryImage = (idx: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Reset Dialog ─────────────────────────────────────────────────────────
  const resetDialog = () => {
    setForm(defaultForm);
    setCoverFile(null);
    setCoverPreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const openDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  // ─── Submit: POST /api/portfolio ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Title required hai!");
      return;
    }
    if (!form.category) {
      toast.error("Category select karo!");
      return;
    }
    if (!coverFile) {
      toast.error("Cover photo upload karo!");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    if (form.slug.trim()) formData.append("slug", form.slug.trim());
    formData.append("category", form.category);
    if (form.clientName.trim()) formData.append("clientName", form.clientName.trim());
    if (form.eventDate) formData.append("eventDate", form.eventDate);
    if (form.description.trim()) formData.append("description", form.description.trim());

    // ── Files ──────────────────────────────────────────────────────────────
    formData.append("coverImage", coverFile);                    // single cover
    galleryFiles.forEach((f) => formData.append("images", f));  // gallery photos

    setSubmitting(true);
    try {
      const res = await addPortfolioItem(formData);
      if (res.success) {
        toast.success(res.message || "Portfolio added successfully!");
        setDialogOpen(false);
        fetchPortfolio(activeTab);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Portfolio add karne mein error aaya!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Kya aap is portfolio item ko delete karna chahte hain?")) return;
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Header title="Portfolio" subtitle="Manage your photography collections" />
      <div className="p-6 space-y-6">
        {/* Hidden file inputs */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleGalleryChange}
        />

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
              <Button variant="ghost" size="icon">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <List className="h-4 w-4" />
              </Button>
              {/* ── Add New Portfolio Button ────────────────────────── */}
              <Button size="sm" className="gap-2" onClick={openDialog}>
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
                <p className="text-sm">Koi portfolio item nahi mila</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={openDialog}
                >
                  <Plus className="h-4 w-4" /> Pehla Album Add Karo
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
                        className={`h-40 bg-gradient-to-br ${colors[i % colors.length]
                          } flex items-center justify-center relative overflow-hidden`}
                      >
                        {album.coverImage ? (
                          <img
                            src={
                              album.coverImage.startsWith("http")
                                ? album.coverImage
                                : `${API_URL}${album.coverImage}`
                            }
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

                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-background/80 hover:bg-background"
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
                          <Badge
                            variant="outline"
                            className="text-xs border-border/50"
                          >
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
      </div>

      {/* ─── Add New Portfolio Dialog ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!submitting) setDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ImagePlus className="h-5 w-5 text-primary" />
              Naya Portfolio Album Add Karo
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* Row 1 – Title + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pf-title"
                  placeholder="e.g. Royal Engagement Ceremony"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="pf-category"
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
                <Label htmlFor="pf-client">Client Name</Label>
                <Input
                  id="pf-client"
                  placeholder="e.g. Rahul & Anjali"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-date">Event Date</Label>
                <Input
                  id="pf-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
            </div>

            {/* Row 3 – Slug + Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pf-slug">
                Slug{" "}
                <span className="text-xs text-muted-foreground">
                  (optional – auto-generate hoga)
                </span>
              </Label>
              <Input
                id="pf-slug"
                placeholder="e.g. royal-engagement-2026"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pf-desc">Description</Label>
              <textarea
                id="pf-desc"
                rows={3}
                placeholder="Album ke baare mein short description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>
                Cover Photo <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground ml-1">
                  (Card pe dikhne wali photo)
                </span>
              </Label>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="relative border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/60 transition-colors flex items-center gap-4 bg-muted/20"
              >
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="cover-preview"
                    className="h-20 w-28 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-20 w-28 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {coverPreview ? coverFile?.name : "Cover photo choose karo"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, WebP – max 10 MB
                  </p>
                </div>
              </div>
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <Label>
                Gallery Photos
                <span className="text-xs text-muted-foreground ml-1">
                  (View Story mein dikhne wali photos)
                </span>
              </Label>

              {galleryPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {galleryPreviews.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`gallery-${idx}`}
                        className="h-16 w-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
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
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                {galleryFiles.length > 0
                  ? `${galleryFiles.length} photos selected – Aur Add Karo`
                  : "Gallery Photos Choose Karo"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Portfolio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
