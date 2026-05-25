export const DB_HANDLE_KEY = 'ds-estetica-directory-handle';
export const IDB_NAME = 'ds-estetica-storage-meta';
export const IDB_STORE = 'meta';

export const DATA_DIR = 'data';
export const UPLOADS_DIR = 'uploads';
export const MANIFEST_FILE = 'ds-estetica.json';
export const EXCEL_FILE = 'ds-estetica-dados.xlsx';

export const COLLECTION_FILES = {
  Client: 'clients.json',
  Product: 'products.json',
  Service: 'services.json',
  Appointment: 'appointments.json',
  Vehicle: 'vehicles.json',
  ServiceExecution: 'service_executions.json',
  BusinessConfig: 'business_config.json',
  LoyaltyConfig: 'loyalty_config.json',
  ClientLoyalty: 'client_loyalty.json',
  Subscription: 'subscriptions.json',
};

export const EXCEL_SHEETS = [
  { name: 'Clientes', collection: 'Client' },
  { name: 'Produtos', collection: 'Product' },
  { name: 'Servicos', collection: 'Service' },
  { name: 'Agendamentos', collection: 'Appointment' },
  { name: 'Financeiros', type: 'financial' },
];
