import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, LogOut, X, CreditCard, User as UserIcon, Trash2, Copy, Send, Sparkles, FileText, Image as ImageIcon, Zap, ListChecks, Loader2, ChevronDown, Check, Star, Layers, Clock, History, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import * as LucideIcons from 'lucide-react';

const DynamicIcon = ({ name, size = 16, className = "" }: { name: string | undefined, size?: number, className?: string }) => {
    const Icon = (LucideIcons as any)[name || 'Sparkles'] || LucideIcons.Sparkles;
    return <Icon size={size} className={className} />;
};
import { Project } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import { ErrorBoundary } from '../components/ErrorBoundary';
import logo from '../assets/logo.png';
import '../index.css';

export function ProjectDashboard() {
    const navigate = useNavigate();
    const [sidebarView, setSidebarView] = useState<'home' | 'all' | 'settings'>('home');
    const [settingsTab, setSettingsTab] = useState<'account' | 'billing' | 'usage'>('account');
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
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);

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
            setWorkspaces(db.getWorkspaces());
            setActiveWorkspaceId(db.getActiveWorkspaceId());
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

            // Create a temporary project name while generating
            const proj = await db.createProject('Generando nombre...');
            
            // Navigate and pass the prompt to AppBuilder via query parameter
            navigate(`/project/${proj.id}?prompt=${encodeURIComponent(finalPrompt)}&mode=${interactionMode}`);

            // Asynchronously generate and update the project name and logo based on the prompt
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{
                            role: 'user',
                            content: `Basado en este prompt: "${prompt.trim()}", sugiere un nombre comercial corto (máx 3 palabras) y un icono de Lucide React (ej: ShoppingBag, Zap, Users, Shield, Briefcase, Rocket, Star, Heart, Code, Database, Smartphone, Layout, BarChart, Settings, Mail, Bell, MapPin, Search, Plus, Check, X, Menu, Home, Calendar, Clock, Camera, Image, Video, Music, Mic, Play, Pause, Square, Triangle, Circle) que lo represente. Responde SOLO en formato JSON: {"name": "Nombre", "icon": "IconName"}`
                        }],
                        mode: 'plan'
                    })
                });
                const data = await response.json();
                const content = data.content || (data.parts ? data.parts.map((p: any) => p.text).join('') : '');
                const match = content.match(/\{.*\}/s);
                if (match) {
                    const metadata = JSON.parse(match[0]);
                    db.updateProjectMetadata(proj.id, { 
                        name: metadata.name || 'Nueva App',
                        logoUrl: metadata.icon || 'Sparkles'
                    });
                    setProjects(db.getProjects());
                }
            } catch (err) {
                console.error("Error generating metadata:", err);
                db.updateProjectMetadata(proj.id, { name: 'Nueva App', logoUrl: 'Sparkles' });
            }
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

    const handleSwitchWorkspace = async (id: string) => {
        setIsSyncing(true);
        await db.switchWorkspace(id);
        setActiveWorkspaceId(id);
        setProjects(db.getProjects());
        setIsWorkspaceMenuOpen(false);
        setIsSyncing(false);
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim()) return;
        try {
            setIsSyncing(true);
            await db.createWorkspace(newWorkspaceName);
            setWorkspaces(db.getWorkspaces());
            setActiveWorkspaceId(db.getActiveWorkspaceId());
            setProjects(db.getProjects());
            setIsCreatingWorkspace(false);
            setNewWorkspaceName('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGenerateInvite = async (role: 'editor' | 'viewer') => {
        if (!activeWorkspaceId) return;
        try {
            const token = await db.generateInvitation(activeWorkspaceId, role);
            const inviteLink = `${window.location.origin}/join/${token}`;
            await navigator.clipboard.writeText(inviteLink);
            alert(`¡Enlace de invitación (${role}) copiado al portapapeles!`);
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (settingsTab === ('members' as any) && activeWorkspaceId) {
            const loadMembers = async () => {
                const members = await db.getWorkspaceMembers(activeWorkspaceId);
                setWorkspaceMembers(members);
            };
            loadMembers();
        }
    }, [settingsTab, activeWorkspaceId]);

    const handleRemoveMember = async (profileId: string) => {
        if (!activeWorkspaceId || !confirm('¿Estás seguro de eliminar a este miembro?')) return;
        try {
            await db.removeMember(activeWorkspaceId, profileId);
            setWorkspaceMembers(prev => prev.filter(m => m.profileId !== profileId));
        } catch (err: any) {
            setError(err.message);
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
            <div className={`mesh-gradient transition-opacity duration-500 ${sidebarView === 'settings' ? 'opacity-0' : 'opacity-100'}`} />

            {/* Sidebar - Modern Bento Style */}
            <aside className="w-64 border-r border-[var(--surface-border)] flex flex-col bg-[var(--surface)] flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
                {/* Logo & Workspace Selector */}
                <div className="relative px-4 py-4">
                    <button 
                        onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-primary/30 transition-all group shadow-sm"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                                <img src={logo} alt="bulbia logo" className="w-5 h-5 brightness-0 invert" />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="font-bold text-[13px] text-[var(--text-primary)] truncate">
                                    {workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Bulbia'}
                                </span>
                                <span className="text-[10px] font-medium text-[var(--text-muted)] truncate">
                                    {workspaces.find(w => w.id === activeWorkspaceId)?.userRole || 'owner'}
                                </span>
                            </div>
                        </div>
                        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-200 ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isWorkspaceMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceMenuOpen(false)} />
                            <div className="absolute left-4 right-4 top-[calc(100%-0.5rem)] mt-1 bg-white dark:bg-[#121214] border border-[var(--surface-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                                <div className="p-1.5 space-y-0.5">
                                    <div className="px-3 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tus Espacios</div>
                                    {workspaces.map(ws => (
                                        <button
                                            key={ws.id}
                                            onClick={() => handleSwitchWorkspace(ws.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${activeWorkspaceId === ws.id ? 'bg-primary/5 text-primary' : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]'}`}
                                        >
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="font-semibold text-[13px] truncate">{ws.name}</span>
                                                <span className="text-[10px] opacity-60 uppercase">{ws.userRole}</span>
                                            </div>
                                            {activeWorkspaceId === ws.id && <Check size={14} />}
                                        </button>
                                    ))}
                                    <div className="h-[1px] bg-[var(--surface-border)] my-1.5" />
                                    <button 
                                        onClick={() => setIsCreatingWorkspace(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <Plus size={14} /> Nuevo Espacio
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Navigation (Bento Block) */}
                <nav className="px-4 pb-2 space-y-1">
                    <div className="bg-[var(--background)] rounded-2xl p-1.5 border border-[var(--surface-border)] shadow-sm">
                        <button 
                            onClick={() => {
                                setSidebarView('home');
                                setPrompt('');
                                document.getElementById('hero-prompt-input')?.focus();
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${sidebarView === 'home' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}
                        >
                            <Sparkles size={16} /> Crear App
                        </button>
                        <button 
                            onClick={() => setSidebarView('all')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all mt-1 ${sidebarView === 'all' ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--surface-border)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}
                        >
                            <Layers size={16} /> Todas las Apps
                        </button>
                    </div>
                </nav>

                {/* Scrollable sidebar content - Favorites + Recent */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {/* Favorites */}
                    <div className="mt-6">
                        <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
                            <Star size={12} className="text-amber-400" /> Favoritos
                        </h3>
                        <div className="space-y-0.5">
                            {projects.filter(p => p.favorite).length > 0 ? (
                                projects.filter(p => p.favorite).map(project => (
                                    <div 
                                        key={project.id} 
                                        className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-all hover:translate-x-1" 
                                        onClick={() => navigate(`/project/${project.id}`)}
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center shrink-0 shadow-sm">
                                            <DynamicIcon name={project.logoUrl} size={12} className="text-primary" />
                                        </div>
                                        <span className="text-[13px] font-medium truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{project.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="px-2 py-2 text-[12px] text-[var(--text-muted)] italic">
                                    Sin favoritos aún
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent */}
                    <div className="mt-8">
                        <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
                            <Clock size={12} /> Recientes
                        </h3>
                        <div className="space-y-0.5">
                            {projects.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8).map(project => (
                                <div key={project.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-all hover:translate-x-1 group" 
                                    onClick={() => navigate(`/project/${project.id}`)}
                                >
                                    <div className="w-6 h-6 rounded-lg bg-[var(--background)] border border-[var(--surface-border)] flex items-center justify-center shrink-0 shadow-sm group-hover:border-primary/30 transition-colors">
                                        <DynamicIcon name={project.logoUrl} size={12} className="text-[var(--text-secondary)] group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[13px] font-medium truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{project.name}</span>
                                    </div>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="px-2 py-4 text-center text-[var(--text-muted)] text-[12px]">
                                    Aún no tienes proyectos.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer (Bento Style) */}
                <div className="p-4 pt-2 mt-auto">
                    {/* Tokens Card */}
                    <button onClick={() => navigate('/pricing')} className="w-full relative overflow-hidden flex flex-col p-3 rounded-2xl bg-gradient-to-br from-[var(--surface-elevated)] to-[var(--background)] border border-[var(--surface-border)] hover:border-primary/40 transition-all text-left mb-3 shadow-sm group">
                        <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center justify-between">
                            Plan {db.getActiveWorkspace()?.plan || 'Free'}
                            <Zap size={12} className="text-amber-400" />
                        </span>
                        <div className="flex items-end gap-1.5 mb-2">
                            <span className="text-[16px] font-black text-[var(--text-primary)]">{(db.getActiveWorkspace()?.tokens ?? 0).toLocaleString()}</span>
                            <span className="text-[11px] font-medium text-[var(--text-secondary)] mb-0.5">Tokens</span>
                        </div>
                        {/* Fake Progress Bar to look cool */}
                        <div className="w-full h-1.5 bg-[var(--surface-border)] rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[75%] rounded-full opacity-80"></div>
                        </div>
                    </button>

                    {/* User & Settings Block */}
                    <div className="bg-[var(--background)] rounded-2xl p-1.5 border border-[var(--surface-border)] shadow-sm">
                        <div className="flex items-center gap-3 px-2.5 py-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-inner">
                                <span className="text-[11px] font-bold text-white uppercase">{user.email?.charAt(0) || '?'}</span>
                            </div>
                            <span className="text-[12px] font-medium text-[var(--text-secondary)] truncate flex-1">{user.email?.split('@')[0]}</span>
                        </div>
                        <div className="h-[1px] bg-[var(--surface-border)] mx-2 my-0.5"></div>
                        <div className="flex">
                            <button 
                                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl transition-colors ${sidebarView === 'settings' ? 'bg-[var(--surface-hover)] text-primary' : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} 
                                onClick={() => setSidebarView('settings')}
                            >
                                <Settings size={15} />
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-red-500/10 transition-colors text-red-500/70 hover:text-red-500" onClick={handleLogout}>
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className={`flex-1 flex flex-col relative overflow-y-auto z-10 transition-colors duration-500 ${sidebarView === 'settings' ? 'bg-[#f9fafb] p-0' : 'p-6'}`}>
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

                {sidebarView === 'settings' ? (
                    /* === SETTINGS VIEW INTEGRATED - BASE44 STYLE === */
                    <ErrorBoundary>
                    <div className="w-full h-full flex flex-col animate-fade-in">
                        {/* Settings Top Bar */}
                        <div className="px-8 py-4 border-b border-gray-200 bg-white flex items-center gap-4 flex-shrink-0">
                            <button 
                                onClick={() => setSidebarView('home')}
                                className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft size={16} /> Volver
                            </button>
                            <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
                            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Configuración</h2>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row p-8 gap-10 max-w-7xl mx-auto w-full overflow-y-auto">
                            {/* Settings Navigation */}
                            <div className="w-full lg:w-64 space-y-8 flex-shrink-0">
                                <div>
                                    <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 px-2">Espacio de Trabajo</h3>
                                    <div className="space-y-1">
                                        {[
                                            { id: 'account', name: 'Información básica', icon: UserIcon },
                                            { id: 'members', name: 'Colaboradores', icon: ListChecks },
                                            { id: 'billing', name: 'Plan y facturación', icon: CreditCard },
                                            { id: 'usage', name: 'Uso de créditos', icon: Zap },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setSettingsTab(tab.id as any)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${settingsTab === tab.id ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}
                                            >
                                                {tab.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="pt-6 border-t border-gray-200">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tema Visual</span>
                                        <ThemeToggle />
                                    </div>
                                </div>
                            </div>

                            {/* Settings Content Area */}
                            <div className="flex-1 space-y-6">
                                <div className="mb-6">
                                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                        {settingsTab === 'account' && 'Información básica'}
                                        {settingsTab === 'billing' && 'Plan y facturación'}
                                        {settingsTab === 'usage' && 'Uso de créditos'}
                                        {settingsTab === 'members' && 'Colaboradores'}
                                    </h1>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        {settingsTab === 'account' && 'Administra los detalles y la configuración de tu cuenta.'}
                                        {settingsTab === 'billing' && 'Controla tu suscripción, métodos de pago e historial.'}
                                        {settingsTab === 'usage' && 'Monitoriza el consumo de tokens de IA en tus proyectos.'}
                                        {settingsTab === 'members' && 'Gestiona quién tiene acceso a este espacio de trabajo.'}
                                    </p>
                                </div>

                                <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8">
                                {settingsTab === 'account' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                        <div className="divide-y divide-[var(--surface-border)] border-t border-b border-[var(--surface-border)]">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-2">
                                                <div>
                                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Email de Usuario</label>
                                                    <p className="text-sm text-[var(--text-muted)] mt-0.5">La dirección vinculada a tu cuenta</p>
                                                </div>
                                                <div className="min-w-[280px] px-4 py-2.5 bg-[var(--surface-hover)] rounded-xl border border-[var(--surface-border)] text-left sm:text-right">
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">{user?.email || ''}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nombre Completo</label>
                                                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Como te verán otros miembros</p>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    defaultValue={user?.fullName || ''} 
                                                    onBlur={(e) => db.updateUserProfile({ fullName: e.target.value })} 
                                                    placeholder="Escribe tu nombre..." 
                                                    className="min-w-[280px] px-4 py-2.5 bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-xl outline-none text-sm text-[var(--text-primary)] font-medium text-left sm:text-right transition-all placeholder:text-[var(--text-muted)] focus:border-primary/30 focus:bg-[var(--background)]" 
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-[var(--surface-border)]">
                                            <h4 className="text-base font-bold text-red-500 mb-2">Zona de Peligro</h4>
                                            <p className="text-sm text-[var(--text-muted)] mb-6">Al eliminar tu cuenta perderás todos tus proyectos, dominios y créditos de forma permanente.</p>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm('¿ESTÁS SEGURO? Esta acción es irreversible.')) {
                                                        await db.deleteAccount();
                                                        navigate('/login');
                                                    }
                                                }}
                                                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                            >
                                                Eliminar Cuenta Permanentemente
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === 'billing' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                        <div className="bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-3xl p-6 relative overflow-hidden">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Zap size={28} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Suscripción Activa</span>
                                                        </div>
                                                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">Plan {db.getActiveWorkspace()?.plan || 'Free'}</h3>
                                                        <p className="text-[var(--text-muted)] text-sm">Acceso total a las herramientas de Bulbia AI</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => navigate('/pricing')} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--background)] rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95">Cambiar Plan</button>
                                                    <button className="px-6 py-2.5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl text-xs font-bold hover:bg-[var(--surface-hover)] transition-all active:scale-95 text-[var(--text-primary)]">Facturación</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                                                <History size={14} /> Transacciones Recientes
                                            </h4>
                                            <div className="bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl overflow-hidden">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-[var(--surface)] text-[var(--text-muted)] border-b border-[var(--surface-border)]">
                                                        <tr>
                                                            <th className="px-6 py-4 font-semibold text-xs">Fecha</th>
                                                            <th className="px-6 py-4 font-semibold text-xs">Descripción</th>
                                                            <th className="px-6 py-4 font-semibold text-xs text-right">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--surface-border)]">
                                                        <tr>
                                                            <td className="px-6 py-5 text-[var(--text-secondary)]">{new Date().toLocaleDateString()}</td>
                                                            <td className="px-6 py-5 font-medium text-[var(--text-primary)]">Plan {db.getActiveWorkspace()?.plan || 'Free'} (Mensual)</td>
                                                            <td className="px-6 py-5 text-right font-bold">$0.00</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === 'usage' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="bg-[var(--background)] border border-[var(--surface-border)] p-6 rounded-3xl shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap size={16} className="text-primary" />
                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Créditos IA</span>
                                                </div>
                                                <div className="text-3xl font-black text-[var(--text-primary)]">
                                                    {((db.getActiveWorkspace()?.tokens || 0) * 0.4).toLocaleString()} <span className="text-sm font-medium text-[var(--text-muted)]">/ 10,000</span>
                                                </div>
                                            </div>
                                            <div className="bg-[var(--background)] border border-[var(--surface-border)] p-6 rounded-3xl shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar size={16} className="text-primary" />
                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Siguiente Reset</span>
                                                </div>
                                                <div className="text-xl font-bold text-[var(--text-primary)]">
                                                    {db.getActiveWorkspace()?.nextResetDate ? new Date(db.getActiveWorkspace()!.nextResetDate!).toLocaleDateString() : 'En 30 días'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="text-lg font-bold">Consumo del Ciclo</h4>
                                                    <p className="text-sm text-[var(--text-muted)]">Estimación basada en las peticiones enviadas a Bulbia</p>
                                                </div>
                                                <span className="text-2xl font-black text-primary">40%</span>
                                            </div>
                                            <div className="h-4 w-full bg-[var(--background)] border border-[var(--surface-border)] rounded-full overflow-hidden p-1">
                                                <div className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full w-[40%] shadow-lg shadow-primary/20"></div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Sparkles size={20} className="text-primary" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-[var(--text-primary)] mb-1">Optimización de Créditos</h5>
                                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Estamos trabajando para reducir el consumo de tokens en peticiones repetitivas. Tu plan actual permite hasta 10,000 peticiones de IA mensuales.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === 'members' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-2xl p-4 flex items-center gap-4 flex-1">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><UserIcon size={20} /></div>
                                                <div>
                                                    <div className="text-sm font-bold">{workspaceMembers.length} Miembros</div>
                                                    <div className="text-xs text-[var(--text-muted)]">Colaborando en {db.getActiveWorkspace()?.name}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleGenerateInvite('editor')} className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"><Plus size={14} /> Invitar Editor</button>
                                                <button onClick={() => handleGenerateInvite('viewer')} className="flex-1 sm:flex-none px-4 py-2 bg-[var(--text-primary)] text-[var(--background)] rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"><Plus size={14} /> Invitar Visor</button>
                                            </div>
                                        </div>

                                        <div className="bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-[var(--surface)] text-[var(--text-muted)] border-b border-[var(--surface-border)]">
                                                        <tr>
                                                            <th className="px-6 py-4 font-semibold text-xs">Usuario</th>
                                                            <th className="px-6 py-4 font-semibold text-xs">Rol</th>
                                                            <th className="px-6 py-4 font-semibold text-xs">Unido</th>
                                                            <th className="px-6 py-4 font-semibold text-xs text-right">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--surface-border)]">
                                                        {workspaceMembers.map(member => (
                                                            <tr key={member.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                                                                <td className="px-6 py-5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold uppercase">{member.email?.charAt(0)}</div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium text-[var(--text-primary)] truncate">{member.fullName || 'Sin nombre'}</div>
                                                                            <div className="text-xs text-[var(--text-muted)] truncate">{member.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.role === 'owner' ? 'bg-primary/10 text-primary' : member.role === 'editor' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                        {member.role === 'owner' ? 'Propietario' : member.role === 'editor' ? 'Editor' : 'Visor'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-5 text-[var(--text-secondary)] text-xs whitespace-nowrap">{new Date(member.joinedAt).toLocaleDateString()}</td>
                                                                <td className="px-6 py-5 text-right">
                                                                    {member.role !== 'owner' && db.getActiveWorkspace()?.userRole === 'owner' && (
                                                                        <button onClick={() => handleRemoveMember(member.profileId)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50/50 transition-all"><Trash2 size={16} /></button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </ErrorBoundary>
            ) : sidebarView === 'all' ? (
                    /* === ALL APPS GALLERY === */
                    <div className="w-full max-w-6xl mx-auto animate-fade-in pb-10">
                        <div className="flex items-end justify-between mb-8 mt-4 pb-4 border-b border-[var(--surface-border)]">
                            <div>
                                <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Tus Aplicaciones</h1>
                                <p className="text-[13px] text-[var(--text-muted)] mt-1 font-medium">Gestiona y administra todos tus proyectos creados con Bulbia.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[12px] font-bold text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-1.5 rounded-full shadow-sm">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-[var(--surface-hover)] border border-dashed border-[var(--surface-border)] rounded-3xl">
                                <Layers size={48} className="text-[var(--text-muted)] mb-4 opacity-30" />
                                <p className="text-[var(--text-muted)] text-sm font-medium">Aún no tienes proyectos creados en este espacio.</p>
                                <button onClick={() => setSidebarView('home')} className="mt-5 px-5 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95">
                                    <Plus size={16} className="inline mr-1.5 -translate-y-[1px]" /> Crear tu primera app
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {projects.slice().reverse().map(project => (
                                    <div key={project.id} onClick={() => navigate(`/project/${project.id}`)} className="group relative bg-[var(--surface)] border border-[var(--surface-border)] rounded-[1.25rem] overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1.5">
                                        <div className="h-40 bg-gradient-to-br from-[var(--surface-hover)] to-[var(--background)] flex items-center justify-center border-b border-[var(--surface-border)] relative overflow-hidden group-hover:from-primary/5 group-hover:to-primary/10 transition-colors">
                                             <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] transition-opacity duration-500"></div>
                                             <div className="text-center relative z-10 transform group-hover:scale-110 transition-transform duration-500">
                                                 <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white dark:bg-[#1a1a1c] shadow-lg flex items-center justify-center border border-[var(--surface-border)]">
                                                     <DynamicIcon name={project.logoUrl} size={32} className="text-primary" />
                                                 </div>
                                                 <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] opacity-0 group-hover:opacity-80 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">Abrir Editor</span>
                                             </div>
                                        </div>
                                        <div className="p-4 bg-[var(--surface)]">
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-[15px] font-bold text-[var(--text-primary)] truncate group-hover:text-primary transition-colors">{project.name}</h3>
                                                    <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Actualizado {new Date(project.updatedAt).toLocaleDateString()}</p>
                                                </div>
                                                <button onClick={(e) => toggleFavorite(e, project.id)} className={`shrink-0 p-1.5 rounded-lg transition-colors ${project.favorite ? 'text-amber-400 bg-amber-400/10' : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:bg-amber-400/10 hover:text-amber-400'}`}><Star size={16} fill={project.favorite ? 'currentColor' : 'none'} /></button>
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-[var(--surface-border)]/50">
                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-secondary)]">{project.type || 'Web App'}</span>
                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Duplicar" onClick={(e) => { e.stopPropagation(); setProjectToClone(project); }}><Copy size={14} /></button>
                                                    <button className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar" onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}><Trash2 size={14} /></button>
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
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                        {/* Background atmospheric glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,var(--primary)_0%,transparent_70%)] opacity-[0.03] dark:opacity-[0.07] pointer-events-none rounded-full blur-3xl"></div>
                        
                        <div className="z-10 w-full max-w-3xl flex flex-col items-center animate-fade-in -mt-20">
                            <div className="flex items-center gap-2.5 mb-8 bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-black/5 dark:border-white/10 px-5 py-2 rounded-full shadow-lg shadow-black/5 hover:scale-105 transition-transform cursor-default">
                                <Sparkles size={16} className="text-primary animate-pulse" />
                                <span className="text-[13px] font-bold tracking-wide text-[var(--text-primary)]">Bulbia Intelligence</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] text-center mb-8 tracking-tight leading-tight">¿Qué vamos a crear hoy?</h1>
                            
                            <div className="w-full bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl rounded-[2rem] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[var(--surface-border)] transition-all hover:shadow-[0_8px_40px_rgba(var(--primary-rgb),0.1)] hover:border-primary/30 relative group">
                                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none"></div>
                                <form onSubmit={handleCreateProjectFromPrompt} className="relative z-10">
                                    <div className={`absolute top-6 left-7 pointer-events-none flex items-center gap-1.5 transition-opacity duration-300 ${prompt.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
                                        <span className="text-lg text-[var(--text-muted)] font-medium">Pregunta a Bulbia para</span>
                                        <span className="text-lg text-primary font-bold">{displayText}</span>
                                        <span className="w-[2px] h-6 bg-primary animate-pulse ml-0.5 rounded-full"></span>
                                    </div>
                                    <textarea id="hero-prompt-input" className="w-full bg-transparent border-none rounded-[1.5rem] px-7 py-6 text-lg text-[var(--text-primary)] placeholder-transparent focus:outline-none resize-none transition-all font-medium leading-relaxed" style={{ minHeight: '140px' }} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (prompt.trim()) handleCreateProjectFromPrompt(e as any); }}} autoFocus />
                                    
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 px-7 pb-4">
                                            {attachments.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-[var(--surface-hover)] border border-[var(--surface-border)] px-3 py-1.5 rounded-xl text-sm animate-in zoom-in duration-200 shadow-sm">
                                                    {file.type.startsWith('image/') ? <ImageIcon size={16} className="text-primary" /> : <FileText size={16} className="text-primary" />}
                                                    <span className="truncate max-w-[150px] text-[var(--text-primary)] font-semibold">{file.name}</span>
                                                    <button type="button" onClick={() => removeAttachment(i)} className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full p-1 transition-colors ml-1"><X size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center px-5 pb-3">
                                        <div className="flex gap-2 items-center bg-[var(--surface-hover)] rounded-xl p-1 border border-[var(--surface-border)]">
                                            <div className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer relative flex items-center justify-center shadow-sm" title="Adjuntar archivos">
                                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" multiple onChange={handleFileSelect} title="" />
                                                <Plus size={18} className="relative z-10 pointer-events-none" />
                                            </div>
                                            <div className="h-5 w-[1px] bg-[var(--surface-border)] mx-0.5"></div>
                                            <div className="relative">
                                                <button type="button" onClick={() => setIsModeMenuOpen(!isModeMenuOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${interactionMode === 'plan' ? 'text-indigo-500 bg-indigo-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'}`}>
                                                    {interactionMode === 'build' ? 'Build' : 'Plan'}
                                                    <ChevronDown size={14} className={`transition-transform duration-200 opacity-60 ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isModeMenuOpen && (<><div className="fixed inset-0 z-40" onClick={() => setIsModeMenuOpen(false)} /><div className="absolute bottom-full left-0 mb-3 w-64 bg-white dark:bg-[#121214] border border-[var(--surface-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"><div className="p-1.5"><button type="button" onClick={() => { setInteractionMode('build'); setIsModeMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${interactionMode === 'build' ? 'bg-primary/5' : 'hover:bg-[var(--surface-hover)]'}`}><div><div className="font-bold text-[13px] text-[var(--text-primary)]">Build</div><div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">Aplica cambios directamente</div></div>{interactionMode === 'build' && <Check size={16} className="text-primary shrink-0" />}</button><button type="button" onClick={() => { setInteractionMode('plan'); setIsModeMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors mt-0.5 ${interactionMode === 'plan' ? 'bg-indigo-500/10' : 'hover:bg-[var(--surface-hover)]'}`}><div><div className="font-bold text-[13px] text-[var(--text-primary)]">Plan</div><div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">Discutir antes de construir</div></div>{interactionMode === 'plan' && <Check size={16} className="text-indigo-500 shrink-0" />}</button></div></div></>)}
                                            </div>
                                        </div>
                                        <button type="submit" disabled={!prompt.trim()} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-[14px] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 group"><Send size={16} className="-rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> Generar App</button>
                                    </div>
                                </form>
                            </div>
                            
                            {/* Suggestion Pills */}
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 max-w-2xl opacity-80 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                                {[
                                    { text: "Dashboard de analítica", icon: "ChartBar" },
                                    { text: "CRM Inmobiliario", icon: "Building" },
                                    { text: "Tienda online deportiva", icon: "ShoppingCart" },
                                    { text: "App gestión de reservas", icon: "Calendar" }
                                ].map((pill, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setPrompt(`Crea un ${pill.text.toLowerCase()}`)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--surface-border)] hover:border-primary/40 hover:bg-primary/5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-primary transition-all shadow-sm hover:shadow-md"
                                    >
                                        <DynamicIcon name={pill.icon} size={14} className="opacity-70" />
                                        {pill.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>


            {/* Create Workspace Modal */}
            {isCreatingWorkspace && (
                <div className="modal-overlay" onClick={() => setIsCreatingWorkspace(false)}>
                    <div className="modal-content glass-panel slide-up" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Nuevo Espacio de Trabajo</h2>
                            <button className="icon-btn" onClick={() => setIsCreatingWorkspace(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreateWorkspace} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nombre del Espacio</label>
                                    <input 
                                        type="text" 
                                        value={newWorkspaceName} 
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                        placeholder="Ej: Marketing, Personal, Cliente X..." 
                                        className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-xl text-sm outline-none focus:border-primary transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <button type="button" className="btn btn-outline w-full" onClick={() => setIsCreatingWorkspace(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary w-full" disabled={!newWorkspaceName.trim() || isSyncing}>
                                        {isSyncing ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Crear Espacio'}
                                    </button>
                                </div>
                            </form>
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
