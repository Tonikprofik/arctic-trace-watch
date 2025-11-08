import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();

    // Simulate Weaviate connectivity check
    // In production, this would actually test Weaviate connection
    const weaviateStatus = await checkWeaviateHealth();
    
    // Check OpenAI API key availability
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const openAIConfigured = !!openAIApiKey;

    // Overall system health
    const healthy = weaviateStatus.healthy && openAIConfigured;
    const responseTime = Date.now() - startTime;

    const healthResponse = {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        weaviate: {
          status: weaviateStatus.healthy ? "up" : "down",
          responseTime: weaviateStatus.responseTime,
          message: weaviateStatus.message
        },
        openai: {
          status: openAIConfigured ? "configured" : "missing",
          message: openAIConfigured ? "API key configured" : "API key not set"
        },
        edgeFunctions: {
          status: "up",
          responseTime
        }
      },
      ready: healthy,
      version: "1.0.0"
    };

    console.log("Health check performed:", {
      status: healthResponse.status,
      ready: healthResponse.ready,
      responseTime
    });

    return new Response(
      JSON.stringify(healthResponse),
      {
        status: healthy ? 200 : 503,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(
      JSON.stringify({ 
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        ready: false
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function checkWeaviateHealth(): Promise<{ 
  healthy: boolean; 
  responseTime: number; 
  message: string 
}> {
  const startTime = Date.now();
  
  try {
    // Simulate Weaviate connection check
    // In production, you would actually query Weaviate's /v1/.well-known/ready endpoint
    // For this mock, we'll simulate a successful connection with random delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    const responseTime = Date.now() - startTime;
    
    // Simulate occasional startup delays
    const isStartingUp = Math.random() < 0.1; // 10% chance of "starting up"
    
    if (isStartingUp) {
      return {
        healthy: false,
        responseTime,
        message: "Weaviate is starting up, retry in a few seconds"
      };
    }
    
    return {
      healthy: true,
      responseTime,
      message: "Connected to vector database"
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      healthy: false,
      responseTime,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}
