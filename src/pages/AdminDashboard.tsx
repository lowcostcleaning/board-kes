import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield, UserCheck, UserX, Brush, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock users data - will be replaced with Supabase data later
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'cleaner', status: 'pending' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', status: 'active' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'cleaner', status: 'active' },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState(mockUsers);

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ));
    toast({
      title: 'Role updated',
      description: `User role has been changed to ${newRole}`,
    });
  };

  const handleStatusToggle = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: u.status === 'active' ? 'pending' : 'active' } : u
    ));
    toast({
      title: 'Status updated',
      description: 'User status has been updated',
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'cleaner':
        return <Brush className="w-3 h-3" />;
      case 'manager':
        return <Briefcase className="w-3 h-3" />;
      case 'admin':
        return <Shield className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Manage users and their roles from the admin panel.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-active/15 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-status-active" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-pending/15 flex items-center justify-center">
                <UserX className="w-5 h-5 text-status-pending" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div style={{ animationDelay: '0.2s' }}>
          <DashboardCard title="Users" icon={Users}>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-medium text-accent-foreground">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={u.status === 'active' ? 'default' : 'secondary'}
                      className={u.status === 'active' ? 'bg-status-active/15 text-status-active hover:bg-status-active/20' : 'bg-status-pending/15 text-status-pending hover:bg-status-pending/20'}
                    >
                      {u.status}
                    </Badge>
                    <Select
                      value={u.role}
                      onValueChange={(value) => handleRoleChange(u.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(u.role)}
                            <span className="capitalize">{u.role}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cleaner">
                          <div className="flex items-center gap-2">
                            <Brush className="w-3 h-3" />
                            Cleaner
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            Manager
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusToggle(u.id)}
                    >
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* Roles Management */}
        <div style={{ animationDelay: '0.3s' }}>
          <DashboardCard title="Roles Management" icon={Shield}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage user roles and permissions. Admin role can only be assigned from this panel.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Brush className="w-4 h-4 text-primary" />
                    <span className="font-medium">Cleaner</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    View assigned cleanings and calendar
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span className="font-medium">Manager</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manage objects and orders
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium">Admin</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Full access to user management
                  </p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
