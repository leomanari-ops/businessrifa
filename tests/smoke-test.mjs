const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const stamp = Date.now();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${data.message || 'erro sem mensagem'}`);
  }
  return data;
}

async function main() {
  const health = await request('/api/health');
  assert(health.status === 'ok', 'API health nao retornou ok');

  const admin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@businessrifa.local', password: 'admin123' })
  });
  assert(admin.user.role === 'admin', 'Login admin falhou');

  const customer = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: `Cliente Smoke ${stamp}`,
      email: `smoke-${stamp}@businessrifa.local`,
      phone: '(85) 90000-0000',
      password: '123456'
    })
  });
  assert(customer.token, 'Cadastro/login cliente falhou');

  const drawAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const raffle = await request('/api/raffles', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({
      title: `Smoke Rifa ${stamp}`,
      description: 'Rifa criada pelo teste automatico.',
      prize: 'Premio smoke',
      imageUrl: 'https://example.com/smoke.jpg',
      price: 1.99,
      totalNumbers: 10,
      drawAt
    })
  });
  assert(raffle.id, 'Cadastro de rifa falhou');

  const edited = await request(`/api/raffles/${raffle.id}`, {
    method: 'PATCH',
    token: admin.token,
    body: JSON.stringify({
      title: `Smoke Rifa Editada ${stamp}`,
      description: 'Rifa editada pelo teste automatico.',
      prize: 'Premio smoke editado',
      imageUrl: 'https://example.com/smoke-editado.jpg',
      price: 2.49,
      totalNumbers: 12,
      drawAt
    })
  });
  assert(edited.title.includes('Editada'), 'Edicao de rifa falhou');

  const reservation = await request('/api/reservations', {
    method: 'POST',
    token: customer.token,
    body: JSON.stringify({ raffleId: raffle.id, numbers: [1] })
  });
  assert(reservation.reservations?.[0]?.id, 'Compra/reserva de numeros falhou');
  assert(reservation.reservations[0].pix_code.includes('PIX COPIA E COLA'), 'Pix copia e cola nao foi gerado');

  let customerConfirmBlocked = false;
  try {
    await request(`/api/reservations/${reservation.reservations[0].id}/pay`, {
      method: 'POST',
      token: customer.token
    });
  } catch {
    customerConfirmBlocked = true;
  }
  assert(customerConfirmBlocked, 'Cliente nao deveria confirmar pagamento Pix');

  const paid = await request(`/api/reservations/${reservation.reservations[0].id}/pay`, {
    method: 'POST',
    token: admin.token
  });
  assert(paid.message.includes('confirmado'), 'Confirmacao Pix pelo admin falhou');

  const drawn = await request(`/api/raffles/${raffle.id}/draw`, {
    method: 'POST',
    token: admin.token
  });
  assert(drawn.status === 'drawn', 'Sorteio falhou');
  assert(drawn.winner_number, 'Sorteio nao retornou numero vencedor');

  const mine = await request('/api/account/reservations', { token: customer.token });
  assert(mine.reservations.some((item) => item.raffle_id === raffle.id), 'Area do cliente nao listou reserva');

  const dashboard = await request('/api/admin/dashboard', { token: admin.token });
  assert(dashboard.finance, 'Painel administrativo sem financeiro');
  assert(dashboard.reservations.some((item) => item.raffle_id === raffle.id), 'Painel administrativo sem reserva criada');
  assert((dashboard.emails || []).length >= 2, 'E-mails automaticos nao foram registrados');

  const rental = await request('/api/rental/checkout', { method: 'POST' });
  assert(rental.checkout?.payload?.handle === 'cicero-leandro-dos', 'Payload InfinitePay sem handle esperado');
  assert(rental.checkout.payload.items[0].price === 5999, 'Payload InfinitePay sem preco 5999');

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    tested: ['api', 'login', 'cadastro', 'rifa', 'edicao', 'compra', 'pix', 'admin', 'sorteio', 'emails', 'infinitepay']
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

