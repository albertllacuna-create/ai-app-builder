import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { db } from '../services/db';
import { User, MaysonPlan } from '../types';

const PLANS = [
    {
        id: 'Free',
        name: 'Free',
        price: 0,
        tokens: '5,000',
        icon: Sparkles,
        color: 'text-neutral-400',
        bg: 'bg-neutral-900',
        border: 'border-neutral-800',
        description: 'Perfecto para probar Mayson y hacer proyectos pequeños.',
        features: [
            '5,000 Créditos mensuales',
            'Modelos Gemini 2.5 Flash',
            'Publicación básica en subdominio',
            'Soporte comunitario'
        ]
    },
    {
        id: 'Pro',
        name: 'Pro',
        price: 25,
        tokens: '250,000',
        icon: Zap,
        color: 'text-primary',
        bg: 'bg-primary/5',
        border: 'border-primary',
        popular: true,
        description: 'Ideal para creadores y emprendedores que lanzan MVPs.',
        features: [
            '250,000 Créditos mensuales',
            'Modelos Premium (Claude, GPT-4, Pro)',
            'Dominios Personalizados ilimitados',
            'Soporte prioritario'
        ]
    },
    {
        id: 'Expert',
        name: 'Expert',
        price: 50,
        tokens: '600,000',
        icon: Zap,
        color: 'text-indigo-400',
        bg: 'bg-indigo-400/5',
        border: 'border-indigo-400/50',
        description: 'Para desarrolladores que construyen apps a diario.',
        features: [
            '600,000 Créditos mensuales',
            'Despliegue automático y CI/CD',
            'Bases de datos con respaldos diarios',
            'Integración de pagos (Stripe)'
        ]
    },
    {
        id: 'Enterprise',
        name: 'Enterprise',
        price: 100,
        tokens: '1,500,000',
        icon: Crown,
        color: 'text-amber-400',
        bg: 'bg-amber-400/5',
        border: 'border-amber-400/50',
        description: 'Para agencias de software y creativos de alto volumen.',
        features: [
            '1,500,000 Créditos mensuales',
            'Soporte en tiempo real',
            'Exportación de Código Fuente (.zip)',
            'Marca Blanca total'
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

    const handleUpgrade = async (planId: MaysonPlan, tokenAmount: number) => {
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
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-primary/30 py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span>Volver</span>
                </button>

                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/40">
                        Potencia tu creatividad <br />sin límites
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                        Los tokens son el combustible de Mayson. Elige un plan que se adapte al tamaño de tus ideas y deja que la IA programe el resto.
                    </p>
                </div>

                <div className="grid md:grid-cols-4 gap-6 max-w-[90rem] mx-auto">
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
                                ${plan.bg} ${plan.border} ${plan.popular ? 'shadow-2xl shadow-primary/20' : 'shadow-xl'}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                                        Más Popular
                                    </div>
                                )}

                                <div className="mb-8">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-neutral-900 border ${plan.border}`}>
                                        <Icon className={plan.color} size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                    <p className="text-neutral-400 text-sm h-10">{plan.description}</p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold">${plan.price}</span>
                                        <span className="text-neutral-500 font-medium">/ mes</span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold bg-white/5 inline-block px-3 py-1 rounded-lg text-neutral-300">
                                        {plan.tokens} Tokens IA
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Check className={`mt-0.5 shrink-0 ${plan.color}`} size={18} />
                                            <span className="text-neutral-300 text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleUpgrade(plan.id as MaysonPlan, rawTokens)}
                                    disabled={isCurrentPlan || isLoading}
                                    className={`w-full py-4 rounded-xl font-bold text-sm transition-all focus:ring-4 focus:ring-primary/20 flex items-center justify-center gap-2
                                        ${isCurrentPlan
                                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                                            : plan.popular
                                                ? 'bg-primary text-white hover:bg-primary-hover shadow-lg'
                                                : 'bg-white text-black hover:bg-neutral-200 shadow-lg'
                                        }`}
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                                    {isCurrentPlan ? 'Plan Actual' : isLoading ? 'Procesando...' : `Suscribirse a ${plan.name}`}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-16 text-center text-neutral-500 text-sm">
                    <p>Mayson utiliza pagos seguros procesados por Stripe. Puedes cancelar en cualquier momento.</p>
                </div>
            </div>
        </div>
    );
}
