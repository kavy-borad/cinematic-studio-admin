import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AdminUser, getStoredAdmin, isAuthenticated, logoutAdmin } from "@/lib/api";

interface AuthContextType {
    admin: AdminUser | null;
    token: string | null;
    isLoggedIn: boolean;
    setAuth: (admin: AdminUser, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // On mount, restore from localStorage
    useEffect(() => {
        const storedAdmin = getStoredAdmin();
        const storedToken = localStorage.getItem("admin_token");
        if (storedAdmin && storedToken) {
            setAdmin(storedAdmin);
            setToken(storedToken);
        }
    }, []);

    const setAuth = (adminData: AdminUser, tokenStr: string) => {
        setAdmin(adminData);
        setToken(tokenStr);
    };

    const logout = async () => {
        setAdmin(null);
        setToken(null);
        await logoutAdmin();
    };

    return (
        <AuthContext.Provider
            value={{
                admin,
                token,
                isLoggedIn: !!token && !!admin,
                setAuth,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
