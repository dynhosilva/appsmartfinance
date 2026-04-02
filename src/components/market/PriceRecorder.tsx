import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StoreType, ProductType } from "@/pages/Market";

interface PriceRecorderProps {
  products: ProductType[];
  stores: StoreType[];
  onRecordAdded: () => void;
}

export const PriceRecorder = ({ products, stores, onRecordAdded }: PriceRecorderProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: "",
    storeId: "",
    price: "",
    quantity: "1",
    date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.storeId || !formData.price) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const price = parseFloat(formData.price);
    const quantity = parseFloat(formData.quantity) || 1;

    if (price <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase.from("price_records").insert({
        user_id: user.id,
        product_id: formData.productId,
        store_id: formData.storeId,
        price,
        quantity,
        date: formData.date,
      });

      if (error) throw error;
      toast.success("Preço registrado com sucesso!");
      setFormData({
        productId: "",
        storeId: "",
        price: "",
        quantity: "1",
        date: new Date().toISOString().split("T")[0],
      });
      onRecordAdded();
    } catch (error: any) {
      toast.error("Erro ao registrar preço: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === formData.productId);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Registrar Preço
        </CardTitle>
        <CardDescription>
          Registre o preço de um produto em um estabelecimento específico
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 || stores.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              {products.length === 0 && stores.length === 0
                ? "Cadastre produtos e lojas primeiro para registrar preços"
                : products.length === 0
                ? "Cadastre produtos primeiro para registrar preços"
                : "Cadastre lojas primeiro para registrar preços"}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select 
                value={formData.productId} 
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.icon} {product.name} ({product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estabelecimento</Label>
              <Select 
                value={formData.storeId} 
                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantidade {selectedProduct ? `(${selectedProduct.unit})` : ""}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
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
                  Registrar Preço
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
