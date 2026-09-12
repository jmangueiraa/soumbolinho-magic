# 🎀 Encantando Festa - Papelaria Personalizada | Catálogo & Painel Admin

Aplicação web completa desenvolvida para a **Encantando Festa - Papelaria Personalizada**, com catálogo digital integrado ao WhatsApp e **Painel Administrativo completo (/admin)** protegido por senha.

---

## 🛡️ Acesso ao Painel Administrativo

- **Rota:** Digite `#/admin` na URL do navegador ou clique no ícone de cadeado no cabeçalho ou rodapé.
- **Senha Padrão:** `admin` (ou `123456`).

---

## ✨ Funcionalidades Principais

### 1. Painel Administrativo (`/admin`):
- **Gestão de Produtos (CRUD Completo):**
  - Cadastro de novos produtos com upload de foto local (Base64) ou link externo.
  - Edição completa de nome, categorias, subcategorias, descrições e badges.
  - **Edição rápida de preços** diretamente na tabela.
  - Botão de ativação/pausa de estoque em 1 clique.
  - Exclusão segura com modal de confirmação.
- **Gestão de Categorias & Subcategorias:**
  - Criação de novas categorias com contagem de produtos vinculados.
  - Criação e exclusão de subcategorias.
  - Renomear categorias existentes.
- **Configurações da Loja & WhatsApp:**
  - Configuração do **Número de WhatsApp** de recebimento dos pedidos.
  - Edição de nome da loja, slogan, Instagram, endereço e horários.
  - Botão para restaurar dados originais de fábrica.

### 2. Vitrine e Catálogo da Loja:
- **Menu Lateral de Categorias:** Fundo rosa claro (`#FFD1EC`), títulos magenta (`#FF1493`), texto em azul escuro (`#2B3A8C`) com marcadores `•` e `°`.
- **Grade Compacta de Produtos:** 4 colunas com visual clean, preço em destaque e botão preto "Adicionar ao carrinho".
- **Placeholder "Sem Imagem":** Ícone padronizado de carrinho de compras quando não há imagem cadastrada.
- **Carrinho e Checkout via WhatsApp:** Montagem automática da mensagem com lista de itens, temas personalizados e valor total, enviando diretamente para o WhatsApp configurado.

---

## 🚀 Como Executar o Projeto

### Modo Tradicional (Terminal Ativo)
```bash
npm install
npm run dev
```

### 🔄 Modo Segundo Plano (Daemon / Persistente)
Para manter o servidor rodando continuamente sem precisar manter a janela do terminal aberta:

1. **Via NPM / PM2:**
```bash
npm run dev:daemon   # Inicia em segundo plano
npm run dev:status   # Visualiza status
npm run dev:logs     # Visualiza logs
npm run dev:stop     # Para o servidor
```

2. **Via Scripts Windows (1 Clique / Atalhos):**
- **Iniciar em segundo plano:** Dê dois cliques em `scripts\start-background.vbs` (inicia 100% silencioso/invisível) ou `scripts\start-dev-daemon.bat`.
- **Parar o servidor:** Dê dois cliques em `scripts\stop-dev-daemon.bat`.
- **Autostart no Windows (Ao Ligar o PC):** Execute `scripts\setup-windows-autostart.bat` e digite `1`. O servidor de desenvolvimento subirá automaticamente em segundo plano sempre que você ligar o computador!

Acesse a vitrine em `http://localhost:5173`.
