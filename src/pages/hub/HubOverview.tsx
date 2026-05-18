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
        <div className="p-8 max-w-6xl mx-auto text-[var(--text-primary)] animate-fade-in relative">
            {/* Atmospheric background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] opacity-[0.03] dark:opacity-[0.07] pointer-events-none rounded-full blur-3xl -z-10"></div>
            
            <div className="flex justify-between items-end mb-10 pb-6 border-b border-[var(--surface-border)] relative">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <Info size={16} className="text-primary" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">Configuración</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)]">
                        Resumen del Proyecto
                    </h1>
                    <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">Configura la información pública y los accesos de tu aplicación Bulbia.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    <Save size={18} />
                    {isSaving ? 'Guardando...' : (savedMessage ? '¡Guardado!' : 'Guardar Cambios')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Detalles Principales */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl p-7 border border-[var(--surface-border)] rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:border-primary/30 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--surface-border)] shadow-sm">
                                <Info size={18} className="text-primary" />
                            </div>
                            Detalles de la Aplicación
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-bold text-[var(--text-secondary)] mb-2">Nombre de la Aplicación</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/50 dark:bg-black/20 border border-[var(--surface-border)] rounded-xl px-4 py-3 text-[14px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm focus:bg-white dark:focus:bg-[#1a1a1c]"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Mi CRM Increíble"
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-bold text-[var(--text-secondary)] mb-2">Descripción (SEO & Meta)</label>
                                <textarea
                                    className="w-full bg-white/50 dark:bg-black/20 border border-[var(--surface-border)] rounded-xl px-4 py-3 text-[14px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm focus:bg-white dark:focus:bg-[#1a1a1c] h-32 resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Visualiza y gestiona los datos que tu aplicación bulbia está recolectando."
                                />
                                <p className="text-[11px] font-medium text-[var(--text-muted)] mt-2">Esta descripción se utilizará cuando compartas tu aplicación en redes sociales o en los motores de búsqueda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl p-7 border border-[var(--surface-border)] rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:border-primary/30 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--surface-border)] shadow-sm">
                                <ImageIcon size={18} className="text-primary" />
                            </div>
                            Branding
                        </h3>

                        <div className="flex gap-6 items-start p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--surface-border)]">
                            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[var(--surface-border)] shadow-lg flex items-center justify-center overflow-hidden shrink-0 text-primary transition-transform hover:scale-105 duration-300">
                                {logoUrl ? (
                                    (logoUrl.startsWith('http') || logoUrl.startsWith('data:')) ? (
                                        <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <DynamicIcon name={logoUrl} size={48} className="text-primary" />
                                    )
                                ) : (
                                    <ImageIcon size={32} className="text-[var(--text-muted)]" />
                                )}
                            </div>
                            <div className="flex-1 pt-1">
                                <label className="block text-[13px] font-bold text-[var(--text-secondary)] mb-2">Icono o URL del Logo</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/50 dark:bg-black/20 border border-[var(--surface-border)] rounded-xl px-4 py-2.5 text-[14px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm focus:bg-white dark:focus:bg-[#1a1a1c] mb-2.5"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="ShoppingCart o https://ejemplo.com/logo.png"
                                />
                                <p className="text-[11px] font-medium text-[var(--text-muted)]">Introduce un nombre de icono de Lucide (ej: Sparkles) o la URL directa de una imagen PNG/SVG.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Configuración Técnica */}
                <div className="space-y-8">
                    <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl p-7 border border-[var(--surface-border)] rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:border-primary/30 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--surface-border)] shadow-sm">
                                <Lock size={16} className="text-primary" />
                            </div>
                            Control de Acceso
                        </h3>

                        <div className="space-y-7">
                            {/* Visibility Toggle */}
                            <div>
                                <label className="block text-[13px] font-bold text-[var(--text-secondary)] mb-3">Visibilidad del Proyecto</label>
                                <div className="flex bg-[var(--surface-hover)] rounded-xl p-1 border border-[var(--surface-border)] text-[var(--text-primary)] shadow-inner">
                                    <button
                                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${visibility === 'public' ? 'bg-primary text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'}`}
                                        onClick={() => setVisibility('public')}
                                    >
                                        <Globe size={16} /> Público
                                    </button>
                                    <button
                                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${visibility === 'private' ? 'bg-white dark:bg-[#1a1a1c] text-[var(--text-primary)] shadow-md border border-[var(--surface-border)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'}`}
                                        onClick={() => setVisibility('private')}
                                    >
                                        <Lock size={16} /> Privado
                                    </button>
                                </div>
                                <p className="text-[11px] font-medium text-[var(--text-muted)] mt-2.5 px-1">
                                    {visibility === 'public'
                                        ? 'Cualquiera con el enlace podrá ver y acceder a tu aplicación.'
                                        : 'Solo tú y los miembros invitados podrán acceder a la aplicación.'}
                                </p>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-[var(--surface-border)] to-transparent opacity-50"></div>

                            {/* Require Login Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="text-[13px] font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                        <ShieldCheck size={18} className={requireLogin ? "text-green-500" : "text-[var(--text-muted)] transition-colors"} /> 
                                        Requiere Autenticación
                                    </label>

                                    {/* Toggle UI */}
                                    <button
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shadow-inner ${requireLogin ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                                        onClick={() => setRequireLogin(!requireLogin)}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${requireLogin ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[11px] font-medium text-[var(--text-muted)] px-1">
                                    Activa el sistema de Login/Registro para los usuarios finales. Ideal para aplicaciones SaaS o intranets.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl p-6 border border-[var(--surface-border)] rounded-[1.5rem] shadow-sm flex items-start gap-3">
                        <Info size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-[13px] font-bold text-[var(--text-primary)] mb-1">Métricas Rápidas</h4>
                            <p className="text-[11px] font-medium text-[var(--text-muted)] mb-3">Resumen de actividad de la aplicación.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--surface-border)] text-center">
                                    <div className="text-xl font-black text-primary mb-0.5">0</div>
                                    <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Visitas Hoy</div>
                                </div>
                                <div className="p-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--surface-border)] text-center">
                                    <div className="text-xl font-black text-primary mb-0.5">0</div>
                                    <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Usuarios Reg.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
