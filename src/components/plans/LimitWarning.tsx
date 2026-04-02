import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown } from "lucide-react";

interface LimitWarningProps {
  resource: string;
  current: number;
  max: number;
  onUpgrade?: () => void;
}

export function LimitWarning({ resource, current, max, onUpgrade }: LimitWarningProps) {
  const navigate = useNavigate();
  const isAtLimit = current >= max;
  const isNearLimit = current >= max - 1;

  if (!isNearLimit) return null;

  return (
    <Alert variant={isAtLimit ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isAtLimit ? `Limite de ${resource} atingido` : `Quase no limite de ${resource}`}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
        <span>
          Você está usando {current} de {max} {resource}.
          {isAtLimit ? " Faça upgrade para adicionar mais." : ""}
        </span>
        <Button 
          variant={isAtLimit ? "default" : "outline"} 
          size="sm"
          onClick={() => onUpgrade ? onUpgrade() : navigate("/upgrade")}
        >
          <Crown className="h-4 w-4 mr-2" />
          Fazer Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
}
