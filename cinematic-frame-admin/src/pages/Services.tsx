import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Edit, IndianRupee, Camera, Video, Plane, Trash2, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getServices, addService, updateService, deleteService } from "@/lib/api";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = { Camera, Video, Plane };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const emptyForm = { name: "", description: "", icon: "Camera", price: "", duration: "", popular: false, features: "", packageName: "" };

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const openAdd = () => { setEditId(null); setForm(emptyForm); setSheetOpen(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      name: s.name || "", description: s.description || "", icon: s.icon || "Camera",
      price: String(s.price || ""), duration: s.duration || "", popular: s.popular || false,
      features: (s.features || []).join(", "), packageName: s.packageName || "",
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name, description: form.description, icon: form.icon,
      price: parseFloat(form.price) || 0, duration: form.duration, popular: form.popular,
      features: form.features ? form.features.split(",").map((f) => f.trim()).filter(Boolean) : [],
      packageName: form.packageName || undefined,
    };
    try {
      if (editId) {
        const res = await updateService(editId, payload);
        if (res.success) { toast.success("Service updated"); fetchServices(); setSheetOpen(false); }
      } else {
        const res = await addService(payload);
        if (res.success) { toast.success("Service added"); fetchServices(); setSheetOpen(false); }
      }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    try {
      const res = await deleteService(id);
      if (res.success) { toast.success("Service deleted"); setServices((prev) => prev.filter((s) => s.id !== id)); }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to delete"); }
  };

  const formatPrice = (p: number) => `₹${Number(p).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <>
        <Header title="Services & Pricing" subtitle="Manage your service offerings" />
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <Header title="Services & Pricing" subtitle="Manage your service offerings" />
      <div className="p-6 space-y-8">
        {/* Services Table */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-sans font-semibold">Services</CardTitle>
              <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Service</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Service</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Duration</TableHead>
                  <TableHead className="text-muted-foreground">Price</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standalone.length > 0 ? standalone.map((s) => {
                  const Icon = iconMap[s.icon] || Camera;
                  return (
                    <TableRow key={s.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium">{s.name}</span>
                            {s.popular && <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-primary/30" variant="outline">Popular</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.description || "-"}</TableCell>
                      <TableCell className="text-sm">{s.duration || "-"}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatPrice(s.price)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No services found. Add your first service!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Packages */}
        {packages.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-semibold mb-4">Packages</h2>
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isGold = pkg.packageName?.toLowerCase() === "gold";
                return (
                  <motion.div key={pkg.id} variants={item}>
                    <Card className={`glass-card stat-card-hover relative overflow-hidden ${isGold ? "border-primary/40 gold-glow" : ""}`}>
                      {isGold && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                          MOST POPULAR
                        </div>
                      )}
                      <CardContent className="p-6">
                        <h3 className="font-display text-xl font-semibold">{pkg.packageName}</h3>
                        <p className="text-3xl font-bold text-primary mt-2">{formatPrice(pkg.price)}</p>
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
                          <Button className="flex-1" variant={isGold ? "default" : "secondary"} onClick={() => openEdit(pkg)}>Edit Package</Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDelete(pkg.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        {/* Add / Edit Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="bg-card border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display">{editId ? "Edit Service" : "Add Service"}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 bg-muted/50" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 bg-muted/50" /></div>
                <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="mt-1 bg-muted/50" placeholder="e.g. 4-5 hrs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Icon</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="mt-1 bg-muted/50" placeholder="Camera / Video / Plane" /></div>
                <div><Label>Package Name</Label><Input value={form.packageName} onChange={(e) => setForm({ ...form, packageName: e.target.value })} className="mt-1 bg-muted/50" placeholder="Silver / Gold / Platinum" /></div>
              </div>
              <div><Label>Features (comma separated)</Label><Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="mt-1 bg-muted/50" placeholder="feature1, feature2" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="popular" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
                <Label htmlFor="popular">Mark as Popular</Label>
              </div>
              <Button className="w-full" onClick={handleSave}>{editId ? "Save Changes" : "Add Service"}</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
