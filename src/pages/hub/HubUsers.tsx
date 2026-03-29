import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Trash2, User, RefreshCw, Mail, Calendar, Shield } from 'lucide-react';

export function HubUsers() {
    const { projectId } = useParams<{ projectId: string }>();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_collections')
                .select('*')
                .eq('project_id', projectId)
                .eq('collection_name', 'users')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) loadUsers();
    }, [projectId]);

    const handleDeleteUser = async (id: string) => {
        if (!confirm('¿Revocar acceso? Esto eliminará el perfil del usuario.')) return;
        try {
            await supabase.from('app_collections').delete().eq('id', id);
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <User className="text-primary" /> Gestión de Usuarios
                    </h1>
                    <p className="text-neutral-400 mt-1">Cuentas registradas en esta aplicación.</p>
                </div>
                <button
                    onClick={loadUsers}
                    className="btn btn-outline flex items-center gap-2"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Actualizar
                </button>
            </div>

            <div className="glass-panel rounded-lg border border-neutral-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-800/50 border-b border-neutral-800">
                            <th className="p-4 font-medium text-neutral-300">Usuario</th>
                            <th className="p-4 font-medium text-neutral-300">Rol</th>
                            <th className="p-4 font-medium text-neutral-300">Fecha de Registro</th>
                            <th className="p-4 font-medium text-neutral-300 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-neutral-500">Cargando directorio...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-neutral-500">
                                    Aún no hay usuarios registrados en esta app.
                                    <br />
                                    <span className="text-sm mt-2 block">Cuando los usuarios se registren en la aplicación generada, aparecerán aquí.</span>
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                            {u.data.email?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-neutral-200">{u.data.email || 'Email oculto'}</span>
                                            <span className="text-xs text-neutral-500 flex items-center gap-1"><Mail size={10} /> Registrado vía Auth</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-300 border border-neutral-700 flex items-center w-fit gap-1">
                                            <Shield size={12} /> {u.data.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-neutral-400 text-sm flex items-center gap-2 mt-2">
                                        <Calendar size={14} /> {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="icon-btn text-danger hover:bg-danger/10 p-2 rounded"
                                            title="Eliminar perfil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
