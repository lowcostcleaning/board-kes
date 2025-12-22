import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChatDialog } from '@/components/ChatDialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Dialog {
  id: string;
  manager_id: string;
  manager?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export function CleanerChat() {
  const { user } = useAuth();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDialog, setSelectedDialog] = useState<Dialog | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const fetchDialogs = async () => {
      if (!user?.id) return;

      try {
        // Fetch dialogs where cleaner is the current user
        const { data: dialogsData, error: dialogsError } = await supabase
          .from('dialogs')
          .select('id, manager_id')
          .eq('cleaner_id', user.id)
          .order('created_at', { ascending: false });

        if (dialogsError) throw dialogsError;

        if (!dialogsData || dialogsData.length === 0) {
          setDialogs([]);
          return;
        }

        // Fetch manager profiles
        const managerIds = dialogsData.map((d) => d.manager_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', managerIds);

        if (profilesError) throw profilesError;

        const profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, { id: string; name: string | null; email: string | null }>);

        const dialogsWithManagers = dialogsData.map((d) => ({
          ...d,
          manager: profilesMap[d.manager_id]
        }));

        setDialogs(dialogsWithManagers);
      } catch (error) {
        console.error('Error fetching dialogs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDialogs();
  }, [user?.id]);

  const handleOpenChat = (dialog: Dialog) => {
    setSelectedDialog(dialog);
    setChatOpen(true);
  };

  const getManagerName = (dialog: Dialog) => {
    if (dialog.manager?.name) return dialog.manager.name;
    if (dialog.manager?.email) return dialog.manager.email.split('@')[0];
    return 'Менеджер';
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground p-3">Загрузка...</p>
    );
  }

  if (dialogs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
        Нет активных диалогов. Менеджер начнёт чат при необходимости.
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {dialogs.map((dialog) => (
            <Button
              key={dialog.id}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleOpenChat(dialog)}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{getManagerName(dialog)}</p>
                {dialog.manager?.name && dialog.manager?.email && (
                  <p className="text-xs text-muted-foreground">
                    @{dialog.manager.email.split('@')[0]}
                  </p>
                )}
              </div>
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </ScrollArea>

      {selectedDialog && user?.id && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          cleanerId={user.id}
          cleanerName={getManagerName(selectedDialog)}
          managerId={selectedDialog.manager_id}
          userRole="cleaner"
        />
      )}
    </>
  );
}
