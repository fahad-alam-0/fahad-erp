export type RepairStatusStage =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'WAITING_FOR_PARTS'
  | 'IN_REPAIR'
  | 'TESTING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED';

export interface JobCard {
  id: string;
  ticketNumber: string;
  customerId: string;
  technicianId?: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  problemDescription: string;
  status: RepairStatusStage;
  estimatedCost: number;
}
