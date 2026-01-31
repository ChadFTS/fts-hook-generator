// Claude-powered hook generation API

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, platform, count = 10 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const platformContext = platform && platform !== 'all' 
      ? `These hooks are specifically for ${platform} content.` 
      : 'These hooks should work across social media platforms.';

    const prompt = `You are an expert content strategist who creates viral hooks for social media content.

Generate exactly ${count} unique, scroll-stopping hooks for someone who creates content about: "${topic}"

${platformContext}

Requirements:
- Each hook must be specific to the topic "${topic}" - not generic templates
- Hooks should create curiosity, challenge assumptions, or promise transformation
- Mix different hook styles: contrarian takes, personal stories, numbers/data, questions, how-to promises
- Keep each hook to 1-2 sentences max
- Make them feel authentic, not clickbait-y
- Each hook should stand alone and make someone want to read more

Hook styles to include:
1. Results/transformation hook (I did X, here's how)
2. Contrarian/myth-busting hook (Stop doing X / X is wrong)
3. Story hook (The [person] who [did thing] taught me...)
4. Numbered list hook (X mistakes/secrets/tips)
5. Comparison hook (Most people do X, top performers do Y)
6. Problem/solution hook (Why your X isn't working)
7. Shortcut/cheat code hook (I spent X learning, here's the shortcut)
8. You don't need X hook (Challenge common assumptions)
9. Insider knowledge hook (What experts know that you don't)
10. Curiosity gap hook (Open a loop that demands closure)

Return ONLY a JSON array of strings with the ${count} hooks, no other text. Example format:
["Hook 1 text here.", "Hook 2 text here."]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return res.status(500).json({ error: 'Failed to generate hooks' });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse the JSON array from Claude's response
    let hooks;
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        hooks = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (parseError) {
      console.error('Failed to parse hooks:', parseError, content);
      return res.status(500).json({ error: 'Failed to parse generated hooks' });
    }

    return res.status(200).json({ 
      success: true, 
      hooks: hooks,
      topic: topic
    });

  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
