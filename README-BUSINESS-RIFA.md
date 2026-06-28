# businessrifa

Sistema premium de rifas online criado do zero com identidade visual em roxo, dourado e preto.

Empresa: businessrifa  
Desenvolvido por: Leandro Santos  
Site Oficial: configure seu dominio publico  
Copyright 2026 Todos os direitos reservados.

## Valor de locacao

O sistema esta configurado para vender a locacao da plataforma por **R$ 59,99 ao mes**, sem taxa de instalacao. Esse valor aparece na pagina inicial para pessoas que querem criar seus proprios sorteios usando o businessrifa.

## Como iniciar

1. Abra `INICIAR-BUSINESS-RIFA.bat`.
2. Acesse `http://127.0.0.1:4173`.
3. O iniciador espera o servidor responder antes de abrir a pagina no navegador.

## Acessos demo

- Administrador: `admin@businessrifa.local`
- Senha: `admin123`
- Cliente: `cliente@businessrifa.local`
- Senha: `123456`

## Recursos entregues

- Botoes de direcionamento completo para comprar numeros, entrar/cadastrar, administrar rifas, abrir planos, abrir politicas e preparar Google Search.
- Login e cadastro de participantes.
- Painel administrativo.
- Configuracao de mensalidade, Pix e InfinitePay pelo painel administrativo.
- Cadastro de novas rifas.
- Edicao de titulo, descricao, premio, valor, data, quantidade e foto da rifa.
- Exclusao de rifas sem reservas, preservando historico quando ja houver participantes.
- Edicao de dados e foto do cliente.
- Historico de reservas na area do cliente.
- Reserva de numeros.
- Pix copia e cola com chave `businessrifa@hotmail.com`.
- Checkout InfinitePay configuravel, com fallback para Pix copia e cola.
- Confirmacao de pagamento Pix apenas pelo administrador.
- Lista de reservas recentes no painel administrativo.
- Banco SQLite em `server/rifas.sqlite`.
- Sorteio automatico por data ou quando todos os numeros forem pagos.
- Sorteio manual pelo admin.
- Painel financeiro.
- Politica de privacidade com contato `businessrifa@hotmail.com`.
- Termos de uso.
- Rodape institucional com empresa, desenvolvedor, site oficial e copyright.
- Textos de boas-vindas e emails automaticos padronizados com a marca businessrifa.
- Pagina publica com oferta de locacao por R$ 59,99 ao mes.
- SEO pronto: titulo, descricao, canonical, Open Graph, robots, sitemap e dados estruturados.

## Configurar InfinitePay

1. Entre como administrador.
2. Abra a aba `Admin`.
3. Em `Pagamentos e mensalidade`, mantenha o provedor como `InfinitePay`.
4. Confira o handle `cicero-leandro-dos`.
5. Cole o endpoint/token da API InfinitePay ou informe um link de pagamento InfinitePay.
6. Mantenha a descricao da mensalidade como `Produto de Exemplo` ou altere para o nome comercial do plano.
7. Salve as configuracoes.

O token fica salvo apenas no servidor e nao aparece para visitantes. Se a API ou link da InfinitePay nao estiver configurado, o sistema continua funcionando com Pix copia e cola.

O payload enviado para a InfinitePay segue o formato:

```json
{
  "handle": "cicero-leandro-dos",
  "items": [
    {
      "quantity": 1,
      "price": 5999,
      "description": "Produto de Exemplo"
    }
  ]
}
```

## Google Search Console

Depois de hospedar o sistema em um dominio publico com HTTPS, cadastre o dominio no Google Search Console e use:

- Sitemap: `https://SEU-DOMINIO/sitemap.xml`
- Robots: `https://SEU-DOMINIO/robots.txt`

O servidor gera `robots.txt` e `sitemap.xml` automaticamente com o dominio em que o site estiver rodando. Se o Google pedir verificacao por arquivo HTML, coloque o arquivo baixado dentro da pasta `public`, rode `npm.cmd run build` e publique novamente.

Antes de publicar, troque `https://seu-dominio.com.br/` no `index.html`, `public/robots.txt` e `public/sitemap.xml` pelo dominio real. Em hospedagem usando o servidor Node, o sitemap dinamico ja usa o dominio acessado.

## Comandos uteis

```bat
npm.cmd install
npm.cmd run build
npm.cmd run api
```
