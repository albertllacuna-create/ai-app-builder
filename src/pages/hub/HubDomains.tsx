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
        <div className="p-8 max-w-5xl mx-auto relative z-10">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500 mb-2">
                Dominios y Publicación
            </h1>
            <p className="text-[14px] text-[var(--text-muted)] mb-10 font-medium">
                Despliega tu aplicación en los servidores de Bulbia y configúrala con tu propio dominio corporativo.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Estado de Producción */}
                <div className="space-y-8">
                    <div className="premium-glass p-7 rounded-2xl relative overflow-hidden group transition-all hover:border-primary/30">
                        {/* Background subtle glow */}
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/10 blur-[60px] group-hover:bg-primary/20 transition-colors duration-500 rounded-full z-0" />

                        {/* Status Bubble */}
                        <div className="absolute top-7 right-7 flex items-center gap-2 z-10">
                            {isPublished ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Live
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border border-white/10 shadow-inner">
                                    <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" /> Borrador
                                </span>
                            )}
                        </div>

                        <h3 className="text-[16px] font-bold mb-8 flex items-center gap-2 text-[var(--text-primary)] relative z-10 group-hover:text-primary transition-colors">
                            <Server size={18} className="text-primary" /> Bulbia Hosting
                        </h3>

                        {deployError && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 relative z-10 backdrop-blur-sm">
                                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[13px] font-medium text-red-600 dark:text-red-200">{deployError}</p>
                            </div>
                        )}

                        <div className="bg-white/30 dark:bg-black/20 rounded-xl border border-white/20 dark:border-white/10 p-5 mb-8 relative z-10 backdrop-blur-md shadow-inner">
                            <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em] mb-3">
                                Subdominio Bulbia
                            </label>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex-1 flex items-center bg-white/50 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all shadow-inner">
                                    <div className="pl-3 text-[var(--text-muted)]">
                                        <Globe size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent px-3 py-2.5 text-[14px] text-[var(--text-primary)] font-medium focus:outline-none placeholder:text-[var(--text-muted)]"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                                        placeholder="mi-proyecto"
                                    />
                                    <div className="pr-4 py-2.5 bg-black/5 dark:bg-white/5 border-l border-white/20 dark:border-white/10 text-[13px] text-[var(--text-muted)] font-mono font-medium select-none">
                                        .bulbia.app
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveDomain}
                                    disabled={isSavingDomain || customDomain === project.customDomain}
                                    className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[13px] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
                                >
                                    Guardar
                                </button>
                            </div>
                            
                            {isPublished && project.customDomain && (
                                <div className="mt-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between backdrop-blur-sm">
                                    <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 drop-shadow-sm">
                                        https://{project.customDomain}.bulbia.app
                                    </div>
                                    <a 
                                        href={`https://${project.customDomain}.bulbia.app`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[12px] font-bold px-3.5 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                    >
                                        Abrir Web
                                    </a>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying || !customDomain}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-all relative z-10 ${isDeploying || !customDomain ? 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)] cursor-not-allowed border border-white/10' : 'bg-primary hover:bg-primary-hover text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:-translate-y-0.5'}`}
                        >
                            {isDeploying ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> Desplegando...
                                </>
                            ) : (
                                <><ArrowRight size={18} /> {isPublished ? 'Redesplegar Cambios' : 'Publicar App'}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. Dominios Personalizados */}
                <div className="space-y-8">
                    <div className={`premium-glass p-7 rounded-2xl transition-all duration-300 group hover:border-primary/30 ${!isPublished && 'opacity-60 grayscale'}`}>
                        <h3 className="text-[16px] font-bold mb-2 flex items-center gap-2 text-[var(--text-primary)] group-hover:text-primary transition-colors">
                            <Link2 size={18} className="text-primary" /> Dominio Personalizado
                        </h3>
                        <p className="text-[12px] text-[var(--text-muted)] font-medium mb-6">
                            Requiere que el proyecto esté publicado primero.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">Tu Dominio</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        disabled={!isPublished}
                                        className="flex-1 bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 transition-all backdrop-blur-md shadow-inner placeholder:text-[var(--text-muted)]"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value)}
                                        placeholder="ej: miempresa.com"
                                    />
                                    <button
                                        disabled={!isPublished || isSavingDomain}
                                        onClick={handleSaveDomain}
                                        className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[13px] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            </div>

                            {/* Instrucciones de Configuración DNS */}
                            {project.customDomain && (
                                <div className="mt-8 pt-6 border-t border-white/20 dark:border-white/10 animate-in fade-in">
                                    <h4 className="text-[14px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-primary drop-shadow-sm" /> Configuración DNS Requerida
                                    </h4>
                                    <p className="text-[12px] text-[var(--text-muted)] mb-5 font-medium leading-relaxed">
                                        Añade este registro a tu proveedor de dominios (GoDaddy, Namecheap, etc.) para conectar tu dominio. Puede tardar hasta 24h en propagarse.
                                    </p>

                                    <div className="bg-white/40 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-xl overflow-hidden font-mono shadow-inner backdrop-blur-md">
                                        <div className="grid grid-cols-3 bg-black/5 dark:bg-white/5 border-b border-white/20 dark:border-white/10 p-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">
                                            <div className="px-2">Tipo</div>
                                            <div className="px-2">Nombre</div>
                                            <div className="px-2">Valor</div>
                                        </div>
                                        <div className="grid grid-cols-3 p-4 text-[13px] font-medium text-[var(--text-secondary)] items-center">
                                            <div className="px-2">CNAME</div>
                                            <div className="px-2">www</div>
                                            <div className="px-2 flex items-center justify-between group/row">
                                                <span className="truncate pr-2">cname.bulbia.app</span>
                                                <button
                                                    onClick={() => copyToClipboard('cname.bulbia.app')}
                                                    className="text-[var(--text-muted)] hover:text-primary transition-colors opacity-0 group-hover/row:opacity-100 p-1.5 bg-white dark:bg-black rounded-md border border-white/40 dark:border-white/10 shadow-sm"
                                                    title="Copiar valor"
                                                >
                                                    <Copy size={14} />
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
