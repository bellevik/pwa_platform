import type { BaseSyncOperation, SyncRequest, SyncResponse } from '@pwa-platform/offline';

export type Direction = 'up' | 'right' | 'down' | 'left';

export type MachineKind = 'source' | 'belt' | 'splitter' | 'assembler' | 'seller';

export type ToolKind = MachineKind | 'erase';

export type ItemKind = 'copper-coil' | 'glass-panel' | 'logic-board' | 'display-module' | 'pocket-console';

export type AssemblerRecipeId = 'logic-board' | 'display-module' | 'pocket-console';

export type FactoryMachine = {
  id: string;
  kind: MachineKind;
  x: number;
  y: number;
  direction: Direction;
  spawnProgressMs?: number;
  outputKind?: Extract<ItemKind, 'copper-coil' | 'glass-panel'>;
  routeIndex?: number;
  craftProgressMs?: number;
  bufferedItems?: ItemKind[];
  recipeId?: AssemblerRecipeId;
};

export type ConveyorItem = {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  direction: Direction;
  progress: number;
  ageMs: number;
};

export type FloorStats = {
  itemsShipped: number;
  lastMinuteRevenue: number;
  activeItems: number;
};

export type FactoryFloor = {
  id: string;
  name: string;
  level: number;
  width: number;
  height: number;
  machines: FactoryMachine[];
  items: ConveyorItem[];
  stats: FloorStats;
};

export type ProductionLine = {
  id: string;
  name: string;
  activeFloorId: string;
  floors: FactoryFloor[];
};

export type PlayerProfile = {
  cash: number;
  lifetimeCash: number;
  totalDevicesShipped: number;
  cloudEnabled: boolean;
  recoveryCode: string | null;
};

export type MegafactoryState = {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  lastSimulatedAt: string;
  profile: PlayerProfile;
  activeLineId: string;
  lines: ProductionLine[];
};

export type MegafactoryOperationType =
  | 'machine_place'
  | 'machine_delete'
  | 'machine_rotate'
  | 'machine_configure'
  | 'line_create'
  | 'line_select'
  | 'floor_create'
  | 'floor_select';

export type MegafactoryOperationPayload = {
  lineId: string;
  floorId?: string;
  machine?: FactoryMachine;
  machineId?: string;
  x?: number;
  y?: number;
  direction?: Direction;
  name?: string;
};

export type MegafactoryOperation = BaseSyncOperation<
  MegafactoryOperationType,
  MegafactoryOperationPayload
>;

export type MegafactorySnapshot = {
  world: MegafactoryState;
  pendingCount: number;
  failedCount: number;
  failedOperations: MegafactoryOperation[];
  lastSyncAt: string | null;
  serverVersion: number;
};

export type MegafactorySyncRequest = SyncRequest<MegafactoryOperation> & {
  recoveryCode: string;
  stateUpdatedAt: string;
  state: MegafactoryState;
};

export type MegafactorySyncResponse = SyncResponse<{
  world: MegafactoryState;
  recoveryCode: string;
}>;

export type BackupBootstrapResponse = {
  schemaVersion: number;
  recoveryCode: string;
  serverVersion: number;
  state: {
    world: MegafactoryState;
    recoveryCode: string;
  };
  serverTimestamp: string;
};

export type BackupStateResponse = {
  schemaVersion: number;
  serverVersion: number;
  state: {
    world: MegafactoryState;
    recoveryCode: string;
  };
  serverTimestamp: string;
};
