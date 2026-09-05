import type { ConnectorType } from "@prisma/client";
import { GoogleConnector } from "@/lib/connectors/google-connector";
import { GmailConnector } from "@/lib/connectors/gmail-connector";
import { WebsiteConnector } from "@/lib/connectors/website-connector";
import { WhatsAppConnector } from "@/lib/connectors/whatsapp-connector";
import { InstagramConnector, FacebookConnector } from "@/lib/connectors/meta-connector";
import { CalendarConnector } from "@/lib/connectors/calendar-connector";
import { AnalyticsConnector } from "@/lib/connectors/analytics-connector";
import { CrmConnector } from "@/lib/connectors/crm-connector";
import { EmailConnector } from "@/lib/connectors/email-connector";
import type { Connector } from "@/lib/connectors/types";

/**
 * Factoría central de conectores: dado el id de un `Connector` en BD, crea la
 * instancia del plugin correspondiente. Añadir una integración nueva es
 * implementar la clase y registrarla aquí — el resto de la plataforma (AI
 * Agent, automatizaciones, API) solo depende de esta factoría. Se devuelve
 * como el tipo común `Connector` (no el union de clases concretas) para que
 * las llamadas genéricas a connect/authenticate no exijan la intersección
 * imposible de todos los parámetros — quien necesite la API concreta de un
 * conector (p.ej. GmailConnector.updateData) debe castear explícitamente.
 */
export function createConnectorInstance(type: ConnectorType, connectorId: string): Connector {
  switch (type) {
    case "GOOGLE":
      return new GoogleConnector(connectorId);
    case "GMAIL":
      return new GmailConnector(connectorId);
    case "WEBSITE":
      return new WebsiteConnector(connectorId);
    case "WHATSAPP":
      return new WhatsAppConnector(connectorId);
    case "INSTAGRAM":
      return new InstagramConnector(connectorId);
    case "FACEBOOK":
      return new FacebookConnector(connectorId);
    case "CALENDAR":
      return new CalendarConnector(connectorId);
    case "ANALYTICS":
      return new AnalyticsConnector(connectorId);
    case "CRM":
      return new CrmConnector(connectorId);
    case "EMAIL":
      return new EmailConnector(connectorId);
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Tipo de conector desconocido: ${exhaustiveCheck}`);
    }
  }
}
