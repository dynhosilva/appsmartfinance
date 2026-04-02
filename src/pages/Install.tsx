import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  Download,
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoSmartFinance from "@/assets/logo-smartfinance.png";
import appIcon from "@/assets/app-icon.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detectar dispositivo
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const iosSteps = [
    {
      step: 1,
      icon: Share,
      title: "Toque no botão Compartilhar",
      description: "Na barra inferior do Safari, toque no ícone de compartilhar (quadrado com seta para cima)"
    },
    {
      step: 2,
      icon: PlusSquare,
      title: "Adicionar à Tela de Início",
      description: "Role as opções e toque em \"Adicionar à Tela de Início\""
    },
    {
      step: 3,
      icon: CheckCircle2,
      title: "Confirme a instalação",
      description: "Toque em \"Adicionar\" no canto superior direito. Pronto!"
    }
  ];

  const androidSteps = [
    {
      step: 1,
      icon: MoreVertical,
      title: "Abra o menu do navegador",
      description: "Toque nos três pontinhos (⋮) no canto superior direito do Chrome"
    },
    {
      step: 2,
      icon: Download,
      title: "Instalar aplicativo",
      description: "Toque em \"Instalar aplicativo\" ou \"Adicionar à tela inicial\""
    },
    {
      step: 3,
      icon: CheckCircle2,
      title: "Confirme a instalação",
      description: "Toque em \"Instalar\" na janela que aparecer. Pronto!"
    }
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="pb-3 pt-5">
            <div className="mx-auto mb-3">
              <img src={logoSmartFinance} alt="Smart Finance" className="h-12 w-auto mx-auto" />
            </div>
            <div className="flex justify-center mb-3">
              <div className="p-2.5 rounded-full bg-success/10">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl">App Instalado!</CardTitle>
            <CardDescription className="text-sm">
              O Smart Finance já está na sua tela inicial. Acesse como qualquer app!
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-5">
            <Button onClick={() => navigate("/dashboard")} className="w-full" size="sm">
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-3 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={logoSmartFinance} alt="Smart Finance" className="h-7 w-auto" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-5 max-w-lg">
        {/* Hero */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <img 
              src={appIcon} 
              alt="Smart Finance App" 
              className="h-20 w-20 rounded-xl shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold mb-1.5">Instale o Smart Finance</h1>
          <p className="text-sm text-muted-foreground">
            Adicione à tela inicial para acesso rápido
          </p>
        </div>

        {/* Benefícios */}
        <Card className="mb-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Benefícios do App</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Acesso rápido",
                "Funciona offline",
                "Mais rápido",
                "App nativo",
                "Notificações",
                "Sem ocupar memória"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                  <span className="text-xs">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botão de instalação automática (Android/Chrome) */}
        {deferredPrompt && (
          <Card className="mb-5 border-primary">
            <CardContent className="p-4">
              <div className="text-center">
                <Badge className="mb-2 bg-primary text-xs">Instalação Rápida</Badge>
                <p className="text-xs text-muted-foreground mb-3">
                  Seu dispositivo suporta instalação automática!
                </p>
                <Button onClick={handleInstallClick} size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-1.5" />
                  Instalar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções por sistema */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Passo a Passo</CardTitle>
            <CardDescription className="text-xs">
              Siga as instruções do seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Tabs defaultValue={isIOS ? "ios" : "android"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
                <TabsTrigger value="ios" className="flex items-center gap-1.5 text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  iPhone
                </TabsTrigger>
                <TabsTrigger value="android" className="flex items-center gap-1.5 text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.59-3.03-.94-4.73-.94s-3.29.35-4.73.94L5.13 5.67c-.18-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C2.86 11.19.77 13.93.77 17.19h22.46c0-3.26-2.09-5.98-5.63-7.71zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
                  </svg>
                  Android
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ios" className="space-y-2.5 mt-0">
                <div className="p-2.5 bg-warning/15 rounded-lg border border-warning/30">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold text-warning dark:text-warning">Importante:</span> Use o Safari
                  </p>
                </div>
                {iosSteps.map((item) => (
                  <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.step}
                        </Badge>
                        <span className="font-medium text-sm truncate">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="android" className="space-y-2.5 mt-0">
                <div className="p-2.5 bg-info/10 rounded-lg border border-info/20">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold text-info dark:text-info">Dica:</span> Use o Chrome
                  </p>
                </div>
                {androidSteps.map((item) => (
                  <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.step}
                        </Badge>
                        <span className="font-medium text-sm truncate">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* CTA Final */}
        <div className="mt-5 text-center pb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Depois de instalar, feche esta página
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Continuar no navegador
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Install;
