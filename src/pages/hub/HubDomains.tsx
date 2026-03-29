import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/db';
import { deployService } from '../../services/deploy';
import { Project } from '../../types';
import { Globe, Server, CheckCircle2, ArrowRight, Loader2, Link2, Copy, AlertCircle } from 'lucide-react';

export function HubDomains() {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployError, setDeployError] = useState('');

    // Domain State
    const [customDomain, setCustomDomain] = useState('');
    const [isSavingDomain, setIsSavingDomain] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (projectId) {
            const p = db.getProject(projectId);
            if (p) {
                setProject(p);
                setCustomDomain(p.customDomain || '');
            }
        }
    }, [projectId]);

    const handleDeploy = async () => {
        if (!project) return;
        setIsDeploying(true);
        setDeployError('');

        try {
            const result = await deployService.deployProject(project);
            if (result.success && result.url) {
                db.updateProjectMetadata(project.id, { publishedUrl: result.url });
                setProject({ ...project, publishedUrl: result.url });
            } else {
                setDeployError(result.error || 'Error desconocido al publicar');
            }
        } catch (error: any) {
            setDeployError(error.message || 'Error de conexión con Mayson Hosting');
        } finally {
            setIsDeploying(false);
        }
    };

    const handleSaveDomain = () => {
        if (!project) return;
        setIsSavingDomain(true);

        let formattedDomain = customDomain.trim().toLowerCase();
        // Basic clean up: remove http:// or trailing slashes
        formattedDomain = formattedDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        db.updateProjectMetadata(project.id, { customDomain: formattedDomain });
        setProject({ ...project, customDomain: formattedDomain });
        setCustomDomain(formattedDomain);

        setTimeout(() => setIsSavingDomain(false), 500);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!project) return <div className="p-8">Cargando proyecto...</div>;

    const isPublished = !!project.publishedUrl;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400 mb-2">
                Dominios y Publicación
            </h1>
            <p className="text-neutral-400 mb-8">
                Despliega tu aplicación en los servidores de Mayson y configúrala con tu propio dominio corporativo.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Estado de Producción */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 border border-neutral-800/50 rounded-xl relative overflow-hidden">
                        {/* Status Bubble */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            {isPublished ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" /> Borrador
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Server size={20} className="text-primary" /> Mayson Hosting
                        </h3>

                        {deployError && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-200">{deployError}</p>
                            </div>
                        )}

                        <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-5 mb-6">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                Subdominio Mayson
                            </label>
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-neutral-400" />
                                <span className={`font-mono text-sm ${isPublished ? 'text-white' : 'text-neutral-500'}`}>
                                    {isPublished ? project.publishedUrl : 'No publicado (haz clic en Desplegar)'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all shadow-lg ${isDeploying ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'}`}
                        >
                            {isDeploying ? (
                                <><Loader2 size={18} className="animate-spin" /> Desplegando en Mayson...</>
                            ) : (
                                <><ArrowRight size={18} /> {isPublished ? 'Redesplegar Cambios' : 'Desplegar a Producción'}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. Dominios Personalizados */}
                <div className="space-y-6">
                    <div className={`glass-panel p-6 border rounded-xl transition-all duration-300 ${isPublished ? 'border-neutral-800/50' : 'border-neutral-800/20 opacity-50 grayscale'}`}>
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <Link2 size={20} className="text-primary" /> Dominio Personalizado
                        </h3>
                        <p className="text-xs text-neutral-400 mb-6">
                            Requiere que el proyecto esté publicado primero.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Tu Dominio</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        disabled={!isPublished}
                                        className="flex-1 bg-neutral-900/50 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value)}
                                        placeholder="ej: miempresa.com"
                                    />
                                    <button
                                        disabled={!isPublished || isSavingDomain}
                                        onClick={handleSaveDomain}
                                        className="px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            </div>

                            {/* Instrucciones de Configuración DNS (Estilo Vercel) */}
                            {project.customDomain && (
                                <div className="mt-6 border-t border-neutral-800 pt-6 animate-fade-in">
                                    <h4 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-primary" /> Configuración DNS Requerida
                                    </h4>
                                    <p className="text-xs text-neutral-400 mb-4">
                                        Añade este registro a tu proveedor de dominios (GoDaddy, Namecheap, etc.) para conectar tu dominio. Puede tardar hasta 24h en propagarse.
                                    </p>

                                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
                                        <div className="grid grid-cols-3 bg-neutral-900 border-b border-neutral-800 p-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                            <div className="px-2">Tipo</div>
                                            <div className="px-2">Nombre</div>
                                            <div className="px-2">Valor</div>
                                        </div>
                                        <div className="grid grid-cols-3 p-3 text-sm font-mono text-neutral-300 items-center">
                                            <div className="px-2">CNAME</div>
                                            <div className="px-2">www</div>
                                            <div className="px-2 flex items-center justify-between group">
                                                <span className="truncate pr-2">cname.mayson.app</span>
                                                <button
                                                    onClick={() => copyToClipboard('cname.mayson.app')}
                                                    className="text-neutral-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Copiar valor"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {copied && <p className="text-xs text-emerald-400 mt-2">¡Copiado al portapapeles!</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
