import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const TELEGRAM_BOT_USERNAME = 'kalendaruborok_bot';

export const TelegramSettings: React.FC = () => {
  const { user } = useAuth();
  const [telegramEnabled, setTelegramEnabled] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load fresh profile data from Supabase
  const loadProfileData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('telegram_enabled')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setTelegramEnabled(data?.telegram_enabled === true);
    } catch (error) {
      console.error('Error loading telegram settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  React.useEffect(() => {
    loadProfileData();
  }, [user]);

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
          setTelegramEnabled(newData.telegram_enabled === true);
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
            {telegramEnabled ? (
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
          
          {!telegramEnabled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleConnectTelegram}
              disabled={isLoading}
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
