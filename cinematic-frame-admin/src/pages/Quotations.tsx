import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getQuotations, updateQuotationStatus, deleteQuotation } from "@/lib/api";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  New: "bg-info/20 text-info border-info/30",
  Contacted: "bg-warning/20 text-warning border-warning/30",
  Booked: "bg-success/20 text-success border-success/30",
  Closed: "bg-muted text-muted-foreground border-border/30",
};

export default function Quotations() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

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
                      className={`border-border/50 cursor-pointer transition-colors ${selected?.id === q.id ? "bg-muted/40" : "hover:bg-muted/20"}`}
                      onClick={() => setSelected(q)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">Q-{String(q.id).padStart(3, "0")}</TableCell>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell className="text-sm">{q.eventType}</TableCell>
                      <TableCell className="font-semibold text-primary">{q.budget || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[q.status] || ""}>{q.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelected(q); }}>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-sans font-semibold">Quotation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">ID</span><span className="text-sm font-mono">Q-{String(selected.id).padStart(3, "0")}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Client</span><span className="text-sm font-medium">{selected.name}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Email</span><span className="text-sm">{selected.email}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Phone</span><span className="text-sm">{selected.phone || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Event</span><span className="text-sm">{selected.eventType}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Date</span><span className="text-sm">{selected.eventDate || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Venue</span><span className="text-sm">{selected.venue || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Budget</span><span className="text-sm font-semibold text-primary">{selected.budget || "-"}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Status</span><Badge variant="outline" className={statusColor[selected.status] || ""}>{selected.status}</Badge></div>
                  </div>
                  {selected.requirements && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Requirements</p>
                      <p className="text-sm text-foreground/80">{selected.requirements}</p>
                    </div>
                  )}
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
