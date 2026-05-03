import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { priceId, environment } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'priceId required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';
    const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await res.json();

    if (!data.data?.length) {
      return new Response(JSON.stringify({ error: 'Price not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ paddleId: data.data[0].id }), { headers: corsHeaders });
  } catch (e) {
    console.error('[get-paddle-price]', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
