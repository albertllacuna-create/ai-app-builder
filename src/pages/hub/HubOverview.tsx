import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/db';
import { Project } from '../../types';
import { Save, Globe, Lock, ShieldCheck, Image as ImageIcon, Info } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const DynamicIcon = ({ name, size = 16, className = "" }: { name: string | undefined, size?: number, className?: string }) => {
    if (!name) return <LucideIcons.Sparkles size={size} className={className} />;
    const IconComponent = (LucideIcons as any)[name] || LucideIcons.Sparkles;
    return <IconComponent size={size} className={className} />;
};

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
        <div className="p-8 max-w-5xl mx-auto relative z-10">
            <div className="flex justify-between items-start mb-10">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500">
                        Resumen del Proyecto
                    </h1>
                    <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">Configura la información pública y los accesos de tu aplicación Bulbia.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:-translate-y-0.5"
                >
                    <Save size={18} />
                    {isSaving ? 'Guardando...' : (savedMessage ? '¡Guardado!' : 'Guardar Cambios')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Columna Izquierda: Detalles Principales */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="premium-glass p-7 rounded-2xl transition-all hover:border-primary/30 group">
                        <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                            <Info size={18} className="text-primary" /> Detalles de la Aplicación
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">Nombre de la Aplicación</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all backdrop-blur-md shadow-inner placeholder:text-[var(--text-muted)]"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Mi CRM Increíble"
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">Descripción (SEO & Meta)</label>
                                <textarea
                                    className="w-full bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all backdrop-blur-md shadow-inner h-28 resize-none placeholder:text-[var(--text-muted)]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Visualiza y gestiona los datos que tu aplicación bulbia está recolectando."
                                />
                                <p className="text-[12px] text-[var(--text-muted)] mt-2 font-medium">Esta descripción se utilizará cuando compartas tu aplicación en redes sociales o en los motores de búsqueda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="premium-glass p-7 rounded-2xl transition-all hover:border-primary/30 group">
                        <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                            <ImageIcon size={18} className="text-primary" /> Branding
                        </h3>

                        <div className="flex gap-6 items-start">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 text-primary shadow-inner">
                                {logoUrl ? (
                                    (logoUrl.startsWith('http') || logoUrl.startsWith('data:')) ? (
                                        <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <DynamicIcon name={logoUrl} size={36} className="text-primary drop-shadow-md" />
                                    )
                                ) : (
                                    <ImageIcon size={28} className="text-primary/50" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">Icono o URL del Logo</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all mb-2 backdrop-blur-md shadow-inner placeholder:text-[var(--text-muted)]"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="ShoppingCart o https://ejemplo.com/logo.png"
                                />
                                <p className="text-[12px] text-[var(--text-muted)] font-medium">Introduce un nombre de icono de Lucide (ej: Sparkles) o la URL directa de una imagen PNG/SVG.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Configuración Técnica */}
                <div className="space-y-8">
                    <div className="premium-glass p-7 rounded-2xl transition-all hover:border-primary/30 group">
                        <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                            <Lock size={18} className="text-primary" /> Control de Acceso
                        </h3>

                        <div className="space-y-8">
                            {/* Visibility Toggle */}
                            <div>
                                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-3">Visibilidad del Proyecto</label>
                                <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1.5 border border-white/20 dark:border-white/10 relative shadow-inner">
                                    <button
                                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg text-center z-10 transition-colors ${visibility === 'public' ? 'text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                        onClick={() => setVisibility('public')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Globe size={16} /> Público
                                        </div>
                                    </button>
                                    <button
                                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg text-center z-10 transition-colors ${visibility === 'private' ? 'text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                        onClick={() => setVisibility('private')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Lock size={16} /> Privado
                                        </div>
                                    </button>
                                    {/* Animated background pill */}
                                    <div 
                                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-lg border border-white/50 dark:border-white/10 transition-transform duration-300 ease-out z-0" 
                                        style={{ transform: visibility === 'public' ? 'translateX(0)' : 'translateX(calc(100% + 12px))' }}
                                    />
                                </div>
                                <p className="text-[12px] text-[var(--text-muted)] mt-3 font-medium">
                                    {visibility === 'public'
                                        ? 'Cualquiera con el enlace puede acceder.'
                                        : 'Solo miembros invitados pueden acceder.'}
                                </p>
                            </div>

                            <hr className="border-white/20 dark:border-white/10" />

                            {/* Require Login Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[13px] font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                                        <ShieldCheck size={18} className="text-primary" /> Requiere Autenticación
                                    </label>

                                    {/* Neon Toggle UI */}
                                    <button
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${requireLogin ? 'bg-primary shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'bg-black/10 dark:bg-white/10 shadow-inner'}`}
                                        onClick={() => setRequireLogin(!requireLogin)}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireLogin ? 'translate-x-6' : 'translate-x-1'} shadow-sm`} />
                                    </button>
                                </div>
                                <p className="text-[12px] text-[var(--text-muted)] font-medium">
                                    Activa el sistema de Login/Registro para los usuarios finales.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats Card */}
                    <div className="premium-glass p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/20 blur-[50px] group-hover:bg-fuchsia-500/20 transition-colors duration-500 rounded-full" />
                        
                        <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-5">Métricas Rápidas</h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-[13px] font-medium">
                                <span className="text-[var(--text-muted)]">Visitas Hoy</span>
                                <span className="text-[var(--text-primary)] font-bold">0</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px] font-medium">
                                <span className="text-[var(--text-muted)]">Usuarios Activos</span>
                                <span className="text-[var(--text-primary)] font-bold">0</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px] font-medium">
                                <span className="text-[var(--text-muted)]">Uso BBDD</span>
                                <span className="text-primary font-bold drop-shadow-sm">0 MB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
