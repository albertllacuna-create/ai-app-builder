import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { db } from '../services/db';
import { User, bulbiaPlan } from '../types';

const PLANS = [
    {
        id: 'Free',
        name: 'Free',
        price: 0,
        tokens: '100',
        icon: Sparkles,
        color: 'text-neutral-400',
        bg: 'bg-neutral-900',
        border: 'border-neutral-800',
        description: 'Perfecto para probar Bulbia y hacer proyectos pequeños.',
        features: [
            '100 créditos mensuales',
            'Número limitado a 1 app',
            'Publicación en subdominio'
        ]
    },
    {
        id: 'Starter',
        name: 'Starter',
        price: 15,
        tokens: '1,500',
        icon: Zap,
        color: 'text-sky-400',
        bg: 'bg-sky-400/5',
        border: 'border-sky-400/50',
        description: 'Ideal para iniciar tu camino con herramientas de IA.',
        features: [
            '1.500 créditos mensuales',
            'Número ilimitado de apps',
            'Publicación en dominio personalizado'
        ]
    },
    {
        id: 'Builder',
        name: 'Builder',
        price: 35,
        tokens: '3,500',
        icon: Zap,
        color: 'text-primary',
        bg: 'bg-primary/5',
        border: 'border-primary',
        popular: true,
        description: 'Ideal para creadores y emprendedores que lanzan MVPs.',
        features: [
            '3.500 créditos mensuales',
            'Número ilimitado de apps',
            'Publicación en dominio personalizado',
            'Acceso anticipado a funciones beta'
        ]
    },
    {
        id: 'Expert',
        name: 'Expert',
        price: 75,
        tokens: '7,500',
        icon: Zap,
        color: 'text-indigo-400',
        bg: 'bg-indigo-400/5',
        border: 'border-indigo-400/50',
        description: 'Para desarrolladores que construyen apps a diario.',
        features: [
            '7.500 créditos mensuales',
            'Número ilimitado de apps',
            'Publicación en dominio personalizado',
            'Acceso anticipado a funciones beta',
            'Soporte Premium'
        ]
    }
];

export function PricingPlans() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    useEffect(() => {
        const currentUser = db.getUser();
        if (!currentUser) {
            navigate('/login');
        } else {
            setUser(currentUser);
        }
    }, [navigate]);

    const handleUpgrade = async (planId: bulbiaPlan, tokenAmount: number) => {
        if (!user) return;
        setLoadingPlan(planId);

        try {
            const response = await fetch('http://localhost:3001/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, userId: user.id, tokens: tokenAmount })
            });

            const data = await response.json();

            if (response.ok && data.url) {
                // Tenemos claves de Stripe: Redirigir al Checkout real de Stripe
                window.location.href = data.url;
            } else if (response.ok && data.simulated) {
                // Modo desarrollo/sin claves: Simular actualización manual con el Helper
                await db.updateUser({ plan: planId, tokens: tokenAmount });
                
                // Actualizar estado local para que React re-renderice
                setUser(db.getUser());
                
                navigate('/dashboard');
            } else {
                alert('Error al procesar el pago o configurar la sesión.');
            }
        } catch (error) {
            console.error('Error con Stripe:', error);
            alert('No se pudo conectar con el servidor de pagos.');
        } finally {
            setLoadingPlan(null);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] selection:bg-primary/30 py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span>Volver</span>
                </button>

                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-muted)]">
                        Potencia tu creatividad <br />sin límites
                    </h1>
                    <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
                        Los créditos son el combustible de Bulbia. Elige un plan que se adapte al tamaño de tus ideas y deja que la IA programe el resto.
                    </p>
                </div>

                <div className="grid xl:grid-cols-4 lg:grid-cols-2 md:grid-cols-2 gap-6 max-w-[90rem] mx-auto px-2">
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        const isCurrentPlan = user.plan === plan.id;
                        const isLoading = loadingPlan === plan.id;

                        // Parse token amount to real number for the update payload
                        const rawTokens = parseInt(plan.tokens.replace(/,/g, ''), 10);

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:transform hover:-translate-y-2 
                                bg-[var(--surface)] border-[var(--surface-border)] ${plan.popular ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary' : 'shadow-xl'}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                                        Más Popular
                                    </div>
                                )}

                                <div className="mb-8">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-[var(--surface-hover)] border border-[var(--surface-border)]`}>
                                        <Icon className={plan.color} size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">{plan.name}</h3>
                                    <p className="text-[var(--text-muted)] text-sm h-10">{plan.description}</p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-[var(--text-primary)]">${plan.price}</span>
                                        <span className="text-[var(--text-muted)] font-medium">/ mes</span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold bg-primary/10 inline-block px-3 py-1 rounded-lg text-primary">
                                        {plan.tokens} Créditos
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Check className={`mt-0.5 shrink-0 ${plan.color}`} size={18} />
                                            <span className="text-[var(--text-secondary)] text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleUpgrade(plan.id as bulbiaPlan, rawTokens)}
                                    disabled={isCurrentPlan || isLoading}
                                    className={`w-full py-4 rounded-xl font-bold text-sm transition-all focus:ring-4 focus:ring-primary/20 flex items-center justify-center gap-2
                                        ${isCurrentPlan
                                            ? 'bg-primary text-white cursor-default shadow-lg shadow-primary/25'
                                            : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md'
                                        } ${isLoading ? 'opacity-70' : ''}`}
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                                    {isCurrentPlan ? 'Plan Actual' : isLoading ? 'Procesando...' : `Suscribirse a ${plan.name}`}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-16 text-center text-[var(--text-muted)] text-sm">
                    <p>Bulbia utiliza pagos seguros procesados por Stripe. Puedes cancelar en cualquier momento.</p>
                </div>
            </div>
        </div>
    );
}
