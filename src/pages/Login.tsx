import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import logo from '../assets/logo.png';
import '../index.css';

export function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        // Redirigir si ya hay sesión activa o si se acaba de crear vía OAuth (Google)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard');
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) navigate('/dashboard');
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        if (!isLogin && password !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden. Por favor, asegúrate de que ambas sean iguales.');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/dashboard');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                setSuccessMsg('¡Cuenta creada con éxito! Te hemos enviado un correo de verificación. Por favor, confirma tu cuenta antes de intentar acceder.');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setIsLogin(true);
            }
        } catch (error: any) {
            setErrorMsg(error.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setErrorMsg(error.message || 'Error al conectar con Google.');
            setLoading(false);
        }
    };

    return (
        <div className="login-container bg-transparent relative">
            {/* Animated Background */}
            <div className="mesh-gradient" />

            <div className="login-card glass-panel relative z-10">
                <div className="login-header">
                    <div className="logo-container">
                        <img src={logo} alt="Bulbia logo" className="logo-img" />
                    </div>
                    <h1>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
                    <p className="text-muted">
                        {isLogin
                            ? 'Bienvenido de nuevo a Bulbia.'
                            : 'Regístrate para empezar a construir.'}
                    </p>
                </div>

                {errorMsg && (
                    <div className="alert alert-danger">
                        <AlertCircle className="alert-icon" size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="alert alert-success">
                        <CheckCircle2 className="alert-icon" size={18} />
                        <span>{successMsg}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} className="login-form">
                    <div className="form-group">
                        <label>Correo Electrónico</label>
                        <div className="input-with-icon">
                            <Mail className="input-icon" size={18} />
                            <input
                                type="email"
                                className="input-field"
                                placeholder="tu@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Contraseña</label>
                        <div className="input-with-icon">
                            <Lock className="input-icon" size={18} />
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label>Confirmar Contraseña</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                        {loading ? 'Procesando...' : (isLogin ? 'Entrar ahora' : 'Registrar mi cuenta')} <ArrowRight size={18} />
                    </button>
                </form>

                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-slate-200/50"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">o continuar con</span>
                    <div className="flex-grow border-t border-slate-200/50"></div>
                </div>

                <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all font-medium py-2.5 rounded-lg mb-6 shadow-sm disabled:opacity-70"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                        </g>
                    </svg>
                    Google
                </button>

                <div className="login-footer">
                    <p>
                        {isLogin ? '¿No tienes cuenta todavía? ' : '¿Ya tienes una cuenta? '}
                        <button
                            type="button"
                            className="text-primary hover:underline font-bold"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setErrorMsg('');
                                setSuccessMsg('');
                            }}
                        >
                            {isLogin ? 'Crear una cuenta' : 'Identifícate'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
