import { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '../types';
import { getSupabaseContent } from '../services/systemFiles';

export function useRemoteBundler(
    project: Project | null,
    isAiTyping: boolean,
    currentRoute: string,
    viewMode: 'panel' | 'preview',
    triggerAutoFix: (errorMessage: string) => void,
    onAutoHealCleared: () => void
) {
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [bundleLoading, setBundleLoading] = useState(false);
    const [consoleWarnings, setConsoleWarnings] = useState<string[]>([]);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const loadTimeoutRef = useRef<any>(null);

    const buildBundle = useCallback(async (proj: Project, route?: string) => {
        if (!proj || Object.keys(proj.files).length <= 3) return;
        setBundleLoading(true);
        try {
            const supabaseContent = getSupabaseContent(proj.id);
            const res = await fetch('/api/bundle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: proj.files,
                    supabaseContent,
                    route: route || currentRoute,
                }),
            });
            const html = await res.text();
            setPreviewHtml(html);

            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = setTimeout(() => {
                if (!isAiTyping) {
                    triggerAutoFix("LA APLICACIÓN PARECE ESTAR BLOQUEADA. Ha pasado demasiado tiempo intentando cargar sin éxito (15s). Corrige posibles bucles infinitos o errores silenciosos de inicialización.");
                }
            }, 15000);

        } catch (err: any) {
            console.error('Bundle error:', err);
        } finally {
            setBundleLoading(false);
        }
    }, [currentRoute, triggerAutoFix, isAiTyping]);

    // Auto-build bundle when user switches to 'preview' view mode
    useEffect(() => {
        if (viewMode === 'preview' && project && !previewHtml && !bundleLoading) {
            buildBundle(project);
        }
    }, [viewMode, project, previewHtml, bundleLoading, buildBundle]);

    // Auto-build bundle on initial project load if AI has already generated files
    useEffect(() => {
        if (project && Object.keys(project.files).length > 3 && !previewHtml) {
            buildBundle(project);
        }
    }, [project?.id, buildBundle, project, previewHtml]);

    // Listen to iframe sandbox messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'sandpack-error') {
                if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
                
                const errorMessage = event.data.error;
                // Aviso mode
                if (errorMessage.startsWith('[Aviso] ')) {
                    setConsoleWarnings(prev => {
                        const newWarning = errorMessage.replace('[Aviso] ', '').substring(0, 150) + (errorMessage.length > 150 ? '...' : '');
                        if (prev.includes(newWarning)) return prev;
                        return [...prev, newWarning];
                    });
                } else {
                    triggerAutoFix(errorMessage);
                }
            }
            if (event.data?.type === 'sandpack-error-cleared') {
                if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
                onAutoHealCleared();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [triggerAutoFix, onAutoHealCleared]);

    return {
        previewHtml,
        bundleLoading,
        consoleWarnings,
        setConsoleWarnings,
        iframeRef,
        buildBundle
    };
}
