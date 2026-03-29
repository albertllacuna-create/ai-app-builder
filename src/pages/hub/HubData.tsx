import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Trash2, Database, Table as TableIcon, RefreshCw, Layers, Plus, Pencil, Check, X } from 'lucide-react';

export function HubData() {
    const { projectId } = useParams<{ projectId: string }>();
    const [collections, setCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Create new record state
    const [showNewForm, setShowNewForm] = useState(false);
    const [newRecord, setNewRecord] = useState<Record<string, string>>({});

    // Edit record state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, string>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_collections')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const allData = data || [];

            const uniqueCollections = Array.from(new Set(allData.map((item: any) => item.collection_name))).filter((c: string) => c !== 'users');
            setCollections(uniqueCollections);

            const currentSelected = selectedCollection && uniqueCollections.includes(selectedCollection)
                ? selectedCollection
                : uniqueCollections[0] || null;

            setSelectedCollection(currentSelected);

            if (currentSelected) {
                setRecords(allData.filter((item: any) => item.collection_name === currentSelected));
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) loadData();
    }, [projectId, selectedCollection]);

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            await supabase.from('app_collections').delete().eq('id', id);
            loadData();
        } catch (error) {
            console.error('Error deleting record:', error);
        }
    };

    const handleCreateRecord = async () => {
        if (!selectedCollection || Object.keys(newRecord).length === 0) return;
        try {
            await supabase.from('app_collections').insert([{
                project_id: projectId,
                collection_name: selectedCollection,
                data: newRecord
            }]);
            setNewRecord({});
            setShowNewForm(false);
            loadData();
        } catch (error) {
            console.error('Error creating record:', error);
        }
    };

    const handleStartEdit = (record: any) => {
        setEditingId(record.id);
        setEditData(record.data || {});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            await supabase.from('app_collections')
                .update({ data: editData })
                .eq('id', editingId);
            setEditingId(null);
            setEditData({});
            loadData();
        } catch (error) {
            console.error('Error updating record:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    // Extract dynamic columns from the stored JSON
    const getColumns = () => {
        if (records.length === 0) return [];
        const keys = new Set<string>();
        records.forEach((r: any) => {
            if (r.data) Object.keys(r.data).forEach((k: string) => keys.add(k));
        });
        return Array.from(keys);
    };

    const columns = getColumns();

    const initNewRecord = () => {
        const empty: Record<string, string> = {};
        columns.forEach((col: string) => { empty[col] = ''; });
        setNewRecord(empty);
        setShowNewForm(true);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto flex gap-8">
            {/* Sidebar de Colecciones */}
            <div className="w-64 flex-shrink-0">
                <div className="flex items-center gap-2 font-bold text-lg mb-6">
                    <Database className="text-primary" /> Colecciones
                </div>
                <div className="space-y-2">
                    {loading && collections.length === 0 ? (
                        <p className="text-neutral-500 text-sm">Buscando datos...</p>
                    ) : collections.length === 0 ? (
                        <p className="text-neutral-500 text-sm">No hay datos guardados aún.</p>
                    ) : (
                        collections.map((col: string) => (
                            <button
                                key={col}
                                onClick={() => setSelectedCollection(col)}
                                className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${selectedCollection === col
                                    ? 'bg-primary text-white'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                    }`}
                            >
                                <Layers size={16} />
                                <span className="truncate">{col}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Vista Principal (Tabla) */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <TableIcon className="text-primary" />
                            {selectedCollection || 'Visor de Datos'}
                        </h1>
                        <p className="text-neutral-400 mt-1">Explora y gestiona los registros de la base de datos.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedCollection && columns.length > 0 && (
                            <button
                                onClick={initNewRecord}
                                className="btn btn-primary flex items-center gap-2 text-sm"
                            >
                                <Plus size={16} />
                                Nuevo registro
                            </button>
                        )}
                        <button
                            onClick={loadData}
                            className="btn btn-outline flex items-center gap-2"
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="glass-panel rounded-lg border border-neutral-800 overflow-x-auto">
                    {!selectedCollection ? (
                        <div className="p-12 text-center text-neutral-500">
                            <Database size={48} className="mx-auto text-neutral-700 mb-4" />
                            <p>Selecciona una colección en el menú lateral para ver sus datos.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className="bg-neutral-800/50 border-b border-neutral-800">
                                    <th className="p-4 font-medium text-neutral-300 w-16">ID</th>
                                    {columns.map((col: string) => (
                                        <th key={col} className="p-4 font-medium text-neutral-300 capitalize">{col}</th>
                                    ))}
                                    <th className="p-4 font-medium text-neutral-300 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* New record row */}
                                {showNewForm && (
                                    <tr className="border-b border-primary/30 bg-primary/5">
                                        <td className="p-4 text-xs text-neutral-500">nuevo</td>
                                        {columns.map((col: string) => (
                                            <td key={col} className="p-2">
                                                <input
                                                    type="text"
                                                    value={newRecord[col] || ''}
                                                    onChange={(e) => setNewRecord({ ...newRecord, [col]: e.target.value })}
                                                    placeholder={col}
                                                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-4 text-right flex items-center justify-end gap-1">
                                            <button
                                                onClick={handleCreateRecord}
                                                className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                title="Guardar"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setShowNewForm(false); setNewRecord({}); }}
                                                className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                title="Cancelar"
                                            >
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                )}

                                {loading && records.length === 0 ? (
                                    <tr><td colSpan={columns.length + 2} className="p-8 text-center text-neutral-500">Cargando registros...</td></tr>
                                ) : records.length === 0 ? (
                                    <tr><td colSpan={columns.length + 2} className="p-8 text-center text-neutral-500">Colección vacía.</td></tr>
                                ) : (
                                    records.map((record: any) => (
                                        <tr key={record.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                                            <td className="p-4 text-xs font-mono text-neutral-500 truncate max-w-[80px]" title={record.id}>
                                                ...{record.id.substring(0, 5)}
                                            </td>
                                            {columns.map((col: string) => {
                                                const isEditing = editingId === record.id;
                                                const val = record.data ? record.data[col] : null;
                                                const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');

                                                return (
                                                    <td key={col} className="p-2">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editData[col] ?? ''}
                                                                onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
                                                                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-neutral-300 truncate block max-w-xs px-2" title={displayVal}>
                                                                {displayVal || '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {editingId === record.id ? (
                                                        <>
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                                title="Guardar"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                                title="Cancelar"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleStartEdit(record)}
                                                                className="p-1.5 rounded text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRecord(record.id)}
                                                                className="p-1.5 rounded text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
