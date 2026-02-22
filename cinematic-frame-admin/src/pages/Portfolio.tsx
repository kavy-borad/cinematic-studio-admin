import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Edit, Trash2, Star, Grid3X3, List, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getPortfolio, addPortfolioItem, deletePortfolioItem } from "@/lib/api";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
const categories = ["All", "Weddings", "Pre-Wedding", "Corporate", "Portraits", "Events"];

const colors = [
  "from-amber-900/40 to-amber-800/20",
  "from-rose-900/40 to-rose-800/20",
  "from-blue-900/40 to-blue-800/20",
  "from-emerald-900/40 to-emerald-800/20",
  "from-violet-900/40 to-violet-800/20",
  "from-cyan-900/40 to-cyan-800/20",
  "from-pink-900/40 to-pink-800/20",
  "from-orange-900/40 to-orange-800/20",
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

export default function Portfolio() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPortfolio = async (category?: string) => {
    try {
      const params = category && category !== "All" ? { category } : {};
      const res = await getPortfolio(params);
      if (res.success) setAlbums(res.data);
    } catch (error) {
      console.error("Failed to load portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio(activeTab);
  }, [activeTab]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append("title", `New Album ${new Date().toLocaleDateString()}`);
    formData.append("category", "Events");
    Array.from(files).forEach((file) => formData.append("images", file));

    try {
      const res = await addPortfolioItem(formData);
      if (res.success) {
        toast.success("Portfolio item uploaded!");
        fetchPortfolio(activeTab);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Upload failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this portfolio item?")) return;
    try {
      const res = await deletePortfolioItem(id);
      if (res.success) {
        toast.success("Portfolio item deleted!");
        setAlbums((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const filteredAlbums = activeTab === "All" ? albums : albums.filter((a) => a.category === activeTab);

  return (
    <>
      <Header title="Portfolio" subtitle="Manage your photography collections" />
      <div className="p-6 space-y-6">
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <TabsList className="bg-muted/50">
                {categories.map((c) => (
                  <TabsTrigger key={c} value={c} className="text-xs">{c}</TabsTrigger>
                ))}
              </TabsList>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon"><Grid3X3 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><List className="h-4 w-4" /></Button>
                <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : filteredAlbums.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No portfolio items found</p>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAlbums.map((album, i) => (
                    <motion.div key={album.id} variants={item}>
                      <Card className="glass-card group overflow-hidden stat-card-hover cursor-pointer">
                        <div className={`h-40 bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center relative overflow-hidden`}>
                          {album.coverImage ? (
                            <img src={`${API_URL}${album.coverImage}`} alt={album.title} className="w-full h-full object-cover absolute inset-0" />
                          ) : (
                            <span className="text-4xl opacity-30">📷</span>
                          )}
                          {album.featured && (
                            <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground gap-1 text-xs z-10">
                              <Star className="h-3 w-3" /> Featured
                            </Badge>
                          )}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 hover:bg-background"><Edit className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={(e) => { e.stopPropagation(); handleDelete(album.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm text-foreground truncate">{album.title}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{album.photoCount || 0} photos</span>
                            <Badge variant="outline" className="text-xs border-border/50">{album.category}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
