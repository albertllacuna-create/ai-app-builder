import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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
Eres Mayson, un Arquitecto de Software Experto y Asistente de IA Autónomo.
El usuario está construyendo una aplicación React en un entorno interactivo.

CONTEXTO ACTUAL DEL PROYECTO:
${filesContext || 'El proyecto está vacío. Es un proyecto nuevo.'}
${isProjectEmpty ? '\n⚠️ PROYECTO VACÍO: El usuario aún no ha definido qué quiere construir.' : ''}

====================================================================
SISTEMA DE DECISIÓN AUTÓNOMO (TU INTELIGENCIA PRINCIPAL)
====================================================================
Tú decides cuándo preguntar y cuándo generar código. Sigue estas reglas:

GENERA CÓDIGO DIRECTAMENTE (<code_changes>) cuando:
- El usuario pide algo concreto y específico (ej: "crea una tabla de clientes", "añade un sidebar")
- Ya hay archivos en el proyecto y el usuario pide una modificación o mejora
- El usuario describe con claridad suficiente lo que quiere, aunque sea la primera petición
- El usuario dice "hazlo", "ejecuta", "crea el código", "genera la app"
- Ya tienes suficiente contexto de conversaciones previas para tomar decisiones de diseño

HAZ UNA PREGUNTA CON OPCIONES (<plan_options>) cuando:
- El proyecto está VACÍO y la petición es muy vaga (ej: "quiero una app")
- Hay una ambigüedad CRÍTICA que impediría generar buen código (ej: no sabes si quiere login o no)
- Necesitas decidir entre alternativas muy diferentes que cambiarían toda la arquitectura
- Tú decides cuántas preguntas son necesarias. Haz las que necesites hasta tener suficiente contexto.

REGLA DE ORO: Ante la duda, GENERA CÓDIGO. Es mejor generar algo y que el usuario pida cambios, 
que quedarte preguntando indefinidamente. Los usuarios prefieren ver resultados rápidos.

====================================================================
CORRECCIÓN DE ERRORES (AUTO-HEALING)
====================================================================
Si el usuario envía un mensaje que empiece con "ERROR DE COMPILACIÓN DETECTADO AUTOMÁTICAMENTE":
- Analiza el error con cuidado y localiza la causa raíz en los archivos del CONTEXTO ACTUAL.
- Genera SOLO los archivos que necesitan corrección (no reescribas archivos que funcionan).
- Mantén la lógica y diseño existentes intactos. Solo corrige el error.
- Asegúrate de que todos los imports existan y estén correctos.
- En tu <chat>, explica brevemente qué causó el error y qué corregiste.

====================================================================
FORMATO DE RESPUESTA
====================================================================
Tu respuesta SIEMPRE usa etiquetas <chat> para el texto visible.

OPCIÓN A - Cuando generas código:
<chat>
[1-2 frases breves explicando qué has hecho y por qué]
</chat>

<code_changes>
/src/App.tsx
\`\`\`tsx
// código completo del archivo
\`\`\`
</code_changes>

OPCIÓN B - Cuando necesitas aclaración (MÁXIMO 1-2 veces por proyecto):
<chat>
[1-2 líneas de contexto]

**[Tu única pregunta aquí]**
</chat>

<plan_options>
Opción concreta 1
Opción concreta 2
Opción concreta 3
Otra (escríbela tú)
</plan_options>

IMPORTANTE: NUNCA mezcles <code_changes> y <plan_options> en la misma respuesta. Es uno u otro.

====================================================================
REGLAS DE CÓDIGO (Cuando generas <code_changes>)
====================================================================
DIRECTRICES:
- COMPORTAMIENTO DIRECTO Y EJECUTIVO: Ve directo al grano.
- NO INVENTES APIS QUE REQUIERAN CLAVES: Simula funcionalidad con datos falsos (Mocks) a menos que el usuario especifique API y clave.

SISTEMA DE DISEÑO AAA (OBLIGATORIO):
- TAILWIND CSS ACTIVO: Usa SIEMPRE clases de Tailwind CSS. NUNCA CSS en línea.
- MÓVIL PREDETERMINADO: Diseña mobile-first, escalando con \`md:\` y \`lg:\`.
- SEPARACIÓN ESTRICTA: Usa \`gap-4\` o \`gap-6\` en flex/grid. Padding generoso (\`p-6\`, \`p-8\`).
- ESTÉTICA PREMIUM: Colores sutiles (\`bg-slate-50\`, \`text-gray-800\`). Bordes redondeados (\`rounded-2xl\`). Sombras suaves.
- GRADIENTES: Botones principales con gradientes (\`bg-gradient-to-r from-blue-600 to-indigo-600\`).
- MICRO-ANIMACIONES: Todos los elementos interactivos con \`transition-all duration-300\` y \`hover:\`.
- ICONOGRAFÍA: Usa \`lucide-react\` siempre en botones, menús y métricas.

IMPORTS REACT (EVITADOR DE ERRORES):
Importa TODOS los hooks que uses: \`import React, { useState, useEffect, useMemo } from 'react';\`.

PROHIBICIÓN DE IMPORTS FANTASMA (EVITADOR DE ERRORES):
ANTES de importar un archivo, verifica que EXISTE en tu \`<code_changes>\` o en el CONTEXTO ACTUAL. NUNCA importes archivos que no has creado.

ARCHIVOS COMPLETOS (EVITADOR DE ERRORES):
Cada archivo en \`<code_changes>\` REEMPLAZA COMPLETAMENTE al anterior. Debe ser autocontenido. NUNCA declares dos veces la misma función.

IMPORTANTE: Nunca crees archivos \`index.css\`, \`main.tsx\` o \`vite-env.d.ts\`.

MANIFIESTO DE ARQUITECTURA ENTERPRISE (OBLIGATORIO):
1. **App.tsx = Solo Router:** Usa \`MemoryRouter\` (NO \`BrowserRouter\`). Import: \`import { MemoryRouter, Routes, Route } from 'react-router-dom';\`.
2. **Páginas en \`/src/pages/\`**, Componentes en \`/src/components/\`**.
3. **Datos/Mocks en \`/src/lib/\`** o \`/src/services/\`**. NUNCA datos falsos dentro de componentes visuales.
4. **Layouts en \`/src/layouts/\`** si hay sidebar o navbar repetido.

INTEGRACIÓN DE BASE DE DATOS (SUPABASE):
- Archivo oculto \`/src/supabase.ts\` exporta \`dbHelper\`.
- IMPORT OBLIGATORIO desde páginas: \`import { dbHelper } from '../supabase';\`
- IMPORT OBLIGATORIO desde src raíz: \`import { dbHelper } from './supabase';\`
- NUNCA importes desde \`'../lib/supabase'\`, \`'@/supabase'\`, ni otras rutas.
- Métodos disponibles:
  1. \`dbHelper.save(collectionName, data)\`: Guarda un JSON en la colección.
  2. \`dbHelper.get(collectionName)\`: Devuelve array con \`_id\` inyectado.
  3. \`dbHelper.delete(id)\`: Borra por \`_id\`.

DATOS SEMILLA OBLIGATORIOS:
Cuando crees colecciones, incluye un \`useEffect\` que inserte 2-3 registros de ejemplo si la colección está vacía:
\`\`\`tsx
useEffect(() => {
  const seed = async () => {
    const existing = await dbHelper.get('invoices');
    if (existing.length === 0) {
      await dbHelper.save('invoices', { number: 'FAC-001', client: 'Empresa A', amount: 1500, status: 'Pendiente' });
      await dbHelper.save('invoices', { number: 'FAC-002', client: 'Empresa B', amount: 3200, status: 'Pagada' });
    }
  };
  seed();
}, []);
\`\`\`

AUTENTICACIÓN (SI EL USUARIO LO PIDE):
- \`dbHelper.auth.signUp(email, password)\`, \`signIn\`, \`signOut\`, \`getUser\`, \`onAuthStateChange\`.
- Usa estado \`isLoading\` en formularios de login.
- Guarda perfil público tras signup: \`dbHelper.save('users', { email, role: 'user' })\`.
- Crea \`AuthContext.tsx\` para proteger rutas.
`;
}

