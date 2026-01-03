import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid recovery session
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Пароли не совпадают',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Ошибка',
        description: 'Пароль должен быть минимум 6 символов',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: 'Пароль изменён',
        description: 'Теперь вы можете войти с новым паролем',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить пароль',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {isSuccess ? (
                <CheckCircle className="w-6 h-6 text-primary" />
              ) : (
                <KeyRound className="w-6 h-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {isSuccess ? 'Пароль изменён!' : 'Новый пароль'}
            </CardTitle>
            <CardDescription>
              {isSuccess 
                ? 'Перенаправляем на страницу входа...' 
                : 'Введите новый пароль для вашего аккаунта'}
            </CardDescription>
          </CardHeader>
          
          {isSuccess ? (
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Ваш пароль успешно изменён
              </p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Новый пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
                </Button>
              </CardFooter>
            </form>
          )}
          
          <CardFooter className="flex flex-col gap-2 pt-0">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center"
            >
              <ArrowLeft className="w-3 h-3" />
              Вернуться к входу
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default ResetPassword;
