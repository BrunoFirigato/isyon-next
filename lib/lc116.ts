// lib/lc116.ts
// Lista de serviços da Lei Complementar 116/2003 (atualizada pela LC 157/2016).
// Código de serviço usado na NFS-e / ISS. Lista fixa — conferir códigos específicos do município.

export interface ServicoLC116 { codigo: string; descricao: string }

export const LC116: ServicoLC116[] = [
  // 01 — Serviços de informática e congêneres
  { codigo: '01.01', descricao: 'Análise e desenvolvimento de sistemas' },
  { codigo: '01.02', descricao: 'Programação' },
  { codigo: '01.03', descricao: 'Processamento, armazenamento ou hospedagem de dados, textos, imagens, vídeos, páginas eletrônicas, aplicativos e sistemas de informação, entre outros formatos, e congêneres' },
  { codigo: '01.04', descricao: 'Elaboração de programas de computadores, inclusive de jogos eletrônicos, independentemente da arquitetura construtiva da máquina' },
  { codigo: '01.05', descricao: 'Licenciamento ou cessão de direito de uso de programas de computação' },
  { codigo: '01.06', descricao: 'Assessoria e consultoria em informática' },
  { codigo: '01.07', descricao: 'Suporte técnico em informática, inclusive instalação, configuração e manutenção de programas de computação e bancos de dados' },
  { codigo: '01.08', descricao: 'Planejamento, confecção, manutenção e atualização de páginas eletrônicas' },
  { codigo: '01.09', descricao: 'Disponibilização, sem cessão definitiva, de conteúdos de áudio, vídeo, imagem e texto por meio da internet (streaming)' },

  // 02 — Pesquisas e desenvolvimento
  { codigo: '02.01', descricao: 'Serviços de pesquisas e desenvolvimento de qualquer natureza' },

  // 03 — Locação, cessão de direito de uso e congêneres
  { codigo: '03.02', descricao: 'Cessão de direito de uso de marcas e de sinais de propaganda' },
  { codigo: '03.03', descricao: 'Exploração de salões de festas, centro de convenções, escritórios virtuais, stands, quadras esportivas, estádios, ginásios, auditórios, casas de espetáculos, parques de diversões, canchas e congêneres' },
  { codigo: '03.04', descricao: 'Locação, sublocação, arrendamento, direito de passagem ou permissão de uso, compartilhado ou não, de ferrovia, rodovia, postes, cabos, dutos e condutos' },
  { codigo: '03.05', descricao: 'Cessão de andaimes, palcos, coberturas e outras estruturas de uso temporário' },

  // 04 — Serviços de saúde, assistência médica e congêneres
  { codigo: '04.01', descricao: 'Medicina e biomedicina' },
  { codigo: '04.02', descricao: 'Análises clínicas, patologia, eletricidade médica, radioterapia, quimioterapia, ultra-sonografia, ressonância magnética, radiologia, tomografia e congêneres' },
  { codigo: '04.03', descricao: 'Hospitais, clínicas, laboratórios, sanatórios, manicômios, casas de saúde, prontos-socorros, ambulatórios e congêneres' },
  { codigo: '04.06', descricao: 'Enfermagem, inclusive serviços auxiliares' },
  { codigo: '04.07', descricao: 'Serviços farmacêuticos' },
  { codigo: '04.08', descricao: 'Terapia ocupacional, fisioterapia e fonoaudiologia' },
  { codigo: '04.11', descricao: 'Obstetrícia' },
  { codigo: '04.12', descricao: 'Odontologia' },
  { codigo: '04.13', descricao: 'Ortóptica' },
  { codigo: '04.14', descricao: 'Próteses sob encomenda' },
  { codigo: '04.16', descricao: 'Nutrição' },
  { codigo: '04.19', descricao: 'Bancos de sangue, leite, pele, olhos, óvulos, sêmen e congêneres' },
  { codigo: '04.22', descricao: 'Planos de medicina de grupo ou individual e convênios para prestação de assistência médica, hospitalar, odontológica e congêneres' },
  { codigo: '04.23', descricao: 'Outros planos de saúde que se cumpram através de serviços de terceiros contratados, credenciados, cooperados ou apenas pagos pelo operador do plano mediante indicação do beneficiário' },

  // 05 — Medicina e assistência veterinária
  { codigo: '05.01', descricao: 'Medicina veterinária e zootecnia' },
  { codigo: '05.02', descricao: 'Hospitais, clínicas, ambulatórios, prontos-socorros e congêneres, na área veterinária' },
  { codigo: '05.07', descricao: 'Planos de atendimento e assistência médico-veterinária' },
  { codigo: '05.09', descricao: 'Guarda, tratamento, amestramento, embelezamento, alojamento e congêneres' },

  // 06 — Cuidados pessoais, estética, atividades físicas e congêneres
  { codigo: '06.01', descricao: 'Barbearia, cabeleireiros, manicuros, pedicuros e congêneres' },
  { codigo: '06.02', descricao: 'Esteticistas, tratamento de pele, depilação e congêneres' },
  { codigo: '06.03', descricao: 'Banhos, duchas, sauna, massagens e congêneres' },
  { codigo: '06.04', descricao: 'Ginástica, dança, esportes, natação, artes marciais e demais atividades físicas' },
  { codigo: '06.05', descricao: 'Centros de emagrecimento, spa e congêneres' },
  { codigo: '06.06', descricao: 'Aplicação de tatuagens, piercings e congêneres' },

  // 07 — Construção civil, engenharia e congêneres
  { codigo: '07.01', descricao: 'Engenharia, agronomia, agrimensura, arquitetura, geologia, urbanismo, paisagismo e congêneres' },
  { codigo: '07.02', descricao: 'Execução, por administração, empreitada ou subempreitada, de obras de construção civil, hidráulica ou elétrica e de outras obras semelhantes, inclusive sondagem, perfuração de poços, escavação, drenagem e irrigação, terraplanagem, pavimentação, concretagem e a instalação e montagem de produtos, peças e equipamentos' },
  { codigo: '07.03', descricao: 'Elaboração de planos diretores, estudos de viabilidade, estudos organizacionais e outros, relacionados com obras e serviços de engenharia; elaboração de anteprojetos, projetos básicos e projetos executivos para trabalhos de engenharia' },
  { codigo: '07.04', descricao: 'Demolição' },
  { codigo: '07.05', descricao: 'Reparação, conservação e reforma de edifícios, estradas, pontes, portos e congêneres' },
  { codigo: '07.06', descricao: 'Colocação e instalação de tapetes, carpetes, assoalhos, cortinas, revestimentos de parede, vidros, divisórias, placas de gesso e congêneres, com material fornecido pelo tomador do serviço' },
  { codigo: '07.09', descricao: 'Varrição, coleta, remoção, incineração, tratamento, reciclagem, separação e destinação final de lixo, rejeitos e outros resíduos quaisquer' },
  { codigo: '07.10', descricao: 'Limpeza, manutenção e conservação de vias e logradouros públicos, imóveis, chaminés, piscinas, parques, jardins e congêneres' },
  { codigo: '07.11', descricao: 'Decoração e jardinagem, inclusive corte e poda de árvores' },
  { codigo: '07.12', descricao: 'Controle e tratamento de efluentes de qualquer natureza e de agentes físicos, químicos e biológicos' },
  { codigo: '07.16', descricao: 'Florestamento, reflorestamento, semeadura, adubação, reparação de solo, plantio, silagem, colheita, corte e descascamento de árvores, silvicultura, exploração florestal e dos serviços congêneres indissociáveis da formação, manutenção e colheita de florestas, para quaisquer fins e por quaisquer meios' },
  { codigo: '07.19', descricao: 'Acompanhamento e fiscalização da execução de obras de engenharia, arquitetura e urbanismo' },

  // 08 — Educação, ensino, orientação pedagógica e congêneres
  { codigo: '08.01', descricao: 'Ensino regular pré-escolar, fundamental, médio e superior' },
  { codigo: '08.02', descricao: 'Instrução, treinamento, orientação pedagógica e educacional, avaliação de conhecimentos de qualquer natureza' },

  // 09 — Hospedagem, turismo, viagens e congêneres
  { codigo: '09.01', descricao: 'Hospedagem de qualquer natureza em hotéis, apart-service condominiais, flat, apart-hotéis, hotéis residência, residence-service, suite service, hotelaria marítima, motéis, pensões e congêneres' },
  { codigo: '09.02', descricao: 'Agenciamento, organização, promoção, intermediação e execução de programas de turismo, passeios, viagens, excursões, hospedagens e congêneres' },
  { codigo: '09.03', descricao: 'Guias de turismo' },

  // 10 — Intermediação e congêneres
  { codigo: '10.01', descricao: 'Agenciamento, corretagem ou intermediação de câmbio, de seguros, de cartões de crédito, de planos de saúde e de planos de previdência privada' },
  { codigo: '10.02', descricao: 'Agenciamento, corretagem ou intermediação de títulos em geral, valores mobiliários e contratos quaisquer' },
  { codigo: '10.05', descricao: 'Agenciamento, corretagem ou intermediação de bens móveis ou imóveis, não abrangidos em outros itens ou subitens, inclusive aqueles realizados no âmbito de Bolsas de Mercadorias e Futuros' },
  { codigo: '10.09', descricao: 'Representação de qualquer natureza, inclusive comercial' },

  // 11 — Guarda, estacionamento, armazenamento, vigilância e congêneres
  { codigo: '11.01', descricao: 'Guarda e estacionamento de veículos terrestres automotores, de aeronaves e de embarcações' },
  { codigo: '11.02', descricao: 'Vigilância, segurança ou monitoramento de bens, pessoas e semoventes' },
  { codigo: '11.04', descricao: 'Armazenamento, depósito, carga, descarga, arrumação e guarda de bens de qualquer espécie' },

  // 12 — Diversões, lazer, entretenimento e congêneres
  { codigo: '12.01', descricao: 'Espetáculos teatrais' },
  { codigo: '12.07', descricao: 'Shows, ballet, danças, desfiles, bailes, óperas, concertos, recitais, festivais e congêneres' },
  { codigo: '12.13', descricao: 'Produção, mediante ou sem encomenda prévia, de eventos, espetáculos, entrevistas, shows, ballet, danças, desfiles, bailes, teatros, óperas, concertos, recitais, festivais e congêneres' },

  // 13 — Fonografia, fotografia, cinematografia e reprografia
  { codigo: '13.03', descricao: 'Fotografia e cinematografia, inclusive revelação, ampliação, cópia, reprodução, trucagem e congêneres' },
  { codigo: '13.05', descricao: 'Composição gráfica, inclusive confecção de impressos gráficos, fotocomposição, clicheria, zincografia, litografia e fotolitografia, exceto se destinados a posterior operação de comercialização ou industrialização' },

  // 14 — Serviços relativos a bens de terceiros
  { codigo: '14.01', descricao: 'Lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos, motores, elevadores ou de qualquer objeto (exceto peças e partes empregadas, sujeitas ao ICMS)' },
  { codigo: '14.02', descricao: 'Assistência técnica' },
  { codigo: '14.03', descricao: 'Recondicionamento de motores (exceto peças e partes empregadas, sujeitas ao ICMS)' },
  { codigo: '14.05', descricao: 'Restauração, recondicionamento, acondicionamento, pintura, beneficiamento, lavagem, secagem, tingimento, galvanoplastia, anodização, corte, recorte, plastificação, costura, acabamento, polimento e congêneres de objetos quaisquer' },
  { codigo: '14.06', descricao: 'Instalação e montagem de aparelhos, máquinas e equipamentos, inclusive montagem industrial, prestados ao usuário final, exclusivamente com material por ele fornecido' },
  { codigo: '14.09', descricao: 'Alfaiataria e costura, quando o material for fornecido pelo usuário final, exceto aviamento' },
  { codigo: '14.13', descricao: 'Carpintaria e serralheria' },

  // 15 — Serviços relacionados ao setor bancário ou financeiro
  { codigo: '15.01', descricao: 'Administração de fundos quaisquer, de consórcio, de cartão de crédito ou débito e congêneres, de carteira de clientes, de cheques pré-datados e congêneres' },
  { codigo: '15.10', descricao: 'Serviços relacionados a cobranças, recebimentos ou pagamentos em geral' },

  // 16 — Serviços de transporte de natureza municipal
  { codigo: '16.01', descricao: 'Serviços de transporte coletivo municipal rodoviário, metroviário, ferroviário e aquaviário de passageiros' },
  { codigo: '16.02', descricao: 'Outros serviços de transporte de natureza municipal' },

  // 17 — Serviços de apoio técnico, administrativo, jurídico, contábil, comercial e congêneres
  { codigo: '17.01', descricao: 'Assessoria ou consultoria de qualquer natureza, não contida em outros itens desta lista; análise, exame, pesquisa, coleta, compilação e fornecimento de dados e informações de qualquer natureza, inclusive cadastro e similares' },
  { codigo: '17.02', descricao: 'Datilografia, digitação, estenografia, expediente, secretaria em geral, resposta audível, redação, edição, interpretação, revisão, tradução, apoio e infra-estrutura administrativa e congêneres' },
  { codigo: '17.03', descricao: 'Planejamento, coordenação, programação ou organização técnica, financeira ou administrativa' },
  { codigo: '17.05', descricao: 'Fornecimento de mão-de-obra, mesmo em caráter temporário, inclusive de empregados ou trabalhadores, avulsos ou temporários, contratados pelo prestador de serviço' },
  { codigo: '17.06', descricao: 'Propaganda e publicidade, inclusive promoção de vendas, planejamento de campanhas ou sistemas de publicidade, elaboração de desenhos, textos e demais materiais publicitários' },
  { codigo: '17.09', descricao: 'Perícias, laudos, exames técnicos e análises técnicas' },
  { codigo: '17.10', descricao: 'Planejamento, organização e administração de feiras, exposições, congressos e congêneres' },
  { codigo: '17.12', descricao: 'Administração em geral, inclusive de bens e negócios de terceiros' },
  { codigo: '17.14', descricao: 'Advocacia' },
  { codigo: '17.19', descricao: 'Contabilidade, inclusive serviços técnicos e auxiliares' },
  { codigo: '17.20', descricao: 'Consultoria e assessoria econômica ou financeira' },
  { codigo: '17.22', descricao: 'Cobrança em geral' },

  // 18 — Serviços de regulação de sinistros, vistoria, perícia (seguros)
  { codigo: '18.01', descricao: 'Serviços de regulação de sinistros vinculados a contratos de seguros; inspeção e avaliação de riscos para cobertura de contratos de seguros; prevenção e gerência de riscos seguráveis e congêneres' },

  // 19 — Distribuição e venda de bilhetes e demais produtos de loteria
  { codigo: '19.01', descricao: 'Serviços de distribuição e venda de bilhetes e demais produtos de loteria, bingos, cartões, pules ou cupons de apostas, sorteios, prêmios, inclusive os decorrentes de títulos de capitalização e congêneres' },

  // 20 — Serviços portuários, aeroportuários, ferroportuários
  { codigo: '20.01', descricao: 'Serviços portuários, ferroportuários, utilização de porto, movimentação de passageiros, reboque de embarcações, e congêneres' },

  // 22 — Serviços de exploração de rodovia
  { codigo: '22.01', descricao: 'Serviços de exploração de rodovia mediante cobrança de preço ou pedágio dos usuários' },

  // 23 — Serviços de programação e comunicação visual, desenho industrial
  { codigo: '23.01', descricao: 'Serviços de programação e comunicação visual, desenho industrial e congêneres' },

  // 24 — Serviços de chaveiros, confecção de carimbos, placas, sinalização visual
  { codigo: '24.01', descricao: 'Serviços de chaveiros, confecção de carimbos, placas, sinalização visual, banners, adesivos e congêneres' },

  // 25 — Serviços funerários
  { codigo: '25.01', descricao: 'Funerais, inclusive fornecimento de caixão, urna ou esquifes; aluguel de capela; transporte do corpo cadavérico; fornecimento de flores, coroas e outros paramentos; desembaraço de certidão de óbito; fornecimento de véu, essa e outros adornos; embalsamento, embelezamento, conservação ou restauração de cadáveres' },
  { codigo: '25.02', descricao: 'Translado intramunicipal e cremação de corpos e partes de corpos cadavéricos' },
  { codigo: '25.04', descricao: 'Manutenção e conservação de jazigos e cemitérios' },

  // 26 — Serviços de coleta, remessa ou entrega de correspondências
  { codigo: '26.01', descricao: 'Serviços de coleta, remessa ou entrega de correspondências, documentos, objetos, bens ou valores, inclusive pelos correios e suas agências franqueadas; courier e congêneres' },

  // 27 — Serviços de assistência social
  { codigo: '27.01', descricao: 'Serviços de assistência social' },

  // 28 — Serviços de avaliação de bens e serviços
  { codigo: '28.01', descricao: 'Serviços de avaliação de bens e serviços de qualquer natureza' },

  // 31 — Serviços técnicos em edificações, eletrônica, eletrotécnica, mecânica, telecomunicações
  { codigo: '31.01', descricao: 'Serviços técnicos em edificações, eletrônica, eletrotécnica, mecânica, telecomunicações e congêneres' },

  // 32 — Serviços de desenhos técnicos
  { codigo: '32.01', descricao: 'Serviços de desenhos técnicos' },

  // 33 — Serviços de desembaraço aduaneiro, comissários, despachantes
  { codigo: '33.01', descricao: 'Serviços de desembaraço aduaneiro, comissários, despachantes e congêneres' },

  // 34 — Serviços de investigações particulares, detetives
  { codigo: '34.01', descricao: 'Serviços de investigações particulares, detetives e congêneres' },

  // 35 — Serviços de reportagem, assessoria de imprensa, jornalismo
  { codigo: '35.01', descricao: 'Serviços de reportagem, assessoria de imprensa, jornalismo e relações públicas' },

  // 36 — Serviços de meteorologia
  { codigo: '36.01', descricao: 'Serviços de meteorologia' },

  // 37 — Serviços de artistas, atletas, modelos e manequins
  { codigo: '37.01', descricao: 'Serviços de artistas, atletas, modelos e manequins' },

  // 38 — Serviços de museologia
  { codigo: '38.01', descricao: 'Serviços de museologia' },

  // 39 — Serviços de ourivesaria e lapidação
  { codigo: '39.01', descricao: 'Serviços de ourivesaria e lapidação (quando o material for fornecido pelo tomador do serviço)' },

  // 40 — Serviços relativos a obras de arte sob encomenda
  { codigo: '40.01', descricao: 'Obras de arte sob encomenda' },
]
