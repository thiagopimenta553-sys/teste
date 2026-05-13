export default async function handler(req, res) {
  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const {
    churchName,
    ministryName,
    size,
    prompt,
    logoBase64,
    brandColor,
    references
  } = req.body;

  // Monta o prompt final enriquecido para o DALL·E
  const sizeMap = {
    feed:          { label: 'quadrado 1:1', width: 1024, height: 1024 },
    'feed-vertical': { label: 'vertical 4:5', width: 1024, height: 1024 },
    stories:       { label: 'Stories 9:16 vertical', width: 1024, height: 1792 },
    telao:         { label: 'widescreen 16:9 horizontal', width: 1792, height: 1024 },
    youtube:       { label: 'thumbnail YouTube 16:9 horizontal', width: 1792, height: 1024 },
  };

  const sizeInfo = sizeMap[size] || sizeMap['feed'];

  const systemContext = [
    `Você é um designer gráfico especialista em comunicação visual para igrejas evangélicas brasileiras.`,
    `Igreja: ${churchName || 'Igreja'}`,
    ministryName ? `Ministério: ${ministryName}` : '',
    brandColor ? `Cor principal da marca: ${brandColor}` : '',
    references ? `Referências visuais de estilo: ${references}` : '',
  ].filter(Boolean).join('\n');

  const fullPrompt = [
    systemContext,
    `Crie um banner ${sizeInfo.label} profissional para redes sociais de igreja com o seguinte briefing:`,
    prompt,
    `Estilo: fotorrealista ou digital art de alto nível, atmosfera épica e espiritual, iluminação dramática,`,
    `fundo escuro com detalhes dourados, tipografia bold moderna, composição cinematográfica.`,
    `O resultado deve parecer feito por um designer profissional, não por IA genérica.`,
    `Não inclua textos ou palavras na imagem.`,
  ].filter(Boolean).join(' ');

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: `${sizeInfo.width}x${sizeInfo.height}`,
        quality: 'hd',
        response_format: 'url',
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error('OpenAI error:', err);
      return res.status(500).json({ error: 'Erro ao chamar a OpenAI', detail: err });
    }

    const data = await openaiRes.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(500).json({ error: 'Imagem não retornada pela OpenAI' });
    }

    return res.status(200).json({ imageUrl });

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno do servidor', detail: err.message });
  }
}
