import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Trash2, Loader2, Edit2, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { getQuotations, updateQuotationStatus, deleteQuotation, updateQuotation, markQuotationAsRead } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotificationStore } from "@/store/notifications";


const statusColor: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Booked: "bg-green-500/10 text-green-500 border-green-500/20",
  Closed: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function Quotations() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const removeNotification = useNotificationStore((s) => s.removeNotification);


  const fetchQuotations = async () => {
    try {
      const res = await getQuotations(filter);
      if (res.success) {
        setQuotations(res.data);
        if (res.data.length > 0 && !selected) setSelected(res.data[0]);
      }
    } catch (error) {
      console.error("Failed to load quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchQuotations();
  }, [filter]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await updateQuotationStatus(id, status);
      if (res.success) {
        toast.success(`Status updated to ${status}`);
        setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
        if (selected?.id === id) setSelected({ ...selected, status });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await updateQuotation(selected.id, editForm);
      if (res.success) {
        toast.success("Quotation updated");
        setIsEditing(false);
        setQuotations((prev) => prev.map((q) => (q.id === selected.id ? { ...q, ...editForm } : q)));
        setSelected({ ...selected, ...editForm });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      const res = await deleteQuotation(id);
      if (res.success) {
        toast.success("Quotation deleted");
        setQuotations((prev) => prev.filter((q) => q.id !== id));
        if (selected?.id === id) setSelected(quotations[0] || null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Quotations" subtitle="Manage client inquiries and quotes" />
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <Header title="Quotations" subtitle="Manage client inquiries and quotes" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["All", "New", "Contacted", "Booked", "Closed"].map((f) => (
              <Badge key={f} variant="outline"
                className={`cursor-pointer hover:bg-muted/50 transition-colors px-3 py-1 ${filter === f ? "bg-primary/20 text-primary border-primary/40" : ""}`}
                onClick={() => setFilter(f)}>
                {f}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Client</TableHead>
                    <TableHead className="text-muted-foreground">Event</TableHead>
                    <TableHead className="text-muted-foreground">Budget</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.length > 0 ? quotations.map((q) => (
                    <TableRow
                      key={q.id}
                      className={`border-border/50 cursor-pointer transition-colors ${!q.isRead ? "bg-red-500/5 border-l-2 border-l-red-500" : ""} ${selected?.id === q.id ? "bg-muted/40" : "hover:bg-muted/20"}`}
                      onClick={() => { setSelected(q); setIsEditing(false); if (!q.isRead) { markQuotationAsRead(q.id).catch(() => { }); setQuotations((prev) => prev.map((item) => item.id === q.id ? { ...item, isRead: true } : item)); removeNotification(q.id); } }}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {!q.isRead && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                          Q-{String(q.id).padStart(3, "0")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell className="text-sm">{q.eventType}</TableCell>
                      <TableCell className="font-semibold text-primary">{q.budget || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[q.status] || ""}>{q.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelected(q); setIsEditing(false); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quotations found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detail Panel */}
          {selected && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={selected.id}>
              <Card className="glass-card sticky top-20">
                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/50">
                  <CardTitle className="text-base font-sans font-semibold">Quotation Details</CardTitle>
                  {!isEditing ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditForm(selected); setIsEditing(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">ID</span><span className="text-sm font-mono">Q-{String(selected.id).padStart(3, "0")}</span></div>

                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Client Name</span><Input name="name" value={editForm.name || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Email</span><Input name="email" value={editForm.email || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Phone</span><Input name="phone" value={editForm.phone || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">City</span><Input name="city" value={editForm.city || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Event Type</span><Input name="eventType" value={editForm.eventType || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Event Date</span><Input name="eventDate" type="date" value={editForm.eventDate || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Venue</span><Input name="venue" value={editForm.venue || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Guest Count</span><Input name="guestCount" value={editForm.guestCount || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground items-start pt-1">Functions</span><Textarea name="functions" value={editForm.functions || ""} onChange={handleEditChange} className="col-span-2 text-sm min-h-[60px]" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Services (comma separated)</span><Input name="servicesRequested" value={Array.isArray(editForm.servicesRequested) ? editForm.servicesRequested.join(', ') : (editForm.servicesRequested || "")} onChange={(e) => setEditForm({ ...editForm, servicesRequested: e.target.value.split(',').map((s: string) => s.trim()) })} className="col-span-2 h-7 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Budget</span><Input name="budget" value={editForm.budget || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Client Name</span><span className="text-sm font-medium">{selected.name}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Email</span><span className="text-sm break-all text-right">{selected.email}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Phone</span><span className="text-sm">{selected.phone || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">City</span><span className="text-sm">{selected.city || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Event Type</span><span className="text-sm">{selected.eventType}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Event Date</span><span className="text-sm">{selected.eventDate || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Venue</span><span className="text-sm">{selected.venue || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Guest Count</span><span className="text-sm">{selected.guestCount || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-muted-foreground">Budget</span><span className="text-sm font-semibold text-primary">{selected.budget || "-"}</span></div>

                        {(selected.functions || (Array.isArray(selected.servicesRequested) && selected.servicesRequested.length > 0) || (typeof selected.servicesRequested === 'string' && selected.servicesRequested.length > 0)) && (
                          <div className="py-2 my-2 border-y border-border/50 space-y-2">
                            {selected.functions && (
                              <div>
                                <span className="text-xs text-muted-foreground block mb-1">Functions</span>
                                <span className="text-sm">{selected.functions}</span>
                              </div>
                            )}
                            {selected.servicesRequested && (Array.isArray(selected.servicesRequested) ? selected.servicesRequested.length > 0 : String(selected.servicesRequested).length > 0) && (
                              <div>
                                <span className="text-xs text-muted-foreground block mb-1">Services Requested</span>
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(selected.servicesRequested) ? selected.servicesRequested.map((srv: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">{srv}</Badge>
                                  )) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">{String(selected.servicesRequested)}</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>

                    )}
                    <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Status</span><Badge variant="outline" className={statusColor[selected.status] || ""}>{selected.status}</Badge></div>
                  </div>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {selected.status !== "Contacted" && (
                      <Button size="sm" className="flex-1" onClick={() => handleStatusChange(selected.id, "Contacted")}>Mark Contacted</Button>
                    )}
                    {selected.status !== "Booked" && (
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleStatusChange(selected.id, "Booked")}>Mark Booked</Button>
                    )}
                    {selected.status !== "Closed" && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleStatusChange(selected.id, "Closed")}>Close</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
