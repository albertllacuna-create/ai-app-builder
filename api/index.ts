import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { bundleProject } from './bundler.js';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =====================================================
// SYSTEM PROMPT BUILDER
// =====================================================
function buildSystemPrompt(currentFiles: Record<string, string>): string {
  const filesContext = Object.entries(currentFiles)
    .map(([path, content]) => `Archivo: ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n');

  const isProjectEmpty = !filesContext || Object.keys(currentFiles).filter(k => k !== '/public/index.html' && k !== '/src/index.tsx' && k !== '/src/styles.css' && k !== '/src/App.tsx').length === 0;

  return `
PROYECTO ACTUAL:
${filesContext || 'Proyecto vacío.'}
${isProjectEmpty ? '\n⚠️ PROYECTO VACÍO.' : ''}

## 1. IDENTIDAD
Eres un asistente especializado en crear aplicaciones y programas web funcionales. Tu objetivo es construir software real y útil, no demostraciones vacías.

## 2. COMPORTAMIENTO 
- Escucha la solicitud del usuario (ej: "crea un CRM").
- NO hagas preguntas adicionales ni des opciones.
- Toma tú mismo las decisiones arquitectónicas basándote en la información disponible y en tu experiencia como arquitecto.
- Genera el código directamente. Los usuarios prefieren ver resultados funcionales rápidamente, aunque luego pidan modificaciones.
- Si el mensaje empieza con "ERROR DE COMPILACIÓN DETECTADO AUTOMÁTICAMENTE": corrige solo los archivos afectados sin cambiar el resto.

---

## FORMATO DE RESPUESTA
Entrégate a una conversación fluida y natural, pero EMPIEZA A GENERAR CÓDIGO DIRECTAMENTE en el mismo mensaje. No te limites solo a explicar el plan. Da una breve introducción (1-2 frases) y genera todos los archivos de código inmediatamente.
Cuando necesites crear o modificar código, usa un bloque de código Markdown estandar (\`\`\`tsx).
La PRIMERA LÍNEA de cada bloque de código DEBE ser un comentario indicando la ruta del archivo empezando exactamente por: \`// filepath: /src/NombreArchivo.tsx\`

Ejemplo de cómo debes responder:

Voy a construir la página principal.
\`\`\`tsx
// filepath: /src/pages/Home.tsx
export default function Home() { ... }
\`\`\`
Y ahora configuraremos el enrutador:
\`\`\`tsx
// filepath: /src/App.tsx
import ...
\`\`\`

## REGLAS TÉCNICAS
- **Estrategia MVP (Producto Mínimo Viable)**: No intentes programar más de 5 o 6 archivos por respuesta (golpearías el límite máximo de tokens del servidor). Construye una versión inicial básica pero 100% FUNCIONAL. Podrás expandir las páginas restantes en siguientes mensajes cuando el usuario te lo pida.
- **Evitar Colapsos (Ley de Oro)**: NUNCA importes en \`App.tsx\` (o en cualquier otro archivo) un componente o página que no hayas creado físicamente en esta misma respuesta o de manera previa. Si no tienes espacio para crear "Contactos.tsx", entonces NO escribas el \`import Contactos...\` en App.tsx. Dejar "importaciones fantasmas" con comentarios tipo "// Lo crearemos luego" provoca una PANTALLA ROJA DE LA MUERTE en el compilador.
- **Orden de Creación**: Recuerda siempre crear primero los componentes que vayas a usar, y dejar \`App.tsx\` para el final del mensaje, asegurándote de enlazar SÓLO lo que acaba de ser creado.
- **Diseño**: Tailwind CSS siempre. Nunca CSS en línea. Usa lucide-react para iconos. Diseño visual premium.
- **Exports/Imports**: SIEMPRE usa \`export default function\`. En App.tsx importa con \`import NombreComponente from './pages/NombreComponente'\`. IMPORTA SIEMPRE TODO LO QUE USES: si usas \`<Link>\` importalo de \`react-router-dom\`, si usas iconos impórtalos de \`lucide-react\`. No asumas que están inyectados globalmente.
- **Páginas**: Cada página debe tener contenido real y funcional. Mejor 2 páginas completas que 5 vacías.
- **Router**: App.tsx usa \`MemoryRouter\` (NUNCA BrowserRouter). \`import { MemoryRouter, Routes, Route } from 'react-router-dom';\`
- **Prohibido**: No crear \`index.css\`, \`main.tsx\` ni \`vite-env.d.ts\`.
- **Mocks**: Simula datos con arrays falsos si no hay API real.

## BASE DE DATOS
El archivo \`/src/supabase.ts\` ya existe con \`dbHelper\` exportado.
- Importar desde páginas: \`import { dbHelper } from '../supabase';\`
- Importar desde src raíz: \`import { dbHelper } from './supabase';\`
- Métodos: \`dbHelper.save(colección, datos)\`, \`dbHelper.get(colección)\`, \`dbHelper.delete(id)\`
- Auth: \`dbHelper.auth.signUp(email, pass)\`, \`signIn\`, \`signOut\`, \`getUser\`
- Añade siempre datos de ejemplo (seed) con useEffect si la colección está vacía.

## ARCHIVOS DEL SISTEMA (PROHIBIDO MODIFICAR)
- **/src/supabase.ts**: Este archivo es el corazón de la conexión. NUNCA lo sobrescribas ni lo modifiques. Si crees que falta \`dbHelper\`, es un error temporal de carga, NO de código.
- **/src/_bulbia_auth.tsx**: Gestionado por el sistema para la seguridad. Prohibido tocarlo.
- **index.tsx**: Solo modifícalo si es estrictamente necesario para añadir Context Providers globales.

## SMART HEALING 2.0 (AUTO-CORRECCIÓN)
- **Verbosidad**: Usa siempre \`try { ... } catch (err) { console.error("Descripción clara", err); }\`. Bulbia vigila la consola: si escribes un error ahí, el sistema iniciará una reparación automática inmediata.
- **Autodenuncia**: Si detectas un error lógico grave y no quieres que la pantalla se quede en blanco, llama a \`window.reportBulbiaError("Detalle del error")\` para forzar al sistema a reintentar la generación con mejores parámetros.
- **Errores PGRST106**: Si el sistema te informa de un error PGRST106 o "Schema not found", significa que la infraestructura está cargando. NO cambies el código, solo espera.
`;
}

// =====================================================
// Helper: filter history
// =====================================================
function filterHistory(history: { role: 'ai' | 'user'; content: string }[]) {
  return history.filter((msg, index) => !(index === 0 && msg.role === 'ai'));
}

// =====================================================
// AI MODELS & PRICING CONFIGURATION
// =====================================================
// Puedes cambiar este valor para actualizar el modelo global de toda la plataforma
const DEFAULT_MODEL_ID = 'gemini-3-flash'; 

const MODELS_CONFIG: Record<string, { provider: string, model: string, inputPrice: number, outputPrice: number }> = {
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputPrice: 3.00,
    outputPrice: 15.00
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputPrice: 0.15,
    outputPrice: 0.60
  },
  'gemini-3.1-flash-lite': {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview',
    inputPrice: 0.03,
    outputPrice: 0.10
  },
  'gemini-3-flash': {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    inputPrice: 0.10,
    outputPrice: 0.30
  }
};

// El multiplicador de beneficio (Coste Real * 200 = Créditos descontados)
const COST_MULTIPLIER = 200;

// =====================================================
// CONTEXT ROUTING (RAG)
// =====================================================
async function getRelevantFiles(prompt: string, currentFiles: Record<string, string>, apiKey: string): Promise<Record<string, string>> {
  const allPaths = Object.keys(currentFiles);
  if (allPaths.length <= 6) return currentFiles;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { maxOutputTokens: 500 } });

  const systemMsg = `El usuario va a pedir un cambio (Prompt). Abajo tienes la lista de los archivos actuales del proyecto.
Devuelve ÚNICAMENTE los nombres de los archivos que sean ESTRICTAMENTE necesarios leer/modificar para realizar la tarea.
INSTRUCCIONES:
- Responde solo con las rutas de los archivos separadas por comas.
- Ninguna explicación, ni comillas, ni markdown.
- Si no estás seguro, devuelve /src/App.tsx.

Lista de archivos existentes:
${allPaths.join('\n')}`;

  try {
    const result = await model.generateContent(systemMsg + '\n\nPrompt:\n' + prompt);
    const text = result.response.text().trim();
    const requestedPaths = text.split(',').map(p => p.trim());
    
    // Always include critical architectural files
    const criticalFiles = ['/src/App.tsx', '/src/supabase.ts', '/src/index.tsx', '/src/_bulbia_auth.tsx', '/public/index.html'];
    const finalPaths = new Set([...requestedPaths, ...criticalFiles]);

    const filtered: Record<string, string> = {};
    let matchedCount = 0;
    for (const path of allPaths) {
      if (finalPaths.has(path) || path.endsWith('.css')) {
        filtered[path] = currentFiles[path];
        matchedCount++;
      }
    }
    
    if (Object.keys(filtered).length === 0) return currentFiles; // Fallback
    console.log(`[RAG] Filtered context from ${allPaths.length} to ${Object.keys(filtered).length} files.`);
    return filtered;
  } catch (error) {
    console.error("[RAG] Error filtering files, fallback to all:", error);
    return currentFiles;
  }
}

