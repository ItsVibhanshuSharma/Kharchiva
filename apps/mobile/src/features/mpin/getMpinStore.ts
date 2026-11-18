import { getDatabase } from '../../database/transactionRepository';
import { MpinStore } from './mpinStore';
let storePromise: Promise<MpinStore> | undefined;
export function getMpinStore(): Promise<MpinStore> {
  if (!storePromise) {
    storePromise = getDatabase()
      .then(database => new MpinStore(database))
      .catch(error => {
        storePromise = undefined;
        throw error;
      });
  }
  return storePromise;
}
