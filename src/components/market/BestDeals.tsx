import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingDown, Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type { StoreType, ProductType, PriceRecordType } from "@/pages/Market";

interface BestDealsProps {
  products: ProductType[];
  stores: StoreType[];
  priceRecords: PriceRecordType[];
}

interface BestDeal {
  product: ProductType;
  bestStore: StoreType;
  bestPrice: number;
  avgPrice: number;
  savings: number;
  savingsPercent: number;
}

export const BestDeals = ({ products, stores, priceRecords }: BestDealsProps) => {
  const bestDeals = useMemo(() => {
    const deals: BestDeal[] = [];

    products.forEach(product => {
      const productRecords = priceRecords.filter(r => r.product_id === product.id);
      if (productRecords.length === 0) return;

      // Get latest price per store
      const latestPriceByStore = new Map<string, { price: number; quantity: number }>();
      
      productRecords.forEach(record => {
        const existing = latestPriceByStore.get(record.store_id);
        if (!existing || record.date > (priceRecords.find(r => 
          r.store_id === record.store_id && 
          r.product_id === product.id &&
          r.price === existing.price
        )?.date || "")) {
          latestPriceByStore.set(record.store_id, { 
            price: record.price, 
            quantity: record.quantity || 1 
          });
        }
      });

      if (latestPriceByStore.size === 0) return;

      // Calculate unit prices
      const unitPrices: { storeId: string; unitPrice: number }[] = [];
      latestPriceByStore.forEach((data, storeId) => {
        unitPrices.push({ storeId, unitPrice: data.price / data.quantity });
      });

      if (unitPrices.length === 0) return;

      // Find best price and calculate average
      const sorted = unitPrices.sort((a, b) => a.unitPrice - b.unitPrice);
      const bestPriceData = sorted[0];
      const avgPrice = unitPrices.reduce((a, b) => a + b.unitPrice, 0) / unitPrices.length;
      
      const bestStore = stores.find(s => s.id === bestPriceData.storeId);
      if (!bestStore) return;

      const savings = avgPrice - bestPriceData.unitPrice;
      const savingsPercent = (savings / avgPrice) * 100;

      if (savingsPercent > 0) {
        deals.push({
          product,
          bestStore,
          bestPrice: bestPriceData.unitPrice,
          avgPrice,
          savings,
          savingsPercent,
        });
      }
    });

    return deals.sort((a, b) => b.savingsPercent - a.savingsPercent);
  }, [products, stores, priceRecords]);

  const storeRecommendations = useMemo(() => {
    const storeScores = new Map<string, { store: StoreType; bestProducts: number; totalSavings: number }>();

    bestDeals.forEach(deal => {
      const existing = storeScores.get(deal.bestStore.id);
      if (existing) {
        existing.bestProducts += 1;
        existing.totalSavings += deal.savings;
      } else {
        storeScores.set(deal.bestStore.id, {
          store: deal.bestStore,
          bestProducts: 1,
          totalSavings: deal.savings,
        });
      }
    });

    return Array.from(storeScores.values())
      .sort((a, b) => b.bestProducts - a.bestProducts);
  }, [bestDeals]);

  if (priceRecords.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhum preço registrado ainda</p>
          <p className="text-muted-foreground">
            Registre preços de produtos para ver as melhores ofertas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Recommendations */}
      {storeRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Onde Comprar
            </CardTitle>
            <CardDescription>
              Lojas com mais produtos com melhor preço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storeRecommendations.slice(0, 3).map((rec, index) => (
                <motion.div
                  key={rec.store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: rec.store.color + "20" }}
                    >
                      <Store className="h-6 w-6" style={{ color: rec.store.color }} />
                    </div>
                    <div>
                      <p className="font-semibold">{rec.store.name}</p>
                      {rec.store.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {rec.store.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{rec.bestProducts}</p>
                      <p className="text-xs text-muted-foreground">produtos com melhor preço</p>
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      Economia: R$ {rec.totalSavings.toFixed(2)}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Deals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-success" />
            Melhores Preços por Produto
          </CardTitle>
          <CardDescription>
            Onde encontrar cada produto pelo menor preço
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bestDeals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Registre preços em múltiplas lojas para ver comparações
            </p>
          ) : (
            <div className="space-y-3">
              {bestDeals.map((deal, index) => (
                <motion.div
                  key={deal.product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{deal.product.icon}</span>
                    <div>
                      <p className="font-medium">{deal.product.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: deal.bestStore.color }} 
                        />
                        <span>{deal.bestStore.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      R$ {deal.bestPrice.toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{deal.product.unit}
                      </span>
                    </p>
                    <Badge 
                      variant="secondary" 
                      className="bg-success/10 text-success"
                    >
                      -{deal.savingsPercent.toFixed(0)}% vs média
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
