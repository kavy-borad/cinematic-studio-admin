import { useEffect, useState } from "react";
import { useUIStore } from "@/store/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Eye, Trash2, Loader2, Save, X, Receipt, PlusCircle, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createBill, deleteQuotation, getQuotations, updateQuotation, getBills, updateBill, updateBillStatus, downloadBillPDF, deleteBill } from "@/lib/api";

const statusColor: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Booked: "bg-green-500/10 text-green-500 border-green-500/20",
  Closed: "bg-red-500/10 text-red-500 border-red-500/20",
  Unpaid: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Paid: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function Bills() {
  const setHeaderInfo = useUIStore((s) => s.setHeaderInfo);
  const [activeTab, setActiveTab] = useState("quotations"); // 'quotations' | 'bills'
  const [quotations, setQuotations] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isBillEditing, setIsBillEditing] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editBillForm, setEditBillForm] = useState<any>({});

  // ── Create Bill Manually ────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const defaultCreateForm = () => ({
    clientName: '', clientEmail: '', clientPhone: '', clientAddress: '',
    eventType: '', eventDate: '', dueDate: '', notes: '',
    gstRate: 18, advancePaid: 0, status: 'Unpaid' as const,
    items: [{ service: '', deliverables: '', price: '', quantity: 1 }],
  });
  const [createForm, setCreateForm] = useState<any>(defaultCreateForm());

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: "quotation" | "bill" } | null>(null);

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

    let multiplier = 1;
    if (raw.includes("lakh") || /\d\s*l$/.test(raw)) {
      multiplier = 100000;
    } else if (raw.includes("k")) {
      multiplier = 1000;
    }

    const match = raw.match(/[\d,]+\.?\d*/); 
    if (!match) return 0;

    let cleaned = match[0].replace(/,/g, "");
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
    return !!quotation;
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
      quantity: 1,
      amount: perItemPrice,
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
      venue: quotation.venue || undefined,
      guestCount: quotation.guestCount || undefined,
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
    }
  };

  const fetchBills = async () => {
    try {
      const res = await getBills();
      if (res.success) {
        setBills(res.data);
      }
    } catch (error) {
      console.error("Failed to load unpaid bills:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchQuotations(), fetchBills()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    try {
      // Strip blank service rows before saving to backend
      const cleanedForm = { ...editForm };
      if (Array.isArray(cleanedForm.servicesRequested)) {
        cleanedForm.servicesRequested = cleanedForm.servicesRequested.filter(
          (s: string) => typeof s === 'string' && s.trim() !== ''
        );
      }
      const res = await updateQuotation(selected.id, cleanedForm);
      if (res.success) {
        toast.success("Quotation details updated");
        setIsEditing(false);
        setQuotations((prev) => prev.map((q) => (q.id === selected.id ? { ...q, ...cleanedForm } : q)));
        setSelected({ ...selected, ...cleanedForm });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update");
    }
  };

  const handleBillEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditBillForm({ ...editBillForm, [e.target.name]: e.target.value });
  };

  const handleSaveBillEdit = async () => {
    try {
      const payload: any = {
        clientName: editBillForm.clientName,
        clientEmail: editBillForm.clientEmail,
        clientPhone: editBillForm.clientPhone,
        eventType: editBillForm.eventType,
        status: editBillForm.status,
      };

      if (editBillForm.advancePaid !== undefined) {
        payload.advancePaid = parseNumber(editBillForm.advancePaid);
      }

      const res = await updateBill(selectedBill.id, payload);
      if (res.success) {
        toast.success("Bill updated successfully");
        setIsBillEditing(false);
        setBills((prev) => prev.map((q) => (q.id === selectedBill.id ? res.data : q)));
        setSelectedBill(res.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update bill");
    }
  };

  const handleQuickStatusUpdate = async (billId: number, newStatus: string) => {
    toast.loading("Updating status", { id: "status_update" });
    try {
      const res = await updateBillStatus(billId, newStatus);
      if (res.success) {
        setBills((prev) =>
          prev.map((b) => (b.id === billId ? { ...b, ...res.data } : b))
        );
        toast.success(`Bill status updated to ${newStatus}`, { id: "status_update" });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status", { id: "status_update" });
    }
  };

  const handleDelete = (id: number) => {
    setDeleteTarget({ id, type: "quotation" });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteBill = (id: number) => {
    setDeleteTarget({ id, type: "bill" });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    setDeleteConfirmOpen(false);

    try {
      if (type === "quotation") {
        const res = await deleteQuotation(id);
        if (res.success) {
          toast.success("Quotation deleted successfully");
          setQuotations((prev) => prev.filter((q) => q.id !== id));
          if (selected?.id === id) {
            setSelected(null);
            setIsModalOpen(false);
          }
        }
      } else {
        const res = await deleteBill(id);
        if (res.success) {
          toast.success("Bill deleted successfully");
          setBills((prev) => prev.filter((b) => b.id !== id));
          if (selectedBill?.id === id) {
            setSelectedBill(null);
            setIsBillModalOpen(false);
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to delete ${type}`);
    } finally {
      setDeleteTarget(null);
    }
  };


  const handleGenerateBill = async (quotation: any) => {
    try {
      const payload = buildBillPayload(quotation);
      const res = await createBill(payload);

      if (res?.success) {
        const invoiceNo = res?.data?.invoiceNumber || "N/A";
        const billId = res?.data?.id;
        
        if (billId) {
          try {
            await downloadBillPDF(billId, invoiceNo);
            toast.success("PDF Downloaded", { icon: <Download className="h-4 w-4" /> });
          } catch (error) {
            toast.error("Bill created but PDF download failed");
          }
        } else {
          toast.success(`Bill ${invoiceNo} created successfully`);
        }

        await Promise.all([fetchQuotations(), fetchBills()]);
      } else {
        toast.error("Failed to create bill");
      }
    } catch (error: any) {
      console.error("[Bills] Failed to create bill:", error);
      toast.error(error?.response?.data?.message || "Error generating bill");
    }
  };

  // ── Manual Bill Creation ─────────────────────────────────────────────────────
  const computedTotals = (items: any[], gstRate: number) => {
    const subtotal = items.reduce((s, it) => {
      const p = parseNumber(it.price) || 0;
      const q = Number(it.quantity) || 1;
      return s + (p * q);
    }, 0);
    const taxAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    return { subtotal: Number(subtotal.toFixed(2)), taxAmount, totalAmount };
  };

  const handleCreateBill = async () => {
    const { clientName, clientEmail, eventType, items, gstRate, advancePaid, status, clientPhone, clientAddress, eventDate, dueDate, notes, venue, guestCount } = createForm;
    if (!clientName.trim()) return toast.error('Client name is required.');
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clientEmail)) return toast.error('Valid client email is required.');
    if (!eventType.trim()) return toast.error('Event type is required.');
    const validItems = items.filter((it: any) => it.service.trim() && parseNumber(it.price) > 0);
    if (validItems.length === 0) return toast.error('At least one item with a service name and price > 0 is required.');

    const { subtotal, taxAmount, totalAmount } = computedTotals(validItems, Number(gstRate) || 18);
    const finalAdvance = parseNumber(advancePaid) || 0;
    const balanceAmount = Number((totalAmount - finalAdvance).toFixed(2));

    setIsCreating(true);
    try {
      const payload = {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientPhone: clientPhone?.trim() || undefined,
        clientAddress: clientAddress?.trim() || undefined,
        eventType: eventType.trim(),
        eventDate: eventDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes?.trim() || undefined,
        items: validItems.map((it: any) => ({
          service: it.service.trim(),
          deliverables: it.deliverables?.trim() || '',
          price: parseNumber(it.price),
          quantity: Number(it.quantity) || 1,
          amount: Number((parseNumber(it.price) * (Number(it.quantity) || 1)).toFixed(2)),
        })),
        subtotal, gstRate: Number(gstRate) || 18, taxAmount, totalAmount,
        advancePaid: finalAdvance, balanceAmount,
        status,
        venue: venue?.trim() || undefined,
        guestCount: guestCount?.trim() || undefined,
      };
      const res = await createBill(payload);
      if (res?.success) {
        const invoiceNo = res.data?.invoiceNumber || '';
        toast.success(`Bill created: ${invoiceNo}`);
        setIsCreateModalOpen(false);
        setCreateForm(defaultCreateForm());

        const billId = res.data?.id;
        if (billId) {
          toast.loading("Generating PDF", { id: `download-${billId}` });
          try {
            await downloadBillPDF(billId, invoiceNo);
            toast.success("Bill downloaded", { id: `download-${billId}` });
          } catch (error) {
            toast.error("Download failed", { id: `download-${billId}` });
          }
        }

        await Promise.all([fetchQuotations(), fetchBills()]);
        setActiveTab('bills');
      } else {
        toast.error(res?.message || 'Failed to create bill.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create bill.');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    setHeaderInfo("Billing & Documents", "Manage and generate bills for booked quotations");
  }, [setHeaderInfo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex bg-muted/30 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("quotations")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === "quotations"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Pending Quotations
            </button>
            <button
              onClick={() => setActiveTab("bills")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === "bills"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              All Bills
            </button>
          </div>

          {/* ── Create Bill Manually button */}
          <Button
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => { setCreateForm(defaultCreateForm()); setIsCreateModalOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Create Bill
          </Button>
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
                    <TableHead className="text-muted-foreground">{activeTab === "bills" ? "Amount" : "Budget"}</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                {activeTab === "quotations" ? (
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
                            <Button variant="outline" size="sm" className="h-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateBill(q);
                              }}
                            >
                              <Download className="h-4 w-4 mr-1.5" />
                              Download Bill
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
                ) : (
                  <TableBody>
                    {bills.length > 0 ? bills.map((b) => (
                      <TableRow
                        key={b.id}
                        className="border-border/50 transition-colors hover:bg-muted/20"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {b.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium">{b.clientName}</TableCell>
                        <TableCell className="text-sm">{b.eventType}</TableCell>
                        <TableCell className="font-semibold text-primary">₹{b.totalAmount || "0"}</TableCell>
                        <TableCell>
                          <select
                            value={b.status || ""}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleQuickStatusUpdate(b.id, e.target.value);
                            }}
                            className={`flex h-7 w-[130px] rounded-md border text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 px-2 py-1 cursor-pointer font-medium ${b.status === "Paid" ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                b.status === "Unpaid" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                  b.status === "Partially Paid" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                    b.status === "Overdue" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                      b.status === "Cancelled" ? "bg-gray-500/10 text-gray-600 border-gray-500/20" : ""
                              }`}
                          >
                            <option value="Unpaid" className="text-foreground bg-background">Unpaid</option>
                            <option value="Partially Paid" className="text-foreground bg-background">Partially Paid</option>
                            <option value="Paid" className="text-foreground bg-background">Paid</option>
                            <option value="Overdue" className="text-foreground bg-background">Overdue</option>
                            <option value="Cancelled" className="text-foreground bg-background">Cancelled</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" className="h-8 text-primary border-primary/20 hover:bg-primary/10" onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await downloadBillPDF(b.id, b.invoiceNumber);
                              toast.success("PDF Downloaded", { icon: <Download className="h-4 w-4" /> });
                            } catch (error) {
                              toast.error("Failed to download invoice. Please try again.");
                            }
                          }}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Download
                          </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBill(b);
                              setEditBillForm(b);
                              setIsBillEditing(false);
                              setIsBillModalOpen(true);
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteBill(b.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bills found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                )}
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
                <DialogTitle className="text-base font-sans font-semibold">Pending Quotation Details</DialogTitle>
                <div className="flex gap-1 pr-4">
                  <Button variant="outline" size="sm" className="h-7 border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:bg-indigo-50"
                    onClick={() => handleGenerateBill(selected)}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
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

                        // Build working rows list including blank new rows
                        const rows = srvs.map(srv => ({ service: srv, description: reqs[srv] || '' }));

                        const commitRows = (updated: { service: string; description: string }[]) => {
                          const newReqs: Record<string, string> = {};
                          updated.forEach(r => { if (r.service.trim()) newReqs[r.service.trim()] = r.description; });
                          setEditForm((prev: any) => ({
                            ...prev,
                            servicesRequested: updated.map(r => r.service), // keep blanks so new rows stay
                            requirements: JSON.stringify(newReqs),
                          }));
                        };

                        const handleServiceNameChange = (idx: number, val: string) => {
                          commitRows(rows.map((r, i) => i === idx ? { ...r, service: val } : r));
                        };

                        const handleDescChange = (idx: number, val: string) => {
                          commitRows(rows.map((r, i) => i === idx ? { ...r, description: val } : r));
                        };

                        const addRow = () => commitRows([...rows, { service: '', description: '' }]);
                        const removeRow = (idx: number) => commitRows(rows.filter((_, i) => i !== idx));

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

      {/* Actual Bill Details Modal */}
      <Dialog open={isBillModalOpen} onOpenChange={(open) => { setIsBillModalOpen(open); if (!open) setIsBillEditing(false); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedBill && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3 -mt-2 space-y-0 text-left">
                <DialogTitle className="text-base font-sans font-semibold">Generated Bill Invoice</DialogTitle>
                <div className="flex gap-1 pr-4">
                  <Button variant="outline" size="sm" className="h-7 border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:bg-indigo-50"
                    onClick={async () => {
                      toast.loading("Generating PDF", { id: `download-modal-${selectedBill.id}` });
                      try {
                        await downloadBillPDF(selectedBill.id, selectedBill.invoiceNumber);
                        toast.success("Bill downloaded successfully", { id: `download-modal-${selectedBill.id}` });
                      } catch (error) {
                        toast.error("Failed to download bill", { id: `download-modal-${selectedBill.id}` });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
                  </Button>
                  {!isBillEditing ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditBillForm(selectedBill); setIsBillEditing(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleSaveBillEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setIsBillEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Invoice No.</span>
                    <span className="text-sm font-mono">{selectedBill.invoiceNumber}</span>
                  </div>

                  {isBillEditing ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Client Name</span><Input name="clientName" value={editBillForm.clientName || ""} onChange={handleBillEditChange} className="col-span-2 h-7 text-sm" /></div>
                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Advance Paid (₹)</span><Input name="advancePaid" type="number" value={editBillForm.advancePaid || ""} onChange={handleBillEditChange} className="col-span-2 h-7 text-sm" /></div>
                      <div className="grid grid-cols-3 gap-2 items-center"><span className="text-xs text-muted-foreground">Status</span>
                        <select name="status" value={editBillForm.status || ""} onChange={handleBillEditChange as any} className="col-span-2 flex h-7 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                          <option value="Unpaid">Unpaid</option>
                          <option value="Partially Paid">Partially Paid</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {renderReadOnlyRow("Client Name", selectedBill.clientName, "text-sm font-medium")}
                      {renderReadOnlyRow("Email", selectedBill.clientEmail, "text-sm break-all text-right")}
                      {renderReadOnlyRow("Phone", selectedBill.clientPhone)}
                      {renderReadOnlyRow("Event Type", selectedBill.eventType)}
                      {renderReadOnlyRow("Venue", selectedBill.venue)}
                      {renderReadOnlyRow("Guest Count", selectedBill.guestCount)}

                      <div className="py-2 border-y border-border/50 my-2 space-y-2">
                        {renderReadOnlyRow("Subtotal", "₹" + selectedBill.subtotal)}
                        {renderReadOnlyRow(`Tax (${selectedBill.gstRate}%)`, "₹" + selectedBill.taxAmount)}
                        {renderReadOnlyRow("Total Amount", "₹" + selectedBill.totalAmount, "text-sm font-semibold")}
                        {renderReadOnlyRow("Advance Paid", "₹" + selectedBill.advancePaid, "text-sm font-semibold text-green-600")}
                        {renderReadOnlyRow("Balance Due", "₹" + selectedBill.balanceAmount, "text-sm font-semibold text-red-500")}
                      </div>

                      {Array.isArray(selectedBill.items) && selectedBill.items.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Items</span>
                          <div className="space-y-2">
                            {selectedBill.items.map((item: any, i: number) => {
                              const p = Number(item.price) || 0;
                              const q = Number(item.quantity) || 1;
                              const amt = Number(item.amount) || (p * q);
                              return (
                                <div key={i} className="flex justify-between items-start text-xs border border-border/30 p-2 rounded bg-muted/10">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-foreground truncate">{item.service}</div>
                                    {item.deliverables && <div className="text-muted-foreground mt-0.5 line-clamp-2" title={item.deliverables}>{item.deliverables}</div>}
                                  </div>
                                  <div className="text-right pl-3 flex-shrink-0">
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                      ₹{p.toLocaleString('en-IN')} × {q}
                                    </div>
                                    <div className="font-semibold text-primary">
                                      ₹{amt.toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Status</span><Badge variant="outline" className={statusColor[selectedBill.status] || ""}>{selectedBill.status}</Badge></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ────── Create Bill Manually Dialog ───────────────────────────── */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) setCreateForm(defaultCreateForm()); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/50 pb-3 -mt-2">
            <DialogTitle className="text-base font-semibold">Create Bill Manually</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Client Info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Client Name *</label>
                  <Input value={createForm.clientName} onChange={e => setCreateForm((p: any) => ({ ...p, clientName: e.target.value }))} placeholder="e.g. Priya Sharma" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email *</label>
                  <Input type="email" value={createForm.clientEmail} onChange={e => setCreateForm((p: any) => ({ ...p, clientEmail: e.target.value }))} placeholder="client@email.com" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input value={createForm.clientPhone} onChange={e => setCreateForm((p: any) => ({ ...p, clientPhone: e.target.value }))} placeholder="+91 98765 43210" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">City / Address</label>
                  <Input value={createForm.clientAddress} onChange={e => setCreateForm((p: any) => ({ ...p, clientAddress: e.target.value }))} placeholder="Delhi" className="h-8 text-sm" />
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Event Type *</label>
                  <Input value={createForm.eventType} onChange={e => setCreateForm((p: any) => ({ ...p, eventType: e.target.value }))} placeholder="Wedding Photography" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Event Date</label>
                  <Input type="date" value={createForm.eventDate} onChange={e => setCreateForm((p: any) => ({ ...p, eventDate: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <Input type="date" value={createForm.dueDate} onChange={e => setCreateForm((p: any) => ({ ...p, dueDate: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Venue</label>
                  <Input value={createForm.venue} onChange={e => setCreateForm((p: any) => ({ ...p, venue: e.target.value }))} placeholder="e.g. Grand Hyatt" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Guest Count</label>
                  <Input value={createForm.guestCount} onChange={e => setCreateForm((p: any) => ({ ...p, guestCount: e.target.value }))} placeholder="e.g. 500" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select value={createForm.status} onChange={e => setCreateForm((p: any) => ({ ...p, status: e.target.value }))} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services / Items *</p>
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1"
                  onClick={() => setCreateForm((p: any) => ({ ...p, items: [...p.items, { service: '', deliverables: '', price: '', quantity: 1 }] }))}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1.5fr_70px_80px_100px_32px] gap-2 px-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Service</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Description</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Qty</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Price</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Amount</span>
                  <span></span>
                </div>

                {createForm.items.map((item: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-[1fr_1.5fr_70px_80px_100px_32px] gap-2 items-start group">
                    <Input
                      value={item.service}
                      onChange={e => setCreateForm((p: any) => { const items = [...p.items]; items[idx] = { ...items[idx], service: e.target.value }; return { ...p, items }; })}
                      placeholder="Photography"
                      className="h-8 text-xs"
                    />
                    <Textarea
                      value={item.deliverables}
                      onChange={e => setCreateForm((p: any) => { const items = [...p.items]; items[idx] = { ...items[idx], deliverables: e.target.value }; return { ...p, items }; })}
                      placeholder="Notes..."
                      className="min-h-[32px] h-8 text-xs resize-none py-1.5"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => setCreateForm((p: any) => { const items = [...p.items]; items[idx] = { ...items[idx], quantity: e.target.value }; return { ...p, items }; })}
                      placeholder="1"
                      min="1"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      value={item.price}
                      onChange={e => setCreateForm((p: any) => { const items = [...p.items]; items[idx] = { ...items[idx], price: e.target.value }; return { ...p, items }; })}
                      placeholder="0"
                      min="0"
                      className="h-8 text-xs"
                    />
                    <div className="h-8 flex items-center justify-end text-xs font-semibold pr-1">
                      ₹{((parseNumber(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString('en-IN')}
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setCreateForm((p: any) => ({ ...p, items: p.items.filter((_: any, i: number) => i !== idx) }))}
                      disabled={createForm.items.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials summary + GST + advance */}
            {(() => {
              const { subtotal, taxAmount, totalAmount } = computedTotals(
                createForm.items.filter((it: any) => it.service.trim() && parseNumber(it.price) > 0),
                Number(createForm.gstRate) || 18
              );
              const balance = Number((totalAmount - (parseNumber(createForm.advancePaid) || 0)).toFixed(2));
              return (
                <div className="space-y-3 bg-muted/10 rounded-md p-3 border border-border/40">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">GST Rate (%)</label>
                      <Input type="number" value={createForm.gstRate} onChange={e => setCreateForm((p: any) => ({ ...p, gstRate: e.target.value }))} min="0" max="100" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Advance Paid (₹)</label>
                      <Input type="number" value={createForm.advancePaid} onChange={e => setCreateForm((p: any) => ({ ...p, advancePaid: e.target.value }))} min="0" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-border/30 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span className="font-medium text-foreground">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tax ({createForm.gstRate || 18}% GST)</span><span className="font-medium text-foreground">₹{taxAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span><span className="text-primary">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className={`font-semibold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>₹{balance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Textarea value={createForm.notes} onChange={e => setCreateForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes for this bill..." className="text-sm min-h-[60px]" />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <Button variant="outline" size="sm" onClick={() => { setIsCreateModalOpen(false); setCreateForm(defaultCreateForm()); }}>Cancel</Button>
              <Button size="sm" onClick={handleCreateBill} disabled={isCreating} className="gap-1.5">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                {isCreating ? 'Creating...' : 'Create Bill'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteTarget?.type} 
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
