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
            setDeployError(error.message || 'Error de conexión con Bulbia Hosting');
        } finally {
            setIsDeploying(false);
        }
    };

    const handleSaveDomain = () => {
        if (!project) return;
        setIsSavingDomain(true);

        let formattedDomain = customDomain.trim().toLowerCase();
        formattedDomain = formattedDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        formattedDomain = formattedDomain.replace(/\.bulbia\.app$/, ''); // Clean up if user typed it

        db.updateProjectMetadata(project.id, { customDomain: formattedDomain });
        setProject({ ...project, customDomain: formattedDomain });
        setCustomDomain(formattedDomain);

        // Si ya estaba publicado en Vercel, deberíamos actualizarlo via API
        if (project.publishedUrl) {
            fetch('/api/deploy/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Necesitamos sacar el vercelProjectId de algún lado si lo tenemos, o hacer un redeploy
                    // Como no lo hemos guardado hasta ahora, si no está, forzamos redeploy:
                    subdomain: formattedDomain
                })
            }).catch(console.error);
        }

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
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                Dominios y Publicación
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] mb-8">
                Despliega tu aplicación en los servidores de Bulbia y configúrala con tu propio dominio corporativo.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Estado de Producción */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0c0c0c] p-6 border border-gray-200 dark:border-white/5 rounded-xl relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                        {/* Status Bubble */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            {isPublished ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-white/5 text-[var(--text-muted)] border border-gray-200 dark:border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" /> Borrador
                                </span>
                            )}
                        </div>

                        <h3 className="text-[15px] font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                            <Server size={16} className="text-primary" /> Bulbia Hosting
                        </h3>

                        {deployError && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-200">{deployError}</p>
                            </div>
                        )}

                        <div className="bg-[#fcfcfc] dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5 p-5 mb-6">
                            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                                Subdominio Bulbia
                            </label>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex-1 flex items-center bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                    <div className="pl-3 text-[var(--text-muted)]">
                                        <Globe size={14} />
                                    </div>
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent px-2 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                                        placeholder="mi-proyecto"
                                    />
                                    <div className="pr-3 py-2 bg-gray-50 dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-white/10 text-[13px] text-[var(--text-muted)] font-mono select-none">
                                        .bulbia.app
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveDomain}
                                    disabled={isSavingDomain || customDomain === project.customDomain}
                                    className="px-4 py-2 bg-[var(--text-primary)] text-[var(--background)] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Guardar
                                </button>
                            </div>
                            
                            {isPublished && project.customDomain && (
                                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md flex items-center justify-between">
                                    <div className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                                        https://{project.customDomain}.bulbia.app
                                    </div>
                                    <a 
                                        href={`https://${project.customDomain}.bulbia.app`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[12px] font-medium px-3 py-1.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                                    >
                                        Abrir Web
                                    </a>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying || !customDomain}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[14px] font-medium transition-all ${isDeploying || !customDomain ? 'bg-gray-100 dark:bg-white/5 text-[var(--text-muted)] cursor-not-allowed border border-transparent' : 'bg-primary hover:bg-primary-hover text-white shadow-sm'}`}
                        >
                            {isDeploying ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Desplegando...
                                </>
                            ) : (
                                <><ArrowRight size={16} /> {isPublished ? 'Redesplegar Cambios' : 'Publicar App'}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. Dominios Personalizados */}
                <div className="space-y-6">
                    <div className={`bg-white dark:bg-[#0c0c0c] p-6 rounded-xl transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${isPublished ? 'border border-gray-200 dark:border-white/5' : 'border border-gray-200 dark:border-white/5 opacity-60 grayscale'}`}>
                        <h3 className="text-[15px] font-semibold mb-1 flex items-center gap-2 text-[var(--text-primary)]">
                            <Link2 size={16} className="text-primary" /> Dominio Personalizado
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] mb-6">
                            Requiere que el proyecto esté publicado primero.
                        </p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Tu Dominio</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        disabled={!isPublished}
                                        className="flex-1 bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all placeholder:text-[var(--text-muted)]"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value)}
                                        placeholder="ej: miempresa.com"
                                    />
                                    <button
                                        disabled={!isPublished || isSavingDomain}
                                        onClick={handleSaveDomain}
                                        className="px-4 py-2 bg-[var(--text-primary)] text-[var(--background)] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            </div>

                            {/* Instrucciones de Configuración DNS */}
                            {project.customDomain && (
                                <div className="mt-6 border-t border-gray-100 dark:border-white/5 pt-6 animate-fade-in">
                                    <h4 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-primary" /> Configuración DNS Requerida
                                    </h4>
                                    <p className="text-[11px] text-[var(--text-muted)] mb-4 leading-relaxed">
                                        Añade este registro a tu proveedor de dominios (GoDaddy, Namecheap, etc.) para conectar tu dominio. Puede tardar hasta 24h en propagarse.
                                    </p>

                                    <div className="bg-[#fcfcfc] dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-md overflow-hidden font-mono">
                                        <div className="grid grid-cols-3 bg-gray-50 dark:bg-[#141414] border-b border-gray-200 dark:border-white/10 p-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                            <div className="px-2">Tipo</div>
                                            <div className="px-2">Nombre</div>
                                            <div className="px-2">Valor</div>
                                        </div>
                                        <div className="grid grid-cols-3 p-3 text-[12px] text-[var(--text-secondary)] items-center">
                                            <div className="px-2">CNAME</div>
                                            <div className="px-2">www</div>
                                            <div className="px-2 flex items-center justify-between group">
                                                <span className="truncate pr-2">cname.bulbia.app</span>
                                                <button
                                                    onClick={() => copyToClipboard('cname.bulbia.app')}
                                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-white/5 rounded border border-gray-200 dark:border-white/10 shadow-sm"
                                                    title="Copiar valor"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {copied && <p className="text-xs text-emerald-500 mt-2">¡Copiado al portapapeles!</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
