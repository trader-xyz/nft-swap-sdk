import type { Order } from "./sdk/types";


interface IOrderbookClient {
    getOrders: (filter: Partial<Order>) => Promise<Order[]>
    postOrder: (order: Order, metadata: Record<string, string>) => Promise<void>
}


class InMemoryOrderbookClient implements IOrderbookClient {
    constructor(initialOrders: Order[]) {
        
    }
    getOrders = async (filter: Partial<SignedOrder>) => {
        return []
    }
    postOrder = async (order: Order, metadata: Record<string, string>) => {
        return
    }
}


class HostedOrderbookClient implements IOrderbookClient{

    constructor(private apiUrlRoot: string) {
        
    }
    getOrders = async (filter: Partial<Order>) => {
        return []
    }
    postOrder = async (order: Order, metadata: Record<string, string>) => {
        return
    }
}