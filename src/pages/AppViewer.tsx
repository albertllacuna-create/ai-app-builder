import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { db } from '../services/db';
import { Project } from '../types';

export function AppViewer() {
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        const p = db.getProject(projectId);
        if (p) {
            setProject(p);
        }
        setLoading(false);
    }, [projectId]);

    if (!projectId) return <Navigate to="/dashboard" replace />;

    if (loading) {
        return (
            <div className="flex items-center justify-center w-screen h-screen bg-[#0f0a18] text-white">
                <div className="animate-pulse text-violet-300">Cargando aplicación...</div>
            </div>
        );
    }

    if (!project || !project.publishedUrl) {
        return (
            <div className="flex items-center justify-center w-screen h-screen bg-[#0f0a18] text-white">
                <div className="bg-[#1c0f2e] border border-violet-500/30 p-8 rounded-2xl max-w-md text-center">
                    <h2 className="text-xl font-bold mb-2 text-violet-100">Aplicación no disponible</h2>
                    <p className="text-violet-300/70 text-sm">Esta aplicación no existe o aún no ha sido publicada.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen overflow-hidden bg-white">
            <iframe
                src={project.publishedUrl}
                className="w-full h-full border-0"
                title={`App: ${project.name}`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
            />
        </div>
    );
}
