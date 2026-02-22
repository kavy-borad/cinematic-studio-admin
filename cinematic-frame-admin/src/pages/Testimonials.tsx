import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Check, X, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getAllTestimonials, approveTestimonial, rejectTestimonial, deleteTestimonial } from "@/lib/api";
import { toast } from "sonner";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const fetchTestimonials = async () => {
    try {
      const res = await getAllTestimonials();
      if (res.success) setTestimonials(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTestimonials(); }, []);

  const handleApprove = async (id: number) => {
    try {
      const res = await approveTestimonial(id);
      if (res.success) {
        toast.success("Testimonial approved");
        setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, approved: true } : t)));
      }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to approve"); }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await rejectTestimonial(id);
      if (res.success) {
        toast.success("Testimonial rejected");
        setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, approved: false } : t)));
      }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to reject"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      const res = await deleteTestimonial(id);
      if (res.success) {
        toast.success("Testimonial deleted");
        setTestimonials((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to delete"); }
  };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const filtered = filter === "all" ? testimonials
    : filter === "approved" ? testimonials.filter((t) => t.approved)
    : testimonials.filter((t) => !t.approved);

  if (loading) {
    return (
      <>
        <Header title="Testimonials" subtitle="Client reviews and feedback" />
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <Header title="Testimonials" subtitle="Client reviews and feedback" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className={`px-3 py-1 cursor-pointer hover:bg-muted/50 ${filter === "all" ? "bg-primary/20 text-primary border-primary/40" : ""}`}
            onClick={() => setFilter("all")}>All ({testimonials.length})</Badge>
          <Badge variant="outline" className={`px-3 py-1 cursor-pointer hover:bg-muted/50 ${filter === "approved" ? "bg-success/10 text-success border-success/30" : ""}`}
            onClick={() => setFilter("approved")}>Approved ({testimonials.filter(t => t.approved).length})</Badge>
          <Badge variant="outline" className={`px-3 py-1 cursor-pointer hover:bg-muted/50 ${filter === "pending" ? "bg-warning/10 text-warning border-warning/30" : ""}`}
            onClick={() => setFilter("pending")}>Pending ({testimonials.filter(t => !t.approved).length})</Badge>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">No testimonials found</div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <motion.div key={t.id} variants={item}>
                <Card className="glass-card stat-card-hover h-full">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{getInitials(t.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.event || "General"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={t.approved ? "bg-success/20 text-success border-success/30 text-[10px]" : "bg-warning/20 text-warning border-warning/30 text-[10px]"}>
                        {t.approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>

                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < t.rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>

                    <p className="text-sm text-foreground/80 flex-1 leading-relaxed">"{t.text}"</p>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <div className="flex gap-1">
                        {!t.approved && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-success hover:text-success" onClick={() => handleApprove(t.id)}>
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                        )}
                        {t.approved && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-warning hover:text-warning" onClick={() => handleReject(t.id)}>
                            <X className="h-3 w-3" /> Unapprove
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
