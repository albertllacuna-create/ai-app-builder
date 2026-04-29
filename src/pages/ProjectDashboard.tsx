import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, LogOut, X, CreditCard, User as UserIcon, Trash2, Copy, Send, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { Project } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import logo from '../assets/logo.png';
import '../index.css';

export function ProjectDashboard() {
    const navigate = useNavigate();
    const [showSettings, setShowSettings] = useState(false);
    
    // We replace the old modal variables with the unified prompt state
    const [prompt, setPrompt] = useState('');
    
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [projectToClone, setProjectToClone] = useState<Project | null>(null);
    const [user, setUser] = useState<any>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
                
                // Tipos permitidos: imágenes, documentos de texto, código, excels
                const allowedTypes = [
                    'image/', 'text/', 'application/pdf', 'application/json',
                    'application/javascript', 'application/typescript', 'application/x-javascript',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel'
                ];
                const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || 
                                 /\.(ts|tsx|js|jsx|css|json|md|txt|xlsx|xls|csv)$/.test(file.name);

                if (!isAllowed) {
                    setError(`El tipo de archivo "${file.name}" no es compatible (usa imágenes o texto)`);
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

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Limpiar error automáticamente tras 5 segundos
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                return;
            }
            setUser(session.user);

            // Initialize from Supabase (loads profile + projects from cloud)
            db.login(session.user.email!);
            await db.initFromSupabase({ id: session.user.id, email: session.user.email! });
            setProjects(db.getProjects());
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/login');
            } else {
                setUser(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleCreateProjectFromPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        try {
            setIsSyncing(true);
            
            if (attachments.length > 0) {
                const processedAttachments = await Promise.all(
                    attachments.map(async (file) => ({
                        name: file.name,
                        type: file.type,
                        url: await readFileAsDataURL(file)
                    }))
                );
                sessionStorage.setItem('bulbia_pending_attachments', JSON.stringify(processedAttachments));
            }

            // Create a temporary project name
            const proj = await db.createProject(prompt.trim().substring(0, 30) + '...');
            
            // Navigate and pass the prompt to AppBuilder via query parameter
            navigate(`/project/${proj.id}?prompt=${encodeURIComponent(prompt.trim())}`);

            // Asynchronously generate and update the project name based on the prompt
            fetch('/api/generate-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt.trim() })
            }).then(resp => resp.json()).then(data => {
                if (data.name) {
                    db.updateProjectMetadata(proj.id, { name: data.name });
                }
            });
        } catch (err: any) {
            console.error('Error creating project:', err);
            setError(err.message || 'No se pudo crear el proyecto');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleDeleteProject = async (id: string) => {
        try {
            setIsSyncing(true);
            await db.deleteProject(id);
            setProjects(db.getProjects());
            setProjectToDelete(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCloneProject = async (id: string) => {
        try {
            setIsSyncing(true);
            await db.cloneProject(id);
            setProjects(db.getProjects());
            setProjectToClone(null);
        } catch (err: any) {
            setError(err.message);
            setProjectToClone(null);
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Typewriter Effect ---
    const phrases = [
        "construir un CRM inmobiliario...",
        "generar un dashboard de finanzas...",
        "hacer un prototipo de e-commerce...",
        "crear un gestor de proyectos...",
        "diseñar una landing page moderna..."
    ];
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const typingSpeed = isDeleting ? 40 : 80;
        const currentPhrase = phrases[currentPhraseIndex];
        
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setDisplayText(currentPhrase.substring(0, displayText.length + 1));
                if (displayText.length === currentPhrase.length) {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                setDisplayText(currentPhrase.substring(0, displayText.length - 1));
                if (displayText.length === 0) {
                    setIsDeleting(false);
                    setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
                }
            }
        }, typingSpeed);

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, currentPhraseIndex]);

    if (!user) return null;

    return (
        <div className="flex h-screen text-[var(--text-primary)] overflow-hidden builder-layout bg-transparent relative">
            {/* Animated Background */}
            <div className="mesh-gradient" />

            {/* Sidebar */}
            <aside className="w-72 border-r border-[var(--surface-border)] flex flex-col bg-[var(--background)] flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
                <div className="p-4 border-b border-[var(--surface-border)] flex items-center gap-2">
                    <img src={logo} alt="bulbia logo" className="w-8 h-8 rounded shrink-0" />
                    <span className="font-bold text-lg">Bulbia</span>
                </div>
                
                <div className="p-4">
                    <button 
                        className="w-full btn btn-primary flex items-center justify-center gap-2"
                        onClick={() => {
                            setPrompt('');
                            document.getElementById('hero-prompt-input')?.focus();
                        }}
                    >
                        <Plus size={18} /> Nuevo Proyecto
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest pl-2 mb-2 mt-4">Tus Proyectos</h3>
                    {projects.slice().reverse().map(project => (
                        <div 
                            key={project.id} 
                            className="group relative flex flex-col p-3 mx-2 mb-1 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors border border-transparent hover:border-[var(--surface-border)]" 
                            onClick={() => navigate(`/project/${project.id}`)}
                        >
                            <div className="flex justify-between items-center w-full">
                                <span className="font-medium text-sm truncate pr-10 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{project.name}</span>
                                <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded px-1 transition-opacity shadow-lg">
                                    <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Duplicar" onClick={(e) => { e.stopPropagation(); setProjectToClone(project); }}><Copy size={14} /></button>
                                    <button className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors" title="Eliminar" onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                    ))}
                    {projects.length === 0 && (
                        <div className="p-4 text-center text-neutral-500 text-sm mt-4">
                            Aún no tienes proyectos.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-[var(--surface-border)] mt-auto bg-[var(--surface)]/20">
                    <button onClick={() => navigate('/pricing')} className="w-full flex flex-col p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--text-muted)] transition-colors mb-2 text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-success"></span>
                            <span className="text-xs font-medium text-[var(--text-muted)]">Plan {db.getUser()?.plan || 'Free'}</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)]">{db.getUser()?.tokens?.toLocaleString()} Tokens REST.</span>
                    </button>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <ThemeToggle />
                        <button className="flex-1 flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-hover)] transition-colors text-left" onClick={() => setShowSettings(true)}>
                            <Settings size={18} className="text-[var(--text-muted)]" />
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Ajustes</span>
                        </button>
                    </div>
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-hover)] transition-colors text-left text-red-500/80 hover:text-red-500" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Area: Hero Prompt */}
            <main className="flex-1 flex flex-col items-center justify-center relative p-6 overflow-hidden z-10">
                {/* Alerta de Error flotante */}
                {error && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-300">
                        <div className="bg-red-500/15 backdrop-blur-md border border-red-500/50 text-red-500 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 w-max max-w-[90vw]">
                            <Sparkles size={18} className="animate-pulse" />
                            <span className="font-medium text-sm">{error}</span>
                            <button onClick={() => setError(null)} className="ml-2 hover:bg-red-500/20 p-1 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="z-10 w-full max-w-2xl flex flex-col items-center animate-fade-in -mt-20">
                    <div className="flex items-center gap-2 mb-8 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 px-4 py-1.5 rounded-full shadow-lg shadow-black/5">
                        <Sparkles size={14} className="text-primary animate-pulse" />
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Bulbia Intelligence</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] text-center mb-6 tracking-tight leading-tight">
                        ¿Qué vamos a crear hoy?
                    </h1>
                    
                    <div 
                        className="w-full premium-glass rounded-3xl p-1.5 shadow-2xl shadow-primary/5 transition-all hover:shadow-primary/15"
                    >
                        <form onSubmit={handleCreateProjectFromPrompt} className="relative">
                            <div className={`absolute top-5 left-6 pointer-events-none flex items-center gap-1 transition-opacity duration-200 ${prompt.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
                                <span className="text-base text-[var(--text-muted)]">Pregunta a Bulbia para</span>
                                <span className="text-base text-primary font-medium">{displayText}</span>
                                <span className="w-[1.5px] h-5 bg-primary animate-pulse ml-0.5"></span>
                            </div>

                            <textarea
                                id="hero-prompt-input"
                                className="w-full bg-transparent border-none rounded-2xl px-6 py-5 text-base text-[var(--text-primary)] placeholder-transparent focus:outline-none resize-none transition-all"
                                style={{ minHeight: '130px' }}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (prompt.trim()) {
                                            handleCreateProjectFromPrompt(e as any);
                                        }
                                    }
                                }}
                                autoFocus
                            />
                            
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-6 pb-3">
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

                            <div className="flex justify-between items-center px-4 pb-3">
                                <div className="flex gap-1.5">
                                    <div 
                                        className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] transition-colors group relative cursor-pointer m-0 flex items-center justify-center"
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
                                    <button type="button" className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] transition-colors flex items-center gap-1.5 text-xs font-medium">Build <Settings size={12} /></button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!prompt.trim()}
                                    className="p-2.5 rounded-full bg-primary hover:bg-primary-600 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-90"
                                >
                                    <Send size={18} className="-rotate-45 -translate-y-0.5 translate-x-0.5" />
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="w-full mt-8">
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                "CRM de Ventas", "App de Productividad", "Dashboard de Finanzas", 
                                "Gestor de Tareas", "Portal de Empleados"
                            ].map(suggestion => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setPrompt(`Crea una aplicación de tipo: ${suggestion}. Que sea elegante, moderna y completamente funcional.`)}
                                    className="px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-all text-xs font-medium text-[var(--text-secondary)] shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel slide-up">
                        <div className="modal-header">
                            <h2>Ajustes y Suscripción</h2>
                            <button className="icon-btn" onClick={() => setShowSettings(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="settings-section">
                                <h3><UserIcon size={18} className="inline-icon" /> Perfil</h3>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Plan actual:</strong> {db.getUser()?.plan || 'Free'} (Mensual)</p>
                            </div>

                            <div className="settings-section mt-4">
                                <h3><CreditCard size={18} className="inline-icon" /> Saldo Tokens IA</h3>
                                <div className="credits-bar-container mt-2">
                                    <div className="h-2 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full w-full"></div>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-[var(--text-muted)]">{db.getUser()?.tokens?.toLocaleString() || 0} tokens disponibles este mes</p>
                                <button className="btn btn-primary mt-4 w-full" onClick={() => navigate('/pricing')}>Ampliar Plan de IA</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {projectToDelete && (
                <div className="modal-overlay" onClick={() => setProjectToDelete(null)}>
                    <div className="modal-content glass-panel slide-up" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Eliminar Proyecto</h2>
                            <button className="icon-btn" onClick={() => setProjectToDelete(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="mb-6">
                                ¿Estás seguro de que deseas eliminar permanentemente el proyecto <strong className="text-[var(--text-primary)]">{projectToDelete.name}</strong>? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-2">
                                <button type="button" className="btn btn-outline w-full" onClick={() => setProjectToDelete(null)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn w-full" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => handleDeleteProject(projectToDelete.id)}>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Clone Modal */}
            {projectToClone && (
                <div className="modal-overlay" onClick={() => setProjectToClone(null)}>
                    <div className="modal-content glass-panel slide-up" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Duplicar Proyecto</h2>
                            <button className="icon-btn" onClick={() => setProjectToClone(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="mb-6">
                                ¿Deseas crear una copia exacta del proyecto <strong className="text-[var(--text-primary)]">{projectToClone.name}</strong>?
                            </p>
                            <div className="flex gap-2">
                                <button type="button" className="btn btn-outline w-full" onClick={() => setProjectToClone(null)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn btn-primary w-full" onClick={() => handleCloneProject(projectToClone.id)}>
                                    Duplicar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
