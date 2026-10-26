<!--
MINUTA — NÃO PUBLICAR SEM REVISÃO JURÍDICA.
Remova este bloco de comentário antes de enviar via POST /legal/documents.
Campos entre [COLCHETES] precisam ser preenchidos.
As decisões que dependem de advogado estão listadas em docs/legal/GUIA-DO-REVISOR.md.
-->

# Política de Privacidade

**Versão 1.0** — vigente a partir de [DATA]

## 1. Quem trata os seus dados

Esta política explica como os seus dados pessoais são tratados no aplicativo e na
plataforma NutriRev.

Há dois responsáveis distintos, com papéis diferentes:

- **A clínica ou o consultório de nutrição que atende você é a controladora** dos
  seus dados de saúde. É ela que decide quais informações clínicas coletar, com
  qual finalidade e por quanto tempo, no contexto do seu acompanhamento
  nutricional. É também ela quem responde pelo seu prontuário.
- **[RAZÃO SOCIAL], CNPJ [CNPJ], é a operadora**: fornece a plataforma e trata os
  dados clínicos **em nome e segundo as instruções da clínica**. Quanto à sua
  conta de acesso, aos registros de segurança e ao funcionamento do produto, a
  [RAZÃO SOCIAL] atua como controladora.

Na prática: dúvidas sobre o seu tratamento nutricional e sobre o que a clínica
guarda a seu respeito devem ser dirigidas à clínica. Dúvidas sobre a conta, o
aplicativo e a segurança da plataforma podem ser dirigidas a nós.

**Encarregado pelo tratamento de dados (DPO) da [RAZÃO SOCIAL]:** [NOME] —
[E-MAIL DO ENCARREGADO].

## 2. Quais dados tratamos

### 2.1 Dados de identificação e contato

Nome, e-mail, telefone, data de nascimento, gênero, município, estado, CEP e
país. São informados pela clínica no seu cadastro ou por você no aplicativo.

### 2.2 Dados de acesso

E-mail de login e senha. A senha é armazenada apenas como resumo criptográfico
(bcrypt) — nem a clínica nem a [RAZÃO SOCIAL] conseguem lê-la. Guardamos também
registros técnicos de acesso, descritos no item 6.

### 2.3 Dados de saúde (dados pessoais sensíveis)

A maior parte do que a plataforma trata é **dado pessoal sensível** na definição
do art. 5º, II da Lei 13.709/2018 (LGPD), porque diz respeito à sua saúde:

- condições clínicas e doenças pré-existentes registradas pela clínica;
- altura, peso atual, peso desejado, objetivo e nível de atividade física;
- padrão de função intestinal, quando registrado no acompanhamento;
- restrições alimentares;
- registro das suas refeições, com calorias, macronutrientes e itens identificados;
- **fotografias das suas refeições**;
- **fotografias corporais**, quando você utiliza a funcionalidade de análise
  corporal;
- seu plano alimentar e a evolução do acompanhamento.

### 2.4 Dados de pagamento

Quando aplicável, informações sobre cobranças e tentativas de pagamento. **Dados
completos de cartão não são armazenados pela plataforma**: são transmitidos ao
processador de pagamento e descartados da memória logo em seguida.

### 2.5 Dados de uso

Quantidade de análises de IA realizadas por dia, para controle de limite do plano
contratado pela clínica.

## 3. Para que usamos e com qual base legal

| Finalidade | Base legal (LGPD) |
|---|---|
| Criar e manter a sua conta de acesso | Execução de contrato (art. 7º, V) |
| Prestar o acompanhamento nutricional contratado com a clínica | Tutela da saúde por profissional de saúde (art. 11, II, "f") e o seu **consentimento específico e destacado** (art. 11, I) |
| Analisar fotografias de refeições e corporais por inteligência artificial | **Consentimento específico e destacado** (art. 11, I) |
| Cobrança e gestão da assinatura da clínica | Execução de contrato (art. 7º, V) |
| Segurança, prevenção a fraude e registro de acessos | Legítimo interesse e cumprimento de obrigação legal (art. 7º, II e IX; art. 37) |
| Guarda do prontuário após o fim do atendimento | Cumprimento de obrigação legal pela clínica (art. 16, I) |

Você pode **retirar o consentimento** para o tratamento de dados sensíveis a
qualquer momento, pelo aplicativo ou pelos contatos desta política. A retirada
não afeta a legalidade do que foi tratado antes, e pode inviabilizar o uso do
aplicativo, já que o acompanhamento nutricional depende desses dados.

## 4. Inteligência artificial e transferência internacional

**Leia este item com atenção.** Quando você fotografa uma refeição ou utiliza a
análise corporal, **a imagem é enviada para um provedor de inteligência
artificial fora do Brasil** para ser analisada. Os provedores utilizados são
[LISTAR PROVEDORES CONTRATADOS — hoje: Anthropic (Estados Unidos) e/ou Google
(Estados Unidos)].

O que você precisa saber:

- A imagem é transmitida por conexão criptografada e usada exclusivamente para
  produzir a estimativa nutricional ou corporal devolvida a você.
- Trata-se de **transferência internacional de dado pessoal sensível**, realizada
  com fundamento no art. 33 da LGPD e no seu consentimento específico.
