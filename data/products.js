// Catálogo inicial LEDWAVE Portugal (usado só para criar a base de dados na 1.ª execução; depois edita-se no backoffice).
// ATENÇÃO: preços em EUR são PROVISÓRIOS (placeholders) até o Manuel confirmar a tabela.
// price = preço com IVA (23%) incluído, em cêntimos. null = apenas sob orçamento.
module.exports = [
  {
    slug: 'totem-indoor-p25', images: ['https://ledviewbrasil.com/img/totem-indoor-1.jpg', 'https://ledviewbrasil.com/img/totem-indoor-2.jpg', 'https://ledviewbrasil.com/img/totem-indoor-3.jpg', 'https://ledviewbrasil.com/img/totem-indoor-4.jpg'], category: 'totens', art: 'totem', name: 'Totem LED Indoor P2.5',
    tagline: 'Modernize a sua comunicação e transforme a experiência dos seus clientes.',
    price: 449000, rental: { firstDay: 180, extraDay: 95 },
    description: 'Cartaz digital vertical em LED de alta definição, ideal para montras, receções, centros comerciais e pontos de venda. Conteúdos em vídeo e imagem atualizados em segundos.',
    highlights: ['Painel indoor de alta definição', 'Excelente brilho e reprodução de cor', 'Design vertical premium', 'Funcionamento contínuo com baixo consumo'],
    specs: { 'Pixel pitch': 'P2.5 indoor', 'Área de ecrã': '64 × 192 cm', 'Dimensões totais': '65 × 200 cm', 'LED': 'Kinglight SMD — 160.000 pontos/m²', 'Processador': 'Novastar TB1', 'Alimentação': '300 W, 5 V 60 A', 'Utilização': 'Interior', 'Base': 'Com rodízios' }
  },
  {
    slug: 'totem-outdoor-p25', images: ['https://ledviewbrasil.com/img/totem-outdoor-1.jpg', 'https://ledviewbrasil.com/img/totem-outdoor-2.jpg', 'https://ledviewbrasil.com/img/totem-outdoor-3.jpg', 'https://ledviewbrasil.com/img/totem-outdoor-4.jpg'], category: 'totens', art: 'totem-out', name: 'Totem LED Outdoor P2.5',
    tagline: 'Impacto visual para espaços exteriores, legível mesmo ao sol.',
    price: 599000, rental: { firstDay: 220, extraDay: 120 },
    description: 'Totem LED estanque com alto brilho e ventilação inteligente, pensado para esplanadas, entradas de lojas, eventos e feiras ao ar livre.',
    highlights: ['Estrutura estanque à chuva', 'Alto brilho para luz solar direta', 'Ventilação por máscara em malha', 'Inclui flight case e cabos'],
    specs: { 'Pixel pitch': 'P2.5 outdoor', 'Área de ecrã': '64 × 192 cm', 'Dimensões totais': '70 × 216 cm', 'LED': 'Kinglight SMD — 160.000 pontos/m²', 'Processador': 'Novastar TB1', 'Alimentação': '300 W, 5 V 60 A', 'Utilização': 'Exterior', 'Extras': 'Flight case de transporte' }
  },
  {
    slug: 'totem-touch-55', category: 'totens', art: 'touch', name: 'Totem Touch 55"',
    tagline: 'Interatividade para orientar, informar e vender.',
    price: 299000, rental: { firstDay: 150, extraDay: 80 },
    description: 'Totem digital com ecrã tátil de 55", ideal para catálogos interativos, mapas, autoatendimento e receções.',
    highlights: ['Ecrã tátil de grande formato', 'Android integrado', 'Navegação na internet e aplicações', 'Estrutura metálica robusta'],
    specs: { 'Ecrã': '55" UHD tátil', 'Sistema': 'Android', 'Utilização': 'Interior' }
  },
  {
    slug: 'painel-chao-43', images: ['https://ledviewbrasil.com/img/painel-chao-1.jpg', 'https://ledviewbrasil.com/img/painel-chao-2.jpg', 'https://ledviewbrasil.com/img/painel-chao-3.jpg', 'https://ledviewbrasil.com/img/painel-chao-4.jpg'], category: 'totens', art: 'floor', name: 'Totem Digital de Chão 43"',
    tagline: 'Impacte visualmente, conquiste clientes e transforme resultados.',
    price: 229000, rental: { firstDay: 120, extraDay: 65 },
    description: 'Display vertical de 43" com Android e ecrã tátil IR. Reproduz vídeo, imagens e PDF e permite navegar na internet.',
    highlights: ['Ecrã UHD de 43"', 'Ecrã tátil por infravermelhos', 'Reproduz vídeo, imagem e PDF', 'Moldura metálica preta'],
    specs: { 'Ecrã': '43" UHD', 'Sistema': 'Android 12', 'Memória': '2 GB RAM / 32 GB', 'Tátil': 'IR touch', 'Utilização': 'Interior' }
  },
  {
    slug: 'painel-elevador-18', category: 'paineis', art: 'elevator', name: 'Painel de Elevador 18,5"',
    tagline: 'Comunicação no momento de maior atenção.',
    price: 59000, rental: null,
    description: 'Ecrã compacto de parede para elevadores, condomínios e escritórios. Ideal para avisos, publicidade e informação ao residente.',
    highlights: ['Formato compacto de parede', 'Gestão remota de conteúdos', 'Baixo consumo'],
    specs: { 'Ecrã': '18,5"', 'Montagem': 'Parede', 'Utilização': 'Interior' }
  },
  {
    slug: 'painel-elevador-21', category: 'paineis', art: 'elevator', name: 'Painel de Elevador 21,5"',
    tagline: 'Mais área de ecrã para a sua mensagem.',
    price: 69000, rental: null,
    description: 'Versão de 21,5" do painel de elevador, para mais visibilidade em halls, elevadores e corredores.',
    highlights: ['Ecrã Full HD de 21,5"', 'Gestão remota de conteúdos', 'Montagem simples'],
    specs: { 'Ecrã': '21,5" Full HD', 'Montagem': 'Parede', 'Utilização': 'Interior' }
  },
  {
    slug: 'painel-led-medida', category: 'paineis', art: 'wall', name: 'Painel LED Modular à Medida',
    tagline: 'Videowalls LED indoor e outdoor no tamanho exato do seu espaço.',
    price: null, rental: null, quoteOnly: true,
    description: 'Fachadas, palcos, auditórios, igrejas, estádios e montras. Projetamos o painel LED com o pixel pitch e o brilho certos para a distância de visualização e o local.',
    highlights: ['Pixel pitch de P1.5 a P10', 'Versões indoor e outdoor', 'Projeto, estrutura e instalação', 'Contrato de manutenção opcional'],
    specs: { 'Pixel pitch': 'P1.5 – P10', 'Dimensões': 'À medida', 'Utilização': 'Interior ou exterior', 'Instalação': 'Incluída no orçamento' }
  },
  {
    slug: 'quadro-interativo-v100', category: 'interativos', art: 'board', name: 'Quadro Interativo V100 65"',
    tagline: 'Aulas e reuniões mais colaborativas.',
    price: 249000, rental: null,
    description: 'Quadro interativo de 65" 4K para salas de aula e salas de reunião, com escrita multitoque e partilha de ecrã sem fios.',
    highlights: ['Ecrã 4K de 65"', 'Escrita multitoque', 'Partilha de ecrã sem fios'],
    specs: { 'Ecrã': '65" 4K', 'Tátil': 'Multitoque', 'Utilização': 'Interior' }
  },
  {
    slug: 'quadro-interativo-d2', category: 'interativos', art: 'board', name: 'Quadro Interativo D2 65"',
    tagline: 'Desempenho para salas de reunião exigentes.',
    price: 269000, rental: null,
    description: 'Quadro interativo de 65" com desempenho reforçado para videoconferência e trabalho colaborativo.',
    highlights: ['Ecrã 4K de 65"', 'Pronto para videoconferência', 'Escrita fluida'],
    specs: { 'Ecrã': '65" 4K', 'Tátil': 'Multitoque', 'Utilização': 'Interior' }
  },
  {
    slug: 'quadro-interativo-c1', category: 'interativos', art: 'board', name: 'Quadro Interativo C1 65"',
    tagline: 'O topo de gama para ensino e empresas.',
    price: 289000, rental: null,
    description: 'Quadro interativo de 65" de gama superior, com câmara e microfones para salas híbridas.',
    highlights: ['Ecrã 4K de 65"', 'Câmara e microfones integrados', 'Ideal para salas híbridas'],
    specs: { 'Ecrã': '65" 4K', 'Tátil': 'Multitoque', 'Utilização': 'Interior' }
  }
];
