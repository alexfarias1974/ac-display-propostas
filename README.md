# AC Display - Gerador de Propostas Comerciais 📊✨

Uma aplicação web moderna, interativa e de alto padrão voltada para a elaboração de propostas comerciais de locação e venda direta de equipamentos e totens de LED para a **AC Display**.

---

## 🚀 Funcionalidades

- **Autenticação Segura**: Suporte a login e cadastro via e-mail/senha ou autenticação social com Google via **Supabase Auth** (com Modo Demonstração offline automático caso as chaves não estejam configuradas).
- **Busca Avançada com Filtro**: Busca e seleção inteligente de produtos do banco de dados em tempo real.
- **Fatores de Conversão Editáveis**: Configuração flexível de fatores de locação (**Fator TI** e **Fator Impressão**) salvos no `localStorage` do navegador.
- **Simulação em Tempo Real**: Cálculo dinâmico das parcelas mensais de locação (12, 24, 36 e 48 meses) e do valor de venda direta (usando Fator de Venda configurável).
- **Contador de Propostas Oficial**: Numeração sequencial de propostas comercializada de forma incremental e individualizada por login de usuário.
- **Exportação Profissional em PDF**: Geração de propostas comerciais no formato A4 em apenas um clique, com design corporativo limpo, logomarca oficial da empresa e sem expor preços de custo interno.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, Vanilla CSS3 (estilizações modernas com Glassmorphism) e JavaScript ES6.
- **Backend / Database**: [Supabase](https://supabase.com/) (Auth e Banco de Dados PostgreSQL).
- **Exportação**: [html2pdf.js](https://rawgit.com/eKoopmans/html2pdf/master/dist/html2pdf.bundle.min.js) para processamento client-side de PDFs executivos.

---

## 📦 Como Executar o Projeto Localmente

1. **Abra o arquivo `index.html`** diretamente no seu navegador, ou
2. **Inicie um servidor HTTP local** para aproveitar ao máximo a autenticação (ex: com Python ou Node.js):
   ```bash
   # Utilizando Python
   python -m http.server 8000
   
   # Ou utilizando Node.js (via npx)
   npx http-server -p 8000
   ```
3. Acesse **`http://localhost:8000`** no seu navegador de preferência.

---

## ⚙️ Configuração do Supabase (Opcional)

Para conectar o app ao seu próprio banco de dados e habilitar o login oficial:
1. Vá até a aba **Configurações** da aplicação.
2. Insira a sua **URL do Supabase** e a **Chave de API Anon**.
3. Clique em **Salvar Configurações**.
4. *Se preferir rodar de forma local offline, basta deixar os campos vazios e a aplicação funcionará em Modo de Demonstração (Mock Mode) salvando os dados no navegador.*

---

*Desenvolvido com carinho para a equipe comercial da AC Display.* 💼💡
