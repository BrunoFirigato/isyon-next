import type { Metadata } from 'next'
import { DocHeader, H2, P, UL, Strong } from '../_components'

export const metadata: Metadata = {
  title: 'Política de Privacidade · Isyon CRM',
  description: 'Como o Isyon CRM coleta, usa e protege os dados pessoais, em conformidade com a LGPD.',
}

export default function PoliticaPrivacidadePage() {
  return (
    <>
      <DocHeader titulo="Política de Privacidade" atualizado="3 de junho de 2026" />

      <P>
        Esta Política de Privacidade descreve como o <Strong>Isyon CRM</Strong>, operado por{' '}
        <Strong>[RAZÃO SOCIAL]</Strong>, inscrita no CNPJ sob nº <Strong>[CNPJ]</Strong> (&quot;Isyon&quot;,
        &quot;nós&quot;), coleta, utiliza, armazena e protege os dados pessoais dos usuários, em conformidade
        com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
      </P>

      <H2>1. Quem é o controlador dos dados</H2>
      <P>
        O Isyon atua como <Strong>controlador</Strong> dos dados de cadastro e uso da plataforma, e como{' '}
        <Strong>operador</Strong> em relação aos dados que você (cliente) insere no sistema sobre seus
        próprios clientes, leads e operações comerciais. Nesses casos, você é o controlador desses dados.
      </P>

      <H2>2. Quais dados coletamos</H2>
      <UL>
        <li><Strong>Dados de cadastro:</Strong> nome, e-mail, nome da empresa e senha (armazenada de forma criptografada).</li>
        <li><Strong>Dados de uso:</Strong> registros de acesso, data e hora de login, endereço IP e ações realizadas na plataforma.</li>
        <li><Strong>Dados inseridos por você:</Strong> informações de clientes, leads, propostas, pedidos e demais registros comerciais que você cadastra no sistema.</li>
      </UL>

      <H2>3. Para que usamos os dados</H2>
      <UL>
        <li>Fornecer, operar e manter a plataforma e suas funcionalidades;</li>
        <li>Autenticar acessos e garantir a segurança da sua conta;</li>
        <li>Prestar suporte e comunicar avisos importantes sobre o serviço;</li>
        <li>Cumprir obrigações legais e regulatórias;</li>
        <li>Melhorar a experiência e desenvolver novos recursos.</li>
      </UL>

      <H2>4. Base legal para o tratamento</H2>
      <P>
        Tratamos dados pessoais com base na <Strong>execução de contrato</Strong> (para fornecer o serviço),
        no <Strong>cumprimento de obrigação legal</Strong>, no <Strong>legítimo interesse</Strong> (para
        segurança e melhoria do serviço) e no <Strong>consentimento</Strong>, quando aplicável.
      </P>

      <H2>5. Compartilhamento com terceiros</H2>
      <P>
        Não vendemos seus dados. Compartilhamos informações apenas com prestadores essenciais à operação,
        que atuam como suboperadores sob obrigações de segurança e confidencialidade:
      </P>
      <UL>
        <li><Strong>Supabase</Strong> — banco de dados e autenticação;</li>
        <li><Strong>Vercel</Strong> — hospedagem da aplicação.</li>
      </UL>
      <P>
        Também poderemos compartilhar dados quando exigido por lei, ordem judicial ou autoridade competente.
      </P>

      <H2>6. Seus direitos como titular</H2>
      <P>Nos termos da LGPD, você pode, a qualquer momento, solicitar:</P>
      <UL>
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade dos dados;</li>
        <li>Eliminação dos dados tratados com base no consentimento;</li>
        <li>Revogação do consentimento.</li>
      </UL>

      <H2>7. Segurança da informação</H2>
      <P>
        Adotamos medidas técnicas e organizacionais para proteger os dados contra acessos não autorizados,
        perda ou alteração — incluindo criptografia de senhas, comunicação por HTTPS, controle de acesso por
        perfil e isolamento de dados por empresa (multi-tenant).
      </P>

      <H2>8. Retenção e eliminação</H2>
      <P>
        Mantemos os dados pelo tempo necessário ao cumprimento das finalidades descritas ou de obrigações
        legais. Encerrada a conta, os dados poderão ser eliminados ou anonimizados, salvo quando a retenção
        for exigida por lei.
      </P>

      <H2>9. Cookies</H2>
      <P>
        Utilizamos cookies estritamente necessários para autenticação e funcionamento da sessão. Eles não são
        usados para publicidade.
      </P>

      <H2>10. Encarregado pelo tratamento (DPO)</H2>
      <P>
        Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato com o
        encarregado de proteção de dados pelo e-mail{' '}
        <Strong>contato@isyon.com.br</Strong>.
      </P>

      <H2>11. Alterações desta política</H2>
      <P>
        Podemos atualizar esta política periodicamente. A data da última revisão é indicada no topo desta
        página. Recomendamos a consulta regular.
      </P>
    </>
  )
}
