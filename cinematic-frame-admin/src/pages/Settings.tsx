import { useEffect, useState } from "react";
import { useUIStore } from "@/store/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/api";
import { toast } from "sonner";

const defaultContact: Record<string, string> = {
  businessName: "", ownerName: "", email: "", phone: "", address: "", city: "", whatsapp: "",
};
const defaultSocial: Record<string, string> = {
  instagram: "", facebook: "", youtube: "", pinterest: "", linkedin: "",
};
const defaultSeo: Record<string, string> = {
  siteTitle: "", metaDescription: "", keywords: "", ogImage: "", analyticsId: "",
};

export default function SettingsPage() {
  const setHeaderInfo = useUIStore((s) => s.setHeaderInfo);
  const [contact, setContact] = useState(defaultContact);
  const [social, setSocial] = useState(defaultSocial);
  const [seo, setSeo] = useState(defaultSeo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeaderInfo("Settings", "Configure your business profile");
  }, [setHeaderInfo]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSettings();
        if (res.success && res.data) {
          const d = res.data;
          if (d.contact) setContact({ ...defaultContact, ...d.contact });
          if (d.social) setSocial({ ...defaultSocial, ...d.social });
          if (d.seo) setSeo({ ...defaultSeo, ...d.seo });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (group: string) => {
    setSaving(true);
    try {
      const payload: Record<string, Record<string, string>> = {};
      if (group === "contact") payload.contact = contact;
      else if (group === "social") payload.social = social;
      else if (group === "seo") payload.seo = seo;
      const res = await updateSettings(payload);
      if (res.success) toast.success("Settings saved successfully!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    );
  }

  return (
    <div className="p-6">
      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
          <TabsTrigger value="seo">SEO Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <Card className="glass-card max-w-2xl">
            <CardHeader><CardTitle className="text-base font-sans font-semibold">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Business Name</Label><Input value={contact.businessName} onChange={(e) => setContact({ ...contact, businessName: e.target.value })} className="mt-1 bg-muted/50" /></div>
                <div><Label>Owner Name</Label><Input value={contact.ownerName} onChange={(e) => setContact({ ...contact, ownerName: e.target.value })} className="mt-1 bg-muted/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="mt-1 bg-muted/50" /></div>
                <div><Label>Phone</Label><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="mt-1 bg-muted/50" /></div>
              </div>
              <div><Label>Address</Label><Textarea value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} className="mt-1 bg-muted/50" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })} className="mt-1 bg-muted/50" /></div>
                <div><Label>WhatsApp</Label><Input value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} className="mt-1 bg-muted/50" /></div>
              </div>
              <Button onClick={() => handleSave("contact")} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="glass-card max-w-2xl">
            <CardHeader><CardTitle className="text-base font-sans font-semibold">Social Media Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Instagram</Label><Input value={social.instagram} onChange={(e) => setSocial({ ...social, instagram: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Facebook</Label><Input value={social.facebook} onChange={(e) => setSocial({ ...social, facebook: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>YouTube</Label><Input value={social.youtube} onChange={(e) => setSocial({ ...social, youtube: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Pinterest</Label><Input value={social.pinterest} onChange={(e) => setSocial({ ...social, pinterest: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>LinkedIn</Label><Input value={social.linkedin} onChange={(e) => setSocial({ ...social, linkedin: e.target.value })} placeholder="https://linkedin.com/company/..." className="mt-1 bg-muted/50" /></div>
              <Button onClick={() => handleSave("social")} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card className="glass-card max-w-2xl">
            <CardHeader><CardTitle className="text-base font-sans font-semibold">SEO Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Site Title</Label><Input value={seo.siteTitle} onChange={(e) => setSeo({ ...seo, siteTitle: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Meta Description</Label><Textarea value={seo.metaDescription} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} className="mt-1 bg-muted/50" rows={3} /></div>
              <div><Label>Keywords</Label><Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>OG Image URL</Label><Input value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <div><Label>Google Analytics ID</Label><Input value={seo.analyticsId} onChange={(e) => setSeo({ ...seo, analyticsId: e.target.value })} className="mt-1 bg-muted/50" /></div>
              <Button onClick={() => handleSave("seo")} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
