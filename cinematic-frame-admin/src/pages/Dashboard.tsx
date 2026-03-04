import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Users, CheckCircle, IndianRupee, Plus, Calendar, Camera, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboardStats, getRevenueChart } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const statusColor: Record<string, string> = {
  New: "bg-info/20 text-info border-info/30",
  Contacted: "bg-warning/20 text-warning border-warning/30",
  Booked: "bg-success/20 text-success border-success/30",
  Closed: "bg-muted text-muted-foreground border-border/30",
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const iconMap: Record<string, React.ElementType> = {
  "Total Inquiries": FileText,
  "Active Projects": Camera,
  "Completed Projects": CheckCircle,
  Revenue: IndianRupee,
};

const colorMap: Record<string, string> = {
  "Total Inquiries": "text-info",
  "Active Projects": "text-warning",
  "Completed Projects": "text-success",
  Revenue: "text-primary",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [upcomingShoots, setUpcomingShoots] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, chartRes] = await Promise.all([
          getDashboardStats(),
          getRevenueChart(),
        ]);

        if (statsRes.success) {
          setStatsData(statsRes.data);
          setRecentQuotations(statsRes.data.recentQuotations || []);
          setUpcomingShoots(statsRes.data.upcomingShoots || []);
        }
        if (chartRes.success) {
          setRevenueData(chartRes.data.map((d: any) => ({
            month: d.month,
            bookings: parseInt(d.count) || 0,
          })));
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Welcome back, Cinematic Frame" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const stats = [
    { label: "Total Inquiries", value: statsData?.totalInquiries ?? 0 },
    { label: "Active Projects", value: statsData?.activeProjects ?? 0 },
    { label: "Completed Projects", value: statsData?.completedProjects ?? 0 },
    { label: "Revenue", value: `₹${(statsData?.totalRevenue ?? 0).toLocaleString("en-IN")}` },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Welcome back, Cinematic Frame" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = iconMap[s.label] || FileText;
            const color = colorMap[s.label] || "text-primary";
            return (
              <motion.div key={s.label} variants={item}>
                <Card className="glass-card stat-card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{s.value}</p>
                        <span className={`text-xs font-medium ${color}`}>Live data</span>
                      </div>
                      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div variants={item} initial="hidden" animate="show" className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-sans font-semibold">Bookings Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(40,85%,55%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(40,85%,55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                      <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={12} />
                      <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,16%)", borderRadius: 8, color: "hsl(220,10%,90%)" }}
                        formatter={(value: number) => [value, "Bookings"]}
                      />
                      <Area type="monotone" dataKey="bookings" stroke="hsl(40,85%,55%)" fill="url(#goldGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No chart data yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Shoots */}
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="glass-card h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-sans font-semibold">Upcoming Shoots</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingShoots.length > 0 ? upcomingShoots.map((shoot: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{shoot.name}</p>
                    <p className="text-xs text-primary font-medium">{shoot.eventType}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{shoot.eventDate || "TBD"}</span>
                      <span>{shoot.venue || ""}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming shoots</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions + Recent Quotations */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-sans font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2" size="sm" onClick={() => navigate("/quotations")}><Plus className="h-4 w-4" /> New Quotation</Button>
              <Button variant="secondary" className="w-full justify-start gap-2" size="sm" onClick={() => navigate("/portfolio")}><Camera className="h-4 w-4" /> Upload Photos</Button>
              <Button variant="secondary" className="w-full justify-start gap-2" size="sm" onClick={() => navigate("/clients")}><Users className="h-4 w-4" /> Add Client</Button>
              <Button variant="secondary" className="w-full justify-start gap-2" size="sm" onClick={() => navigate("/quotations")}><Calendar className="h-4 w-4" /> Schedule Shoot</Button>
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-sans font-semibold">Recent Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Client</TableHead>
                    <TableHead className="text-muted-foreground">Event</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Budget</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentQuotations.length > 0 ? recentQuotations.map((q: any) => (
                    <TableRow key={q.id} className="border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate("/quotations")}>
                      <TableCell className="font-mono text-xs text-muted-foreground">Q-{String(q.id).padStart(3, "0")}</TableCell>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell>{q.eventType}</TableCell>
                      <TableCell className="text-muted-foreground">{q.eventDate || "-"}</TableCell>
                      <TableCell className="font-semibold text-primary">{q.budget || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[q.status] || ""}>{q.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quotations yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
