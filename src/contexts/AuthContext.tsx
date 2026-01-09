import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'cleaner' | 'manager' | 'admin' | 'demo_manager' | 'demo_cleaner';
export type UserStatus = 'pending' | 'approved';

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  company_name?: string | null;
  airbnb_profile_link?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileError: string | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: 'cleaner' | 'manager',
    managerData?: { companyName?: string; airbnbProfileLink?: string }
  ) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Fetch profile from Supabase profiles table
  // profiles.id = auth.user.id, read profiles.role
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    setProfileError(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, status, company_name, airbnb_profile_link')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfileError('Ошибка загрузки профиля. Попробуйте войти снова.');
      return null;
    }

    // If profile is missing, set error and return null
    if (!data) {
      setProfileError('Профиль не найден. Обратитесь к администратору.');
      return null;
    }

    // Validate role is one of allowed values
    const validRoles: UserRole[] = ['cleaner', 'manager', 'admin', 'demo_manager', 'demo_cleaner'];
    if (!validRoles.includes(data.role as UserRole)) {
      setProfileError('Некорректная роль пользователя.');
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role as UserRole,
      status: (data.status as UserStatus) || 'pending',
      company_name: data.company_name,
      airbnb_profile_link: data.airbnb_profile_link,
    };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        setIsLoading(true);
        setProfileError(null);
        // Defer profile fetch with setTimeout to avoid deadlock
        setTimeout(() => {
          fetchProfile(currentSession.user.id).then((p) => {
            setProfile(p);
            setIsLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setProfileError(null);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        setIsLoading(true);
        fetchProfile(existingSession.user.id).then((p) => {
          setProfile(p);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setProfileError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'cleaner' | 'manager',
    managerData: { companyName?: string; airbnbProfileLink?: string } = {}
  ) => {
    setProfileError(null);
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role,
        },
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    // Create profile in profiles table on registration
    if (data.user) {
      const { error: profileInsertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        role,
        status: 'pending',
        company_name: managerData.companyName || null,
        airbnb_profile_link: managerData.airbnbProfileLink || null,
      });

      if (profileInsertError) {
        console.error('Error creating profile:', profileInsertError);
        return { error: new Error(profileInsertError.message) };
      }
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isAuthenticated: !!session,
        isLoading,
        profileError,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};