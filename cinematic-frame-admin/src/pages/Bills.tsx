import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Eye, Trash2, Loader2, Save, X, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBill, deleteQuotation, getQuotations, updateQuotation } from "@/lib/api";

const statusColor: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Booked: "bg-green-500/10 text-green-500 border-green-500/20",
  Closed: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function Bills() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const hasValue = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  };

  const renderReadOnlyRow = (label: string, value: unknown, className?: string) => {
    if (!hasValue(value)) return null;

    return (
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={className || "text-sm text-right break-all"}>{String(value)}</span>
      </div>
    );
  };

  const parseNumber = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const raw = String(value ?? "").toLowerCase().trim();
    if (!raw) return 0;

    let cleaned = raw.replace(/,/g, "").replace(/₹|rs\.?/g, "").trim();
    let multiplier = 1;

    if (cleaned.includes("lakh") || /\d\s*l$/.test(cleaned)) {
      multiplier = 100000;
      cleaned = cleaned.replace(/lakhs?|l/g, "").trim();
    } else if (cleaned.includes("k")) {
      multiplier = 1000;
      cleaned = cleaned.replace(/k/g, "").trim();
    }

    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? Number((numeric * multiplier).toFixed(2)) : 0;
  };

  const getServicesArray = (servicesRequested: unknown): string[] => {
    if (Array.isArray(servicesRequested)) {
      return servicesRequested.map((s) => String(s).trim()).filter(Boolean);
    }

    if (typeof servicesRequested === "string") {
      const value = servicesRequested.trim();
      if (!value) return [];

      try {
        const parsed = value.startsWith("[") ? JSON.parse(value) : value.split(",");
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        return value.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    return [];
  };

  const getRequirementsMap = (requirements: unknown): Record<string, string> => {
    if (typeof requirements !== "string" || !requirements.trim()) return {};

    try {
      const parsed = requirements.trim().startsWith("{") ? JSON.parse(requirements) : { global: requirements };
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && String(value).trim()) {
            acc[key] = String(value).trim();
          }
          return acc;
        }, {} as Record<string, string>);
      }
    } catch {
      return { global: requirements.trim() };
    }

    return {};
  };

  const canGenerateBill = (quotation: any) => {
    if (!quotation) return false;
    const subtotal = parseNumber(quotation.budget);
    return subtotal > 0;
  };

  const buildBillPayload = (quotation: any) => {
    const services = getServicesArray(quotation.servicesRequested);
    const requirementsMap = getRequirementsMap(quotation.requirements);

    const subtotalBase = parseNumber(quotation.budget);
    const itemCount = Math.max(services.length, 1);
    const perItemPrice = itemCount > 0 ? Number((subtotalBase / itemCount).toFixed(2)) : 0;

    const items = (services.length > 0 ? services : [quotation.eventType || "Event Coverage"]).map((service) => ({
      service,
      deliverables: requirementsMap[service] || requirementsMap.global || "Professional coverage as discussed",
      price: perItemPrice,
    }));

    const subtotal = Number(items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2));
    const gstRate = parseNumber(quotation.gstRate) || 18;
    const taxAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    const advancePaid = 0;
    const balanceAmount = Number((totalAmount - advancePaid).toFixed(2));

    const dueDate = quotation.eventDate || undefined;

    return {
      quotationId: quotation.id,
      clientName: quotation.name,
      clientEmail: quotation.email,
      clientPhone: quotation.phone || undefined,
      clientAddress: quotation.city || undefined,
      eventType: quotation.eventType,
      eventDate: quotation.eventDate || undefined,
      items,
      subtotal,
      gstRate,
      taxAmount,
      totalAmount,
      advancePaid,
      balanceAmount,
      dueDate,
      status: "Unpaid" as const,
      notes: requirementsMap.global || undefined,
    };
  };

  const fetchQuotations = async () => {
    try {
      const res = await getQuotations("Booked");
      if (res.success) {
        setQuotations(res.data);
      }
    } catch (error) {
      console.error("Failed to load booked quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchQuotations();
  }, []);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await updateQuotation(selected.id, editForm);
      if (res.success) {
        toast.success("Bill details updated");
        setIsEditing(false);
        setQuotations((prev) => prev.map((q) => (q.id === selected.id ? { ...q, ...editForm } : q)));
        setSelected({ ...selected, ...editForm });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const res = await deleteQuotation(id);
      if (res.success) {
        toast.success("Bill deleted successfully");
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

  const handleGenerateBill = async (quotation: any) => {
    try {
      toast.info("Creating bill...");
      const payload = buildBillPayload(quotation);
      const res = await createBill(payload);

      if (res?.success) {
        const invoiceNo = res?.data?.invoiceNumber || "N/A";
        toast.success(`Bill created successfully (${invoiceNo})`);
        console.log("[Bills] POST /api/bills response:", res);
      } else {
        toast.error("Bill creation failed");
      }
    } catch (error: any) {
      console.error("[Bills] Failed to create bill:", error);
      toast.error(error?.response?.data?.message || "Failed to create bill.");
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Bills" subtitle="Manage and generate bills for booked quotations" />
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <Header title="Bills" subtitle="Manage and generate bills for booked quotations" />
      <div className="p-6 space-y-6">
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
                      className="border-border/50 transition-colors hover:bg-muted/20"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        B-{String(q.id).padStart(3, "0")}
                      </TableCell>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell className="text-sm">{q.eventType}</TableCell>
                      <TableCell className="font-semibold text-primary">{q.budget || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[q.status] || ""}>{q.status}</Badge></TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" className="h-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!canGenerateBill(q)}
                            title={!canGenerateBill(q) ? "Cannot generate bill with 0 total. Edit budget first." : ""}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateBill(q);
                            }}
                          >
                            <Receipt className="h-4 w-4 mr-1.5" />
                            Generate Bill
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            setSelected(q);
                            setIsEditing(false);
                            setIsModalOpen(true);
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No booked quotations found to generate bills</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3 -mt-2 space-y-0 text-left">
                <DialogTitle className="text-base font-sans font-semibold">Bill Details</DialogTitle>
                <div className="flex gap-1 pr-4">
                  <Button variant="outline" size="sm" className="h-7 border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canGenerateBill(selected)}
                    title={!canGenerateBill(selected) ? "Cannot generate bill with 0 total. Set a budget first." : ""}
                    onClick={() => handleGenerateBill(selected)}
                  >
                    <Receipt className="h-4 w-4 mr-1.5" />
                    Generate
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
                    <span className="text-sm font-mono">B-{String(selected.id).padStart(3, "0")}</span>
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

                        let reqs: any = {};
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

                        return (
                          <div className="col-span-3 border border-border/50 rounded-md p-3 space-y-4 bg-muted/5 mt-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block border-b border-border/30 pb-2">Services & Descriptions</span>
                            
                            <div className="space-y-3 pt-1">
                              {srvs.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">No services added yet.</span>
                              ) : (
                                srvs.map((srv, idx) => (
                                  <div key={idx} className="grid grid-cols-3 gap-2 items-start">
                                    <span className="text-xs font-semibold text-foreground text-right pt-2 pr-1">{srv}</span>
                                    <Textarea
                                      value={reqs[srv] || ""}
                                      onChange={(e) => {
                                        const newReqs = { ...reqs, [srv]: e.target.value };
                                        setEditForm({ ...editForm, requirements: JSON.stringify(newReqs) });
                                      }}
                                      placeholder={`Descriptions for ${srv}...`}
                                      className="col-span-2 text-sm min-h-[60px] bg-background"
                                    />
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 items-center pt-3 border-t border-border/30">
                              <span className="text-xs text-muted-foreground">Edit Services<br/><span className="text-[10px]">(Comma separated)</span></span>
                              <Input 
                                value={typeof editForm.servicesRequested === 'string' && editForm.servicesRequested.startsWith('[') ? srvs.join(', ') : (Array.isArray(editForm.servicesRequested) ? editForm.servicesRequested.join(', ') : (editForm.servicesRequested || ""))}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, servicesRequested: e.target.value.split(',').map(s => s.trim()) });
                                }}
                                className="col-span-2 h-8 text-sm bg-background"
                                placeholder="Photography, Cinematic Video"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Budget</span><Input name="budget" value={editForm.budget || ""} onChange={handleEditChange} className="col-span-2 h-7 text-sm" /></div>
                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">GST Rate (%)</span><Input type="number" name="gstRate" value={editForm.gstRate || ""} onChange={handleEditChange} placeholder="e.g. 18" className="col-span-2 h-7 text-sm" /></div>
                    </>
                  ) : (
                    <>
                      {renderReadOnlyRow("Client Name", selected.name, "text-sm font-medium")}
                      {renderReadOnlyRow("Email", selected.email, "text-sm break-all text-right")}
                      {renderReadOnlyRow("Phone", selected.phone)}
                      {renderReadOnlyRow("City", selected.city)}
                      {renderReadOnlyRow("Event Type", selected.eventType)}
                      {renderReadOnlyRow("Event Date", selected.eventDate)}
                      {renderReadOnlyRow("Venue", selected.venue)}
                      {renderReadOnlyRow("Guest Count", selected.guestCount)}
                      {renderReadOnlyRow("Budget", selected.budget, "text-sm font-semibold text-primary")}
                      {hasValue(selected.gstRate) && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">GST Rate</span>
                          <span className="text-sm font-semibold text-red-500">{selected.gstRate}%</span>
                        </div>
                      )}

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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
