import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Outlet, Link, useLocation } from 'react-router-dom';
import { Send, Maximize2, FileCode2, Sparkles, ExternalLink, Loader2, Rocket, Play, RefreshCw, Code2,
    LayoutDashboard, Users, Database, Globe, Settings, CreditCard, PanelsTopLeft, ArrowLeft, Monitor, Smartphone,
    AlertTriangle, X, Save, Plus, Image as ImageIcon, FileText, Zap, ListChecks, CheckCircle2, ChevronDown, Check
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { db } from '../services/db';
import { deployService } from '../services/deploy';
import { Project, AIModel } from '../types';
import { AiMessageBubble } from '../components/AiMessageBubble';
import { ThemeToggle } from '../components/ThemeToggle';
import { getSupabaseContent } from '../services/systemFiles';
import { supabase } from '../services/supabase';
import { useMaysonChat } from '../hooks/useMaysonChat';
import { useRemoteBundler } from '../hooks/useRemoteBundler';
import '../index.css';

export function AppBuilder() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState<Project | null>(null);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [codeFile, setCodeFile] = useState('/src/App.tsx');
    const [localCode, setLocalCode] = useState<string>('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
    
    const [currentRoute, setCurrentRoute] = useState<string>('/');
    const location = useLocation();
    const [viewMode, setViewMode] = useState<'panel' | 'preview'>('preview');
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

    const [isDeploying, setIsDeploying] = useState(false);
    const [deployStatus, setDeployStatus] = useState<{ url?: string; error?: string } | null>(null);
    const initialPromptHandled = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [interactionMode, setInteractionMode] = useState<'build' | 'plan'>('build');
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    
    const [attachments, setAttachments] = useState<File[]>([]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validFiles: File[] = [];
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB

            files.forEach(file => {
                if (file.size > MAX_SIZE) {
                    setError(`El archivo "${file.name}" es demasiado grande (máx 10MB)`);
                    return;
                }
                
                // Tipos permitidos: imágenes, documentos de texto, código
                const allowedTypes = [
                    'image/', 'text/', 'application/json',
                    'application/javascript', 'application/typescript', 'application/x-javascript'
                ];
                const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || 
                                 /\.(ts|tsx|js|jsx|css|json|md|txt|csv)$/.test(file.name);

                if (!isAllowed) {
                    setError(`El tipo de archivo "${file.name}" no es compatible (usa imágenes, texto o CSV)`);
                    return;
                }

                validFiles.push(file);
            });

            if (validFiles.length > 0) {
                setAttachments(prev => [...prev, ...validFiles]);
            }
        }
        e.target.value = '';
    };

    // Limpiar error automáticamente tras 5 segundos
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const handleApprovePlan = () => {
        setInteractionMode('build');
        const approvalPrompt = `✅ PLAN APROBADO. Ahora EJECUTA la implementación completa.

INSTRUCCIONES CRÍTICAS PARA LA EJECUCIÓN:
1. Genera TODOS los archivos de código necesarios en esta misma respuesta.
2. Cada archivo DEBE estar en su propio bloque de código (\`\`\`tsx) con "// filepath:" en la primera línea.
3. EMPIEZA siempre por App.tsx — este archivo debe ser COMPLETO y funcional por sí solo.
4. Si creas componentes auxiliares, asegúrate de que cada uno tenga su "export default" correcto.
5. NO crees más de 4-5 archivos. Si puedes hacer todo en App.tsx, mejor.
6. TODOS los imports deben corresponder a archivos que generes en esta respuesta o que ya existan.
7. Usa MemoryRouter (NUNCA BrowserRouter). Usa dbHelper de '../supabase'. Tailwind CSS para estilos.

Construye ahora la aplicación completa basándote en el plan que acabamos de acordar.`;
        handleSendPrompt(approvalPrompt, undefined, 'build');
    };

    // --- Hooks Custom Orchestration ---
    const buildBundleRef = useRef<any>(null);
    const triggerBuildBundle = useCallback((p: Project) => {
        if (buildBundleRef.current) buildBundleRef.current(p);
    }, []);

    const {
        prompt, setPrompt, messages, isAiTyping, streamingText,
        autoHealStatus, handleAutoFix, resetAutoHeal, handleSendPrompt, handleUndo
    } = useMaysonChat(project, setProject, triggerBuildBundle);

    const {
        previewHtml, bundleLoading, consoleWarnings, setConsoleWarnings, iframeRef, buildBundle
    } = useRemoteBundler(project, isAiTyping, currentRoute, viewMode, handleAutoFix, resetAutoHeal);

    // Resolver acoplamiento cíclico
    useEffect(() => {
        buildBundleRef.current = buildBundle;
    }, [buildBundle]);

    // Atajo de teclado Alt+P para cambiar entre Plan/Build
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setInteractionMode(prev => prev === 'build' ? 'plan' : 'build');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    // ----------------------------------

    // Sincronizar editor manual
    useEffect(() => {
        if (project && project.files) {
            setLocalCode(project.files[codeFile] || '');
            setHasUnsavedChanges(false);
        }
    }, [codeFile]);

    // Autocompletar cuando la IA genera código si no estamos editando manualmente
    useEffect(() => {
        if (project && !hasUnsavedChanges) {
            setLocalCode(project.files[codeFile] || '');
        }
    }, [project?.updatedAt, codeFile, hasUnsavedChanges]);

    // Lógica de Auto-save para cambios manuales en el editor
    useEffect(() => {
        if (!hasUnsavedChanges || !project) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            try {
                setIsSyncing(true);
                await db.updateProjectFiles(project.id, { [codeFile]: localCode });
                setHasUnsavedChanges(false);
                const updated = db.getProject(project.id);
                if (updated) {
                    setProject({ ...updated });
                    buildBundle(updated);
                }
            } catch (err) {
                console.error("Auto-save failed:", err);
            } finally {
                setIsSyncing(false);
            }
        }, 1500); // Guardado automático tras 1.5s de inactividad

        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [localCode, codeFile, project?.id]);

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

    // Initial load and session check
    useEffect(() => {
        const init = async () => {
            if (!projectId) {
                navigate('/dashboard');
                return;
            }

            // Verificar sesión si no está inicializado
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                return;
            }

            // Asegurar que la DB esté inicializada desde Cloud
            if (!db.getUser()) {
                db.login(session.user.email!);
                await db.initFromSupabase({ id: session.user.id, email: session.user.email! });
            }

            const p = db.getProject(projectId);
            if (!p) {
                // Si no existe localmente tras init, redirigir
                console.error("Project not found after init:", projectId);
                navigate('/dashboard');
                return;
            }
            setProject({ ...p });
        };

        init();
    }, [projectId, navigate]);

    // Handle incoming prompt query parameter for new projects
    useEffect(() => {
        if (!project || initialPromptHandled.current || messages.length > 0) return;
        
        const searchParams = new URLSearchParams(location.search);
        const initialPrompt = searchParams.get('prompt');
        const initialMode = searchParams.get('mode') as 'build' | 'plan' || 'build';
        
        if (initialPrompt) {
            initialPromptHandled.current = true;
            if (initialMode) setInteractionMode(initialMode);
            
            // Extraer adjuntos de sessionStorage si los hay
            let attachedFiles: any[] | undefined = undefined;
            const storedAttachments = sessionStorage.getItem('bulbia_pending_attachments');
            if (storedAttachments) {
                try {
                    attachedFiles = JSON.parse(storedAttachments);
                } catch(e) {
                    console.error("Failed to parse pending attachments");
                }
                sessionStorage.removeItem('bulbia_pending_attachments');
            }

            handleSendPrompt(initialPrompt, attachedFiles, initialMode);
            navigate(location.pathname, { replace: true });
        }
    }, [project, location, navigate, messages.length, handleSendPrompt]);

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

    const handleDeploy = async () => {
        if (!project) return;
        setIsDeploying(true);
        setDeployStatus(null);
        try {
            const result = await deployService.deployProject(project);
            if (result.success && result.url) {
                setDeployStatus({ url: result.url });
                await db.updateProjectMetadata(project.id, { publishedUrl: result.url });
            } else {
                setDeployStatus({ error: result.error || 'Despliegue fallido' });
            }
        } catch (err: any) {
            setDeployStatus({ error: err.message || 'Excepción desconocida' });
        } finally {
            setIsDeploying(false);
        }
    };

    if (!project) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-1">Sincronizando con Bulbia Cloud</h2>
                        <p className="text-neutral-500 text-sm">Recuperando tu proyecto de Supabase...</p>
                    </div>
                </div>
            </div>
        );
    }

    const undosAvailable = project.history?.length || 0;

    return (
        <div className="builder-layout bg-[var(--background)] text-[var(--text-primary)]">
            {/* Main Chat Area */}
            <section className="chat-panel glass-panel border-r border-[var(--surface-border)] relative">
                {/* Alerta de Error flotante en el chat */}
                {error && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-300 w-[90%]">
                        <div className="bg-red-500/15 backdrop-blur-md border border-red-500/50 text-red-500 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3">
                            <AlertTriangle size={16} />
                            <span className="font-medium text-[11px] flex-1">{error}</span>
                            <button onClick={() => setError(null)} className="hover:bg-red-500/20 p-1 rounded-lg transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}
                <div className="panel-header border-b border-[var(--surface-border)]" style={{ justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md transition-colors mr-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Volver al Dashboard">
                            <ArrowLeft size={18} />
                        </button>
                        <Sparkles className="text-primary" size={20} />
                        <span className="font-bold text-lg leading-none text-[var(--text-primary)]">asistente Bulbia</span>
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
                                
                                {/* Botón de Aprobar Plan si estamos en modo Plan y es el último mensaje de la IA */}
                                {idx === messages.length - 1 && msg.role === 'ai' && interactionMode === 'plan' && !isAiTyping && (
                                    <div className="mt-6 flex justify-center animate-in fade-in slide-in-from-bottom-3 duration-700">
                                        <button 
                                            onClick={handleApprovePlan}
                                            className="flex items-center gap-2 px-8 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-2xl font-bold shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(79,70,229,0.5)] hover:scale-[1.03] active:scale-[0.97] transition-all group relative z-50 border border-white/10"
                                        >
                                            <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" /> 
                                            Aprobar y Ejecutar Cambios
                                        </button>
                                    </div>
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
                                        <span>Generando lógica y archivos...</span>
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

                <form className="chat-input-area border-t border-[var(--surface-border)] bg-[var(--surface)]" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!prompt.trim() || isAiTyping) return;
                    
                    let finalPrompt = prompt.trim();
                    let imageAttachments: any[] = [];
                    
                    if (attachments.length > 0) {
                        setIsSyncing(true);
                        try {
                            for (const file of attachments) {
                                if (file.type.startsWith('image/')) {
                                    imageAttachments.push({
                                        name: file.name,
                                        type: file.type,
                                        url: await readFileAsDataURL(file)
                                    });
                                } else {
                                    // Tratar como texto (CSV, JSON, Code)
                                    const text = await readFileAsText(file);
                                    finalPrompt += `\n\n[Contenido del archivo adjunto: ${file.name}]\n${text}\n[Fin de archivo: ${file.name}]\n`;
                                }
                            }
                            setAttachments([]);
                        } catch (err) {
                            console.error("Error processing attachments:", err);
                            setError("Error al procesar archivos adjuntos");
                        } finally {
                            setIsSyncing(false);
                        }
                    }
                    handleSendPrompt(finalPrompt, imageAttachments.length > 0 ? imageAttachments : undefined, interactionMode);
                }}>
                    <div className="input-wrapper relative flex flex-col bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-sm">
                        
                        {/* Selector de Modo (Plan / Build) - Estilo Lovable */}
                        <div className="flex items-center px-3 pt-2">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5 ${interactionMode === 'plan' ? 'text-indigo-500' : 'text-[var(--text-secondary)]'}`}
                                >
                                    {interactionMode === 'build' ? 'Build' : 'Plan'}
                                    <ChevronDown size={14} className={`transition-transform duration-200 opacity-60 ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isModeMenuOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setIsModeMenuOpen(false)}
                                        />
                                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                                            <div className="p-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => { setInteractionMode('build'); setIsModeMenuOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${interactionMode === 'build' ? 'bg-neutral-100 dark:bg-white/10' : 'hover:bg-neutral-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <div>
                                                        <div className="font-semibold text-[13px] text-[var(--text-primary)]">Build</div>
                                                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Aplica cambios directamente</div>
                                                    </div>
                                                    {interactionMode === 'build' && <Check size={16} className="text-[var(--text-primary)] shrink-0" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setInteractionMode('plan'); setIsModeMenuOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors mt-0.5 ${interactionMode === 'plan' ? 'bg-neutral-100 dark:bg-white/10' : 'hover:bg-neutral-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <div>
                                                        <div className="font-semibold text-[13px] text-[var(--text-primary)]">Plan</div>
                                                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Discutir antes de construir</div>
                                                    </div>
                                                    {interactionMode === 'plan' && <Check size={16} className="text-[var(--text-primary)] shrink-0" />}
                                                </button>
                                            </div>
                                            <div className="border-t border-neutral-200 dark:border-neutral-700 px-3 py-2 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                                                Cambiar con <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[9px] font-mono font-medium border border-neutral-200 dark:border-neutral-600">Alt</kbd> <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[9px] font-mono font-medium border border-neutral-200 dark:border-neutral-600">P</kbd>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-3 pt-3">
                                {attachments.map((file, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded-lg text-xs animate-in zoom-in duration-200">
                                        {file.type.startsWith('image/') ? <ImageIcon size={14} className="text-primary" /> : <FileText size={14} className="text-primary" />}
                                        <span className="truncate max-w-[150px] text-[var(--text-secondary)] font-medium">{file.name}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeAttachment(i)} 
                                            className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full p-0.5 transition-colors ml-1"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center p-1">
                            <div 
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] transition-colors group relative cursor-pointer m-1 flex items-center justify-center shrink-0"
                                title="Adjuntar archivos"
                            >
                                <input 
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                                    multiple 
                                    onChange={handleFileSelect} 
                                    title=""
                                />
                                <Plus size={18} className="group-hover:text-primary transition-colors relative z-10 pointer-events-none" />
                            </div>

                            <textarea
                                className="chat-input w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] px-3 py-2.5 resize-none outline-none text-[13px] leading-relaxed"
                                placeholder="Ej: Crea una tabla... (Shift+Enter para nueva línea)"
                                value={prompt}
                                rows={Math.min(10, prompt.split('\n').length || 1)}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if ((prompt.trim() || attachments.length > 0) && !isAiTyping) {
                                            const form = e.currentTarget.closest('form');
                                            if (form) form.requestSubmit();
                                        }
                                    }
                                }}
                                disabled={isAiTyping}
                                style={{ minHeight: '44px', maxHeight: '400px' }}
                            />
                            <button
                                type="submit"
                                className="send-btn flex-shrink-0 self-end flex items-center justify-center p-2.5 mx-1 mb-1 rounded-lg bg-primary hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={(!prompt.trim() && attachments.length === 0) || isAiTyping}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            {/* Right Canvas Area (Panel / Preview) */}
            <section className="canvas-panel flex flex-col h-full bg-[var(--background)]">
                <div className="panel-header canvas-header flex-shrink-0 border-b border-[var(--surface-border)] bg-[var(--surface)] z-20" style={{ justifyContent: 'space-between', padding: '0 1rem' }}>
                    <div className="flex items-center gap-1 h-full pt-1">
                        <button
                            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-sm transition-colors ${viewMode === 'panel' ? 'border-primary text-primary font-medium' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            onClick={() => setViewMode('panel')}
                        >
                            <PanelsTopLeft size={14} /> Panel
                        </button>
                        <button
                            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-sm transition-colors ${viewMode === 'preview' ? 'border-primary text-primary font-medium' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            onClick={() => setViewMode('preview')}
                        >
                            <Play size={14} /> Vista Previa
                        </button>
                        {viewMode === 'preview' && (
                            <div className="flex items-center ml-2 border-l border-[var(--surface-border)] pl-2 gap-1">
                                <button
                                    onClick={() => setPreviewDevice(previewDevice === 'desktop' ? 'mobile' : 'desktop')}
                                    className="p-1.5 rounded-md transition-colors bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    title={previewDevice === 'desktop' ? 'Cambiar a Móvil' : 'Cambiar a PC'}
                                >
                                    {previewDevice === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
                                </button>
                                <button
                                    onClick={() => project && buildBundle(project)}
                                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                                    title="Recompilar Vista Previa"
                                    disabled={bundleLoading}
                                >
                                    <RefreshCw size={14} className={bundleLoading ? 'animate-spin text-primary' : ''} />
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
                                onChange={(e) => {
                                    const newRoute = e.target.value;
                                    setCurrentRoute(newRoute);
                                    if (project) buildBundle(project, newRoute);
                                }}
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
                        <div className="flex flex-col items-end mr-2 pr-2 border-r border-[var(--surface-border)] w-32 shrink-0">
                            <div className="flex justify-between w-full text-[9px] text-[var(--text-muted)] mb-1 font-medium uppercase tracking-wider whitespace-nowrap">
                                <span>Créditos</span>
                                <span className={db.getUser()?.tokens && db.getUser()!.tokens < 50 ? 'text-red-500 font-bold' : ''}>
                                    {db.getUser()?.tokens?.toLocaleString(undefined, { maximumFractionDigits: 2 })} rest.
                                </span>
                            </div>
                            <div className="h-1 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden shrink-0">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${db.getUser()?.tokens && db.getUser()!.tokens < 50 ? 'bg-red-500' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, ((db.getUser()?.tokens || 0) / (db.getUser()?.plan === 'Expert' ? 7500 : db.getUser()?.plan === 'Pro' ? 3500 : db.getUser()?.plan === 'Starter' ? 1500 : 100)) * 100))}%` }}
                                ></div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--text-muted)] transition-colors mr-2 shrink-0 whitespace-nowrap"
                            title="Ampliar Plan"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0"></span>
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] text-[var(--text-muted)] leading-none mb-0.5 whitespace-nowrap">Plan {db.getUser()?.plan || 'Free'}</span>
                            </div>
                        </button>

                        <button
                            className="flex items-center gap-1.5 whitespace-nowrap shrink-0"
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
                            {isDeploying ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Rocket size={14} className="shrink-0" />}
                            {isDeploying ? 'Subiendo...' : 'Publicar App'}
                        </button>
                        <button
                            className="btn-primary flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            onClick={() => window.open(`/preview/${project.id}`, '_blank')}
                            style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                        >
                            <ExternalLink size={14} className="shrink-0" /> Ver App
                        </button>
                        <div className="ml-1 flex items-center">
                            <ThemeToggle />
                        </div>
                        <button className="icon-btn hover-primary" title="Pantalla Completa">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="canvas-content" style={{ display: 'flex', flex: 1, padding: 0, position: 'relative' }}>
                    {viewMode === 'panel' ? (
                        <div className="flex w-full h-full bg-[var(--background)]">
                            {/* Panel Sidebar */}
                            <aside className="w-56 flex flex-col border-r border-[var(--surface-border)] bg-[var(--background)]">
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
                                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
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
                            <main className="flex-1 relative bg-[var(--background)] overflow-y-auto">
                                {isCodeEditorRoute ? (
                                    <div className="custom-code-viewer" style={{ display: 'flex', width: '100%', height: '100%' }}>
                                        <div className="file-explorer" style={{ width: '220px', borderRight: '1px solid var(--surface-border)', padding: '1.25rem', background: 'var(--surface)' }}>
                                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-4 uppercase tracking-wider">Archivos Generados</h3>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
                                                {Object.keys(project.files).sort().map(filename => (
                                                    <li key={filename}>
                                                        <button
                                                            onClick={() => setCodeFile(filename)}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${codeFile === filename ? 'bg-primary/15 text-primary' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'}`}
                                                        >
                                                            <FileCode2 size={14} />
                                                            <span className="truncate">{filename.split('/').pop()}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="code-editor" style={{ flex: 1, padding: '1.5rem', background: 'var(--code-bg)', overflow: 'auto', position: 'relative' }}>
                                            {isAiTyping && (
                                                <div className="absolute top-0 left-0 right-0 p-2.5 bg-primary/20 border-b border-primary/30 text-primary font-medium text-xs flex items-center gap-2 justify-center z-10 backdrop-blur-md animate-pulse">
                                                    <Loader2 size={14} className="animate-spin" /> Bulbia está aplicando modificaciones...
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mb-4 border-b border-[var(--surface-border)] pb-2" style={{ marginTop: isAiTyping ? '30px' : '0', transition: 'margin-top 0.3s' }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-primary text-xs font-medium font-mono">{codeFile}</div>
                                                    {isSyncing ? (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium animate-pulse">
                                                            <RefreshCw size={10} className="animate-spin" /> Guardando en Cloud...
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-medium">
                                                            <div className="w-1 h-1 rounded-full bg-green-500"></div> Sincronizado
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        if (!project) return;
                                                        setIsSyncing(true);
                                                        try {
                                                            await db.updateProjectFiles(project.id, { [codeFile]: localCode });
                                                            setHasUnsavedChanges(false);
                                                            const updated = db.getProject(project.id);
                                                            if (updated) { 
                                                                setProject({ ...updated });
                                                                buildBundle(updated); 
                                                            }
                                                        } finally {
                                                            setIsSyncing(false);
                                                        }
                                                    }}
                                                    disabled={!hasUnsavedChanges || isAiTyping || isSyncing}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
                                                >
                                                    <Save size={14} /> Guardar Ahora
                                                </button>
                                            </div>
                                            <div className="rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-sm h-[600px]">
                                                <Editor
                                                    height="100%"
                                                    language={codeFile.endsWith('.css') ? 'css' : codeFile.endsWith('.html') ? 'html' : 'typescript'}
                                                    theme="vs-dark"
                                                    value={localCode}
                                                    onChange={(value) => {
                                                        setLocalCode(value || '');
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    options={{
                                                        minimap: { enabled: false },
                                                        fontSize: 13,
                                                        wordWrap: 'on',
                                                        scrollBeyondLastLine: false,
                                                        readOnly: isAiTyping, // Bloquear si la IA está escribiendo
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 h-full">
                                        <Outlet context={{ project }} />
                                    </div>
                                )}
                            </main>
                        </div>
                    ) : (
                        <div className="preview-container flex flex-col w-full h-full bg-[var(--background)] relative">
                            <div className="flex-1 flex flex-col items-center justify-center overflow-auto" style={{ padding: previewDevice === 'mobile' ? '2rem 1rem' : '0' }}>
                                <div
                                    className={`iframe-wrapper relative bg-white transition-all duration-300 ${previewDevice === 'mobile'
                                        ? 'w-[375px] h-[812px] box-content rounded-[3rem] shadow-xl border-[14px] border-[var(--foreground)] overflow-hidden flex-shrink-0'
                                        : 'w-full h-full flex-1'
                                        }`}
                                >
                                    {(isAiTyping || bundleLoading) && (
                                        <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-[inherit]">
                                            <div className={`absolute inset-0 ${autoHealStatus === 'fixing' ? 'bg-gradient-to-tr from-amber-500/10 to-orange-500/10' : 'bg-gradient-to-tr from-primary/10 to-indigo-500/10'} animate-pulse`}></div>
                                            <div className="relative flex flex-col items-center bg-[var(--surface-elevated)] p-6 rounded-2xl border border-[var(--surface-border)] shadow-xl">
                                                <div className="relative mb-5">
                                                    <div className={`absolute inset-0 ${autoHealStatus === 'fixing' ? 'bg-amber-500/40' : 'bg-primary/40'} blur-xl rounded-full animate-pulse`}></div>
                                                    <div className={`relative ${autoHealStatus === 'fixing' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-primary to-indigo-600'} p-3 rounded-xl shadow-lg border border-white/20`}>
                                                        {autoHealStatus === 'fixing'
                                                            ? <AlertTriangle size={24} className="text-white animate-pulse" />
                                                            : <Sparkles size={24} className="text-white animate-pulse" />
                                                        }
                                                    </div>
                                                </div>
                                                <h3 className="text-[var(--text-primary)] font-bold text-base mb-1.5 flex items-center gap-2">
                                                    {bundleLoading && !isAiTyping ? '⚡ Optimizando y Compilando...' : autoHealStatus === 'fixing' ? '🔧 Auto-reparación en curso...' : '✨ Bulbia está creando tu app'}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-medium bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--surface-border)]">
                                                    <Loader2 size={12} className={`animate-spin ${autoHealStatus === 'fixing' ? 'text-amber-500' : 'text-primary'}`} />
                                                    <span>{bundleLoading && !isAiTyping ? 'Procesando bundle con esbuild remoto' : autoHealStatus === 'fixing' ? 'Analizando logs...' : 'Escribiendo archivos de sistema...'}</span>
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                    <iframe
                                        ref={iframeRef}
                                        srcDoc={previewHtml || undefined}
                                        className="w-full h-full border-0 bg-white"
                                        title="Live Application Preview"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
                                    />
                                    {consoleWarnings.length > 0 && (
                                        <div className="absolute bottom-4 left-4 right-4 z-30">
                                            <div className="bg-[var(--surface-elevated)] border border-amber-500/30 shadow-xl rounded-xl p-3 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold">
                                                        <AlertTriangle size={14} />
                                                        <span>Bulbia ha detectado {consoleWarnings.length} log(s) inusuales en la app principal.</span>
                                                    </div>
                                                    <button onClick={() => setConsoleWarnings([])} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div className="max-h-24 overflow-y-auto space-y-1">
                                                    {consoleWarnings.map((w, i) => (
                                                        <div key={i} className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--surface)] p-1.5 rounded truncate">{w}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section >

            {/* Deployment Status Modal */}
            {deployStatus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--surface)] p-6 rounded-2xl shadow-2xl border border-[var(--surface-border)] max-w-md w-full m-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                Estado de Publicación
                            </h3>
                            <button 
                                onClick={() => setDeployStatus(null)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {deployStatus.error ? (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-600 font-medium break-words">
                                    ⚠️ Error: {deployStatus.error}
                                </p>
                            </div>
                        ) : deployStatus.url ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                                    <Sparkles className="text-green-600 shrink-0" size={24} />
                                    <div>
                                        <p className="text-sm text-green-800 font-bold mb-1">¡App Publicada con Éxito!</p>
                                        <p className="text-xs text-green-600">Tu aplicación ya está en vivo en Vercel.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">URL Pública</label>
                                    <div className="flex gap-2">
                                        <input 
                                            readOnly 
                                            value={deployStatus.url} 
                                            className="flex-1 bg-[var(--background)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                                        />
                                        <button 
                                            onClick={() => window.open(deployStatus.url, '_blank')}
                                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                                        >
                                            Visitar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div >

    );
}
