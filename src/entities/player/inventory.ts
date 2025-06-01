import { Item } from "./items";

export interface InventoryStack {
    item: Item;
    count: number;
}

export class Inventory {
    private _items: InventoryStack[] = [];
    private _capacity: number;

    constructor(capacity: number) {
        this._capacity = capacity;
    }

    public addItem(item: Item): boolean {
        // Try to stack if item of same name exists
        const stack = this._items.find(i => i.item.name === item.name);
        if (stack) {
            stack.count++;
            return true;
        }
        if (this._items.length < this._capacity) {
            this._items.push({ item, count: 1 });
            return true;
        }
        return false;
    }

    public removeItem(itemName: string): boolean {
        const idx = this._items.findIndex(i => i.item.name === itemName);
        if (idx !== -1) {
            if (this._items[idx].count > 1) {
                this._items[idx].count--;
            } else {
                this._items.splice(idx, 1);
            }
            return true;
        }
        return false;
    }

    public getItems(): InventoryStack[] {
        return this._items;
    }
}