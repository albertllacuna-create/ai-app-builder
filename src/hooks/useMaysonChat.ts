import { useState, useRef, useCallback, useEffect } from 'react';
import { Project, AIModel } from '../types';
import { db } from '../services/db';
import { useChat } from '@ai-sdk/react';
import { parseAIResponse } from '../services/responseParser';

export function useMaysonChat(
    project: Project | null,
    setProject: (p: Project) => void,
    buildBundle?: (proj: Project) => void,
    selectedModel: AIModel = 'claude-3-5-sonnet'
) {
    const [prompt, setPrompt] = useState('');
    const [autoHealStatus, setAutoHealStatus] = useState<'idle' | 'fixing' | 'failed'>('idle');
    const autoHealRetries = useRef(0);
    const isAutoHealing = useRef(false);
    const MAX_AUTO_HEAL_RETRIES = 5;
    const modeRef = useRef<'build' | 'plan'>('build');

    // Conexión Vercel AI SDK
    const chatState = useChat({
        api: '/api/chat',
        body: { 
            currentFiles: project?.files || {}, 
            userTokens: db.getUser()?.tokens || 0,
            mode: modeRef.current
        },
        // Removemos initialMessages de aquí para evitar fallos si el project entra a destiempo
        onFinish: ({ message }) => {
            if (!project) return;
            const msgObj: any = message; // cast for safety
            // Extraer el string completo desde parts
            const contentString = msgObj?.content || (msgObj?.parts ? msgObj.parts.map((p: any) => p.text).join('') : '');
            
            if (contentString) {
                parseAIResponse(contentString, project.id);
            }
            const m = db.getProject(project.id);
            if (m) {
                setProject({ ...m });
                if (buildBundle) buildBundle(m);
            }
        },
        onError: (err) => {
            console.error("AI SDK Error:", err);
            if (autoHealStatus !== 'idle') setAutoHealStatus('failed');
            setVercelMessages((prev: any) => [...prev, {
                id: `err-${Date.now()}`,
                role: 'assistant',
                content: `⚠️ **Error de conexión con IA**: \n\nDetalle: ${err.message}`
            }]);
        }
    });

    const { messages: vercelMessages = [], status = 'idle', isLoading = false, setMessages: setVercelMessages = () => {} } = chatState as any;

    // Función de envío robusta con detección automática
    const sendMessage = useCallback(async (msg: any, options?: any) => {
        const sendFn = chatState.sendMessage || chatState.append;
        if (typeof sendFn === 'function') {
            return sendFn(msg, options);
        }
        
        const typeOfSend = typeof chatState.sendMessage;
        const typeOfAppend = typeof chatState.append;
        const keys = Object.keys(chatState).join(', ');
        
        throw new Error(`No se encontró función de envío válida. sendMessage: ${typeOfSend}, append: ${typeOfAppend}. Keys: ${keys}`);
    }, [chatState]);

    if (!chatState.sendMessage && !chatState.append) {
        console.error("DEBUG: No send function found in useChat. Keys:", Object.keys(chatState || {}));
    }

    // Controlar una única carga desde base de datos independiente de re-renders para el SDK
    const initializedProjectId = useRef<string | null>(null);
    useEffect(() => {
        if (project && project.id !== initializedProjectId.current) {
            const legacyFormat = project.messages || [];
            if (legacyFormat.length > 0) {
                setVercelMessages(legacyFormat.map((m: any, index: number) => ({
                    id: `msg-init-${index}`,
                    role: m.role === 'ai' ? 'assistant' : m.role,
                    content: m.content
                })));
            } else {
                setVercelMessages([]); // Asegurar limpieza si abrimos otro proyecto nuevo
            }
            initializedProjectId.current = project.id;
        }
    }, [project?.id, setVercelMessages]);

    // Mantenemos sincronizado el project.messages en persistencia local por cada nuevo chunk/respuesta
    useEffect(() => {
        const syncMessages = async () => {
            if (!project || vercelMessages.length === 0) return;
            const mappedMessages = vercelMessages.map(m => ({
                role: (m.role === 'assistant' || m.role === 'system') ? 'ai' as const : 'user' as const,
                content: m.content || (m.parts ? m.parts.map((p: any) => p.text).join('') : '')
            }));
            await db.updateProjectMessages(project.id, mappedMessages);
        };
        syncMessages();
    }, [vercelMessages, project?.id]);

    useEffect(() => {
        console.log("[MaysonChat] Status changed:", status);
    }, [status]);

    const resetAutoHeal = useCallback(() => {
        autoHealRetries.current = 0;
        setAutoHealStatus('idle');
    }, []);

    const handleAutoFix = useCallback(async (errorMessage: string) => {
        if (!project || isAutoHealing.current || isLoading) return;
        
        if (autoHealRetries.current >= MAX_AUTO_HEAL_RETRIES) {
            setAutoHealStatus('failed');
            return;
        }

        isAutoHealing.current = true;
        autoHealRetries.current += 1;
        setAutoHealStatus('fixing');

        let fixPrompt = `ERROR DE COMPILACIÓN DETECTADO AUTOMÁTICAMENTE. Corrige este error en los archivos necesarios:\n\n${errorMessage}\n\nIMPORTANTE: Reescribe SOLO los archivos que contengan el error.\n- Si es un bucle infinito, revisa useEffects y dependencias de carga de datos.\n- No cambies la arquitectura general, solo corrige el archivo bloqueado.`;
        
        if (errorMessage.includes('PGRST106') || errorMessage.toLowerCase().includes('schema') && errorMessage.toLowerCase().includes('not found')) {
            fixPrompt = `ATENCIÓN: Se ha detectado un retraso en la inicialización de la base de datos (Error PGRST106). 
            EL CÓDIGO ACTUAL ES CORRECTO. No realices NINGUNA modificación en los archivos ni intentes crear Mocks.
            Simplemente responde confirmando que has recibido el aviso y que esperaremos a la siguiente sincronización automática.`;
        }

        try {
            modeRef.current = 'build'; // Auto-heal siempre opera en modo build
            
            // Instrucciones especiales para error #130
            if (errorMessage.includes('#130') || errorMessage.includes('Element type is invalid')) {
                fixPrompt = `ERROR REACT #130 DETECTADO: Un componente importado es "undefined". Esto ocurre por imports rotos.

SOLUCIÓN OBLIGATORIA:
1. Reescribe /src/App.tsx poniendo TODA la lógica dentro de este archivo (componentes, contextos, todo).
2. ELIMINA todos los imports a archivos que no sean './supabase' o librerías externas (react, lucide-react, react-router-dom).
3. Define TODOS los componentes y tipos DENTRO de App.tsx.
4. Usa export default para el componente principal.

${errorMessage.substring(0, 300)}`;
            }

            await sendMessage({
                id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`,
                role: 'user',
                content: `🔧 [Auto-fix] Error detectado: ${errorMessage.substring(0, 150)}...\n\n${fixPrompt}`
            });
            setAutoHealStatus('idle');
        } catch (err) {
            setAutoHealStatus('failed');
        } finally {
            isAutoHealing.current = false;
        }
    }, [project, status, sendMessage]);

    const handleSendPrompt = async (eOrText?: React.FormEvent | string, attachments?: any[], mode: 'build' | 'plan' = 'build') => {
        if (eOrText && typeof eOrText !== 'string' && 'preventDefault' in eOrText) {
            (eOrText as React.FormEvent).preventDefault();
        }
        const userPromptText = typeof eOrText === 'string' ? eOrText : prompt;
        
        if (!userPromptText.trim() || !project) return;
        resetAutoHeal();

        const user = db.getUser();
        if (!user) return;

        const MINIMUM_CREDITS_REQUIRED = 50;
        if (user.tokens < MINIMUM_CREDITS_REQUIRED) {
            // Push an artificial message to local state without making a network request
            const artificialErr = [...vercelMessages, { id: 'err-tokens', role: 'assistant' as const, content: '⚠️ **Te has quedado sin Créditos.**\n\nTu saldo actual es demasiado bajo para procesar esta solicitud (Mínimo necesario: 50 Créditos). Por favor, amplía tu plan en la sección de **Precios** para continuar creando.' }];
            setVercelMessages(artificialErr);
            return;
        }

        setPrompt('');
        modeRef.current = mode; // Actualizar ref antes de enviar
        await db.saveSnapshot(project.id);
        
        // El hook usa automáticamente la ruta /api/chat y appendea a vercelMessages
        try {
            const messagePayload: any = { 
                id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`,
                role: 'user', 
                content: userPromptText 
            };
            
            if (attachments && attachments.length > 0) {
                messagePayload.experimental_attachments = attachments.map((att: any) => ({
                    name: att.name,
                    contentType: att.type,
                    url: att.url
                }));
            }

            await sendMessage(messagePayload, {
                body: {
                    currentFiles: project.files,
                    userTokens: user.tokens,
                    mode: mode // <--- Enviamos el modo
                }
            });
        } catch (err: any) {
            console.error("Critical error in sendMessage:", err);
            const keys = chatState ? Object.keys(chatState).join(', ') : 'null';
            setVercelMessages([...vercelMessages, { 
                 id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `msg-${Date.now()}`,
                 role: 'assistant', 
                 content: `⚠️ **Error del Sistema Bolbia**: No se pudo enviar el mensaje. \n\nDetalle: ${err.message}\n\nDEBUG keys: ${keys}`
            }]);
            return;
        }
        
        // Nota: billing se procesará en backend con `creditsDeducted` devolviendolo vía custom header
        // o si es necesario, descontamos un fix per-prompt en client para MVP:
        await db.consumeTokens(25);
    };

    const handleUndo = async (steps: number) => {
        if (!project || !project.history || project.history.length === 0) return;

        if (await db.restoreSnapshot(project.id, steps)) {
            const updatedProject = db.getProject(project.id);
            if (updatedProject) {
                setProject({ ...updatedProject });
                const legacyFormat = updatedProject.messages || [];
                setVercelMessages(legacyFormat.map((m: any, index: number) => ({
                    id: `msg-undo-${index}`,
                    role: m.role === 'ai' ? 'assistant' : m.role,
                    content: m.content
                })));
                if (buildBundle) buildBundle(updatedProject);
            }
        }
    };

    // Formatear estado para la vista antigua de AppBuilder
    // Excluimos el último mensaje si está streameando, para renderizarlo como `streamingText` abajo.
    const isAiTyping = status === 'streaming' || status === 'submitted' || status === 'loading' || isLoading;
    const lastMessage = vercelMessages[vercelMessages.length - 1];
    const isStreamingMessage = isAiTyping && lastMessage?.role === 'assistant';
    
    // stableMessages es todo menos el mensaje en stream actual para evitar duplicados en la pantalla
    const stableMessages = isStreamingMessage ? vercelMessages.slice(0, -1) : vercelMessages;
    
    // Mapeo retro-compatible 'assistant' -> 'ai' integrando el formato nuevo de 'parts'
    const legacyMessages = stableMessages.map(m => {
         const contentString = m.content || (m.parts ? m.parts.map((p: any) => p.text).join('') : '');
         return {
             role: (m.role === 'assistant' || m.role === 'system') ? 'ai' as const : 'user' as const,
             content: contentString
         };
    });

    const streamingText = isStreamingMessage ? (lastMessage.content || (lastMessage.parts ? lastMessage.parts.map((p: any) => p.text).join('') : '')) : '';

    return {
        prompt,
        setPrompt,
        messages: legacyMessages,
        isAiTyping,
        streamingText,
        autoHealStatus,
        autoHealRetries,
        MAX_AUTO_HEAL_RETRIES,
        resetAutoHeal,
        handleAutoFix,
        handleSendPrompt,
        handleUndo
    };
}