// =====================================================
// STREAMING ENDPOINT (VERCEL AI SDK)
// =====================================================
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, currentFiles = {}, userTokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Missing or invalid messages array' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY no configurada.' });
      return;
    }

    // Extraer la última petición del usuario para hacer RAG y billing
    const lastUser = messages.slice().reverse().find((m: any) => m.role === 'user' || m.role === 'model');
    const lastUserMessage = lastUser?.content || (lastUser?.parts ? lastUser.parts.map((p:any) => p.text).join('') : '');

    let filteredFiles = currentFiles;
    if (Object.keys(currentFiles).length > 6) {
       filteredFiles = await getRelevantFiles(lastUserMessage, currentFiles, apiKey);
    }

    const systemPrompt = buildSystemPrompt(filteredFiles);

    // Formatear mensajes para Vercel AI, soportando modo Multimodal (texto + imágenes/archivos)
    const formattedMessages = messages
        .map((m: any) => {
            const role = (m.role === 'ai' || m.role === 'model') ? 'assistant' : m.role;
            let content: any = m.content || (m.parts ? m.parts.map((p: any) => p.text).join('') : '');

            // Convertir a formato de "partes" si hay adjuntos
            if (m.experimental_attachments && m.experimental_attachments.length > 0) {
                const parts = [];
                if (typeof content === 'string' && content.trim().length > 0) {
                    parts.push({ type: 'text', text: content });
                }
                
                for (const att of m.experimental_attachments) {
                    if (att.contentType?.startsWith('image/')) {
                        parts.push({ type: 'image', image: att.url });
                    } else {
                        // Otros archivos se envían como tipo 'file' para los modelos que lo soporten
                        parts.push({ type: 'file', mimeType: att.contentType || 'application/octet-stream', data: att.url });
                    }
                }
                content = parts;
            }

            return { role, content };
        })
        .filter((m: any) => {
            if (Array.isArray(m.content)) return m.content.length > 0;
            return typeof m.content === 'string' && m.content.trim().length > 0;
        });

    // Selector de proveedor dinámico con Fallback Automático si falta la API Key
    let config = MODELS_CONFIG[DEFAULT_MODEL_ID] || MODELS_CONFIG['gemini-3-flash'];
    console.log(`[CHAT] Client requested model: ${DEFAULT_MODEL_ID}`);
    
    // Si elegimos Anthropic pero no hay KEY, bajamos a Gemini para no romper la app
    if (config.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      console.warn(`[AI] ANTHROPIC_API_KEY no encontrada. Usando fallback: gemini-3-flash`);
      config = MODELS_CONFIG['gemini-3-flash'];
    }
    // Si elegimos OpenAI pero no hay KEY, bajamos a Gemini
    if (config.provider === 'openai' && !process.env.OPENAI_API_KEY) {
      console.warn(`[AI] OPENAI_API_KEY no encontrada. Usando fallback: gemini-3-flash`);
      config = MODELS_CONFIG['gemini-3-flash'];
    }

    console.log(`[CHAT] Selected provider: ${config.provider}, model: ${config.model}`);

    let aiModel;

    try {
      if (config.provider === 'anthropic') {
        aiModel = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(config.model);
      } else if (config.provider === 'openai') {
        aiModel = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(config.model);
      } else {
        if (!apiKey) {
          throw new Error('No se ha configurado ninguna API Key de IA (Gemini, Anthropic o OpenAI). Revisa tu archivo .env');
        }
        const googleProvider = createGoogleGenerativeAI({ apiKey });
        aiModel = googleProvider(config.model);
      }
    } catch (modelInitErr) {
      console.error("[CHAT] Error initializing AI model:", modelInitErr);
      throw modelInitErr;
    }

    let result;
    try {
        result = streamText({
          model: aiModel,
          system: systemPrompt,
          messages: formattedMessages,
          // @ts-ignore
          maxTokens: 8192,
        });

        console.log(`[BACKEND] Starting DataStream generation for ${config.model}!`);
        if (typeof result.pipeUIMessageStreamToResponse === 'function') return result.pipeUIMessageStreamToResponse(res);
        if (typeof (result as any).pipeDataStreamToResponse === 'function') return (result as any).pipeDataStreamToResponse(res);
        return result.pipeTextStreamToResponse(res);
    } catch (apiError: any) {
        console.error(`[AI ERROR] Provider ${config.provider} failed:`, apiError);
        
        // ULTIMO RECURSO: Fallback Total a Gemini si falla el modelo principal por CUALQUIER motivo
        if (config.provider !== 'google' && process.env.GEMINI_API_KEY) {
          console.warn(`[AI] Intentando recuperación con Gemini 3 Flash...`);
          const googleProvider = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
          const fallbackResult = streamText({
            model: googleProvider('gemini-3-flash-preview'),
            system: systemPrompt,
            messages: formattedMessages,
            // @ts-ignore
            maxTokens: 8192,
          });
          if (typeof (fallbackResult as any).pipeUIMessageStreamToResponse === 'function') return (fallbackResult as any).pipeUIMessageStreamToResponse(res);
          if (typeof (fallbackResult as any).pipeDataStreamToResponse === 'function') return (fallbackResult as any).pipeDataStreamToResponse(res);
          return fallbackResult.pipeTextStreamToResponse(res);
        }
        
        res.status(500).json({ error: "AI Error: " + (apiError?.message || "Unknown error") });
    }
    return;

  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

