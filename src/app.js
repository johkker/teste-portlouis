import main from './crossChecker';
import jsonParser from './jsonParser';

const app = async () => {
  const data = await main();
  return data;
};

app();
