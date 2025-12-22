import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TreePine, Snowflake } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex flex-col relative overflow-hidden">
      {/* Snowflakes decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <Snowflake
            key={i}
            className="absolute text-emerald-200/40 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${12 + Math.random() * 16}px`,
              height: `${12 + Math.random() * 16}px`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="p-6 relative z-10">
        <div className="flex items-center gap-2">
          <TreePine className="w-8 h-8 text-emerald-600" />
          <span className="font-bold text-xl text-emerald-700">Lowcost Cleaning</span>
          <TreePine className="w-8 h-8 text-emerald-600" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="text-center max-w-md animate-fade-in">
          <div className="mb-8">
            {/* Christmas-themed title */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <TreePine className="w-12 h-12 text-emerald-600" />
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="text-emerald-600 italic">Lowcost</span>{' '}
                <span className="text-red-500 italic">Cleaning</span>
              </h1>
              <TreePine className="w-12 h-12 text-emerald-600" />
            </div>
            
            <p className="text-muted-foreground text-lg mb-4">
              Профессиональный клининг
            </p>

            {/* New Year banner */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 text-sm text-amber-800">
              <span>🎄</span>
              <span>С Новым 2025 годом!</span>
              <span>🎄</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700">
              <Link to="/login">
                Войти
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Link to="/register">
                Регистрация
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground relative z-10">
        © 2025 Lowcost Cleaning. Все права защищены.
      </footer>
    </div>
  );
};

export default Index;
