# Deploy em producao - businessrifa

Este projeto ja serve frontend e backend no mesmo servidor Node. O caminho mais simples e profissional para comecar e publicar tudo junto em Railway, Render ou VPS.

## 1. Teste local antes de publicar

```bat
npm.cmd install
npm.cmd run build
npm.cmd start
```

Acesse:

- App: `http://127.0.0.1:4173`
- Saude da API: `http://127.0.0.1:4173/api/health`

## 2. Enviar para GitHub

Instale/abra o Git Bash ou PowerShell na pasta do projeto:

```bat
git init
git add .
git commit -m "Sistema businessrifa pronto para producao"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/businessrifa.git
git push -u origin main
```

Antes disso, crie o repositorio vazio no GitHub. Se usar repo privado, faca login no Git quando pedir usuario/token.

## 3. Publicar no Railway

1. Acesse Railway e crie um projeto novo.
2. Escolha `Deploy from GitHub repo`.
3. Selecione o repositorio `businessrifa`.
4. Em variaveis de ambiente, configure:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=4173
```

5. Deploy command/start ja esta preparado por `railway.json`.
6. Abra a URL gerada e teste `/api/health`.

## 4. Publicar no Render

1. Acesse Render e crie um `Web Service`.
2. Conecte o repositorio GitHub.
3. Configure:

```txt
Build Command: npm ci && npm run build
Start Command: npm start
```

4. Variaveis:

```env
NODE_ENV=production
HOST=0.0.0.0
```

5. O arquivo `render.yaml` tambem esta pronto se voce preferir Blueprint.

## 5. Publicar em Hostinger VPS ou outro VPS

No servidor:

```bash
sudo apt update
sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
git clone https://github.com/SEU-USUARIO/businessrifa.git
cd businessrifa
npm ci
npm run build
HOST=0.0.0.0 PORT=4173 NODE_ENV=production npm start
```

Para manter rodando, use PM2:

```bash
sudo npm install -g pm2
HOST=0.0.0.0 PORT=4173 NODE_ENV=production pm2 start server/server.mjs --name businessrifa
pm2 save
pm2 startup
```

## 6. Apontar dominio

No DNS do dominio `businessrifa.com.br`:

- Railway/Render: crie o dominio customizado no painel e siga o CNAME informado.
- VPS: crie um registro `A` apontando para o IP do servidor.

Exemplo:

```txt
Tipo: A
Nome: @
Valor: IP_DA_VPS

Tipo: CNAME
Nome: www
Valor: businessrifa.com.br
```

## 7. Configurar HTTPS

Railway/Render geralmente ativam SSL automaticamente depois do dominio validar.

Em VPS com Nginx:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d businessrifa.com.br -d www.businessrifa.com.br
```

Exemplo Nginx:

```nginx
server {
  server_name businessrifa.com.br www.businessrifa.com.br;

  location / {
    proxy_pass http://127.0.0.1:4173;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host $host;
  }
}
```

## 8. Banco de dados de producao

O sistema atual usa SQLite em `server/rifas.sqlite`.

Para VPS, isso funciona se voce fizer backup automatico:

```bash
mkdir -p ~/backups-businessrifa
cp /caminho/businessrifa/server/rifas.sqlite ~/backups-businessrifa/rifas-$(date +%F-%H%M).sqlite
```

Para Railway/Render sem disco persistente, use volume persistente ou migre para PostgreSQL/MySQL antes de colocar clientes reais.

## 9. Teste em producao

Depois de publicar, teste:

- Login admin.
- Cadastro de cliente.
- Cadastro de rifa.
- Edicao de rifa e foto do premio.
- Compra/reserva de numeros.
- Pix copia e cola.
- Confirmacao Pix no Admin.
- Area do cliente com reservas.
- Sorteio manual.
- `robots.txt`.
- `sitemap.xml`.
- `/api/health`.
- E-mails automaticos no painel Admin.

## 10. InfinitePay

No Admin, configure:

- Provedor: `InfinitePay`
- Handle: `cicero-leandro-dos`
- URL/token da API ou link de pagamento
- Descricao da mensalidade

Sem URL/token/link, o sistema continua usando Pix copia e cola e registra o payload esperado.