app.post('/api/generate-name', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ name: 'Nueva App' }); // Fallback on missing key
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = "Eres un generador de nombres de aplicaciones cortos. Basado en la descripción de la app que va a enviar el usuario, devuelve SOLAMENTE el nombre de la aplicación (máximo 2 a 4 palabras, sin comillas, sin caracteres especiales ni explicaciones). Ejemplo: 'CRM Inmobiliario', 'Gestor de Logística'.";
    
    const result = await model.generateContent(systemPrompt + '\n\nDescripción:\n' + prompt);
    const text = result.response.text();
    
    return res.json({ name: text.trim().replace(/['"]/g, '') || 'Nueva App' });
  } catch (error) {
    console.error('Error generating name:', error);
    return res.json({ name: 'Nueva App' }); // Fallback gracefully without breaking the flow
  }
});

// Deploy endpointh check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// REMOTE BUNDLER ENDPOINT
// =====================================================
app.post('/api/bundle', async (req, res) => {
  try {
    const { files, supabaseContent, route } = req.body as {
      files: Record<string, string>;
      supabaseContent?: string;
      route?: string;
    };

    if (!files || typeof files !== 'object') {
      res.status(400).json({ error: 'Missing files object in request body' });
      return;
    }

    // Inject system files that the AI-generated code depends on
    const projectFiles = { ...files };

    // Inject supabase helper if provided
    if (supabaseContent) {
      projectFiles['/src/supabase.ts'] = supabaseContent;
      // Re-export aliases in case AI uses non-standard paths
      projectFiles['/src/lib/supabase.ts'] = `export { dbHelper, supabase } from '../supabase';`;
      projectFiles['/src/services/supabase.ts'] = `export { dbHelper, supabase } from '../supabase';`;
    }

    // Inject route into MemoryRouter initialEntries if a route is specified
    if (route && route !== '/' && projectFiles['/src/App.tsx']) {
      let appCode = projectFiles['/src/App.tsx'];
      // Strip any existing initialEntries prop first
      appCode = appCode.replace(/\s*initialEntries=\{[^}]*\}/g, '');
      // Inject the target route
      appCode = appCode.replace(
        /<MemoryRouter([^>]*?)>/g,
        `<MemoryRouter initialEntries={['${route}']}$1>`
      );
      projectFiles['/src/App.tsx'] = appCode;
    }

    const { html } = await bundleProject(projectFiles);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  } catch (error: any) {
    console.error('Bundle error:', error);
    res.status(500).send(`<html><body><pre>${error.message}</pre></body></html>`);
  }
});

