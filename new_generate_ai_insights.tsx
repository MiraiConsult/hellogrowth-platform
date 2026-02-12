  const generateAIInsights = async (productId: string, productName: string, productValue: number) => {
    setGeneratingAI(productId);
    try {
      // Fetch business profile to get context
      const { data: profileData, error: profileError } = await supabase!
        .from('business_profile')
        .select('company_name, business_type, business_description, target_audience, brand_tone, differentials')
        .eq('tenant_id', tenantId)
        .single();

      if (profileError) {
        console.warn('Perfil do negócio não encontrado, gerando sem contexto');
      }

      const businessContext = profileData ? `
Contexto do Negócio:
- Nome da Empresa: ${profileData.company_name || 'Não informado'}
- Tipo de Negócio: ${profileData.business_type || 'Não informado'}
- Descrição do Negócio: ${profileData.business_description || 'Não informado'}
- Público-Alvo: ${profileData.target_audience || 'Não informado'}
- Tom da Marca: ${profileData.brand_tone || 'Não informado'}
- Diferenciais: ${profileData.differentials || 'Não informado'}
` : '';

      const prompt = `Você é um especialista em marketing e vendas. Analise este produto/serviço considerando o contexto do negócio e gere uma descrição comercial atraente e 10 palavras-chave relevantes.

${businessContext}

Produto/Serviço: ${productName}
Valor: R$ ${productValue.toFixed(2)}

IMPORTANTE: Considere o tipo de negócio ao gerar a descrição. Por exemplo:
- Se for uma pet shop, a "Limpeza Dentária" é para animais de estimação
- Se for uma clínica médica, a "Limpeza Dentária" é para humanos
- Se for um salão de beleza, "Corte" refere-se a cabelo
- Etc.

Responda EXATAMENTE neste formato JSON (sem markdown, apenas JSON puro):
{
  "description": "Uma descrição comercial atraente do produto/serviço em 2-3 frases, considerando o contexto do negócio e o público-alvo",
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5", "palavra6", "palavra7", "palavra8", "palavra9", "palavra10"]
}

As palavras-chave devem ser relevantes para o produto/serviço E para o tipo de negócio.`;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Erro na API");

      const data = await response.json();
      let insights;

      try {
        const cleanResponse = data.response.replace(/```json\n?|\n?```/g, "").trim();
        insights = JSON.parse(cleanResponse);
      } catch {
        throw new Error("Resposta da IA inválida");
      }

      const { error } = await supabase!
        .from("products_services")
        .update({
          ai_description: insights.description,
          keywords: insights.keywords,
        })
        .eq("id", productId);

      if (error) throw error;

      const updatedProduct = {
        ai_description: insights.description,
        keywords: insights.keywords,
      };

      setProducts((prev) =>
        prev.map((p) => p.id === productId ? { ...p, ...updatedProduct } : p)
      );

      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct({ ...selectedProduct, ...updatedProduct });
      }

      showNotification("success", "Descrição e palavras-chave geradas com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
      showNotification("error", "Erro ao gerar insights da IA");
    } finally {
      setGeneratingAI(null);
    }
  };
