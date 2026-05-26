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
        <div className="p-8 max-w-4xl mx-auto relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500">
                        Resumen del Proyecto
                    </h1>
                    <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">Configura la información pública y los accesos de tu aplicación Bulbia.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl text-[14px] font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:-translate-y-0.5 active:scale-95 shrink-0"
                >
                    <Save size={18} />
                    {isSaving ? 'Guardando...' : (savedMessage ? '¡Guardado!' : 'Guardar Cambios')}
                </button>
            </div>

            {/* Single column stack of cards */}
            <div className="space-y-8">
                
                {/* CARD 1: Detalles de la Aplicación */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 p-10 relative overflow-hidden group transition-all">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                    
                    <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                        <Info size={18} className="text-primary" /> Detalles de la Aplicación
                    </h3>

                    <div className="divide-y divide-[var(--surface-border)] border-t border-b border-[var(--surface-border)]">
                        {/* Campo Nombre */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nombre de la Aplicación</label>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">El título visible de tu proyecto</p>
                            </div>
                            <div className="min-w-[280px] sm:max-w-md w-full flex items-center bg-[var(--surface-hover)] rounded-xl px-4 border border-transparent focus-within:border-primary/30 focus-within:bg-[var(--background)] transition-all">
                                <input
                                    type="text"
                                    className="w-full py-2.5 bg-transparent outline-none border-none text-sm text-[var(--text-primary)] font-medium text-left sm:text-right placeholder:text-[var(--text-muted)]"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Mi CRM Increíble"
                                />
                            </div>
                        </div>

                        {/* Campo Descripción */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between py-6 gap-4">
                            <div className="max-w-sm">
                                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descripción (SEO & Meta)</label>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">Utilizada para motores de búsqueda y redes sociales</p>
                            </div>
                            <div className="min-w-[280px] sm:max-w-md w-full flex flex-col bg-[var(--surface-hover)] rounded-xl p-3 border border-transparent focus-within:border-primary/30 focus-within:bg-[var(--background)] transition-all">
                                <textarea
                                    className="w-full h-24 bg-transparent outline-none border-none text-sm text-[var(--text-primary)] font-medium text-left sm:text-right placeholder:text-[var(--text-muted)] resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe tu aplicación..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: Branding */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 p-10 relative overflow-hidden group transition-all">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                    
                    <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                        <ImageIcon size={18} className="text-primary" /> Branding
                    </h3>

                    <div className="divide-y divide-[var(--surface-border)] border-t border-b border-[var(--surface-border)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 text-primary shadow-inner">
                                    {logoUrl ? (
                                        (logoUrl.startsWith('http') || logoUrl.startsWith('data:')) ? (
                                            <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <DynamicIcon name={logoUrl} size={28} className="text-primary drop-shadow-md" />
                                        )
                                    ) : (
                                        <ImageIcon size={24} className="text-primary/50" />
                                    )}
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Icono o URL del Logo</label>
                                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Nombre de icono Lucide (ej: Sparkles) o URL directa</p>
                                </div>
                            </div>
                            <div className="min-w-[280px] sm:max-w-md w-full flex items-center bg-[var(--surface-hover)] rounded-xl px-4 border border-transparent focus-within:border-primary/30 focus-within:bg-[var(--background)] transition-all">
                                <input
                                    type="text"
                                    className="w-full py-2.5 bg-transparent outline-none border-none text-sm text-[var(--text-primary)] font-medium text-left sm:text-right placeholder:text-[var(--text-muted)]"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="ShoppingCart o https://..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 3: Control de Acceso */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 p-10 relative overflow-hidden group transition-all">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                    
                    <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                        <Lock size={18} className="text-primary" /> Control de Acceso
                    </h3>

                    <div className="divide-y divide-[var(--surface-border)] border-t border-b border-[var(--surface-border)]">
                        {/* Visibilidad del Proyecto */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Visibilidad del Proyecto</label>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">Define quién puede ver la aplicación pública</p>
                            </div>
                            <div className="min-w-[280px] sm:max-w-xs flex bg-black/5 dark:bg-white/5 rounded-xl p-1 border border-white/20 dark:border-white/10 relative shadow-inner">
                                <button
                                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg text-center z-10 transition-colors ${visibility === 'public' ? 'text-primary font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                    onClick={() => setVisibility('public')}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Globe size={14} /> Público
                                    </div>
                                </button>
                                <button
                                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg text-center z-10 transition-colors ${visibility === 'private' ? 'text-primary font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                    onClick={() => setVisibility('private')}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Lock size={14} /> Privado
                                    </div>
                                </button>
                                {/* Animated background pill */}
                                <div 
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-lg border border-white/50 dark:border-white/10 transition-transform duration-300 ease-out z-0" 
                                    style={{ transform: visibility === 'public' ? 'translateX(0)' : 'translateX(calc(100% + 4px))' }}
                                />
                            </div>
                        </div>

                        {/* Requiere Autenticación */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Requiere Autenticación</label>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">Activa Login/Registro para tus usuarios finales</p>
                            </div>
                            <button
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0 ${requireLogin ? 'bg-primary shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'bg-black/10 dark:bg-white/10 shadow-inner'}`}
                                onClick={() => setRequireLogin(!requireLogin)}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireLogin ? 'translate-x-6' : 'translate-x-1'} shadow-sm`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CARD 4: Métricas Rápidas */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 p-10 relative overflow-hidden group transition-all">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                    
                    <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                        <LucideIcons.BarChart2 size={18} className="text-primary" /> Métricas Rápidas
                    </h3>

                    <div className="divide-y divide-[var(--surface-border)] border-t border-b border-[var(--surface-border)]">
                        <div className="flex justify-between py-5 text-sm font-medium">
                            <span className="text-[var(--text-muted)]">Visitas Hoy</span>
                            <span className="text-[var(--text-primary)] font-bold">0</span>
                        </div>
                        <div className="flex justify-between py-5 text-sm font-medium">
                            <span className="text-[var(--text-muted)]">Usuarios Activos</span>
                            <span className="text-[var(--text-primary)] font-bold">0</span>
                        </div>
                        <div className="flex justify-between py-5 text-sm font-medium">
                            <span className="text-[var(--text-muted)]">Uso BBDD</span>
                            <span className="text-primary font-bold drop-shadow-sm">0 MB</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
