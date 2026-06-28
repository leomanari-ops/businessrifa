import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Check,
  Copy,
  Crown,
  Edit3,
  FileText,
  Gauge,
  Gem,
  ImagePlus,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  UserPlus,
  Wallet
} from 'lucide-react';
import './styles.css';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const defaultRentalPrice = 59.99;
const brandName = 'businessrifa';
const companyName = 'businessrifa';
const developerName = 'Leandro Santos';
const officialSite = 'Configure seu dominio publico';
const copyrightText = 'Copyright 2026 Todos os direitos reservados.';
const contactEmail = 'businessrifa@hotmail.com';
const maxNumbers = 500000;
const numberPageSize = 500;

function numberLabel(number, total = maxNumbers) {
  return String(number).padStart(String(total).length, '0');
}

function toDateTimeInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function imageFileToDataUrl(file, maxSize = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!file.type.startsWith('image/')) return reject(new Error('Selecione um arquivo de imagem.'));
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function api(path, options = {}) {
  const token = localStorage.getItem('rifa-token');
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Nao foi possivel concluir a operacao.');
  return data;
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AuthCard({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'admin@businessrifa.local', phone: '', password: 'admin123' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      localStorage.setItem('rifa-token', data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-brand">
        <div className="brand-mark"><Gem size={28} /></div>
        <h1>{brandName}</h1>
        <p>Bem-vindo a plataforma premium para criar campanhas de rifa com identidade roxa, dourada e preta, reserva de numeros, Pix, sorteio automatico e painel financeiro.</p>
      </div>
      <form className="card auth-form" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            <Lock size={16} /> Login
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            <UserPlus size={16} /> Cadastro
          </button>
        </div>
        {mode === 'register' && (
          <>
            <label>Nome completo<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          </>
        )}
        <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Senha<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        {error && <div className="alert">{error}</div>}
        <button className="primary" type="submit">{mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        <small>Acesso demo {brandName}: admin@businessrifa.local / admin123</small>
      </form>
    </section>
  );
}

function paymentSettingsFrom(settings = {}) {
  return {
    rentalMonthlyPrice: Number(settings.rentalMonthlyPrice || defaultRentalPrice) || defaultRentalPrice,
    provider: settings.paymentProvider || 'pix',
    infinitePayPaymentLink: settings.infinitePayPaymentLink || ''
  };
}

function PricingSection({ settings }) {
  const { rentalMonthlyPrice } = paymentSettingsFrom(settings);
  const [checkoutMessage, setCheckoutMessage] = useState('');

  async function startRentalCheckout() {
    setCheckoutMessage('');
    try {
      const data = await api('/api/rental/checkout', { method: 'POST' });
      if (data.checkout?.checkoutUrl) {
        window.open(data.checkout.checkoutUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      setCheckoutMessage('Checkout InfinitePay preparado, mas configure a URL da API ou o link de pagamento no Admin.');
    } catch (error) {
      setCheckoutMessage(error.message);
    }
  }

  return (
    <section className="pricing-band" id="planos">
      <div className="pricing-copy">
        <span><ShieldCheck size={16} /> Locacao do sistema</span>
        <h2>Alugue sua propria rifa online por {currency.format(rentalMonthlyPrice)} ao mes.</h2>
        <p>Ideal para organizadores que querem criar seus proprios sorteios com painel administrativo, reservas de numeros, Pix copia e cola, controle financeiro e sorteio automatico.</p>
      </div>
      <div className="price-card">
        <small>Plano mensal</small>
        <strong>{currency.format(rentalMonthlyPrice)}</strong>
        <span>sem taxa de instalacao</span>
        <button type="button" onClick={startRentalCheckout}>Assinar com InfinitePay</button>
        <a href={`mailto:${contactEmail}?subject=Quero%20locar%20o%20businessrifa`}>Falar com atendimento</a>
        {checkoutMessage && <small className="price-message">{checkoutMessage}</small>}
      </div>
    </section>
  );
}

function DirectionPanel({ user, setView, scrollToSection }) {
  const actions = [
    {
      icon: Ticket,
      title: 'Comprar numeros',
      text: 'Veja a rifa ativa, escolha os numeros e gere o Pix copia e cola.',
      label: 'Ir para numeros',
      onClick: () => scrollToSection('rifas-disponiveis')
    },
    {
      icon: Lock,
      title: user ? 'Minha area' : 'Entrar ou cadastrar',
      text: user ? 'Atualize seus dados de participante e acompanhe suas reservas.' : 'Crie sua conta para reservar numeros com seguranca.',
      label: user ? 'Abrir cliente' : 'Criar acesso',
      onClick: () => setView(user ? 'cliente' : 'login')
    },
    {
      icon: Gauge,
      title: 'Criar e administrar rifa',
      text: 'Cadastre premios, fotos, valores, acompanhe pagamentos e execute sorteios.',
      label: user?.role === 'admin' ? 'Abrir admin' : 'Entrar como admin',
      onClick: () => setView(user?.role === 'admin' ? 'admin' : 'login')
    },
    {
      icon: FileText,
      title: 'Google Search',
      text: 'Confira robots, sitemap, politicas e passos para enviar o site ao Google.',
      label: 'Ver preparo',
      onClick: () => scrollToSection('google-search')
    }
  ];

  return (
    <section className="direction-panel" aria-label="Atalhos principais do sistema">
      {actions.map(({ icon: Icon, title, text, label, onClick }) => (
        <article className="action-card" key={title}>
          <Icon size={22} />
          <h3>{title}</h3>
          <p>{text}</p>
          <button type="button" onClick={onClick}>{label} <ArrowRight size={16} /></button>
        </article>
      ))}
    </section>
  );
}

function GoogleSearchSection({ settings, scrollToSection }) {
  const configuredSite = settings?.officialSite && !settings.officialSite.includes('Configure') ? settings.officialSite : 'https://seu-dominio.com.br';

  return (
    <section className="google-section" id="google-search">
      <div className="google-copy">
        <span><ShieldCheck size={16} /> Pronto para Google Search</span>
        <h2>Arquivos publicos preparados para indexacao.</h2>
        <p>Depois de publicar em um dominio com HTTPS, envie o sitemap abaixo no Google Search Console. O servidor gera robots e sitemap automaticamente usando o dominio acessado.</p>
      </div>
      <div className="google-links">
        <a href="/robots.txt" target="_blank" rel="noreferrer">Abrir robots.txt</a>
        <a href="/sitemap.xml" target="_blank" rel="noreferrer">Abrir sitemap.xml</a>
        <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Abrir Search Console</a>
      </div>
      <div className="seo-checklist">
        <span><Check size={16} /> Titulo, descricao, Open Graph e dados estruturados no HTML.</span>
        <span><Check size={16} /> Politica de privacidade e termos acessiveis por botoes.</span>
        <span><Check size={16} /> Sitemap para enviar: {configuredSite}/sitemap.xml</span>
        <span><Check size={16} /> Robots para conferir: {configuredSite}/robots.txt</span>
      </div>
      <button className="primary" type="button" onClick={() => scrollToSection('planos')}>Ver plano de locacao</button>
    </section>
  );
}

function RaffleDetail({ raffle, user, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [jumpNumber, setJumpNumber] = useState('');

  useEffect(() => {
    api(`/api/raffles/${raffle.id}`).then(setDetail).catch((error) => setMessage(error.message));
  }, [raffle.id]);

  const activeRaffle = detail?.raffle || raffle;
  const reserved = useMemo(() => new Map((detail?.numbers || []).map((item) => [item.number, item])), [detail]);
  const pageCount = Math.max(1, Math.ceil(activeRaffle.total_numbers / numberPageSize));
  const safePage = Math.min(page, pageCount);
  const startNumber = (safePage - 1) * numberPageSize + 1;
  const endNumber = Math.min(activeRaffle.total_numbers, startNumber + numberPageSize - 1);
  const numbers = Array.from({ length: endNumber - startNumber + 1 }, (_, index) => startNumber + index);

  function toggle(number) {
    if (reserved.has(number) || activeRaffle.status !== 'active') return;
    setSelected((current) => (current.includes(number) ? current.filter((item) => item !== number) : [...current, number].slice(0, 20)));
  }

  function goToNumber(event) {
    event.preventDefault();
    const target = Number(jumpNumber);
    if (!Number.isInteger(target) || target < 1 || target > activeRaffle.total_numbers) {
      setMessage(`Digite um numero entre 1 e ${activeRaffle.total_numbers}.`);
      return;
    }
    setPage(Math.ceil(target / numberPageSize));
    setJumpNumber('');
    setMessage('');
  }

  async function reserve() {
    setMessage('');
    try {
      const data = await api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ raffleId: activeRaffle.id, numbers: selected })
      });
      setCheckout(data);
      setSelected([]);
      setDetail(await api(`/api/raffles/${activeRaffle.id}`));
      onRefresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function confirmPayment(id) {
    try {
      const data = await api(`/api/reservations/${id}/pay`, { method: 'POST' });
      setMessage(data.message);
      setCheckout(null);
      setDetail(await api(`/api/raffles/${activeRaffle.id}`));
      onRefresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="detail-grid">
      <div className="card raffle-hero">
        <img src={activeRaffle.image_url} alt={activeRaffle.prize} />
        <div>
          <span className={`status ${activeRaffle.status}`}>{activeRaffle.status === 'drawn' ? 'Sorteada' : 'Ativa'}</span>
          <h2>{activeRaffle.title}</h2>
          <p>{activeRaffle.description}</p>
          <div className="hero-stats">
            <Stat icon={Ticket} label="Numero" value={currency.format(activeRaffle.price)} />
            <Stat icon={Check} label="Pagos" value={`${activeRaffle.paid}/${activeRaffle.total_numbers}`} />
            <Stat icon={Wallet} label="Arrecadado" value={currency.format(activeRaffle.revenue)} />
          </div>
          {activeRaffle.winner_number && (
            <div className="winner">
              <Crown size={20} />
              Numero vencedor {numberLabel(activeRaffle.winner_number, activeRaffle.total_numbers)} - {activeRaffle.winner?.name}
            </div>
          )}
        </div>
      </div>

      <div className="card picker">
        <div className="section-title">
          <h3>Reserva de numeros</h3>
          <strong>{selected.length ? currency.format(selected.length * activeRaffle.price) : 'Selecione'}</strong>
        </div>
        <form className="number-tools" onSubmit={goToNumber}>
          <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
          <span>{numberLabel(startNumber, activeRaffle.total_numbers)} a {numberLabel(endNumber, activeRaffle.total_numbers)} de {activeRaffle.total_numbers.toLocaleString('pt-BR')}</span>
          <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Proximo</button>
          <input type="number" min="1" max={activeRaffle.total_numbers} placeholder="Ir para numero" value={jumpNumber} onChange={(event) => setJumpNumber(event.target.value)} />
          <button type="submit">Buscar</button>
        </form>
        {!!selected.length && (
          <div className="selected-strip">
            {selected.map((number) => <button type="button" key={number} onClick={() => toggle(number)}>{numberLabel(number, activeRaffle.total_numbers)}</button>)}
          </div>
        )}
        <div className="number-grid">
          {numbers.map((number) => {
            const info = reserved.get(number);
            const className = info?.status === 'paid' ? 'paid' : info ? 'reserved' : selected.includes(number) ? 'selected' : '';
            return (
              <button key={number} className={className} type="button" onClick={() => toggle(number)}>
                {numberLabel(number, activeRaffle.total_numbers)}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i /> Livre</span><span><i className="sel" /> Selecionado</span><span><i className="res" /> Reservado</span><span><i className="pay" /> Pago</span>
        </div>
        {message && <div className="notice">{message}</div>}
        <button className="primary" disabled={!user || !selected.length} onClick={reserve}>Reservar e gerar Pix</button>
      </div>

      {checkout && (
        <div className="card checkout">
          <div className="section-title">
            <h3>Pagamento Pix</h3>
            <strong>{currency.format(checkout.total)}</strong>
          </div>
          {checkout.checkout?.checkoutUrl && (
            <a className="checkout-link" href={checkout.checkout.checkoutUrl} target="_blank" rel="noreferrer">
              Pagar agora pela InfinitePay <ArrowRight size={16} />
            </a>
          )}
          {checkout.checkoutError && <div className="notice">InfinitePay indisponivel: {checkout.checkoutError}. Use o Pix copia e cola abaixo.</div>}
          {checkout.reservations.map((item) => (
            <div className="pix-row" key={item.id}>
              <span>Numero {numberLabel(item.number, activeRaffle.total_numbers)}</span>
              <code>{item.pix_code}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(item.pix_code)}><Copy size={16} /> Copiar</button>
              {user?.role === 'admin' ? (
                <button className="success" type="button" onClick={() => confirmPayment(item.id)}><Check size={16} /> Confirmar Pix</button>
              ) : (
                <span className="payment-status">Aguardando admin</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminPanel({ onRefresh }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: '', prize: '', price: 5, totalNumbers: maxNumbers, drawAt: '', imageUrl: '' });
  const [editingRaffle, setEditingRaffle] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const dashboard = await api('/api/admin/dashboard');
    setData(dashboard);
    setSettingsForm({
      paymentProvider: dashboard.settings?.paymentProvider || 'infinitepay',
      rentalMonthlyPrice: dashboard.settings?.rentalMonthlyPrice || '59.99',
      contactEmail: dashboard.settings?.contactEmail || contactEmail,
      pixKey: dashboard.settings?.pixKey || '',
      pixMerchant: dashboard.settings?.pixMerchant || '',
      city: dashboard.settings?.city || '',
      infinitePayHandle: dashboard.settings?.infinitePayHandle || 'cicero-leandro-dos',
      infinitePayMonthlyDescription: dashboard.settings?.infinitePayMonthlyDescription || 'Produto de Exemplo',
      infinitePayApiUrl: dashboard.settings?.infinitePayApiUrl || '',
      infinitePayApiToken: '',
      infinitePayPaymentLink: dashboard.settings?.infinitePayPaymentLink || '',
      infinitePayWebhookSecret: ''
    });
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function createRaffle(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/api/raffles', { method: 'POST', body: JSON.stringify(form) });
      setForm({ title: '', prize: '', price: 5, totalNumbers: maxNumbers, drawAt: '', imageUrl: '' });
      setEditingRaffle(null);
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function draw(id) {
    try {
      await api(`/api/raffles/${id}/draw`, { method: 'POST' });
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmReservation(id) {
    setError('');
    try {
      await api(`/api/reservations/${id}/pay`, { method: 'POST' });
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function chooseRaffleImage(event) {
    setError('');
    try {
      const imageUrl = await imageFileToDataUrl(event.target.files?.[0]);
      if (imageUrl) setForm((current) => ({ ...current, imageUrl }));
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
    }
  }

  function startEditRaffle(item) {
    setError('');
    setEditingRaffle({
      id: item.id,
      title: item.title,
      description: item.description,
      prize: item.prize,
      price: item.price,
      totalNumbers: item.total_numbers,
      drawAt: toDateTimeInputValue(item.draw_at),
      imageUrl: item.image_url,
      hasReservations: Number(item.paid || 0) + Number(item.reserved || 0) > 0
    });
  }

  async function chooseEditRaffleImage(event) {
    setError('');
    try {
      const imageUrl = await imageFileToDataUrl(event.target.files?.[0]);
      if (imageUrl) setEditingRaffle((current) => ({ ...current, imageUrl }));
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
    }
  }

  async function saveEditedRaffle(event) {
    event.preventDefault();
    if (!editingRaffle) return;
    setError('');
    try {
      const body = {
        ...editingRaffle,
        drawAt: editingRaffle.drawAt ? new Date(editingRaffle.drawAt).toISOString() : ''
      };
      await api(`/api/raffles/${editingRaffle.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditingRaffle(null);
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteRaffle(id) {
    setError('');
    if (!window.confirm('Apagar esta rifa? Esta acao so sera permitida se ela nao tiver reservas.')) return;
    try {
      await api(`/api/raffles/${id}`, { method: 'DELETE' });
      if (editingRaffle?.id === id) setEditingRaffle(null);
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setError('');
    try {
      const body = {
        ...settingsForm,
        rentalMonthlyPrice: String(Number(String(settingsForm.rentalMonthlyPrice).replace(',', '.')) || defaultRentalPrice)
      };
      if (!body.infinitePayApiToken) delete body.infinitePayApiToken;
      if (!body.infinitePayWebhookSecret) delete body.infinitePayWebhookSecret;
      await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(body) });
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) return <div className="card">Carregando painel administrativo...</div>;

  return (
    <section className="admin-grid">
      <div className="card finance">
        <div className="section-title"><h3>Painel administrativo {brandName}</h3><BarChart3 size={20} /></div>
        <div className="metrics">
          <Stat icon={Banknote} label="Receita confirmada" value={currency.format(data.finance.revenue)} />
          <Stat icon={Wallet} label="Pix pendente" value={currency.format(data.finance.pending)} />
          <Stat icon={Ticket} label="Numeros pagos" value={data.finance.paidNumbers} />
        </div>
        <div className="table">
          {data.finance.entries.map((entry) => (
            <div className="table-row" key={entry.id}>
              <span>{entry.description}</span>
              <strong>{currency.format(entry.amount)}</strong>
            </div>
          ))}
        </div>
      </div>

      <form className="card admin-form" onSubmit={createRaffle}>
        <div className="section-title"><h3>Nova rifa</h3><Plus size={20} /></div>
        <input placeholder="Titulo da rifa" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input placeholder="Premio" value={form.prize} onChange={(event) => setForm({ ...form, prize: event.target.value })} />
        <label className="upload-field">
          <span><ImagePlus size={18} /> Foto da rifa</span>
          <input type="file" accept="image/*" onChange={chooseRaffleImage} />
        </label>
        {form.imageUrl && <img className="image-preview" src={form.imageUrl} alt="Previa da rifa" />}
        <div className="form-line">
          <input type="number" min="1" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <input type="number" min="10" max={maxNumbers} value={form.totalNumbers} onChange={(event) => setForm({ ...form, totalNumbers: event.target.value })} />
        </div>
        <input type="datetime-local" value={form.drawAt} onChange={(event) => setForm({ ...form, drawAt: event.target.value ? new Date(event.target.value).toISOString() : '' })} />
        {error && <div className="alert">{error}</div>}
        <button className="primary" type="submit">Criar rifa</button>
      </form>

      {editingRaffle && (
        <form className="card admin-form edit-raffle-form" onSubmit={saveEditedRaffle}>
          <div className="section-title">
            <h3>Editar premio da rifa</h3>
            <button className="icon-action" type="button" onClick={() => setEditingRaffle(null)}>Fechar</button>
          </div>
          <input placeholder="Titulo da rifa" value={editingRaffle.title} onChange={(event) => setEditingRaffle({ ...editingRaffle, title: event.target.value })} />
          <input placeholder="Premio" value={editingRaffle.prize} onChange={(event) => setEditingRaffle({ ...editingRaffle, prize: event.target.value })} />
          <input placeholder="Descricao" value={editingRaffle.description} onChange={(event) => setEditingRaffle({ ...editingRaffle, description: event.target.value })} />
          <label className="upload-field">
            <span><ImagePlus size={18} /> Trocar foto do premio</span>
            <input type="file" accept="image/*" onChange={chooseEditRaffleImage} />
          </label>
          {editingRaffle.imageUrl && <img className="image-preview" src={editingRaffle.imageUrl} alt="Previa do premio" />}
          <div className="form-line">
            <input type="number" min="1" step="0.01" value={editingRaffle.price} onChange={(event) => setEditingRaffle({ ...editingRaffle, price: event.target.value })} />
            <input type="number" min="10" max={maxNumbers} value={editingRaffle.totalNumbers} onChange={(event) => setEditingRaffle({ ...editingRaffle, totalNumbers: event.target.value })} />
          </div>
          <input type="datetime-local" value={editingRaffle.drawAt} onChange={(event) => setEditingRaffle({ ...editingRaffle, drawAt: event.target.value })} />
          {editingRaffle.hasReservations && <small>Esta rifa ja tem reservas. A quantidade minima sera preservada para manter o historico.</small>}
          <button className="primary" type="submit">Salvar alteracoes</button>
        </form>
      )}

      {settingsForm && (
        <form className="card admin-form payment-form" onSubmit={saveSettings}>
          <div className="section-title"><h3>Pagamentos e mensalidade</h3><Wallet size={20} /></div>
          <label>Mensalidade do sistema
            <input value={settingsForm.rentalMonthlyPrice} onChange={(event) => setSettingsForm({ ...settingsForm, rentalMonthlyPrice: event.target.value })} />
          </label>
          <label>E-mail de atendimento
            <input type="email" value={settingsForm.contactEmail} onChange={(event) => setSettingsForm({ ...settingsForm, contactEmail: event.target.value })} />
          </label>
          <label>Provedor de pagamento
            <select value={settingsForm.paymentProvider} onChange={(event) => setSettingsForm({ ...settingsForm, paymentProvider: event.target.value })}>
              <option value="infinitepay">InfinitePay</option>
              <option value="pix">Somente Pix copia e cola</option>
            </select>
          </label>
          <label>URL da API InfinitePay
            <input placeholder="Endpoint de criacao de cobranca/link" value={settingsForm.infinitePayApiUrl} onChange={(event) => setSettingsForm({ ...settingsForm, infinitePayApiUrl: event.target.value })} />
          </label>
          <label>Handle InfinitePay
            <input value={settingsForm.infinitePayHandle} onChange={(event) => setSettingsForm({ ...settingsForm, infinitePayHandle: event.target.value })} />
          </label>
          <label>Descricao da mensalidade
            <input value={settingsForm.infinitePayMonthlyDescription} onChange={(event) => setSettingsForm({ ...settingsForm, infinitePayMonthlyDescription: event.target.value })} />
          </label>
          <label>Token da API InfinitePay
            <input type="password" placeholder={data.settings.infinitePayApiTokenConfigured ? 'Token ja configurado' : 'Cole seu token da InfinitePay'} value={settingsForm.infinitePayApiToken} onChange={(event) => setSettingsForm({ ...settingsForm, infinitePayApiToken: event.target.value })} />
          </label>
          <label>Link de pagamento InfinitePay
            <input placeholder="Link fixo de pagamento, se usar checkout por link" value={settingsForm.infinitePayPaymentLink} onChange={(event) => setSettingsForm({ ...settingsForm, infinitePayPaymentLink: event.target.value })} />
          </label>
          <div className="form-line">
            <label>Chave Pix<input value={settingsForm.pixKey} onChange={(event) => setSettingsForm({ ...settingsForm, pixKey: event.target.value })} /></label>
            <label>Nome Pix<input value={settingsForm.pixMerchant} onChange={(event) => setSettingsForm({ ...settingsForm, pixMerchant: event.target.value })} /></label>
          </div>
          <label>Cidade Pix
            <input value={settingsForm.city} onChange={(event) => setSettingsForm({ ...settingsForm, city: event.target.value })} />
          </label>
          <button className="primary" type="submit">Salvar configuracoes</button>
          <small>{data.settings.infinitePayApiTokenConfigured ? 'Token InfinitePay configurado com seguranca no servidor.' : 'Cole o token da sua conta InfinitePay para ativar a API.'}</small>
        </form>
      )}

      <div className="card">
        <div className="section-title"><h3>Gestao de sorteios</h3><Gauge size={20} /></div>
        <div className="table">
          {data.raffles.map((item) => (
            <div className="table-row raffle-row" key={item.id}>
              <span className="raffle-admin-summary">
                <img src={item.image_url} alt={item.prize} />
                <span>
                  {item.title}
                  <small>{item.prize} - {item.paid} pagos - sorteio {dateTime.format(new Date(item.draw_at))}</small>
                </span>
              </span>
              <div className="row-actions">
                <button type="button" onClick={() => startEditRaffle(item)}><Edit3 size={15} /> Editar</button>
                <button type="button" disabled={item.status === 'drawn'} onClick={() => draw(item.id)}>Sortear</button>
                <button type="button" disabled={Number(item.paid || 0) + Number(item.reserved || 0) > 0} onClick={() => deleteRaffle(item.id)}><Trash2 size={15} /> Apagar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title"><h3>Reservas recentes</h3><Ticket size={20} /></div>
        <div className="table">
          {data.reservations.map((item) => (
            <div className="table-row reservation-row" key={item.id}>
              <span>
                {item.customer} - {item.raffleTitle}
                <small>Numero {item.number} - {currency.format(item.amount)} - {item.status === 'paid' ? 'Pago' : 'Pendente'}</small>
              </span>
              <button type="button" disabled={item.status === 'paid'} onClick={() => confirmReservation(item.id)}>
                {item.status === 'paid' ? 'Confirmado' : 'Confirmar Pix'}
              </button>
            </div>
          ))}
          {!data.reservations.length && <div className="empty-line">Nenhuma reserva registrada.</div>}
        </div>
      </div>

      <div className="card email-card">
        <div className="section-title"><h3>Emails automaticos</h3><Mail size={20} /></div>
        <div className="email-template">
          <strong>Boas-vindas</strong>
          <p>Bem-vindo ao {brandName}. Sua conta foi criada com sucesso para participar ou administrar campanhas premium.</p>
        </div>
        <div className="email-template">
          <strong>Reserva confirmada</strong>
          <p>Seus numeros foram reservados no {brandName}. Finalize o pagamento Pix para validar sua participacao.</p>
        </div>
        <div className="email-template">
          <strong>Pagamento recebido</strong>
          <p>Pagamento confirmado. Obrigado por participar com seguranca pela plataforma {brandName}.</p>
        </div>
      </div>
    </section>
  );
}

function ClientPanel({ user, onUserUpdate }) {
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', photoUrl: user?.photoUrl || '' });
  const [reservations, setReservations] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({ name: user?.name || '', phone: user?.phone || '', photoUrl: user?.photoUrl || '' });
  }, [user]);

  async function loadReservations() {
    const data = await api('/api/account/reservations');
    setReservations(data.reservations || []);
  }

  useEffect(() => {
    if (user) loadReservations().catch((error) => setMessage(error.message));
  }, [user]);

  async function choosePhoto(event) {
    setMessage('');
    try {
      const photoUrl = await imageFileToDataUrl(event.target.files?.[0], 700, 0.84);
      if (photoUrl) setForm((current) => ({ ...current, photoUrl }));
    } catch (err) {
      setMessage(err.message);
    } finally {
      event.target.value = '';
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage('');
    try {
      const data = await api('/api/account', { method: 'PATCH', body: JSON.stringify(form) });
      onUserUpdate(data.user);
      setMessage('Dados do cliente atualizados com sucesso.');
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="client-grid">
      <form className="card client-card" onSubmit={saveProfile}>
        <div className="section-title"><h3>Aba do cliente</h3><ImagePlus size={20} /></div>
        <div className="profile-photo">
          {form.photoUrl ? <img src={form.photoUrl} alt={form.name || 'Cliente'} /> : <Gem size={54} />}
        </div>
        <label className="upload-field">
          <span><ImagePlus size={18} /> Editar foto do cliente</span>
          <input type="file" accept="image/*" onChange={choosePhoto} />
        </label>
        <label>Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        {message && <div className="notice">{message}</div>}
        <button className="primary" type="submit">Salvar dados do cliente</button>
      </form>
      <div className="card client-card">
        <div className="section-title"><h3>Minhas reservas</h3><Ticket size={20} /></div>
        <div className="table">
          {reservations.map((item) => (
            <div className="table-row reservation-row" key={item.id}>
              <span>
                {item.raffleTitle}
                <small>Numero {numberLabel(item.number, item.totalNumbers)} - {currency.format(item.amount)}</small>
              </span>
              <strong className={`status-pill ${item.status}`}>{item.status === 'paid' ? 'Pago' : 'Pendente'}</strong>
            </div>
          ))}
          {!reservations.length && <div className="empty-line">Voce ainda nao possui reservas.</div>}
        </div>
      </div>
    </section>
  );
}

function PrivacyPolicy({ email }) {
  return (
    <section className="card policy">
      <div className="section-title"><h2>Politica de privacidade</h2><ShieldCheck size={22} /></div>
      <p>A {companyName} coleta dados de cadastro, contato, reservas, pagamentos e historico de participacao para operar rifas online, confirmar pagamentos Pix, prevenir fraudes, cumprir obrigacoes legais e prestar suporte.</p>
      <p>Os dados podem ser usados para identificar participantes, registrar numeros escolhidos, apurar vencedores e manter demonstrativos administrativos e financeiros. Nao vendemos dados pessoais.</p>
      <p>As informacoes ficam armazenadas em banco SQLite no ambiente do sistema. O acesso administrativo deve ser protegido por senha forte e concedido apenas a pessoas autorizadas.</p>
      <p>O participante pode solicitar correcao, exclusao ou informacoes sobre seus dados pelo e-mail <a href={`mailto:${email}`}>{email}</a>. Alguns registros podem ser mantidos quando necessarios para auditoria, seguranca, comprovacao de pagamento ou obrigacao legal.</p>
      <p>Ao criar conta, reservar numeros ou confirmar pagamento, o usuario declara ciencia desta politica e das regras publicadas em cada rifa da {brandName}.</p>
      <p>Empresa: {companyName}. Desenvolvido por: {developerName}. Site Oficial: {officialSite}. {copyrightText}</p>
    </section>
  );
}

function TermsOfUse() {
  return (
    <section className="card policy">
      <div className="section-title"><h2>Termos de uso</h2><Scale size={22} /></div>
      <p>Ao usar a {brandName}, o usuario concorda em informar dados verdadeiros, respeitar as regras de cada campanha e utilizar a plataforma apenas para finalidades licitas.</p>
      <p>As reservas de numeros dependem de disponibilidade no momento da confirmacao. O pagamento Pix deve ser confirmado para validar a participacao no sorteio.</p>
      <p>O organizador e responsavel pela descricao da campanha, premio, prazos, entrega ao vencedor e cumprimento das normas aplicaveis ao sorteio ou acao promocional.</p>
      <p>A {companyName} oferece a tecnologia para gestao de campanhas, painel administrativo, controle financeiro, reservas, pagamentos e sorteio automatico, sem assumir responsabilidade por informacoes publicadas por terceiros.</p>
      <p>Empresa: {companyName}. Desenvolvido por: {developerName}. Site Oficial: {officialSite}. {copyrightText}</p>
    </section>
  );
}

function AppFooter({ setView }) {
  return (
    <footer className="site-footer">
      <div>
        <strong>{brandName}</strong>
        <span>Empresa: {companyName}</span>
        <span>Desenvolvido por: {developerName}</span>
      </div>
      <div>
        <span>Site Oficial: {officialSite}</span>
        <span>{copyrightText}</span>
      </div>
      <div className="footer-links">
        <button type="button" onClick={() => setView('privacy')}><FileText size={16} /> Privacidade</button>
        <button type="button" onClick={() => setView('terms')}><Scale size={16} /> Termos</button>
      </div>
    </footer>
  );
}

function App() {
  const [boot, setBoot] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('rifas');
  const [activeId, setActiveId] = useState(null);

  async function load() {
    const data = await api('/api/bootstrap');
    setBoot(data);
    setUser(data.user);
    setActiveId((current) => current || data.raffles[0]?.id);
  }

  useEffect(() => { load().catch(() => setBoot({ raffles: [], settings: { contactEmail } })); }, []);

  function logout() {
    localStorage.removeItem('rifa-token');
    setUser(null);
  }

  function scrollToSection(id) {
    setView('rifas');
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  }

  if (!boot) return <main className="loading">Carregando {brandName}...</main>;
  const active = boot.raffles.find((item) => item.id === activeId) || boot.raffles[0];

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="logo-gem"><Gem size={22} /></span><strong>{boot.settings.brand || brandName}</strong></div>
        <nav>
          <button className={view === 'rifas' ? 'active' : ''} onClick={() => scrollToSection('inicio')}>Inicio</button>
          <button onClick={() => scrollToSection('rifas-disponiveis')}>Comprar numeros</button>
          {user && <button className={view === 'cliente' ? 'active' : ''} onClick={() => setView('cliente')}>Cliente</button>}
          {user?.role === 'admin' && <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Admin</button>}
          <button onClick={() => scrollToSection('planos')}>Planos</button>
          <button onClick={() => scrollToSection('google-search')}>Google</button>
          <button className={view === 'privacy' ? 'active' : ''} onClick={() => setView('privacy')}>Privacidade</button>
          <button className={view === 'terms' ? 'active' : ''} onClick={() => setView('terms')}>Termos</button>
        </nav>
        <div className="account">
          {user ? (
            <>
              <span>{user.name}</span>
              <button type="button" onClick={logout} title="Sair"><LogOut size={18} /></button>
            </>
          ) : (
            <button type="button" onClick={() => setView('login')}>Entrar</button>
          )}
        </div>
      </header>

      {!user && view === 'login' && <AuthCard onAuth={(authUser) => { setUser(authUser); load(); setView('rifas'); }} />}

      {view === 'rifas' && (
        <>
          <section className="headline" id="inicio">
            <div>
              <span><Sparkles size={16} /> Bem-vindo ao {brandName}</span>
              <h1>Crie sua <em>rifa</em> em minutos!</h1>
              <p>Venda numeros online com uma identidade premium em roxo, dourado e preto, receba via Pix, acompanhe tudo pelo painel e sorteie com transparencia.</p>
              <div className="hero-actions">
                <button className="primary hero-primary" type="button" onClick={() => setView(user ? 'rifas' : 'login')}>
                  Quero participar agora <ArrowRight size={18} />
                </button>
                <button className="ghost-button" type="button" onClick={() => scrollToSection('rifas-disponiveis')}>
                  <Ticket size={18} /> Escolher numeros
                </button>
                <a className="ghost-action" href={`mailto:${contactEmail}?subject=Quero%20saber%20mais%20sobre%20o%20businessrifa`}>
                  <MessageCircle size={18} /> Saber mais
                </a>
              </div>
            </div>
            <div className="diamond-showcase" aria-label="Resumo da plataforma">
              <div className="diamond-core"><Gem size={76} /></div>
              <div className="showcase-metric metric-a">
                <small>Receita confirmada</small>
                <strong>{currency.format(boot.raffles.reduce((sum, item) => sum + item.revenue, 0))}</strong>
              </div>
              <div className="showcase-metric metric-b">
                <small>Plano mensal</small>
                <strong>{currency.format(paymentSettingsFrom(boot.settings).rentalMonthlyPrice)}</strong>
              </div>
            </div>
          </section>
          <DirectionPanel user={user} setView={setView} scrollToSection={scrollToSection} />
          <section className="feature-strip">
            <span><Ticket size={18} /> Reserva de numeros</span>
            <span><Wallet size={18} /> Pix copia e cola</span>
            <span><ShieldCheck size={18} /> Painel seguro</span>
            <span><Crown size={18} /> Sorteio automatico</span>
          </section>
          <PricingSection settings={boot.settings} />
          <section className="raffle-tabs" id="rifas-disponiveis">
            {boot.raffles.map((item) => (
              <button key={item.id} className={active?.id === item.id ? 'active' : ''} onClick={() => setActiveId(item.id)}>
                {item.title}
              </button>
            ))}
          </section>
          {active ? <RaffleDetail raffle={active} user={user} onRefresh={load} /> : <div className="card empty">Nenhuma rifa cadastrada.</div>}
          <GoogleSearchSection settings={boot.settings} scrollToSection={scrollToSection} />
        </>
      )}

      {view === 'admin' && user?.role === 'admin' && <AdminPanel onRefresh={load} />}
      {view === 'cliente' && user && <ClientPanel user={user} onUserUpdate={(updatedUser) => { setUser(updatedUser); load(); }} />}
      {view === 'privacy' && <PrivacyPolicy email={boot.settings.contactEmail || contactEmail} />}
      {view === 'terms' && <TermsOfUse />}
      <AppFooter setView={setView} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
