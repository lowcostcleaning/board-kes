import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TelegramSettings } from './TelegramSettings';
import { AvatarUpload } from './AvatarUpload';
import { CleanerInventorySection } from './CleanerInventorySection';
import { CleanerPerformanceSection } from './CleanerPerformanceSection';

interface EditProfileDialogProps {
  onProfileUpdate?: () => void;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ onProfileUpdate }) => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && profile) {
      const currentName = (profile as any).name || user?.user_metadata?.name || '';
      const currentPhone = (profile as any).phone || '';
      const currentAvatar = (profile as any).avatar_url || null;
      setName(currentName);
      setPhone(currentPhone);
      setAvatarUrl(currentAvatar);
    }
  }, [open, profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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

      // Update user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { name: trimmedName }
      });
      if (metaError) throw metaError;

      toast.success('Профиль обновлён');
      setOpen(false);
      onProfileUpdate?.();
      // Reload to update the displayed name
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
  };

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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          {user && (
            <div className="space-y-2">
              <Label>Фото профиля</Label>
              <AvatarUpload 
                currentAvatarUrl={avatarUrl} 
                userId={user.id} 
                userName={name} 
                userEmail={profile?.email} 
                onAvatarChange={handleAvatarChange} 
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={profile?.email || ''} 
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
        <CleanerPerformanceSection />
        <CleanerInventorySection />
        <TelegramSettings />
      </DialogContent>
    </Dialog>
  );
};