// =====================================================
// STRIPE PAYMENTS (Simulated fallback if no keys)
// =====================================================
import Stripe from 'stripe';

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { planId, userId, tokens } = req.body;

    // Si no hay clave de Stripe, devolvemos simulación
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log(`[Stripe Simulation] Upgrading user ${userId} to plan ${planId}`);
      return res.json({ simulated: true });
    }

    // Inicializar Stripe solo si hay clave
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });

    // Mapeo de precios (Deberás poner tus Price IDs de Stripe aquí)
    const priceMap: Record<string, string> = {
      'Pro': process.env.STRIPE_PRICE_PRO || 'price_dummy_pro',
      'Expert': process.env.STRIPE_PRICE_EXPERT || 'price_dummy_expert',
      'Enterprise': process.env.STRIPE_PRICE_ENTERPRISE || 'price_dummy_enterprise'
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceMap[planId],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/pricing?canceled=true`,
      client_reference_id: userId,
      metadata: { planId, tokens }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook para cuando el pago tiene éxito (Para el futuro)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // Aquí se verificará la firma y se actualizará a Supabase
  res.json({ received: true });
});

// =====================================================
// VERCEL DEPLOYMENT SYSTEM
// =====================================================

app.post('/api/deploy', async (req, res) => {
  const { projectId, files, name } = req.body;
  
  if (!process.env.VERCEL_TOKEN) {
    return res.status(401).json({ error: 'Vercel Token no configurado en el servidor.' });
  }

  try {
    console.log(`[Vercel] Iniciando despliegue de: ${name} (${projectId})`);

    // 1. Compilar el proyecto remoto primero para generar un solo archivo HTML estático funcional
    const { html, error } = await bundleProject(files);
    if (error) {
        throw new Error('No se pudo compilar el proyecto antes del despliegue: ' + error);
    }

    // 2. Formatear para la API de Vercel (solo mandamos el index.html ya compilado)
    const vercelFiles = [
      {
        file: 'index.html',
        data: html,
        encoding: 'utf-8'
      }
    ];

    const deploymentBody = {
      name: `bulbia-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${projectId.substring(0, 8)}`,
      files: vercelFiles,
      projectSettings: {
        framework: null, // Para webs estáticas sin framework pesado (usamos CDN)
        buildCommand: null,
        installCommand: null,
        outputDirectory: null
      },
      target: 'production'
    };

    const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : '';
    
    const response = await fetch(`https://api.vercel.com/v13/deployments${teamParam}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deploymentBody)
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Vercel Error]', data.error);
      throw new Error(data.error?.message || 'Fallo en la comunicación con Vercel');
    }

    console.log(`[Vercel] Despliegue exitoso: https://${data.url}`);
    
    res.json({
      success: true,
      url: `https://${data.url}`,
      id: data.id
    });

  } catch (error: any) {
    console.error('[Vercel Deploy Exception]', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// PRODUCTION STATIC FILE SERVING
// =====================================================
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir la web estática una vez construida (npm run build)
app.use(express.static(path.join(__dirname, '../dist')));

// Redirigir cualquier ruta de React al IndexHTML
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 API Proxy running on http://localhost:${PORT}`);
    console.log(`   Default Model: ${DEFAULT_MODEL_ID}`);
    console.log(`   Gemini:    ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ missing'}`);
    console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ missing'}`);
    console.log(`   OpenAI:    ${process.env.OPENAI_API_KEY ? '✅ configured' : '❌ missing'}`);
  });
}

export default app;
