import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { Send, Star, Loader2 } from 'lucide-react';

interface CleanerRow {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  rating: number | null;
  telegram_username: string | null;
}

export const ManagerCleanersCard = () => {
  const [cleaners, setCleaners] = useState<CleanerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<CleanerRow | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, rating, telegram_username, role, status, is_active, visible_to_managers')
        .in('role', ['cleaner', 'demo_cleaner'])
        .eq('status', 'approved')
        .eq('is_active', true)
        .eq('visible_to_managers', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading cleaners:', error);
        setCleaners([]);
      } else {
        setCleaners((data || []) as unknown as CleanerRow[]);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const openTelegram = (username: string) => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    window.open(`https://t.me/${clean}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cleaners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/40">
        Пока нет доступных клинеров.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {cleaners.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f5f5f5] dark:bg-muted/40 hover:bg-[#ebebeb] dark:hover:bg-muted/60 transition-colors"
          >
            <button
              onClick={() => setSelected(c)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left"
            >
              <UserAvatar avatarUrl={c.avatar_url} name={c.name} email={c.email} size="sm" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name || c.email}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{c.rating ? c.rating.toFixed(1) : '—'}</span>
                </div>
              </div>
            </button>
            {c.telegram_username && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  openTelegram(c.telegram_username!);
                }}
                title={`Telegram: @${c.telegram_username.replace(/^@/, '')}`}
                className="h-8 w-8 text-[#229ED9] hover:bg-[#229ED9]/10"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected && (
                <UserAvatar
                  avatarUrl={selected.avatar_url}
                  name={selected.name}
                  email={selected.email}
                  size="sm"
                />
              )}
              <span>{selected?.name || selected?.email}</span>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {selected.telegram_username ? (
                <Button
                  onClick={() => openTelegram(selected.telegram_username!)}
                  className="w-full gap-2 bg-[#229ED9] hover:bg-[#1b8bc0] text-white"
                >
                  <Send className="w-4 h-4" />
                  Написать в Telegram @{selected.telegram_username.replace(/^@/, '')}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Telegram не указан
                </p>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Календарь занятости</h4>
                <OrdersCalendar userRole="cleaner" cleanerId={selected.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
