import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { ModerationBanner } from '@/components/ModerationBanner';
import { CleanerOrdersList } from '@/components/CleanerOrdersList';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { CleanerChat } from '@/components/CleanerChat';
import CleanerPricingForm from '@/components/CleanerPricingForm';
import { CleanerDayOrdersDialog } from '@/components/CleanerDayOrdersDialog';
import { CleanerUnavailabilityManager } from '@/components/CleanerUnavailabilityManager';
import { CleanerCreateOrderDialog } from '@/components/CleanerCreateOrderDialog';
import { Brush, Calendar, MessageCircle, Banknote, CalendarX2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const CleanerDashboard = () => {
  const { user, profile } = useAuth();
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayOrdersOpen, setDayOrdersOpen] = useState(false);
  const isMobile = useIsMobile();

  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Клинер';
  const isApproved = profile?.role === 'admin' || profile?.status === 'approved';

  const handleOrdersRefresh = () => {
    setOrdersRefresh((prev) => prev + 1);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setDayOrdersOpen(true);
  };

  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile
    ? { collapsible: true, defaultOpen: false }
    : { collapsible: false, defaultOpen: true };

  return (
    <DashboardLayout title="Панель клинера">
      <div className="space-y-6">
        {/* Moderation Banner */}
        <ModerationBanner />

        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Добро пожаловать, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Управляйте своими уборками и расписанием.
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div style={{ animationDelay: '0.2s' }}>
            <DashboardCard title="Мои заказы" icon={Brush} {...cardProps}>
              <div className="space-y-3">
                {isApproved ? (
                  <>
                    <CleanerCreateOrderDialog onOrderCreated={handleOrdersRefresh} />
                    <CleanerOrdersList
                      refreshTrigger={ordersRefresh}
                      onRefresh={handleOrdersRefresh}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Заказы будут доступны после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.3s' }}>
            <DashboardCard title="Календарь" icon={Calendar} {...cardProps}>
              <div className="space-y-3">
                {isApproved ? (
                  <OrdersCalendar
                    refreshTrigger={ordersRefresh}
                    userRole="cleaner"
                    onDateSelect={handleDateSelect}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Календарь будет доступен после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.35s' }}>
            <DashboardCard title="Недоступность" icon={CalendarX2} {...cardProps}>
              <div className="space-y-3">
                {isApproved ? (
                  <CleanerUnavailabilityManager onUnavailabilityChange={handleOrdersRefresh} />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Управление недоступностью будет доступно после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.4s' }}>
            <DashboardCard title="Мои цены" icon={Banknote} {...cardProps}>
              <div className="space-y-3">
                {isApproved ? (
                  <CleanerPricingForm cleanerId={user?.id || ''} />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Цены будут доступны после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.45s' }}>
            <DashboardCard title="Сообщения" icon={MessageCircle} {...cardProps}>
              <div className="space-y-3">
                {isApproved ? (
                  <CleanerChat />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Сообщения будут доступны после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Day Orders Dialog */}
        <CleanerDayOrdersDialog
          open={dayOrdersOpen}
          onOpenChange={setDayOrdersOpen}
          selectedDate={selectedDate}
        />
      </div>
    </DashboardLayout>
  );
};

export default CleanerDashboard;