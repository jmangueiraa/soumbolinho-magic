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

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse a vitrine em `http://localhost:3000` e o painel admin em `http://localhost:3000/#/admin`.
