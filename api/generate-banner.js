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
    brandColor,
    references
  } = req.body;

  // DALL-E 2 só aceita: 256x256, 512x512, 1024x1024
  const sizeLabels = {
    feed:            'quadrado 1:1 para feed do Instagram',
    'feed-vertical': 'vertical para feed do Instagram',
    stories:         'Stories vertical 9:16',
    telao:           'telão widescreen horizontal',
    youtube:         'thumbnail YouTube horizontal',
  };

  const sizeLabel = sizeLabels[size] || sizeLabels['feed'];

  const contextParts = [
    `Igreja: ${churchName || 'Igreja'}`,
    ministryName ? `Ministério: ${ministryName}` : '',
    brandColor ? `Cor principal: ${brandColor}` : '',
    references ? `Referências de estilo: ${references}` : '',
  ].filter(Boolean).join(', ');

  const fullPrompt = [
    `Banner ${sizeLabel} profissional para igreja evangélica brasileira.`,
    contextParts,
    `Briefing: ${prompt}`,
    `Estilo visual: atmosfera épica e espiritual, iluminação dramática cinematográfica, fundo escuro com detalhes dourados, composição de alto impacto visual, qualidade de designer profissional.`,
    `Não inclua textos, palavras ou letras na imagem.`,
  ].filter(Boolean).join(' ');

  // DALL-E 2 tem limite de 1000 caracteres no prompt
  const trimmedPrompt = fullPrompt.length > 1000
    ? fullPrompt.substring(0, 997) + '...'
    : fullPrompt;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-2',
        prompt: trimmedPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error('OpenAI error:', JSON.stringify(err));
      return res.status(500).json({ error: 'Erro ao chamar a OpenAI', detail: err });
    }

    const data = await openaiRes.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(500).json({ error: 'Imagem não retornada pela OpenAI' });
    }

    return res.status(200).json({ imageUrl });

  } catch (err) {
    console.error('Erro interno:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor', detail: err.message });
  }
}
