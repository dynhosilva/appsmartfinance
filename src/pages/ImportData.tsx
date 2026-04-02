import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, CheckCircle2, Loader2, Database, FileSpreadsheet, Trash2, FileText, X, AlertCircle, Image } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface ParsedData {
  profile?: {
    name?: string;
    emergencyGoalMonths?: number;
    emergencyGoalAmount?: number;
    currentReserve?: number;
  };
  fixedCosts: { name: string; amount: number }[];
  categories: { name: string; icon: string; color: string }[];
  incomes: { name: string; amount: number; date: string }[];
  expenses: { category: string; amount: number; date: string }[];
}

interface ProcessedFile {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  type: 'document' | 'image';
}

const ImportData = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<ProcessedFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [completed, setCompleted] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processingIndex, setProcessingIndex] = useState<number>(-1);
  const [stats, setStats] = useState({
    categories: 0,
    fixedCosts: 0,
    incomes: 0,
    expenses: 0,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedDocumentTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    ];

    const newFiles: ProcessedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const isDocument = allowedDocumentTypes.includes(file.type) || 
        ['xlsx', 'xls', 'csv', 'pdf'].includes(fileExtension || '');
      const isImage = allowedImageTypes.includes(file.type) || 
        ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension || '');

      if (isDocument || isImage) {
        newFiles.push({
          file,
          status: 'pending',
          type: isImage ? 'image' : 'document'
        });
      } else {
        toast.error(`Arquivo "${file.name}" não suportado.`);
      }
    }

    if (newFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setParseError(null);
    setCompleted(false);

    // Process files sequentially
    await processFiles([...selectedFiles, ...newFiles]);
  };

  const processFiles = async (files: ProcessedFile[]) => {
    setParsing(true);
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      setProcessingIndex(i);
      setSelectedFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        if (files[i].type === 'image') {
          await parseImageFile(files[i].file);
        } else {
          await parseFile(files[i].file);
        }
        
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'done' } : f
        ));
      } catch (error: any) {
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }
    
    setProcessingIndex(-1);
    setParsing(false);
  };

  const parseImageFile = async (file: File) => {
    setParsing(true);
    setParseError(null);

    try {
      toast.info("Analisando imagem com IA... Isso pode levar alguns segundos.");
      
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error("Erro ao ler imagem"));
        reader.readAsDataURL(file);
      });

      // Call edge function to process image with AI
      const { data, error } = await supabase.functions.invoke('process-transaction-image', {
        body: { imageBase64: base64 }
      });

      if (error) {
        throw new Error(error.message || "Erro ao processar imagem");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Não foi possível extrair transações da imagem");
      }

      const parsedResult = data.data as ParsedData;
      
      if (parsedResult.incomes.length === 0 && parsedResult.expenses.length === 0) {
        setParseError("Não foi possível identificar transações na imagem. Tente uma captura mais clara.");
      } else {
        // Accumulate transactions instead of replacing
        setParsedData(prev => {
          if (!prev) return parsedResult;
          return {
            ...prev,
            categories: [...prev.categories, ...parsedResult.categories.filter(
              newCat => !prev.categories.some(c => c.name.toLowerCase() === newCat.name.toLowerCase())
            )],
            fixedCosts: [...prev.fixedCosts, ...parsedResult.fixedCosts],
            incomes: [...prev.incomes, ...parsedResult.incomes],
            expenses: [...prev.expenses, ...parsedResult.expenses],
          };
        });
        toast.success(`Adicionadas ${parsedResult.incomes.length} receitas e ${parsedResult.expenses.length} despesas`);
      }
    } catch (error: any) {
      console.error("Image parse error:", error);
      setParseError(error.message || "Erro ao analisar imagem");
      toast.error("Erro ao processar imagem");
    } finally {
      setParsing(false);
    }
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setParseError(null);

    try {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'pdf') {
        // For PDF files, we'll extract text and try to parse financial data
        toast.info("Analisando PDF... Isso pode levar alguns segundos.");
        
        // Read PDF as text (basic extraction)
        const text = await extractTextFromPDF(file);
        const data = parseFinancialText(text);
        
        if (data.incomes.length === 0 && data.expenses.length === 0) {
          setParseError("Não foi possível identificar transações no PDF. Verifique se o arquivo contém dados financeiros estruturados.");
        } else {
          // Accumulate transactions instead of replacing
          setParsedData(prev => {
            if (!prev) return data;
            return {
              ...prev,
              categories: [...prev.categories, ...data.categories.filter(
                newCat => !prev.categories.some(c => c.name.toLowerCase() === newCat.name.toLowerCase())
              )],
              fixedCosts: [...prev.fixedCosts, ...data.fixedCosts],
              incomes: [...prev.incomes, ...data.incomes],
              expenses: [...prev.expenses, ...data.expenses],
            };
          });
          toast.success(`Adicionadas ${data.incomes.length} receitas e ${data.expenses.length} despesas`);
        }
      } else {
        // Excel/CSV files
        const data = await parseExcelFile(file);
        // Accumulate transactions instead of replacing
        setParsedData(prev => {
          if (!prev) return data;
          return {
            ...prev,
            categories: [...prev.categories, ...data.categories.filter(
              newCat => !prev.categories.some(c => c.name.toLowerCase() === newCat.name.toLowerCase())
            )],
            fixedCosts: [...prev.fixedCosts, ...data.fixedCosts],
            incomes: [...prev.incomes, ...data.incomes],
            expenses: [...prev.expenses, ...data.expenses],
          };
        });
        toast.success(`Adicionadas ${data.incomes.length} receitas e ${data.expenses.length} despesas`);
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      setParseError(error.message || "Erro ao analisar o arquivo");
      toast.error("Erro ao analisar arquivo");
    } finally {
      setParsing(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      console.log('Extracted PDF text:', fullText.substring(0, 1000)); // Debug log
      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Erro ao extrair texto do PDF');
    }
  };

  const parseFinancialText = (text: string): ParsedData => {
    const data: ParsedData = {
      fixedCosts: [],
      categories: [],
      incomes: [],
      expenses: [],
    };

    console.log('Parsing text length:', text.length);

    // Common category patterns with defaults
    const defaultCategories = [
      { name: "Mercado", icon: "🧺", color: "#22c55e" },
      { name: "Transporte", icon: "🚗", color: "#3b82f6" },
      { name: "Saúde", icon: "🔋", color: "#ec4899" },
      { name: "Alimentação", icon: "🍽️", color: "#14b8a6" },
      { name: "Moradia", icon: "🏠", color: "#8b5cf6" },
      { name: "Salário", icon: "💼", color: "#10b981" },
      { name: "Pix", icon: "💸", color: "#06b6d4" },
      { name: "Transferência", icon: "↔️", color: "#f97316" },
      { name: "Pagamento", icon: "💳", color: "#ef4444" },
      { name: "Outros", icon: "📦", color: "#6b7280" },
    ];
    data.categories = defaultCategories;

    // Split text into lines for better parsing
    const lines = text.split(/[\n\r]+/).filter(l => l.trim().length > 0);
    console.log('Number of lines:', lines.length);

    // Date patterns to detect transaction dates
    const datePatterns = [
      /(\d{2})\/(\d{2})\/(\d{4})/g,  // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/g,    // DD-MM-YYYY
      /(\d{2})\/(\d{2})\/(\d{2})/g,  // DD/MM/YY
    ];

    // Money patterns
    const moneyPatterns = [
      /R\$\s*([\d.,]+)/gi,           // R$ 1.234,56
      /(\d{1,3}(?:\.\d{3})*,\d{2})/g, // 1.234,56
      /(-?\d+[.,]\d{2})\s*(?:D|C)?/g, // -123,45 or 123,45 D/C
    ];

    let currentDate = new Date().toISOString().split('T')[0];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Try to find date in line
      for (const pattern of datePatterns) {
        const dateMatch = trimmedLine.match(pattern);
        if (dateMatch) {
          const dateParts = dateMatch[0].split(/[\/\-]/);
          if (dateParts.length >= 3) {
            let year = dateParts[2];
            if (year.length === 2) {
              year = '20' + year;
            }
            currentDate = `${year}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
          }
        }
      }

      // Find monetary values
      for (const pattern of moneyPatterns) {
        pattern.lastIndex = 0; // Reset regex
        let match;
        while ((match = pattern.exec(trimmedLine)) !== null) {
          let valueStr = match[1] || match[0];
          
          // Clean the value
          valueStr = valueStr.replace(/R\$\s*/gi, '').trim();
          
          // Handle Brazilian format (1.234,56 -> 1234.56)
          let cleanValue = valueStr
            .replace(/\./g, '') // Remove thousand separators
            .replace(',', '.'); // Convert decimal separator
          
          const amount = Math.abs(parseFloat(cleanValue));
          
          if (!isNaN(amount) && amount > 0 && amount < 1000000) {
            // Determine if income or expense based on context
            const lineUpper = trimmedLine.toUpperCase();
            const isIncome = 
              lineUpper.includes('RECEB') ||
              lineUpper.includes('CRÉDITO') ||
              lineUpper.includes('CREDITO') ||
              lineUpper.includes('SALÁRIO') ||
              lineUpper.includes('SALARIO') ||
              lineUpper.includes('ENTRADA') ||
              lineUpper.includes('DEPÓSITO') ||
              lineUpper.includes('DEPOSITO') ||
              lineUpper.includes('PIX RECEBIDO') ||
              lineUpper.includes('TED RECEBIDA') ||
              /\bC\s*$/.test(trimmedLine); // Ends with C (credit)

            const isExpense = 
              lineUpper.includes('DÉBITO') ||
              lineUpper.includes('DEBITO') ||
              lineUpper.includes('PAGAMENTO') ||
              lineUpper.includes('COMPRA') ||
              lineUpper.includes('SAQUE') ||
              lineUpper.includes('SAÍDA') ||
              lineUpper.includes('PIX ENVIADO') ||
              lineUpper.includes('TED ENVIADA') ||
              lineUpper.includes('TRANSFERÊNCIA') ||
              lineUpper.includes('TRANSFERENCIA') ||
              /\bD\s*$/.test(trimmedLine) || // Ends with D (debit)
              valueStr.startsWith('-');

            // Extract description from the line
            let description = trimmedLine
              .replace(/R\$\s*[\d.,]+/gi, '')
              .replace(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/g, '')
              .replace(/[\d.,]+[DC]?\s*$/g, '')
              .trim()
              .substring(0, 100);

            if (!description) {
              description = isIncome ? 'Receita' : 'Despesa';
            }

            // Categorize based on keywords
            let category = "Outros";
            if (/pix/i.test(lineUpper)) category = "Pix";
            else if (/transfer/i.test(lineUpper)) category = "Transferência";
            else if (/pagamento|pag\s/i.test(lineUpper)) category = "Pagamento";
            else if (/mercado|supermercado|atacad/i.test(lineUpper)) category = "Mercado";
            else if (/restaur|lanch|ifood|comida|aliment/i.test(lineUpper)) category = "Alimentação";
            else if (/uber|99|taxi|combustível|gasolina|estacion/i.test(lineUpper)) category = "Transporte";
            else if (/farmácia|hospital|médico|saúde|drogaria/i.test(lineUpper)) category = "Saúde";
            else if (/aluguel|condomínio|luz|água|internet|iptu/i.test(lineUpper)) category = "Moradia";
            else if (/salário|salario|ordenado/i.test(lineUpper)) category = "Salário";

            if (isIncome && !isExpense) {
              data.incomes.push({
                name: description,
                amount,
                date: currentDate,
              });
            } else {
              data.expenses.push({
                category,
                amount,
                date: currentDate,
              });
            }
          }
        }
      }
    });

    console.log('Parsed incomes:', data.incomes.length);
    console.log('Parsed expenses:', data.expenses.length);

    return data;
  };

  const parseExcelFile = async (file: File): Promise<ParsedData> => {
    // For Excel files, we read as text/CSV for basic support
    // More complex Excel parsing would require a library
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = parseCSVContent(content);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // For Excel files, try reading as text (works for simple files)
        reader.readAsText(file);
      }
    });
  };

  const parseCSVContent = (content: string): ParsedData => {
    const data: ParsedData = {
      fixedCosts: [],
      categories: [
        { name: "Mercado", icon: "🧺", color: "#22c55e" },
        { name: "Transporte", icon: "🚗", color: "#3b82f6" },
        { name: "Saúde", icon: "🔋", color: "#ec4899" },
        { name: "Alimentação", icon: "🍽️", color: "#14b8a6" },
        { name: "Salário", icon: "💼", color: "#10b981" },
        { name: "Outros", icon: "📦", color: "#6b7280" },
      ],
      incomes: [],
      expenses: [],
    };

    const lines = content.split('\n').filter(l => l.trim());
    const today = new Date().toISOString().split('T')[0];

    lines.forEach((line, index) => {
      if (index === 0) return; // Skip header
      
      const parts = line.split(/[,;\t]/);
      if (parts.length < 2) return;

      // Try to find date and amount columns
      let date = today;
      let amount = 0;
      let description = '';
      let type = 'expense';

      parts.forEach(part => {
        const trimmed = part.trim().replace(/"/g, '');
        
        // Check for date patterns
        if (/\d{2}[\/-]\d{2}[\/-]\d{4}/.test(trimmed)) {
          const [d, m, y] = trimmed.split(/[\/-]/);
          date = `${y}-${m}-${d}`;
        } else if (/\d{4}[\/-]\d{2}[\/-]\d{2}/.test(trimmed)) {
          date = trimmed.replace(/\//g, '-');
        }
        
        // Check for monetary values
        const numValue = parseFloat(trimmed.replace(/[R$\s.]/g, '').replace(',', '.'));
        if (!isNaN(numValue) && numValue > 0) {
          amount = numValue;
        }
        
        // Check for type indicators
        if (/receita|entrada|salário|income/i.test(trimmed)) {
          type = 'income';
        }
        
        // Use non-numeric parts as description
        if (!/^\d/.test(trimmed) && trimmed.length > 2 && !/^R?\$/.test(trimmed)) {
          description = trimmed;
        }
      });

      if (amount > 0) {
        if (type === 'income') {
          data.incomes.push({ name: description || `Receita ${index}`, amount, date });
        } else {
          data.expenses.push({ category: description || "Outros", amount, date });
        }
      }
    });

    return data;
  };

  const removeFile = (index?: number) => {
    if (index !== undefined) {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedFiles([]);
    }
    if (selectedFiles.length <= 1 || index === undefined) {
      setParsedData(null);
      setParseError(null);
      setCompleted(false);
      setStats({ categories: 0, fixedCosts: 0, incomes: 0, expenses: 0 });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importData = async () => {
    if (!parsedData) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        navigate("/auth");
        return;
      }

      // Step 1: Create or update profile
      setCurrentStep("Configurando perfil...");
      setProgress(5);
      
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: user.id,
          full_name: parsedData.profile?.name || "Usuário",
          email: user.email,
        });
      }

      // Step 2: Update emergency goal if present
      if (parsedData.profile?.emergencyGoalAmount || parsedData.profile?.currentReserve) {
        setCurrentStep("Configurando meta de reserva...");
        setProgress(10);
        
        const { data: existingGoal } = await supabase
          .from("emergency_goals")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        const goalData = {
          target_months: parsedData.profile?.emergencyGoalMonths || 6,
          target_amount: parsedData.profile?.emergencyGoalAmount || 0,
          current_amount: parsedData.profile?.currentReserve || 0,
          goal_type: "amount" as const,
        };

        if (!existingGoal) {
          await supabase.from("emergency_goals").insert({
            user_id: user.id,
            ...goalData,
          });
        } else {
          await supabase.from("emergency_goals").update(goalData).eq("user_id", user.id);
        }
      }

      // Step 3: Create categories
      setCurrentStep("Criando categorias...");
      setProgress(20);
      const categoryMap = new Map<string, string>();
      
      for (const cat of parsedData.categories) {
        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", cat.name)
          .maybeSingle();

        if (existing) {
          categoryMap.set(cat.name, existing.id);
        } else {
          const { data: newCat } = await supabase
            .from("categories")
            .insert({
              user_id: user.id,
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              is_default: false,
            })
            .select("id")
            .single();

          if (newCat) {
            categoryMap.set(cat.name, newCat.id);
          }
        }
      }
      setStats(prev => ({ ...prev, categories: parsedData.categories.length }));

      // Step 4: Create fixed costs
      if (parsedData.fixedCosts.length > 0) {
        setCurrentStep("Cadastrando custos fixos...");
        setProgress(35);
        
        for (const cost of parsedData.fixedCosts) {
          await supabase.from("fixed_costs").insert({
            user_id: user.id,
            name: cost.name,
            amount: cost.amount,
            is_variable: false,
          });
        }
        setStats(prev => ({ ...prev, fixedCosts: parsedData.fixedCosts.length }));
      }

      // Step 5: Create income transactions
      setCurrentStep("Importando receitas...");
      setProgress(50);
      
      const salaryCategory = categoryMap.get("Salário") || null;

      for (let i = 0; i < parsedData.incomes.length; i++) {
        const income = parsedData.incomes[i];
        
        await supabase.from("transactions").insert({
          user_id: user.id,
          amount: income.amount,
          type: "income",
          category_id: salaryCategory,
          description: income.name,
          date: income.date,
        });
        
        setProgress(50 + Math.floor((i / Math.max(parsedData.incomes.length, 1)) * 20));
      }
      setStats(prev => ({ ...prev, incomes: parsedData.incomes.length }));

      // Step 6: Create expense transactions
      setCurrentStep("Importando despesas...");
      setProgress(70);

      for (let i = 0; i < parsedData.expenses.length; i++) {
        const expense = parsedData.expenses[i];
        const categoryId = categoryMap.get(expense.category) || categoryMap.get("Outros") || null;

        await supabase.from("transactions").insert({
          user_id: user.id,
          amount: expense.amount,
          type: "expense",
          category_id: categoryId,
          description: expense.category,
          date: expense.date,
        });

        setProgress(70 + Math.floor((i / Math.max(parsedData.expenses.length, 1)) * 25));
      }
      setStats(prev => ({ ...prev, expenses: parsedData.expenses.length }));

      // Step 7: Update available balance
      setCurrentStep("Calculando saldo...");
      setProgress(95);
      
      const totalIncome = parsedData.incomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = parsedData.expenses.reduce((sum, e) => sum + e.amount, 0);
      const balance = totalIncome - totalExpense;

      const { data: existingBalance } = await supabase
        .from("user_balance")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingBalance) {
        await supabase
          .from("user_balance")
          .update({ available_balance: balance })
          .eq("user_id", user.id);
      } else {
        await supabase.from("user_balance").insert({
          user_id: user.id,
          available_balance: balance,
        });
      }

      setProgress(100);
      setCurrentStep("Importação concluída!");
      setCompleted(true);
      
      // Clear files after successful import (files are not stored, only data)
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success("Dados importados com sucesso!");

    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Erro ao importar dados: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Importar Dados</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Importar Dados Financeiros</CardTitle>
              <CardDescription>
                Importe seus dados de planilhas Excel, CSV, PDF ou prints de extrato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Area - Always visible when not completed */}
              {!completed && (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {selectedFiles.length > 0 ? "Adicionar mais arquivos" : "Clique para selecionar arquivos"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos suportados: Excel, CSV, PDF, Imagens (PNG, JPG)
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📸 Prints de extrato bancário são analisados por IA • Múltiplos arquivos suportados
                  </p>
                </div>
              )}

              {/* Selected Files List */}
              {selectedFiles.length > 0 && !completed && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {selectedFiles.length} arquivo(s) selecionado(s)
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile()}
                      className="text-danger hover:text-danger text-xs"
                      disabled={parsing || importing}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar todos
                    </Button>
                  </div>
                  <AnimatePresence>
                    {selectedFiles.map((processedFile, index) => (
                      <motion.div
                        key={`${processedFile.file.name}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          processedFile.status === 'error' 
                            ? 'bg-danger/10 border-danger/30' 
                            : processedFile.status === 'done'
                            ? 'bg-success/10 border-success/30'
                            : processedFile.status === 'processing'
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {processedFile.status === 'processing' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : processedFile.status === 'done' ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : processedFile.status === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-danger" />
                          ) : processedFile.type === 'image' ? (
                            <Image className="h-5 w-5 text-primary" />
                          ) : processedFile.file.name.endsWith('.pdf') ? (
                            <FileText className="h-5 w-5 text-danger" />
                          ) : (
                            <FileSpreadsheet className="h-5 w-5 text-success" />
                          )}
                          <div>
                            <p className="font-medium text-sm truncate max-w-[180px]">
                              {processedFile.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(processedFile.file.size / 1024).toFixed(1)} KB
                              {processedFile.type === 'image' && ' • IA'}
                              {processedFile.status === 'processing' && ' • Processando...'}
                              {processedFile.status === 'done' && ' • Concluído'}
                              {processedFile.status === 'error' && ` • ${processedFile.error || 'Erro'}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          className="h-7 w-7 text-muted-foreground hover:text-danger"
                          disabled={parsing || importing || processedFile.status === 'processing'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Parsing status */}
              {parsing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-3 py-4"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Analisando arquivos... ({selectedFiles.filter(f => f.status === 'done').length}/{selectedFiles.length})</span>
                </motion.div>
              )}

              {/* Parse error */}
              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              {/* Parsed Data Preview */}
              {parsedData && !completed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    Dados encontrados no arquivo
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Total de Receitas</p>
                      <p className="text-2xl font-bold text-success">
                        R$ {parsedData.incomes.reduce((s, i) => s + i.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{parsedData.incomes.length} transações</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Total de Despesas</p>
                      <p className="text-2xl font-bold text-danger">
                        R$ {parsedData.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{parsedData.expenses.length} transações</p>
                    </div>
                    {parsedData.fixedCosts.length > 0 && (
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Custos Fixos</p>
                        <p className="text-2xl font-bold">
                          R$ {parsedData.fixedCosts.reduce((s, c) => s + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">{parsedData.fixedCosts.length} contas</p>
                      </div>
                    )}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Categorias</p>
                      <p className="text-2xl font-bold">{parsedData.categories.length}</p>
                      <p className="text-xs text-muted-foreground">serão criadas</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    ⚠️ O arquivo não será armazenado, apenas os dados extraídos serão salvos.
                  </p>
                </motion.div>
              )}

              {/* Progress */}
              <AnimatePresence>
                {importing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{currentStep}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completion stats */}
              <AnimatePresence>
                {completed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-lg bg-success/10 border border-success/20"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                      <span className="font-semibold text-success">Importação Concluída!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>✅ {stats.categories} categorias criadas</div>
                      <div>✅ {stats.fixedCosts} custos fixos</div>
                      <div>✅ {stats.incomes} receitas</div>
                      <div>✅ {stats.expenses} despesas</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              {parsedData && !completed && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => removeFile()}
                    disabled={importing}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
                    onClick={importData}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Importar Dados
                      </>
                    )}
                  </Button>
                </div>
              )}

              {completed && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => removeFile()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Outro Arquivo
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => navigate("/dashboard")}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Ir para o Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default ImportData;
