const os = require('os');

/**
 * Obtém todos os IPs da rede local da máquina
 * @returns {string[]} Array com todos os IPs IPv4 não-loopback
 */
function getLocalNetworkIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    Object.values(interfaces).forEach(interface => {
        if (interface) {
            interface.forEach(details => {
                if (details.family === 'IPv4' && !details.internal) {
                    ips.push(details.address);
                }
            });
        }
    });
    
    return ips;
}

/**
 * Gera uma lista de origens permitidas para CORS
 * Inclui localhost e todos os IPs da rede local na porta 3000
 * @returns {string[]} Array com todas as origens permitidas
 */
function getAllowedOrigins() {
    const origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
    
    // Adicionar todos os IPs da rede local
    const localIPs = getLocalNetworkIPs();
    localIPs.forEach(ip => {
        origins.push(`http://${ip}:3000`);
    });
    
    // Adicionar origem do ambiente se existir
    if (process.env.CLIENT_URL) {
        origins.push(process.env.CLIENT_URL);
    }
    
    // Remover duplicatas
    return [...new Set(origins)];
}

module.exports = {
    getLocalNetworkIPs,
    getAllowedOrigins
}; 