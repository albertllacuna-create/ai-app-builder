import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Settings, Code, LogOut, X, CreditCard, User as UserIcon, Trash2, Copy } from 'lucide-react';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { Project } from '../types';
import logo from '../assets/logo.png';
import '../index.css';

export function ProjectDashboard() {
    const navigate = useNavigate();
    const [showSettings, setShowSettings] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [projectToClone, setProjectToClone] = useState<Project | null>(null);
    const [user, setUser] = useState<any>(null);
    const [projects, setProjects] = useState<Project[]>([]);

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

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProjectName.trim()) {
            const proj = db.createProject(newProjectName.trim());
            setShowNewProjectModal(false);
            setNewProjectName('');
            navigate(`/project/${proj.id}`);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleDeleteProject = (id: string) => {
        db.deleteProject(id);
        setProjects(db.getProjects());
        setProjectToDelete(null);
    };

    const handleCloneProject = (id: string) => {
        db.cloneProject(id);
        setProjects(db.getProjects());
        setProjectToClone(null);
    };

    if (!user) return null;

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav glass-panel">
                <div className="nav-brand">
                    <img src={logo} alt="Mayson Logo" className="nav-logo-img" />
                    <span className="font-bold text-lg">Mayson</span>
                </div>

                <div className="nav-credits flex items-center gap-4">
                    <button
                        onClick={() => navigate('/pricing')}
                        className="credit-badge text-white text-left hover:bg-neutral-800 transition-colors cursor-pointer border border-transparent hover:border-neutral-700"
                        title="Ampliar Plan"
                    >
                        <span className="dot bg-success"></span>
                        <div className="flex flex-col text-left">
                            <span className="text-xs text-neutral-400 leading-none mb-1">Plan {db.getUser()?.plan || 'Free'}</span>
                            <span className="font-bold leading-none">{db.getUser()?.tokens?.toLocaleString()} Tokens</span>
                        </div>
                    </button>
                    <button className="icon-btn" title="Ajustes y Suscripción" onClick={() => setShowSettings(true)}>
                        <Settings size={20} />
                    </button>
                    <button className="icon-btn text-danger" title="Cerrar Sesión" onClick={handleLogout}>
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <main className="dashboard-content">
                <div className="dashboard-header">
                    <div>
                        <h1>Tus Proyectos</h1>
                        <p className="text-muted">Gestiona y crea nuevas aplicaciones con IA</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowNewProjectModal(true)}>
                        <Plus size={18} /> Nuevo Proyecto
                    </button>
                </div>

                <div className="projects-grid">
                    {projects.map(project => (
                        <div key={project.id} className="project-card glass-panel" onClick={() => navigate(`/project/${project.id}`)}>
                            <div className="project-icon">
                                <Folder size={24} className="text-primary" />
                            </div>
                            <div className="project-info">
                                <h3>{project.name}</h3>
                                <p className="text-muted">{project.type} • Editado: {new Date(project.updatedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="project-action" style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                    className="icon-btn hover-primary"
                                    title="Duplicar Proyecto"
                                    onClick={(e) => { e.stopPropagation(); setProjectToClone(project); }}
                                >
                                    <Copy size={18} />
                                </button>
                                <button
                                    className="icon-btn text-danger"
                                    title="Eliminar Proyecto"
                                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button className="icon-btn hover-primary" title="Abrir Proyecto">
                                    <Code size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="project-card border-dashed" onClick={() => setShowNewProjectModal(true)}>
                        <div className="new-project-content">
                            <Plus size={32} className="text-muted mb-2" />
                            <h3>Crear desde cero</h3>
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
                                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full w-full"></div>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-muted">{db.getUser()?.tokens?.toLocaleString() || 0} tokens disponibles este mes</p>
                                <button className="btn btn-primary mt-4 w-full" onClick={() => navigate('/pricing')}>Ampliar Plan de IA</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Project Modal */}
            {showNewProjectModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel slide-up">
                        <div className="modal-header">
                            <h2>Nuevo Proyecto</h2>
                            <button className="icon-btn" onClick={() => setShowNewProjectModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="modal-body">
                            <div className="form-group">
                                <label>Nombre de la aplicación</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej: Mi Tienda Online"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-8">
                                <button type="button" className="btn btn-outline w-full" onClick={() => setShowNewProjectModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary w-full">
                                    Crear Proyecto
                                </button>
                            </div>
                        </form>
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
                                ¿Estás seguro de que deseas eliminar permanentemente el proyecto <strong>{projectToDelete.name}</strong>? Esta acción no se puede deshacer.
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
                                ¿Deseas crear una copia exacta del proyecto <strong>{projectToClone.name}</strong>?
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
