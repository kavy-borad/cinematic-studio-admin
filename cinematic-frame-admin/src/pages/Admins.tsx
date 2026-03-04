import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Calendar, Shield, Loader2, Plus, Eye, EyeOff, UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { getAdmins, createAdminUser, deleteAdminUser, getStoredAdmin, AdminData } from "@/lib/api";

const Admins = () => {
    const [admins, setAdmins] = useState<AdminData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
    const [deleting, setDeleting] = useState<number | null>(null);
    const { toast } = useToast();
    const currentAdmin = getStoredAdmin();

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const response = await getAdmins();
            if (response.success) {
                setAdmins(response.data);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to fetch admins.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
            toast({
                title: "Missing Fields",
                description: "Please fill in all fields.",
                variant: "destructive",
            });
            return;
        }

        if (newAdmin.password.length < 6) {
            toast({
                title: "Weak Password",
                description: "Password must be at least 6 characters.",
                variant: "destructive",
            });
            return;
        }

        setCreating(true);

        try {
            const response = await createAdminUser(newAdmin);
            if (response.success) {
                toast({
                    title: "Admin Created ✅",
                    description: `${response.data.name} has been added successfully.`,
                });
                setNewAdmin({ name: "", email: "", password: "" });
                setDialogOpen(false);
                fetchAdmins(); // Refresh the list
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message || "Failed to create admin.";
            toast({
                title: "Creation Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteAdmin = async (admin: AdminData) => {
        setDeleting(admin.id);
        try {
            const response = await deleteAdminUser(admin.id);
            if (response.success) {
                toast({
                    title: "Admin Deleted 🗑️",
                    description: `${admin.name} has been removed.`,
                });
                fetchAdmins(); // Refresh list
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message || "Failed to delete admin.";
            toast({
                title: "Delete Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manage Admins</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View and manage admin accounts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                        <Users className="w-4 h-4 mr-1.5" />
                        {admins.length} Admin{admins.length !== 1 ? "s" : ""}
                    </Badge>

                    {/* Add Admin Dialog */}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                                <Plus className="w-4 h-4" />
                                Add Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-card border-border">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-foreground">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    Add New Admin
                                </DialogTitle>
                                <DialogDescription>
                                    Create a new admin account. They can login with these credentials.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleCreateAdmin} className="space-y-4 mt-2">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="admin-name" className="text-sm font-medium text-foreground/80">
                                        Full Name
                                    </Label>
                                    <Input
                                        id="admin-name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={newAdmin.name}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                        className="h-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="admin-email" className="text-sm font-medium text-foreground/80">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="admin-email"
                                        type="email"
                                        placeholder="admin@cinematic.com"
                                        value={newAdmin.email}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                        className="h-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="admin-password" className="text-sm font-medium text-foreground/80">
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="admin-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Min. 6 characters"
                                            value={newAdmin.password}
                                            onChange={(e) =>
                                                setNewAdmin({ ...newAdmin, password: e.target.value })
                                            }
                                            className="h-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    id="create-admin-submit"
                                    type="submit"
                                    disabled={creating}
                                    className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                                >
                                    {creating ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <UserPlus className="w-4 h-4" />
                                            Create Admin
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </motion.div>

            {/* Admins List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : admins.length === 0 ? (
                <div className="text-center py-20">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No admins found.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {admins.map((admin, index) => (
                        <motion.div
                            key={admin.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.08 }}
                        >
                            <Card className="glass-card stat-card-hover">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                <span className="text-sm font-bold text-primary">
                                                    {admin.name?.charAt(0)?.toUpperCase() || "A"}
                                                </span>
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-semibold text-foreground">
                                                    {admin.name}
                                                </CardTitle>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] border-primary/30 text-primary"
                                        >
                                            <Shield className="w-3 h-3 mr-1" />
                                            Admin
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="truncate">{admin.email}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Joined {formatDate(admin.createdAt)}</span>
                                        </div>

                                        {/* Delete Button — hidden for current logged-in admin */}
                                        {currentAdmin?.id !== admin.id && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <button
                                                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="Delete Admin"
                                                    >
                                                        {deleting === admin.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-card border-border">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-foreground">
                                                            Delete Admin?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete <strong>{admin.name}</strong> ({admin.email})?
                                                            This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80">
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteAdmin(admin)}
                                                            className="bg-red-600 text-white hover:bg-red-700"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Admins;
