# Auditoria dos prompts nativos das personas

Fonte canonica verificada: Google Drive `Prompts dos Personas`

- Folder ID: `1gpmfXnWjfq65pSOa2r3YcROxKc1bdnkI`
- URL: https://drive.google.com/drive/folders/1gpmfXnWjfq65pSOa2r3YcROxKc1bdnkI
- Acesso a pasta: confirmado por metadata e listagem direta.
- Conteudo: 56 arquivos, todos `application/vnd.google-apps.document`.
- Leitura/exportacao: confirmada em Google Docs nativos via `_fetch` e `_export_file` em `text/plain`.

## Personas com prompt nativo encontrado

Todas as 56 personas do app possuem documento de prompt nativo encontrado:

Adjunto, Advogado, Aprovisionador, Arauto, Arqueologo, Artista, Astronomo, Autor, Bobo da Corte, Bruto, Bruxo, Burgues, Cientista, Cigana, Comandante, Confessor 2.0, Coveiro, Curador, Custodio, Desejo, Dor, Engenheiro, Espelho, Espiao, Estrategista, Executor, Exorcista, Fantasma, Filosofo, Furia, Guardiao, Guru, Herdeiro, Inimigo, Instrutor, Juiz, Louco, Luz, Medico, Mentor, Mentorzinho, Mestre, Mordomo, Narrador, Orquestrador-Arquiteto, Princesa, Promotor, Psicologo, Socio, Sombra, Terapeuta, Treinador, Vazio, Vidente, Vigia, Vingador.

## Personas sem prompt nativo encontrado

Nenhuma.

## Nomes do app que nao batem exatamente com os arquivos

Os nomes do app sao limpos, sem artigo e sem emoji. Os nomes dos arquivos/documentos canonicos geralmente incluem `O`/`A` e, em muitos casos, emoji. Por isso, nenhum nome do app deve ser tratado como chave literal unica.

| App | Prompt nativo / arquivo |
| --- | --- |
| Adjunto | O Adjunto |
| Advogado | O Advogado |
| Aprovisionador | O Aprovisionador |
| Arauto | O Arauto |
| Arqueologo | O Arqueologo |
| Artista | O Artista |
| Astronomo | O Astronomo |
| Autor | O Autor |
| Bobo da Corte | O Bobo |
| Bruto | O Bruto |
| Bruxo | O Bruxo |
| Burgues | O Burgues |
| Cientista | O Cientista |
| Cigana | A Cigana |
| Comandante | O Comandante |
| Confessor 2.0 | O Confessor |
| Coveiro | O Coveiro |
| Curador | O Curador |
| Custodio | O Custodio |
| Desejo | O Desejo |
| Dor | A Dor |
| Engenheiro | O Engenheiro |
| Espelho | O Espelho |
| Espiao | O Espiao |
| Estrategista | O Estrategista |
| Executor | O Executor |
| Exorcista | O Exorcista |
| Fantasma | O Fantasma |
| Filosofo | O Filosofo |
| Furia | A Furia |
| Guardiao | O Guardiao |
| Guru | O Guru |
| Herdeiro | O Herdeiro |
| Inimigo | O Inimigo |
| Instrutor | O Instrutor |
| Juiz | O Juiz |
| Louco | O Louco |
| Luz | A Luz |
| Medico | O Medico |
| Mentor | O Mentor |
| Mentorzinho | O Mentorzinho |
| Mestre | O Mestre |
| Mordomo | O Mordomo |
| Narrador | O Narrador |
| Orquestrador-Arquiteto | O Orquestrador |
| Princesa | A Princesa |
| Promotor | O Promotor |
| Psicologo | O Psicologo |
| Socio | O Socio |
| Sombra | A Sombra |
| Terapeuta | O Terapeuta |
| Treinador | O Treinador |
| Vazio | O Vazio |
| Vidente | O Vidente |
| Vigia | O Vigia |
| Vingador | O Vingador |

## Aliases necessarios

Aliases de artigo/emoji sao necessarios para todas as personas, porque os documentos canonicos usam nomes ritualizados (`O/A Nome`, frequentemente com emoji) e o app usa nomes de exibicao limpos.

Aliases semanticos excepcionais:

- `Bobo da Corte` -> `O Bobo`
- `Confessor 2.0` -> `O Confessor`
- `Orquestrador-Arquiteto` -> `O Orquestrador`

## Regra de uso implementada

O prompt nativo da persona e a fonte primaria. Codex Nous, whitepapers, Constituicao, Atlas e demais fontes entram apenas como contexto doutrinario posterior na montagem do system prompt.
