import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';

const Index = () => {
  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Lowcost Cleaning" className="w-12 h-12 object-contain" />
          <span className="font-bold text-xl text-foreground">Lowcost Cleaning</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="mb-8">
            <img src={logo} alt="Lowcost Cleaning" className="w-32 h-32 mx-auto mb-6 object-contain" />
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Lowcost Cleaning
            </h1>
            <p className="text-muted-foreground text-lg">
              Professional Cleaners
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="gap-2 shadow-soft">
              <Link to="/login">
                Login
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">
                Register
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        © 2024 Lowcost Cleaning. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
