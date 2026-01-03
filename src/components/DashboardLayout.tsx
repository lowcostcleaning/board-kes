import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { AdminAddObjectDialog } from '@/components/AdminAddObjectDialog';
import { toast } from '@/hooks/use-toast';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleObjectAdded = () => {
    toast({
      title: 'Объект добавлен',
      description: 'Объект успешно добавлен менеджеру',
    });
  };

  const displayName = (profile as any)?.name || user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Пользователь';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="CleanOS" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-primary">Clean</span>
            <span className="font-semibold text-foreground">OS</span>
            <span className="ml-2 text-muted-foreground hidden sm:inline">•</span>
            <span className="ml-2 font-medium text-foreground hidden sm:inline">{title}</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">{displayName}</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground capitalize">
                {profile?.role}
              </span>
            </div>
            {isAdmin && (
              <AdminAddObjectDialog onObjectAdded={handleObjectAdded} />
            )}
            <EditProfileDialog />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
