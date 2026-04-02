import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Plus, Trash2, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { StoreType } from "@/pages/Market";

interface StoreManagerProps {
  stores: StoreType[];
  onStoresChange: () => void;
}

const STORE_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1"
];

export const StoreManager = ({ stores, onStoresChange }: StoreManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    color: STORE_COLORS[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome da loja é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase.from("stores").insert({
        user_id: user.id,
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        color: formData.color,
      });

      if (error) throw error;
      toast.success("Loja adicionada com sucesso!");
      setFormData({ name: "", location: "", color: STORE_COLORS[0] });
      onStoresChange();
    } catch (error: any) {
      toast.error("Erro ao adicionar loja: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("stores").delete().eq("id", id);
      if (error) throw error;
      toast.success("Loja removida!");
      onStoresChange();
    } catch (error: any) {
      toast.error("Erro ao remover loja: " + error.message);
    }
  };

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Adicionar Loja
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Cadastre os estabelecimentos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 sm:p-6 sm:pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input
                id="name"
                placeholder="Ex: Supermercado Extra"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização (opcional)</Label>
              <Input
                id="location"
                placeholder="Ex: Av. Principal, 123"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {STORE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Loja
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Store className="h-4 w-4 sm:h-5 sm:w-5" />
            Suas Lojas
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {stores.length} {stores.length === 1 ? "loja" : "lojas"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 sm:p-6 sm:pt-2">
          {stores.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhuma loja cadastrada
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <AnimatePresence>
                {stores.map((store) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: store.color + "20" }}
                      >
                        <Store className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: store.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{store.name}</p>
                        {store.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{store.location}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleDelete(store.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
