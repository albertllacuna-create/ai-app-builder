import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { Loader2, Users, CheckCircle2, AlertCircle } from 'lucide-react';

export function JoinWorkspace() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const join = async () => {
            if (!token) return;
            
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    // Save invite token to session and redirect to login
                    sessionStorage.setItem('bulbia_invite_token', token);
                    navigate('/login');
                    return;
                }

                await db.login(session.user.email!);
                await db.initFromSupabase({ id: session.user.id, email: session.user.email! });
                
                const workspaceId = await db.joinWorkspace(token);
                setStatus('success');
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } catch (err: any) {
                console.error('Join error:', err);
                setStatus('error');
                setError(err.message || 'Error al unirse al espacio de trabajo');
            }
        };

        join();
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--surface-border)] rounded-3xl p-8 shadow-2xl text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
                    <Users size={32} />
                </div>
                
                {status === 'loading' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">Uniéndote al espacio...</h1>
                        <p className="text-sm text-[var(--text-muted)]">Estamos procesando tu invitación.</p>
                        <Loader2 size={24} className="animate-spin text-primary mx-auto mt-4" />
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle2 size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">¡Invitación aceptada!</h1>
                        <p className="text-sm text-[var(--text-muted)]">Ya eres parte del equipo. Redirigiendo...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <AlertCircle size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">Error en la invitación</h1>
                        <p className="text-sm text-red-500">{error}</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="mt-6 w-full py-3 bg-[var(--text-primary)] text-[var(--background)] rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                        >
                            Ir al Panel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
