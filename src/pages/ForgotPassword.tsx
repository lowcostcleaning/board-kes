import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Sparkles, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Ошибка',
        description: 'Введите email',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'Email отправлен',
        description: 'Проверьте почту для сброса пароля',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
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
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Восстановление пароля</CardTitle>
            <CardDescription>
              {emailSent 
                ? 'Письмо отправлено на вашу почту' 
                : 'Введите email для сброса пароля'}
            </CardDescription>
          </CardHeader>
          
          {emailSent ? (
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Мы отправили инструкции по сбросу пароля на <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Не получили письмо? Проверьте папку "Спам"
              </p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Введите ваш email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Отправка...' : 'Отправить ссылку'}
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

export default ForgotPassword;
