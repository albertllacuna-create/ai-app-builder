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
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
                        Resumen del Proyecto
                    </h1>
                    <p className="text-neutral-400 mt-1">Configura la información pública y los accesos de tu aplicación.</p>
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
                    <div className="glass-panel p-6 border border-neutral-800/50 rounded-xl">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Info size={20} className="text-primary" /> Detalles de la Aplicación
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre de la Aplicación</label>
                                <input
                                    type="text"
                                    className="w-full bg-neutral-900/50 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Mi CRM Increíble"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Descripción (SEO & Meta)</label>
                                <textarea
                                    className="w-full bg-neutral-900/50 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-28 resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe brevemente qué hace tu aplicación y para qué sirve..."
                                />
                                <p className="text-xs text-neutral-500 mt-1.5">Esta descripción se utilizará cuando compartas tu aplicación en redes sociales o en los motores de búsqueda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border border-neutral-800/50 rounded-xl">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <ImageIcon size={20} className="text-primary" /> Branding
                        </h3>

                        <div className="flex gap-6 items-start">
                            <div className="w-24 h-24 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={32} className="text-neutral-600" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-neutral-300 mb-1.5">URL del Logo</label>
                                <input
                                    type="text"
                                    className="w-full bg-neutral-900/50 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all mb-2"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://ejemplo.com/logo.png"
                                />
                                <p className="text-xs text-neutral-500">Pega la URL directa de la imagen de tu logo. Se recomienda PNG o SVG cuadrado transparente.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Configuración Técnica */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 border border-neutral-800/50 rounded-xl">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Lock size={18} className="text-primary" /> Control de Acceso
                        </h3>

                        <div className="space-y-6">
                            {/* Visibility Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-3">Visibilidad del Proyecto</label>
                                <div className="flex bg-neutral-900/50 rounded-lg p-1 border border-neutral-800">
                                    <button
                                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${visibility === 'public' ? 'bg-primary text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                                        onClick={() => setVisibility('public')}
                                    >
                                        <Globe size={16} /> Público
                                    </button>
                                    <button
                                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${visibility === 'private' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                                        onClick={() => setVisibility('private')}
                                    >
                                        <Lock size={16} /> Privado
                                    </button>
                                </div>
                                <p className="text-xs text-neutral-500 mt-2">
                                    {visibility === 'public'
                                        ? 'Cualquiera con el enlace puede acceder y usar la aplicación.'
                                        : 'Solo tú y los miembros invitados pueden acceder a la aplicación.'}
                                </p>
                            </div>

                            <hr className="border-neutral-800" />

                            {/* Require Login Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
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
                                <p className="text-xs text-neutral-500">
                                    Activa el sistema de Login/Registro para los usuarios finales. Ideal para aplicaciones SaaS o intranets.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats Card (Antiguo Overview) */}
                    <div className="glass-panel p-6 border border-neutral-800/50 rounded-xl bg-gradient-to-br from-neutral-900/80 to-neutral-900/40">
                        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Métricas Rápidas</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-300 text-sm">Visitas Hoy</span>
                                <span className="font-semibold text-white">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-300 text-sm">Usuarios Activos</span>
                                <span className="font-semibold text-white">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-300 text-sm">Uso BBDD</span>
                                <span className="font-semibold text-white">0 MB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
