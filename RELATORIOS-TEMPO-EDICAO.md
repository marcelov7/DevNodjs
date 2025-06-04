# Controle Temporal de Edição e Exportação PDF - Relatórios

## Visão Geral

Este documento descreve as funcionalidades implementadas para controle temporal de edição de relatórios e exportação em PDF, garantindo que relatórios tenham diferentes níveis de permissão baseados no tempo desde sua criação.

## Funcionalidades Implementadas

### 1. Controle Temporal de Edição (24 horas)

#### Regras de Negócio
- **Primeiras 24h**: Criador pode editar completamente o relatório (todos os campos)
- **Após 24h**: Criador pode apenas adicionar atualizações ao histórico
- **Admin Master**: Pode editar qualquer relatório a qualquer momento
- **Relatórios Resolvidos**: Não podem ser editados (exceto Admin Master pode reabrir)

#### Implementação Backend
**Arquivo**: `server/middleware/auth.js`
- Função `podeEditarRelatorio()` modificada
- Verificação de `TIMESTAMPDIFF(HOUR, data_criacao, NOW()) as horas_desde_criacao`
- Flag `req.isUpdateOnly` para indicar limitação de edição
- Admin Master bypassa todas as restrições

**Arquivo**: `server/routes/relatorios.js`
- Endpoint PUT `/api/relatorios/:id` verifica `req.isUpdateOnly`
- Rejeita edições completas após 24h com mensagem específica
- Sugere usar função "Adicionar Progresso"

#### Implementação Frontend
**Arquivo**: `client/src/pages/Relatorios.tsx`
- Funções `podeEditarCompleto()` e `podeAtualizarHistorico()`
- Interface adaptativa baseada no tempo
- Botões condicionais para diferentes ações

### 2. Exportação PDF Técnico

#### Características do PDF
- **Layout Profissional**: Cabeçalho, seções organizadas, rodapé
- **Informações Completas**: 
  - Dados gerais do relatório
  - Equipamento e localização
  - Descrição detalhada
  - **NOVO**: Imagens do relatório principal
  - Usuários atribuídos
  - Histórico completo de atualizações
  - **NOVO**: Imagens dos anexos de cada atualização
- **Formatação**: Quebra de página automática, numeração
- **NOVO - Suporte Completo a Imagens**:
  - Imagens reais incluídas no PDF (JPEG, PNG, GIF, WEBP)
  - Layout de 2 imagens por linha
  - Redimensionamento automático mantendo proporção
  - Placeholder visual para imagens não encontradas
  - Nome do arquivo exibido abaixo de cada imagem

#### Implementação Backend
**Arquivo**: `server/services/pdfService.js`
- Classe `PDFService` usando jsPDF
- Método `gerarPDFRelatorio()` com layout profissional
- **NOVO**: `adicionarImagensRelatorio()` - Seção de imagens do relatório
- **NOVO**: `adicionarImagemPDF()` - Inclusão de imagem real no PDF
- **NOVO**: `adicionarPlaceholderImagem()` - Placeholder para imagens não encontradas
- **NOVO**: `determinarFormatoImagem()` - Suporte a múltiplos formatos
- **NOVO**: `calcularDimensoesImagem()` - Redimensionamento proporcional
- Formatação automática de datas, status e prioridades
- Suporte a múltiplas páginas

**Arquivo**: `server/routes/relatorios.js`
- Endpoint GET `/api/relatorios/:id/pdf`
- **NOVO**: Busca imagens do relatório principal
- Busca dados completos do relatório
- Retorna PDF como download direto

#### Implementação Frontend
**Arquivo**: `client/src/pages/Relatorios.tsx`
- Função `exportarPDF()` para download
- Botões de exportação em desktop e mobile
- Feedback visual durante geração

## Interface do Usuário

### Indicadores Visuais

#### Desktop (Tabela)
- **Botão "Editar"**: Visível apenas nas primeiras 24h
- **Botão "Atualizar"**: Visível após 24h para atualizações de histórico
- **Botão PDF**: Sempre disponível para usuários com permissão de visualização
- **Tooltip**: Explicação sobre limitações temporais

#### Mobile (Cards)
- **Botão "Editar"**: Compacto, apenas nas primeiras 24h
- **Botão "Atualizar"**: Aparece após 24h com ícone de histórico
- **Botão "PDF"**: Disponível na área de ações rápidas
- **Layout Responsivo**: Adaptação automática do espaço

### **NOVO - Estrutura do PDF Gerado**

#### Seções do PDF:
1. **Cabeçalho**
   - Título do relatório
   - ID e status
   - Data de geração

2. **Informações Gerais**
   - Dados básicos do relatório
   - Local e equipamento
   - Datas, prioridade, progresso

