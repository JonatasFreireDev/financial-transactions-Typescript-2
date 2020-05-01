import { Router } from 'express';
import { getCustomRepository } from 'typeorm';
import multer from 'multer';
import uploadConfig from '../config/upload';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();
const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const transactions = await transactionsRepository.find({
    relations: ['category'],
  });
  const balance = await transactionsRepository.getBalance();
  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const createTransiction = new CreateTransactionService();

  const transiction = await createTransiction.execute({
    title,
    type,
    value,
    category,
  });

  return response.json(transiction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransiction = new DeleteTransactionService();

  await deleteTransiction.execute({ id });

  return response.send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const importTransaction = new ImportTransactionsService();

    const transactions = await importTransaction.execute(request.file.filename);

    return response.json(transactions);
  },
);

export default transactionsRouter;
