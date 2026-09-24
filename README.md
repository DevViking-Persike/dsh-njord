# DSH NJORD

Bundle de composição para o **DeepSeek Harness 0.1.6-alpha.2**. Usa o aplicativo, o executor PTC, os workflows, as sessões e o registry de presets do Harness. Não contém outro aplicativo nem outro motor de execução. A compatibilidade com versões posteriores não está validada.

## Componentes

| Pacote | Responsabilidade |
| --- | --- |
| `@persike/dsh-treadmill` | Catálogo, arquivos e configuração da esteira |
| `@persike/dsh-project-tools` | Docker e APIs de leitura de arquivos/Knowledge/Treadmill |
| `@persike/dsh-njord-ui` | Painéis Docker, Treadmill, Knowledge e botão Archify |
| `@persike/dsh-browser-policy` | Política de uso do navegador |
| `dsh-subscriptions` | Rotas Claude e Codex via assinaturas |
| `dsh-cliproxy` | Somente Gemini, ativado pelo endpoint informado no ambiente |

O bundle monta cada componente uma vez. Os providers conservam os IDs `dsh-subscriptions` e `dsh-cliproxy`, para que patches pessoais continuem endereçáveis; os demais componentes usam IDs `njord-*`. As dependências npm são instaladas como pacotes; seus próprios bundles não precisam ser ativados separadamente. Instalar também os bundles individuais pode criar registros duplicados. `session-coordination` é opcional e não é instalado nem ativado por este pacote.

## Instalação

Pare o perfil Web antes de alterar sua composição. Em uma instalação compatível, instale o agregador e os seis peers no mesmo comando:

```sh
dsh plugin --profile web add \
  github:DevViking-Persike/dsh-njord#v0.1.0 \
  github:DevViking-Persike/dsh-treadmill#ff9776c8a9f6ba5169c445835e1aa58a03dacde8 \
  github:DevViking-Persike/dsh-project-tools#a0025e995f99f12a9e7c38ba737906ee78437a35 \
  github:DevViking-Persike/dsh-njord-ui#c50f3cde20c7661c7f2acde228021cb101207423 \
  github:DevViking-Persike/dsh-browser-policy#d6cdec525cdc2f5ccaa04286de14f41e5971a492 \
  github:DevViking-Persike/dsh-subscriptions#836fcf304715ab2cfd4bcfbc27dba2bcaab1e6f1 \
  github:DevViking-Persike/dsh-cliproxy#c632fdad50d8e3860a5569290b6c03b1fa330a0e
```

Os peers são dependências semver obrigatórias, fornecidas diretamente pelo perfil. Os commits Git ficam somente nos argumentos de instalação e em `install-pins.json`; nenhum pacote declara outro plugin Git como dependência transitiva. Isso conserva a proteção `blockExoticSubdeps` do pnpm. A instalação isolada do agregador não fornece seus peers privados de registry.

**Antes de reiniciar**, revise `dsh.bundles` no `package.json` do perfil (`~/.dsh/profiles/web/package.json` na configuração padrão). A CLI ativa automaticamente todos os novos bundles instalados. Preserve os bundles upstream e outros plugins independentes; para os sete pacotes acima, mantenha **somente** `@persike/dsh-njord` na seleção, depois de `@deepseek-ai/dsh-base` e `@deepseek-ai/dsh-web-app`. Remova da seleção os seis bundles individuais, além de `dsh-docker` se já estiver selecionado. Preserve suas entradas em `dependencies`: o agregador precisa resolvê-las. Não substitua o manifesto inteiro nem altere credenciais. O serviço Plugin Manager também oferece seleção de bundles para perfis em funcionamento, mas faça esta migração com o perfil parado para evitar uma composição intermediária duplicada.

Depois de revisar a seleção, execute `dsh web`. O código e os testes aqui foram preparados para a linha 0.1.6-alpha.2; instalar sobre outra versão requer adaptar e validar a composição primeiro. Atualize os pins somente após validar o conjunto de plugins e os presets.

