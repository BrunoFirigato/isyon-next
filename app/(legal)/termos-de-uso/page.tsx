import type { Metadata } from 'next'
import { DocHeader, H2, P, UL, Strong } from '../_components'

export const metadata: Metadata = {
  title: 'Termos de Uso · Isyon CRM',
  description: 'Condições de uso da plataforma Isyon CRM.',
}

export default function TermosDeUsoPage() {
  return (
    <>
      <DocHeader titulo="Termos de Uso" atualizado="3 de junho de 2026" />

      <P>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma <Strong>Isyon CRM</Strong>,
        operada por <Strong>[RAZÃO SOCIAL]</Strong>, CNPJ <Strong>[CNPJ]</Strong> (&quot;Isyon&quot;). Ao
        criar uma conta ou utilizar o serviço, você declara que leu, compreendeu e concorda com estes termos.
      </P>

      <H2>1. Descrição do serviço</H2>
      <P>
        O Isyon CRM é uma plataforma de gestão comercial (CRM) disponibilizada como serviço (SaaS), que
        permite o gerenciamento de leads, oportunidades, clientes, propostas, pedidos e demais processos
        comerciais.
      </P>

      <H2>2. Cadastro e conta</H2>
      <UL>
        <li>Você é responsável pela veracidade das informações fornecidas no cadastro;</li>
        <li>As credenciais de acesso são pessoais e intransferíveis;</li>
        <li>Você é responsável por manter a confidencialidade da sua senha e por toda atividade realizada em sua conta;</li>
        <li>Notifique-nos imediatamente em caso de uso não autorizado da sua conta.</li>
      </UL>

      <H2>3. Responsabilidades do usuário</H2>
      <P>Ao utilizar a plataforma, você concorda em <Strong>não</Strong>:</P>
      <UL>
        <li>Utilizar o serviço para fins ilícitos ou que violem direitos de terceiros;</li>
        <li>Inserir dados de terceiros sem a devida base legal ou consentimento;</li>
        <li>Tentar acessar áreas restritas, comprometer a segurança ou interferir no funcionamento da plataforma;</li>
        <li>Reproduzir, distribuir ou explorar comercialmente o serviço sem autorização.</li>
      </UL>

      <H2>4. Dados e privacidade</H2>
      <P>
        O tratamento de dados pessoais segue a nossa Política de Privacidade. Os dados que você insere no
        sistema permanecem sob sua responsabilidade e controle, atuando o Isyon como operador desses dados.
      </P>

      <H2>5. Propriedade intelectual</H2>
      <P>
        A plataforma, sua marca, código, design e funcionalidades são de propriedade do Isyon e protegidos por
        lei. Estes termos não transferem qualquer direito de propriedade intelectual ao usuário.
      </P>

      <H2>6. Disponibilidade</H2>
      <P>
        Empenhamo-nos para manter o serviço disponível e estável, mas ele é fornecido &quot;no estado em que
        se encontra&quot;. Poderão ocorrer interrupções para manutenção, atualizações ou por fatores fora do
        nosso controle, sem que isso configure descumprimento.
      </P>

      <H2>7. Limitação de responsabilidade</H2>
      <P>
        Na máxima extensão permitida em lei, o Isyon não se responsabiliza por danos indiretos, lucros
        cessantes ou perda de dados decorrentes de uso indevido, falhas de terceiros ou caso fortuito/força
        maior. Você é responsável por manter cópias de segurança das suas informações relevantes.
      </P>

      <H2>8. Cancelamento</H2>
      <P>
        Você pode encerrar sua conta a qualquer momento. Poderemos suspender ou encerrar contas que violem
        estes termos. O tratamento dos dados após o encerramento segue a Política de Privacidade.
      </P>

      <H2>9. Alterações dos termos</H2>
      <P>
        Estes termos podem ser atualizados periodicamente. A versão vigente é sempre a publicada nesta página,
        com a data de última atualização indicada no topo.
      </P>

      <H2>10. Foro</H2>
      <P>
        Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de{' '}
        <Strong>[CIDADE/UF]</Strong> para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por
        mais privilegiado que seja.
      </P>
    </>
  )
}
