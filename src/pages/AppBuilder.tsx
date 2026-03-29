import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Outlet, Link, useLocation } from 'react-router-dom';
import {
    Send, Maximize2, FileCode2, Sparkles, ExternalLink, Loader2, Rocket, Play, RefreshCw, Code2,
    LayoutDashboard, Users, Database, Globe, Settings, CreditCard, PanelsTopLeft, ArrowLeft, Monitor, Smartphone,
    AlertTriangle
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { db } from '../services/db';
import { aiService } from '../services/ai';
import { deployService } from '../services/deploy';
import { Project, AIModel } from '../types';
import { AiMessageBubble } from '../components/AiMessageBubble';
import '../index.css';

export function AppBuilder() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState<Project | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [messages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([]);
    const [streamingText, setStreamingText] = useState('');

    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [codeFile, setCodeFile] = useState('/src/App.tsx');
    const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-2.5-flash');

    const [currentRoute, setCurrentRoute] = useState<string>('/');


    const location = useLocation();

    // Navigation for Panel Inner Menu
    const navItems = [
        { path: `/project/${projectId}/overview`, name: 'Resumen', icon: LayoutDashboard },
        { path: `/project/${projectId}/users`, name: 'Usuarios', icon: Users },
        { path: `/project/${projectId}/data`, name: 'Base de Datos', icon: Database },
        { path: `/project/${projectId}/editor`, name: 'Código', icon: Code2 },
        { path: `/project/${projectId}/domains`, name: 'Dominios', icon: Globe },
        { path: `/project/${projectId}/payments`, name: 'Monetización', icon: CreditCard },
        { path: `/project/${projectId}/settings`, name: 'Ajustes', icon: Settings },
    ];
    const isCodeEditorRoute = location.pathname.endsWith('/editor');

    // View Modes
    const [viewMode, setViewMode] = useState<'panel' | 'preview'>('preview');
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

    // Deployment states
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployStatus, setDeployStatus] = useState<{ url?: string; error?: string } | null>(null);

    // Auto-healing state
    const [autoHealStatus, setAutoHealStatus] = useState<'idle' | 'fixing' | 'failed'>('idle');
    const autoHealRetries = useRef(0);
    const isAutoHealing = useRef(false);
    const MAX_AUTO_HEAL_RETRIES = 2;

    // Initial load
    useEffect(() => {
        if (!projectId) {
            navigate('/dashboard');
            return;
        }
        const p = db.getProject(projectId);
        if (!p) {
            navigate('/dashboard');
            return;
        }
        setProject({ ...p });
        if (p.messages) {
            setMessages(p.messages);
        }
    }, [projectId, navigate]);

    // No longer need manual srcDoc generation, Sandpack handles live bundling automatically.

    const extractRoutes = () => {
        if (!project || !project.files['/src/App.tsx']) return ['/'];
        const appContent = project.files['/src/App.tsx'];
        const routeRegex = /path=["']([^"']+)["']/g;
        const foundRoutes: string[] = [];
        let m;
        while ((m = routeRegex.exec(appContent)) !== null) {
            if (!foundRoutes.includes(m[1])) foundRoutes.push(m[1]);
        }
        return foundRoutes.length > 0 ? foundRoutes : ['/'];
    };

    // =====================================================
    // AUTO-HEALING: Listen for Sandpack compilation errors
    // =====================================================
    const handleAutoFix = useCallback(async (errorMessage: string) => {
        if (!project || isAutoHealing.current || isAiTyping) return;
        if (autoHealRetries.current >= MAX_AUTO_HEAL_RETRIES) {
            setAutoHealStatus('failed');
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `⚠️ **Error de compilación persistente.**\n\nNo he podido corregir automáticamente este error tras ${MAX_AUTO_HEAL_RETRIES} intentos:\n\n\`\`\`\n${errorMessage}\`\`\`\n\nRevisa el código en la pestaña **Panel → Código** y dime qué quieres que haga.`
            }]);
            return;
        }

        isAutoHealing.current = true;
        autoHealRetries.current += 1;
        setAutoHealStatus('fixing');

        const fixPrompt = `ERROR DE COMPILACIÓN DETECTADO AUTOMÁTICAMENTE. Corrige este error en los archivos necesarios:\n\n${errorMessage}\n\nIMPORTANTE: Reescribe SOLO los archivos que contengan el error. No cambies la lógica de la app, solo corrige el error.`;

        const currentMessages = [...messages, { role: 'user' as const, content: `🔧 [Auto-fix] Error detectado: ${errorMessage.substring(0, 150)}...` }];
        setMessages(currentMessages);

        setIsAiTyping(true);
        setStreamingText('');
        try {
            const response = await aiService.sendPromptStream(
                project.id,
                fixPrompt,
                selectedModel,
                currentMessages,
                project.files,
                (accumulatedText) => {
                    setStreamingText(accumulatedText);
                }
            );

            setStreamingText('');

            const finalMessages = [...currentMessages, { role: 'ai' as const, content: `🔧 **Corrección automática (intento ${autoHealRetries.current}/${MAX_AUTO_HEAL_RETRIES}):**\n\n${response.message}` }];
            setMessages(finalMessages);
            db.updateProjectMessages(project.id, finalMessages);

            const updatedProject = db.getProject(project.id);
            if (updatedProject) {
                setProject({ ...updatedProject });
            }

            setPreviewRefreshKey(prev => prev + 1);
            setAutoHealStatus('idle');

        } catch (err: any) {
            setStreamingText('');
            setMessages(prev => [...prev, { role: 'ai', content: '🔧 Error al intentar auto-corregir: ' + err.message }]);
            setAutoHealStatus('failed');
        } finally {
            setIsAiTyping(false);
            isAutoHealing.current = false;
        }
    }, [project, messages, selectedModel, isAiTyping]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'sandpack-error') {
                handleAutoFix(event.data.error);
            }
            if (event.data?.type === 'sandpack-error-cleared') {
                // Error resolved — reset retry counter
                autoHealRetries.current = 0;
                setAutoHealStatus('idle');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleAutoFix]);

    // Reset retry counter when user sends a new prompt manually
    const resetAutoHeal = () => {
        autoHealRetries.current = 0;
        setAutoHealStatus('idle');
    };

    const handleSendPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !project) return;
        resetAutoHeal();

        const user = db.getUser();
        if (!user) return;

        // Validar si el usuario tiene tokens suficientes
        let TOKEN_COST_PER_PROMPT = 50; // Coste base (ej: Gemini Flash)
        
        // Multiplicador de tokens (Margen de beneficio)
        if (selectedModel.includes('pro') || selectedModel.includes('gpt-4o') && !selectedModel.includes('mini') || selectedModel.includes('sonnet')) {
            TOKEN_COST_PER_PROMPT = 500; // Modelos premium gastan x10 créditos
        } else if (selectedModel.includes('haiku') || selectedModel.includes('mini')) {
            TOKEN_COST_PER_PROMPT = 100;
        }

        // Restringir modelos Premium al plan Free
        if (user.plan === 'Free' && TOKEN_COST_PER_PROMPT > 50) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: '👑 **Modelo Premium requerido.**\n\nEl plan Free solo permite usar los modelos básicos. Para usar Claude, GPT-4 o Gemini Pro, actualiza a un plan superior en la sección de **Precios**.'
            }]);
            return;
        }

        if (user.tokens < TOKEN_COST_PER_PROMPT) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: '⚠️ **Te has quedado sin Créditos mensuales.**\n\nTu plan actual no dispone de saldo suficiente para procesar esta solicitud. Por favor, amplía tu plan en la sección de **Precios** para continuar.'
            }]);
            return;
        }

        const userPrompt = prompt;
        const newMessagesWithUser = [...messages, { role: 'user' as const, content: userPrompt }];
        setMessages(newMessagesWithUser);
        db.updateProjectMessages(project.id, newMessagesWithUser);

        // Consumir los tokens
        db.consumeTokens(TOKEN_COST_PER_PROMPT);

        setPrompt('');
        setIsAiTyping(true);
        setStreamingText('');
        try {
            // Fotografía de seguridad ANTES de que la IA empiece a modificar archivos (Max 3 pasos)
            db.saveSnapshot(project.id);

            // Stream the AI response with live text updates
            const response = await aiService.sendPromptStream(
                project.id,
                userPrompt,
                selectedModel,
                newMessagesWithUser,
                project.files,
                (accumulatedText) => {
                    setStreamingText(accumulatedText);
                }
            );

            setStreamingText('');

            const finalMessages = [...newMessagesWithUser, { role: 'ai' as const, content: response.message }];
            setMessages(finalMessages);
            db.updateProjectMessages(project.id, finalMessages);

            // Reload project state to reflect new files and messages
            const updatedProject = db.getProject(project.id);
            if (updatedProject) {
                setProject({ ...updatedProject });
            }

            // Force the iframe preview to reload to show the newly injected files
            setPreviewRefreshKey(prev => prev + 1);

        } catch (err: any) {
            setStreamingText('');
            setMessages(prev => [...prev, { role: 'ai', content: 'Error: ' + err.message }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleUndo = (steps: number) => {
        if (!project || !project.history || project.history.length === 0) return;

        if (db.restoreSnapshot(project.id, steps)) {
            const updatedProject = db.getProject(project.id);
            if (updatedProject) {
                setProject({ ...updatedProject });
                setMessages(updatedProject.messages);
                // Force preview reload to revert UI to previous state
                setPreviewRefreshKey(prev => prev + 1);
            }
        }
    };

    const handleDeploy = async () => {
        if (!project) return;
        setIsDeploying(true);
        setDeployStatus(null);
        try {
            const result = await deployService.deployProject(project);
            if (result.success && result.url) {
                setDeployStatus({ url: result.url });
            } else {
                setDeployStatus({ error: result.error || 'Despliegue fallido' });
            }
        } catch (err: any) {
            setDeployStatus({ error: err.message || 'Excepción desconocida' });
        } finally {
            setIsDeploying(false);
        }
    };

    if (!project) return null;

    const undosAvailable = project.history?.length || 0;

    return (
        <div className="builder-layout">
            {/* Main Chat Area */}
            <section className="chat-panel glass-panel">
                <div className="panel-header" style={{ justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-1.5 -ml-1.5 rounded-md hover:bg-white/10 transition-colors text-neutral-400 hover:text-white mr-1 flex items-center justify-center"
                            title="Volver a mis proyectos"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <Sparkles className="text-primary" size={20} />
                        <span className="font-bold text-lg leading-none mt-0.5">Asistente Mayson</span>
                    </div>
                    <div className="flex gap-2">
                        {/* Botón Undo Global Eliminado */}
                        <select
                            className="input-field"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: 'auto' }}
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                        >
                            <optgroup label="Google">
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            </optgroup>
                            <optgroup label="OpenAI">
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                            </optgroup>
                            <optgroup label="Anthropic">
                                <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                            </optgroup>
                        </select>
                    </div>
                </div>



                <div className="chat-history">
                    {messages.map((msg, idx) => {
                        // Calculate if this AI message is within the available undo history
                        // We count backwards from the end. The last AI message is 1 step back.
                        const aiMessagesAfterThis = messages.slice(idx + 1).filter(m => m.role === 'ai').length;
                        const isAiAndUndoable = msg.role === 'ai' && aiMessagesAfterThis < undosAvailable;
                        const stepsToUndo = aiMessagesAfterThis + 1;

                        return (
                            <div key={idx} className={`chat-bubble relative group ${msg.role === 'ai' ? 'ai-bubble' : 'user-bubble'}`}>
                                {msg.role === 'ai' ? (
                                    <AiMessageBubble
                                        msg={msg}
                                        isAiAndUndoable={isAiAndUndoable}
                                        isAiTyping={isAiTyping}
                                        stepsToUndo={stepsToUndo}
                                        handleUndo={handleUndo}
                                        onSelectOption={(text: string) => {
                                            setPrompt(text);
                                            setTimeout(() => {
                                                const form = document.querySelector('.chat-input-area') as HTMLFormElement;
                                                if (form) form.requestSubmit();
                                            }, 50);
                                        }}
                                    />
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                            </div>
                        );
                    })}
                    {isAiTyping && (
                        <div className="chat-bubble ai-bubble">
                            {streamingText ? (
                                <div className="w-full">
                                    <div className="markdown-body whitespace-pre-wrap text-sm text-neutral-200 leading-relaxed">
                                        {streamingText.replace(/<\/?chat>|<\/?code_changes>|<\/?plan_options>/gi, '').substring(0, 500)}
                                        {streamingText.length > 500 && '...'}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-[11px] text-primary/70">
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Generando respuesta...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <div className="typing-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <form className="chat-input-area" onSubmit={handleSendPrompt}>
                    <div className="input-wrapper relative flex items-center bg-neutral-900 border border-white/10 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all p-1">
                        <textarea
                            className="chat-input w-full bg-transparent text-white placeholder-neutral-500 px-3 py-2.5 resize-none outline-none text-[13px] leading-relaxed"
                            placeholder="Ej: Crea una tabla... (Shift+Enter para nueva línea)"
                            value={prompt}
                            rows={Math.min(100, prompt.split('\n').length || 1)}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (prompt.trim() && !isAiTyping) {
                                        handleSendPrompt(e as any);
                                    }
                                }
                            }}
                            disabled={isAiTyping}
                            style={{ minHeight: '44px', maxHeight: '400px' }}
                        />
                        <button
                            type="submit"
                            className="send-btn flex-shrink-0 self-end flex items-center justify-center p-2.5 mx-1 mb-1 rounded-lg bg-primary hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!prompt.trim() || isAiTyping}
                        >
                            <Send size={16} />
                        </button>
                    </div>

                </form>
            </section>

            {/* Right Canvas Area (Panel / Preview) */}
            <section className="canvas-panel glass-panel flex flex-col h-full bg-neutral-900 border-l border-white/5">
                <div className="panel-header canvas-header flex-shrink-0 border-b border-white/5 bg-neutral-950/50 backdrop-blur-xl z-20" style={{ justifyContent: 'space-between', padding: '0 1rem' }}>
                    <div className="flex items-center gap-1 h-full pt-1">
                        <button
                            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-sm transition-colors ${viewMode === 'panel' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-400 hover:text-white'}`}
                            onClick={() => setViewMode('panel')}
                        >
                            <PanelsTopLeft size={14} /> Panel
                        </button>
                        <button
                            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-sm transition-colors ${viewMode === 'preview' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-400 hover:text-white'}`}
                            onClick={() => setViewMode('preview')}
                        >
                            <Play size={14} /> Vista Previa
                        </button>
                        {viewMode === 'preview' && (
                            <div className="flex items-center ml-2 border-l border-white/10 pl-2 gap-1">
                                <button
                                    onClick={() => setPreviewDevice(previewDevice === 'desktop' ? 'mobile' : 'desktop')}
                                    className="p-1.5 rounded-md transition-colors bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                                    title={previewDevice === 'desktop' ? 'Cambiar a Móvil' : 'Cambiar a PC'}
                                >
                                    {previewDevice === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
                                </button>
                                <button
                                    onClick={() => setPreviewRefreshKey(k => k + 1)}
                                    className="p-1.5 rounded-md text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                                    title="Recargar Vista Previa"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        )}

                    </div>
                    <div className="flex items-center gap-2">
                        {deployStatus?.url ? (
                            <a
                                href={deployStatus.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-green-400 text-sm font-medium mr-2 hover:underline flex items-center gap-1"
                            >
                                <Sparkles size={14} /> ¡App en Línea!
                            </a>
                        ) : deployStatus?.error ? (
                            <span className="text-red-400 text-sm font-medium mr-2">{deployStatus.error}</span>
                        ) : null}

                        {/* Screen Selector Dropdown */}
                        {viewMode === 'preview' && extractRoutes().length > 1 && (
                            <select
                                value={currentRoute}
                                onChange={(e) => setCurrentRoute(e.target.value)}
                                className="input-field mr-2"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', minWidth: '90px', maxWidth: '130px' }}
                                title="Navegar a pantalla"
                            >
                                {extractRoutes().map(route => (
                                    <option key={route} value={route}>
                                        {route === '/' ? 'Inicio' : route.split('/').filter(Boolean).pop() || route}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="flex flex-col items-end mr-2 pr-2 border-r border-white/10 w-32">
                            <div className="flex justify-between w-full text-[9px] text-neutral-400 mb-1 font-medium uppercase tracking-wider">
                                <span>Créditos</span>
                                <span className={db.getUser()?.tokens && db.getUser()!.tokens < 5000 ? 'text-red-400 font-bold' : ''}>
                                    {db.getUser()?.tokens?.toLocaleString()} rest.
                                </span>
                            </div>
                            <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${db.getUser()?.tokens && db.getUser()!.tokens < 5000 ? 'bg-red-500' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, ((db.getUser()?.tokens || 0) / (db.getUser()?.plan === 'Enterprise' ? 1500000 : db.getUser()?.plan === 'Expert' ? 600000 : db.getUser()?.plan === 'Pro' ? 250000 : 5000)) * 100))}%` }}
                                ></div>
                            </div>

                        </div>

                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mr-2"
                            title="Ampliar Plan"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] text-neutral-400 leading-none mb-0.5">Plan {db.getUser()?.plan || 'Free'}</span>
                            </div>
                        </button>

                        <button
                            className="flex items-center gap-1.5"
                            onClick={handleDeploy}
                            disabled={isDeploying || Object.keys(project.files).length <= 1}
                            style={{
                                padding: '4px 12px',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                background: (isDeploying || Object.keys(project.files).length <= 1) ? '#334155' : '#10b981',
                                color: (isDeploying || Object.keys(project.files).length <= 1) ? '#94a3b8' : 'white',
                                cursor: (isDeploying || Object.keys(project.files).length <= 1) ? 'not-allowed' : 'pointer',
                                border: 'none',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                opacity: isDeploying ? 0.7 : 1
                            }}
                        >
                            {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                            {isDeploying ? 'Subiendo...' : 'Publicar App'}
                        </button>
                        <button
                            className="btn-primary flex items-center gap-1.5"
                            onClick={() => window.open(`/preview/${project.id}`, '_blank')}
                            style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                        >
                            <ExternalLink size={14} /> Ver App
                        </button>
                        <button className="icon-btn hover-primary" title="Pantalla Completa">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="canvas-content" style={{ display: 'flex', flex: 1, padding: 0, position: 'relative' }}>
                    {viewMode === 'panel' ? (
                        <div className="flex w-full h-full bg-neutral-950">
                            {/* Panel Sidebar */}
                            <aside className="w-56 flex flex-col border-r border-white/5 bg-neutral-950/50 backdrop-blur-md">
                                <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
                                    {navItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname.startsWith(item.path);
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon size={18} className={isActive ? 'text-primary' : ''} />
                                                <span className="text-sm">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </aside>

                            {/* Panel Content Area */}
                            <main className="flex-1 relative bg-neutral-900 overflow-y-auto">
                                {isCodeEditorRoute ? (
                                    <div className="custom-code-viewer" style={{ display: 'flex', width: '100%', height: '100%' }}>
                                        <div className="file-explorer" style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', background: 'rgba(0,0,0,0.1)' }}>
                                            <h3 className="text-[10px] font-bold text-neutral-500 mb-4 uppercase tracking-wider">Archivos Generados</h3>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
                                                {Object.keys(project.files).sort().map(filename => (
                                                    <li key={filename}>
                                                        <button
                                                            onClick={() => setCodeFile(filename)}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${codeFile === filename ? 'bg-primary/15 text-primary' : 'text-neutral-400 hover:bg-white/5'}`}
                                                        >
                                                            <FileCode2 size={14} />
                                                            <span className="truncate">{filename.split('/').pop()}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="code-editor" style={{ flex: 1, padding: '1.5rem', background: '#1e1e1e', overflow: 'auto', position: 'relative' }}>
                                            {isAiTyping && (
                                                <div className="absolute top-0 left-0 right-0 p-2.5 bg-primary/20 border-b border-primary/30 text-primary-300 text-xs flex items-center gap-2 justify-center z-10 backdrop-blur-md animate-pulse">
                                                    <Loader2 size={14} className="animate-spin" /> Mayson está aplicando modificaciones...
                                                </div>
                                            )}
                                            <div className="mb-4 text-primary-400 text-xs font-medium font-mono" style={{ marginTop: isAiTyping ? '30px' : '0', transition: 'margin-top 0.3s' }}>
                                                {codeFile}
                                            </div>
                                            <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                                                <SyntaxHighlighter
                                                    language={codeFile.endsWith('.css') ? 'css' : codeFile.endsWith('.html') ? 'html' : 'tsx'}
                                                    style={vscDarkPlus}
                                                    customStyle={{ margin: 0, padding: '1.5rem', fontSize: '13px', background: '#1e1e1e' }}
                                                    showLineNumbers={true}
                                                >
                                                    {project.files[codeFile] || '// El archivo está vacío o no existe.'}
                                                </SyntaxHighlighter>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 h-full bg-neutral-900">
                                        <Outlet context={{ project }} />
                                    </div>
                                )}
                            </main>
                        </div>
                    ) : (
                        <div className="preview-container flex flex-col w-full h-full bg-neutral-900 relative">
                            <div className="flex-1 flex flex-col items-center justify-center overflow-auto" style={{ padding: previewDevice === 'mobile' ? '2rem 1rem' : '0' }}>
                                <div
                                    className={`iframe-wrapper relative bg-white transition-all duration-300 ${previewDevice === 'mobile'
                                        ? 'w-[375px] h-[812px] box-content rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[14px] border-neutral-950 overflow-hidden flex-shrink-0'
                                        : 'w-full h-full flex-1'
                                        }`}
                                >
                                    {isAiTyping && (
                                        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-[inherit]">
                                            <div className={`absolute inset-0 ${autoHealStatus === 'fixing' ? 'bg-gradient-to-tr from-amber-500/10 to-orange-500/10' : 'bg-gradient-to-tr from-primary/10 to-indigo-500/10'} animate-pulse`}></div>
                                            <div className="relative flex flex-col items-center bg-neutral-950 p-6 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                                                <div className="relative mb-5">
                                                    <div className={`absolute inset-0 ${autoHealStatus === 'fixing' ? 'bg-amber-500/40' : 'bg-primary/40'} blur-xl rounded-full animate-pulse`}></div>
                                                    <div className={`relative ${autoHealStatus === 'fixing' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-primary to-indigo-600'} p-3 rounded-xl shadow-lg border border-white/20`}>
                                                        {autoHealStatus === 'fixing'
                                                            ? <AlertTriangle size={24} className="text-white animate-pulse" />
                                                            : <Sparkles size={24} className="text-white animate-pulse" />
                                                        }
                                                    </div>
                                                </div>
                                                <h3 className="text-white font-bold text-base mb-1.5 flex items-center gap-2">
                                                    {autoHealStatus === 'fixing' ? 'Corrigiendo error automáticamente...' : 'Mayson está creando tu app'}
                                                </h3>
                                                <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                    <Loader2 size={12} className={`animate-spin ${autoHealStatus === 'fixing' ? 'text-amber-500' : 'text-primary'}`} />
                                                    <span>{autoHealStatus === 'fixing' ? `Auto-fix intento ${autoHealRetries.current}/${MAX_AUTO_HEAL_RETRIES}` : 'Escribiendo y compilando código...'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <iframe
                                        key={`${previewRefreshKey}-${currentRoute}`}
                                        src={`/preview/${project.id}?route=${currentRoute}`}
                                        className="w-full h-full border-0 bg-white"
                                        title="Live Application Preview"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section >
        </div >

    );
}
