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

Os repositórios GitHub das dependências precisam estar publicados e acessíveis antes da instalação por URL. Este checkout, por si só, não publica esses repositórios.

Em uma instalação compatível que já tenha o perfil Web:

```sh
dsh plugin --profile web add github:DevViking-Persike/dsh-njord
dsh web
```

O bundle precisa vir depois dos bundles `dsh-base` e `dsh-web-app`. O código e os testes aqui foram preparados para a linha 0.1.6-alpha.2; instalar sobre outra versão requer adaptar e validar a composição primeiro. As seis dependências externas usam commits GitHub fixos. Atualize as referências somente após validar o conjunto de plugins e os presets.

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
npm install --ignore-scripts
npm test
```

Os testes usam o parser YAML e o algoritmo de patches do próprio Cordis/DSH: verificam IDs e montagens únicas, preservação das configurações antigas, ativação do workflow nos dois presets, seleção exclusiva de Gemini no proxy e ausência de motores Host nos presets. Para verificar também a composição real de um checkout compatível, execute os testes com `DSH_TEST_HARNESS_ROOT` apontando para ele. Esses testes não iniciam providers, não acessam credenciais e não substituem o smoke de boot/browser com os plugins compilados.
