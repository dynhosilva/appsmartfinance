import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart, Check, Package, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  is_purchased: boolean;
  order_index: number;
  created_at: string;
}

const CATEGORIES = [
  { value: "frutas", label: "🍎 Frutas", color: "bg-red-500/10 text-red-600" },
  { value: "verduras", label: "🥬 Verduras", color: "bg-green-500/10 text-green-600" },
  { value: "laticinios", label: "🧀 Laticínios", color: "bg-yellow-500/10 text-yellow-600" },
  { value: "carnes", label: "🥩 Carnes", color: "bg-orange-500/10 text-orange-600" },
  { value: "padaria", label: "🥖 Padaria", color: "bg-amber-500/10 text-amber-600" },
  { value: "bebidas", label: "🥤 Bebidas", color: "bg-blue-500/10 text-blue-600" },
  { value: "limpeza", label: "🧹 Limpeza", color: "bg-purple-500/10 text-purple-600" },
  { value: "higiene", label: "🧴 Higiene", color: "bg-pink-500/10 text-pink-600" },
  { value: "outros", label: "📦 Outros", color: "bg-muted text-muted-foreground" },
];

const UNITS = [
  { value: "un", label: "Unidade(s)" },
  { value: "kg", label: "Kg" },
  { value: "g", label: "Gramas" },
  { value: "l", label: "Litro(s)" },
  { value: "ml", label: "ml" },
  { value: "cx", label: "Caixa(s)" },
  { value: "pct", label: "Pacote(s)" },
  { value: "dz", label: "Dúzia(s)" },
];

interface SortableItemProps {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}

