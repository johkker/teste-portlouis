import * as fs from 'fs';

import jsonParser from './jsonParser';

const orderItems = (requests, invoices) => {
  const sortedRequests = requests.map((request) => {
    const sortedRequest = {
      id: request.id,
      items: request.items.sort((a, b) => a.numero_item - b.numero_item),
    };

    return sortedRequest;
  });
  const sortedInvoices = invoices.map((invoice) => {
    const sortedInvoice = {
      id: invoice.id,
      items: invoice.items.sort((a, b) => a.numero_item - b.numero_item),
    };
    return sortedInvoice;
  });

  return { sortedRequests, sortedInvoices };
};

//verifica se existe algum item faltando
const hasMissingNumbers = (object) => {
  if (object.items[0].numero_item !== 1) {
    throw new Error(`Existe um item faltando no pedido ${object.id}`);
  }
  for (let i = 0; i < object.items.length - 1; i++) {
    if (object.items[i + 1].numero_item - object.items[i].numero_item > 1) {
      throw new Error(`Existe um item faltando no pedido ${object.id}`);
    }
  }
  return false;
};

const crossCheck = (requests, invoices) => {
  //deep copy do array de pedidos para não alterar o original
  const referenceRequests = JSON.parse(JSON.stringify(requests));

  const totalSum = requests.map((request) => {
    let total = 0;
    request.items.map((item) => {
      total += item.quantidade_produto * item.valor_unitario_produto;
    });
    return {
      id: request.id,
      total: parseFloat(total.toFixed(2)),
    };
  });

  //lê nota por nota
  invoices.map((invoice, index) => {
    //lê item por item da nota
    invoice.items.map((item, index) => {
      //verifica existe algum pedido com o id indicado na nota
      const request = referenceRequests.find(
        (request) => request.id === item.id_pedido
      );
      if (!request) {
        throw new Error(
          `Pedido ${item.id_pedido}, na Nota ${invoice.id}, não encontrado no sistema.`
        );
      }
      //verifica se existe algum item com o numero indicado na nota
      const requestItem = request.items.find(
        (requestItem) => requestItem.numero_item === item.numero_item
      );

      if (!requestItem) {
        throw new Error(
          `Item ${item.numero_item}, na Nota ${invoice.id}, não encontrado no sistema.`
        );
      }

      requestItem.quantidade_produto -= item.quantidade_produto;

      //verifica se a quantidade do item na nota é maior que a do pedido
      if (requestItem.quantidade_produto < 0) {
        throw new Error(
          `Item ${item.numero_item}, na Nota ${invoice.id}, possui quantidade maior que a do pedido.`
        );
      }
    });

    //verifica se existe algum item com quantidade maior que zero no pedido
  });
  const pending = referenceRequests
    .map((request) => {
      //se há algum pedido com saldo restante de produtos, retorna um objeto com o valor restante
      const finalValues = {
        id: request.id,
        valor_total: totalSum
          .find((sum) => sum.id === request.id)
          .total.toFixed(2),
        valor_restante: request.items
          .reduce((acc, item) => {
            return acc + item.quantidade_produto * item.valor_unitario_produto;
          }, 0)
          .toFixed(2),
        items_restantes: request.items.filter(
          (item) => item.quantidade_produto > 0
        ),
      };
      return finalValues;
    })
    .filter((request) => request.valor_restante > 0);

  return pending;
};

const main = async () => {
  const { requests, invoices } = await jsonParser();

  const { sortedRequests, sortedInvoices } = orderItems(requests, invoices);

  //verifica se existe algum item faltando
  sortedRequests.map((request, index) => {
    return hasMissingNumbers(request, index);
  });

  const pending = crossCheck(sortedRequests, sortedInvoices);

  fs.writeFileSync(
    './src/requests.json',
    JSON.stringify(sortedRequests),
    (err) => {
      console.log('an error has ocurred', err);
    }
  );
  fs.writeFileSync(
    './src/invoices.json',
    JSON.stringify(sortedInvoices),
    (err) => {
      console.log('an error has ocurred', err);
    }
  );

  fs.writeFileSync(
    './src/pedidosPendentes.txt',
    JSON.stringify(pending).split('},').join('},\n'),
    (err) => {
      console.log('an error has ocurred', err);
    }
  );

  return {
    requests: sortedRequests,
    invoices: sortedInvoices,
    pendingRequests: pending,
  };
};

export default main;
