import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, LogOut, X, CreditCard, User as UserIcon, Trash2, Copy, Send, Sparkles } from 'lucide-react';
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

    const handleCreateProjectFromPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        try {
            setIsSyncing(true);
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

    if (!user) return null;

    return (
        <div className="flex h-screen bg-[var(--background)] text-[var(--text-primary)] overflow-hidden builder-layout">
            {/* Sidebar */}
            <aside className="w-72 border-r border-[var(--surface-border)] flex flex-col bg-[var(--surface)] flex-shrink-0 z-20 shadow-2xl">
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

                <div className="p-4 border-t border-[var(--surface-border)] mt-auto">
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
            <main className="flex-1 flex flex-col items-center justify-center relative p-6 overflow-hidden">
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
                {/* Background glow effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="z-10 w-full max-w-3xl flex flex-col items-center animate-fade-in -mt-16">
                    <div className="flex items-center gap-2 mb-8 bg-[var(--surface)] border border-[var(--surface-border)] px-4 py-1.5 rounded-full shadow-sm">
                        <Sparkles size={16} className="text-primary" />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">asistente Bulbia</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] text-center mb-4 tracking-tight">
                        ¿Qué vas a crear a continuación?
                    </h1>
                    <p className="text-[var(--text-muted)] text-center mb-12 text-lg">
                        Describe abajo la idea de tu app o inspírate con nuestras plantillas
                    </p>

                    <form 
                        onSubmit={handleCreateProjectFromPrompt} 
                        className="w-full relative shadow-2xl shadow-primary/5 rounded-2xl"
                    >
                        <textarea
                            id="hero-prompt-input"
                            className="w-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-2xl px-6 py-5 pr-16 text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all shadow-sm"
                            style={{ minHeight: '140px' }}
                            placeholder="Ej: Crea un CRM inmobiliario con gestión de clientes y calendario..."
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
                        <button
                            type="submit"
                            disabled={!prompt.trim()}
                            className="absolute bottom-5 right-5 p-3 rounded-xl bg-primary hover:bg-primary-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </form>

                    <div className="w-full mt-6">
                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest pl-2 mb-3 block">Sugerencias</span>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "CRM de Ventas", "App de Productividad", "Dashboard de Finanzas", 
                                "Gestor de Tareas", "Portal de Empleados", "Plataforma Educativa"
                            ].map(suggestion => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setPrompt(`Crea una aplicación de tipo: ${suggestion}. Que sea elegante, moderna y completamente funcional.`)}
                                    className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] hover:border-[var(--text-muted)] transition-all text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
