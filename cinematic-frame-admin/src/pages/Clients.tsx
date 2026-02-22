import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Mail, Phone, Edit, Trash2, Loader2 } from "lucide-react";
import { getClients, createClient, updateClient, deleteClient } from "@/lib/api";
import { toast } from "sonner";

const avatarColors = [
  "bg-amber-900/50 text-amber-300",
  "bg-rose-900/50 text-rose-300",
  "bg-blue-900/50 text-blue-300",
  "bg-emerald-900/50 text-emerald-300",
  "bg-violet-900/50 text-violet-300",
  "bg-cyan-900/50 text-cyan-300",
  "bg-pink-900/50 text-pink-300",
  "bg-orange-900/50 text-orange-300",
];

const emptyForm = { name: "", email: "", phone: "", projectCount: 0, totalSpent: 0, status: "Active" };

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await getClients(search || undefined);
      if (res.success) setClients(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSearch = () => { setLoading(true); fetchClients(); };

  const openAdd = () => { setEditId(null); setForm(emptyForm); setSheetOpen(true); };
  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name, email: c.email, phone: c.phone || "", projectCount: c.projectCount || 0, totalSpent: parseFloat(c.totalSpent) || 0, status: c.status || "Active" });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, projectCount: Number(form.projectCount), totalSpent: Number(form.totalSpent) };
    try {
      if (editId) {
        const res = await updateClient(editId, payload);
        if (res.success) { toast.success("Client updated"); fetchClients(); setSheetOpen(false); }
      } else {
        const res = await createClient(payload);
        if (res.success) { toast.success("Client added"); fetchClients(); setSheetOpen(false); }
      }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this client?")) return;
    try {
      const res = await deleteClient(id);
      if (res.success) { toast.success("Client deleted"); setClients((prev) => prev.filter((c) => c.id !== id)); }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to delete"); }
  };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const formatSpent = (v: number | string) => `₹${Number(v).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <>
        <Header title="Clients" subtitle="Manage your client relationships" />
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <Header title="Clients" subtitle="Manage your client relationships" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." className="pl-9 w-72 bg-muted/50" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          </div>
          <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Client</Button>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Projects</TableHead>
                  <TableHead className="text-muted-foreground">Total Spent</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length > 0 ? clients.map((c, i) => (
                  <TableRow key={c.id} className="border-border/50 hover:bg-muted/20 cursor-pointer transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`text-xs font-semibold ${avatarColors[i % avatarColors.length]}`}>{getInitials(c.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>
                        {c.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border/50">{c.projectCount || 0} projects</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">{formatSpent(c.totalSpent)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.status === "Active" ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No clients found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add / Edit Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="bg-card border-border">
            <SheetHeader><SheetTitle className="font-display">{editId ? "Edit Client" : "Add Client"}</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Projects</Label><Input type="number" value={form.projectCount} onChange={(e) => setForm({ ...form, projectCount: Number(e.target.value) })} className="mt-1 bg-muted/50" /></div>
                <div><Label>Total Spent (₹)</Label><Input type="number" value={form.totalSpent} onChange={(e) => setForm({ ...form, totalSpent: Number(e.target.value) })} className="mt-1 bg-muted/50" /></div>
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <Button className="w-full" onClick={handleSave}>{editId ? "Save Changes" : "Add Client"}</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
