const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class PDFService {
    constructor() {
        // Configurar moment para português
        moment.locale('pt-br');
    }

    /**
     * Gera PDF técnico do relatório
     * @param {Object} relatorio - Dados do relatório
     * @param {Array} historico - Histórico de atualizações
     * @param {Array} atribuicoes - Usuários atribuídos
     * @returns {Buffer} - Buffer do PDF gerado
     */
    async gerarPDFRelatorio(relatorio, historico = [], atribuicoes = []) {
        const doc = new jsPDF('p', 'mm', 'a4');
        let yPosition = 20;

        // Configurar fonte padrão
        doc.setFont('helvetica');

        // === CABEÇALHO ===
        this.adicionarCabecalho(doc, relatorio);
        yPosition = 60;

        // === INFORMAÇÕES GERAIS ===
        yPosition = this.adicionarInformacoesGerais(doc, relatorio, yPosition);

        // === DESCRIÇÃO ===
        yPosition = this.adicionarDescricao(doc, relatorio, yPosition);

        // === IMAGENS DO RELATÓRIO PRINCIPAL ===
        if (relatorio.imagens && relatorio.imagens.length > 0) {
            yPosition = await this.adicionarImagensRelatorio(doc, relatorio.imagens, yPosition);
        }

        // === ATRIBUIÇÕES ===
        if (atribuicoes.length > 0) {
            yPosition = this.adicionarAtribuicoes(doc, atribuicoes, yPosition);
        }

        // === HISTÓRICO DE ATUALIZAÇÕES ===
        if (historico.length > 0) {
            yPosition = await this.adicionarHistorico(doc, historico, yPosition);
        }

        // === RODAPÉ ===
        this.adicionarRodape(doc);

        return doc.output('arraybuffer');
    }

    adicionarCabecalho(doc, relatorio) {
        // Título principal
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO TÉCNICO DE MANUTENÇÃO', 105, 20, { align: 'center' });

        // Subtítulo com ID e status
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Relatório #${relatorio.id} - ${this.formatarStatus(relatorio.status)}`, 105, 30, { align: 'center' });

        // Data de geração
        doc.setFontSize(10);
        doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm')}`, 105, 40, { align: 'center' });

        // Linha separadora
        doc.setLineWidth(0.5);
        doc.line(10, 45, 200, 45);
    }

    adicionarInformacoesGerais(doc, relatorio, yPosition) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES GERAIS', 15, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Criar tabela de informações
        const informacoes = [
            ['Título:', relatorio.titulo],
            ['Local:', relatorio.local_nome || 'N/A'],
            ['Equipamento:', relatorio.equipamento_nome || 'N/A'],
            ['Data da Ocorrência:', moment(relatorio.data_ocorrencia).format('DD/MM/YYYY HH:mm')],
            ['Criado por:', relatorio.usuario_nome || 'N/A'],
            ['Data de Criação:', moment(relatorio.data_criacao).format('DD/MM/YYYY HH:mm')],
            ['Prioridade:', this.formatarPrioridade(relatorio.prioridade)],
            ['Status:', this.formatarStatus(relatorio.status)],
            ['Progresso:', `${relatorio.progresso || 0}%`]
        ];

        informacoes.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 15, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, yPosition);
            yPosition += 7;
        });

        return yPosition + 5;
    }

    adicionarDescricao(doc, relatorio, yPosition) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIÇÃO DO PROBLEMA', 15, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Quebrar texto longo
        const descricaoLinhas = doc.splitTextToSize(relatorio.descricao, 180);
        descricaoLinhas.forEach(linha => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(linha, 15, yPosition);
            yPosition += 5;
        });

        return yPosition + 10;
    }

    /**
     * Adiciona imagens do relatório principal ao PDF
     */
    async adicionarImagensRelatorio(doc, imagens, yPosition) {
        // Verificar se precisa de nova página
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('IMAGENS DO RELATÓRIO', 15, yPosition);
        yPosition += 10;

        // Processar imagens em pares (2 por linha)
        for (let i = 0; i < imagens.length; i += 2) {
            // Verificar se precisa de nova página (considerando altura das imagens)
            if (yPosition > 200) {
                doc.addPage();
                yPosition = 20;
            }

            const imagem1 = imagens[i];
            const imagem2 = imagens[i + 1];

            // Adicionar primeira imagem (lado esquerdo)
            const resultado1 = await this.adicionarImagemPDF(doc, imagem1, 15, yPosition, 85);
            
            // Adicionar segunda imagem (lado direito) se existir
            let alturaMaxima = resultado1.altura;
            if (imagem2) {
                const resultado2 = await this.adicionarImagemPDF(doc, imagem2, 105, yPosition, 85);
                alturaMaxima = Math.max(alturaMaxima, resultado2.altura);
            }

            yPosition += alturaMaxima + 10;
        }

        return yPosition + 10;
    }

    /**
     * Adiciona uma imagem ao PDF
     */
    async adicionarImagemPDF(doc, imagem, x, y, larguraMaxima) {
        try {
            // Construir caminho completo da imagem
            const caminhoImagem = path.resolve(imagem.caminho_arquivo);
            
            // Verificar se arquivo existe
            if (!fs.existsSync(caminhoImagem)) {
                console.log(`⚠️ Imagem não encontrada: ${caminhoImagem}`);
                return this.adicionarPlaceholderImagem(doc, imagem, x, y, larguraMaxima);
            }

            // Ler arquivo da imagem
            const imagemBuffer = fs.readFileSync(caminhoImagem);
            const imagemBase64 = imagemBuffer.toString('base64');
            
            // Determinar formato da imagem
            const formato = this.determinarFormatoImagem(imagem.tipo_mime);
            if (!formato) {
                console.log(`⚠️ Formato de imagem não suportado: ${imagem.tipo_mime}`);
                return this.adicionarPlaceholderImagem(doc, imagem, x, y, larguraMaxima);
            }

            // Calcular dimensões mantendo proporção
            const dimensoes = this.calcularDimensoesImagem(larguraMaxima, 60); // altura máxima 60mm
            
            // Adicionar imagem ao PDF
            doc.addImage(
                `data:${imagem.tipo_mime};base64,${imagemBase64}`,
                formato,
                x,
                y,
                dimensoes.largura,
                dimensoes.altura
            );

            // Adicionar nome da imagem embaixo
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const nomeImagem = imagem.nome_original || imagem.nome_arquivo;
            const nomeQuebrado = doc.splitTextToSize(nomeImagem, larguraMaxima);
            
            let yTexto = y + dimensoes.altura + 3;
            nomeQuebrado.forEach(linha => {
                doc.text(linha, x, yTexto);
                yTexto += 3;
            });

            return {
                altura: dimensoes.altura + (nomeQuebrado.length * 3) + 5,
                sucesso: true
            };

        } catch (error) {
            console.error(`❌ Erro ao processar imagem ${imagem.nome_arquivo}:`, error);
            return this.adicionarPlaceholderImagem(doc, imagem, x, y, larguraMaxima);
        }
    }

    /**
     * Adiciona placeholder quando imagem não pode ser carregada
     */
    adicionarPlaceholderImagem(doc, imagem, x, y, larguraMaxima) {
        const altura = 40;
        
        // Desenhar retângulo placeholder
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y, larguraMaxima, altura, 'FD');
        
        // Adicionar texto no centro
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text('Imagem não', x + larguraMaxima/2, y + altura/2 - 5, { align: 'center' });
        doc.text('disponível', x + larguraMaxima/2, y + altura/2 + 3, { align: 'center' });
        
        // Resetar cor do texto
        doc.setTextColor(0, 0, 0);

        // Adicionar nome da imagem embaixo
        doc.setFontSize(8);
        const nomeImagem = imagem.nome_original || imagem.nome_arquivo;
        const nomeQuebrado = doc.splitTextToSize(nomeImagem, larguraMaxima);
        
        let yTexto = y + altura + 3;
        nomeQuebrado.forEach(linha => {
            doc.text(linha, x, yTexto);
            yTexto += 3;
        });

        return {
            altura: altura + (nomeQuebrado.length * 3) + 5,
            sucesso: false
        };
    }

    /**
     * Determina formato da imagem para jsPDF
     */
    determinarFormatoImagem(tipoMime) {
        const formatosSuportados = {
            'image/jpeg': 'JPEG',
            'image/jpg': 'JPEG',
            'image/png': 'PNG',
            'image/gif': 'PNG', // GIF será convertido para PNG
            'image/webp': 'PNG' // WEBP será convertido para PNG
        };
        
        return formatosSuportados[tipoMime.toLowerCase()];
    }

    /**
     * Calcula dimensões da imagem mantendo proporção
     */
    calcularDimensoesImagem(larguraMaxima, alturaMaxima) {
        // Por simplicidade, usar dimensões fixas que cabem bem no PDF
        // Em uma implementação mais sofisticada, poderíamos ler as dimensões reais da imagem
        const largura = Math.min(larguraMaxima, 80);
        const altura = Math.min(alturaMaxima, 60);
        
        return { largura, altura };
    }

    adicionarAtribuicoes(doc, atribuicoes, yPosition) {
        // Verificar se precisa de nova página
        if (yPosition > 240) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('USUÁRIOS ATRIBUÍDOS', 15, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        atribuicoes.forEach(atribuicao => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }

            doc.text(`• ${atribuicao.usuario_nome}`, 20, yPosition);
            yPosition += 5;
            doc.text(`  Atribuído por: ${atribuicao.atribuido_por_nome}`, 25, yPosition);
            yPosition += 5;
            doc.text(`  Data: ${moment(atribuicao.data_atribuicao).format('DD/MM/YYYY HH:mm')}`, 25, yPosition);
            yPosition += 8;
        });

        return yPosition + 5;
    }

    async adicionarHistorico(doc, historico, yPosition) {
        // Verificar se precisa de nova página
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTÓRICO DE ATUALIZAÇÕES', 15, yPosition);
        yPosition += 10;

        for (let index = 0; index < historico.length; index++) {
            const entrada = historico[index];
            
            // Verificar se precisa de nova página
            if (yPosition > 200) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Atualização ${historico.length - index}`, 15, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Informações da atualização
            doc.text(`Data: ${moment(entrada.data_atualizacao).format('DD/MM/YYYY HH:mm')}`, 20, yPosition);
            yPosition += 5;
            doc.text(`Usuário: ${entrada.usuario_nome}`, 20, yPosition);
            yPosition += 5;

            if (entrada.status_anterior !== entrada.status_novo) {
                doc.text(`Status: ${this.formatarStatus(entrada.status_anterior)} → ${this.formatarStatus(entrada.status_novo)}`, 20, yPosition);
                yPosition += 5;
            }

            if (entrada.progresso) {
                doc.text(`Progresso: ${entrada.progresso}%`, 20, yPosition);
                yPosition += 5;
            }

            if (entrada.descricao) {
                doc.text('Descrição:', 20, yPosition);
                yPosition += 5;
                const descricaoLinhas = doc.splitTextToSize(entrada.descricao, 170);
                descricaoLinhas.forEach(linha => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(linha, 25, yPosition);
                    yPosition += 5;
                });
            }

            // Anexos com imagens
            if (entrada.anexos && entrada.anexos.length > 0) {
                doc.text('Anexos:', 20, yPosition);
                yPosition += 5;
                
                // Separar imagens de outros anexos
                const imagens = entrada.anexos.filter(anexo => 
                    anexo.tipo_mime && anexo.tipo_mime.startsWith('image/')
                );
                const outrosAnexos = entrada.anexos.filter(anexo => 
                    !anexo.tipo_mime || !anexo.tipo_mime.startsWith('image/')
                );

                // Listar outros anexos (não-imagens)
                outrosAnexos.forEach(anexo => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(`• ${anexo.nome_original || anexo.nome_arquivo}`, 25, yPosition);
                    yPosition += 5;
                });

                // Adicionar imagens se houver
                if (imagens.length > 0) {
                    yPosition += 5;
                    doc.setFont('helvetica', 'bold');
                    doc.text('Imagens do Histórico:', 20, yPosition);
                    yPosition += 5;
                    doc.setFont('helvetica', 'normal');

                    // Processar imagens em pares
                    for (let i = 0; i < imagens.length; i += 2) {
                        if (yPosition > 180) {
                            doc.addPage();
                            yPosition = 20;
                        }

                        const imagem1 = imagens[i];
                        const imagem2 = imagens[i + 1];

                        // Adicionar primeira imagem
                        const resultado1 = await this.adicionarImagemPDF(doc, imagem1, 25, yPosition, 75);
                        
                        // Adicionar segunda imagem se existir
                        let alturaMaxima = resultado1.altura;
                        if (imagem2) {
                            const resultado2 = await this.adicionarImagemPDF(doc, imagem2, 110, yPosition, 75);
                            alturaMaxima = Math.max(alturaMaxima, resultado2.altura);
                        }

                        yPosition += alturaMaxima + 5;
                    }
                }
            }

            // Linha separadora entre atualizações
            yPosition += 5;
            doc.setLineWidth(0.2);
            doc.line(15, yPosition, 195, yPosition);
            yPosition += 10;
        }

        return yPosition;
    }

    adicionarRodape(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            // Linha do rodapé
            doc.setLineWidth(0.2);
            doc.line(10, 285, 200, 285);
            
            // Texto do rodapé
            doc.text('Sistema de Relatórios - Documento gerado automaticamente', 15, 290);
            doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
        }
    }

    formatarStatus(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'resolvido': 'Resolvido'
        };
        return statusMap[status] || status;
    }

    formatarPrioridade(prioridade) {
        const prioridadeMap = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'critica': 'Crítica'
        };
        return prioridadeMap[prioridade] || prioridade;
    }

    /**
     * Salva o PDF no sistema de arquivos
     * @param {Buffer} pdfBuffer - Buffer do PDF
     * @param {string} filename - Nome do arquivo
     * @returns {string} - Caminho do arquivo salvo
     */
    async salvarPDF(pdfBuffer, filename) {
        const uploadDir = path.join(__dirname, '../uploads/pdfs');
        
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
        
        return filePath;
    }
}

module.exports = PDFService; 