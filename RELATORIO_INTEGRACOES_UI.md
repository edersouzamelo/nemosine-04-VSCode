# Relatorio de Integracoes UI

Branch: `release/inpi-1ano-20260720`

## Criterio aplicado

Interfaces que prometem integracao externa sem OAuth, rota funcional, leitura real e persistencia foram movidas para `dev_only`: visiveis apenas para `edersouzamelo@gmail.com`, com identidade azul e badge `DEV ONLY`.

## Matriz

| Interface | Arquivo | Estado comprovado | Backend encontrado | Decisao aplicada |
| --- | --- | --- | --- | --- |
| Google Agenda | `app/components/ExternalConnectionsPanel.tsx` | `functional` | `/api/google/calendar/status`, `/api/google/calendar/events`, `/api/google/calendar/reconnect`, `app/lib/googleCalendar.ts`, NextAuth Google OAuth | Mantida visivel como integracao real para usuarios autenticados. |
| LinkedIn | `app/components/ExternalConnectionsPanel.tsx` | `dev_only` | Ausente; nao ha OAuth, rota de leitura, persistencia ou sincronizacao | Oculta para usuarios comuns; visivel em azul com `DEV ONLY` para a conta proprietaria. |
| Google Health | `app/components/ExternalConnectionsPanel.tsx` | `dev_only` | Ausente | Oculta para usuarios comuns; visivel em azul com `DEV ONLY` para a conta proprietaria. |
| Google Fit | `app/components/ExternalConnectionsPanel.tsx` | `dev_only` | Ausente | Oculta para usuarios comuns; visivel em azul com `DEV ONLY` para a conta proprietaria. |
| Strava | `app/components/ExternalConnectionsPanel.tsx` | `dev_only` | Ausente | Oculta para usuarios comuns; visivel em azul com `DEV ONLY` para a conta proprietaria. |
| Gravl | `app/components/ExternalConnectionsPanel.tsx` | `dev_only` | Ausente | Oculta para usuarios comuns; visivel em azul com `DEV ONLY` para a conta proprietaria. |
| Open Finance | `app/components/ExternalConnectionsPanel.tsx` | `dev_only` | Ausente; nao ha consentimento regulatorio ou conector bancario | Oculta para usuarios comuns; visivel em azul com `DEV ONLY` para a conta proprietaria. |
| Web Enrichment | `app/api/public-enrichment/route.ts` e Casa de Maquinas como diagnostico | `dev_only` | A rota existe, mas retorna plano sem busca de rede e sem persistencia | Rota protegida server-side para a conta proprietaria ate a integracao real existir. |
| Fontes locais | `app/components/SourcesPanelButton.tsx`, `app/api/sources/route.ts` | `functional` | Upload/extracao de PDF, DOCX, TXT, MD, CSV; persistencia por usuario e remocao | Mantida visivel; nao e conector externo simulado. |
| Login com Google | `app/access/page.tsx`, `/api/auth/*` | `functional` | NextAuth Google provider | Mantido visivel como autenticacao real. |
## Registro central

Criado `app/lib/integration_capabilities.ts` com estados:

- `functional`
- `dev_only`
- `planned`
- `hidden`

O filtro visual usa `canViewIntegrationCapability`. As rotas incompletas usam verificacao server-side por e-mail proprietario.
