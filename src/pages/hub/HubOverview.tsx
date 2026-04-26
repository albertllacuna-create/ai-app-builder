import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/db';
import { Project } from '../../types';
import { Save, Globe, Lock, ShieldCheck, Image as ImageIcon, Info } from 'lucide-react';

export function HubOverview() {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private'>('private');
    const [requireLogin, setRequireLogin] = useState(false);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState(false);

    useEffect(() => {
        if (projectId) {
            const p = db.getProject(projectId);
            if (p) {
                setProject(p);
                setName(p.name || '');
                setDescription(p.description || '');
                setLogoUrl(p.logoUrl || '');
                setVisibility(p.visibility || 'private');
                setRequireLogin(!!p.requireLogin);
            }
        }
    }, [projectId]);

    const handleSave = () => {
        if (!projectId) return;
        setIsSaving(true);

        db.updateProjectMetadata(projectId, {
            name,
            description,
            logoUrl,
            visibility,
            requireLogin
        });

        setTimeout(() => {
            setIsSaving(false);
            setSavedMessage(true);
            setTimeout(() => setSavedMessage(false), 3000);
        }, 600);
    };

    if (!project) return <div className="p-8">Cargando proyecto...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto text-[var(--text-primary)]">
            <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-muted)]">
                        Resumen del Proyecto
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">Configura la información pública y los accesos de tu aplicación bulbia.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20"
                >
                    <Save size={18} />
                    {isSaving ? 'Guardando...' : (savedMessage ? '¡Guardado!' : 'Guardar Cambios')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Columna Izquierda: Detalles Principales */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-6 border border-[var(--surface-border)] rounded-xl bg-[var(--surface)]">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Info size={20} className="text-primary" /> Detalles de la Aplicación
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Nombre de la Aplicación</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Mi CRM Increíble"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Descripción (SEO & Meta)</label>
                                <textarea
                                    className="w-full bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-28 resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Visualiza y gestiona los datos que tu aplicación bulbia está recolectando."
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1.5">Esta descripción se utilizará cuando compartas tu aplicación en redes sociales o en los motores de búsqueda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border border-[var(--surface-border)] rounded-xl bg-[var(--surface)]">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <ImageIcon size={20} className="text-primary" /> Branding
                        </h3>

                        <div className="flex gap-6 items-start">
                            <div className="w-24 h-24 rounded-2xl bg-[var(--surface-hover)] border border-[var(--surface-border)] flex items-center justify-center overflow-hidden shrink-0">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={32} className="text-[var(--text-muted)]" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">URL del Logo</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all mb-2"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://ejemplo.com/logo.png"
                                />
                                <p className="text-xs text-[var(--text-muted)]">Pega la URL directa de la imagen de tu logo. Se recomienda PNG o SVG cuadrado transparente.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Configuración Técnica */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 border border-[var(--surface-border)] rounded-xl bg-[var(--surface)]">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Lock size={18} className="text-primary" /> Control de Acceso
                        </h3>

                        <div className="space-y-6">
                            {/* Visibility Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Visibilidad del Proyecto</label>
                                <div className="flex bg-[var(--surface-hover)] rounded-lg p-1 border border-[var(--surface-border)] text-[var(--text-primary)]">
                                    <button
                                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${visibility === 'public' ? 'bg-primary text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                        onClick={() => setVisibility('public')}
                                    >
                                        <Globe size={16} /> Público
                                    </button>
                                    <button
                                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${visibility === 'private' ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                        onClick={() => setVisibility('private')}
                                    >
                                        <Lock size={16} /> Privado
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    {visibility === 'public'
                                        ? 'Controla quién tiene acceso a los recursos de tu app bulbia.'
                                        : 'Solo tú y los miembros invitados pueden acceder a la aplicación.'}
                                </p>
                            </div>

                            <hr className="border-[var(--surface-border)]" />

                            {/* Require Login Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-green-500" /> Requiere Autenticación
                                    </label>

                                    {/* Toggle UI */}
                                    <button
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${requireLogin ? 'bg-green-500' : 'bg-neutral-600'}`}
                                        onClick={() => setRequireLogin(!requireLogin)}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireLogin ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Activa el sistema de Login/Registro para los usuarios finales. Ideal para aplicaciones SaaS o intranets.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats Card (Antiguo Overview) */}
                    <div className="glass-panel p-6 border border-[var(--surface-border)] rounded-xl bg-[var(--surface-hover)] shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Métricas Rápidas</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)] text-sm">Visitas Hoy</span>
                                <span className="font-semibold text-[var(--text-primary)]">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)] text-sm">Usuarios Activos</span>
                                <span className="font-semibold text-[var(--text-primary)]">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)] text-sm">Uso BBDD</span>
                                <span className="font-semibold text-[var(--text-primary)]">0 MB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
