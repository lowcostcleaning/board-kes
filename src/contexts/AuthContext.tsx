import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'cleaner' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'active';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'cleaner' | 'manager') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, _password: string) => {
    // Mock login - in real app, this would call Supabase
    // For demo, we'll create a mock user based on email
    const mockRole: UserRole = email.includes('admin') 
      ? 'admin' 
      : email.includes('manager') 
        ? 'manager' 
        : 'cleaner';
    
    setUser({
      id: '1',
      name: email.split('@')[0],
      email,
      role: mockRole,
      status: mockRole === 'admin' ? 'active' : 'pending',
    });
  };

  const register = async (name: string, email: string, _password: string, role: 'cleaner' | 'manager') => {
    // Mock registration
    setUser({
      id: '1',
      name,
      email,
      role,
      status: 'pending',
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
