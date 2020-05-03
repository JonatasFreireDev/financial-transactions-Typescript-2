import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

// import CreateTransictionService from './CreateTransactionService';

interface Transact {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(fileName: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // const createTransiction = new CreateTransictionService();

    const csvFilePath = path.resolve(
      __dirname,
      '..',
      '..',
      'tmp',
      `${fileName}`,
    );

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: Transact[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    //---------------------------------------------------------------------------------------------------
    // const tr: Transaction[] = [];

    // // eslint-disable-next-line no-restricted-syntax
    // for await (const transaction of transactions) {
    //   const { title, value, type, category } = transaction;

    //   const promisse = await createTransiction.execute({
    //     title,
    //     value,
    //     type,
    //     category,
    //   });
    //   console.log(title);

    //   tr.push(promisse);
    // }
    //----------------------------------------------------------------------------------------------------
    // const importedTransactions = [] as Transaction[];

    // const lastTransaction: Transaction = transactions.reduce(
    //   async (accumulador: Promise<Transact>, transaction: Transact) => {
    //     importedTransactions.push(await accumulador); // Espera a iteração anterior acabar, e add no array

    //     const promise = createTransiction.execute({
    //       title: transaction.title,
    //       type: transaction.type,
    //       value: transaction.value,
    //       category: transaction.category,
    //     });

    //     return promise;
    //   },
    //   Promise.resolve(), // Accumulador se torna uma Promise
    // );

    // importedTransactions.push(lastTransaction);

    //----------------------------------------------------------------------------------------------------

    const existCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
