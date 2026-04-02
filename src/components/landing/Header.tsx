import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import logoSmartFinance from "@/assets/logo-smartfinance.png";

const Header = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Recursos", href: "#features" },
    { label: "Como Funciona", href: "#how-it-works" },
    { label: "Planos", href: "#pricing" },
    { label: "Depoimentos", href: "#testimonials" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img 
              src={logoSmartFinance} 
              alt="Smart Finance" 
              className="h-10 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button 
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              Começar Grátis
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-border mt-4 space-y-4 animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-left py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Alternar tema</span>
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">
                Entrar
              </Button>
              <Button 
                onClick={() => navigate("/auth")}
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              >
                Começar Grátis
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
