import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/db';
import { Project, StripePlan } from '../../types';
import { CreditCard, Plus, Trash2, CheckCircle2, Edit2, X } from 'lucide-react';

export function HubPayments() {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [plans, setPlans] = useState<StripePlan[]>([]);

    // UI State
    const [isConnecting, setIsConnecting] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<StripePlan | null>(null);

    // Form State
    const [planForm, setPlanForm] = useState<StripePlan>({
        id: '',
        name: '',
        description: '',
        price: 0,
        interval: 'month',
        features: []
    });
    const [newFeature, setNewFeature] = useState('');

    useEffect(() => {
        if (projectId) {
            const p = db.getProject(projectId);
            if (p) {
                setProject(p);
                setPlans(p.stripePlans || []);
            }
        }
    }, [projectId]);

    const handleConnectStripe = () => {
        setIsConnecting(true);
        // Simulamos un delay de OAuth
        setTimeout(() => {
            if (project) {
                db.updateProjectMetadata(project.id, { stripeConnected: true });
                setProject({ ...project, stripeConnected: true });
            }
            setIsConnecting(false);
        }, 1500);
    };

    const handleDisconnectStripe = () => {
        if (project) {
            db.updateProjectMetadata(project.id, { stripeConnected: false });
            setProject({ ...project, stripeConnected: false });
        }
    };

    const openNewPlanModal = () => {
        setEditingPlan(null);
        setPlanForm({
            id: 'plan_' + Math.random().toString(36).substring(2, 9),
            name: '',
            description: '',
            price: 9.99,
            interval: 'month',
            features: []
        });
        setNewFeature('');
        setShowPlanModal(true);
    };

    const openEditPlanModal = (plan: StripePlan) => {
        setEditingPlan(plan);
        setPlanForm({ ...plan });
        setNewFeature('');
        setShowPlanModal(true);
    };

    const handleAddFeature = () => {
        if (newFeature.trim()) {
            setPlanForm({ ...planForm, features: [...planForm.features, newFeature.trim()] });
            setNewFeature('');
        }
    };

    const handleRemoveFeature = (index: number) => {
        const newFeatures = [...planForm.features];
        newFeatures.splice(index, 1);
        setPlanForm({ ...planForm, features: newFeatures });
    };

    const handleSavePlan = () => {
        if (!project) return;

        let updatedPlans: StripePlan[];
        if (editingPlan) {
            updatedPlans = plans.map(p => p.id === editingPlan.id ? planForm : p);
        } else {
            updatedPlans = [...plans, planForm];
        }

        db.updateProjectMetadata(project.id, { stripePlans: updatedPlans });
        setPlans(updatedPlans);
        setShowPlanModal(false);
    };

    const handleDeletePlan = (id: string) => {
        if (!project) return;
        const updatedPlans = plans.filter(p => p.id !== id);
        db.updateProjectMetadata(project.id, { stripePlans: updatedPlans });
        setPlans(updatedPlans);
    };

    if (!project) return <div className="p-8">Cargando proyecto...</div>;

    const isConnected = !!project.stripeConnected;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                Monetización (Stripe)
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] mb-8">
                Conecta tu cuenta y define planes de suscripción. Bulbia inyectará un *Paywall* dinámico en tu aplicación final protegiendo las funcionalidades de pago.
            </p>

            {/* 1. Estado de Conexión Stripe */}
            <div className={`bg-white dark:bg-[#0c0c0c] p-6 rounded-xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${isConnected ? 'border border-primary/30 bg-primary/5' : 'border border-gray-200 dark:border-white/5'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isConnected ? 'bg-primary/10 text-primary' : 'bg-gray-50 dark:bg-white/5 text-[var(--text-muted)] border border-gray-200 dark:border-white/5'}`}>
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                            Stripe Connect
                            {isConnected && <CheckCircle2 size={16} className="text-emerald-500" />}
                        </h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1">
                            {isConnected
                                ? 'Tu cuenta está conectada y lista para recibir pagos reales.'
                                : 'Conecta tu cuenta bancaria para poder cobrar a los usuarios.'}
                        </p>
                    </div>
                </div>

                {isConnected ? (
                    <button
                        onClick={handleDisconnectStripe}
                        className="px-4 py-2 bg-gray-50 dark:bg-[#111111] text-[var(--text-secondary)] text-[13px] font-medium rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-gray-200 dark:border-white/10 shadow-sm"
                    >
                        Desconectar
                    </button>
                ) : (
                    <button
                        onClick={handleConnectStripe}
                        disabled={isConnecting}
                        className="px-4 py-2 bg-[var(--text-primary)] text-[var(--background)] text-[13px] font-medium rounded-md hover:opacity-90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isConnecting ? 'Conectando...' : 'Conectar con Stripe'}
                    </button>
                )}
            </div>

            {/* 2. Constructor de Planes */}
            <div className={`transition-all duration-300 ${isConnected ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight">Tus Planes de Precio</h3>
                    <button
                        onClick={openNewPlanModal}
                        className="px-3 py-1.5 bg-primary text-white text-[13px] font-medium rounded-md hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus size={16} /> Nuevo Plan
                    </button>
                </div>

                {plans.length === 0 ? (
                    <div className="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-[#111111]/50">
                        <CreditCard size={48} className="text-[var(--text-muted)] opacity-20 mx-auto mb-4" />
                        <h4 className="text-[15px] font-medium text-[var(--text-secondary)] mb-2">No tienes planes de pago configurados</h4>
                        <p className="text-[13px] text-[var(--text-muted)] max-w-sm mx-auto">
                            Crea un plan de suscripción mensual o de pago único para empezar a monetizar tu aplicación.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div key={plan.id} className="bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-white/5 rounded-xl p-6 flex flex-col relative group shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-md transition-all">
                                {/* Acciones Ocultas en Hover */}
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditPlanModal(plan)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-white dark:bg-[#1a1a1a] rounded border border-gray-200 dark:border-white/10 shadow-sm transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 bg-white dark:bg-[#1a1a1a] rounded border border-gray-200 dark:border-white/10 hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 shadow-sm transition-colors"><Trash2 size={14} /></button>
                                </div>

                                <div className="mb-4 pr-12">
                                    <h4 className="text-[16px] font-bold mb-1 text-[var(--text-primary)] tracking-tight">{plan.name}</h4>
                                    <p className="text-[12px] text-[var(--text-muted)] line-clamp-2 min-h-[36px] leading-relaxed">{plan.description}</p>
                                </div>
                                <div className="mb-6 flex items-baseline gap-1.5 text-[var(--text-primary)] border-b border-gray-100 dark:border-white/5 pb-4">
                                    <span className="text-2xl font-bold tracking-tight">${plan.price}</span>
                                    <span className="text-[var(--text-muted)] text-[12px] font-medium">/ {plan.interval === 'month' ? 'mes' : plan.interval === 'year' ? 'año' : 'pago único'}</span>
                                </div>

                                <ul className="space-y-3 mb-2 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                                            <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                                            <span className="leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Creación/Edición */}
            {showPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
                    <div className="bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-[#111111]/50">
                            <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Nombre del Plan</label>
                                <input type="text" className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 outline-none transition-all placeholder:text-[var(--text-muted)]" placeholder="Ej: Premium Mensual" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Precio ($)</label>
                                    <input type="number" step="0.01" className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Facturación</label>
                                    <select className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value as any })}>
                                        <option value="month">Mensual</option>
                                        <option value="year">Anual</option>
                                        <option value="one-time">Único (Lifetime)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Descripción Corta</label>
                                <input type="text" className="w-full bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]" placeholder="Ej: Acceso completo a las funciones base." value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Características (Features)</label>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" className="flex-1 bg-[#fcfcfc] dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]" placeholder="Añadir una ventaja..." value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()} />
                                    <button onClick={handleAddFeature} className="px-3 py-2 bg-gray-50 dark:bg-white/5 text-[var(--text-secondary)] rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/10 shadow-sm"><Plus size={16} /></button>
                                </div>

                                <ul className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                    {planForm.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-[#111111]/50 border border-gray-200 dark:border-white/5 rounded-md p-2 text-[12px] text-[var(--text-secondary)]">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <CheckCircle2 size={12} className="text-primary shrink-0" />
                                                <span className="truncate">{feat}</span>
                                            </div>
                                            <button onClick={() => handleRemoveFeature(idx)} className="text-[var(--text-muted)] hover:text-red-500 shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><X size={12} /></button>
                                        </li>
                                    ))}
                                    {planForm.features.length === 0 && (
                                        <p className="text-[12px] text-[var(--text-muted)] italic">No hay características añadidas.</p>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50/50 dark:bg-[#111111]/50">
                            <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium">
                                Cancelar
                            </button>
                            <button onClick={handleSavePlan} disabled={!planForm.name || planForm.price <= 0} className="px-4 py-2 text-[13px] bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                Guardar Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
