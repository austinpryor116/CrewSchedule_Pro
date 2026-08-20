export type ChannelType = "SEQUENCE" | "BASE" | "DIRECT" | "TRADE_MARKETPLACE";

export interface MessageSender {
  userId: string;
  name: string;
  employeeId: string;
  role: "CA" | "FO" | "FA";
  base: string;
  avatarUrl?: string;
  seniorityNumber?: string;
}

export interface FlightLegSummaryEmbed {
  flightNumber: string;
  depAirport: string;
  arrAirport: string;
  depTime: string;
  arrTime: string;
  tailNumber?: string;
  aircraftType?: string;
  gate?: string;
  status?: "ON_TIME" | "DELAYED" | "BOARDING" | "EN_ROUTE" | "ARRIVED";
}

export interface TradeOfferEmbed {
  offerId: string;
  offeredSequenceNumber: string;
  offeredDate: string;
  offeredCreditHours: number;
  tradeScope: "FULL_SEQUENCE" | "SELECTED_FLIGHTS";
  selectedFlightNumbers?: string[];
  selectedLegs?: Array<{
    flightNumber: string;
    depAirport: string;
    arrAirport: string;
    depTime: string;
    arrTime: string;
    blockMinutes: number;
    equipment?: string;
    dutyDayIndex?: number;
  }>;
  fullHssSummary?: {
    base?: string;
    equipment?: string;
    totalDutyPeriods: number;
    totalBlockMinutes: number;
    totalCreditMinutes: number;
    layoverCities: string[];
    dutyPeriods: Array<{
      dayIndex: number;
      reportTime: string;
      releaseTime: string;
      layoverCity?: string;
      layoverRestHours?: number;
      legs: Array<{
        flightNumber: string;
        depAirport: string;
        arrAirport: string;
        depTime: string;
        arrTime: string;
        blockMinutes: number;
        equipment?: string;
      }>;
    }>;
  };
  desiredDateOrTrip?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
}


export interface ChatMessage {
  id: string;
  channelId: string;
  sender: MessageSender;
  content: string;
  timestamp: number; // Unix timestamp ms
  encrypted: boolean;
  iv?: string; // AES-GCM IV if encrypted
  embeddedLeg?: FlightLegSummaryEmbed;
  embeddedTrade?: TradeOfferEmbed;
  status: "QUEUED" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  quickMacroTag?: "GATE_HOLD" | "DEICING" | "RUNNING_LATE" | "CREW_VAN" | "REST_START";
  attachments?: Array<{
    url: string;
    type: "IMAGE" | "PDF" | "RELEASE_SNIPPET";
    fileName: string;
  }>;
  reactions?: Record<string, string[]>; // Emoji -> User IDs
  replyToMessage?: {
    id: string;
    senderName: string;
    textSnippet: string;
  };
  isEdited?: boolean;
  editedAt?: number;
  isDeleted?: boolean;
}

export interface ChatChannel {
  id: string;
  type: ChannelType;
  title: string;
  subtitle?: string;
  base?: string;
  sequenceNumber?: string;
  pairingStartDate?: string;
  participants: string[]; // User IDs
  participantDetails: MessageSender[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isEncrypted: boolean;
  dndEnabledUntil?: number; // Epoch timestamp for FAR 117 Rest DND
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}
