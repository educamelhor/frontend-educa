// src/features/professores/provas/templateDefinitions.js
// Central source of truth for area colors and template visual styles

export const AREAS = [
  {
    id: 'EXATAS',
    label: 'Exatas',
    emoji: '🔬',
    cor: '#1e40af',
    corClaro: '#dbeafe',
    corTexto: '#1e3a8a',
    gradiente: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    disciplinas: 'Ciências · Matemática · Geometria · Física',
    instrucoesPadrao: `1. Este CADERNO DE QUESTÕES contém 25 questões dispostas da seguinte maneira:\na) questões de número 1 a 12, relativas à área de Ciências e suas Tecnologias;\nb) questões de número 13 a 22, relativas à área de Matemática e suas Tecnologias;\nc) questões de número 23 a 25, relativas à área de Geometria e suas Tecnologias.\n\n2. Confira se a quantidade e a ordem das questões do seu CADERNO DE QUESTÕES estão de acordo com as instruções anteriores. Caso o caderno esteja incompleto, tenha defeito ou apresente qualquer divergência, comunique ao aplicador da sala.\n\n3. Para cada uma das questões objetivas, são apresentadas 4 opções. Apenas uma responde corretamente à questão.\n\n4. O tempo disponível para estas provas é de 3h00. Reserve tempo suficiente para preencher o CARTÃO-RESPOSTA.\n\n5. Os rascunhos e as marcações assinaladas no CADERNO DE QUESTÕES e no RASCUNHO (se houver) não serão considerados na avaliação.\n\n6. Proibido porte e uso de qualquer tipo de aparelho eletrônico ou digital (celular, fone, smartwatch, etc.)\n\n7. Você poderá deixar o local de prova somente após decorrido 1h00 de prova.`,
  },
  {
    id: 'HUMANAS',
    label: 'Humanas',
    emoji: '📚',
    cor: '#c2410c',
    corClaro: '#ffedd5',
    corTexto: '#9a3412',
    gradiente: 'linear-gradient(135deg, #c2410c, #f97316)',
    disciplinas: 'História · Geografia · Filosofia · Sociologia',
    instrucoesPadrao: `1. Este CADERNO DE QUESTÕES contém 25 questões numeradas de 01 a 25 dispostas da seguinte maneira:\na) questões de número 01 a 12, relativas à área de História e suas Tecnologias;\nb) questões de número 13 a 25, relativas à área de Geografia e suas Tecnologias.\n\n2. Confira se a quantidade e a ordem das questões do seu CADERNO DE QUESTÕES estão de acordo com as instruções anteriores. Caso o caderno esteja incompleto, tenha defeito ou apresente qualquer divergência, comunique ao aplicador da sala.\n\n3. Para cada uma das questões objetivas, são apresentadas 4 opções. Apenas uma responde corretamente à questão.\n\n4. O tempo disponível para estas provas é de 3h00. Reserve tempo suficiente para preencher o CARTÃO-RESPOSTA.\n\n5. Os rascunhos e as marcações assinaladas no CADERNO DE QUESTÕES e no RASCUNHO (se houver) não serão considerados na avaliação.\n\n6. Proibido porte e uso de qualquer tipo de aparelho eletrônico ou digital (celular, fone, smartwatch, etc.)\n\n7. Você poderá deixar o local de prova somente após decorrido 1h00 de prova.`,
  },
  {
    id: 'LINGUAGENS',
    label: 'Linguagens',
    emoji: '✏️',
    cor: '#7c3aed',
    corClaro: '#ede9fe',
    corTexto: '#6d28d9',
    gradiente: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    disciplinas: 'Português · Inglês · Artes · Ed. Física',
    instrucoesPadrao: `1. Este CADERNO DE QUESTÕES contém 25 questões numeradas de 01 a 25 dispostas da seguinte maneira:\na) questões de número 01 a 10, relativas à área de Língua Portuguesa;\nb) questões de número 11 a 15, relativas à área de Educação Artística;\nc) questões de número 16 a 20, relativas à área de Língua Inglesa;\nd) questões de número 21 a 25, relativas à área de Educação Física.\n\n2. Confira se a quantidade e a ordem das questões do seu CADERNO DE QUESTÕES estão de acordo com as instruções anteriores. Caso o caderno esteja incompleto, tenha defeito ou apresente qualquer divergência, comunique ao aplicador da sala.\n\n3. Para cada uma das questões objetivas, são apresentadas 4 opções. Apenas uma responde corretamente à questão.\n\n4. O tempo disponível para estas provas é de 3h00. Reserve tempo suficiente para preencher o CARTÃO-RESPOSTA.\n\n5. Os rascunhos e as marcações assinaladas no CADERNO DE QUESTÕES e no RASCUNHO (se houver) não serão considerados na avaliação.\n\n6. Proibido porte e uso de qualquer tipo de aparelho eletrônico ou digital (celular, fone, smartwatch, etc.)\n\n7. Você poderá deixar o local de prova somente após decorrido 1h00 de prova.`,
  },
  {
    id: 'NATUREZA',
    label: 'Natureza',
    emoji: '🌿',
    cor: '#15803d',
    corClaro: '#dcfce7',
    corTexto: '#166534',
    gradiente: 'linear-gradient(135deg, #15803d, #22c55e)',
    disciplinas: 'Biologia · Ciências da Natureza',
    instrucoesPadrao: `1. Este CADERNO DE QUESTÕES contém 25 questões objetivas de Ciências da Natureza e suas Tecnologias.\n\n2. Confira se a quantidade e a ordem das questões do seu CADERNO DE QUESTÕES estão de acordo com as instruções anteriores. Caso o caderno esteja incompleto, tenha defeito ou apresente qualquer divergência, comunique ao aplicador da sala.\n\n3. Para cada uma das questões objetivas, são apresentadas 4 opções. Apenas uma responde corretamente à questão.\n\n4. O tempo disponível para estas provas é de 3h00. Reserve tempo suficiente para preencher o CARTÃO-RESPOSTA.\n\n5. Os rascunhos e as marcações assinaladas no CADERNO DE QUESTÕES e no RASCUNHO (se houver) não serão considerados na avaliação.\n\n6. Proibido porte e uso de qualquer tipo de aparelho eletrônico ou digital (celular, fone, smartwatch, etc.)\n\n7. Você poderá deixar o local de prova somente após decorrido 1h00 de prova.`,
  },
  {
    id: 'GERAL',
    label: 'Geral',
    emoji: '🎯',
    cor: '#374151',
    corClaro: '#f3f4f6',
    corTexto: '#1f2937',
    gradiente: 'linear-gradient(135deg, #374151, #6b7280)',
    disciplinas: 'Multidisciplinar · Todas as áreas',
    instrucoesPadrao: `1. Este CADERNO DE QUESTÕES contém questões de diversas áreas do conhecimento.\n\n2. Confira se a quantidade e a ordem das questões do seu CADERNO DE QUESTÕES estão de acordo com as instruções anteriores. Caso o caderno esteja incompleto, tenha defeito ou apresente qualquer divergência, comunique ao aplicador da sala.\n\n3. Para cada uma das questões objetivas, são apresentadas 4 opções. Apenas uma responde corretamente à questão.\n\n4. O tempo disponível para estas provas é de 3h00. Reserve tempo suficiente para preencher o CARTÃO-RESPOSTA.\n\n5. Os rascunhos e as marcações assinaladas no CADERNO DE QUESTÕES e no RASCUNHO (se houver) não serão considerados na avaliação.\n\n6. Proibido porte e uso de qualquer tipo de aparelho eletrônico ou digital (celular, fone, smartwatch, etc.)\n\n7. Você poderá deixar o local de prova somente após decorrido 1h00 de prova.`,
  },
];

export const TEMPLATES = [
  { id: 1, nome: 'Clássico',  desc: 'Header institucional, fundo colorido suave, box de instruções' },
  { id: 2, nome: 'Moderno',   desc: 'Faixa colorida lateral, layout limpo e bold' },
  { id: 3, nome: 'Formal',    desc: 'Bordas duplas, header preenchido, visual institucional sóbrio' },
  { id: 4, nome: 'Colorido',  desc: 'Fundo colorido vibrante, instruções em card suave' },
  { id: 5, nome: 'Dark',      desc: 'Fundo escuro elegante, tipografia clara' },
];

export const SERIES_OPTIONS = [
  '6º ANO', '7º ANO', '8º ANO', '9º ANO',
  '1ª SÉRIE', '2ª SÉRIE', '3ª SÉRIE',
];

export const TURNOS_OPTIONS = ['MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL'];

export const BIMESTRES_OPTIONS = [
  { value: 1, label: '1º Bimestre' },
  { value: 2, label: '2º Bimestre' },
  { value: 3, label: '3º Bimestre' },
  { value: 4, label: '4º Bimestre' },
];
