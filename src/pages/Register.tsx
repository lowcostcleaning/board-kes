import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LogOut, ArrowLeft, Brush, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'cleaner' | 'manager'>('cleaner');
  const [companyName, setCompanyName] = useState('');
  const [airbnbProfileLink, setAirbnbProfileLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, isAuthenticated, logout, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      const path =
        profile.role === 'demo_manager'
          ? '/manager'
          : profile.role === 'demo_cleaner'
            ? '/cleaner'
            : `/${profile.role}`;
      navigate(path, { replace: true });
    }
  }, [isAuthenticated, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Ошибка',
        description: 'Пароль должен быть не менее 6 символов',
        variant: 'destructive',
      });
      return;
    }

    // Airbnb profile link is required for managers
    if (role === 'manager' && !airbnbProfileLink.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Ссылка на профиль Airbnb обязательна для управляющей компании',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    const managerData = role === 'manager' ? { companyName, airbnbProfileLink } : {};

    const { error } = await register(name, email, password, role, managerData);
    
    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Аккаунт создан!',
        description: 'Проверьте email для подтверждения.',
      });
    }
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="CleanOS" className="w-10 h-10 rounded-xl" />
          <span className="font-bold text-xl text-foreground">CleanOS</span>
        </Link>
        {isAuthenticated && (
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md shadow-soft border-border/50 animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Регистрация</CardTitle>
            <CardDescription>Присоединяйтесь к CleanOS</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Введите имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Введите email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Создайте пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label>Выберите роль</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as 'cleaner' | 'manager')}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="cleaner"
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      role === 'cleaner'
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="cleaner" id="cleaner" className="sr-only" />
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      role === 'cleaner' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Brush className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Клинер</span>
                  </Label>
                  <Label
                    htmlFor="manager"
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      role === 'manager'
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="manager" id="manager" className="sr-only" />
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      role === 'manager' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Управляющая компания</span>
                  </Label>
                </RadioGroup>
              </div>
              
              {role === 'manager' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Название управляющей компании (если есть)</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Название компании"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="airbnbProfileLink">Ссылка на профиль Airbnb <span className="text-destructive">*</span></Label>
                    <Input
                      id="airbnbProfileLink"
                      type="url"
                      placeholder="https://www.airbnb.com/users/show/..."
                      value={airbnbProfileLink}
                      onChange={(e) => setAirbnbProfileLink(e.target.value)}
                      required={role === 'manager'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Обязательное поле для управляющей компании
                    </p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Создание...' : 'Создать аккаунт'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Войти
                </Link>
              </p>
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center"
              >
                <ArrowLeft className="w-3 h-3" />
                На главную
              </Link>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default Register;