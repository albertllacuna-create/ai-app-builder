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
        <div className="p-8 max-w-5xl mx-auto text-[var(--text-primary)]">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-muted)] mb-2">
                Monetización (Stripe)
            </h1>
            <p className="text-[var(--text-muted)] mb-8">
                Conecta tu cuenta y define planes de suscripción. Bulbia inyectará un *Paywall* dinámico en tu aplicación final protegiendo las funcionalidades de pago.
            </p>

            {/* 1. Estado de Conexión Stripe */}
            <div className={`glass-panel p-6 border rounded-xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${isConnected ? 'border-primary/50 bg-primary/5' : 'border-[var(--surface-border)] bg-[var(--surface)]'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-primary/20 text-primary' : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'}`}>
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                            Stripe Connect
                            {isConnected && <CheckCircle2 size={16} className="text-emerald-500" />}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)]">
                            {isConnected
                                ? 'Tu cuenta está conectada y lista para recibir pagos reales.'
                                : 'Conecta tu cuenta bancaria para poder cobrar a los usuarios.'}
                        </p>
                    </div>
                </div>

                {isConnected ? (
                    <button
                        onClick={handleDisconnectStripe}
                        className="px-4 py-2 bg-[var(--surface-hover)] text-[var(--text-secondary)] font-medium rounded-lg hover:bg-[var(--surface-elevated)] transition-colors border border-[var(--surface-border)]"
                    >
                        Desconectar
                    </button>
                ) : (
                    <button
                        onClick={handleConnectStripe}
                        disabled={isConnecting}
                        className="px-6 py-2 bg-[var(--foreground)] text-[var(--background)] font-medium rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
                    >
                        {isConnecting ? 'Conectando...' : 'Conectar con Stripe'}
                    </button>
                )}
            </div>

            {/* 2. Constructor de Planes */}
            <div className={`transition-all duration-300 ${isConnected ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Tus Planes de Precio</h3>
                    <button
                        onClick={openNewPlanModal}
                        className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> Nuevo Plan
                    </button>
                </div>

                {plans.length === 0 ? (
                    <div className="border border-dashed border-[var(--surface-border)] rounded-xl p-12 text-center bg-[var(--surface)]/50">
                        <CreditCard size={48} className="text-[var(--text-muted)]/30 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No tienes planes de pago configurados</h4>
                        <p className="text-[var(--text-muted)] max-w-sm mx-auto">
                            Crea un plan de suscripción mensual o de pago único para empezar a monetizar tu aplicación.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div key={plan.id} className="glass-panel border border-[var(--surface-border)] rounded-xl p-6 flex flex-col relative group bg-[var(--surface)] shadow-sm hover:shadow-md transition-all">
                                {/* Acciones Ocultas en Hover */}
                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditPlanModal(plan)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-hover)] rounded-md transition-colors border border-[var(--surface-border)]"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-red-500 hover:text-white bg-[var(--surface-hover)] rounded-md hover:bg-red-500 transition-colors border border-[var(--surface-border)]"><Trash2 size={14} /></button>
                                </div>

                                <div className="mb-4">
                                    <h4 className="text-xl font-bold mb-1 text-[var(--text-primary)]">{plan.name}</h4>
                                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 min-h-[40px]">{plan.description}</p>
                                </div>
                                <div className="mb-6 flex items-baseline gap-1 text-[var(--text-primary)]">
                                    <span className="text-3xl font-bold">${plan.price}</span>
                                    <span className="text-[var(--text-muted)] text-sm font-medium">/ {plan.interval === 'month' ? 'mes' : plan.interval === 'year' ? 'año' : 'pago único'}</span>
                                </div>

                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                            <span>{feature}</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-[var(--surface-border)] flex justify-between items-center bg-[var(--surface-hover)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1.5">Nombre del Plan</label>
                                <input type="text" className="w-full bg-[var(--background)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-primary disabled:opacity-50 outline-none" placeholder="Ej: Premium Mensual" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1.5">Precio ($)</label>
                                    <input type="number" step="0.01" className="w-full bg-[var(--background)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-primary outline-none" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1.5">Facturación</label>
                                    <select className="w-full bg-[var(--background)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-primary outline-none" value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value as any })}>
                                        <option value="month">Mensual</option>
                                        <option value="year">Anual</option>
                                        <option value="one-time">Único (Lifetime)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1.5">Descripción Corta</label>
                                <input type="text" className="w-full bg-[var(--background)] border border-[var(--surface-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-primary outline-none" placeholder="Ej: Acceso completo a las funciones base." value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1.5">Características (Features)</label>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" className="flex-1 bg-[var(--background)] border border-[var(--surface-border)] rounded-lg px-3 py-2 focus:border-primary text-sm text-[var(--text-primary)] outline-none" placeholder="Añadir una ventaja..." value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()} />
                                    <button onClick={handleAddFeature} className="px-3 py-2 bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-elevated)] transition-colors border border-[var(--surface-border)]"><Plus size={18} /></button>
                                </div>

                                <ul className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                    {planForm.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-center justify-between gap-2 bg-[var(--background)] border border-[var(--surface-border)] rounded p-2 text-sm text-[var(--text-secondary)] shadow-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <CheckCircle2 size={14} className="text-primary shrink-0" />
                                                <span className="truncate">{feat}</span>
                                            </div>
                                            <button onClick={() => handleRemoveFeature(idx)} className="text-[var(--text-muted)] hover:text-red-500 shrink-0"><X size={14} /></button>
                                        </li>
                                    ))}
                                    {planForm.features.length === 0 && (
                                        <p className="text-xs text-[var(--text-muted)] italic">No hay características añadidas.</p>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div className="p-5 border-t border-[var(--surface-border)] flex justify-end gap-3 bg-[var(--surface-hover)]">
                            <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium">
                                Cancelar
                            </button>
                            <button onClick={handleSavePlan} disabled={!planForm.name || planForm.price <= 0} className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                Guardar Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
