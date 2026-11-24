# LEDWAVE Portugal — site, loja online e backoffice

Site da Metrikmirror, Lda., distribuidora LEDWAVE em Portugal. Node.js + Express, sem base de dados externa
(os dados ficam num ficheiro JSON em `DATA_DIR`).

- **Loja:** catálogo, página de produto com galeria, carrinho, checkout (Stripe: cartão, MB WAY, Multibanco), pedidos de orçamento e aluguer.
- **Backoffice (`/admin`):** painel com faturação, encomendas (estados, n.º de fatura, notas, histórico), orçamentos,
  produtos (criar/editar/duplicar/ordenar, upload de imagens, especificações), clientes, definições da empresa e contactos,
  exportação CSV e cópia de segurança.

## Correr localmente
    npm install
    ADMIN_PASSWORD=uma-palavra-passe npm start      # http://localhost:3000  e  /admin

## Variáveis de ambiente
| Variável | Para quê |
|---|---|
| `ADMIN_PASSWORD` | Palavra-passe inicial do backoffice (utilizador `admin`). Depois pode ser mudada em Definições. Se faltar, é gerada e escrita no log no 1.º arranque. |
| `ADMIN_EMAIL` | Nome de utilizador (por omissão `admin`). |
| `DATA_DIR` | Pasta dos dados e imagens. **Em Railway, montar um volume aqui (ex.: `/data`).** |
| `SESSION_SECRET` | Opcional. Chave das sessões do backoffice. |
| `STRIPE_SECRET_KEY` | Ativa pagamentos reais. Sem ela, o checkout regista a encomenda em modo de demonstração. Ative MB WAY e Multibanco no Stripe Dashboard → Payment methods. |
| `STRIPE_WEBHOOK_SECRET` | Webhook para `https://<domínio>/api/stripe/webhook` (eventos `checkout.session.*`) que marca as encomendas como pagas. |

## Notas
- O catálogo inicial (`data/products.js`) só é usado na primeira execução; depois tudo se edita no backoffice.
- As imagens iniciais vêm de ledviewbrasil.com. No backoffice, em Produtos, o botão "Copiar imagens externas" guarda-as no próprio servidor.
