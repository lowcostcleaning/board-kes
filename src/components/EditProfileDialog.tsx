import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Loader2 } from 'lucide-react'; // Added Loader2 import
import { supabase } from '@/integrations/supabase/client';
import { useAuth, UserProfile as AuthUserProfile } from '@/contexts/AuthContext'; // Renamed to avoid conflict
import { toast } from 'sonner';
import { TelegramSettings } from './TelegramSettings';
import { AvatarUpload } from './AvatarUpload';
import { CleanerInventorySection } from './CleanerInventorySection';
import { CleanerStatsSection } from './CleanerStatsSection';
import { CleanerLevelAndInventory } from './CleanerLevelAndInventory'; // Import the new component

// Define a more complete profile type for local use in this component
interface LocalUserProfile extends AuthUserProfile {
  phone: string | null;
  avatar_url: string | null;
  name: string | null; // Added missing 'name' property
}

interface EditProfileDialogProps {
  onProfileUpdate?: () => void;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ onProfileUpdate }) => {
  const { user, profile: authProfile } = useAuth(); // authProfile is from AuthContext
  const [open, setOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState<LocalUserProfile | null>(null); // Local state for full profile
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  // Fetch full profile when dialog opens or user changes
  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!user) return;
      setIsFetchingProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role, status, name, phone, avatar_url, company_name, airbnb_profile_link, manual_orders_adjustment')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setLocalProfile(data as LocalUserProfile);
        setName(data.name || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || null);
      } catch (error: any) {
        console.error('Error fetching full profile:', error);
        toast.error('Ошибка загрузки данных профиля');
      } finally {
        setIsFetchingProfile(false);
      }
    };

    if (open && user) {
      fetchFullProfile();
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !localProfile) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Введите имя');
      return;
    }
    if (trimmedName.length > 100) {
      toast.error('Имя должно быть не более 100 символов');
      return;
    }
    setIsLoading(true);
    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: trimmedName,
          phone: phone.trim() || null,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // Update user metadata (optional, but good for consistency if used elsewhere)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { name: trimmedName }
      });
      if (metaError) throw metaError;

      // Update local profile state
      setLocalProfile(prev => prev ? { ...prev, name: trimmedName, phone: phone.trim() || null } : null);

      toast.success('Профиль обновлён');
      setOpen(false);
      onProfileUpdate?.();
      // No need to reload the entire window, AuthContext will re-fetch its profile
      // and other components will react to localProfile changes or AuthContext updates.
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
    setLocalProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  const isCleaner = authProfile?.role === 'cleaner' || authProfile?.role === 'demo_cleaner';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Профиль
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
        </DialogHeader>
        {isFetchingProfile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cleaner Level and Inventory Section */}
            {isCleaner && <CleanerLevelAndInventory />}

            {/* Avatar Upload */}
            {user && localProfile && (
              <div className="space-y-2">
                <Label>Фото профиля</Label>
                <AvatarUpload 
                  currentAvatarUrl={avatarUrl} 
                  userId={user.id} 
                  userName={localProfile.name} 
                  userEmail={localProfile.email} 
                  onAvatarChange={handleAvatarChange} 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={localProfile?.email || ''} 
                disabled 
                className="bg-muted" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Введите ваше имя" 
                maxLength={100} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+7 999 123 45 67" 
                maxLength={20} 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        )}
        {isCleaner && <CleanerStatsSection />}
        {isCleaner && <CleanerInventorySection />}
        <TelegramSettings />
      </DialogContent>
    </Dialog>
  );
};