- O resultado da análise é **uma estimativa automatizada**, não um diagnóstico. A
  interpretação clínica cabe ao profissional que acompanha você.
- Você tem direito a solicitar revisão humana de decisões automatizadas que
  afetem seus interesses (art. 20). Na prática, o profissional da clínica revisa
  e ajusta as estimativas.
- **Se você não quiser que suas imagens sejam enviadas a terceiros, não utilize as
  funcionalidades de foto.** O registro manual de refeições permanece disponível.

## 5. Com quem compartilhamos

- **Com a clínica que atende você** — é a controladora dos seus dados de saúde e
  tem acesso integral ao seu acompanhamento.
- **Com os provedores de inteligência artificial**, apenas as imagens enviadas
  para análise, conforme o item 4.
- **Com provedores de infraestrutura em nuvem** ([AMAZON WEB SERVICES], região
  [REGIÃO]), que hospedam a aplicação e os dados sob contrato de confidencialidade.
- **Com processadores de pagamento**, quando houver cobrança.
- **Com autoridades públicas**, quando houver requisição legal ou ordem judicial.

Não vendemos seus dados, não os utilizamos para publicidade e não os
compartilhamos com terceiros para finalidades próprias deles.

## 6. Registro de acessos

Toda consulta e alteração de dados clínicos na plataforma gera um registro com o
usuário responsável, a operação, o caminho acessado e o momento. Esse registro
cumpre o art. 37 da LGPD e existe para que qualquer acesso indevido possa ser
identificado. Ele fica disponível para a clínica e para a [RAZÃO SOCIAL].

## 7. Por quanto tempo guardamos

**A sua conta de acesso** é mantida enquanto durar o seu vínculo com a clínica ou
até você pedir a exclusão.

**As fotografias de refeições** são apagadas automaticamente após [365] dias.
Elas cumprem sua finalidade no momento da análise; as informações nutricionais
extraídas permanecem no seu registro.

**O seu registro nutricional** — refeições, medidas, condições clínicas e plano
alimentar — é mantido pela clínica pelo prazo legal de guarda de prontuário de
paciente, de no mínimo **20 anos contados do último registro**, conforme a Lei
13.787/2018 e as normas do Conselho Federal de Nutricionistas. Esse prazo é uma
**obrigação legal da clínica** e prevalece sobre o pedido de exclusão, nos termos
do art. 16, I da LGPD.

## 8. Excluir a sua conta

Você pode excluir a sua conta a qualquer momento, **pelo próprio aplicativo**, em
Configurações, ou pela página [URL DE SOLICITAÇÃO DE EXCLUSÃO], sem precisar
instalar o aplicativo.

**O que é apagado imediatamente:**

- suas credenciais de acesso e o vínculo do seu e-mail com a conta;
- todas as sessões ativas — o acesso é encerrado na hora;
- sua foto de perfil e as fotografias de refeições, inclusive do armazenamento em
  nuvem;
- seus registros de uso da inteligência artificial.

**O que permanece:** o seu registro nutricional, sob guarda da clínica, pelo prazo
descrito no item 7. Ele deixa de ser acessível pelo aplicativo, não é mais
processado por inteligência artificial e será eliminado ao fim do prazo legal.

A sua solicitação fica registrada, com data e prazo de guarda aplicável, como
comprovante de atendimento.

## 9. Os seus direitos

Nos termos do art. 18 da LGPD, você pode solicitar: confirmação da existência de
tratamento; acesso aos dados; correção de dados incompletos ou desatualizados;
anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
desconformidade; portabilidade; informação sobre compartilhamentos; informação
sobre a possibilidade de não consentir e suas consequências; e revogação do
consentimento.

Para exercer qualquer um deles, escreva para [E-MAIL DO ENCARREGADO]. Pedidos
sobre o conteúdo clínico devem ser dirigidos à clínica, que é a controladora
desses dados. Responderemos nos prazos do art. 19 da LGPD.

## 10. Crianças e adolescentes

Quando o paciente for menor de 18 anos, o tratamento dos dados depende de
consentimento específico e destacado de pelo menos um dos pais ou do responsável
legal, nos termos do art. 14 da LGPD, sempre no melhor interesse do menor. Cabe à
clínica obter e registrar esse consentimento antes de habilitar o acesso.

## 11. Segurança

Adotamos, entre outras medidas: criptografia dos dados em repouso no banco de
dados e no armazenamento de arquivos; transmissão por canal criptografado;
armazenamento de senhas apenas como resumo criptográfico; isolamento lógico entre
clínicas, de modo que uma não alcance os dados de outra; acesso individualizado e
registrado; e credencial de primeiro acesso de uso único e prazo determinado.

Em caso de incidente de segurança com risco relevante a você, comunicaremos a
Autoridade Nacional de Proteção de Dados e os titulares afetados, conforme o art.
48 da LGPD.

## 12. Alterações desta política

Podemos atualizar esta política. Quando a mudança for relevante, uma nova versão
será publicada e o seu aceite será solicitado novamente no aplicativo. As versões
anteriores e a data do seu aceite ficam registradas.

## 13. Contato

[RAZÃO SOCIAL] — CNPJ [CNPJ]
[ENDEREÇO COMPLETO]
Encarregado: [NOME] — [E-MAIL DO ENCARREGADO]
