import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatDialog } from '@/components/ChatDialog';
import { MessageCircle, User } from 'lucide-react';

interface Cleaner {
  id: string;
  name: string | null;
  email: string | null;
}

export function ManagerChatList() {
  const { user } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const fetchCleaners = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'cleaner')
          .eq('status', 'approved')
          .order('name', { ascending: true });

        if (error) throw error;
        setCleaners(data || []);
      } catch (error) {
        console.error('Error fetching cleaners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCleaners();
  }, [user?.id]);

  const handleOpenChat = (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setChatOpen(true);
  };

  const getDisplayName = (cleaner: Cleaner) => {
    if (cleaner.name) return cleaner.name;
    if (cleaner.email) return cleaner.email.split('@')[0];
    return 'Клинер';
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground p-3">Загрузка...</p>
    );
  }

  if (cleaners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
        Нет доступных клинеров.
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {cleaners.map((cleaner) => (
            <Button
              key={cleaner.id}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleOpenChat(cleaner)}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{getDisplayName(cleaner)}</p>
                {cleaner.name && cleaner.email && (
                  <p className="text-xs text-muted-foreground">
                    @{cleaner.email.split('@')[0]}
                  </p>
                )}
              </div>
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </ScrollArea>

      {selectedCleaner && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          cleanerId={selectedCleaner.id}
          cleanerName={getDisplayName(selectedCleaner)}
          userRole="manager"
        />
      )}
    </>
  );
}
