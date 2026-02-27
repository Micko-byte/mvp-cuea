import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "student" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  admissionNumber?: string;
  program?: string;
  year?: string;
  semester?: string;
  course?: string;
  courseName?: string;
  role: UserRole;
  selectedUnits?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  signup: (userData: Partial<User> & { password: string }) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo users
const DEMO_USERS: (User & { password: string })[] = [
  {
    id: "admin-1",
    name: "Dr. Admin",
    email: "admin@cuea.edu",
    role: "admin",
    password: "admin123",
  },
  {
    id: "student-1",
    name: "John Mwangi",
    email: "john@students.cuea.edu",
    role: "student",
    admissionNumber: "CUEA/2024/001",
    program: "Bachelor's",
    year: "2",
    semester: "1",
    course: "CS",
    courseName: "Computer Science",
    selectedUnits: ["Data Structures", "Algorithms", "Database Systems"],
    password: "student123",
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cuea_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const found = DEMO_USERS.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem("cuea_user", JSON.stringify(userData));
      return true;
    }
    return false;
  }, []);

  const signup = useCallback((userData: Partial<User> & { password: string }) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name || "",
      email: userData.email || "",
      role: "student",
      admissionNumber: userData.admissionNumber,
      program: userData.program,
      year: userData.year,
      semester: userData.semester,
      course: userData.course,
      courseName: userData.courseName,
      selectedUnits: userData.selectedUnits,
    };
    setUser(newUser);
    localStorage.setItem("cuea_user", JSON.stringify(newUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("cuea_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
