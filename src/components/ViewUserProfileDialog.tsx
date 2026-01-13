import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Briefcase, 
  Brush, 
  Star,
  CheckCircle2,
  Clock,
  MessageCircle,
  Building2,
  Link as LinkIcon
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  status: string;
  phone?: string | null;
  telegram_chat_id?: string | null;
  avatar_url?: string | null;
  rating?: number | null;
  total_cleanings?: number; // Changed from completed_orders_count
  is_active?: boolean;
  company_name?: string | null; // New
  airbnb_profile_link?: string | null; // New
}

interface ViewUserProfileDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'cleaner':
    case 'demo_cleaner':
      return <Brush className="w-4 h-4" />;
    case 'manager':
    case 'demo_manager':
      return <Briefcase className="w-4 h-4" />;
    case 'admin':
      return <Shield className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'cleaner':
      return 'Клинер';
    case 'manager':
      return 'Менеджер';
    case 'admin':
      return 'Администратор';
    case 'demo_manager':
      return 'Demo Менеджер';
    case 'demo_cleaner':
      return 'Demo Клинер';
    default:
      return role;
  }
};

export const ViewUserProfileDialog = ({
  user,
  open,
  onOpenChange,
}: ViewUserProfileDialogProps) => {
  if (!user) return null;

  const isManagerRole = user.role === 'manager' || user.role === 'demo_manager';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Профиль пользователя</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <UserAvatar
              avatarUrl={user.avatar_url}
              name={user.name}
              email={user.email}
              size="xl"
            />
            <div>
              <h3 className="text-lg font-semibold">
                {user.name || user.email?.split('@')[0] || 'Пользователь'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="gap-1"
                >
                  {getRoleIcon(user.role)}
                  {getRoleLabel(user.role)}
                </Badge>
                {user.status === 'approved' ? (
                  <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Активен
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-status-pending/10 text-status-pending border-status-pending/30">
                    <Clock className="w-3 h-3 mr-1" />
                    На модерации
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Manager Info */}
          {isManagerRole && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Информация о компании</h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{user.company_name || 'Название компании не указано'}</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" />
                  {user.airbnb_profile_link ? (
                    <a 
                      href={user.airbnb_profile_link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-primary hover:underline truncate"
                    >
                      Профиль Airbnb
                    </a>
                  ) : (
                    <span className="text-sm">Ссылка Airbnb не указана</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Контактные данные</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.email || '—'}</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.phone || 'Не указан'}</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {user.telegram_chat_id ? `ID: ${user.telegram_chat_id}` : 'Не подключен'}
                </span>
              </div>
            </div>
          </div>

          {/* Cleaner Stats */}
          {(user.role === 'cleaner' || user.role === 'demo_cleaner') && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Статистика</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-lg font-semibold">
                      {user.rating ? user.rating.toFixed(1) : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Рейтинг</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <span className="text-lg font-semibold">
                    {user.total_cleanings ?? 0}
                  </span>
                  <p className="text-xs text-muted-foreground">Уборок</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};