function SortableItem({ item, onToggle, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getCategoryInfo = (category: string | null) => {
    return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  const catInfo = getCategoryInfo(item.category);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
        isDragging ? "opacity-50 shadow-lg" : ""
      } ${
        item.is_purchased
          ? "bg-muted/50 border-muted"
          : "bg-card hover:bg-muted/30"
      }`}
    >
      <div
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <Checkbox
        checked={item.is_purchased}
        onCheckedChange={() => onToggle(item)}
      />
      <Badge variant="secondary" className={`${catInfo.color} text-xs shrink-0`}>
        {catInfo.label.split(" ")[0]}
      </Badge>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            item.is_purchased ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} {UNITS.find((u) => u.value === item.unit)?.label || item.unit}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

interface MobileItemProps {
  item: ShoppingItem;
  index: number;
  total: number;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  onMove: (direction: "up" | "down") => void;
}

function MobileItem({ item, index, total, onToggle, onDelete, onMove }: MobileItemProps) {
  const getCategoryInfo = (category: string | null) => {
    return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  const catInfo = getCategoryInfo(item.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
        item.is_purchased ? "bg-muted/50 border-muted" : "bg-card hover:bg-muted/30"
      }`}
    >
      <div className="flex flex-col -my-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove("up")}
          disabled={index === 0}
          aria-label="Mover para cima"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove("down")}
          disabled={index === total - 1}
          aria-label="Mover para baixo"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <Checkbox checked={item.is_purchased} onCheckedChange={() => onToggle(item)} />

      <Badge variant="secondary" className={`${catInfo.color} text-xs shrink-0`}>
        {catInfo.label.split(" ")[0]}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${item.is_purchased ? "line-through text-muted-foreground" : ""}`}>
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} {UNITS.find((u) => u.value === item.unit)?.label || item.unit}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
        aria-label="Remover item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    unit: "un",
    category: "",
  });

  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("shopping_list_items")
      .select("*")
      .order("is_purchased", { ascending: true })
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar lista de compras");
      return;
    }

    setItems(data || []);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newItem.name.trim()) {
      toast.error("Digite o nome do item");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get next order index
    const maxOrder = items.filter(i => !i.is_purchased).reduce((max, i) => Math.max(max, i.order_index || 0), 0);

    const { error } = await supabase.from("shopping_list_items").insert({
      user_id: user.id,
      name: newItem.name.trim(),
      quantity: newItem.quantity,
      unit: newItem.unit,
      category: newItem.category || null,
      order_index: maxOrder + 1,
    });

    if (error) {
      toast.error("Erro ao adicionar item");
      return;
    }

    toast.success("Item adicionado!");
    setNewItem({ name: "", quantity: 1, unit: "un", category: "" });
    loadItems();
  };

  const togglePurchased = async (item: ShoppingItem) => {
    const newPurchasedState = !item.is_purchased;
    
    // If marking as purchased, set high order_index to push to bottom
    // If unmarking, keep current order
    const newOrderIndex = newPurchasedState ? 999999 : item.order_index;

    const { error } = await supabase
      .from("shopping_list_items")
      .update({ 
        is_purchased: newPurchasedState,
        order_index: newOrderIndex
      })
      .eq("id", item.id);

    if (error) {
      toast.error("Erro ao atualizar item");
      return;
    }

    loadItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover item");
      return;
    }

    toast.success("Item removido");
    loadItems();
  };

  const clearPurchased = async () => {
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("is_purchased", true);

    if (error) {
      toast.error("Erro ao limpar itens");
      return;
    }

    toast.success("Itens comprados removidos");
    loadItems();
  };

  const movePendingItem = async (itemId: string, direction: "up" | "down") => {
    const pending = items.filter((i) => !i.is_purchased);
    const purchased = items.filter((i) => i.is_purchased);

    const oldIndex = pending.findIndex((i) => i.id === itemId);
    if (oldIndex < 0) return;

    const newIndex = direction === "up" ? oldIndex - 1 : oldIndex + 1;
    if (newIndex < 0 || newIndex >= pending.length) return;

    const newPending = arrayMove(pending, oldIndex, newIndex);
    setItems([...newPending, ...purchased]);

    const updates = newPending.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("shopping_list_items").update({ order_index: u.order_index }).eq("id", u.id)
      )
    );

    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast.error("Erro ao reordenar itens");
      loadItems();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const pending = items.filter((i) => !i.is_purchased);
    const purchased = items.filter((i) => i.is_purchased);

    const oldIndex = pending.findIndex((item) => item.id === active.id);
    const newIndex = pending.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newPending = arrayMove(pending, oldIndex, newIndex);
    setItems([...newPending, ...purchased]);

    const updates = newPending.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    await Promise.all(
      updates.map((u) =>
        supabase.from("shopping_list_items").update({ order_index: u.order_index }).eq("id", u.id)
      )
    );
  };

  // Separate pending and purchased items
  const pendingItems = items.filter((i) => !i.is_purchased);
  const purchasedItems = items.filter((i) => i.is_purchased);
  const pendingCount = pendingItems.length;
  const purchasedCount = purchasedItems.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{items.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10 shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{pendingCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 shrink-0">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{purchasedCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Comprados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Item Form */}
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Adicionar Item
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Adicione produtos à lista</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 sm:p-6 sm:pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <Input
                placeholder="Nome do produto"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                className="w-20"
              />
              <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shopping List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Lista de Compras
            </CardTitle>
            <CardDescription>
              {pendingCount > 0
                ? `${pendingCount} item(s) pendente(s) • ${isMobile ? "Use as setas para reordenar" : "Arraste para reordenar"}`
                : "Todos os itens foram comprados!"}
            </CardDescription>
          </div>
          {purchasedCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearPurchased}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar comprados
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Sua lista de compras está vazia</p>
              <p className="text-sm">Adicione itens acima para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Items */}
              {pendingItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    A comprar ({pendingCount})
                  </p>

                  {isMobile ? (
                    <div className="space-y-2">
                      {pendingItems.map((item, index) => (
                        <MobileItem
                          key={item.id}
                          item={item}
                          index={index}
                          total={pendingItems.length}
                          onToggle={togglePurchased}
                          onDelete={deleteItem}
                          onMove={(direction) => movePendingItem(item.id, direction)}
                        />
                      ))}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={pendingItems.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {pendingItems.map((item) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              onToggle={togglePurchased}
                              onDelete={deleteItem}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {/* Purchased Items - Not Draggable */}
              {purchasedItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 mt-6">
                    ✓ Comprados ({purchasedCount})
                  </p>
                  <div className="space-y-2 opacity-60">
                    {purchasedItems.map((item) => {
                      const catInfo = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[CATEGORIES.length - 1];
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50 border-muted"
                        >
                          <div className="w-4" /> {/* Spacer for alignment */}
                          <Checkbox
                            checked={item.is_purchased}
                            onCheckedChange={() => togglePurchased(item)}
                          />
                          <Badge variant="secondary" className={`${catInfo.color} text-xs shrink-0`}>
                            {catInfo.label.split(" ")[0]}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate line-through text-muted-foreground">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {UNITS.find((u) => u.value === item.unit)?.label || item.unit}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteItem(item.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
