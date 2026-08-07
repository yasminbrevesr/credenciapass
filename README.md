# CredenciaPass

Sistema web de **credenciamento em eventos**: cadastro de inscritos, impressão de etiquetas para
crachá (com QR Code / código de barras), check-in de presença dia a dia, emissão de certificados em
PDF e relatórios exportáveis para Excel.

---

## O que o sistema faz

| Módulo | O que resolve |
| --- | --- |
| **Eventos** | Cadastro de eventos com período, local, carga horária, qualificações aceitas e texto do certificado. Os dias de presença são criados automaticamente a partir do período. |
| **Inscritos** | Nome, documento, e-mail, celular, qualificação, instituição, cargo e observações. Busca por nome/documento/e-mail/código e filtro por qualificação. Bloqueia documento repetido no mesmo evento. |
| **Etiquetas** | Folha A4 pronta para impressão, com nome, qualificação, instituição e QR Code ou código de barras (Code128). |
| **Check-in** | Aceita leitor USB de QR/código de barras, leitura pela câmera do celular/notebook ou busca manual. Avisa quando a presença já foi registrada. |
| **Certificados** | PDF em A4 paisagem, individual ou em lote. Texto configurável por evento, exigência opcional de presença mínima e código de validação público. |
| **Relatórios** | Inscritos por qualificação, presença por dia, presença geral e exportações em `.xlsx`. |
| **Usuários** | Perfis **Administrador** e **Operador**, com acesso de operador limitado aos eventos atribuídos. |
| **Validação pública** | `/validar` — consulta pública da autenticidade de um certificado pelo código. |

---

## Tecnologias

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 7** + **PostgreSQL / Supabase**
- **pdf-lib** (certificados), **exceljs** (relatórios), **qrcode** / **JsBarcode** (etiquetas)
- **html5-qrcode** (leitura pela câmera)

---

## Instalação

Requer **Node.js 20.9+**.

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

### Produção

Migrações são uma etapa explícita e separada do build. Não rode `prisma migrate deploy` como efeito colateral da compilação da aplicação.

```bash
npm run db:migrate
npm run build
npm run start
```

Em CI/CD, execute `npm run db:migrate` uma única vez na etapa de deploy do banco e depois faça o build/deploy da aplicação. Builds de preview não devem aplicar migrações automaticamente.

### Variáveis de ambiente (`.env`)

```env
# Aplicação/serverless: Supavisor transaction pooler.
DATABASE_URL="postgresql://USUARIO.PROJECT_REF:SENHA@REGIAO.pooler.supabase.com:6543/postgres?sslmode=require"

# Prisma CLI/migrações: conexão direta ou Supavisor session pooler.
DIRECT_URL="postgresql://USUARIO.PROJECT_REF:SENHA@REGIAO.pooler.supabase.com:5432/postgres?sslmode=require"

SESSION_SECRET="gere-uma-chave-aleatoria-com-32-caracteres-ou-mais"

# Opcionais para o seed inicial.
ADMIN_EMAIL="admin@credenciapass.local"
ADMIN_PASSWORD="troque-esta-senha"
```

> Use valores reais apenas no ambiente local seguro ou nas variáveis protegidas da hospedagem. Não versione segredos.

### Dados de demonstração (opcional)

```bash
npm run seed:demo
```

---

## Como usar no dia do evento

1. **Antes**: cadastre o evento e importe/cadastre os inscritos.
2. **Etiquetas**: selecione os inscritos e imprima os crachás.
3. **Na portaria**: abra *Check-in* e use o leitor, a câmera ou a confirmação manual.
4. **Depois**: em *Relatórios*, exporte as listas; em *Certificados*, gere os PDFs.

---

## Banco de dados

O sistema usa PostgreSQL através do Prisma. A aplicação usa `DATABASE_URL`; a CLI de migrações usa `DIRECT_URL`.

Comandos principais:

```bash
npm run db:generate   # gera o Prisma Client
npm run db:migrate    # aplica migrações pendentes em produção
npm run db:studio     # abre o Prisma Studio
```

Alterações de schema devem ser versionadas em `prisma/migrations/` e aplicadas explicitamente antes da versão da aplicação que depende delas entrar em produção.

---

## Estrutura do projeto

```
prisma/
  schema.prisma            modelos relacionais
  migrations/              histórico de migrações PostgreSQL
  seed.ts                  usuário admin + dados de demonstração
src/
  app/
    (app)/                 área autenticada
    (print)/               páginas de impressão
    api/                   PDFs e exportações .xlsx
    login/  validar/       login e validação pública
  components/              componentes de interface reaproveitados
  lib/
    auth.ts                sessão em cookie assinado (JWT) + autorização
    db.ts                  Prisma Client + adapter PostgreSQL
    certificate.ts         geração do PDF do certificado
    reports.ts             relatórios e geração de Excel
    labels.ts  utils.ts    etiquetas, datas, códigos e formatações
  proxy.ts                 barreira inicial de rotas por cookie de sessão
```
