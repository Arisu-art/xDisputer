import type { SystemEventName, SystemEventPayload, SystemEventPayloadMap } from './types';

type SystemEventHandler<TName extends SystemEventName> = (payload: SystemEventPayload<TName>) => void;

type HandlerRegistry = {
  [TName in SystemEventName]?: Set<SystemEventHandler<TName>>;
};

export type EventUnsubscribe = () => void;

export class SystemEventBus {
  private readonly handlers: HandlerRegistry = {};

  subscribe<TName extends SystemEventName>(
    eventName: TName,
    handler: SystemEventHandler<TName>
  ): EventUnsubscribe {
    const currentHandlers = this.handlers[eventName] ?? new Set<SystemEventHandler<TName>>();
    currentHandlers.add(handler);
    this.handlers[eventName] = currentHandlers;

    return () => {
      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        delete this.handlers[eventName];
      }
    };
  }

  publish<TName extends SystemEventName>(eventName: TName, payload: SystemEventPayloadMap[TName]): void {
    const currentHandlers = this.handlers[eventName] as Set<SystemEventHandler<TName>> | undefined;

    if (!currentHandlers) {
      return;
    }

    for (const handler of currentHandlers) {
      handler(payload);
    }
  }

  clear(): void {
    for (const eventName of Object.keys(this.handlers) as SystemEventName[]) {
      delete this.handlers[eventName];
    }
  }
}

export function createSystemEventBus(): SystemEventBus {
  return new SystemEventBus();
}
