import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, logout, profile, isLoading, profileError } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect based on role from profiles table
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile) {
      // Redirect based on profiles.role
      switch (profile.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'manager':
        case 'demo_manager':
          navigate('/manager', { replace: true });
          break;
        case 'cleaner':
        case 'demo_cleaner':
          navigate('/cleaner', { replace: true });
          break;
        default:
          navigate('/cleaner', { replace: true });
      }
    }
  }, [isAuthenticated, profile, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await login(email, password);

    if (error) {
      toast({
        title: 'Ошибка входа',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: 'Вход выполнен',
      description: 'Загружаем профиль…',
    });
    setIsSubmitting(false);
  };

  // Show loading while checking auth or fetching profile
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        </div>
      </div>
    );
  }

  // If authenticated but profile failed to load, show error with logout option
  if (isAuthenticated && profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">Ошибка профиля</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Попробуйте выйти и войти снова. Если проблема повторяется, обратитесь к администратору.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={logout} className="w-full" variant="destructive">
              Выйти
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If authenticated and profile loaded, redirect will happen via useEffect
  if (isAuthenticated && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Перенаправление…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="CleanOS" className="w-10 h-10 rounded-xl" />
          <span className="font-bold text-xl text-foreground">CleanOS</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md shadow-soft border-border/50 animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Добро пожаловать</CardTitle>
            <CardDescription>Войдите в свой аккаунт</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Вход…' : 'Войти'}
              </Button>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Забыли пароль?
              </Link>
              <p className="text-sm text-muted-foreground text-center">
                Нет аккаунта?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Регистрация
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

export default Login;
