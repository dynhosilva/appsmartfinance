import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingDown, TrendingUp, Minus, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StoreType, ProductType, PriceRecordType } from "@/pages/Market";

interface PriceComparisonProps {
  products: ProductType[];
  stores: StoreType[];
  priceRecords: PriceRecordType[];
}

export const PriceComparison = ({ products, stores, priceRecords }: PriceComparisonProps) => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const chartData = useMemo(() => {
    if (!selectedProductId) return [];

    const productRecords = priceRecords.filter(r => r.product_id === selectedProductId);
    
    // Group by date
    const dateMap = new Map<string, Record<string, number>>();
    
    productRecords.forEach(record => {
      const dateKey = record.date;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      const dateEntry = dateMap.get(dateKey)!;
      const unitPrice = record.price / (record.quantity || 1);
      dateEntry[record.store_id] = unitPrice;
    });

    // Convert to array and sort by date
    return Array.from(dateMap.entries())
      .map(([date, prices]) => ({
        date,
        formattedDate: format(parseISO(date), "dd/MM", { locale: ptBR }),
        ...prices,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 records
  }, [selectedProductId, priceRecords]);

  const priceStats = useMemo(() => {
    if (!selectedProductId) return [];

    const productRecords = priceRecords.filter(r => r.product_id === selectedProductId);
    
    const storeStats = stores.map(store => {
      const storeRecords = productRecords
        .filter(r => r.store_id === store.id)
        .map(r => r.price / (r.quantity || 1));

      if (storeRecords.length === 0) return null;

      const latestRecord = productRecords
        .filter(r => r.store_id === store.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      const currentPrice = latestRecord ? latestRecord.price / (latestRecord.quantity || 1) : 0;
      const avgPrice = storeRecords.reduce((a, b) => a + b, 0) / storeRecords.length;
      const minPrice = Math.min(...storeRecords);
      const maxPrice = Math.max(...storeRecords);

      // Price trend (comparing last two records)
      const sortedRecords = productRecords
        .filter(r => r.store_id === store.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      
      let trend: "up" | "down" | "stable" = "stable";
      if (sortedRecords.length >= 2) {
        const latest = sortedRecords[0].price / (sortedRecords[0].quantity || 1);
        const previous = sortedRecords[1].price / (sortedRecords[1].quantity || 1);
        if (latest > previous * 1.01) trend = "up";
        else if (latest < previous * 0.99) trend = "down";
      }

      return {
        store,
        currentPrice,
        avgPrice,
        minPrice,
        maxPrice,
        recordCount: storeRecords.length,
        trend,
      };
    }).filter(Boolean);

    return storeStats.sort((a, b) => a!.currentPrice - b!.currentPrice);
  }, [selectedProductId, priceRecords, stores]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparação de Preços
          </CardTitle>
          <CardDescription>
            Compare preços de um produto entre diferentes estabelecimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label>Selecione um Produto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um produto para comparar" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.icon} {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedProductId && priceStats.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {priceStats.map((stat) => stat && (
              <Card key={stat.store.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: stat.store.color + "20" }}
                      >
                        <span 
                          className="font-bold text-sm"
                          style={{ color: stat.store.color }}
                        >
                          {stat.store.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{stat.store.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.recordCount} {stat.recordCount === 1 ? "registro" : "registros"}
                        </p>
                      </div>
                    </div>
                    {stat.trend === "up" && (
                      <TrendingUp className="h-5 w-5 text-destructive" />
                    )}
                    {stat.trend === "down" && (
                      <TrendingDown className="h-5 w-5 text-success" />
                    )}
                    {stat.trend === "stable" && (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Preço Atual</span>
                      <span className="font-bold text-lg">
                        R$ {stat.currentPrice.toFixed(2)}/{selectedProduct?.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Média</span>
                      <span>R$ {stat.avgPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mín / Máx</span>
                      <span>
                        R$ {stat.minPrice.toFixed(2)} - R$ {stat.maxPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {priceStats[0] === stat && (
                    <div className="mt-3 px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full text-center">
                      Melhor preço atual
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Preços</CardTitle>
                <CardDescription>
                  Histórico de preços por estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="formattedDate" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `R$${value.toFixed(0)}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, ""]}
                      />
                      <Legend />
                      {stores.map((store) => (
                        <Line
                          key={store.id}
                          type="monotone"
                          dataKey={store.id}
                          name={store.name}
                          stroke={store.color}
                          strokeWidth={2}
                          dot={{ fill: store.color }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedProductId && priceStats.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum registro de preço encontrado para este produto
          </CardContent>
        </Card>
      )}
    </div>
  );
};
