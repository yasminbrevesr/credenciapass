# CredenciaPass

Sistema web de **credenciamento em eventos**: cadastro de inscritos, impressão de etiquetas para
crachá (com QR Code / código de barras), check-in de presença dia a dia, emissão de certificados em
PDF e relatórios exportáveis para Excel.

---

## O que o sistema faz

| Módulo | O que resolve |
| --- | --- |
| **Eventos** | Cadastro de eventos com período, local, carga horária, qualificações aceitas e texto do certificado. Os dias de presença são criados automaticamente a partir do período. |
| **Inscritos** | Nome, documento, e-mail, celular, qualificação (Participante, Professor, Colaborador ou outras que você definir), instituição, cargo e observações. Busca por nome/documento/e-mail/código e filtro por qualificação. Bloqueia documento repetido no mesmo evento. |
| **Etiquetas** | Folha A4 pronta para impressão em três formatos (crachá 99×67 mm, 63,5×38,1 mm e 66,7×25,4 mm), com nome, qualificação, instituição e QR Code **ou** código de barras (Code128). |
| **Check-in** | Um dia por vez. Aceita leitor USB de QR/código de barras (funciona como teclado), leitura pela câmera do celular/notebook, ou busca manual pelo nome. Avisa quando a presença já foi registrada e emite bipe de confirmação. |
| **Certificados** | PDF em A4 paisagem, individual ou em lote (um arquivo com todos). Texto configurável por evento, exigência opcional de presença mínima e código de validação público. |
| **Relatórios** | Inscritos por qualificação, presença por dia, presença geral (participante × dia) e lista de presença de cada dia — na tela e em `.xlsx`. |
| **Usuários** | Perfis **Administrador** (acesso total) e **Operador** (credencia e consulta). |
| **Validação pública** | `/validar` — qualquer pessoa confere a autenticidade de um certificado pelo código, sem login. |

---

## Tecnologias

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 7** + **SQLite** (arquivo único, fácil de fazer backup)
- **pdf-lib** (certificados), **exceljs** (relatórios), **qrcode** / **JsBarcode** (etiquetas),
  **html5-qrcode** (leitura pela câmera)

---

## Instalação

Requer **Node.js 20.9+**.

```bash
npm install          # instala dependências e gera o Prisma Client
cp .env.example .env # ajuste as variáveis (veja abaixo)
npm run setup        # cria o banco e o usuário administrador
npm run dev          # sobe em http://localhost:3000
```

Para produção:

```bash
npm run build
npm run start
```

### Variáveis de ambiente (`.env`)

```env
DATABASE_URL="file:./data/credenciapass.db"
SESSION_SECRET="uma-chave-aleatoria-com-32-caracteres-ou-mais"

# opcionais, usados apenas na primeira execução do seed
ADMIN_EMAIL="admin@credenciapass.local"
ADMIN_PASSWORD="credencia123"
```

> **Troque `SESSION_SECRET` e a senha do administrador antes de colocar em produção.**
> Gere uma chave com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

### Acesso inicial

| E-mail | Senha |
| --- | --- |
| `admin@credenciapass.local` | `credencia123` |

Troque a senha em **Usuários** logo no primeiro acesso.

### Dados de demonstração (opcional)

```bash
npm run seed:demo
```

Cria o evento “Congresso de Exemplo 2026” com 3 dias, 5 inscritos e presenças registradas.

---

## Como usar no dia do evento

1. **Antes**: cadastre o evento (período, qualificações, texto do certificado) e os inscritos.
2. **Etiquetas**: em *Etiquetas*, selecione os inscritos, escolha o formato e imprima a folha
   (margens “padrão/nenhuma”, escala 100%).
3. **Na portaria**: abra *Check-in*, confirme o dia e deixe o cursor no campo de leitura. Passe o
   leitor no crachá — a presença é registrada na hora. Sem crachá, use a busca manual.
4. **Depois**: em *Relatórios*, exporte as listas em Excel; em *Certificados*, gere os PDFs.

---

## Banco de dados e backup

Todo o sistema usa um único arquivo: `data/credenciapass.db`. Para backup, copie esse arquivo com o
sistema parado (ou use `sqlite3 data/credenciapass.db ".backup backup.db"`).

Para migrar para **PostgreSQL** (vários operadores em rede, hospedagem em nuvem):

1. Troque `provider = "sqlite"` por `postgresql` em `prisma/schema.prisma`.
2. Troque o adapter em `src/lib/db.ts` (`@prisma/adapter-pg`).
3. Ajuste `DATABASE_URL` e rode `npx prisma migrate dev`.

---

## Estrutura do projeto

```
prisma/
  schema.prisma            modelos (User, Event, EventDay, Participant, Attendance, Certificate)
  seed.ts                  usuário admin + dados de demonstração
src/
  app/
    (app)/                 área autenticada (eventos, inscritos, check-in, relatórios, usuários)
    (print)/               páginas de impressão (folha de etiquetas), sem menus
    api/                   PDFs de certificado e exportações .xlsx
    login/  validar/       login e validação pública de certificado
  components/              componentes de interface reaproveitados
  lib/
    auth.ts                sessão em cookie assinado (JWT) + hash de senha
    db.ts                  Prisma Client (SQLite via driver adapter)
    certificate.ts         desenho do PDF do certificado
    reports.ts             consultas dos relatórios e geração dos arquivos Excel
    labels.ts  utils.ts    formatos de etiqueta, datas, códigos e formatações
  proxy.ts                 proteção de rotas (redireciona quem não está logado)
```
