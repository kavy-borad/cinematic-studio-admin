import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";

const revenueData = [
  { month: "Mar", revenue: 95000 }, { month: "Apr", revenue: 110000 },
  { month: "May", revenue: 88000 }, { month: "Jun", revenue: 130000 },
  { month: "Jul", revenue: 85000 }, { month: "Aug", revenue: 120000 },
  { month: "Sep", revenue: 95000 }, { month: "Oct", revenue: 150000 },
  { month: "Nov", revenue: 180000 }, { month: "Dec", revenue: 210000 },
  { month: "Jan", revenue: 175000 }, { month: "Feb", revenue: 225000 },
];

const inquiryData = [
  { month: "Mar", inquiries: 8 }, { month: "Apr", inquiries: 12 },
  { month: "May", inquiries: 10 }, { month: "Jun", inquiries: 15 },
  { month: "Jul", inquiries: 9 }, { month: "Aug", inquiries: 18 },
  { month: "Sep", inquiries: 14 }, { month: "Oct", inquiries: 20 },
  { month: "Nov", inquiries: 16 }, { month: "Dec", inquiries: 22 },
  { month: "Jan", inquiries: 13 }, { month: "Feb", inquiries: 19 },
];

const conversionData = [
  { month: "Mar", rate: 35 }, { month: "Apr", rate: 42 },
  { month: "May", rate: 38 }, { month: "Jun", rate: 45 },
  { month: "Jul", rate: 40 }, { month: "Aug", rate: 52 },
  { month: "Sep", rate: 48 }, { month: "Oct", rate: 55 },
  { month: "Nov", rate: 50 }, { month: "Dec", rate: 58 },
  { month: "Jan", rate: 53 }, { month: "Feb", rate: 60 },
];

const serviceBreakdown = [
  { name: "Weddings", value: 45, color: "hsl(40,85%,55%)" },
  { name: "Pre-Wedding", value: 20, color: "hsl(217,91%,60%)" },
  { name: "Corporate", value: 15, color: "hsl(142,71%,45%)" },
  { name: "Portraits", value: 12, color: "hsl(280,70%,55%)" },
  { name: "Events", value: 8, color: "hsl(0,72%,51%)" },
];

const tooltipStyle = { background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,16%)", borderRadius: 8, color: "hsl(220,10%,90%)" };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Analytics() {
  return (
    <>
      <Header title="Analytics" subtitle="Business performance insights" />
      <div className="p-6">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base font-sans font-semibold">Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(40,85%,55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(40,85%,55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={12} />
                    <YAxis stroke="hsl(220,10%,55%)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(40,85%,55%)" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Inquiries */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base font-sans font-semibold">Monthly Inquiries</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={inquiryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={12} />
                    <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="inquiries" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Conversion */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base font-sans font-semibold">Conversion Rate (%)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={12} />
                    <YAxis stroke="hsl(220,10%,55%)" fontSize={12} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Conversion"]} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={{ fill: "hsl(142,71%,45%)", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Service Breakdown */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base font-sans font-semibold">Revenue by Service</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={240}>
                    <PieChart>
                      <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {serviceBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Share"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {serviceBreakdown.map((s) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-sm text-foreground/80">{s.name}</span>
                        <span className="text-sm font-semibold text-muted-foreground ml-auto">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
