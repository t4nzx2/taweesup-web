import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { lang, toggleLang, t } = useLang();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      navigate('/');
    } catch {
      setError(t('invalidCredentials'));
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <button onClick={toggleLang} className="lang-switch-btn">
          {lang === 'en' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
        </button>
        <div className="login-brand">
          <div className="logo-box">T</div>
          <h1>Taweesup.Web</h1>
          <p>{t('loginTitle')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{marginBottom: 16}}>
            <label>{t('username')}</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group" style={{marginBottom: 20}}>
            <label>{t('password')}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>
          {error && <p style={{color: 'var(--danger)', marginBottom: 12, fontSize: 13}}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}} disabled={loading}>
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>
        <p style={{marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center'}}>
          {t('demo')}: admin / admin123
        </p>
      </div>
    </div>
  );
}
