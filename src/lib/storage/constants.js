export const MANIFEST_KEY = 'manifest';
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
  Quote: 'quotes.json',
  Reminder: 'reminders.json',
};

export const EXCEL_SHEETS = [
  { name: 'Clientes', collection: 'Client' },
  { name: 'Veiculos', collection: 'Vehicle' },
  { name: 'Produtos', collection: 'Product' },
  { name: 'Servicos', collection: 'Service' },
  { name: 'Agendamentos', collection: 'Appointment' },
  { name: 'Execucoes', collection: 'ServiceExecution' },
  { name: 'Orcamentos', collection: 'Quote' },
  { name: 'Financeiros', type: 'financial' },
];
