
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const userContext = createContext(null);

const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/+$/, "");

const AuthContext = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const verifyUser = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                if (!cancelled) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await axios.get(
                    `${API_URL}/auth/verify`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (cancelled) return;

                if (response.data.success && response.data.user) {
                    setUser(response.data.user);
                } else {
                    localStorage.removeItem("token");
                    setUser(null);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Authentication verification failed:",
                        error.response?.data || error.message
                    );

                    localStorage.removeItem("token");
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        verifyUser();

        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback((userData) => {
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login", { replace: true });
    }, [navigate]);

    return (
        <userContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
            }}
        >
            {children}
        </userContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(userContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthContext");
    }

    return context;
};

export default AuthContext;
