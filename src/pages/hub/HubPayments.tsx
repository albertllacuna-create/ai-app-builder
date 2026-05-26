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
        <div className="p-8 max-w-5xl mx-auto relative z-10">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500 mb-2">
                Monetización (Stripe)
            </h1>
            <p className="text-[14px] text-[var(--text-muted)] mb-10 font-medium">
                Conecta tu cuenta y define planes de suscripción. Bulbia inyectará un *Paywall* dinámico en tu aplicación final protegiendo las funcionalidades de pago.
            </p>

            {/* 1. Estado de Conexión Stripe */}
            <div className={`bg-white dark:bg-neutral-900 border rounded-[2rem] shadow-xl shadow-black/5 p-10 relative overflow-hidden mb-10 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-300 ${isConnected ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-gray-200 dark:border-white/10'}`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isConnected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border border-white/10'}`}>
                        <CreditCard size={28} />
                    </div>
                    <div>
                        <h3 className="text-[18px] font-bold flex items-center gap-2 text-[var(--text-primary)]">
                            Stripe Connect
                            {isConnected && <CheckCircle2 size={18} className="text-emerald-500 drop-shadow-sm" />}
                        </h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1 font-medium">
                            {isConnected
                                ? 'Tu cuenta está conectada y lista para recibir pagos reales.'
                                : 'Conecta tu cuenta bancaria para poder cobrar a los usuarios.'}
                        </p>
                    </div>
                </div>

                {isConnected ? (
                    <button
                        onClick={handleDisconnectStripe}
                        className="px-5 py-2.5 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] text-[14px] font-bold rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-sm"
                    >
                        Desconectar
                    </button>
                ) : (
                    <button
                        onClick={handleConnectStripe}
                        disabled={isConnecting}
                        className="px-6 py-3 bg-primary text-white text-[14px] font-bold rounded-xl hover:bg-primary-hover transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isConnecting ? 'Conectando...' : 'Conectar con Stripe'}
                    </button>
                )}
            </div>

            {/* 2. Constructor de Planes */}
            <div className={`transition-all duration-300 ${isConnected ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">Tus Planes de Precio</h3>
                    <button
                        onClick={openNewPlanModal}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-[13px] font-bold rounded-lg hover:scale-105 transition-all flex items-center gap-1.5 shadow-md"
                    >
                        <Plus size={16} /> Nuevo Plan
                    </button>
                </div>

                {plans.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-900 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-[2rem] shadow-xl shadow-black/5 p-16 text-center group">
                        <div className="w-24 h-24 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <CreditCard size={40} className="text-[var(--text-muted)]" />
                        </div>
                        <h4 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">No tienes planes de pago configurados</h4>
                        <p className="text-[14px] text-[var(--text-muted)] font-medium max-w-sm mx-auto">
                            Crea un plan de suscripción mensual o de pago único para empezar a monetizar tu aplicación.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div key={plan.id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 p-8 flex flex-col relative group hover:border-primary/40 hover:shadow-[0_10px_30px_rgba(139,92,246,0.15)] transition-all duration-300 overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                                {/* Glow hover effect */}
                                <div className="absolute -inset-10 bg-gradient-to-br from-primary/10 via-transparent to-fuchsia-500/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none z-0" />

                                {/* Acciones Ocultas en Hover */}
                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={() => openEditPlanModal(plan)} className="p-2 text-[var(--text-muted)] hover:text-primary bg-white/50 dark:bg-black/50 rounded-lg border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-md transition-all"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-[var(--text-muted)] hover:text-red-500 bg-white/50 dark:bg-black/50 rounded-lg border border-white/20 dark:border-white/10 hover:border-red-500/30 hover:bg-red-500/10 shadow-sm backdrop-blur-md transition-all"><Trash2 size={16} /></button>
                                </div>

                                <div className="mb-6 pr-16 relative z-10">
                                    <h4 className="text-[18px] font-bold mb-2 text-[var(--text-primary)] tracking-tight">{plan.name}</h4>
                                    <p className="text-[13px] text-[var(--text-muted)] font-medium line-clamp-2 min-h-[40px] leading-relaxed">{plan.description}</p>
                                </div>
                                <div className="mb-8 flex items-baseline gap-2 text-[var(--text-primary)] border-b border-white/20 dark:border-white/10 pb-6 relative z-10">
                                    <span className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500 drop-shadow-sm">${plan.price}</span>
                                    <span className="text-[var(--text-muted)] text-[13px] font-bold uppercase tracking-wider">/ {plan.interval === 'month' ? 'mes' : plan.interval === 'year' ? 'año' : 'pago único'}</span>
                                </div>

                                <ul className="space-y-4 mb-2 flex-1 relative z-10">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3 text-[14px] font-medium text-[var(--text-secondary)]">
                                            <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0 drop-shadow-sm" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                        <div className="px-7 py-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/40 dark:bg-black/40 backdrop-blur-xl">
                            <h3 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight">{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-7 space-y-6">
                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Nombre del Plan</label>
                                <input type="text" className="w-full bg-[var(--surface-hover)] focus:bg-[var(--background)] border border-transparent focus:border-primary/30 outline-none rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] font-medium disabled:opacity-50 transition-all placeholder:text-[var(--text-muted)]" placeholder="Ej: Premium Mensual" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Precio ($)</label>
                                    <input type="number" step="0.01" className="w-full bg-[var(--surface-hover)] focus:bg-[var(--background)] border border-transparent focus:border-primary/30 outline-none rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] font-medium transition-all" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Facturación</label>
                                    <select className="w-full bg-[var(--surface-hover)] focus:bg-[var(--background)] border border-transparent focus:border-primary/30 outline-none rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] font-medium transition-all appearance-none" value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value as any })}>
                                        <option value="month">Mensual</option>
                                        <option value="year">Anual</option>
                                        <option value="one-time">Único (Lifetime)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Descripción Corta</label>
                                <input type="text" className="w-full bg-[var(--surface-hover)] focus:bg-[var(--background)] border border-transparent focus:border-primary/30 outline-none rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] font-medium transition-all placeholder:text-[var(--text-muted)]" placeholder="Ej: Acceso completo a las funciones base." value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Características (Features)</label>
                                <div className="flex gap-3 mb-4">
                                    <input type="text" className="flex-1 bg-[var(--surface-hover)] focus:bg-[var(--background)] border border-transparent focus:border-primary/30 outline-none rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] font-medium transition-all placeholder:text-[var(--text-muted)]" placeholder="Añadir una ventaja..." value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()} />
                                    <button onClick={handleAddFeature} className="px-4 py-3 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-white/20 dark:border-white/10 shadow-sm"><Plus size={20} /></button>
                                </div>

                                <ul className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    {planForm.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-center justify-between gap-3 bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-xl p-3 text-[13px] font-medium text-[var(--text-secondary)] shadow-inner">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <CheckCircle2 size={16} className="text-primary shrink-0" />
                                                <span className="truncate">{feat}</span>
                                            </div>
                                            <button onClick={() => handleRemoveFeature(idx)} className="text-[var(--text-muted)] hover:text-red-500 shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"><X size={14} /></button>
                                        </li>
                                    ))}
                                    {planForm.features.length === 0 && (
                                        <p className="text-[13px] font-medium text-[var(--text-muted)] italic text-center p-4">No hay características añadidas.</p>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div className="px-7 py-5 border-t border-white/20 dark:border-white/10 flex justify-end gap-3 bg-white/40 dark:bg-black/40 backdrop-blur-xl">
                            <button onClick={() => setShowPlanModal(false)} className="px-5 py-2.5 text-[14px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors font-bold">
                                Cancelar
                            </button>
                            <button onClick={handleSavePlan} disabled={!planForm.name || planForm.price <= 0} className="px-5 py-2.5 text-[14px] bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:shadow-none">
                                Guardar Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
