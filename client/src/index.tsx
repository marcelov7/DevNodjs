import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Handler global de erros para problemas relacionados a arrays
const handleGlobalError = (error: Error) => {
  console.error('🚨 Erro global capturado:', error);
  
  // Se for erro relacionado a map/array undefined
  if (error.message.includes('Cannot read properties of undefined (reading \'map\')')) {
    console.error('🔍 Erro de array undefined detectado:', {
      message: error.message,
      stack: error.stack
    });
    
    // Adicionar logs para debugging
    console.group('🔧 Debugging de Array Undefined');
    console.log('- Verifique se todos os arrays estão sendo inicializados como []');
    console.log('- Verifique se as respostas de API estão retornando os dados esperados');
    console.log('- Verifique se há problemas de carregamento assíncrono');
    console.groupEnd();
  }
  
  return false; // Permite que o erro continue sendo tratado normalmente
};

// Adicionar handlers de erro
window.addEventListener('error', (event) => {
  handleGlobalError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Promise rejeitada não tratada:', event.reason);
  if (event.reason instanceof Error) {
    handleGlobalError(event.reason);
  }
});

// Sobrescrever Array.prototype.map temporariamente para debugging
const originalMap = Array.prototype.map;
(Array.prototype as any).map = function(callbackfn: any, thisArg?: any): any[] {
  if (this === undefined || this === null) {
    console.error('🚨 Array.map chamado em valor undefined/null:', this);
    console.trace('🔍 Stack trace do erro:');
    throw new TypeError('Cannot read properties of undefined (reading \'map\')');
  }
  
  if (!Array.isArray(this)) {
    console.error('🚨 Array.map chamado em valor não-array:', this, typeof this);
    console.trace('🔍 Stack trace do erro:');
    throw new TypeError('Array.map called on non-array value');
  }
  
  return originalMap.call(this, callbackfn, thisArg);
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
