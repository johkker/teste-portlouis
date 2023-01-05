import * as rl from 'readline';
import * as fs from 'fs';

//caminho das pastas
const requestsBasePath = './src/Pedidos';
const invoicesBasePath = './src/Notas';

//lê os arquivos da pasta, e pega o caminho de cada um, colocando em um array
const requestsFilePaths = fs.readdirSync(requestsBasePath, {
  encoding: 'utf-8',
});
const invoicesFilePaths = fs.readdirSync(invoicesBasePath, {
  encoding: 'utf-8',
});

const lineParser = (line) => {
  //trata a linha para remover acentos e espaços, e converte em objeto
  const treatedLine = JSON.parse(
    line
      .trim()
      .replace(/[á]/gi, 'a')
      .replace(/[é]/gi, 'e')
      .replace(/[í]/gi, 'i')
      .replace(/[ó]/gi, 'o')
      .replace(/[ú]/gi, 'u')
  );
  //checa se existe o campo e formata o valor
  treatedLine.valor_unitario_produto
    ? (treatedLine.valor_unitario_produto = parseFloat(
        treatedLine.valor_unitario_produto
      ).toFixed(2))
    : null;
  treatedLine.id_pedido
    ? (treatedLine.id_pedido = `P${treatedLine.id_pedido}`)
    : null;

  return treatedLine;
};

// lê os arquivos e trata cada linha, colocando em um array de objetos, adicionando o id do arquivo como id do objeto, ordenando os itens e calculando os pedidos pendentes
const jsonParser = async () => {
  const requests = await Promise.all(
    requestsFilePaths.map(
      (filePath) =>
        new Promise((resolve) => {
          //cria uma stream para ler o arquivo, linha por linha, evitantdo o problema de memória caso o arquivo seja muito grande, e acelerando o tempo de leitura e tratamento
          const request = { id: filePath.split('.')[0], items: [] };
          const file = rl.createInterface({
            input: fs.createReadStream(`${requestsBasePath}/${filePath}`),
          });
          file.on('line', (line) => {
            return request.items.push(lineParser(line));
          });
          file.on('close', () => {
            resolve(request);
          });
        })
    )
  );

  const invoices = await Promise.all(
    invoicesFilePaths.map(
      (filePath) =>
        new Promise((resolve) => {
          const invoice = { id: filePath.split('.')[0], items: [] };
          const file = rl.createInterface({
            input: fs.createReadStream(`${invoicesBasePath}/${filePath}`),
          });
          file.on('line', (line) => {
            invoice.items.push(lineParser(line));
          });
          file.on('close', () => {
            resolve(invoice);
          });
        })
    )
  );

  //ordena os itens de cada pedido e nota
  return { requests, invoices };
};

export default jsonParser;
