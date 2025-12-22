import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, TreePine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EditProfileDialog } from '@/components/EditProfileDialog';

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

  const displayName = (profile as any)?.name || user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Пользователь';

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="w-7 h-7 text-emerald-600" />
            <span className="font-semibold text-emerald-700 italic">Lowcost</span>
            <span className="font-semibold text-red-500 italic">Cleaning</span>
            <TreePine className="w-7 h-7 text-emerald-600" />
            <span className="ml-2 text-muted-foreground">•</span>
            <span className="ml-2 font-medium text-foreground">{title}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">{displayName}</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground capitalize">
                {profile?.role}
              </span>
            </div>
            <EditProfileDialog />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Выйти
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
