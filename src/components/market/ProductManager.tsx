import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductType } from "@/pages/Market";

interface ProductManagerProps {
  products: ProductType[];
  onProductsChange: () => void;
}

const PRODUCT_ICONS = ["📦", "🥛", "🍞", "🍎", "🥩", "🧀", "🥚", "🍚", "🥫", "🧴", "🧻", "🧹"];
const PRODUCT_CATEGORIES = [
  "Laticínios", "Padaria", "Frutas", "Carnes", "Frios", 
  "Grãos", "Enlatados", "Higiene", "Limpeza", "Bebidas", "Outros"
];
const PRODUCT_UNITS = ["un", "kg", "g", "L", "ml", "pct", "cx"];

export const ProductManager = ({ products, onProductsChange }: ProductManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "un",
    icon: "📦",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase.from("products").insert({
        user_id: user.id,
        name: formData.name.trim(),
        category: formData.category || null,
        unit: formData.unit,
        icon: formData.icon,
      });

      if (error) throw error;
      toast.success("Produto adicionado com sucesso!");
      setFormData({ name: "", category: "", unit: "un", icon: "📦" });
      onProductsChange();
    } catch (error: any) {
      toast.error("Erro ao adicionar produto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto removido!");
      onProductsChange();
    } catch (error: any) {
      toast.error("Erro ao remover produto: " + error.message);
    }
  };

  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, ProductType[]>);

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Adicionar Produto
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Cadastre produtos que você compra
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 sm:p-6 sm:pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Nome do Produto</Label>
              <Input
                id="productName"
                placeholder="Ex: Leite Integral"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select 
                  value={formData.icon} 
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Adicionar Produto
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Seus Produtos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 sm:p-6 sm:pt-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          {products.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhum produto cadastrado
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(groupedProducts).map(([category, prods]) => (
                <div key={category}>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2">{category}</h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    <AnimatePresence>
                      {prods.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card gap-2"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="text-xl sm:text-2xl shrink-0">{product.icon}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.unit}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
