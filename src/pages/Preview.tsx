import { useEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { db } from '../services/db';
import { Project } from '../types';
import { getSupabaseContent } from '../services/systemFiles';

export function Preview() {
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;
        const p = db.getProject(projectId);
        if (p) setProject(p);
    }, [projectId]);

    useEffect(() => {
        if (!project) return;
        setBundledHtml(project);
    }, [project]);

    async function setBundledHtml(proj: Project) {
        setLoading(true);
        setError(null);
        try {
            const supabaseContent = getSupabaseContent(proj.id);
            const urlParams = new URLSearchParams(window.location.search);
            const route = urlParams.get('route') || '/';

            const res = await fetch('/api/bundle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: proj.files,
                    supabaseContent,
                    route,
                }),
            });

            const html = await res.text();

            if (iframeRef.current) {
                iframeRef.current.srcdoc = html;
            }
        } catch (err: any) {
            setError(err.message || 'Error al compilar el proyecto');
        } finally {
            setLoading(false);
        }
    }

    if (!projectId) return <Navigate to="/dashboard" replace />;

    if (!project) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
                Cargando previsualización...
            </div>
        );
    }

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0f0a18' }}>
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: '#0f0a18', color: '#c4b5fd', fontFamily: 'system-ui, sans-serif', gap: '1rem'
                }}>
                    <div style={{ fontSize: '2rem' }}>⚡</div>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Compilando con esbuild...</p>
                </div>
            )}
            {error && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0f0a18', padding: '2rem'
                }}>
                    <div style={{ background: '#1c0f2e', border: '1px solid #6d28d9aa', borderRadius: 12, padding: '2rem', maxWidth: 600, color: '#f0e6ff', fontFamily: 'monospace' }}>
                        <div style={{ color: '#c4b5fd', marginBottom: '1rem', fontSize: '0.8rem' }}>⚡ Error de compilación</div>
                        <pre style={{ color: '#e879f9', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</pre>
                    </div>
                </div>
            )}
            <iframe
                ref={iframeRef}
                style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                title="Live Application Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
            />
        </div>
    );
}
