import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Package, TrendingDown, Plus, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StoreManager } from "@/components/market/StoreManager";
import { ProductManager } from "@/components/market/ProductManager";
import { PriceRecorder } from "@/components/market/PriceRecorder";
import { PriceComparison } from "@/components/market/PriceComparison";
import { BestDeals } from "@/components/market/BestDeals";
import { ShoppingList } from "@/components/market/ShoppingList";
import { AppLayout } from "@/components/layout/AppLayout";
export interface StoreType {
  id: string;
  name: string;
  location: string | null;
  color: string;
}

export interface ProductType {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  icon: string;
}

export interface PriceRecordType {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
  quantity: number;
  date: string;
  products?: ProductType;
  stores?: StoreType;
}

const Market = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [priceRecords, setPriceRecords] = useState<PriceRecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("shopping");

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await loadData();
  };

  const loadData = async () => {
    setLoading(true);
    const [storesRes, productsRes, pricesRes] = await Promise.all([
      supabase.from("stores").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
      supabase.from("price_records").select("*, products(*), stores(*)").order("date", { ascending: false }),
    ]);

    if (storesRes.data) setStores(storesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (pricesRes.data) setPriceRecords(pricesRes.data as PriceRecordType[]);
    setLoading(false);
  };

  return (
    <AppLayout title="Mercado">
      <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">Gestão de Mercado</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare preços e organize compras
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 gap-1 h-auto p-1 sm:grid-cols-6 sm:h-10">
              <TabsTrigger value="shopping" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Comparar</span>
              </TabsTrigger>
              <TabsTrigger value="deals" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Ofertas</span>
              </TabsTrigger>
              <TabsTrigger value="prices" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Registrar</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Produtos</span>
              </TabsTrigger>
              <TabsTrigger value="stores" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
                <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Lojas</span>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="shopping" className="mt-0">
                  <ShoppingList />
                </TabsContent>

                <TabsContent value="comparison" className="mt-0">
                  <PriceComparison 
                    products={products} 
                    stores={stores} 
                    priceRecords={priceRecords} 
                  />
                </TabsContent>

                <TabsContent value="deals" className="mt-0">
                  <BestDeals 
                    products={products} 
                    stores={stores} 
                    priceRecords={priceRecords} 
                  />
                </TabsContent>

                <TabsContent value="prices" className="mt-0">
                  <PriceRecorder 
                    products={products} 
                    stores={stores} 
                    onRecordAdded={loadData} 
                  />
                </TabsContent>

                <TabsContent value="products" className="mt-0">
                  <ProductManager 
                    products={products} 
                    onProductsChange={loadData} 
                  />
                </TabsContent>

                <TabsContent value="stores" className="mt-0">
                  <StoreManager 
                    stores={stores} 
                    onStoresChange={loadData} 
                  />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Market;
