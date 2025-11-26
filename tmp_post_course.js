const http = require('http');

const payload = {
  title: 'Controladoria, Finanças Corporativas e Compliance',
  description: 'Foco: Governança financeira, transparência e integridade.\n\nObjetivos: Assegurar a saúde financeira e o cumprimento de normas e políticas internas/externas.\n\nPrincipais práticas: Planejamento orçamentário, análise de desempenho, gestão de riscos e auditoria.',
  image: 'controlaria financeira.jpg',
  level: 'Avançado'
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/courses',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
});

req.on('error', (e) => {
  console.error('ERROR', e && e.message ? e.message : e);
});

req.write(data);
req.end();
