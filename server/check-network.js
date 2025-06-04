const { getLocalNetworkIPs, getAllowedOrigins } = require('./utils/networkUtils');

console.log('🔍 Verificação de Configurações de Rede\n');

console.log('📱 IPs da rede local detectados:');
const localIPs = getLocalNetworkIPs();
localIPs.forEach(ip => {
    console.log(`   • ${ip}`);
});

console.log('\n🌐 URLs do frontend que funcionarão:');
localIPs.forEach(ip => {
    console.log(`   • http://${ip}:3000`);
});
console.log('   • http://localhost:3000');

console.log('\n✅ Origens permitidas no CORS:');
const allowedOrigins = getAllowedOrigins();
allowedOrigins.forEach(origin => {
    console.log(`   • ${origin}`);
});

console.log('\n💡 Para testar no mobile:');
console.log('1. Conecte o dispositivo na mesma rede WiFi');
console.log('2. Acesse uma das URLs do frontend listadas acima');
console.log('3. O backend automaticamente permitirá a conexão');

console.log('\n🚀 Para iniciar o sistema:');
console.log('   Backend: npm start (na pasta server)');
console.log('   Frontend: npm start (na pasta client)'); 