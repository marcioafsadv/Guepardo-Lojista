# 🐆 Guepardo Lojista

Painel administrativo para lojistas parceiros da plataforma Guepardo. Este aplicativo permite o gerenciamento de pedidos, acompanhamento de entregadores em tempo real e análise de desempenho.

![Status do Deploy](https://github.com/marcioafsadv/Guepardo-Lojista/actions/workflows/deploy-hostinger.yml/badge.svg)

## 🚀 Funcionalidades

- **Dashboard Operacional:** Visualização e gerenciamento de pedidos em tempo real.
- **Rastreamento ao Vivo:** Mapa interativo mostrando a localização dos entregadores e rotas de entrega.
- **Gestão de Clientes:** CRM básico com histórico de pedidos e classificação de clientes (Bronze/Prata/Ouro).
- **Relatórios:** Gráficos e tabelas de desempenho financeiro e operacional.
- **Configurações:** Gerenciamento de perfil da loja, horários de funcionamento e taxas.

## 🛠️ Tecnologias

- **Frontend:** React + Vite + TypeScript
- **Estilização:** TailwindCSS
- **Mapas:** Leaflet + React Leaflet
- **Backend/Banco de Dados:** Sincronização em tempo real com Supabase
- **Ícones:** Lucide React

## 📦 Como rodar localmente

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/marcioafsadv/Guepardo-Lojista.git
    cd Guepardo-Lojista
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Variáveis de Ambiente:**
    Crie um arquivo `.env` ou `.env.local` na raiz do projeto com suas credenciais do Supabase:
    ```env
    VITE_SUPABASE_URL=sua_url_supabase
    VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase
    ```

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

## 🚢 Deploy Automático (Hostinger)

Este projeto está configurado com **GitHub Actions** para fazer o deploy automático para a Hostinger via FTP sempre que houver um `push` na branch `main`.

### Configuração do Workflow

O arquivo de configuração está em `.github/workflows/deploy-hostinger.yml`.

Para que funcione, os seguintes **Secrets** devem estar configurados no repositório do GitHub:

| Secret | Descrição |
| :--- | :--- |
| `FTP_SERVER` | Endereço IP ou Host do FTP da Hostinger |
| `FTP_USERNAME` | Usuário FTP |
| `FTP_PASSWORD` | Senha do FTP |
| `VITE_SUPABASE_URL` | (Opcional) URL do projeto Supabase para build |
| `VITE_SUPABASE_ANON_KEY` | (Opcional) Chave Anon do projeto Supabase para build |

---

Desenvolvido para Guepardo Entregas.
