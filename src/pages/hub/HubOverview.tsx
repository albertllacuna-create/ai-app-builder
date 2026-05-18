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
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                        Resumen del Proyecto
                    </h1>
                    <p className="text-[13px] text-[var(--text-muted)] mt-1">Configura la información pública y los accesos de tu aplicación Bulbia.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-[13px] font-medium transition-all shadow-sm"
                >
                    <Save size={16} />
                    {isSaving ? 'Guardando...' : (savedMessage ? '¡Guardado!' : 'Guardar Cambios')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Columna Izquierda: Detalles Principales */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#0c0c0c] p-6 border border-gray-200 dark:border-white/5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                        <h3 className="text-[15px] font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                            <Info size={16} className="text-primary" /> Detalles de la Aplicación
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre de la Aplicación</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)]"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Mi CRM Increíble"
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Descripción (SEO & Meta)</label>
                                <textarea
                                    className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-24 resize-none placeholder:text-[var(--text-muted)]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Visualiza y gestiona los datos que tu aplicación bulbia está recolectando."
                                />
                                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">Esta descripción se utilizará cuando compartas tu aplicación en redes sociales o en los motores de búsqueda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0c0c0c] p-6 border border-gray-200 dark:border-white/5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                        <h3 className="text-[15px] font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                            <ImageIcon size={16} className="text-primary" /> Branding
                        </h3>

                        <div className="flex gap-5 items-start">
                            <div className="w-16 h-16 rounded-xl bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 text-primary">
                                {logoUrl ? (
                                    (logoUrl.startsWith('http') || logoUrl.startsWith('data:')) ? (
                                        <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <DynamicIcon name={logoUrl} size={32} className="text-primary" />
                                    )
                                ) : (
                                    <ImageIcon size={24} className="text-[var(--text-muted)]" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Icono o URL del Logo</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-2 placeholder:text-[var(--text-muted)]"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="ShoppingCart o https://ejemplo.com/logo.png"
                                />
                                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">Introduce un nombre de icono de Lucide (ej: Sparkles) o la URL directa de una imagen PNG/SVG.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Configuración Técnica */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0c0c0c] p-6 border border-gray-200 dark:border-white/5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                        <h3 className="text-[15px] font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                            <Lock size={16} className="text-primary" /> Control de Acceso
                        </h3>

                        <div className="space-y-6">
                            {/* Visibility Toggle */}
                            <div>
                                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Visibilidad del Proyecto</label>
                                <div className="flex bg-[#fcfcfc] dark:bg-[#111111] rounded-md p-1 border border-gray-200 dark:border-white/10 relative">
                                    <button
                                        className={`flex-1 py-1.5 text-[12px] font-medium rounded text-center z-10 transition-colors ${visibility === 'public' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                        onClick={() => setVisibility('public')}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Globe size={14} /> Público
                                        </div>
                                    </button>
                                    <button
                                        className={`flex-1 py-1.5 text-[12px] font-medium rounded text-center z-10 transition-colors ${visibility === 'private' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                        onClick={() => setVisibility('private')}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Lock size={14} /> Privado
                                        </div>
                                    </button>
                                    {/* Animated background pill */}
                                    <div 
                                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#1a1a1a] shadow-sm rounded border border-gray-200/50 dark:border-white/5 transition-transform duration-300 ease-out z-0" 
                                        style={{ transform: visibility === 'public' ? 'translateX(0)' : 'translateX(calc(100% + 4px))' }}
                                    />
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)] mt-2 leading-relaxed">
                                    {visibility === 'public'
                                        ? 'Cualquiera con el enlace puede acceder.'
                                        : 'Solo miembros invitados pueden acceder.'}
                                </p>
                            </div>

                            <hr className="border-gray-100 dark:border-white/5" />

                            {/* Require Login Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-primary" /> Requiere Autenticación
                                    </label>

                                    {/* Minimal Toggle UI */}
                                    <button
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${requireLogin ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'}`}
                                        onClick={() => setRequireLogin(!requireLogin)}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${requireLogin ? 'translate-x-4' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                    Activa el sistema de Login/Registro para los usuarios finales.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats Card */}
                    <div className="bg-transparent p-4 border border-gray-200 dark:border-white/5 rounded-xl">
                        <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-4">Métricas Rápidas</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[var(--text-secondary)]">Visitas Hoy</span>
                                <span className="font-medium text-[var(--text-primary)]">0</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[var(--text-secondary)]">Usuarios Activos</span>
                                <span className="font-medium text-[var(--text-primary)]">0</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[var(--text-secondary)]">Uso BBDD</span>
                                <span className="font-medium text-[var(--text-primary)]">0 MB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
