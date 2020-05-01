import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: RequestDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    // Se não for do tipo income ou outcome retorna erro
    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Type is invalid');
    }

    // Verifica se o saque é maior do que o disponivel
    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError(
        'Valor de Saque maior do que o depositado atualmente na conta',
      );
    }

    // Verificar se já foi existe a categoria
    let isCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    // Se não existe, cria uma nova
    if (!isCategory) {
      isCategory = categoryRepository.create({ title: category });
      await categoryRepository.save(isCategory);
    }

    // Cria uma transação
    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category: isCategory,
    });

    // Salva no banco
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