3. **Descrição do Problema**
   - Texto completo formatado

4. **🖼️ NOVO - Imagens do Relatório**
   - Todas as imagens anexadas ao relatório
   - Layout: 2 imagens por linha
   - Dimensões: 85mm x 60mm máximo
   - Nome do arquivo exibido
   - Placeholder para imagens não encontradas

5. **Usuários Atribuídos**
   - Lista completa com datas

6. **🖼️ NOVO - Histórico com Imagens**
   - Cada atualização do histórico
   - Texto das atualizações
   - **Imagens dos anexos incluídas**
   - Outros arquivos listados por nome

#### Formatos de Imagem Suportados:
- ✅ **JPEG/JPG**: Suporte nativo
- ✅ **PNG**: Suporte nativo  
- ✅ **GIF**: Convertido para PNG
- ✅ **WEBP**: Convertido para PNG
- ❌ **Outros**: Placeholder será exibido

#### Tratamento de Erros:
- **Imagem não encontrada**: Placeholder cinza com texto
- **Formato não suportado**: Placeholder com aviso
- **Erro de leitura**: Log do erro + placeholder
- **Nome do arquivo**: Sempre exibido abaixo da imagem

### Mensagens de Feedback

#### Edição Bloqueada (Após 24h)
```
"Após 24h da criação, só é possível adicionar atualizações ao histórico do relatório. 
Use a função de 'Adicionar Progresso' em vez de editar."
```

#### Sucesso na Exportação
```
"PDF exportado com sucesso!"
```

#### Erro na Exportação
```
"Erro ao exportar PDF do relatório"
```

## Permissões por Nível de Usuário

### Admin Master
- ✅ Editar qualquer relatório a qualquer momento
- ✅ Reabrir relatórios concluídos
- ✅ Exportar PDF de qualquer relatório
- ✅ Bypassa todas as restrições temporais

### Admin / Usuário Regular
- ✅ Editar próprios relatórios nas primeiras 24h
- ✅ Atualizar histórico de próprios relatórios após 24h
- ✅ Exportar PDF de relatórios visíveis
- ❌ Editar relatórios de outros usuários
- ❌ Editar após 24h (apenas histórico)

### Usuário Atribuído
- ✅ Editar relatórios atribuídos nas primeiras 24h
- ✅ Atualizar histórico após 24h
- ✅ Exportar PDF dos relatórios atribuídos
- ❌ Edição completa após 24h

## Arquivos Modificados

### Backend
1. `server/middleware/auth.js` - Lógica de controle temporal
2. `server/routes/relatorios.js` - Endpoints e validações
3. `server/services/pdfService.js` - Geração de PDF (novo arquivo)

### Frontend
1. `client/src/pages/Relatorios.tsx` - Interface e lógica de controle
2. Dependências: jsPDF, moment.js

## Benefícios

### Controle Temporal
- **Integridade**: Evita edições descontroladas em relatórios antigos
- **Rastreabilidade**: Força uso do histórico para mudanças posteriores
- **Flexibilidade**: Admin Master mantém controle total
- **Transparência**: Interface clara sobre limitações

### Exportação PDF
- **Profissionalismo**: Relatórios técnicos padronizados
- **Documentação**: Registro completo para arquivo/auditoria
- **Portabilidade**: Fácil compartilhamento e impressão
- **Completude**: Todas as informações em formato estruturado

## Configuração

### Dependências Adicionais
```bash
npm install jspdf moment
```

### Variáveis de Ambiente
Nenhuma configuração adicional necessária - usa configurações existentes.

## Exemplos de Uso

### Cenário 1: Relatório Recém-Criado
- ✅ Usuário pode editar completamente
- ✅ Pode exportar PDF
- ⏰ Timer de 24h inicia

### Cenário 2: Relatório com 25 horas
- ❌ Edição completa bloqueada
- ✅ Pode adicionar ao histórico
- ✅ Pode exportar PDF
- 💡 Interface sugere usar "Adicionar Progresso"

### Cenário 3: Admin Master
- ✅ Pode tudo, sempre
- ✅ Pode reabrir relatórios concluídos
- ✅ Bypassa restrições temporais

## Considerações Técnicas

### Performance
- Cálculo de tempo feito no banco de dados
- PDF gerado em memória (sem arquivos temporários)
- Cache de dados do relatório durante geração

### Segurança
- Validação de permissões em cada endpoint
- Verificação dupla: middleware + lógica de negócio
- Sanitização de dados antes da geração PDF

### Escalabilidade
- Geração PDF otimizada para relatórios grandes
- Paginação automática no PDF
- Limitação de tamanho reasonable 