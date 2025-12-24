import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TELEGRAM_BOT_USERNAME = 'LOWCOST_CLEANING_BOT';

export const TelegramSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const [telegramEnabled, setTelegramEnabled] = React.useState(false);
  const [telegramChatId, setTelegramChatId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Initial load from profile
  React.useEffect(() => {
    if (profile) {
      setTelegramEnabled((profile as any).telegram_enabled || false);
      setTelegramChatId((profile as any).telegram_chat_id || null);
    }
  }, [profile]);

  // Real-time subscription for profile changes
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('telegram-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          setTelegramEnabled(newData.telegram_enabled || false);
          setTelegramChatId(newData.telegram_chat_id || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleConnectTelegram = () => {
    if (!user) return;
    
    const telegramUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${user.id}`;
    window.open(telegramUrl, '_blank');
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

  // Connected = telegram_enabled is true AND telegram_chat_id exists
  const isConnected = telegramEnabled && !!telegramChatId;

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
                <span className="text-sm">Telegram подключён ✅</span>
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

        {/* Info text */}
        <p className="text-xs text-muted-foreground">
          Подключите Telegram для получения мгновенных уведомлений о заказах и сообщениях.
        </p>
      </div>
    </div>
  );
};
