import { createEntityStore } from '@/lib/storage/entityStore';
import {
  readFileAsDataUrl,
  saveUploadFile,
} from '@/lib/storage/fileSystem';
import { getStorageRoot } from '@/lib/storage/entityStore';

export const api = {
  entities: {
    Client: createEntityStore('Client'),
    Product: createEntityStore('Product'),
    Service: createEntityStore('Service'),
    Appointment: createEntityStore('Appointment'),
    Vehicle: createEntityStore('Vehicle'),
    ServiceExecution: createEntityStore('ServiceExecution'),
    BusinessConfig: createEntityStore('BusinessConfig'),
    LoyaltyConfig: createEntityStore('LoyaltyConfig'),
    ClientLoyalty: createEntityStore('ClientLoyalty'),
    Subscription: createEntityStore('Subscription'),
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const root = getStorageRoot();
        if (root && 'showDirectoryPicker' in window) {
          try {
            const path = await saveUploadFile(root, file);
            return { file_url: path };
          } catch {
            /* fallback data url */
          }
        }
        const file_url = await readFileAsDataUrl(file);
        return { file_url };
      },
      async SendEmail() {
        throw new Error('Envio de e-mail não disponível no modo offline.');
      },
    },
  },
};
