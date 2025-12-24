import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MessageCircle, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TELEGRAM_BOT_USERNAME = 'YourBotUsername'; // Replace with actual bot username

export const TelegramSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const [telegramEnabled, setTelegramEnabled] = React.useState(false);
  const [telegramChatId, setTelegramChatId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setTelegramEnabled((profile as any).telegram_enabled || false);
      setTelegramChatId((profile as any).telegram_chat_id || null);
    }
  }, [profile]);

  const handleConnectTelegram = () => {
    if (!user) return;
    
    const telegramUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${user.id}`;
    window.open(telegramUrl, '_blank');
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_enabled: enabled })
        .eq('id', user.id);

      if (error) throw error;

      setTelegramEnabled(enabled);
      toast.success(enabled ? 'Уведомления включены' : 'Уведомления отключены');
    } catch (error: any) {
      console.error('Error updating telegram settings:', error);
      toast.error('Ошибка обновления настроек');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          telegram_chat_id: null, 
          telegram_enabled: false 
        })
        .eq('id', user.id);

      if (error) throw error;

      setTelegramChatId(null);
      setTelegramEnabled(false);
      toast.success('Telegram отключён');
    } catch (error: any) {
      console.error('Error disconnecting telegram:', error);
      toast.error('Ошибка отключения');
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = !!telegramChatId;

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Telegram-уведомления</h3>
      </div>

      <div className="space-y-3">
        {/* Connection status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Telegram подключён</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Telegram не подключён</span>
              </>
            )}
          </div>
          
          {isConnected ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              Отключить
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleConnectTelegram}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Подключить
            </Button>
          )}
        </div>

        {/* Enable/disable toggle */}
        {isConnected && (
          <div className="flex items-center justify-between">
            <Label htmlFor="telegram-enabled" className="text-sm">
              Получать уведомления
            </Label>
            <Switch
              id="telegram-enabled"
              checked={telegramEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Info text */}
        <p className="text-xs text-muted-foreground">
          {isConnected 
            ? 'Вы будете получать уведомления о новых заказах и сообщениях в Telegram.'
            : 'Подключите Telegram для получения мгновенных уведомлений о заказах и сообщениях.'}
        </p>
      </div>
    </div>
  );
};
