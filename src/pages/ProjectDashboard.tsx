import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, LogOut, X, CreditCard, User as UserIcon, Trash2, Copy, Send, Sparkles, FileText, Image as ImageIcon, Zap, ListChecks, Loader2, ChevronDown, Check, Star, Layers, Clock } from 'lucide-react';
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
    const [interactionMode, setInteractionMode] = useState<'build' | 'plan'>('build');
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [sidebarView, setSidebarView] = useState<'home' | 'all'>('home');

    const toggleFavorite = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        const project = projects.find(p => p.id === projectId);
        if (project) {
            await db.updateProjectMetadata(projectId, { favorite: !project.favorite });
            setProjects([...db.getProjects()]);
        }
    };

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
                
                // Tipos permitidos: imágenes, documentos de texto, código (excluyendo binarios como Excel)
                const allowedTypes = [
                    'image/', 'text/', 'application/json',
                    'application/javascript', 'application/typescript', 'application/x-javascript'
                ];
                const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || 
                                 /\.(ts|tsx|js|jsx|css|json|md|txt|csv)$/.test(file.name);

                if (!isAllowed) {
                    setError(`El tipo de archivo "${file.name}" no es compatible (usa imágenes, texto o código)`);
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

    const handleCreateProjectFromPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        try {
            setIsSyncing(true);
            
            let finalPrompt = prompt.trim();
            let imageAttachments: any[] = [];
            
            if (attachments.length > 0) {
                for (const file of attachments) {
                    if (file.type.startsWith('image/')) {
                        imageAttachments.push({
                            name: file.name,
                            type: file.type,
                            url: await readFileAsDataURL(file)
                        });
                    } else {
                        // Tratar como texto (CSV, JSON, Code)
                        try {
                            const text = await readFileAsText(file);
                            finalPrompt += `\n\n[Archivo adjunto: ${file.name}]\n${text}\n`;
                        } catch (err) {
                            console.warn("Failed to read text file:", file.name);
                        }
                    }
                }
                
                if (imageAttachments.length > 0) {
                    sessionStorage.setItem('bulbia_pending_attachments', JSON.stringify(imageAttachments));
                }
            }

            // Create a temporary project name
            const proj = await db.createProject(finalPrompt.substring(0, 30) + '...');
            
            // Navigate and pass the prompt to AppBuilder via query parameter
            navigate(`/project/${proj.id}?prompt=${encodeURIComponent(finalPrompt)}&mode=${interactionMode}`);

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

            {/* Sidebar - Base44 Style */}
            <aside className="w-64 border-r border-[var(--surface-border)] flex flex-col bg-[var(--background)] flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
                {/* Logo */}
                <div className="px-4 py-3 border-b border-[var(--surface-border)] flex items-center gap-2">
                    <img src={logo} alt="bulbia logo" className="w-7 h-7 rounded shrink-0" />
                    <span className="font-bold text-[15px]">Bulbia</span>
                </div>
                
                {/* Navigation */}
                <nav className="px-2 pt-3 pb-1 space-y-0.5">
                    <button 
                        onClick={() => {
                            setSidebarView('home');
                            setPrompt('');
                            document.getElementById('hero-prompt-input')?.focus();
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${sidebarView === 'home' ? 'bg-primary/10 text-primary' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Plus size={14} /> Crear App
                    </button>
                    <button 
                        onClick={() => setSidebarView('all')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${sidebarView === 'all' ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]'}`}
                    >
                        <Layers size={14} /> Todas las Apps
                    </button>
                </nav>

                {/* Scrollable sidebar content - Favorites + Recent */}
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                    {/* Favorites - always visible */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-1 mt-3 flex items-center gap-1.5">
                            <Star size={10} /> Favoritos
                        </h3>
                        {projects.filter(p => p.favorite).length > 0 ? (
                            projects.filter(p => p.favorite).map(project => (
                                <div 
                                    key={project.id} 
                                    className="group flex items-center gap-2 px-3 py-2 mx-1 mb-0.5 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer transition-colors" 
                                    onClick={() => navigate(`/project/${project.id}`)}
                                >
                                    <Star size={12} className="text-amber-400 shrink-0" fill="currentColor" />
                                    <span className="text-[12px] font-medium truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{project.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] opacity-60 italic">
                                Sin favoritos aún
                            </div>
                        )}
                    </div>

                    {/* Recent */}
                    <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-1 mt-3 flex items-center gap-1.5">
                        <Clock size={10} /> Recientes
                    </h3>
                    {projects.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8).map(project => (
                        <div 
                            key={project.id} 
                            className="group flex items-center gap-2 px-3 py-2 mx-1 mb-0.5 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer transition-colors" 
                            onClick={() => navigate(`/project/${project.id}`)}
                        >
                            <div className="flex-1 min-w-0">
                                <span className="block text-[12px] font-medium truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{project.name}</span>
                                <span className="block text-[9px] text-[var(--text-muted)]">{new Date(project.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && (
                        <div className="px-3 py-6 text-center text-[var(--text-muted)] text-[11px]">
                            Aún no tienes proyectos.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-3 border-t border-[var(--surface-border)] mt-auto space-y-1.5">
                    <button onClick={() => navigate('/pricing')} className="w-full flex flex-col p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-[var(--text-muted)] transition-colors text-left">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">Plan {db.getUser()?.plan || 'Free'}</span>
                        </div>
                        <span className="text-[12px] font-bold text-[var(--text-primary)]">{db.getUser()?.tokens?.toLocaleString()} Tokens REST.</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                        <button className="flex-1 flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left" onClick={() => setShowSettings(true)}>
                            <Settings size={14} className="text-[var(--text-muted)]" />
                            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Ajustes</span>
                        </button>
                    </div>
                    <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left text-red-500/80 hover:text-red-500" onClick={handleLogout}>
                        <LogOut size={14} />
                        <span className="text-[11px] font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col relative p-6 overflow-y-auto z-10">
                {/* Error alert */}
                {error && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-300">
                        <div className="bg-red-500/15 backdrop-blur-md border border-red-500/50 text-red-500 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 w-max max-w-[90vw]">
                            <Sparkles size={18} className="animate-pulse" />
                            <span className="font-medium text-sm">{error}</span>
                            <button onClick={() => setError(null)} className="ml-2 hover:bg-red-500/20 p-1 rounded-lg transition-colors"><X size={16} /></button>
                        </div>
                    </div>
                )}

                {sidebarView === 'all' ? (
                    /* === ALL APPS GALLERY === */
                    <div className="w-full max-w-5xl mx-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-6 mt-2">
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Todas las Apps</h1>
                            <span className="text-[12px] text-[var(--text-muted)]">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</span>
                        </div>
                        {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Layers size={48} className="text-[var(--text-muted)] mb-4 opacity-30" />
                                <p className="text-[var(--text-muted)] text-sm">Aún no tienes proyectos.</p>
                                <button onClick={() => setSidebarView('home')} className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-all">
                                    <Plus size={14} className="inline mr-1" /> Crear tu primera app
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {projects.slice().reverse().map(project => (
                                    <div key={project.id} onClick={() => navigate(`/project/${project.id}`)} className="group relative bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5">
                                        <div className="h-36 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center border-b border-[var(--surface-border)]">
                                            <div className="text-center">
                                                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center"><Layers size={20} className="text-primary" /></div>
                                                <span className="text-[10px] text-[var(--text-muted)]">Vista previa</span>
                                            </div>
                                        </div>
                                        <div className="p-3.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)] truncate group-hover:text-primary transition-colors">{project.name}</h3>
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Editado {new Date(project.updatedAt).toLocaleDateString()}</p>
                                                </div>
                                                <button onClick={(e) => toggleFavorite(e, project.id)} className={`shrink-0 p-1 rounded-lg transition-colors ${project.favorite ? 'text-amber-400 hover:text-amber-500' : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}><Star size={14} fill={project.favorite ? 'currentColor' : 'none'} /></button>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{project.type || 'Web App'}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors" title="Duplicar" onClick={(e) => { e.stopPropagation(); setProjectToClone(project); }}><Copy size={13} /></button>
                                                    <button className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar" onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}><Trash2 size={13} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* === HERO PROMPT VIEW === */
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="z-10 w-full max-w-2xl flex flex-col items-center animate-fade-in -mt-20">
                            <div className="flex items-center gap-2 mb-8 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 px-4 py-1.5 rounded-full shadow-lg shadow-black/5">
                                <Sparkles size={14} className="text-primary animate-pulse" />
                                <span className="text-xs font-semibold text-[var(--text-secondary)]">Bulbia Intelligence</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] text-center mb-6 tracking-tight leading-tight">¿Qué vamos a crear hoy?</h1>
                            <div className="w-full premium-glass rounded-3xl p-1.5 shadow-2xl shadow-primary/5 transition-all hover:shadow-primary/15">
                                <form onSubmit={handleCreateProjectFromPrompt} className="relative">
                                    <div className={`absolute top-5 left-6 pointer-events-none flex items-center gap-1 transition-opacity duration-200 ${prompt.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
                                        <span className="text-base text-[var(--text-muted)]">Pregunta a Bulbia para</span>
                                        <span className="text-base text-primary font-medium">{displayText}</span>
                                        <span className="w-[1.5px] h-5 bg-primary animate-pulse ml-0.5"></span>
                                    </div>
                                    <textarea id="hero-prompt-input" className="w-full bg-transparent border-none rounded-2xl px-6 py-5 text-base text-[var(--text-primary)] placeholder-transparent focus:outline-none resize-none transition-all" style={{ minHeight: '130px' }} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (prompt.trim()) handleCreateProjectFromPrompt(e as any); }}} autoFocus />
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 px-6 pb-3">
                                            {attachments.map((file, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded-lg text-xs animate-in zoom-in duration-200">
                                                    {file.type.startsWith('image/') ? <ImageIcon size={14} className="text-primary" /> : <FileText size={14} className="text-primary" />}
                                                    <span className="truncate max-w-[150px] text-[var(--text-secondary)] font-medium">{file.name}</span>
                                                    <button type="button" onClick={() => removeAttachment(i)} className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full p-0.5 transition-colors ml-1"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center px-4 pb-3">
                                        <div className="flex gap-1.5">
                                            <div className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] transition-colors group relative cursor-pointer m-0 flex items-center justify-center" title="Adjuntar archivos">
                                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" multiple onChange={handleFileSelect} title="" />
                                                <Plus size={18} className="group-hover:text-primary transition-colors relative z-10 pointer-events-none" />
                                            </div>
                                            <div className="h-6 w-[1px] bg-black/10 dark:bg-white/10 mx-1"></div>
                                            <div className="relative">
                                                <button type="button" onClick={() => setIsModeMenuOpen(!isModeMenuOpen)} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5 ${interactionMode === 'plan' ? 'text-indigo-500' : 'text-[var(--text-secondary)]'}`}>
                                                    {interactionMode === 'build' ? 'Build' : 'Plan'}
                                                    <ChevronDown size={14} className={`transition-transform duration-200 opacity-60 ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isModeMenuOpen && (<><div className="fixed inset-0 z-40" onClick={() => setIsModeMenuOpen(false)} /><div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"><div className="p-1.5"><button type="button" onClick={() => { setInteractionMode('build'); setIsModeMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${interactionMode === 'build' ? 'bg-neutral-100 dark:bg-white/10' : 'hover:bg-neutral-50 dark:hover:bg-white/5'}`}><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">Build</div><div className="text-[11px] text-[var(--text-muted)] mt-0.5">Aplica cambios directamente</div></div>{interactionMode === 'build' && <Check size={16} className="text-[var(--text-primary)] shrink-0" />}</button><button type="button" onClick={() => { setInteractionMode('plan'); setIsModeMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors mt-0.5 ${interactionMode === 'plan' ? 'bg-neutral-100 dark:bg-white/10' : 'hover:bg-neutral-50 dark:hover:bg-white/5'}`}><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">Plan</div><div className="text-[11px] text-[var(--text-muted)] mt-0.5">Discutir antes de construir</div></div>{interactionMode === 'plan' && <Check size={16} className="text-[var(--text-primary)] shrink-0" />}</button></div><div className="border-t border-neutral-200 dark:border-neutral-700 px-3 py-2 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">Cambiar con <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[9px] font-mono font-medium border border-neutral-200 dark:border-neutral-600">Alt</kbd> <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[9px] font-mono font-medium border border-neutral-200 dark:border-neutral-600">P</kbd></div></div></>)}
                                            </div>
                                        </div>
                                        <button type="submit" disabled={!prompt.trim()} className="p-2.5 rounded-full bg-primary hover:bg-primary-600 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-90"><Send size={18} className="-rotate-45 -translate-y-0.5 translate-x-0.5" /></button>
                                    </div>
                                </form>
                            </div>
                            <div className="w-full mt-8">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {["CRM de Ventas", "App de Productividad", "Dashboard de Finanzas", "Gestor de Tareas", "Portal de Empleados"].map(s => (
                                        <button key={s} type="button" onClick={() => setPrompt(`Crea una aplicación de tipo: ${s}. Que sea elegante, moderna y completamente funcional.`)} className="px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-all text-xs font-medium text-[var(--text-secondary)] shadow-sm hover:shadow-md hover:-translate-y-0.5">{s}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
