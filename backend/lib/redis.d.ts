export declare const getRedisClient: () => Promise<any>;
export declare const getRedisPublisher: () => Promise<any>;
export declare const getRedisSubscriber: () => Promise<any>;
export declare const publishSecurityEvent: (eventData: any) => Promise<void>;
export declare const closeRedisConnection: () => Promise<void>;
