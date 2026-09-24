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
  github:DevViking-Persike/dsh-njord#v0.1.2 \
  github:DevViking-Persike/dsh-treadmill#ff9776c8a9f6ba5169c445835e1aa58a03dacde8 \
  github:DevViking-Persike/dsh-project-tools#8d1c9cb29ace62d49def874bf6cb122a01a16221 \
  github:DevViking-Persike/dsh-njord-ui#2c3a619931f3849b51b7c140aca55f0973431775 \
  github:DevViking-Persike/dsh-browser-policy#d6cdec525cdc2f5ccaa04286de14f41e5971a492 \
  github:DevViking-Persike/dsh-subscriptions#836fcf304715ab2cfd4bcfbc27dba2bcaab1e6f1 \
  github:DevViking-Persike/dsh-cliproxy#c632fdad50d8e3860a5569290b6c03b1fa330a0e
```

Os peers são dependências semver obrigatórias, fornecidas diretamente pelo perfil. Os commits Git ficam somente nos argumentos de instalação e em `install-pins.json`; nenhum pacote declara outro plugin Git como dependência transitiva. Isso conserva a proteção `blockExoticSubdeps` do pnpm. A instalação isolada do agregador não fornece seus peers privados de registry.

**Antes de reiniciar**, revise `dsh.profile.bundles` no `package.json` do perfil (`~/.dsh/profiles/web/package.json` na configuração padrão). A CLI ativa automaticamente todos os novos bundles instalados. Preserve os bundles upstream e outros plugins independentes; para os sete pacotes acima, mantenha **somente** `@persike/dsh-njord` na seleção, depois de `@deepseek-ai/dsh-base` e `@deepseek-ai/dsh-web-app`. Remova da seleção os seis bundles individuais, além de `dsh-docker` se já estiver selecionado. Preserve suas entradas em `dependencies`: o agregador precisa resolvê-las. Não substitua o manifesto inteiro nem altere credenciais. O serviço Plugin Manager também oferece seleção de bundles para perfis em funcionamento, mas faça esta migração com o perfil parado para evitar uma composição intermediária duplicada.

Depois de revisar a seleção, execute `dsh web`. O código e os testes aqui foram preparados para a linha 0.1.6-alpha.2; instalar sobre outra versão requer adaptar e validar a composição primeiro. Atualize os pins somente após validar o conjunto de plugins e os presets.

A instalação não edita o checkout do Harness, os arquivos de credenciais ou os patches pessoais. O patch substitui apenas o registry de presets upstream e adiciona as linhas externas. Ele pressupõe que as implementações NJORD antigas já foram removidas do checkout. Antes de instalar em um perfil existente, desative os bundles individuais `dsh-docker`, `dsh-subscriptions`, `dsh-cliproxy` e qualquer bundle individual NJORD: o agregador passa a fornecer essas mesmas funcionalidades. Em uma cópia antiga do fork, desative também as linhas internas equivalentes de Docker, Treadmill, APIs/painéis e adapters Claude/Codex/CLIProxy no patch pessoal. Não remova arquivos de credenciais. Para conservar ajustes operacionais personalizados, copie os campos necessários para a nova linha `njord-*` no patch pessoal. Overrides dos providers que já endereçam `dsh-subscriptions` ou `dsh-cliproxy` continuam aplicáveis; o config inteiro do usuário prevalece, portanto mantenha `routes: [gemini]` no override do CLIProxy para evitar sobreposição com as assinaturas. Não copie segredos para este repositório.

O Harness aplica patches pessoais depois dos bundles. Um patch pessoal que reative uma linha antiga pode restaurar a duplicidade; confira a configuração efetiva com `dsh web --dump-config`. O bundle não referencia os IDs removidos e não precisa deles para carregar. Patches pessoais antigos podem continuar referenciando esses IDs; remova essas referências após revisar a migração. O Desktop possui seu próprio perfil e empacotamento: instalar no perfil `web` não modifica automaticamente um Desktop empacotado.

## Code e Treadmill

O único modo NJORD selecionável é **NJORD Code** (`njord-code`). Ele oferece ferramentas nativas e `run_code` (`mode: both`), com workflows e subagentes ativos. O SDK e o executor PTC são os do Harness: o modelo pode combinar chamadas em código ou chamar ferramentas diretamente.

Conversas salvas com `njord-ptc` conservam esse identificador e passam a carregar o mesmo arquivo de composição do Code. O identificador antigo não aparece no seletor nem exige outra cópia do preset. Uma preferência antiga por `njord-ptc` usa Code para novas conversas. Os presets nativos do Harness e os presets personalizados continuam disponíveis; o plugin não muda seus modos.

O preset utiliza `dsh-workflow-ptc` e `dsh-tool-workflow` do Harness em um grupo isolado. Os registries, providers de subagentes e runtime PTC pertencem ao Host. O Treadmill fornece instruções, etapas e configuração da esteira; seus controles de Red Team e Deploy são independentes da escolha entre chamadas diretas e `run_code`.

Para alterar o padrão ou incluir outros diretórios, use o patch pessoal:

```yaml
- id: njord-presets
  config:
    default: njord-code
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
node scripts/prepare-sdk.mjs /path/to/deepseek-harness
DSH_TEST_HARNESS_ROOT=/path/to/deepseek-harness npm test
```

Os testes usam o parser YAML e o algoritmo de patches do próprio Cordis/DSH: verificam IDs e montagens únicas, preservação das configurações antigas e do identificador PTC salvo, ativação do workflow no Code, seleção exclusiva de Gemini no proxy e ausência de motores Host nos presets. Para verificar também a composição real de um checkout compatível, execute os testes com `DSH_TEST_HARNESS_ROOT` apontando para ele. Esses testes não iniciam providers, não acessam credenciais e não substituem o smoke de boot/browser com os plugins compilados.
