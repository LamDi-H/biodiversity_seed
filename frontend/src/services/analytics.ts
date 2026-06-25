export type AnalyticsEvent = {
  name: string;
  properties: Record<string, string | number | boolean>;
  timestamp: string;
};

const events: AnalyticsEvent[] = [];

export function trackEvent(
  name: string,
  properties: Record<string, string | number | boolean> = {}
): AnalyticsEvent {
  const event = {
    name,
    properties,
    timestamp: new Date().toISOString()
  };

  events.unshift(event);

  if (events.length > 25) {
    events.pop();
  }

  return event;
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return [...events];
}

export function getAnalyticsSummary() {
  return {
    trackedEvents: events.length,
    walletInteractions: events.filter((event) => event.name.includes("wallet")).length,
    contractActions: events.filter((event) => event.name.includes("contract")).length
  };
}
