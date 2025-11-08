import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trajectories, userPrompt } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Build context from trajectories
    const trajectoryContext = trajectories.map((traj: any, idx: number) => {
      return `Trajectory ${idx + 1}:
- MMSI: ${traj.mmsi || 'Unknown'}
- Ship Type: ${traj.shipType || 'Unknown'}
- Location: ${traj.centroid ? `${traj.centroid.latitude.toFixed(4)}°N, ${traj.centroid.longitude.toFixed(4)}°E` : 'Unknown'}
- Track Length: ${traj.trackLength || 'Unknown'} points
- Time Range: ${traj.timeStart || 'Unknown'} to ${traj.timeEnd || 'Unknown'}
- Distance Score: ${traj.distance !== undefined ? traj.distance.toFixed(3) : 'N/A'}`;
    }).join('\n\n');

    const systemPrompt = `You are an expert maritime C2 (Command & Control) analyst specializing in threat assessment and anomaly detection in Arctic waters near Svalbard. 

Your role is to:
1. Analyze anomalous maritime trajectories
2. Assess potential security threats and risks
3. Provide actionable recommendations for human operators
4. Consider factors like vessel type, location, behavior patterns, and operational context

Be precise, professional, and focus on practical threat indicators. Structure your analysis clearly with threat level, key concerns, and recommended actions.`;

    const userMessage = `User Query: "${userPrompt}"

Analyze the following ${trajectories.length} anomalous maritime trajectories detected near Svalbard:

${trajectoryContext}

Provide a comprehensive threat analysis including:
1. Overall threat assessment (Low/Medium/High/Critical)
2. Key anomaly indicators and concerns
3. Specific vessel behaviors of interest
4. Recommended operational actions for the C2 team

Keep the analysis concise but thorough, suitable for immediate operational use.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_completion_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-threat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
