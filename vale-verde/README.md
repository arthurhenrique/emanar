# Clube de Benefícios Vale Verde — página de pré-cadastro

Página única, estática, para apresentar o clube e coletar pré-cadastros de moradores.
Os cadastros vão para uma **Planilha Google privada** por meio de um **Google Apps Script**.
Nenhum dado de morador fica no GitHub.

```
vale-verde/
├── index.html          página completa (CSS e JS embutidos)
├── config.js           URL do Apps Script e WhatsApp do clube
├── apps-script/Code.gs código para colar no Apps Script
└── README.md           este passo a passo
```

## 1. Criar a planilha

1. Entre em <https://sheets.google.com> com a conta que vai administrar o clube.
2. Crie uma planilha em branco e dê um nome, por exemplo **Clube Vale Verde — Cadastros**.
3. Não precisa criar colunas: o script cria a aba **Cadastros** com o cabeçalho no primeiro envio.
4. Deixe a planilha **privada**. Compartilhe (botão Compartilhar) só com quem administra o clube.

## 2. Colar o script

1. Na planilha, abra **Extensões → Apps Script**.
2. Apague o conteúdo do arquivo `Código.gs` que aparece.
3. Copie todo o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs) e cole lá.
4. Clique no disquete (**Salvar**).

## 3. Publicar como Web App

1. No Apps Script, clique em **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - **Descrição:** Pré-cadastro Vale Verde
   - **Executar como:** Eu (seu e-mail)
   - **Quem pode acessar:** **Qualquer pessoa**
4. Clique em **Implantar** e autorize o acesso à planilha quando o Google pedir
   (se aparecer "O Google não verificou este app", clique em **Avançado → Acessar**).
5. Copie a **URL do app da Web** (termina em `/exec`).

Teste rápido: abra essa URL no navegador. Deve aparecer `{"total":0}`.

> **Mudou o script depois?** Use **Implantar → Gerenciar implantações → editar (lápis) →
> Versão: Nova versão → Implantar**. Assim a URL continua a mesma.

## 4. Configurar a página

Abra `config.js` e preencha:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXX/exec";
const WHATSAPP_CONTATO = "5511999998888"; // DDI + DDD + número, só dígitos
```

Sem `APPS_SCRIPT_URL` o formulário avisa que não está conectado e o contador mostra "—"
(a página nunca mostra número inventado). Sem `WHATSAPP_CONTATO` o botão do rodapé some.

## 5. Publicar no GitHub Pages

Este repositório já publica pelo GitHub Pages no domínio `emanartech.com`, então a página
fica em **https://emanartech.com/vale-verde/** assim que entrar na branch `main`.

Para conferir ou ativar em outro repositório:

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
4. Em um ou dois minutos o endereço aparece no topo da mesma tela.

## Como funciona

- **Envio (`doPost`)**: a página manda um JSON com `Content-Type: text/plain;charset=utf-8`
  (assim o navegador não faz a checagem prévia de CORS que o Apps Script não responde).
  O script valida nome, endereço, pelo menos e-mail ou WhatsApp e o consentimento, ignora
  envios com o campo-isca (honeypot) preenchido e grava uma linha.
- **Contador (`doGet`)**: devolve só `{"total": N}`. Nunca devolve nomes ou contatos.
- **Casas únicas**: o total conta endereços diferentes, não envios. O endereço é normalizado
  (sem acento, maiúsculas, pontuação e palavras como "Rua", "nº"), então
  "Rua das Flores, nº 12" e "rua das flores 12" contam como uma casa só.

## Privacidade (LGPD)

- A planilha é a única cópia dos dados. Mantenha-a privada.
- Use os dados só para falar sobre o clube, como diz o consentimento do formulário.
- Se um morador pedir para corrigir ou apagar os dados, edite ou apague a linha dele na planilha.
