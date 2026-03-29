// src/features/disciplinar/suporte/index.jsx
// ============================================================================
// Manual do Usuário — Módulo Disciplinar
// Tutorial passo a passo com imagens reais do sistema
// ============================================================================

import React, { useState, useRef, useEffect } from "react";
import {
  BookOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BuildingLibraryIcon,
  ArrowUpIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PrinterIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  SparklesIcon,
  BookOpenIcon as BookOpenSolid,
} from "@heroicons/react/24/solid";

// ────────────────────────────────────────────────────────────────
// CONTEÚDO DO MANUAL (Seções, subseções, screenshots)
// ────────────────────────────────────────────────────────────────
const MANUAL = [
  {
    id: "intro",
    titulo: "Introdução",
    icone: BookOpenIcon,
    cor: "#1e3a5f",
    resumo: "Sobre o Módulo Disciplinar e este Manual",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O **Módulo Disciplinar** do EDUCA.MELHOR é a ferramenta oficial para gestão disciplinar das Escolas Cívico-Militares. Através dele, a equipe disciplinar pode registrar, acompanhar e gerenciar todo o fluxo disciplinar dos estudantes — desde o registro de ocorrências até a geração de documentos oficiais como o TACE (Termo de Ajuste de Conduta Escolar) e o Relatório de Registros Disciplinares.",
      },
      {
        tipo: "destaque",
        variante: "info",
        titulo: "Para quem é este manual?",
        valor:
          "Este manual é destinado a todos os membros da equipe disciplinar: Comandante, Subcomandantes, Monitores e demais profissionais autorizados a operar o módulo.",
      },
      {
        tipo: "texto",
        valor:
          "O manual está organizado seguindo o fluxo natural de trabalho, desde o acesso à plataforma até a impressão de documentos oficiais. Cada seção contém capturas de tela reais do sistema para facilitar sua compreensão.",
      },
    ],
  },
  {
    id: "conceitos",
    titulo: "Conceitos Fundamentais",
    icone: LightBulbIcon,
    cor: "#b45309",
    resumo: "Status, ações e terminologias do sistema",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "Antes de iniciar, é fundamental compreender os conceitos e status que regem o funcionamento do módulo disciplinar. Cada ação no sistema possui regras específicas que garantem a integridade e a rastreabilidade dos registros.",
      },
      {
        tipo: "conceitos",
        itens: [
          {
            titulo: "Registrado",
            icone: "📝",
            cor: "#3b82f6",
            bg: "#eff6ff",
            descricao:
              "Registro salvo no sistema, mas ainda não finalizado. Funciona como um rascunho que necessita de um desfecho — por exemplo, a comunicação com o responsável legal. O registro permanece pendente até que seja finalizado pela equipe disciplinar.",
          },
          {
            titulo: "Finalizado",
            icone: "✅",
            cor: "#16a34a",
            bg: "#f0fdf4",
            descricao:
              "Registro que já teve seu desfecho concluído. Quando finalizado, o nome do responsável pela finalização fica registrado permanentemente no sistema. Um registro finalizado não pode ser excluído, apenas cancelado.",
          },
          {
            titulo: "Excluir",
            icone: "🗑️",
            cor: "#ef4444",
            bg: "#fef2f2",
            descricao:
              "Apagar completamente o registro do sistema — ele deixa de existir, não ficando salvo nem como rascunho. ATENÇÃO: Para acionar esta opção, o registro NÃO pode estar finalizado e NÃO pode ter havido convocação do responsável.",
          },
          {
            titulo: "Cancelar",
            icone: "🚫",
            cor: "#a855f7",
            bg: "#faf5ff",
            descricao:
              "Cancela o efeito do registro sem excluí-lo do sistema. O registro permanece gravado porém com status de cancelado, perdendo completamente sua credibilidade e efeito. Não é visualizado em registros impressos e não influencia a pontuação ou o comportamento do estudante.",
          },
        ],
      },
      {
        tipo: "destaque",
        variante: "alerta",
        titulo: "Diferença entre Excluir e Cancelar",
        valor:
          '**Excluir** = apagar definitivamente (só possível para registros não finalizados e sem convocação). **Cancelar** = manter no sistema mas anular todos os efeitos. Quando há dúvida, prefira "Cancelar" para manter o histórico de rastreabilidade.',
      },
    ],
  },
  {
    id: "acesso",
    titulo: "Acesso à Plataforma",
    icone: ShieldCheckIcon,
    cor: "#0d9488",
    resumo: "Como acessar o sistema EDUCA.MELHOR",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O acesso ao sistema EDUCA.MELHOR segue um fluxo seguro em etapas. Apenas membros autorizados e previamente cadastrados pela direção podem acessar o módulo disciplinar.",
      },
      {
        tipo: "passos",
        titulo: "Fluxo de Primeiro Acesso",
        itens: [
          {
            passo: 1,
            titulo: "Recebimento do Link",
            descricao:
              "O Comandante recebe o link de acesso do CEO do EDUCA.MELHOR e realiza seu cadastro e o pré-cadastro da equipe disciplinar com suas respectivas funções.",
          },
          {
            passo: 2,
            titulo: "Pré-Cadastro (por CPF)",
            descricao:
              'Para se cadastrar na plataforma, o membro da equipe entra com seu CPF na opção "Quero me cadastrar", cria uma senha segura e cadastra seu e-mail institucional ou pessoal.',
          },
          {
            passo: 3,
            titulo: "Login na Plataforma",
            descricao:
              'Para acessar a plataforma, entre com o e-mail e a senha cadastrados na aba "Sistema Escolar". Clique em "Continuar" para receber o código de seis dígitos via e-mail e efetuar o login.',
          },
        ],
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/01_login.png",
        alt: "Tela de Login do EDUCA.MELHOR",
        legenda:
          'Tela de Login — insira o e-mail e a senha na aba "Sistema Escolar" e clique em Continuar para receber o código de verificação.',
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/02_home.png",
        alt: "Tela Inicial após login",
        legenda:
          "Tela inicial do sistema após login. No canto superior direito é exibido o nome do usuário, perfil e escola vinculada.",
      },
    ],
  },
  {
    id: "menu",
    titulo: "Menu Disciplinar",
    icone: Cog6ToothIcon,
    cor: "#7c3aed",
    resumo: "Navegação pelos submenus do módulo",
    conteudo: [
      {
        tipo: "texto",
        valor:
          'No menu lateral esquerdo (sidebar), clique em **"Disciplinar"** para expandir o submenu. Serão exibidas todas as opções disponíveis do módulo disciplinar:',
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/03_menu.png",
        alt: "Menu Disciplinar expandido",
        legenda:
          "Menu Disciplinar expandido no sidebar, mostrando todos os submenus disponíveis.",
      },
      {
        tipo: "lista",
        titulo: "Submenus Disponíveis",
        itens: [
          {
            titulo: "Alunos",
            descricao:
              "Lista de estudantes — ponto de partida para registrar ocorrências, acessar a Ficha do Estudante, o Relatório Disciplinar e o TACE.",
          },
          {
            titulo: "Responsáveis",
            descricao:
              "Gestão de responsáveis legais dos estudantes. Cadastro, edição, vínculo e consentimento de imagem.",
          },
          {
            titulo: "Gestão de Equipe",
            descricao:
              "Gerenciamento dos membros da equipe disciplinar. Disponível apenas para Comandante e Diretor Pedagógico.",
          },
          {
            titulo: "Regimentos",
            descricao:
              "Biblioteca de documentos oficiais (Regulamento Disciplinar CCMDF e Manual das Escolas Cívico-Militares) com visualizador embutido.",
          },
          {
            titulo: "Metadados",
            descricao:
              "Dashboard com indicadores, estatísticas e inteligência do módulo disciplinar — como taxa de reincidência, medidas por tipo, convocações pendentes etc.",
          },
          {
            titulo: "Suporte",
            descricao:
              "Este manual do usuário! Tutoriais, central de ajuda e dúvidas frequentes sobre o módulo.",
          },
        ],
      },
    ],
  },
  {
    id: "alunos",
    titulo: "Alunos — Lista e Busca",
    icone: AcademicCapIcon,
    cor: "#1e40af",
    resumo: "Identificar o aluno e acessar suas ações",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O submenu **Alunos** é o ponto de partida do fluxo disciplinar. Nesta tela você encontra todos os estudantes matriculados, organizados em uma tabela com filtros inteligentes.",
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/04_alunos.png",
        alt: "Lista de Alunos - Disciplinar",
        legenda:
          "Lista de Alunos do módulo Disciplinar com filtros por turma, código (RE) e nome do estudante.",
      },
      {
        tipo: "passos",
        titulo: "Como localizar um aluno",
        itens: [
          {
            passo: 1,
            titulo: "Filtrar por Ano Letivo",
            descricao:
              "No seletor superior, escolha o ano letivo desejado (ex: 2026). O sistema carregará apenas alunos matriculados naquele período.",
          },
          {
            passo: 2,
            titulo: "Buscar pelo nome, turma ou código",
            descricao:
              'Na barra de pesquisa (canto superior direito), digite o nome, número de RE ou a turma do estudante. Ex: "6º ANO A" ou "João" ou "469572".',
          },
          {
            passo: 3,
            titulo: "Localizar na tabela",
            descricao:
              "A tabela exibe: RE (código do aluno), Nome, Data de Nascimento, Turma, Ano e Turno. Localize o aluno desejado na lista.",
          },
        ],
      },
      {
        tipo: "destaque",
        variante: "dica",
        titulo: "Dica: Manter Filtro",
        valor:
          'Marque a opção "Manter filtro" para que a busca persista ao navegar entre as telas. Assim, ao retornar para a lista de alunos, o filtro anterior estará preservado.',
      },
      {
        tipo: "texto",
        valor:
          "Na coluna **Ações** de cada aluno, você encontra dois ícones fundamentais:",
      },
      {
        tipo: "lista",
        titulo: "Ícones da Coluna Ações",
        itens: [
          {
            titulo: "📋 Ficha do Estudante",
            descricao:
              "Acessa a ficha completa do aluno, incluindo dados pessoais, turma, responsável legal, histórico de ocorrências e o Relatório Disciplinar. Este é o local indicado para iniciar qualquer registro.",
          },
          {
            titulo: "📄 Relatório de Registros Disciplinares",
            descricao:
              "Gera o PDF do Relatório Disciplinar com todo o histórico de registros até a presente data. Requer que os dados do estudante e do responsável estejam completos.",
          },
        ],
      },
    ],
  },
  {
    id: "ficha",
    titulo: "Ficha do Estudante",
    icone: ClipboardDocumentListIcon,
    cor: "#0369a1",
    resumo: "Relatório Disciplinar, Medidas e TACE",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "A **Ficha do Estudante** é o coração do módulo disciplinar. É a partir dela que você acessa os dois recursos mais importantes: o **Relatório Disciplinar** e o **TACE**.",
      },
      {
        tipo: "passos",
        titulo: "Fluxo Natural de Registro Disciplinar",
        itens: [
          {
            passo: 1,
            titulo: "Acessar a Ficha do Estudante",
            descricao:
              'Na lista de alunos (Disciplinar → Alunos), clique no ícone de "Ficha do Estudante" na coluna Ações do aluno desejado.',
          },
          {
            passo: 2,
            titulo: "Relatório Disciplinar",
            descricao:
              "Dentro da Ficha, acesse o Relatório Disciplinar para consultar e registrar Medidas Disciplinares. Aqui você pode criar novos registros de ocorrências vinculados ao aluno.",
          },
          {
            passo: 3,
            titulo: "Registrar a Ocorrência",
            descricao:
              "Preencha todos os campos do registro: data, medida disciplinar (Advertência Oral, Advertência Escrita, Ações Educativas, Suspensão, Elogio, Transferência), tipo de ocorrência, descrição e pontos.",
          },
          {
            passo: 4,
            titulo: "Salvar como Registrado",
            descricao:
              'Ao salvar, o registro ficará com status "Registrado" (rascunho). Nesta etapa, o registro está salvo mas ainda não finalizado — aguardando desfecho como comunicação com o responsável.',
          },
          {
            passo: 5,
            titulo: "Convocar o Responsável",
            descricao:
              "Se necessário, registre a convocação do responsável legal. Após a convocação, o registro não poderá mais ser excluído (apenas cancelado).",
          },
          {
            passo: 6,
            titulo: "Finalizar o Registro",
            descricao:
              'Após o desfecho da ocorrência, finalize o registro. O status mudará para "Finalizado" e o nome de quem finalizou ficará registrado permanentemente.',
          },
        ],
      },
      {
        tipo: "destaque",
        variante: "alerta",
        titulo: "Importante sobre Finalização",
        valor:
          'Um registro finalizado não pode ser revertido para "Registrado" nem excluído. Caso identifique um erro em um registro finalizado, utilize a opção "Cancelar" para anular seus efeitos.',
      },
    ],
  },
  {
    id: "relatorio",
    titulo: "Relatório de Registros Disciplinares",
    icone: DocumentTextIcon,
    cor: "#dc2626",
    resumo: "Histórico impresso e assinatura do responsável",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O **Relatório de Registros Disciplinares** é o documento oficial impresso que contém todo o histórico disciplinar do estudante até a presente data. É utilizado para conhecimento e assinatura do responsável legal.",
      },
      {
        tipo: "destaque",
        variante: "info",
        titulo: "Quando imprimir?",
        valor:
          "O relatório deve ser impresso preferencialmente quando todos os dados estão cadastrados — tanto do estudante (nome, código, turma, data de nascimento, turno) quanto do responsável legal (nome, CPF, telefone, endereço, e-mail).",
      },
      {
        tipo: "passos",
        titulo: "Como gerar o Relatório",
        itens: [
          {
            passo: 1,
            titulo: "Localizar o Aluno",
            descricao:
              "Na lista de alunos (Disciplinar → Alunos), encontre o estudante desejado.",
          },
          {
            passo: 2,
            titulo: "Clicar no ícone do Relatório",
            descricao:
              'Na coluna Ações, clique no ícone de "Relatório de Registros Disciplinares" (segundo ícone).',
          },
          {
            passo: 3,
            titulo: "Validação Automática",
            descricao:
              "O sistema verificará automaticamente se todos os dados obrigatórios estão preenchidos. Se houver dados faltando, uma janela modal exibirá os campos ausentes organizados por categoria (Estudante / Responsável Legal).",
          },
          {
            passo: 4,
            titulo: "Geração do PDF",
            descricao:
              "Se todos os dados estiverem completos, o PDF será gerado automaticamente e aberto em uma nova aba do navegador, pronto para impressão.",
          },
        ],
      },
      {
        tipo: "destaque",
        variante: "alerta",
        titulo: "Dados Incompletos?",
        valor:
          "Se aparecer a modal de \"Dados Incompletos\", complete os campos faltantes na Ficha do Estudante ou no cadastro do Responsável antes de tentar gerar o PDF novamente.",
      },
    ],
  },
  {
    id: "tace",
    titulo: "TACE — Termo de Ajuste de Conduta",
    icone: ShieldCheckIcon,
    cor: "#ca8a04",
    resumo: "Quando e como registrar o TACE",
    conteudo: [
      {
        tipo: "texto",
        valor:
          'O **TACE (Termo de Ajuste de Conduta Escolar)** é um documento formal previsto no Regulamento Disciplinar. Conforme regimento, deve ser lavrado quando o comportamento do aluno atinge os conceitos **"Insuficiente"** (nota 2,0 a 4,9) ou **"Incompatível"** (nota 0 a 1,9).',
      },
      {
        tipo: "conceitos",
        itens: [
          {
            titulo: "Quando aplicar o TACE?",
            icone: "⚠️",
            cor: "#ca8a04",
            bg: "#fefce8",
            descricao:
              "O TACE deve ser aplicado quando a pontuação disciplinar do aluno for inferior a 5,0 pontos (conceitos V ou VI). Se o aluno estiver com pontuação igual ou superior a 5,0, o sistema exibirá uma confirmação de elegibilidade antes de permitir o registro.",
          },
          {
            titulo: "Pontuação Inicial",
            icone: "🎯",
            cor: "#0284c7",
            bg: "#f0f9ff",
            descricao:
              "Todo aluno inicia o ano letivo com 8,0 pontos (conceito III — Bom). A cada medida disciplinar registrada e finalizada, pontos são adicionados ou subtraídos conforme a tabela de ocorrências.",
          },
        ],
      },
      {
        tipo: "passos",
        titulo: "Fluxo do TACE",
        itens: [
          {
            passo: 1,
            titulo: "Acessar via Ficha do Estudante",
            descricao:
              'Na Ficha do Estudante, localize e clique na opção "TACE" para abrir o formulário.',
          },
          {
            passo: 2,
            titulo: "Verificação de Elegibilidade",
            descricao:
              "O sistema calcula automaticamente a pontuação atual do aluno. Se a pontuação for ≥ 5,0, será exibida uma confirmação alertando que o conceito é Regular ou superior — perguntando se deseja prosseguir mesmo assim.",
          },
          {
            passo: 3,
            titulo: "Preencher os campos do TACE",
            descricao:
              'Preencha os campos obrigatórios: "Reconhecimento dos Fatos" (relato dos fatos) e "Compromisso de Ajuste de Conduta" (compromissos firmados pelo aluno e responsável).',
          },
          {
            passo: 4,
            titulo: "Validação de Dados",
            descricao:
              "Assim como no Relatório Disciplinar, o sistema valida se os dados do estudante e do responsável estão completos antes de gerar o PDF.",
          },
          {
            passo: 5,
            titulo: "Geração do PDF do TACE",
            descricao:
              "O PDF é gerado automaticamente com todos os dados do aluno, histórico de registros, reconhecimento dos fatos e compromissos. O documento é aberto em nova aba para impressão e assinatura.",
          },
        ],
      },
    ],
  },
  {
    id: "responsaveis",
    titulo: "Gestão de Responsáveis",
    icone: UserGroupIcon,
    cor: "#0891b2",
    resumo: "Cadastro, edição e consentimento de imagem",
    conteudo: [
      {
        tipo: "texto",
        valor:
          'O submenu **"Responsáveis"** permite gerenciar os responsáveis legais vinculados aos estudantes. Aqui é possível cadastrar, editar, vincular e emitir termos de consentimento.',
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/05_responsaveis.png",
        alt: "Tela de Responsáveis",
        legenda:
          "Tela de Responsáveis com lista completa, busca, ações de edição e link para consentimento de imagem.",
      },
      {
        tipo: "lista",
        titulo: "Funcionalidades Disponíveis",
        itens: [
          {
            titulo: "Novo Registro",
            descricao:
              "Clique em '+ Novo Registro' para cadastrar um novo responsável. Preencha: Nome Completo*, CPF*, Telefone Principal*, Endereço*, e opcionalmente Telefone Secundário e E-mail. Vincule obrigatoriamente a um estudante.",
          },
          {
            titulo: "Editar Responsável",
            descricao:
              "Clique no ícone de lápis para atualizar os dados de contato do responsável ou vincular novos estudantes.",
          },
          {
            titulo: "Consentimento de Imagem",
            descricao:
              "Clique no ícone de celular para registrar que o responsável autorizou o uso de imagem/biometria dos estudantes vinculados.",
          },
          {
            titulo: "Imprimir Termo",
            descricao:
              "Clique no ícone de impressora para gerar o PDF do Termo de Consentimento de Uso de Imagem, pronto para assinatura do responsável.",
          },
        ],
      },
      {
        tipo: "destaque",
        variante: "dica",
        titulo: "Dados Obrigatórios",
        valor:
          "Os campos **Nome, CPF, Telefone Principal e Endereço** são obrigatórios ao cadastrar ou editar responsáveis no módulo disciplinar. O sistema exibe indicadores visuais (campos em vermelho e contagem de pendências) quando há campos vazios.",
      },
    ],
  },
  {
    id: "ajustes",
    titulo: "Registros de Ocorrências (Ajustes)",
    icone: Cog6ToothIcon,
    cor: "#ea580c",
    resumo: "Configuração das medidas e tipos de ocorrências",
    conteudo: [
      {
        tipo: "texto",
        valor:
          'O submenu **"Ajustes"** (Registros de Ocorrências) é a área de configuração central do módulo. Aqui são cadastradas todas as medidas disciplinares, tipos de ocorrências e respectivas pontuações.',
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/06_ajustes.png",
        alt: "Registros de Ocorrências",
        legenda:
          "Tela de Ajustes com os registros de ocorrências — medida, tipo, descrição, pontuação e status.",
      },
      {
        tipo: "lista",
        titulo: "Campos de cada registro",
        itens: [
          {
            titulo: "Medida Disciplinar",
            descricao:
              "Advertência Oral, Advertência Escrita, Ações Educativas, Suspensão, Elogio ou Transferência.",
          },
          {
            titulo: "Tipo de Ocorrência",
            descricao:
              "Leve, Média, Grave, Individual ou Coletivo.",
          },
          {
            titulo: "Descrição da Ocorrência",
            descricao:
              "Texto descritivo da conduta (ex: 'Usar o celular em sala de aula').",
          },
          {
            titulo: "Pontos",
            descricao:
              "Valor numérico que será somado ou subtraído da pontuação do aluno. Valores negativos (ex: -0.3) reduzem a nota; valores positivos (ex: +0.5) bonificam.",
          },
          {
            titulo: "Status (Ativo / Inativo)",
            descricao:
              "Define se a ocorrência está disponível para uso ao registrar novas medidas disciplinares.",
          },
        ],
      },
    ],
  },
  {
    id: "metadados",
    titulo: "Metadados — Dashboard Analítico",
    icone: ChartBarIcon,
    cor: "#4f46e5",
    resumo: "Indicadores, estatísticas e inteligência",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O submenu **Metadados** apresenta um painel analítico com indicadores e métricas do módulo disciplinar. Atualmente exibe dados de demonstração, que em breve serão integrados com os dados reais do banco.",
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/07_metadados.png",
        alt: "Dashboard de Metadados Disciplinares",
        legenda:
          "Dashboard de Metadados com KPIs, filtros por período e abas de análise.",
      },
      {
        tipo: "lista",
        titulo: "Indicadores Disponíveis",
        itens: [
          {
            titulo: "Convocações Pendentes",
            descricao:
              "Quantidade de responsáveis aguardando convocação pela equipe disciplinar.",
          },
          {
            titulo: "Taxa de Reincidência",
            descricao:
              "Percentual de alunos com 3 ou mais registros disciplinares no período.",
          },
          {
            titulo: "Termos Pendentes",
            descricao:
              "Quantidade de termos de consentimento de imagem que ainda não foram assinados.",
          },
          {
            titulo: "Medidas por Tipo",
            descricao:
              "Gráfico de barras com a distribuição das medidas disciplinares (Advertência Oral, Escrita, Suspensão etc.).",
          },
          {
            titulo: "Comportamento",
            descricao:
              "Distribuição dos alunos por conceito de comportamento (Excepcional a Incompatível), com gráfico em formato donut.",
          },
        ],
      },
    ],
  },
  {
    id: "regimentos",
    titulo: "Biblioteca de Regimentos",
    icone: BuildingLibraryIcon,
    cor: "#1e3a5f",
    resumo: "Documentos oficiais e regulamentos",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O submenu **Regimentos** é a biblioteca digital dos documentos oficiais que fundamentam o módulo disciplinar. Aqui você encontra os regulamentos com sumário interativo e visualizador de PDF embutido.",
      },
      {
        tipo: "imagem",
        src: "/manual-disciplinar/08_regimentos.png",
        alt: "Biblioteca de Regimentos",
        legenda:
          "Biblioteca de Regimentos com dois documentos oficiais: Regulamento Disciplinar CCMDF e Manual das Escolas Cívico-Militares.",
      },
      {
        tipo: "lista",
        titulo: "Documentos Disponíveis",
        itens: [
          {
            titulo: "Regulamento Disciplinar CCMDF",
            descricao:
              "~30 páginas — Define normas, deveres, direitos, medidas disciplinares, sistema de pontuação e TACE das escolas cívico-militares do DF.",
          },
          {
            titulo: "Manual das Escolas Cívico-Militares (PECIM)",
            descricao:
              "~100 páginas — Manual completo do Programa Nacional com estrutura organizacional, gestão pedagógica, gestão disciplinar e rotinas.",
          },
        ],
      },
    ],
  },
  {
    id: "impressao",
    titulo: "Impressões e Documentos",
    icone: PrinterIcon,
    cor: "#6d28d9",
    resumo: "Quando e como imprimir documentos oficiais",
    conteudo: [
      {
        tipo: "texto",
        valor:
          "O módulo gera três tipos de documentos oficiais em PDF, prontos para impressão e assinatura:",
      },
      {
        tipo: "lista",
        titulo: "Documentos para Impressão",
        itens: [
          {
            titulo: "Relatório de Registros Disciplinares",
            descricao:
              "Histórico completo das medidas disciplinares do estudante até a presente data. Utilizado para assinatura e conhecimento do responsável legal.",
          },
          {
            titulo: "TACE — Termo de Ajuste de Conduta Escolar",
            descricao:
              "Documento formal lavrado quando o comportamento do aluno atinge conceitos Insuficiente ou Incompatível, contendo o reconhecimento dos fatos e os compromissos firmados.",
          },
          {
            titulo: "Termo de Consentimento de Uso de Imagem",
            descricao:
              "Autorização formal do responsável para uso de imagem e dados biométricos do estudante no âmbito escolar.",
          },
        ],
      },
      {
        tipo: "destaque",
        variante: "alerta",
        titulo: "Regra de Impressão",
        valor:
          "Os documentos só podem ser gerados quando **todos os dados obrigatórios** estão cadastrados, tanto do estudante quanto do responsável legal. O sistema bloqueia a geração e exibe os campos faltantes quando há dados incompletos.",
      },
    ],
  },
  {
    id: "faq",
    titulo: "Perguntas Frequentes",
    icone: QuestionMarkCircleIcon,
    cor: "#0f766e",
    resumo: "Dúvidas comuns sobre o módulo",
    conteudo: [
      {
        tipo: "faq",
        itens: [
          {
            pergunta: "Posso excluir um registro que já foi finalizado?",
            resposta:
              'Não. Registros finalizados não podem ser excluídos para garantir a rastreabilidade. Use a opção "Cancelar" para anular os efeitos do registro sem excluí-lo.',
          },
          {
            pergunta: "O que acontece se eu cancelar um registro?",
            resposta:
              "O registro permanece no sistema, porém perde completamente seu efeito: não aparece nos documentos impressos e não influencia a pontuação nem o conceito de comportamento do aluno.",
          },
          {
            pergunta:
              "Por que não consigo gerar o PDF do Relatório Disciplinar?",
            resposta:
              "O sistema valida se os dados do estudante (nome, código, turma, data de nascimento, turno) e do responsável legal (nome, CPF, telefone, endereço) estão completos. Complete os dados faltantes e tente novamente.",
          },
          {
            pergunta: "Quando devo registrar um TACE?",
            resposta:
              'Conforme regulamento, o TACE deve ser lavrado quando o comportamento do aluno for Insuficiente (nota 2,0 a 4,9) ou Incompatível (nota 0 a 1,9). O sistema permite registrar para qualquer aluno, mas pede confirmação se a pontuação for ≥ 5,0.',
          },
          {
            pergunta: "Como funciona o sistema de pontuação?",
            resposta:
              "Todo aluno inicia com 8,0 pontos. A cada medida disciplinar finalizada, pontos são adicionados (elogios) ou subtraídos (infrações) conforme a tabela de ocorrências cadastrada em Ajustes. A pontuação final determina o conceito: I - Excepcional(10,0), II - Ótimo(9,0–9,9), III - Bom(7,0–8,9), IV - Regular(5,0–6,9), V - Insuficiente(2,0–4,9), VI - Incompatível(0–1,9).",
          },
          {
            pergunta:
              'Qual a diferença entre a Ficha do Estudante e o ícone de "Relatório" na lista de alunos?',
            resposta:
              "A Ficha do Estudante é o painel completo onde você pode consultar dados, registrar ocorrências, acessar o TACE e gerenciar o histórico. O ícone de Relatório gera diretamente o PDF do Relatório de Registros Disciplinares para impressão.",
          },
          {
            pergunta:
              "Posso excluir um registro onde já houve convocação do responsável?",
            resposta:
              'Não. Uma vez que houve convocação do responsável, o registro só pode ser cancelado (não excluído), para preservar o histórico da comunicação.',
          },
        ],
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES DE RENDERIZAÇÃO
// ────────────────────────────────────────────────────────────────

function RenderTexto({ valor }) {
  const partes = valor.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-[15px] text-gray-600 leading-relaxed">
      {partes.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-gray-800">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function RenderDestaque({ variante, titulo, valor }) {
  const estilos = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />,
      tituloCor: "text-blue-800",
      textoCor: "text-blue-700",
    },
    alerta: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />,
      tituloCor: "text-amber-800",
      textoCor: "text-amber-700",
    },
    dica: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: <LightBulbIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />,
      tituloCor: "text-emerald-800",
      textoCor: "text-emerald-700",
    },
  };
  const s = estilos[variante] || estilos.info;
  const partes = valor.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className={`${s.bg} ${s.border} border rounded-xl p-4 flex items-start gap-3`}>
      {s.icon}
      <div>
        <p className={`text-sm font-bold ${s.tituloCor} mb-1`}>{titulo}</p>
        <p className={`text-sm ${s.textoCor} leading-relaxed`}>
          {partes.map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      </div>
    </div>
  );
}

