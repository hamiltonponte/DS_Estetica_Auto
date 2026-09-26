import { createEntityStore } from '@/lib/storage/entityStore';
import { uploadMediaFile } from '@/lib/media/uploadMedia';

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
    Quote: createEntityStore('Quote'),
    Reminder: createEntityStore('Reminder'),
  },
  integrations: {
    Core: {
      async UploadFile({ file, storage = 'indexeddb', maxSizeMb = 8 }) {
        return uploadMediaFile(file, { storage, maxSizeMb });
      },
      async SendEmail() {
        throw new Error('Envio de e-mail não disponível no modo offline.');
      },
    },
  },
};
