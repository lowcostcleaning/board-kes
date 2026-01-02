import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg animate-fade-in">
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight mb-6">
              <span className="text-foreground">Clean</span>
              <span className="text-muted-foreground">OS</span>
            </h1>
            
            <p className="text-muted-foreground text-xl font-light leading-relaxed">
              Календарь уборок и управление задачами для менеджеров и клинеров
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2 px-8 h-12 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90">
              <Link to="/login">
                Войти
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 h-12 text-base font-medium rounded-full border-border hover:bg-muted">
              <Link to="/register">
                Регистрация
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-sm text-muted-foreground">
        © 2026 CleanOS
      </footer>
    </div>
  );
};

export default Index;