function RenderPassos({ titulo, itens }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <ArrowPathIcon className="w-4 h-4 text-blue-500" />
        {titulo}
      </h4>
      <div className="space-y-3">
        {itens.map((item) => (
          <div key={item.passo} className="flex gap-4 group">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {item.passo}
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-semibold text-gray-800">
                {item.titulo}
              </p>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                {item.descricao}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderLista({ titulo, itens }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
        {titulo}
      </h4>
      <div className="space-y-2">
        {itens.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {item.titulo}
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              {item.descricao}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderConceitos({ itens }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {itens.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border p-5 transition-all hover:shadow-md"
          style={{
            backgroundColor: item.bg,
            borderColor: item.cor + "30",
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{item.icone}</span>
            <h4
              className="text-base font-bold"
              style={{ color: item.cor }}
            >
              {item.titulo}
            </h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {item.descricao}
          </p>
        </div>
      ))}
    </div>
  );
}

function RenderImagem({ src, alt, legenda }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <img
          src={src}
          alt={alt}
          className="w-full cursor-zoom-in hover:opacity-95 transition"
          onClick={() => setZoomed(true)}
          loading="lazy"
        />
        {legenda && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed flex items-start gap-2">
              <InformationCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              {legenda}
            </p>
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
          onClick={() => setZoomed(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[95vw] max-h-[90vh] rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

function RenderFAQ({ itens }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div className="space-y-2">
      {itens.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={i}
            className={`rounded-xl border transition-all ${
              isOpen
                ? "border-blue-200 bg-blue-50/30 shadow-sm"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
            >
              {isOpen ? (
                <ChevronDownIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={`text-sm font-semibold ${
                  isOpen ? "text-blue-800" : "text-gray-700"
                }`}
              >
                {item.pergunta}
              </span>
            </button>
            {isOpen && (
              <div className="px-12 pb-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.resposta}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// RENDERIZADOR DO CONTEÚDO
// ────────────────────────────────────────────────────────────────
function RenderConteudo({ item }) {
  switch (item.tipo) {
    case "texto":
      return <RenderTexto valor={item.valor} />;
    case "destaque":
      return (
        <RenderDestaque
          variante={item.variante}
          titulo={item.titulo}
          valor={item.valor}
        />
      );
    case "passos":
      return <RenderPassos titulo={item.titulo} itens={item.itens} />;
    case "lista":
      return <RenderLista titulo={item.titulo} itens={item.itens} />;
    case "conceitos":
      return <RenderConceitos itens={item.itens} />;
    case "imagem":
      return (
        <RenderImagem src={item.src} alt={item.alt} legenda={item.legenda} />
      );
    case "faq":
      return <RenderFAQ itens={item.itens} />;
    default:
      return null;
  }
}

// ────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────
export default function SuporteDisciplinar() {
  const [secaoAtiva, setSecaoAtiva] = useState("intro");
  const [buscaFiltro, setBuscaFiltro] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const conteudoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (conteudoRef.current) {
        setShowBackToTop(conteudoRef.current.scrollTop > 300);
      }
    };
    const el = conteudoRef.current;
    if (el) el.addEventListener("scroll", handleScroll);
    return () => el && el.removeEventListener("scroll", handleScroll);
  }, []);

  const secaoFiltrada = MANUAL.filter((s) => {
    if (!buscaFiltro.trim()) return true;
    const termo = buscaFiltro
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const campos = [s.titulo, s.resumo, ...s.conteudo.map((c) => JSON.stringify(c))]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return campos.includes(termo);
  });

  const secaoSelecionada =
    secaoFiltrada.find((s) => s.id === secaoAtiva) || secaoFiltrada[0];

  const scrollToTop = () => {
    if (conteudoRef.current) {
      conteudoRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .manual-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .manual-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .manual-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
        .manual-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2c5282] to-[#1e3a5f] text-white px-6 py-5 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <BookOpenSolid className="w-8 h-8 text-amber-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Manual do Módulo Disciplinar
            </h1>
            <p className="text-blue-200 text-sm mt-0.5">
              Tutorial completo — Passo a passo para a equipe disciplinar
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
            <SparklesIcon className="w-4 h-4 text-amber-300" />
            <span className="text-amber-200 text-xs font-semibold">
              v1.0 — Mar/2026
            </span>
          </div>
        </div>

        {/* Barra de pesquisa */}
        <div className="mt-4 relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
          <input
            type="text"
            value={buscaFiltro}
            onChange={(e) => {
              setBuscaFiltro(e.target.value);
              if (e.target.value.trim() && secaoFiltrada.length > 0) {
                setSecaoAtiva(secaoFiltrada[0]?.id || "intro");
              }
            }}
            placeholder="Pesquisar no manual..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:bg-white/15 transition-all backdrop-blur-sm"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LAYOUT (Sumário + Conteúdo)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── SUMÁRIO LATERAL ─────────────────────── */}
        <aside className="w-72 border-r border-gray-100 bg-white overflow-y-auto manual-scrollbar flex-shrink-0">
          <div className="py-3 px-3">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-3 mb-2">
              Sumário
            </p>
            <nav className="space-y-0.5">
              {secaoFiltrada.map((secao, idx) => {
                const Icone = secao.icone;
                const isActive = secaoSelecionada?.id === secao.id;
                return (
                  <button
                    key={secao.id}
                    onClick={() => {
                      setSecaoAtiva(secao.id);
                      scrollToTop();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                      isActive
                        ? "bg-blue-50 border border-blue-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isActive
                          ? "shadow-sm"
                          : "bg-gray-50 group-hover:shadow-sm"
                      }`}
                      style={{
                        backgroundColor: isActive
                          ? secao.cor + "15"
                          : undefined,
                      }}
                    >
                      <Icone
                        className="w-4 h-4"
                        style={{
                          color: isActive ? secao.cor : "#9ca3af",
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-gray-800" : "text-gray-600"
                        }`}
                      >
                        <span className="text-gray-300 mr-1.5">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        {secao.titulo}
                      </p>
                    </div>
                    {isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: secao.cor }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── CONTEÚDO PRINCIPAL ─────────────────── */}
        <main
          ref={conteudoRef}
          className="flex-1 overflow-y-auto manual-scrollbar bg-gradient-to-br from-slate-50 via-blue-50/30 to-white"
        >
          {secaoSelecionada ? (
            <div className="max-w-3xl mx-auto px-8 py-8 animate-fadeIn" key={secaoSelecionada.id}>
              {/* Header da seção */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="p-3 rounded-xl shadow-sm"
                  style={{ backgroundColor: secaoSelecionada.cor + "12" }}
                >
                  {React.createElement(secaoSelecionada.icone, {
                    className: "w-7 h-7",
                    style: { color: secaoSelecionada.cor },
                  })}
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: secaoSelecionada.cor }}
                  >
                    {secaoSelecionada.titulo}
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {secaoSelecionada.resumo}
                  </p>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="space-y-6">
                {secaoSelecionada.conteudo.map((item, i) => (
                  <RenderConteudo key={i} item={item} />
                ))}
              </div>

              {/* Navegação anterior/próxima */}
              <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
                {(() => {
                  const idx = secaoFiltrada.findIndex(
                    (s) => s.id === secaoSelecionada.id
                  );
                  const prev = idx > 0 ? secaoFiltrada[idx - 1] : null;
                  const next =
                    idx < secaoFiltrada.length - 1
                      ? secaoFiltrada[idx + 1]
                      : null;
                  return (
                    <>
                      {prev ? (
                        <button
                          onClick={() => {
                            setSecaoAtiva(prev.id);
                            scrollToTop();
                          }}
                          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition group"
                        >
                          <ChevronRightIcon className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                          {prev.titulo}
                        </button>
                      ) : (
                        <div />
                      )}
                      {next ? (
                        <button
                          onClick={() => {
                            setSecaoAtiva(next.id);
                            scrollToTop();
                          }}
                          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition group"
                        >
                          {next.titulo}
                          <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ) : (
                        <div />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-200" />
              <p className="text-gray-400 text-lg font-medium">
                Nenhum resultado encontrado
              </p>
              <p className="text-gray-300 text-sm">
                Tente buscar por outro termo
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Botão Voltar ao Topo */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-90 animate-fadeIn"
          title="Voltar ao topo"
        >
          <ArrowUpIcon className="w-5 h-5" />
        </button>
      )}

      {/* Rodapé discreto */}
      <div className="bg-white border-t border-gray-100 px-6 py-2 flex-shrink-0">
        <p className="text-xs text-gray-300 text-center">
          Manual do Módulo Disciplinar — EDUCA.MELHOR v1.0 •{" "}
          {new Date().toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}{" "}
          • Desenvolvido para a equipe disciplinar das Escolas Cívico-Militares
        </p>
      </div>
    </div>
  );
}
