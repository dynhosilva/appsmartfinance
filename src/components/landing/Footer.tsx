import { Mail, Instagram, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoSmartFinance from "@/assets/logo-smartfinance.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    produto: [
      { label: "Recursos", href: "#features" },
      { label: "Planos", href: "#pricing" },
      { label: "Como Funciona", href: "#how-it-works" },
    ],
    suporte: [
      { label: "Central de Ajuda", href: "#" },
      { label: "Contato", href: "#" },
      { label: "FAQ", href: "#" },
    ],
    legal: [
      { label: "Termos de Uso", href: "#" },
      { label: "Política de Privacidade", href: "#" },
      { label: "Política de Cookies", href: "#" },
    ],
  };

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src={logoSmartFinance} 
                alt="Smart Finance" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-muted-foreground max-w-xs">
              Sua plataforma completa para controle financeiro pessoal. 
              Simplifique sua vida financeira e alcance a independência.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2">
              {footerLinks.produto.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2">
              {footerLinks.suporte.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Smart Finance. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com 💚 para sua independência financeira
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
