import axios from "axios";

// ─── Axios Instance ──────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 – token expired or invalid
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginPayload {
    email: string;
    password: string;
}

export interface AdminUser {
    id: number;
    name: string;
    email: string;
}

export async function loginAdmin(payload: LoginPayload) {
    const res = await api.post("/auth/login", payload);
    const { data } = res.data; // { admin, token }

    // Store token and admin info in localStorage
    if (data?.token) {
        localStorage.setItem("admin_token", data.token);
    }
    if (data?.admin) {
        localStorage.setItem("admin_user", JSON.stringify(data.admin));
    }

    return res.data;
}

export async function logoutAdmin() {
    try {
        await api.post("/auth/logout");
    } catch (error) {
        // Ignore errors (e.g., if token is already expired)
        console.warn("Logout API call failed, but clearing local session anyway.");
    } finally {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        window.location.href = "/login";
    }
}

export function getStoredAdmin(): AdminUser | null {
    const stored = localStorage.getItem("admin_user");
    if (stored) {
        try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
}

export function isAuthenticated(): boolean {
    return !!localStorage.getItem("admin_token");
}

export async function getMe() {
    const res = await api.get("/auth/me");
    return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const res = await api.patch("/auth/change-password", { currentPassword, newPassword });
    return res.data;
}

export async function updateProfile(data: { username?: string; email?: string }) {
    const res = await api.patch("/auth/profile", data);
    return res.data;
}

// ─── Admin Management ─────────────────────────────────────────────────────────
export interface AdminData {
    id: number;
    name: string;
    email: string;
    createdAt: string;
}

export async function getAdmins(): Promise<{ success: boolean; message: string; data: AdminData[] }> {
    const res = await api.get("/admins");
    return res.data;
}

export interface CreateAdminPayload {
    name: string;
    email: string;
    password: string;
}

export async function createAdminUser(payload: CreateAdminPayload) {
    const res = await api.post("/admins/create", payload);
    return res.data;
}

export async function deleteAdminUser(id: number) {
    const res = await api.delete(`/admins/${id}`);
    return res.data;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats() {
    const res = await api.get("/dashboard/stats");
    return res.data;
}

export async function getRevenueChart() {
    const res = await api.get("/dashboard/revenue-chart");
    return res.data;
}

export async function getAnalytics() {
    const res = await api.get("/dashboard/analytics");
    return res.data;
}

// ─── Quotations ───────────────────────────────────────────────────────────────
export async function getQuotations(status?: string) {
    const params = status && status !== "All" ? { status } : {};
    const res = await api.get("/quotations", { params });
    return res.data;
}

export async function getQuotation(id: number) {
    const res = await api.get(`/quotations/${id}`);
    return res.data;
}

export async function createQuotation(data: {
    name: string;
    email: string;
    phone?: string;
    city?: string;
    eventType: string;
    eventDate?: string;
    venue?: string;
    guestCount?: string;
    servicesRequested?: string[];
    budget?: string;
    requirements?: string;
}) {
    const res = await api.post("/quotations", data);
    return res.data;
}

export async function updateQuotationStatus(id: number, status: string) {
    const res = await api.patch(`/quotations/${id}/status`, { status });
    return res.data;
}

export async function updateQuotation(id: number, data: any) {
    const res = await api.put(`/quotations/${id}`, data);
    return res.data;
}

export async function deleteQuotation(id: number) {
    const res = await api.delete(`/quotations/${id}`);
    return res.data;
}

export async function getUnreadQuotationCount() {
    const res = await api.get("/quotations/unread-count");
    return res.data;
}

export async function getUnreadQuotations() {
    const res = await api.get("/quotations/unread");
    return res.data;
}

export async function markQuotationAsRead(id: number) {
    const res = await api.patch(`/quotations/${id}/read`);
    return res.data;
}

export async function markAllQuotationsAsRead() {
    const res = await api.patch("/quotations/mark-all-read");
    return res.data;
}

// ─── Bills ───────────────────────────────────────────────────────────────────
export interface BillItemPayload {
    service: string;
    deliverables?: string;
    price: number;
}

export interface CreateBillPayload {
    quotationId?: number;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    clientAddress?: string;
    eventType: string;
    eventDate?: string;
    items: BillItemPayload[];
    subtotal?: number;
    gstRate?: number;
    taxAmount?: number;
    totalAmount?: number;
    advancePaid?: number;
    balanceAmount?: number;
    dueDate?: string;
    status?: "Unpaid" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
    notes?: string;
}

export async function createBill(data: CreateBillPayload) {
    const res = await api.post("/bills", data);
    return res.data;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export async function getPortfolio(params?: { category?: string; featured?: string }) {
    const res = await api.get("/portfolio", { params });
    return res.data;
}

export async function getPortfolioItem(id: number) {
    const res = await api.get(`/portfolio/${id}`);
    return res.data;
}

export async function addPortfolioItem(formData: FormData) {
    const res = await api.post("/portfolio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
}

export async function updatePortfolioItem(id: number, formData: FormData) {
    const res = await api.put(`/portfolio/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
}

export async function removePortfolioImage(id: number, imageUrl: string) {
    const res = await api.delete(`/portfolio/${id}/image`, { data: { imageUrl } });
    return res.data;
}

export async function deletePortfolioItem(id: number) {
    const res = await api.delete(`/portfolio/${id}`);
    return res.data;
}

// ─── Services ─────────────────────────────────────────────────────────────────
export async function getServices() {
    const res = await api.get("/services");
    return res.data;
}

export async function getService(id: number) {
    const res = await api.get(`/services/${id}`);
    return res.data;
}

// POST /api/services – multipart/form-data (thumbnail file upload)
export async function addService(formData: FormData) {
    const res = await api.post("/services", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
}

// PUT /api/services/:id – multipart/form-data
export async function updateService(id: number, formData: FormData) {
    const res = await api.put(`/services/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
}

export async function deleteService(id: number) {
    const res = await api.delete(`/services/${id}`);
    return res.data;
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export async function getClients(search?: string) {
    const params = search ? { search } : {};
    const res = await api.get("/clients", { params });
    return res.data;
}

export async function getClient(id: number) {
    const res = await api.get(`/clients/${id}`);
    return res.data;
}

export async function createClient(data: {
    name: string;
    email: string;
    phone?: string;
    projectCount?: number;
    totalSpent?: number;
    status?: string;
}) {
    const res = await api.post("/clients", data);
    return res.data;
}

export async function updateClient(id: number, data: object) {
    const res = await api.put(`/clients/${id}`, data);
    return res.data;
}

export async function deleteClient(id: number) {
    const res = await api.delete(`/clients/${id}`);
    return res.data;
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
export async function getApprovedTestimonials() {
    const res = await api.get("/testimonials");
    return res.data;
}

export async function getAllTestimonials() {
    const res = await api.get("/testimonials/all");
    return res.data;
}

export async function submitTestimonial(data: {
    name: string;
    event?: string;
    rating?: number;
    text: string;
}) {
    const res = await api.post("/testimonials", data);
    return res.data;
}

export async function approveTestimonial(id: number) {
    const res = await api.patch(`/testimonials/${id}/approve`);
    return res.data;
}

export async function rejectTestimonial(id: number) {
    const res = await api.patch(`/testimonials/${id}/reject`);
    return res.data;
}

export async function deleteTestimonial(id: number) {
    const res = await api.delete(`/testimonials/${id}`);
    return res.data;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings() {
    const res = await api.get("/settings");
    return res.data;
}

export async function updateSettings(data: {
    contact?: Record<string, string>;
    social?: Record<string, string>;
    seo?: Record<string, string>;
}) {
    const res = await api.put("/settings", data);
    return res.data;
}

export async function getPublicSettings() {
    const res = await api.get("/settings/public");
    return res.data;
}

// ─── API Logs ─────────────────────────────────────────────────────────────────
export async function getLogs(params?: {
    page?: number;
    limit?: number;
    type?: string;
    method?: string;
    status?: string;
    search?: string;
}) {
    const res = await api.get("/logs", { params });
    return res.data;
}

export async function getLogStats() {
    const res = await api.get("/logs/stats");
    return res.data;
}

export async function clearAllLogs() {
    const res = await api.delete("/logs");
    return res.data;
}

export default api;
