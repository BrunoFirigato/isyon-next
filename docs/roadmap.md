# Roadmap — Integrações & Estratégia

> Ordenado pela estratégia do [posicionamento](./posicionamento.md): priorizar
> **o que prova e vende** o Isyon como "camada comercial que orquestra o ERP do cliente",
> não o que é mais barato de construir.

---

## A lógica da ordem

A estratégia tem duas consequências diretas:

1. **A isca já existe — é o WhatsApp.** Nosso diferencial nº 1 (o que abre a porta no
   cliente-alvo) já está construído. Só falta acabamento. Barato e de alto impacto → **vem primeiro**.

2. **A prova do posicionamento é o ERP.** O discurso "andar de cima que orquestra o seu
   Bling" só vira verdade quando Bling/Omie conectam. Por isso o **ERP sobe na fila**,
   passando à frente das Automações.

---

## A sequência

### 🥇 Etapa 1 — Acabamento do WhatsApp *(a isca)*
*Fortalece o diferencial que traz o cliente. Já 90% pronto.*
- Fase 4: atribuição por vendedor, templates por estágio, notificações.
- Inbox em tempo real.
- Vínculo automático de contatos (LID).
- Retenção de conversas + mídia.

### 🥈 Etapa 2 — Fundação das Integrações *(o alicerce)*
*Pré-requisito de tudo que vem depois. Construída uma vez, barateia o resto.*
- Modelo de dados (gaveta organizada das integrações).
- **Cofre de credenciais** (cifrar tokens — também corrige uma falha de segurança de hoje).
- "Login com Google/Microsoft" (OAuth) genérico.
- Adaptador universal (connectors) + telinha de status.
- *Em paralelo, sem código:* abrir a verificação do app no Google e Microsoft (leva semanas).

### 🥉 Etapa 3 — ERP: Bling + Omie *(a prova da estratégia)*
*Materializa o pitch "continue no seu Bling — o Isyon conversa com ele".*
- Conectar Bling (login seguro) e Omie (chave).
- Sincronizar produto / cliente / pedido entre Isyon e ERP.
- Começar num sentido só; depois bidirecional.

### 4️⃣ Etapa 4 — Automações: API + Webhooks + n8n *(escala)*
*Poderoso, mas mais para usuários avançados. Liga o Isyon a "qualquer coisa".*
- API própria + chaves por cliente.
- Webhooks de eventos (lead criado, pedido ganho…).
- n8n passa a funcionar.

### 5️⃣ Etapa 5 — E-mail pessoal: Gmail + Outlook *(quando a aprovação sair)*
*Enviar e-mail pelo CRM com a conta do vendedor + registro no 360°.*
- Depende da verificação Google/Microsoft iniciada na Etapa 2.

### 6️⃣ Etapa 6 — Google Agenda *(refinamento)*
*Sincronização bidirecional com o módulo Agenda. O mais complexo — por último.*

---

## Onde estamos agora

- ✅ WhatsApp base (números, recebimento, inbox, 360°) — **construído**.
- ✅ Logos reais + tela de Integrações em 3 abas — **construído**.
- ✅ Cofre de credenciais — **peça-protótipo pronta** (`lib/crypto.ts`), ainda não ligada.
- ⏭️ **Próximo passo sugerido:** Etapa 1 (acabamento do WhatsApp) — fortalece a isca
  enquanto a Fundação é planejada em detalhe.

---

## Resumo visual

```
ETAPA 1            ETAPA 2          ETAPA 3        ETAPA 4         ETAPA 5      ETAPA 6
WhatsApp     →     Fundação    →    ERP       →    Automações  →   E-mail   →   Agenda
(a isca)          (o alicerce)     (a prova)      (escala)        (quando      (refino)
 já 90%                                                            aprovar)

        └─ Google/Microsoft: papelada começa na Etapa 2, em paralelo ─┘
```
