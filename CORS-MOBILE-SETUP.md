# Configuração CORS para Testes Mobile

## Problema Original
- Erro: "CORS policy: Response to preflight request doesn't pass access control check"
- Causa: Backend configurado apenas para `localhost:3000`, mas mobile acessa via IP da rede

## Solução Implementada

### 1. Detecção Automática de IPs
O sistema agora detecta automaticamente todos os IPs da rede local e permite acesso via CORS.

### 2. Configuração Dinâmica do Frontend
- O frontend detecta se está sendo acessado via IP da rede
- Automaticamente configura a URL da API para o mesmo IP

### 3. Utilitários de Rede
- `server/utils/networkUtils.js`: Detecta IPs automaticamente
- `server/check-network.js`: Script para verificar configurações

## Como Usar

### Para Desenvolvimento Local
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
cd client
npm start
```

### Para Teste em Mobile

1. **Verificar configurações de rede:**
```bash
cd server
npm run check-network
```

2. **Conectar dispositivo na mesma rede WiFi**

3. **Acessar pelo IP no mobile:**
- Use uma das URLs listadas pelo comando `check-network`
- Exemplo: `http://192.168.100.106:3000`

### Troubleshooting

#### Se ainda tiver erro de CORS:
1. Verifique se ambos os serviços estão rodando
2. Confirme que o dispositivo está na mesma rede
3. Execute `npm run check-network` para ver IPs detectados
4. Reinicie o backend após mudanças na rede

#### Para adicionar IPs manualmente:
Edite `server/utils/networkUtils.js` e adicione na array `origins`:
```javascript
origins.push('http://SEU_IP_AQUI:3000');
```

## Arquivos Modificados

- `server/index.js`: Configuração CORS dinâmica
- `server/utils/networkUtils.js`: Detecção de IPs (novo)
- `server/check-network.js`: Script de verificação (novo)
- `client/src/config/api.ts`: Configuração dinâmica da API (novo)
- `client/src/contexts/AuthContext.tsx`: Uso da configuração dinâmica

## Benefícios

1. **Zero configuração**: Detecta IPs automaticamente
2. **Flexível**: Funciona em qualquer rede
3. **Maintível**: Não precisa hardcodar IPs
4. **Debug fácil**: Script de verificação incluso 