A instalação não edita o checkout do Harness, os arquivos de credenciais ou os patches pessoais. O patch substitui apenas o registry de presets upstream e adiciona as linhas externas. Ele pressupõe que as implementações NJORD antigas já foram removidas do checkout. Antes de instalar em um perfil existente, desative os bundles individuais `dsh-docker`, `dsh-subscriptions`, `dsh-cliproxy` e qualquer bundle individual NJORD: o agregador passa a fornecer essas mesmas funcionalidades. Em uma cópia antiga do fork, desative também as linhas internas equivalentes de Docker, Treadmill, APIs/painéis e adapters Claude/Codex/CLIProxy no patch pessoal. Não remova arquivos de credenciais. Para conservar ajustes operacionais personalizados, copie os campos necessários para a nova linha `njord-*` no patch pessoal. Overrides dos providers que já endereçam `dsh-subscriptions` ou `dsh-cliproxy` continuam aplicáveis; o config inteiro do usuário prevalece, portanto mantenha `routes: [gemini]` no override do CLIProxy para evitar sobreposição com as assinaturas. Não copie segredos para este repositório.

O Harness aplica patches pessoais depois dos bundles. Um patch pessoal que reative uma linha antiga pode restaurar a duplicidade; confira a configuração efetiva com `dsh web --dump-config`. O bundle não referencia os IDs removidos e não precisa deles para carregar. Patches pessoais antigos podem continuar referenciando esses IDs; remova essas referências após revisar a migração. O Desktop possui seu próprio perfil e empacotamento: instalar no perfil `web` não modifica automaticamente um Desktop empacotado.

## Code, PTC e Treadmill

| Preset | Apresentação | Workflow |
| --- | --- | --- |
| NJORD Code (`njord-code`) | Ferramentas nativas e `run_code` (`mode: both`) | Ativo |
| NJORD PTC (`njord-ptc`) | `run_code` e SDK gerado (`mode: ptc`) | Ativo, acessível pelo SDK |

Os dois presets utilizam `dsh-workflow-ptc` e `dsh-tool-workflow` do Harness, dentro de um único grupo isolado por preset. Os registries, providers de subagentes e runtime PTC continuam pertencendo ao Host. O Treadmill é um catálogo compartilhado de instruções/configurações; não é um segundo executor de workflows. Os controles de Red Team e Deploy continuam sendo administrados pelo plugin Treadmill.

A composição adiciona esses dois presets e conserva os presets distribuídos pelo Harness e os presets do usuário. O padrão configurado é `njord-code`. Uma preferência já salva pelo usuário pode prevalecer. O wrapper `src/index.js` apenas fornece os diretórios ao registry upstream; não altera a política upstream de troca de preset em conversas iniciadas.

Para alterar o padrão ou incluir outros diretórios, use o patch pessoal:

```yaml
- id: njord-presets
  config:
    default: njord-ptc
    roots: []
```

O patch substitui a configuração inteira da linha. Não inclua um `name` diferente para tentar trocar um plugin: no DSH esse campo é uma verificação do nome existente, não uma substituição.

## Gemini via CLIProxy

O adapter fica desativado sem `DSH_NJORD_CLIPROXY_BASE_URL`. Defina essa variável com o endpoint `/v1` do seu proxy e forneça `CLIPROXY_API_KEY` no ambiente do processo DSH. Reinicie o Host após configurar as variáveis. O bundle não lê a configuração local do proxy e não transporta chaves no YAML.

A configuração publicada usa `routes: [gemini]`; Claude e Codex pertencem exclusivamente a `dsh-subscriptions`. O proxy precisa estar configurado pelo operador com autorização para Gemini. O bundle não instala nem inicia o servidor CLIProxy.

Para ligar as ferramentas mutáveis de Compose, acrescente ao patch pessoal:

```yaml
- id: njord-tool-docker
  config:
    inspect: true
    compose: true
```

## Validação

```sh
DSH_TEST_HARNESS_ROOT=/path/to/deepseek-harness \
NODE_PATH=/path/to/deepseek-harness/packages/boot/app-boot/node_modules:/path/to/deepseek-harness/node_modules \
node --test tests/*.test.mjs
```

Os testes usam o parser YAML e o algoritmo de patches do próprio Cordis/DSH: verificam IDs e montagens únicas, preservação das configurações antigas, ativação do workflow nos dois presets, seleção exclusiva de Gemini no proxy e ausência de motores Host nos presets. Para verificar também a composição real de um checkout compatível, execute os testes com `DSH_TEST_HARNESS_ROOT` apontando para ele. Esses testes não iniciam providers, não acessam credenciais e não substituem o smoke de boot/browser com os plugins compilados.
