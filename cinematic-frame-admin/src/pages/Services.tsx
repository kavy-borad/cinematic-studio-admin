import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Edit, Camera, Video, Plane, Trash2,
  Plus, Loader2, Upload, X, ImagePlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { getServices, addService, updateService, deleteService } from "@/lib/api";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const iconMap: Record<string, React.ElementType> = { Camera, Video, Plane };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// ─── Helper: resolve image URL ────────────────────────────────────────────────
function resolveImg(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// ─── Default Form ─────────────────────────────────────────────────────────────
const emptyForm = {
  title: "",
  slug: "",
  description: "",
  shortDescription: "",
  startingPrice: "",
  features: "",        // comma-separated string in UI
  isActive: true,
  popular: false,
  icon: "Camera",
  duration: "",
  packageName: "",
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Thumbnail file state
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [existingThumb, setExistingThumb] = useState<string | null>(null); // current saved thumb when editing
  const thumbRef = useRef<HTMLInputElement>(null);

  // ─── Fetch all services ──────────────────────────────────────────────────
  const fetchServices = async () => {
    try {
      const res = await getServices();
      if (res.success) setServices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const standalone = services.filter((s) => !s.packageName);
  const packages = services.filter((s) => s.packageName);

  // ─── Open Add sheet ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setThumbFile(null);
    setThumbPreview(null);
    setExistingThumb(null);
    setSheetOpen(true);
  };

  // ─── Open Edit sheet ─────────────────────────────────────────────────────
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      title: s.title || "",
      slug: s.slug || "",
      description: s.description || "",
      shortDescription: s.shortDescription || "",
      startingPrice: s.startingPrice || "",
      features: Array.isArray(s.features) ? s.features.join(", ") : "",
      isActive: s.isActive !== false,
      popular: s.popular || false,
      icon: s.icon || "Camera",
      duration: s.duration || "",
      packageName: s.packageName || "",
    });
    setThumbFile(null);
    setThumbPreview(null);
    setExistingThumb(s.thumbnail || null);
    setSheetOpen(true);
  };

  // ─── Thumbnail file handler ──────────────────────────────────────────────
  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const clearThumb = () => {
    setThumbFile(null);
    setThumbPreview(null);
    if (thumbRef.current) thumbRef.current.value = "";
  };

  // ─── Build FormData from form state ─────────────────────────────────────
  const buildFormData = (): FormData => {
    const fd = new FormData();

    fd.append("title", form.title.trim());
    if (form.slug.trim()) fd.append("slug", form.slug.trim());
    if (form.description.trim()) fd.append("description", form.description.trim());
    if (form.shortDescription.trim()) fd.append("shortDescription", form.shortDescription.trim());
    if (form.startingPrice.trim()) fd.append("startingPrice", form.startingPrice.trim());
    if (form.duration.trim()) fd.append("duration", form.duration.trim());
    if (form.icon.trim()) fd.append("icon", form.icon.trim());
    if (form.packageName.trim()) fd.append("packageName", form.packageName.trim());

    fd.append("isActive", String(form.isActive));
    fd.append("popular", String(form.popular));

    // Features – send as JSON string array
    const featuresArr = form.features
      ? form.features.split(",").map((f) => f.trim()).filter(Boolean)
      : [];
    fd.append("features", JSON.stringify(featuresArr));

    // Thumbnail file (only if new one selected)
    if (thumbFile) fd.append("thumbnail", thumbFile);

    return fd;
  };

  // ─── POST /api/services ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title required hai!");
      return;
    }

    setSubmitting(true);
    try {
      const fd = buildFormData();

      if (editId) {
        // PUT /api/services/:id
        const res = await updateService(editId, fd);
        if (res.success) {
          toast.success(res.message || "Service updated!");
          fetchServices();
          setSheetOpen(false);
        }
      } else {
        // POST /api/services
        const res = await addService(fd);
        if (res.success) {
          toast.success(res.message || "Service created successfully!");
          fetchServices();
          setSheetOpen(false);
        }
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE /api/services/:id ────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    try {
      const res = await deleteService(id);
      if (res.success) {
        toast.success("Service deleted!");
        setServices((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Services & Pricing" subtitle="Manage your service offerings" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Services & Pricing" subtitle="Manage your service offerings" />

      {/* Hidden thumbnail input */}
      <input
        ref={thumbRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleThumbChange}
      />

      <div className="p-6 space-y-8">

        {/* ── Services Table ────────────────────────────────────────────── */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-sans font-semibold">Services</CardTitle>
              <Button size="sm" className="gap-2" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Thumbnail</TableHead>
                  <TableHead className="text-muted-foreground">Service</TableHead>
                  <TableHead className="text-muted-foreground">Short Desc</TableHead>
                  <TableHead className="text-muted-foreground">Starting Price</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standalone.length > 0 ? standalone.map((s) => {
                  const Icon = iconMap[s.icon] || Camera;
                  const thumbUrl = resolveImg(s.thumbnail);
                  return (
                    <TableRow key={s.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                      {/* Thumbnail */}
                      <TableCell>
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={s.title}
                            className="h-10 w-14 object-cover rounded-lg border border-border"
                          />
                        ) : (
                          <div className="h-10 w-14 rounded-lg bg-primary/10 flex items-center justify-center border border-border">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </TableCell>

                      {/* Title */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{s.title}</span>
                          {s.slug && (
                            <span className="text-[10px] text-muted-foreground font-mono">/{s.slug}</span>
                          )}
                          {s.popular && (
                            <Badge className="mt-1 text-[10px] w-fit bg-primary/20 text-primary border-primary/30" variant="outline">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Short Description */}
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        <span className="line-clamp-2">{s.shortDescription || s.description || "—"}</span>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="font-semibold text-primary">
                        {s.startingPrice || "—"}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${s.isActive !== false
                              ? "border-green-500/40 text-green-500 bg-green-500/10"
                              : "border-muted text-muted-foreground"
                            }`}
                        >
                          {s.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => handleDelete(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No services found. Add your first service!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Packages Grid ─────────────────────────────────────────────── */}
        {packages.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-semibold mb-4">Packages</h2>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {packages.map((pkg) => {
                const isGold = pkg.packageName?.toLowerCase() === "gold";
                const thumbUrl = resolveImg(pkg.thumbnail);
                return (
                  <motion.div key={pkg.id} variants={itemAnim}>
                    <Card className={`glass-card stat-card-hover relative overflow-hidden ${isGold ? "border-primary/40 gold-glow" : ""}`}>
                      {isGold && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                          MOST POPULAR
                        </div>
                      )}
                      {thumbUrl && (
                        <img src={thumbUrl} alt={pkg.packageName} className="w-full h-32 object-cover" />
                      )}
                      <CardContent className="p-6">
                        <h3 className="font-display text-xl font-semibold">{pkg.packageName}</h3>
                        <p className="text-2xl font-bold text-primary mt-2">{pkg.startingPrice || "—"}</p>
                        {pkg.shortDescription && (
                          <p className="text-xs text-muted-foreground mt-1">{pkg.shortDescription}</p>
                        )}
                        <p className="text-xs text-muted-foreground mb-4">per event</p>
                        <ul className="space-y-2">
                          {(pkg.features || []).map((f: string) => (
                            <li key={f} className="text-sm text-foreground/80 flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2 mt-6">
                          <Button className="flex-1" variant={isGold ? "default" : "secondary"} onClick={() => openEdit(pkg)}>
                            Edit Package
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDelete(pkg.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ADD / EDIT SERVICE SHEET
          POST /api/services  or  PUT /api/services/:id
      ════════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!submitting) setSheetOpen(o); }}>
        <SheetContent className="bg-card border-border overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display flex items-center gap-2">
              {editId ? <><Edit className="h-4 w-4 text-primary" /> Edit Service</> : <><Plus className="h-4 w-4 text-primary" /> Add Service</>}
              {editId && <span className="text-xs text-muted-foreground font-normal">(ID: {editId})</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">

            {/* ── Thumbnail Upload ─────────────────────────────────── */}
            <div className="space-y-2">
              <Label>
                Thumbnail Image
                <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </Label>
              <div
                onClick={() => thumbRef.current?.click()}
                className="relative border-2 border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary/60 transition-colors flex items-center gap-3 bg-muted/20"
              >
                {/* Preview: new file > existing saved > placeholder */}
                {thumbPreview ? (
                  <img src={thumbPreview} alt="new-thumb" className="h-16 w-20 object-cover rounded-lg shrink-0" />
                ) : existingThumb ? (
                  <img src={resolveImg(existingThumb)!} alt="current-thumb" className="h-16 w-20 object-cover rounded-lg opacity-80 shrink-0" />
                ) : (
                  <div className="h-16 w-20 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {thumbFile
                      ? thumbFile.name
                      : existingThumb
                        ? "Current thumbnail (click to replace)"
                        : "Click to upload thumbnail"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP – max 10 MB</p>
                </div>
                {(thumbPreview || thumbFile) && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearThumb(); }}
                    className="shrink-0 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Title ────────────────────────────────────────────── */}
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1 bg-muted/50"
                placeholder="e.g. Maternity Photoshoot"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* ── Slug ─────────────────────────────────────────────── */}
            <div>
              <Label>
                Slug
                <span className="text-xs text-muted-foreground ml-1">(auto-generated if empty)</span>
              </Label>
              <Input
                className="mt-1 bg-muted/50"
                placeholder="e.g. maternity-photoshoot"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>

            {/* ── Short Description ─────────────────────────────────── */}
            <div>
              <Label>Short Description</Label>
              <Input
                className="mt-1 bg-muted/50"
                placeholder="e.g. Celebrate your journey to motherhood."
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              />
            </div>

            {/* ── Description ───────────────────────────────────────── */}
            <div>
              <Label>Full Description</Label>
              <Textarea
                className="mt-1 bg-muted/50 resize-none"
                rows={3}
                placeholder="Detailed description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* ── Starting Price + Duration ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Starting Price</Label>
                <Input
                  className="mt-1 bg-muted/50"
                  placeholder="e.g. ₹15,000"
                  value={form.startingPrice}
                  onChange={(e) => setForm({ ...form, startingPrice: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration</Label>
                <Input
                  className="mt-1 bg-muted/50"
                  placeholder="e.g. 2 Hours"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
            </div>

            {/* ── Icon + Package Name ───────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Input
                  className="mt-1 bg-muted/50"
                  placeholder="Camera / Video / Plane"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
              </div>
              <div>
                <Label>Package Name</Label>
                <Input
                  className="mt-1 bg-muted/50"
                  placeholder="Silver / Gold / Platinum"
                  value={form.packageName}
                  onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                />
              </div>
            </div>

            {/* ── Features ─────────────────────────────────────────── */}
            <div>
              <Label>
                Features
                <span className="text-xs text-muted-foreground ml-1">(comma separated)</span>
              </Label>
              <Input
                className="mt-1 bg-muted/50"
                placeholder="2 Outfit Changes, 20 Edited Photos, 2 Hours Shoot"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </div>

            {/* ── Flags ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="svc-active"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="svc-active" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="svc-popular"
                  checked={form.popular}
                  onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="svc-popular" className="cursor-pointer">Mark as Popular</Label>
              </div>
            </div>

            {/* ── Save Button ───────────────────────────────────────── */}
            <Button className="w-full gap-2 mt-2" onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {editId ? "Saving..." : "Creating..."}</>
              ) : editId ? (
                <><Edit className="h-4 w-4" /> Save Changes</>
              ) : (
                <><ImagePlus className="h-4 w-4" /> Create Service</>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
