import { useState } from 'react';
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

    return (
        <div className="login-container">
            {/* Background decorations */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            <div className="login-card glass-panel">
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