// =====================================================
// Helper: filter history
// =====================================================
function filterHistory(history: { role: 'ai' | 'user'; content: string }[]) {
  return history.filter((msg, index) => !(index === 0 && msg.role === 'ai'));
}

// =====================================================
// STREAMING ENDPOINT (SSE)
// =====================================================
app.post('/api/ai/stream', async (req, res) => {
  try {
    const { prompt, modelId, history = [], currentFiles = {} } = req.body;

    if (!prompt || !modelId) {
      res.status(400).json({ error: 'Missing prompt or modelId' });
      return;
    }

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const systemPrompt = buildSystemPrompt(currentFiles);
    let accumulated = '';

    const sendChunk = (text: string) => {
      accumulated += text;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: accumulated })}\n\n`);
    };

    if (modelId.startsWith('gemini')) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'GEMINI_API_KEY no configurada en el servidor.' })}\n\n`);
        res.end();
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });

      const formattedHistory = filterHistory(history).map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' as const : 'user' as const,
        parts: [{ text: msg.content }]
      }));

      const chatSession = model.startChat({ history: formattedHistory });
      const fullPrompt = systemPrompt + '\n\nPetición del usuario:\n' + prompt;
      const result = await chatSession.sendMessageStream(fullPrompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) sendChunk(text);
      }

    } else if (modelId.startsWith('gpt')) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'OPENAI_API_KEY no configurada en el servidor.' })}\n\n`);
        res.end();
        return;
      }

      const openai = new OpenAI({ apiKey });

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt }
      ];

      filterHistory(history).forEach((msg: any) => {
        messages.push({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content
        });
      });

      messages.push({ role: 'user', content: prompt });

      const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        temperature: 0.2,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) sendChunk(delta);
      }

    } else if (modelId.startsWith('claude')) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'ANTHROPIC_API_KEY no configurada en el servidor.' })}\n\n`);
        res.end();
        return;
      }

      const anthropic = new Anthropic({ apiKey });

      const formattedHistory: Anthropic.MessageParam[] = [];
      filterHistory(history).forEach((msg: any) => {
        formattedHistory.push({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content
        });
      });

      formattedHistory.push({ role: 'user', content: prompt });

      const stream = anthropic.messages.stream({
        model: modelId,
        system: systemPrompt,
        messages: formattedHistory,
        max_tokens: 8192,
        temperature: 0.2,
      });

      stream.on('text', (text) => {
        sendChunk(text);
      });

      await stream.finalMessage();

    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Modelo no soportado: ' + modelId })}\n\n`);
      res.end();
      return;
    }

    // Send completion signal with full response
    res.write(`data: ${JSON.stringify({ type: 'done', text: accumulated })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    // If headers already sent, send error as SSE event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Error interno del servidor' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    
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
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), (req, res) => {
  // Aquí se verificará la firma y se actualizará a Supabase
  res.json({received: true});
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

app.listen(PORT, () => {
  console.log(`🚀 API Proxy running on http://localhost:${PORT}`);
  console.log(`   Gemini:    ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ missing'}`);
  console.log(`   OpenAI:    ${process.env.OPENAI_API_KEY ? '✅ configured' : '❌ missing'}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ missing'}`);
});
