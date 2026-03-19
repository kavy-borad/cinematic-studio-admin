import { useEffect, useState } from "react";
import { useUIStore } from "@/store/sidebar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Trash2, Loader2, Edit2, Save, X, Printer, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotificationStore } from "@/store/notifications";
import { useNavigate } from "react-router-dom";
import api, { getQuotations, updateQuotationStatus, deleteQuotation, updateQuotation, markQuotationAsRead } from "@/lib/api";

const statusColor: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Booked: "bg-green-500/10 text-green-500 border-green-500/20",
  Closed: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function Quotations() {
  const navigate = useNavigate();
  const setHeaderInfo = useUIStore((s) => s.setHeaderInfo);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  const fetchQuotations = async () => {
    try {
      const res = await getQuotations(filter, search);
      if (res.success) {
        setQuotations(res.data);
      }
    } catch (error) {
      console.error("Failed to load quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setHeaderInfo("Quotations", "Manage client inquiries and quotes");
  }, [setHeaderInfo]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchQuotations();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filter, search]);

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
      // Strip out blank service rows before saving to backend.
      const cleanedForm = { ...editForm };
      if (Array.isArray(cleanedForm.servicesRequested)) {
        cleanedForm.servicesRequested = cleanedForm.servicesRequested.filter(
          (s: string) => typeof s === 'string' && s.trim() !== ''
        );
      }
      const res = await updateQuotation(selected.id, cleanedForm);
      if (res.success) {
        toast.success("Quotation updated");
        setIsEditing(false);
        setQuotations((prev) => prev.map((q) => (q.id === selected.id ? { ...q, ...cleanedForm } : q)));
        setSelected({ ...selected, ...cleanedForm });
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
        if (selected?.id === id) {
          setSelected(null);
          setIsModalOpen(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const handleDownloadPDF = async (id: number) => {
    try {
      toast.info("Generating professional PDF...");
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Quotation_Q-${String(id).padStart(3, "0")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF Downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF. Make sure server is running.");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    );
  }

  return (
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by client name..." 
            className="pl-9 w-64 bg-muted/50 border-border/50 text-sm focus:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground">Event</TableHead>
                  <TableHead className="text-muted-foreground">Budget</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.length > 0 ? quotations.map((q) => (
                  <TableRow
                    key={q.id}
                    className={`border-border/50 transition-colors ${!q.isRead ? "bg-red-500/5 border-l-2 border-l-red-500" : ""} hover:bg-muted/20`}
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
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(q.id);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                          e.stopPropagation();
                          setSelected(q);
                          setIsEditing(false);
                          setIsModalOpen(true);
                          if (!q.isRead) {
                            markQuotationAsRead(q.id).catch(() => { });
                            setQuotations((prev) => prev.map((item) => item.id === q.id ? { ...item, isRead: true } : item));
                            removeNotification(q.id);
                          }
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
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
      </div>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3 -mt-2 space-y-0 text-left">
                <DialogTitle className="text-base font-sans font-semibold">Quotation Details</DialogTitle>
                <div className="flex gap-1 pr-4">
                  <Button variant="outline" size="icon" className="h-7 w-7 border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:bg-indigo-50"
                    onClick={() => handleDownloadPDF(selected.id)}
                    title="Generate Premium PDF / Print"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  {!isEditing ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditForm(selected); setIsEditing(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">ID</span>
                    <span className="text-sm font-mono">Q-{String(selected.id).padStart(3, "0")}</span>
                  </div>

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
                      
                      {(() => {
                        // Parse current services & descriptions from editForm
                        let srvs: string[] = [];
                        if (Array.isArray(editForm.servicesRequested)) {
                          srvs = editForm.servicesRequested;
                        } else if (typeof editForm.servicesRequested === 'string') {
                          try {
                            if (editForm.servicesRequested.startsWith('[')) {
                              srvs = JSON.parse(editForm.servicesRequested);
                            } else {
                              srvs = editForm.servicesRequested.split(',').map((s: string) => s.trim()).filter(Boolean);
                            }
                          } catch (e) {
                            srvs = editForm.servicesRequested.split(',').map((s: string) => s.trim()).filter(Boolean);
                          }
                        }

                        let reqs: Record<string, string> = {};
                        if (editForm.requirements) {
                          try {
                            if (editForm.requirements.startsWith('{')) {
                              reqs = JSON.parse(editForm.requirements);
                            } else {
                              reqs = { global: editForm.requirements };
                            }
                          } catch (e) {
                            reqs = { global: editForm.requirements };
                          }
                        }

                        // Build a working list: [{service, description}]
                        const rows = srvs.map(srv => ({ service: srv, description: reqs[srv] || '' }));

                        const commitRows = (updated: { service: string; description: string }[]) => {
                          const newReqs: Record<string, string> = {};
                          updated.forEach(r => { if (r.service.trim()) newReqs[r.service.trim()] = r.description; });
                          setEditForm((prev: any) => ({
                            ...prev,
                            servicesRequested: updated.map(r => r.service),
                            requirements: JSON.stringify(newReqs),
                          }));
                        };

                        const handleServiceNameChange = (idx: number, val: string) => {
                          const updated = rows.map((r, i) => i === idx ? { ...r, service: val } : r);
                          commitRows(updated);
                        };

                        const handleDescChange = (idx: number, val: string) => {
                          const updated = rows.map((r, i) => i === idx ? { ...r, description: val } : r);
                          commitRows(updated);
                        };

                        const addRow = () => {
                          commitRows([...rows, { service: '', description: '' }]);
                        };

                        const removeRow = (idx: number) => {
                          commitRows(rows.filter((_, i) => i !== idx));
                        };

                        return (
                          <div className="col-span-3 border border-border/50 rounded-md p-3 space-y-3 bg-muted/5 mt-2">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border/30 pb-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Services &amp; Descriptions
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 gap-1"
                                onClick={addRow}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Add Service
                              </Button>
                            </div>

                            {/* Rows */}
                            {rows.length === 0 ? (
                              <div className="flex flex-col items-center gap-2 py-3 text-center">
                                <span className="text-xs text-muted-foreground italic">No services added yet.</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs gap-1 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                                  onClick={addRow}
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                  Add First Service
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {rows.map((row, idx) => (
                                  <div key={idx} className="flex gap-2 items-start group">
                                    <Input
                                      value={row.service}
                                      onChange={(e) => handleServiceNameChange(idx, e.target.value)}
                                      placeholder="Service name"
                                      className="w-28 flex-shrink-0 h-8 text-xs font-semibold bg-background"
                                    />
                                    <Textarea
                                      value={row.description}
                                      onChange={(e) => handleDescChange(idx, e.target.value)}
                                      placeholder={`Description for ${row.service || 'this service'}...`}
                                      className="flex-1 text-sm min-h-[60px] bg-background resize-none"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeRow(idx)}
                                      title="Remove this service"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Budget</span><Input name="budget" value={editForm.budget || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">GST Rate (%)</span><Input type="number" name="gstRate" value={editForm.gstRate || ""} onChange={handleEditChange} placeholder="e.g. 18" className="col-span-2 h-7 text-sm" /></div>
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
                      {selected.gstRate && <div className="flex justify-between"><span className="text-xs text-muted-foreground">GST Rate</span><span className="text-sm font-semibold text-red-500">{selected.gstRate}%</span></div>}

                      {(selected.functions || (Array.isArray(selected.servicesRequested) && selected.servicesRequested.length > 0) || (typeof selected.servicesRequested === 'string' && selected.servicesRequested.length > 0) || selected.requirements) && (
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
                                    {(() => {
                                    let viewSrvs: string[] = [];
                                    if (Array.isArray(selected.servicesRequested)) {
                                        viewSrvs = selected.servicesRequested;
                                    } else if (typeof selected.servicesRequested === 'string') {
                                        try {
                                        if (selected.servicesRequested.startsWith('[')) {
                                            viewSrvs = JSON.parse(selected.servicesRequested);
                                        } else {
                                            viewSrvs = selected.servicesRequested.split(',').map((s: string) => s.trim());
                                        }
                                        } catch (e) {
                                        viewSrvs = selected.servicesRequested.split(',').map((s: string) => s.trim());
                                        }
                                    }
                                    return viewSrvs.map((srv, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">{srv}</Badge>);
                                    })()}
                                </div>
                            </div>
                          )}

                          {selected.requirements && (
                            <div className="pt-2 border-t border-border/50 mt-2">
                                <span className="text-xs text-muted-foreground block mb-2">Service Descriptions</span>
                                <div className="space-y-3 bg-muted/10 p-3 rounded-md border border-border/30">
                                {(() => {
                                    try {
                                    if (selected.requirements.startsWith('{')) {
                                        const reqs = JSON.parse(selected.requirements);
                                        const entries = Object.entries(reqs).filter(([_, desc]) => Boolean(desc));
                                        if (entries.length === 0) return <span className="text-xs text-muted-foreground">No descriptions added</span>;
                                        return entries.map(([srv, desc]: any, i) => (
                                        <div key={i} className="grid grid-cols-3 gap-2 items-start py-1">
                                            <span className="font-semibold text-xs text-foreground text-right pr-2">{srv}</span>
                                            <div className="col-span-2 whitespace-pre-wrap text-muted-foreground text-sm">{desc}</div>
                                        </div>
                                        ));
                                    } else {
                                        return <span className="text-sm whitespace-pre-wrap">{selected.requirements}</span>;
                                    }
                                    } catch (e) {
                                    return <span className="text-sm whitespace-pre-wrap">{selected.requirements}</span>;
                                    }
                                })()}
                                </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Status</span><Badge variant="outline" className={statusColor[selected.status] || ""}>{selected.status}</Badge></div>
                </div>

                <div className="flex gap-2 flex-wrap">
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
